// Cloudflare Worker in front of the static site. Only /api/* runs here (see
// wrangler.jsonc run_worker_first); every other path is served from the built assets.
//
// POST /api/food-photo  { image: base64 JPEG, hint?: string }  with the user's Supabase
// access token. `hint` is the user's own short note about the meal (e.g. "half rice").
// 1. The token is checked by Supabase and the daily limit is checked without counting
//    (public.photo_quota_left; the limit is set so high it is effectively unlimited). The photo is only counted
//    (public.use_photo_quota) once the AI has answered, so a busy AI costs no snap.
//    Until photo_quota_left exists in the database, photos are counted up front.
// 2. Vision models are tried in order until one answers: the Gemini models listed in
//    GEMINI_MODELS (each has its own free daily quota), then Workers AI models (share
//    the account's free 10,000 neurons a day). Only models whose published input schema
//    takes an image are listed: a text-only model would invent a meal it cannot see.
//    A 55 s overall deadline stops the chain.
// 3. The answer is validated (normalizeAiResult) before it reaches the browser.
// The Gemini key is a Worker secret (GEMINI_API_KEY) and never reaches the browser.

import {
  AI_RESPONSE_SCHEMA,
  normalizeAiResult,
  promptWithHint,
  type AiFoodResult,
} from '../src/logic/aiFood';

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  AI?: { run(model: string, input: unknown): Promise<unknown> };
  GEMINI_API_KEY?: string;
  GEMINI_MODELS?: string;
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
}

const MAX_IMAGE_BASE64 = 2_000_000; // about 1.5 MB of JPEG; the app sends ~150 KB
const DEADLINE_MS = 55_000;
const JSON_SHAPE =
  'Answer with JSON only, in this shape: {"is_food":true,"confidence":"medium","items":[{"name_zh":"","grams":0,"match_id":"","kcal":0,"protein_g":0,"carbs_g":0,"fat_g":0}]}';

/**
 * Thinking level per Gemini model (Gemini API docs, "Controlling thinking"). Portion
 * estimation improves with more reasoning; models not listed keep their default.
 */
const GEMINI_THINKING: Record<string, 'high'> = {
  'gemini-3.8-flash': 'high',
  'gemini-3.6-flash': 'high',
  'gemini-3-flash-preview': 'high',
  'gemini-3.5-flash-lite': 'high',
};

/**
 * Workers AI fallbacks whose input schema accepts image_url (checked against the
 * Cloudflare model schemas on 2026-10-15). Llama 4 Scout and Mistral Small 3.1 were
 * removed: on Workers AI they only take a text prompt.
 */
const WORKERS_AI_MODELS: { id: string; extra: Record<string, unknown> }[] = [
  { id: '@cf/qwen/qwen3.8-27b', extra: { reasoning_effort: 'medium' } },
  { id: '@cf/google/gemma-4-26b-a4b-it', extra: {} },
];

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/food-photo') return foodPhoto(request, env);
    if (url.pathname.startsWith('/api/')) return json(404, { error: 'not_found' });
    return env.ASSETS.fetch(request);
  },
};

async function foodPhoto(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'method' });
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return json(401, { error: 'login' });

  let image: string;
  let prompt: string;
  try {
    const body = (await request.json()) as { image?: unknown; hint?: unknown };
    if (typeof body.image !== 'string' || body.image.length > MAX_IMAGE_BASE64) throw new Error();
    image = body.image;
    prompt = promptWithHint(typeof body.hint === 'string' ? body.hint : undefined);
  } catch {
    return json(400, { error: 'bad_image' });
  }

  // Check the daily limit (also proves the token is valid).
  const left = await quotaCall(env, token, 'photo_quota_left');
  let counted = false;
  let remaining: number;
  if (left.kind === 'missing') {
    // Older database without photo_quota_left: count up front as before.
    const used = await quotaCall(env, token, 'use_photo_quota');
    if (used.kind !== 'ok') return quotaError(used);
    counted = true;
    remaining = used.value;
  } else if (left.kind !== 'ok') {
    return quotaError(left);
  } else if (left.value <= 0) {
    return json(429, { error: 'quota' });
  } else {
    remaining = left.value - 1;
  }

  // Count the photo once the AI has answered; a limit hit here (several photos sent
  // at once) still refuses the answer.
  const answer = async (result: AiFoodResult): Promise<Response> => {
    if (!counted) {
      const used = await quotaCall(env, token, 'use_photo_quota');
      if (used.kind !== 'ok') return quotaError(used);
      remaining = used.value;
    }
    return json(200, { result, remaining });
  };

  const models = (env.GEMINI_MODELS ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  const started = Date.now();
  const timeLeft = () => DEADLINE_MS - (Date.now() - started);
  for (const model of env.GEMINI_API_KEY ? models : []) {
    if (timeLeft() < 5_000) break;
    const result = await tryGemini(env.GEMINI_API_KEY ?? '', model, image, prompt, timeLeft());
    if (result) return answer(result);
  }
  for (const model of env.AI ? WORKERS_AI_MODELS : []) {
    if (timeLeft() < 5_000 || !env.AI) break;
    const result = await tryWorkersAi(env.AI, model, image, prompt);
    if (result) return answer(result);
  }
  return json(503, { error: 'unavailable' });
}

type QuotaResult =
  { kind: 'ok'; value: number } | { kind: 'login' | 'limit' | 'missing' | 'error' };

/** Calls a quota function in Supabase as the signed-in user. */
async function quotaCall(
  env: Env,
  token: string,
  fn: 'photo_quota_left' | 'use_photo_quota',
): Promise<QuotaResult> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_KEY,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: '{}',
  });
  if (res.status === 401 || res.status === 403) return { kind: 'login' };
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
    if (err.code === 'PGRST202') return { kind: 'missing' };
    if (err.message?.includes('limit')) return { kind: 'limit' };
    if (err.message?.includes('not signed in')) return { kind: 'login' };
    return { kind: 'error' };
  }
  const value = Number(await res.json());
  return Number.isFinite(value) ? { kind: 'ok', value } : { kind: 'error' };
}

function quotaError(r: QuotaResult): Response {
  if (r.kind === 'login') return json(401, { error: 'login' });
  if (r.kind === 'limit') return json(429, { error: 'quota' });
  return json(503, { error: 'unavailable' });
}

async function tryGemini(
  key: string,
  model: string,
  image: string,
  prompt: string,
  budgetMs: number,
): Promise<AiFoodResult | null> {
  const thinking = GEMINI_THINKING[model];
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ inline_data: { mime_type: 'image/jpeg', data: image } }, { text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: AI_RESPONSE_SCHEMA,
            temperature: 0.2,
            ...(thinking && { thinkingConfig: { thinkingLevel: thinking } }),
          },
        }),
        signal: AbortSignal.timeout(Math.min(35_000, budgetMs)),
      },
    );
    if (!res.ok) {
      console.warn(`gemini ${model} ${res.status}`);
      return null; // 429 = free quota used up: fall through to the next model
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    // With thinking on, the answer is the last text part (earlier parts may be thoughts).
    const text = data.candidates?.[0]?.content?.parts?.filter((p) => p.text).at(-1)?.text;
    return text ? normalizeAiResult(JSON.parse(text), model) : null;
  } catch (e) {
    console.warn(`gemini ${model} failed`, e);
    return null;
  }
}

/** Pulls the first {...} block out of a free-text answer. */
function parseJsonBlock(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  return JSON.parse(text.slice(start, end + 1));
}

async function tryWorkersAi(
  ai: NonNullable<Env['AI']>,
  model: (typeof WORKERS_AI_MODELS)[number],
  image: string,
  prompt: string,
): Promise<AiFoodResult | null> {
  try {
    const out = (await ai.run(model.id, {
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${prompt}
${JSON_SHAPE}`,
            },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4000,
      temperature: 0.2,
      ...model.extra,
    })) as {
      response?: unknown;
      choices?: { message?: { content?: unknown } }[];
    };
    // Chat-completions models answer in choices[0].message.content; older ones in
    // `response`, which some return already parsed.
    const answer = out.choices?.[0]?.message?.content ?? out.response;
    const raw = typeof answer === 'string' ? parseJsonBlock(answer) : answer;
    return normalizeAiResult(raw, model.id.replace('@cf/', 'workers-ai/'));
  } catch (e) {
    console.warn(`workers ai ${model.id} failed`, e);
    return null;
  }
}

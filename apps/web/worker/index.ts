// Cloudflare Worker in front of the static site. Only /api/* runs here (see
// wrangler.jsonc run_worker_first); every other path is served from the built assets.
//
// POST /api/food-photo  { image: base64 JPEG }  with the user's Supabase access token.
// 1. The token is checked by Supabase and one photo is counted against the daily limit
//    (public.use_photo_quota, 8 a day per account).
// 2. Vision models are tried in order until one answers: the Gemini models listed in
//    GEMINI_MODELS (each has its own free daily quota), then Workers AI models (share
//    the account's free 10,000 neurons a day). A 50 s overall deadline stops the chain.
// 3. The answer is validated (normalizeAiResult) before it reaches the browser.
// The Gemini key is a Worker secret (GEMINI_API_KEY) and never reaches the browser.

import {
  AI_PROMPT,
  AI_RESPONSE_SCHEMA,
  normalizeAiResult,
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
const DEADLINE_MS = 50_000;
const JSON_SHAPE =
  'Answer with JSON only, in this shape: {"is_food":true,"confidence":"medium","items":[{"name_zh":"","grams":0,"match_id":"","kcal":0,"protein_g":0,"carbs_g":0,"fat_g":0}]}';

/** Workers AI vision models, last to first resort. `format` is how each takes the image. */
const WORKERS_AI_MODELS: { id: string; format: 'image_url' | 'bytes'; licence?: true }[] = [
  { id: '@cf/meta/llama-4-scout-17b-16e-instruct', format: 'image_url' },
  { id: '@cf/mistralai/mistral-small-3.1-24b-instruct', format: 'image_url' },
  { id: '@cf/meta/llama-3.2-11b-vision-instruct', format: 'bytes', licence: true },
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
  try {
    const body = (await request.json()) as { image?: unknown };
    if (typeof body.image !== 'string' || body.image.length > MAX_IMAGE_BASE64) throw new Error();
    image = body.image;
  } catch {
    return json(400, { error: 'bad_image' });
  }

  // Count this photo (also proves the token is valid).
  const quota = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/use_photo_quota`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_KEY,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: '{}',
  });
  if (quota.status === 401 || quota.status === 403) return json(401, { error: 'login' });
  if (!quota.ok) {
    const err = (await quota.json().catch(() => ({}))) as { message?: string };
    if (err.message?.includes('limit')) return json(429, { error: 'quota' });
    return json(503, { error: 'unavailable' });
  }
  const remaining = Number(await quota.json());

  const models = (env.GEMINI_MODELS ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  const started = Date.now();
  const timeLeft = () => DEADLINE_MS - (Date.now() - started);
  for (const model of env.GEMINI_API_KEY ? models : []) {
    if (timeLeft() < 5_000) break;
    const result = await tryGemini(env.GEMINI_API_KEY ?? '', model, image, timeLeft());
    if (result) return json(200, { result, remaining });
  }
  for (const model of env.AI ? WORKERS_AI_MODELS : []) {
    if (timeLeft() < 5_000 || !env.AI) break;
    const result = await tryWorkersAi(env.AI, model, image);
    if (result) return json(200, { result, remaining });
  }
  return json(503, { error: 'unavailable' });
}

async function tryGemini(
  key: string,
  model: string,
  image: string,
  budgetMs: number,
): Promise<AiFoodResult | null> {
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
              parts: [
                { inline_data: { mime_type: 'image/jpeg', data: image } },
                { text: AI_PROMPT },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: AI_RESPONSE_SCHEMA,
            temperature: 0.2,
          },
        }),
        signal: AbortSignal.timeout(Math.min(25_000, budgetMs)),
      },
    );
    if (!res.ok) {
      console.warn(`gemini ${model} ${res.status}`);
      return null; // 429 = free quota used up: fall through to the next model
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? normalizeAiResult(JSON.parse(text), model) : null;
  } catch (e) {
    console.warn(`gemini ${model} failed`, e);
    return null;
  }
}

const agreed = new Set<string>();

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
): Promise<AiFoodResult | null> {
  try {
    if (model.licence && !agreed.has(model.id)) {
      // Meta's Llama 3.2 licence must be accepted once per account (owner approved).
      await ai.run(model.id, { prompt: 'agree' }).catch(() => undefined);
      agreed.add(model.id);
    }
    const prompt = `${AI_PROMPT}
${JSON_SHAPE}`;
    const input =
      model.format === 'image_url'
        ? {
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
                ],
              },
            ],
            max_tokens: 1000,
            temperature: 0.2,
          }
        : {
            messages: [{ role: 'user', content: prompt }],
            image: [...Uint8Array.from(atob(image), (c) => c.charCodeAt(0))],
            max_tokens: 1000,
            temperature: 0.2,
          };
    const out = (await ai.run(model.id, input)) as { response?: unknown };
    // Some models already return parsed JSON in `response`.
    const raw = typeof out.response === 'string' ? parseJsonBlock(out.response) : out.response;
    return normalizeAiResult(raw, model.id.replace('@cf/', 'workers-ai/'));
  } catch (e) {
    console.warn(`workers ai ${model.id} failed`, e);
    return null;
  }
}

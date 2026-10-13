// Cloudflare Worker in front of the static site. Only /api/* runs here (see
// wrangler.jsonc run_worker_first); every other path is served from the built assets.
//
// POST /api/food-photo  { image: base64 JPEG }  with the user's Supabase access token.
// 1. The token is checked by Supabase and one photo is counted against the daily limit
//    (public.use_photo_quota, 8 a day per account).
// 2. Vision models are tried in order until one answers: Gemini models listed in
//    GEMINI_MODELS (free tier), then Workers AI as a last backup.
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
const WORKERS_AI_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

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
  for (const model of env.GEMINI_API_KEY ? models : []) {
    const result = await tryGemini(env.GEMINI_API_KEY ?? '', model, image);
    if (result) return json(200, { result, remaining });
  }
  if (env.AI) {
    const result = await tryWorkersAi(env.AI, image);
    if (result) return json(200, { result, remaining });
  }
  return json(503, { error: 'unavailable' });
}

async function tryGemini(key: string, model: string, image: string): Promise<AiFoodResult | null> {
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
        signal: AbortSignal.timeout(30_000),
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

let workersAiAgreed = false;

async function tryWorkersAi(
  ai: NonNullable<Env['AI']>,
  image: string,
): Promise<AiFoodResult | null> {
  try {
    if (!workersAiAgreed) {
      // Meta's licence must be accepted once per account before the model answers.
      await ai.run(WORKERS_AI_MODEL, { prompt: 'agree' }).catch(() => undefined);
      workersAiAgreed = true;
    }
    const bytes = Uint8Array.from(atob(image), (c) => c.charCodeAt(0));
    const out = (await ai.run(WORKERS_AI_MODEL, {
      messages: [
        {
          role: 'user',
          content: `${AI_PROMPT}\nAnswer with JSON only, in this shape: {"is_food":true,"confidence":"medium","items":[{"name_zh":"","grams":0,"match_id":"","kcal":0,"protein_g":0,"carbs_g":0,"fat_g":0}]}`,
        },
      ],
      image: [...bytes],
      max_tokens: 800,
      temperature: 0.2,
    })) as { response?: string };
    const text = out.response ?? '';
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    return normalizeAiResult(JSON.parse(text.slice(start, end + 1)), 'workers-ai-llama-3.2-vision');
  } catch (e) {
    console.warn('workers ai failed', e);
    return null;
  }
}

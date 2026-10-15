import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from './index';

const env = {
  ASSETS: { fetch: () => Promise.resolve(new Response('')) },
  GEMINI_API_KEY: 'k',
  GEMINI_MODELS: 'gemini-test',
  SUPABASE_URL: 'https://db.example',
  SUPABASE_KEY: 'anon',
};

const AI_JSON = JSON.stringify({
  is_food: true,
  confidence: 'high',
  items: [
    {
      name_zh: 'Kopi O',
      grams: 250,
      match_id: '',
      kcal: 5,
      protein_g: 0,
      carbs_g: 1,
      fat_g: 0,
    },
  ],
});

/** Fake Supabase and Gemini; records which quota functions were called. */
function fakeFetch({ left, geminiOk }: { left: number | 'missing'; geminiOk: boolean }): {
  calls: string[];
} {
  const calls: string[] = [];
  vi.stubGlobal('fetch', (input: string) => {
    const url = String(input);
    if (url.includes('/rpc/photo_quota_left')) {
      calls.push('left');
      return Promise.resolve(
        left === 'missing'
          ? Response.json({ code: 'PGRST202', message: 'not found' }, { status: 404 })
          : Response.json(left),
      );
    }
    if (url.includes('/rpc/use_photo_quota')) {
      calls.push('use');
      return Promise.resolve(Response.json(left === 'missing' ? 9 : left - 1));
    }
    calls.push('gemini');
    return Promise.resolve(
      geminiOk
        ? Response.json({ candidates: [{ content: { parts: [{ text: AI_JSON }] } }] })
        : new Response('busy', { status: 503 }),
    );
  });
  return { calls };
}

const post = () =>
  worker.fetch(
    new Request('https://app.example/api/food-photo', {
      method: 'POST',
      headers: { authorization: 'Bearer t', 'content-type': 'application/json' },
      body: JSON.stringify({ image: 'aGk=' }),
    }),
    env,
  );

afterEach(() => vi.unstubAllGlobals());

describe('food photo quota', () => {
  it('counts the photo only after the AI answers', async () => {
    const { calls } = fakeFetch({ left: 5, geminiOk: true });
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ remaining: 4 });
    expect(calls).toEqual(['left', 'gemini', 'use']);
  });

  it('does not count a photo when the AI is busy', async () => {
    const { calls } = fakeFetch({ left: 5, geminiOk: false });
    const res = await post();
    expect(res.status).toBe(503);
    expect(calls).toEqual(['left', 'gemini']);
  });

  it('refuses before calling the AI when no snaps are left', async () => {
    const { calls } = fakeFetch({ left: 0, geminiOk: true });
    const res = await post();
    expect(res.status).toBe(429);
    expect(calls).toEqual(['left']);
  });

  it('counts up front when the database has no photo_quota_left yet', async () => {
    const { calls } = fakeFetch({ left: 'missing', geminiOk: true });
    const res = await post();
    expect(res.status).toBe(200);
    expect(calls).toEqual(['left', 'use', 'gemini']);
  });
});

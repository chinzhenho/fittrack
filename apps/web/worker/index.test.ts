import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from './index';

const env = {
  ASSETS: { fetch: () => Promise.resolve(new Response('')) },
  GEMINI_API_KEY: 'k',
  GEMINI_MODELS: 'gemini-test',
  AI_DAILY_LIMITS: '{"gemini-test":18}',
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
type Left = number | 'missing' | { raise: string };

function fakeFetch({
  left,
  geminiOk,
  model = true,
}: {
  left: Left;
  geminiOk: boolean;
  /** Answer of use_ai_model: true, false (at its limit) or 'missing' (no SQL yet). */
  model?: boolean | 'missing';
}): {
  calls: string[];
} {
  const calls: string[] = [];
  vi.stubGlobal('fetch', (input: string) => {
    const url = String(input);
    if (url.includes('/rpc/photo_quota_left')) {
      calls.push('left');
      if (typeof left === 'object')
        // An exception raised by the SQL function (see *_photo_limits.sql).
        return Promise.resolve(
          Response.json({ code: 'P0001', message: left.raise }, { status: 400 }),
        );
      return Promise.resolve(
        left === 'missing'
          ? Response.json({ code: 'PGRST202', message: 'not found' }, { status: 404 })
          : Response.json(left),
      );
    }
    if (url.includes('/rpc/use_ai_model')) {
      calls.push('model');
      return Promise.resolve(
        model === 'missing'
          ? Response.json({ code: 'PGRST202', message: 'not found' }, { status: 404 })
          : Response.json(model),
      );
    }
    if (url.includes('/rpc/keep_alive')) {
      calls.push('keep_alive');
      return Promise.resolve(Response.json(true));
    }
    if (url.includes('/rpc/use_photo_quota')) {
      calls.push('use');
      return Promise.resolve(Response.json(typeof left === 'number' ? left - 1 : 9));
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
    expect(calls).toEqual(['left', 'model', 'gemini', 'use']);
  });

  it('does not count a photo when the AI is busy', async () => {
    const { calls } = fakeFetch({ left: 5, geminiOk: false });
    const res = await post();
    expect(res.status).toBe(503);
    expect(calls).toEqual(['left', 'model', 'gemini']);
  });

  it('refuses before calling the AI when no snaps are left', async () => {
    const { calls } = fakeFetch({ left: 0, geminiOk: true });
    const res = await post();
    expect(res.status).toBe(429);
    expect(calls).toEqual(['left']);
  });

  it.each([
    ['daily photo limit reached', 429, 'quota'],
    ['photo rate limit reached', 429, 'rate'],
    ['site daily limit reached', 503, 'site_limit'],
  ])('stops before calling the AI when "%s"', async (raise, status, error) => {
    const { calls } = fakeFetch({ left: { raise }, geminiOk: true });
    const res = await post();
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ error });
    expect(calls).toEqual(['left']); // the AI is never asked
  });

  it('never calls a model that reached its free daily limit', async () => {
    const { calls } = fakeFetch({ left: 5, geminiOk: true, model: false });
    const res = await post();
    expect(res.status).toBe(503);
    expect(calls).toEqual(['left', 'model']); // no 'gemini': the model was skipped
  });

  it('never calls a model without a configured limit', async () => {
    const { calls } = fakeFetch({ left: 5, geminiOk: true });
    const res = await worker.fetch(
      new Request('https://app.example/api/food-photo', {
        method: 'POST',
        headers: { authorization: 'Bearer t', 'content-type': 'application/json' },
        body: JSON.stringify({ image: 'aGk=' }),
      }),
      { ...env, AI_DAILY_LIMITS: '{}' },
    );
    expect(res.status).toBe(503);
    expect(calls).toEqual(['left']);
  });

  it('tries the models as before while the per-model SQL is not set up', async () => {
    const { calls } = fakeFetch({ left: 5, geminiOk: true, model: 'missing' });
    const res = await post();
    expect(res.status).toBe(200);
    expect(calls).toEqual(['left', 'model', 'gemini', 'use']);
  });

  it('counts up front when the database has no photo_quota_left yet', async () => {
    const { calls } = fakeFetch({ left: 'missing', geminiOk: true });
    const res = await post();
    expect(res.status).toBe(200);
    expect(calls).toEqual(['left', 'use', 'model', 'gemini']);
  });
});

describe('daily keep-alive', () => {
  it('runs a tiny Supabase query so the free project is not paused', async () => {
    const { calls } = fakeFetch({ left: 5, geminiOk: true });
    await worker.scheduled({}, env);
    expect(calls).toEqual(['keep_alive']);
  });
});

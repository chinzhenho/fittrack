import type { AiFoodResult } from '../logic/aiFood';
import { supabase } from './supabase';

// Sends a food photo to our Worker (/api/food-photo), which asks a vision model.
// The photo is shrunk to at most 1024 px and re-encoded as JPEG first (~100-200 KB),
// which also strips location and other metadata.

export type AiPhotoError = 'login' | 'quota' | 'unavailable' | 'network' | 'bad_image';

export const AI_ERROR_TEXT: Record<AiPhotoError, string> = {
  login: 'Please log in to use AI food snaps (free).',
  quota: "You've used today's 20 AI snaps. They reset tomorrow. You can add food manually for now.",
  unavailable: 'The AI is busy. Try again soon, or add food manually.',
  network: 'Connection problem. Please check and try again.',
  bad_image: "Can't read this image. Please try another one.",
};

const MAX_SIDE = 1024;

export async function shrinkToJpegBase64(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
  if (!blob) throw new Error('encode');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export async function analyzeFoodPhoto(
  file: Blob,
  hint?: string,
): Promise<
  { ok: true; result: AiFoodResult; remaining: number } | { ok: false; error: AiPhotoError }
> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, error: 'login' };
  let image: string;
  try {
    image = await shrinkToJpegBase64(file);
  } catch {
    return { ok: false, error: 'bad_image' };
  }
  let res: Response;
  try {
    res = await fetch('/api/food-photo', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ image, ...(hint?.trim() && { hint: hint.trim().slice(0, 120) }) }),
    });
  } catch {
    return { ok: false, error: 'network' };
  }
  const body = (await res.json().catch(() => ({}))) as {
    result?: AiFoodResult;
    remaining?: number;
    error?: AiPhotoError;
  };
  if (res.ok && body.result) {
    return { ok: true, result: body.result, remaining: body.remaining ?? 0 };
  }
  const known: AiPhotoError[] = ['login', 'quota', 'unavailable', 'bad_image'];
  return {
    ok: false,
    error: body.error && known.includes(body.error) ? body.error : 'unavailable',
  };
}

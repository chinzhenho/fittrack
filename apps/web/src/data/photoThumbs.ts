import { useEffect, useState } from 'react';

// Small thumbnails of food photos, shown in the food log. They are kept only in this
// browser (IndexedDB), never uploaded or synced: other devices show a food icon instead.
// One thumbnail is shared by every item logged from the same photo.

const DB = 'eathealthee-thumbs';
const STORE = 'thumbs';
const SIZE = 160;

const cache = new Map<string, string | null>();
const listeners = new Set<() => void>();

function open(): Promise<IDBDatabase> | null {
  if (typeof indexedDB === 'undefined') return null;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** A square, centre-cropped JPEG data URL of about 5–10 KB. */
export async function makeThumb(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas
    .getContext('2d')
    ?.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      SIZE,
      SIZE,
    );
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.7);
}

export async function saveThumbs(mealIds: string[], dataUrl: string): Promise<void> {
  for (const id of mealIds) cache.set(id, dataUrl);
  listeners.forEach((l) => l());
  try {
    const db = await open();
    if (!db) return;
    const tx = db.transaction(STORE, 'readwrite');
    for (const id of mealIds) tx.objectStore(STORE).put(dataUrl, id);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Storage full or blocked (private mode): the icon is shown instead.
  }
}

async function load(id: string): Promise<string | null> {
  try {
    const db = await open();
    if (!db) return null;
    const value = await new Promise<unknown>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

/** The thumbnail for a logged item, or null while loading or when there is none. */
export function useThumb(mealId: string): string | null {
  const [value, setValue] = useState<string | null>(() => cache.get(mealId) ?? null);
  useEffect(() => {
    let alive = true;
    const sync = () => alive && setValue(cache.get(mealId) ?? null);
    listeners.add(sync);
    if (!cache.has(mealId)) {
      void load(mealId).then((v) => {
        cache.set(mealId, v);
        sync();
      });
    } else sync();
    return () => {
      alive = false;
      listeners.delete(sync);
    };
  }, [mealId]);
  return value;
}

/** Removes every thumbnail from this browser (used when deleting all data). */
export async function clearThumbs(): Promise<void> {
  cache.clear();
  listeners.forEach((l) => l());
  try {
    const db = await open();
    if (!db) return;
    db.transaction(STORE, 'readwrite').objectStore(STORE).clear();
    db.close();
  } catch {
    /* ignore */
  }
}

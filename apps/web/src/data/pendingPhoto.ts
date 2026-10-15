// Hands a photo taken with the camera button over to the Add Food page, which
// analyses it as soon as it opens. Kept in memory only; never stored.
export interface PendingPhoto {
  file: File;
  /** Optional note typed before taking the photo, e.g. "kopi O, no sugar". */
  note: string;
  /** Album photos without a note get a chance to say what the food is first. */
  source: PhotoSource;
}

export type PhotoSource = 'camera' | 'album';

let pending: PendingPhoto | null = null;

export function setPendingPhoto(file: File, note = '', source: PhotoSource = 'camera') {
  pending = { file, note: note.trim(), source };
}

/** Returns the waiting photo once and clears it. */
export function takePendingPhoto(): PendingPhoto | null {
  const p = pending;
  pending = null;
  return p;
}

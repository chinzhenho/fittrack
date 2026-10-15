// Hands a photo taken with the camera button over to the Add Food page, which
// analyses it as soon as it opens. Kept in memory only; never stored.
export interface PendingPhoto {
  file: File;
  /** Optional note typed before taking the photo, e.g. "kopi O, no sugar". */
  note: string;
}

let pending: PendingPhoto | null = null;

export function setPendingPhoto(file: File, note = '') {
  pending = { file, note: note.trim() };
}

/** Returns the waiting photo once and clears it. */
export function takePendingPhoto(): PendingPhoto | null {
  const p = pending;
  pending = null;
  return p;
}

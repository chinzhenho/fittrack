// Hands a photo taken with the camera button over to the Add Food page, which
// analyses it as soon as it opens. Kept in memory only; never stored.
let pending: File | null = null;

export function setPendingPhoto(file: File) {
  pending = file;
}

/** Returns the waiting photo once and clears it. */
export function takePendingPhoto(): File | null {
  const f = pending;
  pending = null;
  return f;
}

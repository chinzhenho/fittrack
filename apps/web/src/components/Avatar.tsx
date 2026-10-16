import type { Profile } from '../data/types';

/** Square, centre-cropped JPEG small enough to keep in the synced profile (~5–10 KB). */
export async function makeAvatarPhoto(file: Blob, size = 160): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
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
      size,
      size,
    );
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.8);
}

/** First letter of the nickname, else of the email, else a smile. */
export function avatarInitial(profile: Pick<Profile, 'nickname'>, email = ''): string {
  const source = profile.nickname?.trim() || email;
  return source ? [...source][0]!.toUpperCase() : '🙂';
}

/** The user's picture: their photo, else the chosen emoji, else their initial. */
export function Avatar({
  profile,
  email,
  className = 'size-16 text-3xl',
}: {
  profile: Pick<Profile, 'nickname' | 'avatar' | 'avatarPhoto'>;
  email?: string;
  className?: string;
}) {
  if (profile.avatarPhoto)
    return (
      <img
        src={profile.avatarPhoto}
        alt=""
        className={`${className} shrink-0 rounded-full object-cover ring-1 ring-black/5`}
      />
    );
  return (
    <span
      aria-hidden="true"
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-emerald-50 font-semibold text-emerald-strong dark:bg-emerald/15 dark:text-emerald`}
    >
      {profile.avatar ?? avatarInitial(profile, email)}
    </span>
  );
}

import type { Profile } from '../data/types';

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

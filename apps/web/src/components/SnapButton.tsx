import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../data/auth';
import { setPendingPhoto } from '../data/pendingPhoto';
import type { MealType } from '../data/types';

/**
 * Opens the camera in one tap. The photo is handed to the Add Food page, which
 * analyses it straight away. Guests (no AI without an account) go to that page
 * instead, where the photo card explains how to sign in.
 */
export function SnapButton({
  meal,
  date,
  className,
  children,
  label,
}: {
  meal: MealType;
  date?: string;
  className: string;
  children: ReactNode;
  label: string;
}) {
  const signedIn = useAuth().status === 'signedIn';
  const navigate = useNavigate();
  const to = `/diary/add?meal=${meal}${date ? `&date=${date}` : ''}`;

  if (!signedIn) {
    return (
      <Link to={to} className={className} aria-label={label}>
        {children}
      </Link>
    );
  }
  return (
    <label className={`${className} cursor-pointer`} aria-label={label}>
      {children}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setPendingPhoto(file);
          navigate(to);
        }}
      />
    </label>
  );
}

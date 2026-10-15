import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../data/auth';
import { setPendingPhoto } from '../data/pendingPhoto';
import type { MealType } from '../data/types';
import { CameraScreen } from './CameraScreen';

/**
 * Starts logging food for a meal. Signed-in users get the in-app camera (album at the
 * bottom left, manual entry at the bottom right); a photo goes straight to AI analysis
 * on the Add Food page. Guests (no AI without an account) go to the Add Food page.
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
  const [open, setOpen] = useState(false);
  const to = `/diary/add?meal=${meal}${date ? `&date=${date}` : ''}`;

  if (!signedIn) {
    return (
      <Link to={to} className={className} aria-label={label}>
        {children}
      </Link>
    );
  }

  const target = (m: MealType) => `/diary/add?meal=${m}${date ? `&date=${date}` : ''}`;

  return (
    <>
      <button type="button" className={className} aria-label={label} onClick={() => setOpen(true)}>
        {children}
      </button>
      {/* Rendered on <body>: the bottom bar's blur would otherwise trap this full-screen
          camera inside the bar, behind the page. */}
      {open &&
        createPortal(
          <CameraScreen
            meal={meal}
            onClose={() => setOpen(false)}
            onManual={(m) => {
              setOpen(false);
              navigate(target(m));
            }}
            onPhoto={(file, m, note) => {
              setPendingPhoto(file, note);
              setOpen(false);
              navigate(target(m));
            }}
          />,
          document.body,
        )}
    </>
  );
}

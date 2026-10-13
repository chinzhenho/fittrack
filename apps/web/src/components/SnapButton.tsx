import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../data/auth';
import { setPendingPhoto } from '../data/pendingPhoto';
import type { MealType } from '../data/types';
import { MEAL_LABELS } from '../logic/nutrition';

/**
 * Starts logging food for a meal. Signed-in users get a small sheet: take a photo,
 * pick one from the album (both go straight to AI analysis on the Add Food page), or
 * enter food by hand. Guests (no AI without an account) go to the Add Food page.
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

  const pick = (file: File | undefined) => {
    if (!file) return;
    setPendingPhoto(file);
    setOpen(false);
    navigate(to);
  };
  const option =
    'flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left font-semibold transition hover:border-emerald hover:bg-emerald-50 active:scale-[0.99] dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600';
  const icon =
    'flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xl dark:bg-emerald/20';

  return (
    <>
      <button type="button" className={className} aria-label={label} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs sm:items-center"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`记录${MEAL_LABELS[meal]}`}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm animate-rise space-y-3 rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-navy shadow-2xl sm:rounded-3xl dark:bg-slate-800 dark:text-slate-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">记录{MEAL_LABELS[meal]}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  AI 会认出食物并估算热量，你确认后才记录
                </p>
              </div>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => setOpen(false)}
                className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
              >
                ✕
              </button>
            </div>
            <label className={option}>
              <span aria-hidden="true" className={icon}>
                📸
              </span>
              <span>
                <span className="block">拍照</span>
                <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                  用相机拍下整份食物
                </span>
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  pick(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
            <label className={option}>
              <span aria-hidden="true" className={icon}>
                🖼️
              </span>
              <span>
                <span className="block">从相册选择</span>
                <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                  用手机里已有的食物照片
                </span>
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  pick(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
            <Link to={to} className={option} onClick={() => setOpen(false)}>
              <span aria-hidden="true" className={icon}>
                ✍️
              </span>
              <span>
                <span className="block">手动输入 / 最近吃过</span>
                <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                  包装食品或常吃的东西
                </span>
              </span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

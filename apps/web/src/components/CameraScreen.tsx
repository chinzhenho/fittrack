import { useEffect, useRef, useState } from 'react';
import type { MealType } from '../data/types';
import { MEAL_LABELS, MEAL_TYPES } from '../logic/nutrition';

const MEAL_ICON: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍵',
};

type CamState = 'starting' | 'live' | 'unavailable';

/**
 * Full-screen in-app camera: live preview, shutter in the middle, album picker at
 * the bottom left and manual entry at the bottom right, with the meal chosen above.
 * Falls back to the system camera / album picker when the live camera is not
 * available (no permission, no camera, or an old browser).
 */
export function CameraScreen({
  meal: initialMeal,
  onPhoto,
  onManual,
  onClose,
}: {
  meal: MealType;
  onPhoto: (file: File, meal: MealType) => void;
  onManual: (meal: MealType) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CamState>('starting');
  const [meal, setMeal] = useState<MealType>(initialMeal);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const media = navigator.mediaDevices;
    if (!media?.getUserMedia) {
      setState('unavailable');
      return;
    }
    media
      .getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1440 },
        },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
        setState('live');
      })
      .catch(() => {
        if (!cancelled) setState('unavailable');
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Escape closes; the page behind must not scroll while the camera is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const shoot = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext('2d')?.drawImage(v, 0, 0);
    setFlash(true);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onPhoto(new File([blob], 'meal.jpg', { type: 'image/jpeg' }), meal);
      },
      'image/jpeg',
      0.9,
    );
  };

  const fileInput = (capture: boolean) => (
    <input
      type="file"
      accept="image/*"
      {...(capture && { capture: 'environment' as const })}
      className="sr-only"
      onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (f) onPhoto(f, meal);
      }}
    />
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="拍照记录食物"
      className="fixed inset-0 z-50 flex flex-col bg-black text-white"
    >
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 h-full w-full object-cover ${state === 'live' ? '' : 'hidden'}`}
      />
      {flash && <div className="pointer-events-none absolute inset-0 animate-ping bg-white/60" />}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <button
          type="button"
          aria-label="关闭相机"
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-lg backdrop-blur-md"
        >
          ✕
        </button>
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/50 bg-emerald-600/90 px-3 py-1 text-xs font-bold shadow-lg backdrop-blur-md">
          <span className="size-2 animate-ping rounded-full bg-white" />
          AI 拍照记食物
        </span>
        <span className="size-10" />
      </div>

      {/* Viewfinder */}
      <div className="relative flex flex-1 items-center justify-center px-8">
        {state === 'live' ? (
          <div className="relative aspect-square w-full max-w-sm">
            {[
              'top-0 left-0 border-t-4 border-l-4 rounded-tl-3xl',
              'top-0 right-0 border-t-4 border-r-4 rounded-tr-3xl',
              'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl',
              'bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl',
            ].map((c) => (
              <span key={c} className={`absolute size-12 border-emerald-400 ${c}`} />
            ))}
            <span className="absolute inset-x-6 h-0.5 animate-scan rounded-full bg-emerald-400 shadow-[0_0_14px_3px_rgba(34,197,94,0.75)]" />
            <p className="absolute -bottom-9 w-full text-center text-sm font-semibold text-white/90">
              对准整份食物，尽量拍到餐具
            </p>
          </div>
        ) : state === 'starting' ? (
          <p className="text-sm text-white/80" role="status">
            正在打开相机…
          </p>
        ) : (
          <div className="max-w-xs space-y-4 text-center">
            <p className="text-4xl" aria-hidden="true">
              📷
            </p>
            <p className="text-sm leading-relaxed text-white/85">
              无法直接打开相机（可能没有允许相机权限）。可以用下面的按钮拍照或从相册选择。
            </p>
            <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-2xl bg-emerald-600 font-bold">
              📸 用系统相机拍照
              {fileInput(true)}
            </label>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative space-y-4 px-5 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto grid max-w-sm grid-cols-4 gap-2" role="group" aria-label="餐别">
          {MEAL_TYPES.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={meal === m}
              onClick={() => setMeal(m)}
              className={`rounded-2xl border py-1.5 text-center text-xs font-bold transition ${meal === m ? 'border-emerald-400 bg-emerald-600 shadow-lg' : 'border-white/20 bg-white/10'}`}
            >
              <span aria-hidden="true" className="block text-base">
                {MEAL_ICON[m]}
              </span>
              {MEAL_LABELS[m]}
            </button>
          ))}
        </div>
        <div className="mx-auto flex max-w-sm items-center justify-between">
          <label className="flex w-16 cursor-pointer flex-col items-center gap-1 text-[11px] font-semibold">
            <span className="flex size-12 items-center justify-center rounded-2xl border-2 border-white/70 bg-white/15 text-xl backdrop-blur">
              🖼️
            </span>
            相册
            {fileInput(false)}
          </label>
          <button
            type="button"
            aria-label="拍照"
            disabled={state !== 'live'}
            onClick={shoot}
            className="flex size-20 items-center justify-center rounded-full border-4 border-emerald-400 bg-white shadow-[0_0_24px_rgba(34,197,94,0.5)] transition active:scale-90 disabled:opacity-40"
          >
            <span className="size-14 rounded-full bg-white ring-2 ring-slate-300" />
          </button>
          <button
            type="button"
            onClick={() => onManual(meal)}
            className="flex w-16 flex-col items-center gap-1 text-[11px] font-semibold"
          >
            <span className="flex size-12 items-center justify-center rounded-2xl border-2 border-white/70 bg-white/15 text-xl backdrop-blur">
              ✍️
            </span>
            手动
          </button>
        </div>
      </div>
    </div>
  );
}

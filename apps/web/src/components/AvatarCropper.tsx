import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../lib/i18n';

const OUTPUT = 160; // saved size in px: a few KB as JPEG
const MAX_ZOOM = 4;

/**
 * Instagram-style picture editor: the photo sits under a round frame; drag to move,
 * pinch, scroll or use the slider to zoom. "Done" saves only what is inside the circle.
 */
export function AvatarCropper({
  file,
  onDone,
  onCancel,
}: {
  file: File;
  onDone: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(280);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setImg(image);
    image.onerror = () => setFailed(true);
    image.src = url;
    return () => {
      // Detach first: a cancelled load must not report an error.
      image.onload = null;
      image.onerror = null;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    const measure = () => box.current && setSize(box.current.clientWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // The photo always covers the circle: scale so the short side fills it, then zoom.
  const base = img ? size / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const scale = base * zoom;
  const w = img ? img.naturalWidth * scale : size;
  const h = img ? img.naturalHeight * scale : size;
  const clamp = (p: { x: number; y: number }, s = scale) => {
    const mx = img ? (img.naturalWidth * s - size) / 2 : 0;
    const my = img ? (img.naturalHeight * s - size) / 2 : 0;
    return { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) };
  };
  const setZoomClamped = (z: number) => {
    const next = Math.max(1, Math.min(MAX_ZOOM, z));
    setZoom(next);
    setPos((p) => clamp(p, base * next));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [
        { x: number; y: number },
        { x: number; y: number },
      ];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()] as [
        { x: number; y: number },
        { x: number; y: number },
      ];
      setZoomClamped((pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist);
      return;
    }
    setPos((p) => clamp({ x: p.x + e.clientX - prev.x, y: p.y + e.clientY - prev.y }));
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const done = () => {
    if (!img) return;
    // Which part of the photo is inside the frame, in the photo's own pixels.
    const side = size / scale;
    const sx = (w / 2 - size / 2 - pos.x) / scale;
    const sy = (h / 2 - size / 2 - pos.y) / scale;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    canvas.getContext('2d')?.drawImage(img, sx, sy, side, side, 0, 0, OUTPUT, OUTPUT);
    onDone(canvas.toDataURL('image/jpeg', 0.85));
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('Move and zoom')}
      className="fixed inset-0 z-[60] flex flex-col bg-black text-white"
      // Opened from the picture sheet: clicks here must not reach (and close) it.
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative z-10 flex items-center justify-between bg-black px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3">
        <button type="button" onClick={onCancel} className="min-h-11 px-2 text-[1.0625rem]">
          {t('Cancel')}
        </button>
        <p className="font-semibold">{t('Move and zoom')}</p>
        <button
          type="button"
          onClick={done}
          disabled={!img}
          className="min-h-11 px-2 text-[1.0625rem] font-semibold text-emerald disabled:opacity-40"
        >
          {t('Done')}
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden px-6">
        <div
          ref={box}
          className="relative aspect-square w-full max-w-[22rem] touch-none overflow-visible select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={(e) => setZoomClamped(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
        >
          {img && (
            <img
              src={img.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute top-1/2 left-1/2 max-w-none"
              style={{
                width: w,
                height: h,
                transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
              }}
            />
          )}
          {/* Round frame: everything outside it is dimmed. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_100vmax_rgba(0,0,0,0.6)] ring-2 ring-white/80"
          />
          {failed && (
            <p className="absolute inset-0 flex items-center justify-center text-center text-sm">
              {t("Can't read this image. Please try another one.")}
            </p>
          )}
        </div>
      </div>

      <div className="relative z-10 bg-black px-8 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <label htmlFor="avatar-zoom" className="sr-only">
          {t('Zoom')}
        </label>
        <input
          id="avatar-zoom"
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoomClamped(Number(e.target.value))}
          className="w-full accent-emerald"
        />
        <p className="mt-2 text-center text-sm text-white/70">
          {t('Drag to move, pinch or slide to zoom')}
        </p>
      </div>
    </div>,
    document.body,
  );
}

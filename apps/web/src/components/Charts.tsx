import { addDays, daysBetween } from '@fittrack/engine';
import type { TrendPoint } from '@fittrack/engine';
import { useEffect, useRef, useState } from 'react';

export function Ring({
  value,
  max,
  label,
  trackClass = 'stroke-slate-100 dark:stroke-slate-700',
  barClass = 'stroke-emerald',
  size = 'size-32',
}: {
  value: number;
  max: number;
  label: string;
  trackClass?: string;
  barClass?: string;
  size?: string;
}) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <svg viewBox="0 0 120 120" className={`${size} shrink-0`} role="img" aria-label={label}>
      <circle cx="60" cy="60" r={r} fill="none" strokeWidth="12" className={trackClass} />
      {pct > 0 && (
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${pct * c} ${c}`}
          transform="rotate(-90 60 60)"
          className={barClass}
        />
      )}
    </svg>
  );
}

/** Daily weights as dots plus the trend line (spec 4.5). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(320);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => {
      if (e) setWidth(Math.max(240, Math.round(e.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Daily weights as dots plus the trend line (spec 4.5). Drawn at the real pixel width
 * so text stays the same size on phones and desktops. Optional start and goal lines
 * are shown when they fall near the visible range.
 */
export function WeightChart({
  points,
  end,
  days,
  startKg,
  goalKg,
}: {
  points: TrendPoint[];
  end: string;
  days: number;
  startKg?: number | null;
  goalKg?: number | undefined;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const start = addDays(end, -(days - 1));
  const inRange = points.filter((p) => p.date >= start && p.date <= end);
  if (inRange.length === 0) {
    return (
      <div ref={ref}>
        <p className="py-8 text-center text-sm text-slate-600 dark:text-slate-300">
          这段期间还没有体重记录。
        </p>
      </div>
    );
  }
  const values = inRange.flatMap((p) => [p.weightKg, p.trendKg]);
  if (startKg != null) values.push(startKg);
  let lo = Math.floor(Math.min(...values) - 0.5);
  let hi = Math.ceil(Math.max(...values) + 0.5);
  // Show the goal line only when it is close enough not to flatten the curve.
  const showGoal = goalKg !== undefined && goalKg >= lo - 3 && goalKg <= hi + 3;
  if (showGoal) {
    lo = Math.min(lo, Math.floor(goalKg - 0.5));
    hi = Math.max(hi, Math.ceil(goalKg + 0.5));
  }
  const H = 200;
  const pad = { l: 40, r: 12, t: 12, b: 24 };
  const x = (d: string) =>
    pad.l + (daysBetween(start, d) / Math.max(1, days - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + ((hi - v) / (hi - lo)) * (H - pad.t - pad.b);
  const line = inRange
    .map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)} ${y(p.trendKg).toFixed(1)}`)
    .join(' ');
  const ticks = [lo, (lo + hi) / 2, hi];
  const refLine = (v: number, label: string, cls: string) => (
    <g>
      <line
        x1={pad.l}
        x2={W - pad.r}
        y1={y(v)}
        y2={y(v)}
        strokeDasharray="4 4"
        strokeWidth="1.5"
        className={cls}
      />
      <text x={W - pad.r} y={y(v) - 4} textAnchor="end" fontSize="11" className="fill-slate-500">
        {label} {v.toFixed(1)}
      </text>
    </g>
  );

  return (
    <div ref={ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="体重与趋势图">
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(t)}
              y2={y(t)}
              className="stroke-slate-200 dark:stroke-slate-700"
              strokeWidth="1"
            />
            <text
              x={pad.l - 6}
              y={y(t) + 4}
              textAnchor="end"
              fontSize="11"
              className="fill-slate-500"
            >
              {t.toFixed(1)}
            </text>
          </g>
        ))}
        {startKg != null && refLine(startKg, '起点', 'stroke-slate-400')}
        {showGoal && refLine(goalKg, '目标', 'stroke-emerald-strong dark:stroke-emerald')}
        {inRange.map((p) => (
          <circle
            key={p.date}
            cx={x(p.date)}
            cy={y(p.weightKg)}
            r="3.5"
            className="fill-slate-400 dark:fill-slate-500"
          />
        ))}
        <path
          d={line}
          fill="none"
          strokeWidth="3"
          className="stroke-emerald"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <text x={pad.l} y={H - 6} fontSize="11" className="fill-slate-500">
          {start.slice(5).replace('-', '/')}
        </text>
        <text x={W - pad.r} y={H - 6} fontSize="11" textAnchor="end" className="fill-slate-500">
          {end.slice(5).replace('-', '/')}
        </text>
      </svg>
    </div>
  );
}

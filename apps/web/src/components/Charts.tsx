import { addDays, daysBetween } from '@fittrack/engine';
import type { TrendPoint } from '@fittrack/engine';

export function Ring({
  value,
  max,
  label,
  trackClass = 'stroke-slate-100 dark:stroke-slate-700',
  barClass = 'stroke-emerald',
}: {
  value: number;
  max: number;
  label: string;
  trackClass?: string;
  barClass?: string;
}) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <svg viewBox="0 0 120 120" className="size-32 shrink-0" role="img" aria-label={label}>
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
export function WeightChart({
  points,
  end,
  days,
}: {
  points: TrendPoint[];
  end: string;
  days: number;
}) {
  const start = addDays(end, -(days - 1));
  const inRange = points.filter((p) => p.date >= start && p.date <= end);
  if (inRange.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-600 dark:text-slate-300">
        這段期間還沒有體重記錄。
      </p>
    );
  }
  const values = inRange.flatMap((p) => [p.weightKg, p.trendKg]);
  const lo = Math.floor(Math.min(...values) - 0.5);
  const hi = Math.ceil(Math.max(...values) + 0.5);
  const W = 320;
  const H = 160;
  const pad = { l: 34, r: 8, t: 8, b: 20 };
  const x = (d: string) =>
    pad.l + (daysBetween(start, d) / Math.max(1, days - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + ((hi - v) / (hi - lo)) * (H - pad.t - pad.b);
  const line = inRange
    .map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)} ${y(p.trendKg).toFixed(1)}`)
    .join(' ');
  const ticks = [lo, (lo + hi) / 2, hi];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="max-h-64 w-full" role="img" aria-label="體重與趨勢圖">
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
          <text x={pad.l - 4} y={y(t) + 3} textAnchor="end" fontSize="9" className="fill-slate-500">
            {t.toFixed(1)}
          </text>
        </g>
      ))}
      {inRange.map((p) => (
        <circle
          key={p.date}
          cx={x(p.date)}
          cy={y(p.weightKg)}
          r="2.5"
          className="fill-slate-400 dark:fill-slate-500"
        />
      ))}
      <path
        d={line}
        fill="none"
        strokeWidth="2.5"
        className="stroke-emerald"
        strokeLinejoin="round"
      />
      <text x={pad.l} y={H - 4} fontSize="9" className="fill-slate-500">
        {start.slice(5)}
      </text>
      <text x={W - pad.r} y={H - 4} fontSize="9" textAnchor="end" className="fill-slate-500">
        {end.slice(5)}
      </text>
    </svg>
  );
}

import { addDays, daysBetween } from '@fittrack/engine';
import type { TrendPoint } from '@fittrack/engine';
import { useEffect, useRef, useState } from 'react';
import { localToday, shortDate } from '../lib/dates';

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

const md = (d: string) => shortDate(d);

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

/** Weigh-ins needed in the range before the smoothed trend line is drawn. */
export const TREND_MIN_POINTS = 5;

/**
 * Weigh-ins joined by a line, plus the smoothed trend (spec 4.5) as a wide soft band
 * once there are enough weigh-ins for it to mean something; with only a few points the
 * trend barely moves and looked like a line that missed the dots. Drawn at the real
 * pixel width so text stays the same size on phones and desktops. Start and goal lines
 * are labelled on the left, away from the newest data on the right.
 */
export function WeightChart({
  points,
  end,
  days,
  startKg,
  goalKg,
  showTrend = false,
}: {
  points: TrendPoint[];
  end: string;
  days: number;
  startKg?: number | null;
  goalKg?: number | undefined;
  /** Also draw the smoothed trend as a soft band (it lags the weigh-ins by design). */
  showTrend?: boolean;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [selected, setSelected] = useState<string | null>(null);
  const start = addDays(end, -(days - 1));
  const inRange = points.filter((p) => p.date >= start && p.date <= end);
  if (inRange.length === 0) {
    return (
      <div ref={ref}>
        <p className="py-8 text-center text-sm text-slate-600 dark:text-slate-300">
          No weigh-ins in this period. Try a longer range.
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
  const pad = { l: 40, r: 12, t: 12, b: 30 };
  const x = (d: string) =>
    pad.l + (daysBetween(start, d) / Math.max(1, days - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + ((hi - v) / (hi - lo)) * (H - pad.t - pad.b);
  // Date labels along the bottom: every day, week, fortnight or month, whichever is the
  // smallest step that leaves room for each label; counted back from the newest day.
  const perDay = (W - pad.l - pad.r) / Math.max(1, days - 1);
  const step = [1, 2, 7, 14, 30, 60].find((n) => n * perDay >= 56) ?? 60;
  const xTicks: string[] = [];
  for (let d = end; d >= start; d = addDays(d, -step)) xTicks.push(d);
  const today = localToday();
  const path = (v: (p: TrendPoint) => number) =>
    inRange
      .map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)} ${y(v(p)).toFixed(1)}`)
      .join(' ');
  const weighLine = path((p) => p.weightKg);
  const trendLine = showTrend && inRange.length >= TREND_MIN_POINTS ? path((p) => p.trendKg) : null;
  // Keep the two reference labels apart when the lines are close together.
  const goalLabelDy =
    startKg != null && showGoal && Math.abs(y(startKg) - y(goalKg)) < 14
      ? y(goalKg) < y(startKg)
        ? -10
        : 10
      : 0;
  const ticks = [lo, (lo + hi) / 2, hi];
  const sel = inRange.find((p) => p.date === selected);
  const refLine = (v: number, label: string, cls: string, dy = 0) => (
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
      <text
        x={pad.l + 4}
        y={y(v) - 5 + dy}
        fontSize="11"
        fontWeight="600"
        strokeWidth="3"
        paintOrder="stroke"
        className="fill-slate-500 stroke-white dark:stroke-slate-800"
      >
        {label} {v.toFixed(1)}
      </text>
    </g>
  );

  return (
    <div ref={ref}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Weight and trend chart"
      >
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
        {xTicks.map((d) => (
          <line
            key={`v-${d}`}
            x1={x(d)}
            x2={x(d)}
            y1={pad.t}
            y2={H - pad.b}
            strokeWidth="1"
            className="stroke-slate-100 dark:stroke-slate-700/60"
          />
        ))}
        {startKg != null && refLine(startKg, 'Start', 'stroke-slate-400')}
        {showGoal &&
          refLine(goalKg, 'Goal', 'stroke-emerald-strong dark:stroke-emerald', goalLabelDy)}
        {trendLine && (
          <path
            d={trendLine}
            fill="none"
            strokeWidth="8"
            className="stroke-emerald/25"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        <path
          d={weighLine}
          fill="none"
          strokeWidth="2.5"
          className="stroke-emerald"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {inRange.map((p) => (
          <g
            key={p.date}
            role="button"
            tabIndex={0}
            aria-label={`${md(p.date)} weight ${p.weightKg.toFixed(1)} kg, trend ${p.trendKg.toFixed(1)} kg`}
            className="cursor-pointer outline-none"
            onClick={() => setSelected((v) => (v === p.date ? null : p.date))}
            onFocus={() => setSelected(p.date)}
            onBlur={() => setSelected(null)}
          >
            <circle cx={x(p.date)} cy={y(p.weightKg)} r="12" fill="transparent" />
            <circle
              cx={x(p.date)}
              cy={y(p.weightKg)}
              r={selected === p.date ? 5.5 : 3.5}
              className={
                selected === p.date
                  ? 'fill-emerald-strong stroke-white dark:fill-emerald'
                  : 'fill-white stroke-emerald dark:fill-slate-800'
              }
              strokeWidth="2"
            />
          </g>
        ))}
        {sel &&
          (() => {
            const bw = 128;
            const bx = Math.min(Math.max(x(sel.date) - bw / 2, pad.l), W - pad.r - bw);
            const by = y(sel.weightKg) > 70 ? y(sel.weightKg) - 58 : y(sel.weightKg) + 14;
            return (
              <g pointerEvents="none">
                <rect
                  x={bx}
                  y={by}
                  width={bw}
                  height="44"
                  rx="10"
                  className="fill-slate-900 dark:fill-white"
                  opacity="0.92"
                />
                <text
                  x={bx + 10}
                  y={by + 18}
                  fontSize="12"
                  fontWeight="700"
                  className="fill-white dark:fill-slate-900"
                >
                  {md(sel.date)} · {sel.weightKg.toFixed(1)} kg
                </text>
                <text
                  x={bx + 10}
                  y={by + 34}
                  fontSize="11"
                  className="fill-slate-300 dark:fill-slate-600"
                >
                  Trend {sel.trendKg.toFixed(1)} kg
                </text>
              </g>
            );
          })()}
        {xTicks.map((d) => {
          const tx = x(d);
          const anchor = tx > W - pad.r - 24 ? 'end' : tx < pad.l + 24 ? 'start' : 'middle';
          return (
            <text
              key={d}
              x={tx}
              y={H - 8}
              fontSize="12"
              fontWeight={d === today ? 600 : 400}
              textAnchor={anchor}
              className="fill-slate-600 dark:fill-slate-300"
            >
              {d === today ? 'Today' : md(d)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

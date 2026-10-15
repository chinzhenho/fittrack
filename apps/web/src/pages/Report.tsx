import { addDays } from '@fittrack/engine';
import { useMemo, useState } from 'react';
import { useToast } from '../components/Toast';
import { BackButton, Button, CheckCards } from '../components/ui';
import { getState, useAppState } from '../data/store';
import type { AppState, MealItem } from '../data/types';
import { formatDateFull, localToday, shortDate } from '../lib/dates';
import { fmt1, fmtInt } from '../lib/format';
import { GOAL_LABELS } from '../lib/messages';
import { MEAL_LABELS, MEAL_TYPES, sumNutrients } from '../logic/nutrition';
import { startWeightKg, targetOn } from '../logic/targets';
import { datesBetween, weeklySummary } from '../logic/weekly';

type Range = '30' | '90' | 'all';
const RANGE_LABELS: Record<Range, string> = {
  '30': 'Last 30 days',
  '90': 'Last 90 days',
  all: 'Everything',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayLabel = (d: string) => {
  const [y, m, day] = d.split('-').map(Number) as [number, number, number];
  return `${DAY_NAMES[new Date(y, m - 1, day).getDay()]} ${shortDate(d)}`;
};

interface DayRow {
  date: string;
  logged: boolean;
  complete: boolean;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  target: number | null;
  weight: number | null;
}

function dayRows(s: AppState, start: string, end: string): DayRow[] {
  return datesBetween(start, end).map((date) => {
    const meals = s.meals.filter((m) => m.date === date);
    const n = sumNutrients(meals);
    const w = s.weights
      .filter((x) => x.date === date)
      .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))[0];
    return {
      date,
      logged: meals.length > 0,
      complete: s.completeDays.includes(date),
      kcal: n.kcal,
      proteinG: n.proteinG,
      carbsG: n.carbsG,
      fatG: n.fatG,
      target: targetOn(s.targets, date)?.caloriesKcal ?? null,
      weight: w?.weightKg ?? null,
    };
  });
}

/** Calories each day as bars, with the target as a dashed line. */
function CaloriesChart({ rows, gaining }: { rows: DayRow[]; gaining: boolean }) {
  const W = 320;
  const H = 130;
  const pad = { l: 30, r: 4, t: 8, b: 16 };
  const max = Math.max(1, ...rows.map((r) => Math.max(r.kcal, r.target ?? 0))) * 1.1;
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const bw = (W - pad.l - pad.r) / rows.length;
  const target = rows.at(-1)?.target ?? null;
  const off = (r: DayRow) =>
    r.target !== null && (gaining ? r.kcal < r.target * 0.9 : r.kcal > r.target * 1.1);
  const ticks = [0, Math.round(max / 2 / 100) * 100, Math.round((max * 0.9) / 100) * 100];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Calories per day">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e5e5ea" strokeWidth="0.5" />
          <text x={pad.l - 3} y={y(t) + 3} fontSize="7" textAnchor="end" fill="#6e6e73">
            {fmtInt(t)}
          </text>
        </g>
      ))}
      {rows.map((r, i) =>
        r.logged ? (
          <rect
            key={r.date}
            x={pad.l + i * bw + bw * 0.15}
            y={y(r.kcal)}
            width={bw * 0.7}
            height={Math.max(0.5, y(0) - y(r.kcal))}
            rx={Math.min(2, bw * 0.2)}
            fill={off(r) ? '#dca46c' : '#4e8a66'}
          />
        ) : null,
      )}
      {target !== null && (
        <>
          <line
            x1={pad.l}
            x2={W - pad.r}
            y1={y(target)}
            y2={y(target)}
            stroke="#1d1d1f"
            strokeWidth="0.8"
            strokeDasharray="3 2"
          />
          <text x={W - pad.r} y={y(target) - 2} fontSize="7" textAnchor="end" fill="#1d1d1f">
            target {fmtInt(target)}
          </text>
        </>
      )}
      <text x={pad.l} y={H - 4} fontSize="7" fill="#6e6e73">
        {shortDate(rows[0]!.date)}
      </text>
      <text x={W - pad.r} y={H - 4} fontSize="7" textAnchor="end" fill="#6e6e73">
        {shortDate(rows.at(-1)!.date)}
      </text>
    </svg>
  );
}

/** Weigh-ins joined by a line, with start and goal lines when they are close. */
function WeightChart({
  rows,
  startKg,
  goalKg,
}: {
  rows: DayRow[];
  startKg: number | null;
  goalKg: number | undefined;
}) {
  const W = 320;
  const H = 130;
  const pad = { l: 30, r: 4, t: 8, b: 16 };
  const pts = rows.map((r, i) => ({ i, w: r.weight })).filter((p) => p.w !== null) as {
    i: number;
    w: number;
  }[];
  if (pts.length === 0) {
    return (
      <p className="flex h-full min-h-24 items-center justify-center text-xs text-slate-500">
        No weigh-ins in this period.
      </p>
    );
  }
  const values = pts.map((p) => p.w);
  if (startKg !== null) values.push(startKg);
  let lo = Math.floor(Math.min(...values) - 0.5);
  let hi = Math.ceil(Math.max(...values) + 0.5);
  const showGoal = goalKg !== undefined && goalKg >= lo - 3 && goalKg <= hi + 3;
  if (showGoal) {
    lo = Math.min(lo, Math.floor(goalKg - 0.5));
    hi = Math.max(hi, Math.ceil(goalKg + 0.5));
  }
  const x = (i: number) => pad.l + (i / Math.max(1, rows.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + ((hi - v) / (hi - lo)) * (H - pad.t - pad.b);
  const ref = (v: number, label: string, color: string) => (
    <g>
      <line
        x1={pad.l}
        x2={W - pad.r}
        y1={y(v)}
        y2={y(v)}
        stroke={color}
        strokeWidth="0.8"
        strokeDasharray="3 2"
      />
      <text x={pad.l + 2} y={y(v) - 2} fontSize="7" fill={color}>
        {label} {v.toFixed(1)}
      </text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weight">
      {[lo, (lo + hi) / 2, hi].map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e5e5ea" strokeWidth="0.5" />
          <text x={pad.l - 3} y={y(t) + 3} fontSize="7" textAnchor="end" fill="#6e6e73">
            {t.toFixed(1)}
          </text>
        </g>
      ))}
      {startKg !== null && ref(startKg, 'Start', '#8e8e93')}
      {showGoal && ref(goalKg, 'Goal', '#248a3d')}
      <path
        d={pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)} ${y(p.w).toFixed(1)}`).join(' ')}
        fill="none"
        stroke="#356b4f"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {pts.map((p) => (
        <circle
          key={p.i}
          cx={x(p.i)}
          cy={y(p.w)}
          r="1.8"
          fill="#fff"
          stroke="#356b4f"
          strokeWidth="1"
        />
      ))}
      <text x={pad.l} y={H - 4} fontSize="7" fill="#6e6e73">
        {shortDate(rows[0]!.date)}
      </text>
      <text x={W - pad.r} y={H - 4} fontSize="7" textAnchor="end" fill="#6e6e73">
        {shortDate(rows.at(-1)!.date)}
      </text>
    </svg>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note?: string | undefined }) {
  return (
    <div className="rounded-[12px] bg-slate-50 px-3 py-2 print:border print:border-slate-200 print:bg-white">
      <p className="text-[0.6875rem] text-slate-500">{label}</p>
      <p className="text-lg leading-tight font-bold print:text-base">{value}</p>
      {note && <p className="text-[0.6875rem] text-slate-500">{note}</p>}
    </div>
  );
}

/**
 * A one-page report (for 30 days) with charts, laid out for printing. "Save as PDF" opens
 * the browser's print dialog, where every phone and computer can save it as a PDF; this
 * keeps Chinese and other characters intact without bundling fonts.
 */
export function Report() {
  const s = useAppState();
  const toast = useToast();
  const today = useMemo(() => localToday(), []);
  const [range, setRange] = useState<Range>('30');
  const [details, setDetails] = useState(false);
  const profile = s.profile;
  if (!profile) return null;

  const first = [...s.meals.map((m) => m.date), ...s.weights.map((w) => w.date)].sort()[0];
  const start = range === 'all' ? (first ?? today) : addDays(today, -(Number(range) - 1));
  const summary = weeklySummary(s, start, today);
  const target = targetOn(s.targets, today);
  const rows = dayRows(s, start, today);
  const logged = rows.filter((r) => r.logged);
  const avg = (k: 'carbsG' | 'fatG') =>
    logged.length ? logged.reduce((t, r) => t + r[k], 0) / logged.length : null;
  const gaining = profile.goal === 'muscle_gain' || profile.goal === 'weight_gain';
  const onTrack = logged.filter(
    (r) => r.target !== null && !(gaining ? r.kcal < r.target * 0.9 : r.kcal > r.target * 1.1),
  ).length;
  const byDay = new Map<string, MealItem[]>();
  for (const m of s.meals.filter((x) => x.date >= start && x.date <= today)) {
    byDay.set(m.date, [...(byDay.get(m.date) ?? []), m]);
  }
  const foodDays = [...byDay.keys()].sort();

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eathealthee-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ text: 'Data file download started' });
  };

  const macros: { label: string; avg: number | null; target: number | undefined; color: string }[] =
    [
      { label: 'Protein', avg: summary.avgProteinG, target: target?.proteinG, color: '#356b4f' },
      { label: 'Carbs', avg: avg('carbsG'), target: target?.carbsG, color: '#dca46c' },
      { label: 'Fat', avg: avg('fatG'), target: target?.fatG, color: '#c98272' },
    ];
  const th = 'px-1 py-1 font-semibold text-slate-500 print:py-0.5';
  const td = 'px-1 py-1 print:py-[1px]';

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 print:max-w-none print:p-0 print:text-black">
      <div className="space-y-4 print:hidden">
        <BackButton fallback="/me" />
        <div className="space-y-4 rounded-[22px] bg-white p-4 dark:bg-slate-800">
          <div>
            <p className="text-[1.0625rem] font-semibold">Your report</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              30 days fit on one page. Tap Save as PDF, then choose &quot;Save as PDF&quot; (on
              iPhone: tap Share, then Save to Files).
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Period">
            {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => setRange(r)}
                className={`min-h-9 rounded-full px-3 text-sm font-semibold ${range === r ? 'bg-emerald-strong text-white dark:bg-emerald dark:text-black' : 'bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24]'}`}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
          <CheckCards
            label="Extra pages"
            options={[
              {
                key: 'details',
                label: 'Include each food I ate',
                sub: 'Adds a food list after the summary page',
                icon: '🍽️',
                checked: details,
              },
            ]}
            onToggle={(_, v) => setDetails(v)}
          />
          <Button className="w-full" onClick={() => window.print()}>
            Save as PDF
          </Button>
        </div>
      </div>

      {/* The printable report: page 1 is a one-page summary for 30 days. */}
      <article className="space-y-4 rounded-[22px] bg-white p-4 text-[0.8125rem] text-navy print:space-y-3 print:rounded-none print:p-0 print:text-[9.5px] dark:bg-slate-800 dark:text-slate-100 print:dark:bg-white print:dark:text-black">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <img src="/brand/icon-192.png" alt="" className="size-8 rounded-lg print:size-7" />
            <div>
              <p className="text-base leading-tight font-bold">EatHealthee report</p>
              <p className="text-xs text-slate-500">
                {profile.nickname ? `${profile.nickname} · ` : ''}
                {formatDateFull(start)} – {formatDateFull(today)}
              </p>
            </div>
          </div>
          <p className="text-right text-xs text-slate-500">
            {GOAL_LABELS[profile.goal]}
            {target && (
              <>
                <br />
                Target {fmtInt(target.caloriesKcal)} kcal/day
              </>
            )}
          </p>
        </header>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 print:grid-cols-4">
          <Tile
            label="Days with food logged"
            value={`${summary.loggedDays} / ${summary.dayCount}`}
            note={`${summary.completeDays} complete`}
          />
          <Tile
            label="Average calories"
            value={summary.avgKcal !== null ? `${fmtInt(summary.avgKcal)} kcal` : '—'}
            note={logged.length ? `${onTrack} of ${logged.length} days on track` : 'no food logged'}
          />
          <Tile
            label="Average protein"
            value={summary.avgProteinG !== null ? `${fmtInt(summary.avgProteinG)} g` : '—'}
            note={target ? `target ${target.proteinG} g` : undefined}
          />
          <Tile
            label="Weight change"
            value={
              summary.weight
                ? `${summary.weight.change > 0 ? '+' : ''}${fmt1(summary.weight.change)} kg`
                : '—'
            }
            note={
              summary.weight
                ? `${fmt1(summary.weight.first)} → ${fmt1(summary.weight.last)} kg`
                : 'needs 2 weigh-ins'
            }
          />
        </section>

        <section className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
          <div className="break-inside-avoid">
            <p className="mb-1 font-semibold">Calories per day</p>
            <CaloriesChart rows={rows} gaining={gaining} />
            <p className="mt-0.5 flex gap-3 text-[0.6875rem] text-slate-500">
              <span>
                <span className="mr-1 inline-block size-2 rounded-sm bg-[#4e8a66]" />
                On track
              </span>
              <span>
                <span className="mr-1 inline-block size-2 rounded-sm bg-[#dca46c]" />
                {gaining ? 'Under target' : 'Over target'}
              </span>
            </p>
          </div>
          <div className="break-inside-avoid">
            <p className="mb-1 font-semibold">Weight</p>
            <WeightChart rows={rows} startKg={startWeightKg(s)} goalKg={profile.targetWeightKg} />
          </div>
        </section>

        <section className="break-inside-avoid">
          <p className="mb-1 font-semibold">Average a day vs target</p>
          <div className="grid grid-cols-3 gap-3">
            {macros.map((m) => (
              <div key={m.label}>
                <p className="flex justify-between text-xs">
                  <span>{m.label}</span>
                  <span className="font-semibold">
                    {m.avg !== null ? `${fmtInt(m.avg)} g` : '—'}
                    {m.target !== undefined && (
                      <span className="font-normal text-slate-500"> / {m.target} g</span>
                    )}
                  </span>
                </p>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100 print:border print:border-slate-200">
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: m.color,
                      width: `${m.avg !== null && m.target ? Math.min(100, (m.avg / m.target) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-1 font-semibold">Day by day</p>
          <table className="w-full border-collapse tabular-nums">
            <thead>
              <tr className="border-b border-slate-300 text-[0.6875rem]">
                <th className={`${th} text-left`}>Date</th>
                <th className={`${th} text-right`}>kcal</th>
                <th className={`${th} text-right`}>Protein</th>
                <th className={`${th} text-right`}>Carbs</th>
                <th className={`${th} text-right`}>Fat</th>
                <th className={`${th} text-right`}>Weight</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.date}
                  className={`border-b border-slate-100 ${r.logged ? '' : 'text-slate-400'}`}
                >
                  <td className={`${td} text-left whitespace-nowrap`}>{dayLabel(r.date)}</td>
                  <td className={`${td} text-right font-semibold`}>
                    {r.logged ? fmtInt(r.kcal) : '—'}
                    {r.complete && <span className="ml-0.5 text-[#248a3d]">✓</span>}
                  </td>
                  <td className={`${td} text-right`}>
                    {r.logged ? `${fmtInt(r.proteinG)} g` : ''}
                  </td>
                  <td className={`${td} text-right`}>{r.logged ? `${fmtInt(r.carbsG)} g` : ''}</td>
                  <td className={`${td} text-right`}>{r.logged ? `${fmtInt(r.fatG)} g` : ''}</td>
                  <td className={`${td} text-right`}>
                    {r.weight !== null ? `${fmt1(r.weight)} kg` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-[0.6875rem] text-slate-500">
            ✓ = you marked the day as complete. Averages only count days with food logged. Calories
            and nutrients are estimates and not medical advice.
          </p>
        </section>

        {details && (
          <section className="space-y-3 print:break-before-page">
            <p className="font-semibold">Food you ate</p>
            {foodDays.length === 0 ? (
              <p className="text-slate-500">No food logged in this period.</p>
            ) : (
              foodDays.map((d) => {
                const items = MEAL_TYPES.flatMap((m) => byDay.get(d)!.filter((i) => i.meal === m));
                return (
                  <div key={d} className="break-inside-avoid">
                    <p className="flex justify-between border-b border-slate-200 font-semibold">
                      <span>{dayLabel(d)}</span>
                      <span>{fmtInt(sumNutrients(items).kcal)} kcal</span>
                    </p>
                    <table className="w-full tabular-nums">
                      <tbody>
                        {items.map((i) => (
                          <tr key={i.id} className="border-b border-slate-100">
                            <td className="w-20 py-0.5 pr-2 text-slate-500">
                              {i.label ?? MEAL_LABELS[i.meal]}
                            </td>
                            <td className="py-0.5 pr-2">{i.name}</td>
                            <td className="py-0.5 pr-2 text-right whitespace-nowrap">
                              {fmtInt(i.grams)} g
                            </td>
                            <td className="py-0.5 text-right whitespace-nowrap">
                              {fmtInt(i.nutrients.kcal)} kcal
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })
            )}
          </section>
        )}
      </article>

      <div className="pb-6 text-center print:hidden">
        <button
          type="button"
          onClick={downloadJson}
          className="text-sm text-emerald-strong hover:opacity-70 dark:text-emerald"
        >
          Download the raw data file instead (JSON, for backups)
        </button>
      </div>
    </div>
  );
}

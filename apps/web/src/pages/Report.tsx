import { addDays } from '@fittrack/engine';
import { useMemo, useState } from 'react';
import { useToast } from '../components/Toast';
import { BackButton, Button } from '../components/ui';
import { getState, useAppState } from '../data/store';
import type { MealItem } from '../data/types';
import { formatDateFull, localToday } from '../lib/dates';
import { fmt1, fmtInt } from '../lib/format';
import { GOAL_LABELS } from '../lib/messages';
import { MEAL_LABELS, MEAL_TYPES, sumNutrients } from '../logic/nutrition';
import { targetOn } from '../logic/targets';
import { weeklySummary } from '../logic/weekly';

type Range = '30' | '90' | 'all';
const RANGE_LABELS: Record<Range, string> = {
  '30': 'Last 30 days',
  '90': 'Last 90 days',
  all: 'Everything',
};

/**
 * A readable report of the user's logs, laid out for printing. "Save as PDF" opens the
 * browser's print dialog, where every phone and computer can save it as a PDF; this
 * keeps Chinese and other characters intact without bundling fonts.
 */
export function Report() {
  const s = useAppState();
  const toast = useToast();
  const today = useMemo(() => localToday(), []);
  const [range, setRange] = useState<Range>('30');
  const profile = s.profile;
  if (!profile) return null;

  const first = [...s.meals.map((m) => m.date), ...s.weights.map((w) => w.date)].sort()[0];
  const start = range === 'all' ? (first ?? today) : addDays(today, -(Number(range) - 1));
  const inRange = (d: string) => d >= start && d <= today;
  const summary = weeklySummary(s, start, today);
  const target = targetOn(s.targets, today);
  const weights = s.weights
    .filter((w) => inRange(w.date))
    .sort((a, b) => b.date.localeCompare(a.date));
  const byDay = new Map<string, MealItem[]>();
  for (const m of s.meals.filter((x) => inRange(x.date))) {
    byDay.set(m.date, [...(byDay.get(m.date) ?? []), m]);
  }
  const days = [...byDay.keys()].sort().reverse();

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

  const th = 'py-1.5 pr-2 text-left text-xs font-semibold text-slate-500';
  const td = 'py-1.5 pr-2 align-top';

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 print:max-w-none print:p-0 print:text-black">
      <div className="space-y-4 print:hidden">
        <BackButton fallback="/me" />
        <div className="rounded-[22px] bg-white p-4 dark:bg-slate-800">
          <p className="text-sm font-semibold">Your report</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Choose a period, then tap Save as PDF. In the window that opens, choose &quot;Save as
            PDF&quot; (on iPhone: tap Share, then Save to Files).
          </p>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Period">
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
          <Button className="mt-3 w-full" onClick={() => window.print()}>
            Save as PDF
          </Button>
        </div>
      </div>

      {/* The printable report */}
      <article className="space-y-6 rounded-[22px] bg-white p-5 text-navy print:rounded-none print:p-0 dark:bg-slate-800 dark:text-slate-100 print:dark:bg-white">
        <header className="border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <img src="/brand/icon-192.png" alt="" className="size-8 rounded-lg" />
            <p className="text-lg font-bold">EatHealthee report</p>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 print:text-slate-600">
            {profile.nickname ? `${profile.nickname} · ` : ''}
            {formatDateFull(start)} – {formatDateFull(today)} · made on {formatDateFull(today)}
          </p>
        </header>

        <section>
          <h2 className="mb-2 font-bold">Summary</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className={td}>Goal</td>
                <td className={`${td} text-right font-semibold`}>
                  {GOAL_LABELS[profile.goal]}
                  {profile.targetWeightKg !== undefined &&
                    profile.goal !== 'maintain' &&
                    ` · target ${fmt1(profile.targetWeightKg)} kg`}
                </td>
              </tr>
              {target && (
                <tr>
                  <td className={td}>Daily target</td>
                  <td className={`${td} text-right font-semibold`}>
                    {fmtInt(target.caloriesKcal)} kcal · protein {target.proteinG} g · carbs{' '}
                    {target.carbsG} g · fat {target.fatG} g
                  </td>
                </tr>
              )}
              <tr>
                <td className={td}>Days with food logged</td>
                <td className={`${td} text-right font-semibold`}>
                  {summary.loggedDays} of {summary.dayCount}
                </td>
              </tr>
              <tr>
                <td className={td}>Average calories a day</td>
                <td className={`${td} text-right font-semibold`}>
                  {summary.avgKcal !== null ? `${fmtInt(summary.avgKcal)} kcal` : '—'}
                </td>
              </tr>
              <tr>
                <td className={td}>Average protein a day</td>
                <td className={`${td} text-right font-semibold`}>
                  {summary.avgProteinG !== null ? `${fmtInt(summary.avgProteinG)} g` : '—'}
                </td>
              </tr>
              <tr>
                <td className={td}>Weight</td>
                <td className={`${td} text-right font-semibold`}>
                  {summary.weight
                    ? `${fmt1(summary.weight.first)} → ${fmt1(summary.weight.last)} kg (${summary.weight.change > 0 ? '+' : ''}${fmt1(summary.weight.change)} kg)`
                    : weights[0]
                      ? `${fmt1(weights[0].weightKg)} kg`
                      : '—'}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-1 text-xs text-slate-500">Averages only count days with food logged.</p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">Weight log</h2>
          {weights.length === 0 ? (
            <p className="text-sm text-slate-500">No weigh-ins in this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className={th}>Date</th>
                  <th className={`${th} text-right`}>Weight</th>
                  <th className={`${th} text-right`}>Waist</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {weights.map((w) => (
                  <tr key={w.id} className="break-inside-avoid">
                    <td className={td}>{formatDateFull(w.date)}</td>
                    <td className={`${td} text-right font-semibold`}>{fmt1(w.weightKg)} kg</td>
                    <td className={`${td} text-right`}>
                      {w.waistCm !== undefined ? `${fmt1(w.waistCm)} cm` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2 className="mb-2 font-bold">Food log</h2>
          {days.length === 0 ? (
            <p className="text-sm text-slate-500">No food logged in this period.</p>
          ) : (
            <div className="space-y-4">
              {days.map((d) => {
                const items = MEAL_TYPES.flatMap((m) => byDay.get(d)!.filter((i) => i.meal === m));
                const total = sumNutrients(items);
                return (
                  <div key={d} className="break-inside-avoid">
                    <p className="flex justify-between border-b border-slate-200 pb-1 text-sm font-semibold">
                      <span>
                        {formatDateFull(d)}
                        {s.completeDays.includes(d) && (
                          <span className="ml-1.5 text-xs font-normal text-slate-500">
                            · complete day
                          </span>
                        )}
                      </span>
                      <span>{fmtInt(total.kcal)} kcal</span>
                    </p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className={th}>Meal</th>
                          <th className={th}>Food</th>
                          <th className={`${th} text-right`}>Amount</th>
                          <th className={`${th} text-right`}>kcal</th>
                          <th className={`${th} hidden text-right sm:table-cell print:table-cell`}>
                            Protein / carbs / fat (g)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((i) => (
                          <tr key={i.id}>
                            <td className={`${td} w-20 text-xs text-slate-500`}>
                              {i.label ?? MEAL_LABELS[i.meal]}
                            </td>
                            <td className={td}>{i.name}</td>
                            <td className={`${td} text-right whitespace-nowrap`}>
                              {fmtInt(i.grams)} g
                            </td>
                            <td className={`${td} text-right whitespace-nowrap`}>
                              {fmtInt(i.nutrients.kcal)}
                            </td>
                            <td
                              className={`${td} hidden text-right text-xs whitespace-nowrap text-slate-500 sm:table-cell print:table-cell`}
                            >
                              {fmtInt(i.nutrients.proteinG)} / {fmtInt(i.nutrients.carbsG)} /{' '}
                              {fmtInt(i.nutrients.fatG)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <footer className="border-t border-slate-200 pt-3 text-xs text-slate-500">
          Calories and nutrients are estimates from food databases and AI photo analysis. This
          report is for your own records and is not medical advice.
        </footer>
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

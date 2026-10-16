import { addDays } from '@fittrack/engine';
import { useState } from 'react';
import type { AppState } from '../data/types';
import { shortDate } from '../lib/dates';
import { fmt1, fmtInt } from '../lib/format';
import { currentStreak, loggedDates } from '../logic/achievements';
import { mealsOn, sumNutrients } from '../logic/nutrition';
import { targetOn } from '../logic/targets';
import { datesBetween, mondayOf, weeklySummary } from '../logic/weekly';
import { Card } from './ui';
import { getLang, t, tn } from '../lib/i18n';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_LETTERS_ZH = ['一', '二', '三', '四', '五', '六', '日'];
const WEEKS_BACK = 11;

/**
 * "How did this week go?" in plain words: calories each day against the target, the
 * average, protein and the weight change. Arrows step back through earlier weeks.
 */
export function ThisWeek({ s, today, hide }: { s: AppState; today: string; hide: boolean }) {
  const thisMonday = mondayOf(today);
  const [back, setBack] = useState(0);
  const monday = addDays(thisMonday, -7 * back);
  const sunday = addDays(monday, 6);
  const end = sunday < today ? sunday : today;
  const w = weeklySummary(s, monday, end, today);
  const streak = currentStreak(loggedDates(s), today);
  const goal = s.profile?.goal;
  const gaining = goal === 'muscle_gain' || goal === 'weight_gain';

  const days = datesBetween(monday, sunday).map((date) => {
    const meals = mealsOn(s.meals, date);
    const t = targetOn(s.targets, date);
    return {
      date,
      future: date > today,
      logged: meals.length > 0,
      kcal: sumNutrients(meals).kcal,
      target: t?.caloriesKcal ?? null,
    };
  });
  const maxKcal = Math.max(1, ...days.map((d) => d.kcal), ...days.map((d) => d.target ?? 0)) * 1.1;
  const targetLine = w.targetKcal;
  // Off target = well over for losing or keeping weight, well under for gaining.
  const offTarget = (kcal: number, target: number | null) =>
    target !== null && (gaining ? kcal < target * 0.9 : kcal > target * 1.1);

  const title =
    back === 0
      ? t('This week')
      : back === 1
        ? t('Last week')
        : t('Week of {v1}', { v1: shortDate(monday) });
  const elapsed = days.filter((d) => !d.future).length;

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[1.25rem] leading-tight font-bold">{title}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {shortDate(monday)} – {shortDate(sunday)}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label={t('Previous week')}
            disabled={back >= WEEKS_BACK}
            onClick={() => setBack((b) => b + 1)}
            className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-lg text-emerald-strong disabled:opacity-30 dark:bg-slate-700 dark:text-emerald"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label={t('Next week')}
            disabled={back === 0}
            onClick={() => setBack((b) => b - 1)}
            className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-lg text-emerald-strong disabled:opacity-30 dark:bg-slate-700 dark:text-emerald"
          >
            ›
          </button>
        </div>
      </div>

      <p className="mt-3 text-[0.9375rem]">
        {tn('You logged food on {days}', {
          days: (
            <strong>
              {t(elapsed === 1 ? '{n} of {total} day' : '{n} of {total} days', {
                n: w.loggedDays,
                total: elapsed,
              })}
            </strong>
          ),
        })}
        {back === 0 && streak > 1 && (
          <span className="text-[#8b571f] dark:text-[#e8b978]">
            {' '}
            · 🔥 {t('{n} days in a row', { n: streak })}
          </span>
        )}
      </p>

      {/* Calories per day */}
      <div className="mt-4">
        <div className="relative flex h-32 items-end gap-2" aria-hidden={hide}>
          {!hide && targetLine !== null && (
            <div
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-slate-400"
              style={{ bottom: `${(targetLine / maxKcal) * 100}%` }}
            >
              <span className="absolute -top-4 right-0 text-[0.625rem] text-slate-500">
                {t('target')} {fmtInt(targetLine)}
              </span>
            </div>
          )}
          {days.map((d) => (
            <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end">
              {d.logged ? (
                <div
                  className={`w-full max-w-9 rounded-[6px] ${offTarget(d.kcal, d.target) ? 'bg-[#b5793a] dark:bg-[#e8b978]' : 'bg-emerald-500'}`}
                  style={{ height: hide ? '60%' : `${Math.max(4, (d.kcal / maxKcal) * 100)}%` }}
                  title={hide ? undefined : t('{v1} kcal', { v1: fmtInt(d.kcal) })}
                />
              ) : (
                <div
                  className={`h-1.5 w-full max-w-9 rounded-full ${d.future ? 'bg-slate-100 dark:bg-slate-700' : 'bg-slate-200 dark:bg-slate-600'}`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-2">
          {days.map((d, i) => (
            <span
              key={d.date}
              className={`flex-1 text-center text-[0.6875rem] ${d.date === today ? 'font-bold text-emerald-strong dark:text-emerald' : 'text-slate-500 dark:text-slate-400'}`}
            >
              {(getLang() === 'zh' ? DAY_LETTERS_ZH : DAY_LETTERS)[i]}
            </span>
          ))}
        </div>
        <ul className="sr-only">
          {days
            .filter((d) => !d.future)
            .map((d) => (
              <li key={d.date}>
                {shortDate(d.date)}:{' '}
                {d.logged
                  ? hide
                    ? 'logged'
                    : t('{v1} kcal', { v1: fmtInt(d.kcal) })
                  : t('not logged')}
              </li>
            ))}
        </ul>
        {!hide && (
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.6875rem] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-sm bg-emerald-500" /> {t('On track')}
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-sm bg-[#b5793a] dark:bg-[#e8b978]" />
              {gaining ? t('Under target') : t('Over target')}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1 w-2.5 rounded-full bg-slate-300" /> {t('Not logged')}
            </span>
          </p>
        )}
      </div>

      {/* Plain-language summary */}
      {!hide && (
        <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100 text-sm dark:divide-slate-700 dark:border-slate-700">
          <li className="flex justify-between gap-3 py-2.5">
            <span className="text-slate-600 dark:text-slate-300">
              {t('Average calories a day')}
            </span>
            <span className="text-right font-semibold">
              {w.avgKcal !== null ? t('{v1} kcal', { v1: fmtInt(w.avgKcal) }) : '—'}
              {w.targetKcal !== null && (
                <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                  {t('target')} {fmtInt(w.targetKcal)}
                </span>
              )}
            </span>
          </li>
          <li className="flex justify-between gap-3 py-2.5">
            <span className="text-slate-600 dark:text-slate-300">{t('Average protein a day')}</span>
            <span className="text-right font-semibold">
              {w.avgProteinG !== null ? `${fmtInt(w.avgProteinG)} g` : '—'}
              {w.targetProteinG !== null && (
                <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                  {t('target')} {w.targetProteinG} g
                </span>
              )}
            </span>
          </li>
          <li className="flex justify-between gap-3 py-2.5">
            <span className="text-slate-600 dark:text-slate-300">{t('Weight change')}</span>
            <span className="text-right font-semibold">
              {w.weight ? (
                <>
                  {w.weight.change > 0 ? '+' : w.weight.change < 0 ? '−' : ''}
                  {fmt1(Math.abs(w.weight.change))} {t('kg')}
                  <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                    {fmt1(w.weight.first)} → {fmt1(w.weight.last)} {t('kg')}
                  </span>
                </>
              ) : (
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  {t('Weigh in twice in a week to see it')}
                </span>
              )}
            </span>
          </li>
        </ul>
      )}
      {!hide && w.loggedDays > 0 && (
        <p className="mt-2 text-[0.6875rem] text-slate-500 dark:text-slate-400">
          {t("Averages only count days you logged food; days you skipped don't count as 0.")}
        </p>
      )}
    </Card>
  );
}

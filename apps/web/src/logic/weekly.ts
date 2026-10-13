import { addDays } from '@fittrack/engine';
import type { AppState } from '../data/types';
import { mealsOn, sumNutrients } from './nutrition';
import { targetOn } from './targets';

// Weekly summary for the progress page. Rules (shown to the user in the UI):
// - A "complete" day is one the user marked as fully recorded (Diary checkbox). Only
//   complete days are judged for protein and the calorie range, because a day with a
//   single logged snack says nothing about real intake.
// - Averages use days that have records; days without records are never counted as 0.
// - "Within target" means 90-110% of that day's calorie target and never below the
//   safety floor, so eating far less than planned is not rewarded.
export type Period = 'this_week' | 'last_week' | 'last_7';

export const PERIOD_LABELS: Record<Period, string> = {
  this_week: '本周',
  last_week: '上周',
  last_7: '近 7 天',
};

/** Monday of the week containing `date` (local calendar dates). */
export function mondayOf(date: string): string {
  const day = new Date(`${date}T00:00:00`).getDay(); // 0 = Sunday
  return addDays(date, -((day + 6) % 7));
}

/** Inclusive start and end dates; `end` never goes past today. */
export function periodRange(period: Period, today: string): { start: string; end: string } {
  if (period === 'last_7') return { start: addDays(today, -6), end: today };
  const monday = mondayOf(today);
  if (period === 'last_week') return { start: addDays(monday, -7), end: addDays(monday, -1) };
  return { start: monday, end: today };
}

export function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

export interface WeeklySummary {
  start: string;
  end: string;
  /** Days in the period up to today. */
  dayCount: number;
  loggedDays: number;
  completeDays: number;
  /** Average kcal over days with any record; null with no records. */
  avgKcal: number | null;
  avgProteinG: number | null;
  /** Average kcal over complete days only (used for calorie insights). */
  avgCompleteKcal: number | null;
  /** Complete days that met the protein target / complete days with a target. */
  proteinMetDays: number;
  proteinJudgedDays: number;
  withinTargetDays: number;
  /** Current calorie and protein targets (latest in the period). */
  targetKcal: number | null;
  targetProteinG: number | null;
  /** First and last weigh-in in the period; null unless there are two different days. */
  weight: {
    first: number;
    last: number;
    change: number;
    firstDate: string;
    lastDate: string;
  } | null;
  weighIns: number;
}

export const WEEKLY_LOG_GOAL = 5;

export function weeklySummary(s: AppState, start: string, end: string): WeeklySummary {
  const days = datesBetween(start, end);
  let loggedDays = 0;
  let complete = 0;
  let kcalSum = 0;
  let proteinSum = 0;
  let proteinMet = 0;
  let proteinJudged = 0;
  let within = 0;
  let completeKcal = 0;
  for (const d of days) {
    const meals = mealsOn(s.meals, d);
    if (meals.length === 0) continue;
    loggedDays++;
    const n = sumNutrients(meals);
    kcalSum += n.kcal;
    proteinSum += n.proteinG;
    if (!s.completeDays.includes(d)) continue;
    complete++;
    completeKcal += n.kcal;
    const t = targetOn(s.targets, d);
    if (!t) continue;
    proteinJudged++;
    if (n.proteinG >= t.proteinG) proteinMet++;
    if (
      n.kcal >= t.caloriesKcal * 0.9 &&
      n.kcal <= t.caloriesKcal * 1.1 &&
      n.kcal >= t.calorieFloorKcal
    )
      within++;
  }
  const t = targetOn(s.targets, end);
  const inPeriod = s.weights
    .filter((w) => w.date >= start && w.date <= end)
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const first = inPeriod[0];
  const last = inPeriod.at(-1);
  return {
    start,
    end,
    dayCount: days.length,
    loggedDays,
    completeDays: complete,
    avgKcal: loggedDays ? kcalSum / loggedDays : null,
    avgProteinG: loggedDays ? proteinSum / loggedDays : null,
    avgCompleteKcal: complete ? completeKcal / complete : null,
    proteinMetDays: proteinMet,
    proteinJudgedDays: proteinJudged,
    withinTargetDays: within,
    targetKcal: t?.caloriesKcal ?? null,
    targetProteinG: t?.proteinG ?? null,
    weight:
      first && last && first.date !== last.date
        ? {
            first: first.weightKg,
            last: last.weightKg,
            change: last.weightKg - first.weightKg,
            firstDate: first.date,
            lastDate: last.date,
          }
        : null,
    weighIns: new Set(inPeriod.map((w) => w.date)).size,
  };
}

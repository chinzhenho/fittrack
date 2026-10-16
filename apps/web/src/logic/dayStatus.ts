import { addDays } from '@fittrack/engine';
import type { AppState } from '../data/types';
import { localToday } from '../lib/dates';
import { targetOn } from './targets';

// Which days count as fully logged, worked out automatically (like MacroFactor):
// a past day with food logged counts, unless its total is under half of the user's
// usual intake. Such a day may be half-logged, so the app asks once ("did you eat
// less, or forget some food?") and only counts it after "I ate less".
// Days the user ticked before this change (completeDays) still count.

export type DayStatus =
  /** Today or later: the day isn't over yet. */
  | 'open'
  /** Nothing logged. */
  | 'empty'
  | 'complete'
  /** The user said some food wasn't logged. */
  | 'partial'
  /** Much lower than usual: ask the user before counting it. */
  | 'check';

/** A day counts as low when it is under this share of the usual intake. */
export const LOW_DAY_SHARE = 0.5;
const USUAL_WINDOW_DAYS = 21;
const USUAL_MIN_DAYS = 3;

const totalsCache = new WeakMap<AppState['meals'], Map<string, number>>();

/** kcal logged per day. */
function dayTotals(s: AppState): Map<string, number> {
  let totals = totalsCache.get(s.meals);
  if (!totals) {
    totals = new Map();
    for (const m of s.meals) totals.set(m.date, (totals.get(m.date) ?? 0) + m.nutrients.kcal);
    totalsCache.set(s.meals, totals);
  }
  return totals;
}

function median(values: number[]): number {
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid]! : (v[mid - 1]! + v[mid]!) / 2;
}

/**
 * The user's usual daily intake before a date: the median of logged days in the
 * 3 weeks before it (days marked as not fully logged left out), or the calorie target when there are
 * fewer than 3 such days. Null when neither is known.
 */
export function usualKcal(s: AppState, date: string): number | null {
  const totals = dayTotals(s);
  const from = addDays(date, -USUAL_WINDOW_DAYS);
  const recent = [...totals.entries()]
    .filter(([d]) => d >= from && d < date && !(s.partialDays ?? []).includes(d))
    .map(([, kcal]) => kcal);
  if (recent.length >= USUAL_MIN_DAYS) return median(recent);
  return targetOn(s.targets, date)?.caloriesKcal ?? null;
}

export function dayStatus(s: AppState, date: string, today = localToday()): DayStatus {
  if (date >= today) return 'open';
  const kcal = dayTotals(s).get(date);
  if (kcal === undefined) return 'empty';
  if ((s.partialDays ?? []).includes(date)) return 'partial';
  if (s.completeDays.includes(date)) return 'complete';
  const usual = usualKcal(s, date);
  return usual !== null && kcal < usual * LOW_DAY_SHARE ? 'check' : 'complete';
}

export function isCompleteDay(s: AppState, date: string, today = localToday()): boolean {
  return dayStatus(s, date, today) === 'complete';
}

/** Past days that need the "did you eat less?" question, newest first. */
export function daysToCheck(s: AppState, today = localToday(), lookback = 14): string[] {
  const from = addDays(today, -lookback);
  return [...dayTotals(s).keys()]
    .filter((d) => d >= from && dayStatus(s, d, today) === 'check')
    .sort()
    .reverse();
}

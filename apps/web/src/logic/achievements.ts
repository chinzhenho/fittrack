import { addDays } from '@fittrack/engine';
import type { AppState } from '../data/types';

// Logging streaks. Medals and records are in trophies.ts.

/** Dates (YYYY-MM-DD, ascending) with at least one food entry. */
export function loggedDates(s: AppState): string[] {
  return [...new Set(s.meals.map((m) => m.date))].sort();
}

/**
 * Consecutive logged days ending today. If today has nothing yet, the streak still
 * counts up to yesterday, so it does not "break" in the morning before breakfast.
 */
export function currentStreak(dates: string[], today: string): number {
  const set = new Set(dates);
  let day = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

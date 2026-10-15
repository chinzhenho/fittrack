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

export function longestStreak(dates: string[]): number {
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of dates) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export interface ProgressSummary {
  streak: number;
  longest: number;
  daysLogged: number;
}

export function progressSummary(s: AppState, today: string): ProgressSummary {
  const dates = loggedDates(s);
  return {
    streak: currentStreak(dates, today),
    longest: longestStreak(dates),
    daysLogged: dates.length,
  };
}

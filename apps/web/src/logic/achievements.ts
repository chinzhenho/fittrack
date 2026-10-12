import { addDays, trendOn } from '@fittrack/engine';
import type { AppState } from '../data/types';
import { mealsOn, sumNutrients } from './nutrition';
import { startWeightKg, targetOn, trendPoints } from './targets';

// Streaks and badges for the progress page. Everything is derived from the records,
// so deleting an entry also takes back a badge it earned.

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

export interface Badge {
  id: string;
  icon: string;
  title: string;
  /** What it takes to earn it. */
  need: string;
  unlocked: boolean;
  progress: { value: number; max: number };
}

export interface ProgressSummary {
  streak: number;
  longest: number;
  daysLogged: number;
  /** Trend weight change since the first weigh-in, in the goal's direction (positive = good). */
  towardGoalKg: number | null;
  badges: Badge[];
}

export function progressSummary(s: AppState, today: string): ProgressSummary {
  const dates = loggedDates(s);
  const streak = currentStreak(dates, today);
  const longest = longestStreak(dates);
  const goal = s.profile?.goal;

  const points = trendPoints(s.weights);
  const start = startWeightKg(s);
  const trend = trendOn(points, today);
  const direction = goal === 'fat_loss' ? -1 : goal === 'maintain' || !goal ? 0 : 1;
  const towardGoalKg =
    start !== null && trend !== null && direction !== 0 ? (trend - start) * direction : null;

  const proteinDays = dates.filter((d) => {
    const t = targetOn(s.targets, d);
    return t !== null && sumNutrients(mealsOn(s.meals, d)).proteinG >= t.proteinG;
  }).length;
  const weighIns = new Set(s.weights.map((w) => w.date)).size;
  const goalKg = s.profile?.targetWeightKg;
  const reached =
    goalKg !== undefined &&
    trend !== null &&
    direction !== 0 &&
    (direction < 0 ? trend <= goalKg : trend >= goalKg);

  const badge = (
    id: string,
    icon: string,
    title: string,
    need: string,
    value: number,
    max: number,
  ): Badge => ({
    id,
    icon,
    title,
    need,
    unlocked: value >= max,
    progress: { value: Math.min(value, max), max },
  });

  const lostWord = direction < 0 ? '減' : '增';
  const badges: Badge[] = [
    badge('first', '🌱', '好的開始', '記錄第一餐', dates.length, 1),
    badge('streak3', '🔥', '連續 3 天', '連續 3 天記錄飲食', longest, 3),
    badge('streak7', '⭐', '一整週', '連續 7 天記錄飲食', longest, 7),
    badge('streak30', '🏆', '習慣養成', '連續 30 天記錄飲食', longest, 30),
    badge('protein7', '💪', '蛋白質達人', '7 天蛋白質吃夠', proteinDays, 7),
    badge('weigh10', '⚖️', '持續追蹤', '記錄體重 10 天', weighIns, 10),
  ];
  if (direction !== 0) {
    const kg = Math.max(0, towardGoalKg ?? 0);
    badges.push(
      badge('kg1', '🎯', `${lostWord}了 1 kg`, `趨勢體重${lostWord} 1 kg`, kg, 1),
      badge('kg5', '🥇', `${lostWord}了 5 kg`, `趨勢體重${lostWord} 5 kg`, kg, 5),
    );
  }
  if (goalKg !== undefined && direction !== 0) {
    badges.push(badge('goal', '🎉', '達到目標', `趨勢體重到達 ${goalKg} kg`, reached ? 1 : 0, 1));
  }

  return { streak, longest, daysLogged: dates.length, towardGoalKg, badges };
}

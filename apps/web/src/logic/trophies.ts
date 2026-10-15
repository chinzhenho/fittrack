import { addDays } from '@fittrack/engine';
import type { IconName } from '../components/Icons';
import type { AppState } from '../data/types';
import { loggedDates } from './achievements';
import { activeChallenge, challengeProgress, type ChallengeId } from './habits';
import { mealsOn, sumNutrients } from './nutrition';
import { startWeightKg, targetOn, trendPoints } from './targets';
import { datesBetween, mondayOf } from './weekly';

// Strava-style achievements: tiered medals, a monthly challenge, personal records and
// a feed of recent achievements. Everything, including the date a medal was earned, is
// worked out from the records, so editing or deleting an entry updates it.

export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';
export const TIERS: Tier[] = ['bronze', 'silver', 'gold', 'platinum'];
export const TIER_LABELS: Record<Tier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

export interface TrophyLevel {
  tier: Tier;
  goal: number;
  /** Date the goal was first reached, or null. */
  earnedOn: string | null;
}

export interface TrophyFamily {
  id: string;
  icon: IconName;
  title: string;
  /** e.g. "days in a row"; shown after the goal number. */
  unit: string;
  value: number;
  levels: TrophyLevel[];
}

export const MONTHLY_GOAL_DAYS = 20;

/** Food-logged dates the user ticked as complete ("I logged everything"). */
function completeDates(s: AppState): string[] {
  const logged = new Set(loggedDates(s));
  return [...new Set(s.completeDays)].filter((d) => logged.has(d)).sort();
}

function proteinDates(s: AppState): string[] {
  return loggedDates(s).filter((d) => {
    const t = targetOn(s.targets, d);
    return t !== null && sumNutrients(mealsOn(s.meals, d)).proteinG >= t.proteinG;
  });
}

function weighDates(s: AppState): string[] {
  return [...new Set(s.weights.map((w) => w.date))].sort();
}

/** Date on which the run of consecutive dates first reached n, or null. */
export function streakReachedOn(dates: string[], n: number): string | null {
  let run = 0;
  let prev: string | null = null;
  for (const d of dates) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    if (run >= n) return d;
    prev = d;
  }
  return null;
}

function longestRun(dates: string[]): { value: number; endedOn: string | null } {
  let best = 0;
  let endedOn: string | null = null;
  let run = 0;
  let prev: string | null = null;
  for (const d of dates) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    if (run > best) {
      best = run;
      endedOn = d;
    }
    prev = d;
  }
  return { value: best, endedOn };
}

function countFamily(
  id: string,
  icon: IconName,
  title: string,
  unit: string,
  dates: string[],
  goals: number[],
): TrophyFamily {
  return {
    id,
    icon,
    title,
    unit,
    value: dates.length,
    levels: goals.map((goal, i) => ({
      tier: TIERS[i]!,
      goal,
      earnedOn: dates[goal - 1] ?? null,
    })),
  };
}

/** +1 when the goal is to lose weight, -1 to gain, 0 to maintain. */
function lossDirection(s: AppState): -1 | 0 | 1 {
  const g = s.profile?.goal;
  return g === 'fat_loss' ? -1 : g === 'maintain' || !g ? 0 : 1;
}

/** A copy of the records up to and including `date`. */
function until(s: AppState, date: string): AppState {
  return {
    ...s,
    meals: s.meals.filter((m) => m.date <= date),
    weights: s.weights.filter((w) => w.date <= date),
    completeDays: s.completeDays.filter((d) => d <= date),
  };
}

/** Completion date of each accepted weekly challenge that was completed. */
export function challengeWins(s: AppState, today: string): { week: string; on: string }[] {
  const weeks = [...new Set(s.challenges.map((c) => c.weekStart))].sort();
  const wins: { week: string; on: string }[] = [];
  for (const week of weeks) {
    const rec = activeChallenge(s, week);
    if (!rec) continue;
    const id = rec.challenge as ChallengeId;
    if (!challengeProgress(s, id, week).done) continue;
    const day = datesBetween(week, addDays(week, 6))
      .filter((d) => d <= today)
      .find((d) => challengeProgress(until(s, d), id, week).done);
    if (day) wins.push({ week, on: day });
  }
  return wins;
}

export function trophyFamilies(s: AppState, today: string): TrophyFamily[] {
  const logged = loggedDates(s);
  const streak = longestRun(logged);
  const families: TrophyFamily[] = [
    {
      id: 'streak',
      icon: 'flame',
      title: 'Logging streak',
      unit: 'days in a row',
      value: streak.value,
      levels: [3, 7, 30, 100].map((goal, i) => ({
        tier: TIERS[i]!,
        goal,
        earnedOn: streakReachedOn(logged, goal),
      })),
    },
    countFamily('logged', 'fork', 'Days logged', 'days', logged, [10, 50, 100, 365]),
    countFamily('complete', 'check', 'Complete days', 'days', completeDates(s), [7, 30, 100, 200]),
    countFamily(
      'protein',
      'egg',
      'Protein days',
      'days on target',
      proteinDates(s),
      [7, 30, 100, 200],
    ),
    countFamily('weigh', 'scale', 'Weigh-ins', 'days', weighDates(s), [10, 30, 100, 200]),
  ];

  const dir = lossDirection(s);
  const start = startWeightKg(s);
  if (dir !== 0 && start !== null) {
    const points = trendPoints(s.weights);
    const toward = (kg: number) => (kg - start) * dir;
    const best = Math.max(0, ...points.map((p) => toward(p.trendKg)));
    families.push({
      id: 'kg',
      icon: 'trend',
      title: dir < 0 ? 'Weight lost' : 'Weight gained',
      unit: 'kg',
      value: Math.round(best * 10) / 10,
      levels: [1, 3, 5, 10].map((goal, i) => ({
        tier: TIERS[i]!,
        goal,
        earnedOn: points.find((p) => toward(p.trendKg) >= goal)?.date ?? null,
      })),
    });
  }

  const wins = challengeWins(s, today);
  families.push({
    id: 'challenges',
    icon: 'target',
    title: 'Weekly challenges',
    unit: 'completed',
    value: wins.length,
    levels: [1, 4, 12, 26].map((goal, i) => ({
      tier: TIERS[i]!,
      goal,
      earnedOn: wins[goal - 1]?.on ?? null,
    })),
  });
  return families;
}

/** Highest tier earned in a family, or null. */
export function topTier(f: TrophyFamily): TrophyLevel | null {
  return [...f.levels].reverse().find((l) => l.earnedOn !== null) ?? null;
}

/** The next tier to aim for, or null when all are earned. */
export function nextTier(f: TrophyFamily): TrophyLevel | null {
  return f.levels.find((l) => l.earnedOn === null) ?? null;
}

/** Date the trend first reached the target weight, or null. */
export function goalReachedOn(s: AppState): string | null {
  const dir = lossDirection(s);
  const goal = s.profile?.targetWeightKg;
  if (dir === 0 || goal === undefined) return null;
  return (
    trendPoints(s.weights).find((p) => (dir < 0 ? p.trendKg <= goal : p.trendKg >= goal))?.date ??
    null
  );
}

// Monthly challenge -----------------------------------------------------------------

export const monthKey = (date: string) => date.slice(0, 7);

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function monthName(month: string): string {
  return `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}

export function lastDayOfMonth(month: string): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(y, m, 0).getDate();
  return `${month}-${String(d).padStart(2, '0')}`;
}

export interface MonthlyChallenge {
  month: string;
  joined: boolean;
  value: number;
  goal: number;
  done: boolean;
  earnedOn: string | null;
  /** Days left in the month including today (0 for past months). */
  daysLeft: number;
  /** Still possible: value + days left reaches the goal. */
  reachable: boolean;
}

export function monthlyChallenge(s: AppState, month: string, today: string): MonthlyChallenge {
  const days = loggedDates(s).filter((d) => monthKey(d) === month);
  const end = lastDayOfMonth(month);
  const loggedToday = days.includes(today);
  const daysLeft =
    today > end ? 0 : datesBetween(today < `${month}-01` ? `${month}-01` : today, end).length;
  const remaining = daysLeft - (loggedToday ? 1 : 0);
  return {
    month,
    joined: s.monthlyJoined.includes(month),
    value: Math.min(days.length, MONTHLY_GOAL_DAYS),
    goal: MONTHLY_GOAL_DAYS,
    done: days.length >= MONTHLY_GOAL_DAYS,
    earnedOn: days[MONTHLY_GOAL_DAYS - 1] ?? null,
    daysLeft,
    reachable: days.length + remaining >= MONTHLY_GOAL_DAYS,
  };
}

/** Months whose challenge the user joined and completed, newest first. */
export function monthlyTrophies(s: AppState, today: string): MonthlyChallenge[] {
  return [...new Set(s.monthlyJoined)]
    .sort()
    .reverse()
    .map((m) => monthlyChallenge(s, m, today))
    .filter((c) => c.done);
}

// Personal records ------------------------------------------------------------------

export interface PersonalRecord {
  id: string;
  icon: IconName;
  title: string;
  value: string;
  /** When it was set, shown as a date or a week. */
  on: string;
  /** Set within the last 7 days. */
  isNew: boolean;
}

export function personalRecords(s: AppState, today: string): PersonalRecord[] {
  const recent = (d: string) => d >= addDays(today, -6);
  const out: PersonalRecord[] = [];
  const logged = loggedDates(s);

  const run = longestRun(logged);
  if (run.endedOn && run.value >= 2) {
    out.push({
      id: 'streak',
      icon: 'flame',
      title: 'Longest streak of days logged',
      value: `${run.value} days`,
      on: run.endedOn,
      isNew: recent(run.endedOn),
    });
  }

  // Most days logged in a calendar month.
  const perMonth = new Map<string, string[]>();
  for (const d of logged) perMonth.set(monthKey(d), [...(perMonth.get(monthKey(d)) ?? []), d]);
  let bestMonth: { month: string; n: number; on: string } | null = null;
  for (const [month, ds] of [...perMonth.entries()].sort()) {
    if (!bestMonth || ds.length > bestMonth.n) bestMonth = { month, n: ds.length, on: ds.at(-1)! };
  }
  if (bestMonth && bestMonth.n >= 2) {
    out.push({
      id: 'month',
      icon: 'star',
      title: 'Most days logged in a month',
      value: `${bestMonth.n} days`,
      on: `${bestMonth.month}-01`,
      isNew: recent(bestMonth.on),
    });
  }

  // Lowest (fat loss) or highest (gain) weigh-in; first time it was reached wins.
  const dir = lossDirection(s);
  if (dir !== 0 && s.weights.length >= 2) {
    const sorted = [...s.weights].sort((a, b) => a.date.localeCompare(b.date));
    let best = sorted[0]!;
    for (const w of sorted) if ((w.weightKg - best.weightKg) * dir > 0) best = w;
    out.push({
      id: 'weight',
      icon: dir < 0 ? 'arrowDown' : 'arrowUp',
      title: dir < 0 ? 'Lowest weigh-in' : 'Highest weigh-in',
      value: `${best.weightKg.toFixed(1)} kg`,
      on: best.date,
      isNew: recent(best.date),
    });
  }
  return out;
}

// Streaks and month stats -----------------------------------------------------------

export const WEEK_STREAK_DAYS = 3;

/**
 * Consecutive Mon–Sun weeks with at least 3 days logged. The current week counts once
 * it reaches 3 days; until then the streak runs up to last week, so it does not break
 * on a Monday morning.
 */
export function weekStreak(s: AppState, today: string): number {
  const logged = new Set(loggedDates(s));
  const count = (week: string) =>
    datesBetween(week, addDays(week, 6)).filter((d) => logged.has(d)).length;
  let week = mondayOf(today);
  if (count(week) < WEEK_STREAK_DAYS) week = addDays(week, -7);
  let n = 0;
  while (count(week) >= WEEK_STREAK_DAYS) {
    n++;
    week = addDays(week, -7);
  }
  return n;
}

export interface MonthStats {
  daysLogged: number;
  meals: number;
  fullyLogged: number;
  weighIns: number;
}

export function monthStats(s: AppState, month: string): MonthStats {
  const inMonth = (d: string) => monthKey(d) === month;
  return {
    daysLogged: loggedDates(s).filter(inMonth).length,
    meals: s.meals.filter((m) => inMonth(m.date)).length,
    fullyLogged: completeDates(s).filter(inMonth).length,
    weighIns: weighDates(s).filter(inMonth).length,
  };
}

export function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

// Feed ------------------------------------------------------------------------------

export interface FeedItem {
  date: string;
  icon: IconName;
  text: string;
  tier?: Tier;
}

export function achievementFeed(s: AppState, today: string, limit = 6): FeedItem[] {
  const items: FeedItem[] = [];
  for (const f of trophyFamilies(s, today)) {
    for (const l of f.levels) {
      if (l.earnedOn)
        items.push({
          date: l.earnedOn,
          icon: f.icon,
          text: `${f.title}: ${l.goal} ${f.unit} · ${TIER_LABELS[l.tier]}`,
          tier: l.tier,
        });
    }
  }
  const goal = goalReachedOn(s);
  if (goal) items.push({ date: goal, icon: 'star', text: 'Reached your goal weight' });
  for (const m of monthlyTrophies(s, today)) {
    if (m.earnedOn)
      items.push({
        date: m.earnedOn,
        icon: 'calendar',
        text: `${monthName(m.month)} challenge complete`,
      });
  }
  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

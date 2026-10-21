import { addDays } from '@fittrack/engine';
import type { IconName } from '../components/Icons';
import type { AppState } from '../data/types';
import { loggedDates } from './achievements';
import { mealsOn, sumNutrients } from './nutrition';
import { startWeightKg, targetOn, trendPoints } from './targets';
import { datesBetween } from './weekly';
import { isCompleteDay } from './dayStatus';
import { getLang, t, tr } from '../lib/i18n';

// Strava-style achievements: tiered medals, a monthly challenge, personal records and
// a feed of recent achievements. Everything, including the date a medal was earned, is
// worked out from the records, so editing or deleting an entry updates it.

export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';
export const TIERS: Tier[] = ['bronze', 'silver', 'gold', 'platinum'];
export const TIER_LABELS: Record<Tier, string> = tr({
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
});

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
  /** What to do to earn the level with this goal, in plain words. */
  describe: (goal: number) => string;
  value: number;
  levels: TrophyLevel[];
}

export const MONTHLY_GOAL_DAYS = 20;

/** Food-logged dates that count as fully logged (see logic/dayStatus). */
function completeDates(s: AppState): string[] {
  return loggedDates(s).filter((d) => isCompleteDay(s, d));
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
  describe: (goal: number) => string,
  dates: string[],
  goals: number[],
): TrophyFamily {
  return {
    id,
    icon,
    title,
    unit,
    describe,
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

/**
 * Medal families with goals sized for real people: early tiers come within the first
 * week or two, the top tier is a long-term habit. Weight medals follow the user's own
 * target (a quarter of the way, half, three quarters, there) so they suit a 3 kg goal
 * as well as a 20 kg one.
 */
export function trophyFamilies(s: AppState): TrophyFamily[] {
  const logged = loggedDates(s);
  const streak = longestRun(logged);
  const families: TrophyFamily[] = [
    {
      id: 'streak',
      icon: 'flame',
      title: t('Logging streak'),
      unit: t('days in a row'),
      describe: (n) => t('Log food {n} days in a row', { n }),
      value: streak.value,
      levels: [3, 7, 14, 30].map((goal, i) => ({
        tier: TIERS[i]!,
        goal,
        earnedOn: streakReachedOn(logged, goal),
      })),
    },
    countFamily(
      'logged',
      'fork',
      t('Days logged'),
      t('days'),
      (n) => t(n === 1 ? 'Log food on {n} day' : 'Log food on {n} days', { n }),
      logged,
      [7, 30, 100, 365],
    ),
    countFamily(
      'complete',
      'check',
      t('Complete days'),
      t('days'),
      (n) =>
        t(n === 1 ? 'Log everything you ate on {n} day' : 'Log everything you ate on {n} days', {
          n,
        }),
      completeDates(s),
      [3, 14, 30, 60],
    ),
    countFamily(
      'protein',
      'egg',
      t('Protein days'),
      t('days on target'),
      (n) =>
        t(
          n === 1
            ? 'Reach your protein target on {n} day'
            : 'Reach your protein target on {n} days',
          {
            n,
          },
        ),
      proteinDates(s),
      [3, 14, 30, 60],
    ),
    countFamily(
      'weigh',
      'scale',
      t('Weigh-ins'),
      t('days'),
      (n) => t(n === 1 ? 'Weigh yourself on {n} day' : 'Weigh yourself on {n} days', { n }),
      weighDates(s),
      [5, 15, 30, 60],
    ),
  ];

  const dir = lossDirection(s);
  const start = startWeightKg(s);
  if (dir !== 0 && start !== null) {
    const points = trendPoints(s.weights);
    const toward = (kg: number) => (kg - start) * dir;
    const best = Math.max(0, ...points.map((p) => toward(p.trendKg)));
    const goalKg = s.profile?.targetWeightKg;
    const total = goalKg !== undefined ? (goalKg - start) * dir : 0;
    if (goalKg !== undefined && total > 0) {
      // Share of the way to the user's own target weight.
      families.push({
        id: 'kg',
        icon: 'target',
        title: t('Toward your goal'),
        unit: t('% of the way'),
        describe: (pct) =>
          pct === 100
            ? t('Reach your goal weight of {kg} kg', { kg: goalKg })
            : t(
                dir < 0
                  ? 'Get {pct}% of the way to {kg} kg ({part} kg lost)'
                  : 'Get {pct}% of the way to {kg} kg ({part} kg gained)',
                { pct, kg: goalKg, part: (Math.round(total * pct) / 100).toFixed(1) },
              ),
        value: Math.min(100, Math.floor((best / total) * 100)),
        levels: [25, 50, 75, 100].map((pct, i) => ({
          tier: TIERS[i]!,
          goal: pct,
          earnedOn:
            points.find((p) => toward(p.trendKg) >= (total * pct) / 100 - 1e-9)?.date ?? null,
        })),
      });
    } else {
      families.push({
        id: 'kg',
        icon: 'trend',
        title: dir < 0 ? t('Weight lost') : t('Weight gained'),
        unit: 'kg',
        describe: (n) => t(dir < 0 ? 'Lose {n} kg' : 'Gain {n} kg', { n }),
        value: Math.round(best * 10) / 10,
        levels: [1, 2, 3, 5].map((goal, i) => ({
          tier: TIERS[i]!,
          goal,
          earnedOn: points.find((p) => toward(p.trendKg) >= goal)?.date ?? null,
        })),
      });
    }
  }

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
  const m = Number(month.slice(5, 7));
  return getLang() === 'zh'
    ? `${month.slice(0, 4)}年${m}月`
    : `${MONTH_NAMES[m - 1]} ${month.slice(0, 4)}`;
}

/** Month without the year, e.g. "October" or "10月". */
export function monthOnly(month: string): string {
  const m = Number(month.slice(5, 7));
  return getLang() === 'zh' ? `${m}月` : MONTH_NAMES[m - 1]!;
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
      title: t('Longest streak of days logged'),
      value: t('{n} days', { n: run.value }),
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
      title: t('Most days logged in a month'),
      value: t('{n} days', { n: bestMonth.n }),
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
      title: dir < 0 ? t('Lowest weigh-in') : t('Highest weigh-in'),
      value: `${best.weightKg.toFixed(1)} kg`,
      on: best.date,
      isNew: recent(best.date),
    });
  }
  return out;
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
  for (const f of trophyFamilies(s)) {
    for (const l of f.levels) {
      if (l.earnedOn)
        items.push({
          date: l.earnedOn,
          icon: f.icon,
          text: `${f.describe(l.goal)} · ${TIER_LABELS[l.tier]}`,
          tier: l.tier,
        });
    }
  }
  const goal = goalReachedOn(s);
  if (goal) items.push({ date: goal, icon: 'star', text: t('Reached your goal weight') });
  for (const m of monthlyTrophies(s, today)) {
    if (m.earnedOn)
      items.push({
        date: m.earnedOn,
        icon: 'calendar',
        text: t('{v1} challenge complete', { v1: monthName(m.month) }),
      });
  }
  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

import { addDays } from '@fittrack/engine';
import type { AppState, ChallengeRecord } from '../data/types';
import { mealsOn, sumNutrients } from './nutrition';
import { targetOn } from './targets';
import { datesBetween, mondayOf, weeklySummary } from './weekly';

// Daily habits and the optional weekly challenge. Everything is derived from the
// records, so editing or deleting an entry updates the grid and the challenge.

export type HabitId = 'food' | 'weight' | 'protein' | 'meals';
export type HabitStatus = 'done' | 'partial' | 'none' | 'na' | 'future';

export const HABITS: { id: HabitId; label: string; hint: string }[] = [
  { id: 'food', label: '记录饮食', hint: '当天记录了至少一样食物' },
  { id: 'weight', label: '记录体重', hint: '当天量了体重' },
  { id: 'protein', label: '关注蛋白质', hint: '蛋白质达到目标；有记录但未达到为部分完成' },
  { id: 'meals', label: '记录主要餐次', hint: '早餐、午餐、晚餐都有记录；记了一两餐为部分完成' },
];

export const STATUS_LABELS: Record<HabitStatus, string> = {
  done: '已完成',
  partial: '部分完成',
  none: '未记录',
  na: '不适用',
  future: '还没到',
};

export function habitStatus(s: AppState, habit: HabitId, date: string, today: string): HabitStatus {
  if (date > today) return 'future';
  const meals = mealsOn(s.meals, date);
  switch (habit) {
    case 'food':
      return meals.length > 0 ? 'done' : 'none';
    case 'weight':
      return s.weights.some((w) => w.date === date) ? 'done' : 'none';
    case 'protein': {
      const t = targetOn(s.targets, date);
      if (!t) return 'na';
      if (meals.length === 0) return 'none';
      return sumNutrients(meals).proteinG >= t.proteinG ? 'done' : 'partial';
    }
    case 'meals': {
      const main = new Set(meals.map((m) => m.meal).filter((m) => m !== 'snack')).size;
      return main === 3 ? 'done' : main > 0 ? 'partial' : 'none';
    }
  }
}

export function habitWeek(s: AppState, weekStart: string, today: string) {
  const dates = datesBetween(weekStart, addDays(weekStart, 6));
  return HABITS.map((h) => ({
    ...h,
    days: dates.map((date) => ({ date, status: habitStatus(s, h.id, date, today) })),
  }));
}

export type ChallengeId = 'log5' | 'weigh3' | 'complete3' | 'protein4' | 'breakfast5';

export const CHALLENGES: Record<ChallengeId, { title: string; why: string; max: number }> = {
  log5: { title: '这周记录饮食 5 天', why: '记录的日子越多，越看得出自己的饮食规律。', max: 5 },
  weigh3: {
    title: '这周量 3 次体重',
    why: '体重每天会因水分起伏，多量几次趋势才可靠。',
    max: 3,
  },
  complete3: {
    title: '这周完整记录 3 天',
    why: '只有标记“已完整记录”的日子，才能用来判断热量和调整目标。',
    max: 3,
  },
  protein4: {
    title: '这周蛋白质达标 4 天',
    why: '足够的蛋白质有助于保住肌肉，也比较有饱足感。',
    max: 4,
  },
  breakfast5: { title: '这周记录早餐 5 天', why: '记下早餐，一天的热量才算得完整。', max: 5 },
};

export const CHALLENGE_IDS = Object.keys(CHALLENGES) as ChallengeId[];

export function isChallengeId(x: string): x is ChallengeId {
  return x in CHALLENGES;
}

/** Progress of a challenge during the week starting on `weekStart`. */
export function challengeProgress(
  s: AppState,
  id: ChallengeId,
  weekStart: string,
): { value: number; max: number; done: boolean } {
  const end = addDays(weekStart, 6);
  const sum = weeklySummary(s, weekStart, end);
  const dates = datesBetween(weekStart, end);
  let value = 0;
  switch (id) {
    case 'log5':
      value = sum.loggedDays;
      break;
    case 'weigh3':
      value = sum.weighIns;
      break;
    case 'complete3':
      value = sum.completeDays;
      break;
    case 'protein4':
      value = dates.filter((d) => habitStatus(s, 'protein', d, end) === 'done').length;
      break;
    case 'breakfast5':
      value = dates.filter((d) =>
        s.meals.some((m) => m.date === d && m.meal === 'breakfast'),
      ).length;
      break;
  }
  const max = CHALLENGES[id].max;
  return { value: Math.min(value, max), max, done: value >= max };
}

/** The challenge the user accepted for this week (newest choice wins), or null. */
export function activeChallenge(s: AppState, weekStart: string): ChallengeRecord | null {
  const rec = s.challenges
    .filter((c) => c.weekStart === weekStart && isChallengeId(c.challenge))
    .sort((a, b) => b.acceptedAt.localeCompare(a.acceptedAt))[0];
  return rec && !rec.skipped ? rec : null;
}

/** Accepted (not skipped) challenges that reached their goal, any week. */
export function completedChallenges(s: AppState): number {
  const weeks = new Set(s.challenges.map((c) => c.weekStart));
  let n = 0;
  for (const w of weeks) {
    const rec = activeChallenge(s, w);
    if (rec && challengeProgress(s, rec.challenge as ChallengeId, w).done) n++;
  }
  return n;
}

/**
 * Challenges in the order that would help most, judged from the last 7 days:
 * the weakest habit first. Already-finished ones for this week are left out.
 */
export function suggestedChallenges(s: AppState, today: string): ChallengeId[] {
  const last = weeklySummary(s, addDays(today, -6), today);
  const breakfastDays = datesBetween(addDays(today, -6), today).filter((d) =>
    s.meals.some((m) => m.date === d && m.meal === 'breakfast'),
  ).length;
  const score: Record<ChallengeId, number> = {
    log5: last.loggedDays / 5,
    weigh3: last.weighIns / 3,
    complete3: last.completeDays / 3,
    protein4: last.proteinJudgedDays ? last.proteinMetDays / 4 : 0.9,
    breakfast5: last.loggedDays ? breakfastDays / 5 : 1,
  };
  const week = mondayOf(today);
  return CHALLENGE_IDS.filter((id) => !challengeProgress(s, id, week).done).sort(
    (a, b) => score[a] - score[b] || CHALLENGE_IDS.indexOf(a) - CHALLENGE_IDS.indexOf(b),
  );
}

export function challengeRecord(id: ChallengeId, weekStart: string, skipped = false) {
  return {
    id: `${id}:${weekStart}`,
    challenge: id,
    weekStart,
    acceptedAt: new Date().toISOString(),
    ...(skipped && { skipped: true }),
  } satisfies ChallengeRecord;
}

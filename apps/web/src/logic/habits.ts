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
  { id: 'food', label: 'Log food', hint: 'At least one food logged that day' },
  { id: 'weight', label: 'Weigh in', hint: 'Weighed yourself that day' },
  {
    id: 'protein',
    label: 'Protein',
    hint: 'Met your protein target; logged but below target counts as partial',
  },
  {
    id: 'meals',
    label: 'Main meals',
    hint: 'Breakfast, lunch and dinner all logged; one or two counts as partial',
  },
];

export const STATUS_LABELS: Record<HabitStatus, string> = {
  done: 'Done',
  partial: 'Partly done',
  none: 'Not logged',
  na: 'Not applicable',
  future: 'Not yet',
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
  log5: {
    title: 'Log food on 5 days this week',
    why: 'The more days you log, the clearer your eating patterns become.',
    max: 5,
  },
  weigh3: {
    title: 'Weigh in 3 times this week',
    why: 'Weight moves with water every day; a few weigh-ins make the trend reliable.',
    max: 3,
  },
  complete3: {
    title: 'Fully log 3 days this week',
    why: 'Only days marked "fully logged" are used to judge calories and adjust your target.',
    max: 3,
  },
  protein4: {
    title: 'Hit your protein target on 4 days',
    why: 'Enough protein helps keep muscle and keeps you full for longer.',
    max: 4,
  },
  breakfast5: {
    title: 'Log breakfast on 5 days this week',
    why: 'Logging breakfast makes your daily calories complete.',
    max: 5,
  },
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

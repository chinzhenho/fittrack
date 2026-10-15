import { describe, expect, it } from 'vitest';
import {
  addTarget,
  addWeight,
  joinMonthlyChallenge,
  logFood,
  removeMeal,
  setDayComplete,
} from '../data/actions';
import { emptyState, type AppState, type Food, type Profile } from '../data/types';
import { datesBetween } from './weekly';
import {
  achievementFeed,
  monthlyChallenge,
  monthlyTrophies,
  monthStats,
  nextTier,
  personalRecords,
  previousMonth,
  streakReachedOn,
  topTier,
  trophyFamilies,
  weekStreak,
} from './trophies';

const food: Food = {
  id: 'f',
  name: 'Test food',
  nameEn: 'test',
  aliases: [],
  per100g: { kcal: 100, proteinG: 10, carbsG: 10, fatG: 2 },
  source: 'user',
  sourceRef: 'test',
};

const profile: Profile = {
  formulaSex: 'male',
  birthDate: '1996-01-01',
  heightCm: 175,
  activityLevel: 'light',
  goal: 'fat_loss',
  ratePctPerWeek: 0.5,
  targetWeightKg: 78,
  goalStartDate: '2026-09-01',
  lifestyleMode: 'home',
  minutesPerDay: 15,
  experience: 'beginner',
  dietTags: [],
  screening: {
    pregnantOrLactating: false,
    eatingDisorderHistory: false,
    kidneyDisease: false,
    exerciseCaution: false,
  },
  hideNumbers: false,
  consentedAt: '2026-09-01T00:00:00Z',
};

function base(p: Profile = profile): AppState {
  return addTarget(
    { ...emptyState, profile: p },
    {
      id: 't1',
      effectiveFrom: '2026-09-01',
      createdAt: '2026-09-01T00:00:00Z',
      reason: 'initial',
      formulaVersion: 'test',
      weightKg: 80,
      bmrKcal: 1700,
      tdeeKcal: 2300,
      calorieFloorKcal: 1500,
      caloriesKcal: 2000,
      proteinG: 120,
      carbsG: 200,
      fatG: 60,
      clamps: [],
    },
  );
}

const eat = (s: AppState, dates: string[], grams = 500) =>
  dates.reduce(
    (x, d) => logFood(x, { id: `m-${d}`, date: d, meal: 'lunch', food, grams, now: d }),
    s,
  );

const TODAY = '2026-10-15';

describe('medals', () => {
  it('dates each tier by the day it was first reached', () => {
    const days = datesBetween('2026-10-01', '2026-10-10');
    const s = eat(base(), days);
    const streak = trophyFamilies(s, TODAY).find((f) => f.id === 'streak')!;
    expect(streak.value).toBe(10);
    expect(streak.levels.map((l) => l.earnedOn)).toEqual(['2026-10-03', '2026-10-07', null, null]);
    expect(topTier(streak)?.tier).toBe('silver');
    expect(nextTier(streak)?.goal).toBe(30);
    const logged = trophyFamilies(s, TODAY).find((f) => f.id === 'logged')!;
    expect(logged.levels[0]?.earnedOn).toBe('2026-10-10');
  });

  it('takes a medal back when the record behind it is deleted', () => {
    let s = eat(base(), ['2026-10-01', '2026-10-02', '2026-10-03']);
    expect(trophyFamilies(s, TODAY)[0]?.levels[0]?.earnedOn).toBe('2026-10-03');
    s = removeMeal(s, 'm-2026-10-02');
    expect(trophyFamilies(s, TODAY)[0]?.levels[0]?.earnedOn).toBeNull();
  });

  it('streakReachedOn needs consecutive days', () => {
    expect(streakReachedOn(['2026-10-01', '2026-10-03', '2026-10-04'], 2)).toBe('2026-10-04');
    expect(streakReachedOn(['2026-10-01', '2026-10-03'], 2)).toBeNull();
  });

  it('counts weight lost on the trend and has no weight medals for maintenance', () => {
    let s = base();
    let kg = 80;
    for (const d of datesBetween('2026-09-01', '2026-10-10')) {
      s = addWeight(s, { id: d, date: d, measuredAt: `${d}T07:00:00Z`, weightKg: kg });
      kg -= 0.1;
    }
    const lost = trophyFamilies(s, TODAY).find((f) => f.id === 'kg')!;
    expect(lost.title).toBe('Weight lost');
    expect(lost.levels[0]?.earnedOn).not.toBeNull();
    expect(lost.levels[3]?.earnedOn).toBeNull(); // 10 kg not reached
    const keep = base({ ...profile, goal: 'maintain' });
    expect(trophyFamilies(keep, TODAY).some((f) => f.id === 'kg')).toBe(false);
  });
});

describe('monthly challenge', () => {
  it('needs 20 logged days and says honestly when it is out of reach', () => {
    let s = joinMonthlyChallenge(base(), '2026-10');
    s = eat(s, datesBetween('2026-10-01', '2026-10-05'));
    const c = monthlyChallenge(s, '2026-10', TODAY);
    expect(c).toMatchObject({ joined: true, value: 5, goal: 20, done: false, daysLeft: 17 });
    expect(c.reachable).toBe(true);
    expect(monthlyChallenge(s, '2026-10', '2026-10-25').reachable).toBe(false);
  });

  it('gives a trophy only to joined, completed months', () => {
    let s = eat(base(), datesBetween('2026-09-01', '2026-09-25'));
    expect(monthlyTrophies(s, TODAY)).toEqual([]);
    s = joinMonthlyChallenge(s, '2026-09');
    const [t] = monthlyTrophies(s, TODAY);
    expect(t?.earnedOn).toBe('2026-09-20');
    expect(
      achievementFeed(s, TODAY).some((i) => i.text === 'September 2026 challenge complete'),
    ).toBe(true);
  });
});

describe('records, streaks and stats', () => {
  it('finds personal records and marks recent ones as new', () => {
    let s = eat(base(), ['2026-10-12', '2026-10-13', '2026-10-14']);
    s = setDayComplete(setDayComplete(s, '2026-10-12', true), '2026-10-13', true);
    s = addWeight(s, { id: 'a', date: '2026-10-01', measuredAt: 'a', weightKg: 80 });
    s = addWeight(s, { id: 'b', date: '2026-10-14', measuredAt: 'b', weightKg: 79.2 });
    const prs = personalRecords(s, TODAY);
    expect(prs.find((p) => p.id === 'streak')).toMatchObject({ value: '3 days', isNew: true });
    expect(prs.some((p) => p.id === 'week')).toBe(false);
    expect(prs.find((p) => p.id === 'weight')).toMatchObject({
      value: '79.2 kg',
      on: '2026-10-14',
    });
  });

  it('counts week streaks of 3+ logged days without breaking on Monday', () => {
    // Weeks of Sep 28 and Oct 5 have 3 days each; this week (Oct 12) has 1 so far.
    const s = eat(base(), [
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-12',
    ]);
    expect(weekStreak(s, TODAY)).toBe(2);
  });

  it('compares this month with last month', () => {
    const s = eat(base(), ['2026-09-30', '2026-10-01', '2026-10-02']);
    expect(monthStats(s, '2026-10')).toMatchObject({ daysLogged: 2, meals: 2 });
    expect(monthStats(s, previousMonth('2026-10')).daysLogged).toBe(1);
    expect(previousMonth('2026-01')).toBe('2025-12');
  });
});

import { describe, expect, it } from 'vitest';
import {
  addTarget,
  joinMonthlyChallenge,
  logFood,
  removeMeal,
  setWeightOn,
  answerDayCheck,
} from '../data/actions';
import { emptyState, type AppState, type Food, type Profile } from '../data/types';
import { datesBetween } from './weekly';
import {
  achievementFeed,
  monthlyChallenge,
  monthlyTrophies,
  nextTier,
  personalRecords,
  streakReachedOn,
  topTier,
  trophyFamilies,
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
  dietTags: [],
  screening: {
    pregnantOrLactating: false,
    eatingDisorderHistory: false,
    kidneyDisease: false,
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
    const streak = trophyFamilies(s).find((f) => f.id === 'streak')!;
    expect(streak.value).toBe(10);
    expect(streak.levels.map((l) => l.earnedOn)).toEqual(['2026-10-03', '2026-10-07', null, null]);
    expect(topTier(streak)?.tier).toBe('silver');
    expect(nextTier(streak)?.goal).toBe(14);
    expect(streak.describe(14)).toBe('Log food 14 days in a row');
    const logged = trophyFamilies(s).find((f) => f.id === 'logged')!;
    expect(logged.levels[0]?.earnedOn).toBe('2026-10-07');
  });

  it('takes a medal back when the record behind it is deleted', () => {
    let s = eat(base(), ['2026-10-01', '2026-10-02', '2026-10-03']);
    expect(trophyFamilies(s)[0]?.levels[0]?.earnedOn).toBe('2026-10-03');
    s = removeMeal(s, 'm-2026-10-02');
    expect(trophyFamilies(s)[0]?.levels[0]?.earnedOn).toBeNull();
  });

  it('streakReachedOn needs consecutive days', () => {
    expect(streakReachedOn(['2026-10-01', '2026-10-03', '2026-10-04'], 2)).toBe('2026-10-04');
    expect(streakReachedOn(['2026-10-01', '2026-10-03'], 2)).toBeNull();
  });

  it("weight medals follow the user's own target, or fall back to kg without one", () => {
    // Start 80 kg (initial target), goal 78 kg: 2 kg to lose. Weight falls 0.1 kg a day.
    let s = base();
    let kg = 80;
    for (const d of datesBetween('2026-09-01', '2026-10-10')) {
      s = setWeightOn(s, { id: d, date: d, measuredAt: `${d}T07:00:00Z`, weightKg: kg });
      kg -= 0.1;
    }
    const goal = trophyFamilies(s).find((f) => f.id === 'kg')!;
    expect(goal.title).toBe('Toward your goal');
    expect(goal.levels.map((l) => l.goal)).toEqual([25, 50, 75, 100]);
    expect(goal.levels[0]?.earnedOn).not.toBeNull(); // 0.5 kg down
    expect(goal.describe(50)).toBe('Get 50% of the way to 78 kg (1.0 kg lost)');
    expect(goal.describe(100)).toBe('Reach your goal weight of 78 kg');

    const rest: Profile = { ...s.profile! };
    delete rest.targetWeightKg;
    const noTarget: AppState = { ...s, profile: rest };
    const kgFamily = trophyFamilies(noTarget).find((f) => f.id === 'kg')!;
    expect(kgFamily.title).toBe('Weight lost');
    expect(kgFamily.levels.map((l) => l.goal)).toEqual([1, 2, 3, 5]);
    expect(kgFamily.levels[3]?.earnedOn).toBeNull(); // 5 kg not reached

    const keep = base({ ...profile, goal: 'maintain' });
    expect(trophyFamilies(keep).some((f) => f.id === 'kg')).toBe(false);
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

describe('personal records', () => {
  it('finds personal records and marks recent ones as new', () => {
    let s = eat(base(), ['2026-10-12', '2026-10-13', '2026-10-14']);
    s = answerDayCheck(answerDayCheck(s, '2026-10-12', true), '2026-10-13', true);
    s = setWeightOn(s, { id: 'a', date: '2026-10-01', measuredAt: 'a', weightKg: 80 });
    s = setWeightOn(s, { id: 'b', date: '2026-10-14', measuredAt: 'b', weightKg: 79.2 });
    const prs = personalRecords(s, TODAY);
    expect(prs.find((p) => p.id === 'streak')).toMatchObject({ value: '3 days', isNew: true });
    expect(prs.some((p) => p.id === 'week')).toBe(false);
    expect(prs.find((p) => p.id === 'weight')).toMatchObject({
      value: '79.2 kg',
      on: '2026-10-14',
    });
  });
});

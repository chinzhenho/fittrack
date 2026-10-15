import { describe, expect, it } from 'vitest';
import {
  acceptChallenge,
  addTarget,
  addWeight,
  dismissInsight,
  logFood,
  removeWeight,
  setDayComplete,
} from '../data/actions';
import { mergeStates } from '../data/merge';
import { emptyState, type AppState, type Food, type MealType, type Profile } from '../data/types';
import { progressSummary } from './achievements';
import {
  activeChallenge,
  challengeProgress,
  challengeRecord,
  completedChallenges,
  habitStatus,
  habitWeek,
  suggestedChallenges,
} from './habits';
import { insightKey, insightsFor } from './insights';
import { mondayOf, periodRange, weeklySummary } from './weekly';

// 100 g = 100 kcal and 10 g protein, so grams map straight to numbers.
const food: Food = {
  id: 'f',
  name: 'Test food',
  nameEn: 'test',
  aliases: [],
  per100g: { kcal: 100, proteinG: 10, carbsG: 10, fatG: 2 },
  source: 'user',
  sourceRef: 'test',
};

const profile = (goal: Profile['goal'] = 'fat_loss'): Profile => ({
  formulaSex: 'male',
  birthDate: '1996-01-01',
  heightCm: 175,
  activityLevel: 'light',
  goal,
  ratePctPerWeek: goal === 'maintain' ? 0 : 0.5,
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
});

function base(goal: Profile['goal'] = 'fat_loss'): AppState {
  return addTarget(
    { ...emptyState, profile: profile(goal) },
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

let n = 0;
function eat(s: AppState, date: string, grams: number, meal: MealType = 'lunch'): AppState {
  return logFood(s, { id: `m${n++}`, date, meal, food, grams, now: `${date}T12:00:00Z` });
}
const weigh = (s: AppState, date: string, kg: number) =>
  addWeight(s, { id: `w${date}`, date, measuredAt: `${date}T07:00:00Z`, weightKg: kg });
const complete = (s: AppState, dates: string[], grams: number, meal: MealType = 'breakfast') =>
  dates.reduce((x, d) => setDayComplete(eat(x, d, grams, meal), d, true), s);

// 2026-10-12 is a Monday; "today" in these tests is Thursday 2026-10-15.
const TODAY = '2026-10-15';
const MON_TUE_WED = ['2026-10-12', '2026-10-13', '2026-10-14'];

describe('weekly periods', () => {
  it('uses Monday to Sunday weeks and never goes past today', () => {
    expect(mondayOf('2026-10-12')).toBe('2026-10-12');
    expect(mondayOf('2026-10-18')).toBe('2026-10-12'); // Sunday belongs to the week before
    expect(periodRange('this_week', TODAY)).toEqual({ start: '2026-10-12', end: TODAY });
    expect(periodRange('last_week', TODAY)).toEqual({ start: '2026-10-05', end: '2026-10-11' });
    expect(periodRange('last_7', TODAY)).toEqual({ start: '2026-10-09', end: TODAY });
  });
});

describe('weekly summary', () => {
  it('scenario A: no records gives no averages and no weight change', () => {
    const w = weeklySummary(base(), '2026-10-12', TODAY);
    expect(w.loggedDays).toBe(0);
    expect(w.avgKcal).toBeNull();
    expect(w.avgProteinG).toBeNull();
    expect(w.weight).toBeNull();
    expect(w.dayCount).toBe(4);
  });

  it('scenario B: averages only over days with records, never counting gaps as 0', () => {
    let s = eat(base(), '2026-10-12', 1800);
    s = eat(s, '2026-10-14', 600);
    s = weigh(s, '2026-10-13', 80);
    const w = weeklySummary(s, '2026-10-12', TODAY);
    expect(w.loggedDays).toBe(2);
    expect(w.avgKcal).toBe(1200);
    expect(w.completeDays).toBe(0);
    expect(w.proteinJudgedDays).toBe(0);
    // A single weigh-in is not a change.
    expect(w.weight).toBeNull();
    expect(w.weighIns).toBe(1);
  });

  it('scenario C: judges protein and the calorie range on complete days only', () => {
    let s = base();
    s = complete(s, ['2026-10-12'], 2000); // in range
    s = complete(s, ['2026-10-13'], 1000); // below the floor
    s = complete(s, ['2026-10-14'], 2500); // over 110%
    s = eat(s, '2026-10-15', 2000); // not marked complete: not judged
    s = weigh(weigh(s, '2026-10-12', 80), '2026-10-15', 79.4);
    const w = weeklySummary(s, '2026-10-12', TODAY);
    expect(w.completeDays).toBe(3);
    expect(w.withinTargetDays).toBe(1);
    expect(w.proteinJudgedDays).toBe(3);
    expect(w.proteinMetDays).toBe(2); // 100 g on the 1000 kcal day is below 120 g
    expect(w.avgKcal).toBe((2000 + 1000 + 2500 + 2000) / 4);
    expect(w.avgCompleteKcal).toBeCloseTo((2000 + 1000 + 2500) / 3);
    expect(w.weight?.change).toBeCloseTo(-0.6);
  });

  it('never rewards eating far below the target', () => {
    const s = complete(base(), ['2026-10-12'], 1300);
    expect(weeklySummary(s, '2026-10-12', TODAY).withinTargetDays).toBe(0);
  });
});

describe('habits', () => {
  it('marks done, partial, not recorded and future days', () => {
    let s = eat(base(), '2026-10-12', 1300, 'breakfast'); // protein 130 >= 120
    s = eat(s, '2026-10-12', 100, 'lunch');
    s = eat(s, '2026-10-12', 100, 'dinner');
    s = eat(s, '2026-10-13', 300, 'lunch'); // protein 30
    expect(habitStatus(s, 'meals', '2026-10-12', TODAY)).toBe('done');
    expect(habitStatus(s, 'meals', '2026-10-13', TODAY)).toBe('partial');
    expect(habitStatus(s, 'protein', '2026-10-12', TODAY)).toBe('done');
    expect(habitStatus(s, 'protein', '2026-10-13', TODAY)).toBe('partial');
    expect(habitStatus(s, 'food', '2026-10-14', TODAY)).toBe('none');
    expect(habitStatus(s, 'food', '2026-10-17', TODAY)).toBe('future');
    const week = habitWeek(s, '2026-10-12', TODAY);
    expect(week).toHaveLength(4);
    expect(week[0]?.days.map((d) => d.status)).toEqual([
      'done',
      'done',
      'none',
      'none',
      'future',
      'future',
      'future',
    ]);
  });

  it('protein is not applicable without a target', () => {
    const s = eat({ ...emptyState, profile: profile() }, '2026-10-12', 100);
    expect(habitStatus(s, 'protein', '2026-10-12', TODAY)).toBe('na');
  });
});

describe('weekly challenge', () => {
  it('tracks progress and completion from real records', () => {
    const week = '2026-10-12';
    let s = acceptChallenge(base(), challengeRecord('weigh3', week));
    expect(activeChallenge(s, week)?.challenge).toBe('weigh3');
    s = weigh(weigh(s, '2026-10-12', 80), '2026-10-13', 79.8);
    expect(challengeProgress(s, 'weigh3', week)).toEqual({ value: 2, max: 3, done: false });
    s = weigh(s, '2026-10-14', 79.7);
    expect(challengeProgress(s, 'weigh3', week).done).toBe(true);
    expect(completedChallenges(s)).toBe(1);
    const badge = progressSummary(s, TODAY).badges.find((b) => b.id === 'challenge1');
    expect(badge?.unlocked).toBe(true);
    // Deleting a weigh-in takes the completion back.
    s = removeWeight(s, 'w2026-10-14');
    expect(completedChallenges(s)).toBe(0);
  });

  it('a skipped challenge stays skipped after syncing with an older copy', () => {
    const week = '2026-10-12';
    const accepted: AppState = {
      ...acceptChallenge(base(), {
        ...challengeRecord('log5', week),
        acceptedAt: '2026-10-12T01:00:00Z',
      }),
      updatedAt: '2026-10-12T01:00:00Z',
    };
    const skipped: AppState = {
      ...acceptChallenge(accepted, {
        ...challengeRecord('log5', week, true),
        acceptedAt: '2026-10-13T01:00:00Z',
      }),
      updatedAt: '2026-10-13T01:00:00Z',
    };
    expect(activeChallenge(mergeStates(accepted, skipped), week)).toBeNull();
    expect(activeChallenge(mergeStates(skipped, accepted), week)).toBeNull();
  });

  it('suggests the weakest habit first and leaves out finished ones', () => {
    let s = base();
    for (const d of ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13']) {
      s = eat(s, d, 500, 'breakfast');
    }
    const order = suggestedChallenges(s, TODAY);
    expect(order[0]).toBe('weigh3'); // no weigh-ins at all
    expect(order.at(-1)).toBe('breakfast5');
  });
});

describe('insights', () => {
  it('scenario A: only asks for more records, with no numbers made up', () => {
    const list = insightsFor(base(), TODAY);
    expect(list.map((i) => i.id)).toEqual(['few_logs']);
    expect(list[0]?.data).toContain('on 0 days');
  });

  it('warns about eating below the safety floor before anything else', () => {
    const list = insightsFor(complete(base(), MON_TUE_WED, 1100), TODAY);
    expect(list[0]?.id).toBe('kcal_below_floor');
    expect(list[0]?.tone).toBe('care');
  });

  it('scenario D: calorie wording follows the goal', () => {
    for (const goal of ['fat_loss', 'maintain'] as const) {
      const ids = insightsFor(complete(base(goal), MON_TUE_WED, 2600), TODAY).map((i) => i.id);
      expect(ids).toContain('kcal_above');
    }
    for (const goal of ['muscle_gain', 'weight_gain'] as const) {
      const high = insightsFor(complete(base(goal), MON_TUE_WED, 2600), TODAY).map((i) => i.id);
      expect(high).not.toContain('kcal_above');
      const low = insightsFor(complete(base(goal), MON_TUE_WED, 1600), TODAY).map((i) => i.id);
      expect(low).toContain('kcal_below_gain');
    }
  });

  it('dismissing hides an insight for the rest of the week only', () => {
    const s = dismissInsight(base(), insightKey('few_logs', TODAY));
    expect(insightsFor(s, TODAY)).toEqual([]);
    expect(insightsFor(s, '2026-10-19').map((i) => i.id)).toEqual(['few_logs']);
  });

  it('hides insights with calories or weight when numbers are hidden', () => {
    const s = complete(base(), MON_TUE_WED, 1100);
    const hidden: AppState = { ...s, profile: { ...s.profile!, hideNumbers: true } };
    expect(insightsFor(s, TODAY).some((i) => i.numeric)).toBe(true);
    expect(insightsFor(hidden, TODAY).some((i) => i.numeric)).toBe(false);
  });
});

describe('deleting health records', () => {
  it('scenario F: clears records but keeps the profile, plan history and own foods', async () => {
    const { clearHealthRecords } = await import('../data/actions');
    let s = complete(base(), MON_TUE_WED, 2000);
    s = acceptChallenge(weigh(s, '2026-10-12', 80), challengeRecord('log5', '2026-10-12'));
    s = { ...s, customFoods: [food] };
    const c = clearHealthRecords(s);
    expect(c.meals).toEqual([]);
    expect(c.weights).toEqual([]);
    expect(c.completeDays).toEqual([]);
    expect(c.challenges).toEqual([]);
    expect(c.profile).toEqual(s.profile);
    expect(c.targets).toEqual(s.targets);
    expect(c.customFoods).toEqual([food]);
  });
});

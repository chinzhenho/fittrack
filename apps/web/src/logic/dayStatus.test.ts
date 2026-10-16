import { describe, expect, it } from 'vitest';
import { answerDayCheck } from '../data/actions';
import { emptyState, type AppState, type MealItem } from '../data/types';
import { dayStatus, daysToCheck, isCompleteDay, usualKcal } from './dayStatus';

const TODAY = '2026-10-16';

const meal = (date: string, kcal: number): MealItem => ({
  id: `${date}-${kcal}`,
  date,
  meal: 'lunch',
  foodId: 'x',
  name: 'Food',
  grams: 100,
  nutrients: { kcal, proteinG: 0, carbsG: 0, fatG: 0 },
  sourceRef: 't',
  createdAt: `${date}T12:00:00Z`,
});

const withMeals = (days: [string, number][], extra: Partial<AppState> = {}): AppState => ({
  ...emptyState,
  meals: days.map(([d, k]) => meal(d, k)),
  ...extra,
});

const usual: [string, number][] = [
  ['2026-10-10', 2000],
  ['2026-10-11', 1800],
  ['2026-10-12', 2200],
];

describe('automatic complete days', () => {
  it('counts a past day with food, but never today or an empty day', () => {
    const s = withMeals([...usual, [TODAY, 2000]]);
    expect(isCompleteDay(s, '2026-10-12', TODAY)).toBe(true);
    expect(dayStatus(s, TODAY, TODAY)).toBe('open');
    expect(dayStatus(s, '2026-10-13', TODAY)).toBe('empty');
  });

  it('asks about a day under half the usual intake instead of counting it', () => {
    const s = withMeals([...usual, ['2026-10-14', 900], ['2026-10-15', 1100]]);
    expect(usualKcal(s, '2026-10-14')).toBe(2000); // median of the 3 days before
    expect(dayStatus(s, '2026-10-14', TODAY)).toBe('check'); // 900 < 1000
    expect(dayStatus(s, '2026-10-15', TODAY)).toBe('complete'); // 1100 is over half
    expect(daysToCheck(s, TODAY)).toEqual(['2026-10-14']);
  });

  it('uses the calorie target as the usual intake until there are 3 days', () => {
    const target = {
      id: 't',
      effectiveFrom: '2026-10-01',
      createdAt: '1',
      reason: 'initial' as const,
      formulaVersion: '1',
      weightKg: 70,
      bmrKcal: 1500,
      tdeeKcal: 2000,
      calorieFloorKcal: 1500,
      caloriesKcal: 1800,
      proteinG: 100,
      carbsG: 200,
      fatG: 60,
      clamps: [],
    };
    const s = withMeals([['2026-10-14', 800]], { targets: [target] });
    expect(usualKcal(s, '2026-10-14')).toBe(1800);
    expect(dayStatus(s, '2026-10-14', TODAY)).toBe('check');
  });

  it('follows the answer: "I ate less" counts it, "I forgot some" leaves it out', () => {
    const s = withMeals([...usual, ['2026-10-14', 900]]);
    const ateLess = answerDayCheck(s, '2026-10-14', true);
    expect(dayStatus(ateLess, '2026-10-14', TODAY)).toBe('complete');
    const forgot = answerDayCheck(ateLess, '2026-10-14', false);
    expect(dayStatus(forgot, '2026-10-14', TODAY)).toBe('partial');
    expect(daysToCheck(forgot, TODAY)).toEqual([]);
  });

  it('keeps days ticked before as complete', () => {
    const s = withMeals([...usual, ['2026-10-14', 300]], { completeDays: ['2026-10-14'] });
    expect(isCompleteDay(s, '2026-10-14', TODAY)).toBe(true);
  });
});

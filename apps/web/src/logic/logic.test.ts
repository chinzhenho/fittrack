import { describe, expect, it } from 'vitest';
import { addActivity, addWeight, logFood, saveSession, setDayComplete } from '../data/actions';
import { SEED_FOODS } from '../data/foods';
import { emptyState, type AppState, type Profile, type WorkoutSession } from '../data/types';
import {
  nutrientsFor,
  recentFoodIds,
  searchFoods,
  sumNutrients,
  validateCustomFood,
} from './nutrition';
import { needsRecompute, targetOn } from './targets';
import { recentCompletion, tasksFor } from './tasks';
import { newRecords, TEMPLATES, EXERCISES } from './workouts';

const rice = SEED_FOODS.find((f) => f.id === 'usda-168878')!;
const chicken = SEED_FOODS.find((f) => f.id === 'usda-171477')!;

const profile: Profile = {
  formulaSex: 'male',
  birthDate: '1996-01-01',
  heightCm: 175,
  activityLevel: 'light',
  goal: 'fat_loss',
  ratePctPerWeek: 0.5,
  goalStartDate: '2026-10-01',
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
  consentedAt: '2026-10-01T00:00:00.000Z',
};

const base: AppState = { ...emptyState, profile };

describe('nutrition', () => {
  it('scales per-100 g values by grams (spec 5.5)', () => {
    const n = nutrientsFor(rice.per100g, 150);
    expect(n.kcal).toBeCloseTo(195, 10);
    expect(n.proteinG).toBeCloseTo(4.035, 10);
    expect(n.carbsG).toBeCloseTo(42.3, 10);
    expect(n.sodiumMg).toBeCloseTo(1.5, 10);
  });

  it('snapshots nutrients when logging and sums a day', () => {
    let s = logFood(base, {
      id: 'a',
      date: '2026-10-11',
      meal: 'lunch',
      food: rice,
      grams: 200,
      now: 't1',
    });
    s = logFood(s, {
      id: 'b',
      date: '2026-10-11',
      meal: 'lunch',
      food: chicken,
      grams: 100,
      now: 't2',
    });
    const total = sumNutrients(s.meals);
    expect(total.kcal).toBeCloseTo(260 + 165, 10);
    expect(total.proteinG).toBeCloseTo(5.38 + 31, 10);
    expect(s.meals[0]?.sourceRef).toBe('USDA FDC 168878');
    expect(recentFoodIds(s.meals)).toEqual(['usda-171477', 'usda-168878']);
  });

  it('searches Chinese, English and Malay names', () => {
    expect(searchFoods(SEED_FOODS, 'tauhu').map((f) => f.id)).toEqual(['usda-172475']);
    expect(searchFoods(SEED_FOODS, '白飯').map((f) => f.id)).toEqual(['usda-168878']);
    expect(searchFoods(SEED_FOODS, 'CHICKEN').map((f) => f.id)).toEqual(['usda-171477']);
    expect(searchFoods(SEED_FOODS, '  ').length).toBe(SEED_FOODS.length);
  });

  it('validates label values per 100 g', () => {
    const ok = { kcal: 450, proteinG: 10, carbsG: 60, fatG: 20 };
    expect(validateCustomFood('Biskut', ok)).toEqual([]);
    expect(validateCustomFood(' ', ok)).toEqual(['name']);
    expect(validateCustomFood('x', { ...ok, kcal: 901 })).toEqual(['kcal']);
    expect(validateCustomFood('x', { ...ok, fatG: -1 })).toEqual(['macro']);
    expect(validateCustomFood('x', { ...ok, carbsG: 80 })).toEqual(['macroSum']);
    expect(validateCustomFood('x', { ...ok, sodiumMg: -5 })).toEqual(['sodium']);
  });

  it('seed foods are internally consistent', () => {
    for (const f of SEED_FOODS) {
      const { proteinG, carbsG, fatG, kcal } = f.per100g;
      expect(proteinG + carbsG + fatG).toBeLessThanOrEqual(100);
      // Atwater 4/4/9 estimate stays within 15% of the database energy value.
      expect(Math.abs(4 * proteinG + 4 * carbsG + 9 * fatG - kcal) / kcal).toBeLessThan(0.15);
    }
  });
});

describe('targets', () => {
  const t = (id: string, effectiveFrom: string, createdAt: string) => ({
    id,
    effectiveFrom,
    createdAt,
    reason: 'initial' as const,
    formulaVersion: '1.0.0',
    weightKg: 75,
    bmrKcal: 1698.75,
    tdeeKcal: 2335.78,
    calorieFloorKcal: 1698.75,
    caloriesKcal: 1920,
    proteinG: 120,
    carbsG: 241,
    fatG: 53,
    clamps: [],
  });

  it('picks the newest version in force on a date', () => {
    const targets = [
      t('a', '2026-10-01', '1'),
      t('b', '2026-10-05', '2'),
      t('c', '2026-10-05', '3'),
    ];
    expect(targetOn(targets, '2026-10-04')?.id).toBe('a');
    expect(targetOn(targets, '2026-10-06')?.id).toBe('c');
    expect(targetOn(targets, '2026-09-01')?.id).toBe('a');
    expect(targetOn([], '2026-10-01')).toBeNull();
  });

  it('suggests recomputing after a 2 kg trend change', () => {
    let s: AppState = { ...base, targets: [t('a', '2026-10-01', '1')] };
    s = addWeight(s, {
      id: 'w1',
      date: '2026-10-01',
      measuredAt: '2026-10-01T01:00:00Z',
      weightKg: 75,
    });
    expect(needsRecompute(s, '2026-10-01')).toBe(false);
    for (let i = 2; i <= 30; i++) {
      const d = `2026-10-${String(i).padStart(2, '0')}`;
      s = addWeight(s, { id: `w${i}`, date: d, measuredAt: `${d}T01:00:00Z`, weightKg: 72 });
    }
    expect(needsRecompute(s, '2026-10-30')).toBe(true);
  });
});

describe('daily tasks', () => {
  it('builds four tasks for the home mode and computes completion from records', () => {
    const joinedToday = {
      ...base,
      profile: { ...profile, consentedAt: '2026-10-11T00:00:00.000Z' },
    };
    let s = logFood(joinedToday, {
      id: 'a',
      date: '2026-10-11',
      meal: 'breakfast',
      food: chicken,
      grams: 100,
      now: 't',
    });
    const tasks = tasksFor(s, '2026-10-11');
    expect(tasks.map((x) => x.id)).toEqual([
      'log_three',
      'protein_meal',
      'home_short',
      'log_weight',
    ]);
    expect(tasks.find((x) => x.id === 'protein_meal')?.done).toBe(true);
    expect(tasks.find((x) => x.id === 'log_three')?.done).toBe(false);
    s = setDayComplete(s, '2026-10-11', true);
    expect(s.completeDays).toEqual(['2026-10-11']);
  });

  it('switches to two easy tasks after a week under 30% completion', () => {
    expect(recentCompletion(base, '2026-10-11')).toBe(0);
    expect(tasksFor(base, '2026-10-11').map((x) => x.id)).toEqual(['log_meal', 'home_short']);
  });

  it('has no history before the user joined', () => {
    const fresh = { ...base, profile: { ...profile, consentedAt: '2026-10-11T00:00:00.000Z' } };
    expect(recentCompletion(fresh, '2026-10-11')).toBeNull();
    expect(tasksFor(fresh, '2026-10-11')).toHaveLength(4);
  });

  it('counts walking minutes and rest days', () => {
    let s: AppState = {
      ...base,
      profile: { ...profile, lifestyleMode: 'outdoor', consentedAt: '2026-10-11T00:00:00.000Z' },
    };
    s = addActivity(s, { id: 'x', date: '2026-10-11', type: 'walk', minutes: 20 });
    expect(tasksFor(s, '2026-10-11').find((x) => x.id === 'walk_20')?.done).toBe(true);
    s = { ...s, restDays: ['2026-10-11'] };
    expect(tasksFor(s, '2026-10-11').map((x) => x.id)).toContain('stretch');
  });
});

describe('workouts', () => {
  it('every template references a known exercise', () => {
    const ids = new Set(EXERCISES.map((e) => e.id));
    for (const t of TEMPLATES) for (const i of t.items) expect(ids.has(i.exerciseId)).toBe(true);
    expect(TEMPLATES).toHaveLength(10);
  });

  it('detects a new heaviest weight against earlier sessions', () => {
    const session = (id: string, kg: number, ended = true): WorkoutSession => ({
      id,
      date: '2026-10-11',
      templateId: 'db-a',
      startedAt: 't',
      ...(ended && { endedAt: 't2' }),
      sets: [{ exerciseId: 'goblet-squat', reps: 10, weightKg: kg, done: true }],
      painExerciseIds: [],
    });
    const s = saveSession(saveSession(base, session('a', 10)), session('b', 12));
    expect(s.sessions).toHaveLength(2);
    expect(newRecords(session('c', 14, false), s.sessions)).toEqual(['goblet-squat']);
    expect(newRecords(session('c', 12, false), s.sessions)).toEqual([]);
    expect(newRecords(session('c', 20, false), [])).toEqual([]);
  });
});

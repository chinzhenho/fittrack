import { describe, expect, it } from 'vitest';
import {
  addActivity,
  addWeight,
  editMeal,
  logFood,
  saveSession,
  setDayComplete,
  setWeightOn,
} from '../data/actions';
import { BUILT_IN_FOODS, SEED_FOODS } from '../data/foods';
import { DISH_LABELS } from '../data/foodsSg';
import meta from '../../public/models/food-v1/meta.json';
import { emptyState, type AppState, type Profile, type WorkoutSession } from '../data/types';
import {
  nutrientsFor,
  recentFoodIds,
  searchFoods,
  sumNutrients,
  validateCustomFood,
} from './nutrition';
import { needsRecompute, startWeightKg, targetOn } from './targets';
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

  it('editMeal rescales the nutrient snapshot and can move the item', () => {
    let s = logFood(emptyState, {
      id: 'm',
      date: '2026-10-12',
      meal: 'lunch',
      food: chicken,
      grams: 100,
      now: 't',
    });
    s = editMeal(s, 'm', { grams: 250, meal: 'snack', label: ' 宵夜 ' });
    const m = s.meals[0]!;
    expect(m).toMatchObject({ grams: 250, meal: 'snack', label: '宵夜' });
    expect(m.nutrients.kcal).toBeCloseTo(412.5, 10);
    expect(m.nutrients.proteinG).toBeCloseTo(77.5, 10);
    s = editMeal(s, 'm', { grams: 100, meal: 'dinner' });
    expect(s.meals[0]).not.toHaveProperty('label');
    expect(s.meals[0]!.nutrients.kcal).toBeCloseTo(165, 10);
  });

  it('setWeightOn keeps one weight per day', () => {
    const w = (id: string, date: string, kg: number) => ({
      id,
      date,
      measuredAt: date,
      weightKg: kg,
    });
    let s = addWeight(emptyState, w('a', '2026-10-11', 70));
    s = setWeightOn(s, w('b', '2026-10-12', 69.5));
    s = setWeightOn(s, w('c', '2026-10-12', 69.2));
    expect(s.weights.map((x) => [x.id, x.weightKg])).toEqual([
      ['a', 70],
      ['c', 69.2],
    ]);
  });

  it('logs an optional trimmed label for 其他 entries', () => {
    const food = SEED_FOODS[0]!;
    const base = {
      id: 'm1',
      date: '2026-10-12',
      meal: 'snack' as const,
      food,
      grams: 100,
      now: 'x',
    };
    expect(logFood(emptyState, { ...base, label: '  下午茶 ' }).meals[0]?.label).toBe('下午茶');
    expect(logFood(emptyState, { ...base, label: '   ' }).meals[0]).not.toHaveProperty('label');
    expect(logFood(emptyState, base).meals[0]).not.toHaveProperty('label');
  });

  it('built-in foods are internally consistent', () => {
    expect(new Set(BUILT_IN_FOODS.map((f) => f.id)).size).toBe(BUILT_IN_FOODS.length);
    for (const f of BUILT_IN_FOODS) {
      const { proteinG, carbsG, fatG, kcal } = f.per100g;
      expect(proteinG + carbsG + fatG).toBeLessThanOrEqual(100);
      // Atwater 4/4/9 estimate stays within 15% of the database energy value.
      expect(Math.abs(4 * proteinG + 4 * carbsG + 9 * fatG - kcal) / kcal).toBeLessThan(0.15);
      for (const sv of f.servings ?? []) expect(sv.grams).toBeGreaterThan(0);
    }
  });

  it('every photo model class has SG FoodID dishes to choose from', () => {
    for (const label of meta.labels) {
      expect(DISH_LABELS[label]).toBeDefined();
      expect(BUILT_IN_FOODS.some((f) => f.dishClass === label)).toBe(true);
    }
    expect(Object.keys(DISH_LABELS).sort()).toEqual([...meta.labels].sort());
  });

  it('SG FoodID serving matches its published per-serving energy', () => {
    // F05100089 nasi lemak (fish set): 349 g serving, 95.99% edible, 207 kcal/100 g.
    const f = BUILT_IN_FOODS.find((x) => x.id === 'sg-F05100089')!;
    expect(f.servings![0]!.grams).toBe(335.01);
    expect(nutrientsFor(f.per100g, 335.01).kcal).toBeCloseTo(693.47, 1);
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

  it('start weight is the first weight ever entered, not a corrected weigh-in', () => {
    let s: AppState = {
      ...base,
      profile: { ...profile, goalStartDate: '2026-10-01' },
      targets: [
        t('a', '2026-10-01', '1'),
        { ...t('b', '2026-10-20', '2'), weightKg: 70, reason: 'profile_change' as const },
      ],
    };
    s = setWeightOn(s, { id: 'w', date: '2026-10-01', measuredAt: 'x', weightKg: 74 });
    expect(startWeightKg(s)).toBe(75); // from the initial target, not the 74 correction
    expect(startWeightKg({ ...emptyState })).toBeNull();
    expect(
      startWeightKg({
        ...emptyState,
        weights: [{ id: 'x', date: 'd', measuredAt: 'm', weightKg: 80 }],
      }),
    ).toBe(80);
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
      'protein_target',
      'home_short',
      'log_weight',
    ]);
    expect(tasks.find((x) => x.id === 'log_three')?.progress?.text).toBe('1 / 3 餐');
    expect(tasks.find((x) => x.id === 'log_three')?.done).toBe(false);
    s = setDayComplete(s, '2026-10-11', true);
    expect(s.completeDays).toEqual(['2026-10-11']);
    s = addWeight(s, { id: 'w', date: '2026-10-11', measuredAt: 't', weightKg: 74 });
    expect(tasksFor(s, '2026-10-11').find((x) => x.id === 'log_weight')?.done).toBe(true);
  });

  it('protein task compares the day total with the protein target', () => {
    const target = {
      id: 't',
      effectiveFrom: '2026-10-01',
      createdAt: '1',
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
    };
    const s0: AppState = {
      ...base,
      targets: [target],
      profile: { ...profile, consentedAt: '2026-10-11T00:00:00.000Z' },
    };
    const meal = (id: string, grams: number) => ({
      id,
      date: '2026-10-11',
      meal: 'lunch' as const,
      food: chicken,
      grams,
      now: 't',
    });
    const s1 = logFood(s0, meal('a', 200)); // 62 g protein
    const p1 = tasksFor(s1, '2026-10-11').find((x) => x.id === 'protein_target');
    expect(p1?.progress?.text).toBe('62 / 120 g');
    expect(p1?.done).toBe(false);
    const s2 = logFood(s1, meal('b', 200)); // 124 g in total
    expect(tasksFor(s2, '2026-10-11').find((x) => x.id === 'protein_target')?.done).toBe(true);
  });

  it('nutrition-first users get a calorie goal judged after dinner', () => {
    const target = {
      id: 't',
      effectiveFrom: '2026-10-01',
      createdAt: '1',
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
    };
    const s0: AppState = {
      ...base,
      targets: [target],
      profile: {
        ...profile,
        lifestyleMode: 'nutrition_first',
        consentedAt: '2026-10-11T00:00:00.000Z',
      },
    };
    const eat = (s: AppState, id: string, meal: 'lunch' | 'dinner', grams: number) =>
      logFood(s, { id, date: '2026-10-11', meal, food: chicken, grams, now: 't' });
    const task = (s: AppState) => tasksFor(s, '2026-10-11').find((x) => x.id === 'kcal_within');
    const lunch = eat(s0, 'a', 'lunch', 300); // 495 kcal, no dinner yet
    expect(task(lunch)?.done).toBe(false);
    expect(task(lunch)?.progress?.text).toBe('495 / 1920 kcal');
    expect(task(eat(lunch, 'b', 'dinner', 300))?.done).toBe(true); // 990 kcal
    expect(task(eat(lunch, 'c', 'dinner', 1000))?.done).toBe(false); // 2145 kcal
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

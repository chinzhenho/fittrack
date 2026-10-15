import { nutrientsFor } from '../logic/nutrition';
import type {
  AppState,
  ChallengeRecord,
  Food,
  MealItem,
  MealType,
  Profile,
  TargetVersion,
  WaterEntry,
  WeightEntry,
} from './types';

// Pure state transitions. Each takes the state and returns a new one; the UI wraps
// them with store.update(). IDs and timestamps are passed in so tests are deterministic.

export function completeOnboarding(
  s: AppState,
  profile: Profile,
  weight: WeightEntry,
  target: TargetVersion,
): AppState {
  return { ...s, profile, weights: [...s.weights, weight], targets: [...s.targets, target] };
}

export function saveProfile(s: AppState, profile: Profile, target: TargetVersion): AppState {
  return { ...s, profile, targets: [...s.targets, target] };
}

/** Profile changes that do not affect the calorie target (name, avatar, target weight). */
export function updateProfileDetails(s: AppState, profile: Profile): AppState {
  return { ...s, profile };
}

export function addTarget(s: AppState, target: TargetVersion): AppState {
  return { ...s, targets: [...s.targets, target] };
}

export function setHideNumbers(s: AppState, hide: boolean): AppState {
  return s.profile ? { ...s, profile: { ...s.profile, hideNumbers: hide } } : s;
}

export function logFood(
  s: AppState,
  args: {
    id: string;
    date: string;
    meal: MealType;
    food: Food;
    grams: number;
    now: string;
    label?: string;
  },
): AppState {
  const label = args.label?.trim().slice(0, 20);
  const item: MealItem = {
    id: args.id,
    date: args.date,
    meal: args.meal,
    ...(label && { label }),
    foodId: args.food.id,
    name: args.food.name,
    grams: args.grams,
    nutrients: nutrientsFor(args.food.per100g, args.grams),
    sourceRef: args.food.sourceRef,
    createdAt: args.now,
  };
  return { ...s, meals: [...s.meals, item] };
}

/**
 * Changes the amount, meal or label of a logged item. Nutrients are a snapshot of the
 * food at logging time, so they are scaled linearly to the new amount.
 */
export function editMeal(
  s: AppState,
  id: string,
  change: { grams: number; meal: MealType; label?: string },
): AppState {
  return {
    ...s,
    meals: s.meals.map((m) => {
      if (m.id !== id) return m;
      const f = change.grams / m.grams;
      const n = m.nutrients;
      const nutrients = {
        kcal: n.kcal * f,
        proteinG: n.proteinG * f,
        carbsG: n.carbsG * f,
        fatG: n.fatG * f,
        ...(n.fiberG !== undefined && { fiberG: n.fiberG * f }),
        ...(n.sugarG !== undefined && { sugarG: n.sugarG * f }),
        ...(n.sodiumMg !== undefined && { sodiumMg: n.sodiumMg * f }),
      };
      const label = change.label?.trim().slice(0, 20);
      const next: MealItem = { ...m, grams: change.grams, meal: change.meal, nutrients };
      delete next.label;
      return {
        ...next,
        ...(change.meal === 'snack' && label ? { label } : {}),
      };
    }),
  };
}

export function removeMeal(s: AppState, id: string): AppState {
  return { ...s, meals: s.meals.filter((m) => m.id !== id) };
}

export function restoreMeal(s: AppState, item: MealItem): AppState {
  return s.meals.some((m) => m.id === item.id) ? s : { ...s, meals: [...s.meals, item] };
}

export function addCustomFood(s: AppState, food: Food): AppState {
  return { ...s, customFoods: [...s.customFoods, food] };
}

function toggle(list: string[], value: string, on: boolean): string[] {
  const without = list.filter((v) => v !== value);
  return on ? [...without, value] : without;
}

export function setDayComplete(s: AppState, date: string, complete: boolean): AppState {
  return { ...s, completeDays: toggle(s.completeDays, date, complete) };
}

export function addWeight(s: AppState, entry: WeightEntry): AppState {
  return { ...s, weights: [...s.weights, entry] };
}

/** Records the weight for one day, replacing any earlier entry on that day. */
export function setWeightOn(s: AppState, entry: WeightEntry): AppState {
  return { ...s, weights: [...s.weights.filter((w) => w.date !== entry.date), entry] };
}

export function removeWeight(s: AppState, id: string): AppState {
  return { ...s, weights: s.weights.filter((w) => w.id !== id) };
}

export function addWater(s: AppState, entry: WaterEntry): AppState {
  return { ...s, water: [...s.water, entry] };
}

export function removeWater(s: AppState, id: string): AppState {
  return { ...s, water: s.water.filter((w) => w.id !== id) };
}

export function acceptChallenge(s: AppState, record: ChallengeRecord): AppState {
  return { ...s, challenges: [...s.challenges.filter((c) => c.id !== record.id), record] };
}

export function dismissInsight(s: AppState, key: string): AppState {
  return s.dismissedInsights.includes(key)
    ? s
    : { ...s, dismissedInsights: [...s.dismissedInsights, key] };
}

export function keepTarget(s: AppState, date: string): AppState {
  return s.adaptiveKeptOn.includes(date)
    ? s
    : { ...s, adaptiveKeptOn: [...s.adaptiveKeptOn, date] };
}

/**
 * Removes every health record (food, weight, water, habits and their settings) but keeps
 * the profile, the plan with its target history, and the user's own foods.
 */
export function clearHealthRecords(s: AppState): AppState {
  return {
    ...s,
    meals: [],
    weights: [],
    completeDays: [],
    water: [],
    challenges: [],
    dismissedInsights: [],
    adaptiveKeptOn: [],
    monthlyJoined: [],
    restDays: [],
    skippedTasks: {},
    sessions: [],
    activities: [],
  };
}

export function joinMonthlyChallenge(s: AppState, month: string): AppState {
  return s.monthlyJoined.includes(month) ? s : { ...s, monthlyJoined: [...s.monthlyJoined, month] };
}

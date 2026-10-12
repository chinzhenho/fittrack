import { nutrientsFor } from '../logic/nutrition';
import type {
  ActivityLog,
  AppState,
  Food,
  MealItem,
  MealType,
  Profile,
  TargetVersion,
  WeightEntry,
  WorkoutSession,
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
    name: args.food.nameZh,
    grams: args.grams,
    nutrients: nutrientsFor(args.food.per100g, args.grams),
    sourceRef: args.food.sourceRef,
    createdAt: args.now,
  };
  return { ...s, meals: [...s.meals, item] };
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

export function setRestDay(s: AppState, date: string, rest: boolean): AppState {
  return { ...s, restDays: toggle(s.restDays, date, rest) };
}

export function skipTask(s: AppState, date: string, taskId: string, skip: boolean): AppState {
  return {
    ...s,
    skippedTasks: { ...s.skippedTasks, [date]: toggle(s.skippedTasks[date] ?? [], taskId, skip) },
  };
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

export function addActivity(s: AppState, log: ActivityLog): AppState {
  return { ...s, activities: [...s.activities, log] };
}

export function saveSession(s: AppState, session: WorkoutSession): AppState {
  const others = s.sessions.filter((x) => x.id !== session.id);
  return { ...s, sessions: [...others, session] };
}

export function removeSession(s: AppState, id: string): AppState {
  return { ...s, sessions: s.sessions.filter((x) => x.id !== id) };
}

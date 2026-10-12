import type { ActivityLevel, FormulaSex, Goal } from '@fittrack/engine';

export type LifestyleMode = 'nutrition_first' | 'home' | 'gym' | 'outdoor' | 'mixed';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type DietTag = 'halal' | 'vegetarian' | 'no_beef' | 'no_pork';
export type Experience = 'beginner' | 'occasional' | 'regular';

export interface Nutrients {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
}

export interface Food {
  id: string;
  nameZh: string;
  nameEn: string;
  aliases: string[];
  per100g: Nutrients;
  source: 'usda' | 'sgfoodid' | 'user';
  /** e.g. "USDA FDC 168878" */
  sourceRef: string;
  /** What the dish contains, from the data source (English). */
  description?: string;
  /** Typical servings; grams are the edible amount. */
  servings?: { label: string; grams: number }[];
  /** Photo-recognition class this food belongs to (ml/ model labels). */
  dishClass?: string;
}

export interface Profile {
  formulaSex: FormulaSex;
  birthDate: string;
  heightCm: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  ratePctPerWeek: number;
  targetWeightKg?: number;
  goalStartDate: string;
  lifestyleMode: LifestyleMode;
  minutesPerDay: number;
  experience: Experience;
  dietTags: DietTag[];
  screening: {
    pregnantOrLactating: boolean;
    eatingDisorderHistory: boolean;
    kidneyDisease: boolean;
    exerciseCaution: boolean;
  };
  hideNumbers: boolean;
  consentedAt: string;
}

/** One version of the nutrition target (spec 10.1 nutrition_targets): never overwritten. */
export interface TargetVersion {
  id: string;
  effectiveFrom: string;
  createdAt: string;
  reason: 'initial' | 'profile_change' | 'adaptive';
  formulaVersion: string;
  weightKg: number;
  bmrKcal: number;
  tdeeKcal: number;
  calorieFloorKcal: number;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  clamps: string[];
}

/** A logged food with its nutrition snapshot (spec 8.1: history never changes). */
export interface MealItem {
  id: string;
  date: string;
  meal: MealType;
  foodId: string;
  name: string;
  grams: number;
  nutrients: Nutrients;
  sourceRef: string;
  createdAt: string;
}

export interface WeightEntry {
  id: string;
  date: string;
  measuredAt: string;
  weightKg: number;
  waistCm?: number;
}

export interface LoggedSet {
  exerciseId: string;
  reps?: number;
  weightKg?: number;
  durationS?: number;
  done: boolean;
}

export interface WorkoutSession {
  id: string;
  date: string;
  templateId: string;
  startedAt: string;
  endedAt?: string;
  sets: LoggedSet[];
  painExerciseIds: string[];
}

export interface ActivityLog {
  id: string;
  date: string;
  type: 'walk' | 'run' | 'cycle' | 'other';
  minutes: number;
}

export interface AppState {
  schemaVersion: 1;
  /** ISO time of the last local change; decides which copy is newer when syncing. */
  updatedAt: string;
  /** Supabase user id this data belongs to; null for a guest (not signed in). */
  ownerId: string | null;
  profile: Profile | null;
  targets: TargetVersion[];
  customFoods: Food[];
  meals: MealItem[];
  weights: WeightEntry[];
  completeDays: string[];
  restDays: string[];
  skippedTasks: Record<string, string[]>;
  sessions: WorkoutSession[];
  activities: ActivityLog[];
}

export const emptyState: AppState = {
  schemaVersion: 1,
  updatedAt: '',
  ownerId: null,
  profile: null,
  targets: [],
  customFoods: [],
  meals: [],
  weights: [],
  completeDays: [],
  restDays: [],
  skippedTasks: {},
  sessions: [],
  activities: [],
};

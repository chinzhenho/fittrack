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
  name: string;
  nameEn: string;
  aliases: string[];
  per100g: Nutrients;
  source: 'usda' | 'sgfoodid' | 'user' | 'ai';
  /** e.g. "USDA FDC 168878" */
  sourceRef: string;
  /** What the dish contains, from the data source (English). */
  description?: string;
  /** Typical servings; grams are the edible amount. */
  servings?: { label: string; grams: number }[];
  /** Dish family, e.g. nasi_lemak, used to group variants. */
  dishClass?: string;
}

export interface Profile {
  /** Optional display name used in greetings. */
  nickname?: string;
  /** Optional emoji avatar. */
  avatar?: string;
  /** Activity level for the drinking guide; 'normal' when not set. */
  waterActivity?: 'low' | 'normal' | 'high';
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
  /** Optional name the user gave this entry, e.g. tea time or supper (used with Other). */
  label?: string;
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

/** One drink logged on the water tracker. */
export interface WaterEntry {
  id: string;
  date: string;
  ml: number;
  at: string;
}

/**
 * A weekly challenge the user accepted. Never deleted: skipping sets `skipped`, and the
 * newest record for a week wins, so syncing two devices cannot resurrect a skipped one.
 */
export interface ChallengeRecord {
  id: string;
  challenge: string;
  weekStart: string;
  acceptedAt: string;
  skipped?: boolean;
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
  water: WaterEntry[];
  challenges: ChallengeRecord[];
  /** Insight keys ("insightId:weekMonday") the user chose to hide. */
  dismissedInsights: string[];
  /** Dates on which the user chose to keep the current target over a suggestion. */
  adaptiveKeptOn: string[];
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
  water: [],
  challenges: [],
  dismissedInsights: [],
  adaptiveKeptOn: [],
};

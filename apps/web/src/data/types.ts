import type { ActivityLevel, FormulaSex, Goal } from '@fittrack/engine';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type DietTag = 'halal' | 'vegetarian' | 'no_beef' | 'no_pork';

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
  /** Optional profile photo: a small square JPEG data URL (see components/Avatar). */
  avatarPhoto?: string;
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
  dietTags: DietTag[];
  screening: {
    pregnantOrLactating: boolean;
    eatingDisorderHistory: boolean;
    kidneyDisease: boolean;
  };
  hideNumbers: boolean;
  consentedAt: string;
  /** App language chosen in Me; saved with the profile so it follows the account. */
  language?: 'en' | 'zh';
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
  /** Days confirmed as fully logged (ticked before, or "I ate less" on a low day). */
  completeDays: string[];
  /** Days the user said were not fully logged; left out of target checks. */
  partialDays: string[];
  /** Insight keys ("insightId:weekMonday") the user chose to hide. */
  dismissedInsights: string[];
  /** Dates on which the user chose to keep the current target over a suggestion. */
  adaptiveKeptOn: string[];
  /** Months ("YYYY-MM") whose monthly challenge the user joined. */
  monthlyJoined: string[];
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
  partialDays: [],
  dismissedInsights: [],
  adaptiveKeptOn: [],
  monthlyJoined: [],
};

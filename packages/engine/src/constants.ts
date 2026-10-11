// Every number here is a spec value (section 5). Change them only together with
// FORMULA_VERSION and the spec, so stored targets stay explainable.

export const FORMULA_VERSION = '1.0.0';

export type FormulaSex = 'male' | 'female' | 'neutral';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';
export type Goal = 'fat_loss' | 'maintain' | 'muscle_gain' | 'weight_gain';

/** Mifflin-St Jeor sex constant; 'neutral' is the mean of the two (product option). */
export const SEX_CONSTANT: Record<FormulaSex, number> = { male: 5, female: -161, neutral: -78 };

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

/** Simplified energy content of body-weight change; initial estimates only (spec 5.3). */
export const KCAL_PER_KG = 7700;

export const INPUT_LIMITS = {
  age: { min: 18, max: 100 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 30, max: 300 },
} as const;

export interface Range {
  min: number;
  max: number;
  default: number;
}

/** Weekly body-weight change, in percent of body weight. */
export const RATE_PCT_PER_WEEK: Record<Goal, Range> = {
  fat_loss: { min: 0.25, max: 1.0, default: 0.5 },
  maintain: { min: 0, max: 0, default: 0 },
  muscle_gain: { min: 0.1, max: 0.5, default: 0.25 },
  weight_gain: { min: 0.25, max: 0.5, default: 0.25 },
};

export const MAX_DEFICIT_FRACTION_OF_TDEE = 0.25;
export const MAX_SURPLUS_KCAL = 500;
export const ABSOLUTE_CALORIE_FLOOR: Record<FormulaSex, number> = {
  female: 1200,
  male: 1500,
  neutral: 1500,
};
export const TARGET_ROUNDING_KCAL = 10;

/** Protein in g per kg of reference weight (spec 5.4). */
export const PROTEIN_G_PER_KG: Record<Goal, Range> = {
  fat_loss: { min: 1.2, max: 2.2, default: 1.6 },
  muscle_gain: { min: 1.4, max: 2.2, default: 1.6 },
  weight_gain: { min: 1.2, max: 2.0, default: 1.4 },
  maintain: { min: 0.8, max: 2.0, default: 1.2 },
};
export const KIDNEY_PROTEIN_G_PER_KG = 0.8;
export const PROTEIN_MAX_FRACTION = 0.35;
export const FAT_FRACTION: Range = { min: 0.2, max: 0.35, default: 0.25 };
export const CARBS_MIN_G = 130;

export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9, alcohol: 7 } as const;

/** Malaysia CPG Management of Obesity (2023) Asian cut-offs. */
export const BMI_CUTOFFS = { underweight: 18.5, overweight: 23, obese: 27.5 } as const;
export const REFERENCE_BMI = 25;
export const WAIST_HIGH_RISK_CM = { male: 90, female: 80 } as const;

export const TREND_ALPHA = 0.1;

export const ADAPTIVE = {
  windowDays: 21,
  minWindowDays: 14,
  excludeDaysAfterGoalStart: 14,
  minCompleteLogFraction: 0.8,
  weighInsPer21Days: 10,
  blendObserved: 0.5,
  maxChangeKcal: 150,
} as const;

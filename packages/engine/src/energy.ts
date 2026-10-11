import {
  ACTIVITY_FACTORS,
  BMI_CUTOFFS,
  INPUT_LIMITS,
  SEX_CONSTANT,
  WAIST_HIGH_RISK_CM,
  type ActivityLevel,
  type FormulaSex,
} from './constants.js';
import { EngineInputError, requireFinite, requireRange } from './errors.js';

export interface BodyInput {
  weightKg: number;
  heightCm: number;
  age: number;
  formulaSex: FormulaSex;
}

/** Mifflin-St Jeor (1990): BMR = 10W + 6.25H - 5A + s. Spec 5.1. */
export function mifflinStJeor({ weightKg, heightCm, age, formulaSex }: BodyInput): number {
  requireRange(weightKg, INPUT_LIMITS.weightKg.min, INPUT_LIMITS.weightKg.max, 'weightKg');
  requireRange(heightCm, INPUT_LIMITS.heightCm.min, INPUT_LIMITS.heightCm.max, 'heightCm');
  requireRange(age, INPUT_LIMITS.age.min, INPUT_LIMITS.age.max, 'age');
  return 10 * weightKg + 6.25 * heightCm - 5 * age + SEX_CONSTANT[formulaSex];
}

/** Katch-McArdle: BMR = 370 + 21.6 x lean mass (kg). Only with a reliable body-fat measurement. */
export function katchMcArdle(leanMassKg: number): number {
  requireFinite(leanMassKg, 'leanMassKg');
  if (leanMassKg <= 0) throw new EngineInputError('leanMassKg', 'must be positive');
  return 370 + 21.6 * leanMassKg;
}

export function tdee(bmrKcal: number, activityLevel: ActivityLevel): number {
  return bmrKcal * ACTIVITY_FACTORS[activityLevel];
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

/** Asian cut-offs. Used for safety checks only, never shown as a label (spec 5.9). */
export function bmiCategory(value: number): BmiCategory {
  if (value < BMI_CUTOFFS.underweight) return 'underweight';
  if (value < BMI_CUTOFFS.overweight) return 'normal';
  if (value < BMI_CUTOFFS.obese) return 'overweight';
  return 'obese';
}

/** null for the neutral formula option: there is no neutral cut-off. */
export function waistHighRisk(waistCm: number, formulaSex: FormulaSex): boolean | null {
  if (formulaSex === 'neutral') return null;
  return waistCm >= WAIST_HIGH_RISK_CM[formulaSex];
}

/** Net exercise kcal: (MET - 1) x 3.5 x kg / 200 x minutes. Information only (spec 5.8). */
export function netExerciseKcal(met: number, weightKg: number, minutes: number): number {
  requireFinite(met, 'met');
  requireFinite(weightKg, 'weightKg');
  requireFinite(minutes, 'minutes');
  if (minutes < 0) throw new EngineInputError('minutes', 'must not be negative');
  return Math.max(0, ((met - 1) * 3.5 * weightKg) / 200) * minutes;
}

import {
  ABSOLUTE_CALORIE_FLOOR,
  BMI_CUTOFFS,
  FORMULA_VERSION,
  INPUT_LIMITS,
  KCAL_PER_KG,
  MAX_DEFICIT_FRACTION_OF_TDEE,
  MAX_SURPLUS_KCAL,
  RATE_PCT_PER_WEEK,
  TARGET_ROUNDING_KCAL,
  type ActivityLevel,
  type FormulaSex,
  type Goal,
} from './constants.js';
import { ageOn } from './dates.js';
import { EngineInputError, requireRange } from './errors.js';
import { bmi, mifflinStJeor, tdee } from './energy.js';
import { computeMacros, type MacroClamp, type Macros, type MacroWarning } from './macros.js';
import { ceilTo, roundHalfUp } from './rounding.js';

export interface Screening {
  pregnantOrLactating?: boolean;
  eatingDisorderHistory?: boolean;
  kidneyDisease?: boolean;
}

export interface PlanInput {
  formulaSex: FormulaSex;
  birthDate: string;
  /** The user's local date the plan is computed for. */
  onDate: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  /** Percent of body weight per week; ignored for maintenance. Defaults per goal. */
  ratePctPerWeek?: number;
  targetWeightKg?: number;
  proteinGPerKg?: number;
  fatFraction?: number;
  screening?: Screening;
}

export type PlanClamp =
  'deficit_cap' | 'surplus_cap' | 'calorie_floor' | 'floor_above_tdee' | MacroClamp;
export type PlanWarning = 'neutral_formula' | MacroWarning;
export type RejectReason =
  | 'underweight_fat_loss'
  | 'target_weight_underweight'
  | 'pregnancy_deficit'
  | 'eating_disorder_deficit';

export interface Plan {
  formulaVersion: string;
  age: number;
  bmrKcal: number;
  tdeeKcal: number;
  bmi: number;
  ratePctPerWeek: number;
  /** Signed: negative is a deficit. */
  requestedDeltaKcal: number;
  appliedDeltaKcal: number;
  calorieFloorKcal: number;
  caloriesKcal: number;
  macros: Omit<Macros, 'clamps' | 'warnings'>;
  /** In the order they were applied. */
  clamps: PlanClamp[];
  warnings: PlanWarning[];
}

export type PlanResult = { ok: true; plan: Plan } | { ok: false; reason: RejectReason };

/**
 * Spec 5.1-5.4 + 6: BMR -> TDEE -> target calories with hard limits -> macros.
 * Throws EngineInputError for out-of-range input; returns { ok: false } for goals
 * the safety rules refuse.
 */
export function computePlan(input: PlanInput): PlanResult {
  const { formulaSex, heightCm, weightKg, activityLevel, goal, screening = {} } = input;

  const age = ageOn(input.birthDate, input.onDate);
  requireRange(age, INPUT_LIMITS.age.min, INPUT_LIMITS.age.max, 'birthDate');
  const bmrKcal = mifflinStJeor({ weightKg, heightCm, age, formulaSex });
  const tdeeKcal = tdee(bmrKcal, activityLevel);
  const bmiNow = bmi(weightKg, heightCm);

  const rateRange = RATE_PCT_PER_WEEK[goal];
  const ratePctPerWeek = goal === 'maintain' ? 0 : (input.ratePctPerWeek ?? rateRange.default);
  requireRange(ratePctPerWeek, rateRange.min, rateRange.max, 'ratePctPerWeek');

  if (input.targetWeightKg !== undefined) {
    const t = input.targetWeightKg;
    requireRange(t, INPUT_LIMITS.weightKg.min, INPUT_LIMITS.weightKg.max, 'targetWeightKg');
    if (goal === 'fat_loss' && t >= weightKg) {
      throw new EngineInputError('targetWeightKg', 'must be below current weight for fat loss');
    }
    if ((goal === 'weight_gain' || goal === 'muscle_gain') && t <= weightKg) {
      throw new EngineInputError('targetWeightKg', 'must be above current weight for a gain goal');
    }
    if (bmi(t, heightCm) < BMI_CUTOFFS.underweight) {
      return { ok: false, reason: 'target_weight_underweight' };
    }
  }

  if (goal === 'fat_loss') {
    if (bmiNow < BMI_CUTOFFS.underweight) return { ok: false, reason: 'underweight_fat_loss' };
    if (screening.pregnantOrLactating) return { ok: false, reason: 'pregnancy_deficit' };
    if (screening.eatingDisorderHistory) return { ok: false, reason: 'eating_disorder_deficit' };
  }

  const clamps: PlanClamp[] = [];
  const magnitude = ((ratePctPerWeek / 100) * weightKg * KCAL_PER_KG) / 7;
  const floorKcal = Math.max(bmrKcal, ABSOLUTE_CALORIE_FLOOR[formulaSex]);
  let requestedDeltaKcal = 0;
  let appliedDeltaKcal = 0;
  let caloriesKcal: number;

  if (goal === 'fat_loss') {
    requestedDeltaKcal = -magnitude;
    let deficit = magnitude;
    const cap = MAX_DEFICIT_FRACTION_OF_TDEE * tdeeKcal;
    if (deficit > cap) {
      deficit = cap;
      clamps.push('deficit_cap');
    }
    if (floorKcal >= tdeeKcal) {
      // The floor leaves no room for a deficit: hold maintenance.
      clamps.push('floor_above_tdee');
      appliedDeltaKcal = 0;
      caloriesKcal = roundHalfUp(tdeeKcal, TARGET_ROUNDING_KCAL);
    } else {
      let target = tdeeKcal - deficit;
      if (target < floorKcal) {
        target = floorKcal;
        clamps.push('calorie_floor');
      }
      appliedDeltaKcal = target - tdeeKcal;
      caloriesKcal = roundHalfUp(target, TARGET_ROUNDING_KCAL);
      if (caloriesKcal < floorKcal) caloriesKcal = ceilTo(floorKcal, TARGET_ROUNDING_KCAL);
    }
  } else if (goal === 'maintain') {
    caloriesKcal = roundHalfUp(tdeeKcal, TARGET_ROUNDING_KCAL);
  } else {
    requestedDeltaKcal = magnitude;
    appliedDeltaKcal = magnitude;
    if (appliedDeltaKcal > MAX_SURPLUS_KCAL) {
      appliedDeltaKcal = MAX_SURPLUS_KCAL;
      clamps.push('surplus_cap');
    }
    caloriesKcal = roundHalfUp(tdeeKcal + appliedDeltaKcal, TARGET_ROUNDING_KCAL);
  }

  const {
    clamps: macroClamps,
    warnings: macroWarnings,
    ...macros
  } = computeMacros({
    caloriesKcal,
    goal,
    weightKg,
    heightCm,
    ...(input.proteinGPerKg !== undefined && { proteinGPerKg: input.proteinGPerKg }),
    ...(input.fatFraction !== undefined && { fatFraction: input.fatFraction }),
    ...(screening.kidneyDisease !== undefined && { kidneyDisease: screening.kidneyDisease }),
  });

  const warnings: PlanWarning[] = [];
  if (formulaSex === 'neutral') warnings.push('neutral_formula');

  return {
    ok: true,
    plan: {
      formulaVersion: FORMULA_VERSION,
      age,
      bmrKcal,
      tdeeKcal,
      bmi: bmiNow,
      ratePctPerWeek,
      requestedDeltaKcal,
      appliedDeltaKcal,
      calorieFloorKcal: floorKcal,
      caloriesKcal,
      macros,
      clamps: [...clamps, ...macroClamps],
      warnings: [...warnings, ...macroWarnings],
    },
  };
}

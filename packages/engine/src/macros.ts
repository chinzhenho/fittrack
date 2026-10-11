import {
  BMI_CUTOFFS,
  CARBS_MIN_G,
  FAT_FRACTION,
  KCAL_PER_G,
  KIDNEY_PROTEIN_G_PER_KG,
  PROTEIN_G_PER_KG,
  PROTEIN_MAX_FRACTION,
  REFERENCE_BMI,
  type Goal,
} from './constants.js';
import { requireRange } from './errors.js';
import { bmi } from './energy.js';
import { roundHalfUp } from './rounding.js';

export type MacroClamp = 'protein_cap' | 'fat_reduced_for_carbs';
export type MacroWarning = 'low_carbs';

export interface MacroInput {
  caloriesKcal: number;
  goal: Goal;
  weightKg: number;
  heightCm: number;
  /** Override within the goal's range; defaults to the goal default. */
  proteinGPerKg?: number;
  /** Override within 0.20-0.35; defaults to 0.25. */
  fatFraction?: number;
  kidneyDisease?: boolean;
}

export interface Macros {
  proteinG: number;
  fatG: number;
  carbsG: number;
  referenceWeightKg: number;
  proteinGPerKg: number;
  fatFraction: number;
  clamps: MacroClamp[];
  warnings: MacroWarning[];
}

/** BMI >= 27.5 uses the weight at BMI 25 so protein targets are not inflated (spec 5.4). */
export function referenceWeightKg(weightKg: number, heightCm: number): number {
  if (bmi(weightKg, heightCm) < BMI_CUTOFFS.obese) return weightKg;
  const m = heightCm / 100;
  return REFERENCE_BMI * m * m;
}

/** Protein first (g/kg), then fat (% of energy), carbs take the rest (spec 5.4). */
export function computeMacros(input: MacroInput): Macros {
  const { caloriesKcal: e, goal, weightKg, heightCm } = input;
  const range = PROTEIN_G_PER_KG[goal];
  const clamps: MacroClamp[] = [];
  const warnings: MacroWarning[] = [];

  let proteinGPerKg = input.proteinGPerKg ?? range.default;
  requireRange(proteinGPerKg, range.min, range.max, 'proteinGPerKg');
  if (input.kidneyDisease) proteinGPerKg = KIDNEY_PROTEIN_G_PER_KG;

  const fatFraction = input.fatFraction ?? FAT_FRACTION.default;
  requireRange(fatFraction, FAT_FRACTION.min, FAT_FRACTION.max, 'fatFraction');

  const wRef = referenceWeightKg(weightKg, heightCm);
  let proteinG = roundHalfUp(proteinGPerKg * wRef);
  if (proteinG * KCAL_PER_G.protein > PROTEIN_MAX_FRACTION * e) {
    proteinG = roundHalfUp((PROTEIN_MAX_FRACTION * e) / KCAL_PER_G.protein);
    clamps.push('protein_cap');
  }

  let fatG = roundHalfUp((fatFraction * e) / KCAL_PER_G.fat);
  const carbsFor = (fat: number) =>
    roundHalfUp((e - KCAL_PER_G.protein * proteinG - KCAL_PER_G.fat * fat) / KCAL_PER_G.carbs);
  let carbsG = carbsFor(fatG);

  if (carbsG < CARBS_MIN_G) {
    const fatFloorG = roundHalfUp((FAT_FRACTION.min * e) / KCAL_PER_G.fat);
    const fatForMinCarbs = Math.floor(
      (e - KCAL_PER_G.protein * proteinG - KCAL_PER_G.carbs * CARBS_MIN_G) / KCAL_PER_G.fat,
    );
    const lowered = Math.max(fatFloorG, fatForMinCarbs);
    if (lowered < fatG) {
      fatG = lowered;
      carbsG = carbsFor(fatG);
      clamps.push('fat_reduced_for_carbs');
    }
    if (carbsG < CARBS_MIN_G) warnings.push('low_carbs');
  }

  return {
    proteinG,
    fatG,
    carbsG,
    referenceWeightKg: wRef,
    proteinGPerKg,
    fatFraction,
    clamps,
    warnings,
  };
}

import type { MealItem, MealType, Nutrients } from '../data/types';
import type { Goal } from '@fittrack/engine';
import { t, tr } from '../lib/i18n';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const MEAL_LABELS: Record<MealType, string> = tr({
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Other',
});

/** Spec 5.5: N_item = N_100g x grams / 100. Values kept unrounded; round only for display. */
export function nutrientsFor(per100g: Nutrients, grams: number): Nutrients {
  const f = grams / 100;
  const out: Nutrients = {
    kcal: per100g.kcal * f,
    proteinG: per100g.proteinG * f,
    carbsG: per100g.carbsG * f,
    fatG: per100g.fatG * f,
  };
  if (per100g.fiberG !== undefined) out.fiberG = per100g.fiberG * f;
  if (per100g.sugarG !== undefined) out.sugarG = per100g.sugarG * f;
  if (per100g.sodiumMg !== undefined) out.sodiumMg = per100g.sodiumMg * f;
  return out;
}

export function sumNutrients(items: { nutrients: Nutrients }[]): Nutrients {
  return items.reduce<Nutrients>(
    (t, i) => ({
      kcal: t.kcal + i.nutrients.kcal,
      proteinG: t.proteinG + i.nutrients.proteinG,
      carbsG: t.carbsG + i.nutrients.carbsG,
      fatG: t.fatG + i.nutrients.fatG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

export function mealsOn(meals: MealItem[], date: string): MealItem[] {
  return meals.filter((m) => m.date === date);
}

export type CustomFoodError = 'name' | 'kcal' | 'macro' | 'macroSum' | 'sodium';

/** Validates per-100 g label values: energy 0-900 kcal, macros 0-100 g, macros sum <= 100 g. */
export function validateCustomFood(name: string, n: Nutrients): CustomFoodError[] {
  const errors: CustomFoodError[] = [];
  if (!name.trim()) errors.push('name');
  if (!Number.isFinite(n.kcal) || n.kcal < 0 || n.kcal > 900) errors.push('kcal');
  const macros = [n.proteinG, n.carbsG, n.fatG];
  if (macros.some((v) => !Number.isFinite(v) || v < 0 || v > 100)) errors.push('macro');
  else if (macros.reduce((a, b) => a + b, 0) > 100) errors.push('macroSum');
  if (
    n.sodiumMg !== undefined &&
    (!Number.isFinite(n.sodiumMg) || n.sodiumMg < 0 || n.sodiumMg > 40000)
  ) {
    errors.push('sodium');
  }
  return errors;
}

/** Meal a new entry most likely belongs to, from the local hour (0-23). */
export function mealForHour(hour: number): MealType {
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack';
}

/** Whether the goal needs a calorie surplus (eat at least the target) rather than a ceiling. */
export function isGainGoal(goal: Goal): boolean {
  return goal === 'weight_gain' || goal === 'muscle_gain';
}

/**
 * Wording for the gap to the daily calorie target. Losing or maintaining weight
 * treats the target as a ceiling; gaining treats it as an amount to reach.
 */
export function calorieGap(
  goal: Goal,
  eatenKcal: number,
  targetKcal: number,
): { label: string; kcal: number; state: 'room' | 'over' | 'need' | 'reached' } {
  const left = targetKcal - eatenKcal;
  if (isGainGoal(goal)) {
    return left > 0
      ? { label: t('Still to eat'), kcal: left, state: 'need' }
      : { label: t('Target reached, extra'), kcal: -left, state: 'reached' };
  }
  return left >= 0
    ? { label: t('Left to eat'), kcal: left, state: 'room' }
    : { label: t('Over target'), kcal: -left, state: 'over' };
}

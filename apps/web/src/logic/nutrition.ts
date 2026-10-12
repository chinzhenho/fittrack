import type { Food, MealItem, MealType, Nutrients } from '../data/types';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '點心',
};

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

export function searchFoods(foods: Food[], query: string): Food[] {
  const q = query.trim().toLowerCase();
  if (!q) return foods;
  return foods.filter((f) =>
    [f.nameZh, f.nameEn, ...f.aliases].some((n) => n.toLowerCase().includes(q)),
  );
}

/** Most recently logged distinct foods, newest first. */
export function recentFoodIds(meals: MealItem[], limit = 8): string[] {
  const seen = new Set<string>();
  const sorted = [...meals].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const m of sorted) {
    seen.add(m.foodId);
    if (seen.size >= limit) break;
  }
  return [...seen];
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

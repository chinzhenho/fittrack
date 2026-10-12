import type { MealType } from '../data/types';

/** Icon and tint for each meal, shared by Today and the diary. */
export const MEAL_STYLE: Record<MealType, { icon: string; bg: string }> = {
  breakfast: { icon: '🍳', bg: 'bg-amber-100 dark:bg-amber-500/20' },
  lunch: { icon: '🍛', bg: 'bg-emerald-100 dark:bg-emerald/20' },
  dinner: { icon: '🍲', bg: 'bg-sky-100 dark:bg-sky-500/20' },
  snack: { icon: '🍎', bg: 'bg-rose-100 dark:bg-rose-500/20' },
};

import type { MealType } from '../data/types';
import type { IconName } from './Icons';

/** Icon and colour for each meal, shared by Today and the diary. */
export const MEAL_STYLE: Record<MealType, { glyph: IconName; tile: string; text: string }> = {
  breakfast: { glyph: 'sun', tile: 'bg-[#ff9500]', text: 'text-[#ff9500]' },
  lunch: { glyph: 'fork', tile: 'bg-emerald-500', text: 'text-emerald-strong dark:text-emerald' },
  dinner: { glyph: 'moon', tile: 'bg-[#5856d6]', text: 'text-[#5856d6] dark:text-[#7d7aff]' },
  snack: { glyph: 'star', tile: 'bg-[#ff2d55]', text: 'text-[#ff2d55]' },
};

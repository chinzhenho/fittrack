import type { MealType } from '../data/types';
import type { IconName } from './Icons';

/** Icon and colour for each meal, shared by Today and the diary. */
export const MEAL_STYLE: Record<MealType, { glyph: IconName; tile: string; text: string }> = {
  breakfast: { glyph: 'sun', tile: 'bg-[#dca46c]', text: 'text-[#b07a3c] dark:text-[#e3b47f]' },
  lunch: { glyph: 'fork', tile: 'bg-emerald-500', text: 'text-emerald-strong dark:text-emerald' },
  dinner: { glyph: 'moon', tile: 'bg-[#8299c9]', text: 'text-[#5f78ad] dark:text-[#9fb2da]' },
  snack: { glyph: 'star', tile: 'bg-[#c98272]', text: 'text-[#a8604f] dark:text-[#dc9a8b]' },
};

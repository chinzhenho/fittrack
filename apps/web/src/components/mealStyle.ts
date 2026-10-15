import type { MealType } from '../data/types';
import type { IconName } from './Icons';

/** Icon and colour for each meal, shared by Today and the diary. */
export const MEAL_STYLE: Record<MealType, { glyph: IconName; tile: string; text: string }> = {
  breakfast: { glyph: 'sun', tile: 'bg-[#dca46c]', text: 'text-[#8b571f] dark:text-[#e8b978]' },
  lunch: { glyph: 'fork', tile: 'bg-emerald-500', text: 'text-emerald-strong dark:text-emerald' },
  dinner: { glyph: 'moon', tile: 'bg-[#8299c9]', text: 'text-[#456da8] dark:text-[#9db8ea]' },
  snack: { glyph: 'star', tile: 'bg-[#c98272]', text: 'text-[#a65343] dark:text-[#e69a8a]' },
};

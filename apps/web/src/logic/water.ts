import type { FormulaSex } from '@fittrack/engine';
import type { WaterEntry } from '../data/types';

// Daily drinking-water reference. EFSA (2010) sets adequate total water intake at
// 2.0 L/day for women and 2.5 L/day for men; about 20% normally comes from food, so
// drinks cover roughly 1.6 L and 2.0 L. The neutral formula uses the midpoint.
// Needs rise with heat and exercise, so this is a guide, not a limit.
export const WATER_GOAL_ML: Record<FormulaSex, number> = {
  female: 1600,
  male: 2000,
  neutral: 1800,
};

export const WATER_STEP_ML = 250;

export function waterOn(entries: WaterEntry[], date: string): number {
  return entries.filter((w) => w.date === date).reduce((t, w) => t + w.ml, 0);
}

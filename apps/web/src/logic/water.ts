import type { WaterEntry } from '../data/types';

// Personal daily drinking-water guide. Total water need is about 1 ml per kcal of
// energy expenditure for adults (US National Research Council, Recommended Dietary
// Allowances, 10th ed., 1989), so it scales with each person's weight, height, age,
// sex and activity through their TDEE. About 20% of water normally comes from food
// (EFSA 2010), so drinks cover ~80%. Kept within 1.5-3.5 L and rounded to 50 ml.
// Heat, sweating and exercise raise the need; kidney or heart disease may limit it.
export const WATER_STEP_ML = 250;
const FROM_DRINKS = 0.8;
const MIN_ML = 1500;
const MAX_ML = 3500;

export function waterGoalMl(tdeeKcal: number): number {
  const ml = Math.round((tdeeKcal * FROM_DRINKS) / 50) * 50;
  return Math.min(MAX_ML, Math.max(MIN_ML, ml));
}

/**
 * How much of the day's goal should be drunk by `hour` (local, 0-23), spreading
 * drinks evenly from 07:00 to 21:00. Rounded down to whole glasses.
 */
export function waterByNow(goalMl: number, hour: number, minute = 0): number {
  const t = hour + minute / 60;
  const share = Math.min(1, Math.max(0, (t - 7) / 14));
  return Math.floor((goalMl * share) / WATER_STEP_ML) * WATER_STEP_ML;
}

export function waterOn(entries: WaterEntry[], date: string): number {
  return entries.filter((w) => w.date === date).reduce((t, w) => t + w.ml, 0);
}

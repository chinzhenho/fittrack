import type { WaterEntry } from '../data/types';

// Daily drinking guide by body weight, the common practical rule of roughly
// 30-45 ml per kg depending on activity and climate (e.g. 30-35 ml/kg for
// sedentary adults in air-conditioned settings). It is a range, not a target to
// count; kidney or heart disease may need a different amount set by a doctor.
export type WaterActivity = 'low' | 'normal' | 'high';

export const WATER_ACTIVITY: Record<WaterActivity, { label: string; mlPerKg: number }> = {
  low: { label: '冷气房久坐、轻度活动', mlPerKg: 30 },
  normal: { label: '一般活动量', mlPerKg: 35 },
  high: { label: '常运动、户外或容易出汗', mlPerKg: 40 },
};

export const WATER_CUP_ML = 250;

/** Recommended range in ml: weight x factor to weight x (factor + 5). */
export function waterRangeMl(weightKg: number, activity: WaterActivity): [number, number] {
  const f = WATER_ACTIVITY[activity].mlPerKg;
  return [Math.round(weightKg * f), Math.round(weightKg * (f + 5))];
}

export function waterOn(entries: WaterEntry[], date: string): number {
  return entries.filter((w) => w.date === date).reduce((t, w) => t + w.ml, 0);
}

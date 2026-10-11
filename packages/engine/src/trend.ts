import { TREND_ALPHA } from './constants.js';
import { addDays, parseLocalDate } from './dates.js';
import { EngineInputError } from './errors.js';

export interface DailyWeight {
  date: string;
  weightKg: number;
}

export interface TrendPoint extends DailyWeight {
  trendKg: number;
}

export interface WeightReading {
  localDate: string;
  /** ISO timestamp; decides which reading of a day is first. */
  measuredAt: string;
  weightKg: number;
}

/** One weight per local day: the earliest reading (spec 5.6). Sorted by date. */
export function firstWeightPerDay(readings: WeightReading[]): DailyWeight[] {
  const first = new Map<string, WeightReading>();
  for (const r of readings) {
    const seen = first.get(r.localDate);
    if (!seen || Date.parse(r.measuredAt) < Date.parse(seen.measuredAt)) first.set(r.localDate, r);
  }
  return [...first.values()]
    .sort((a, b) => parseLocalDate(a.localDate) - parseLocalDate(b.localDate))
    .map((r) => ({ date: r.localDate, weightKg: r.weightKg }));
}

/**
 * Exponentially weighted moving average, alpha 0.1. After a gap of g days the
 * step uses alpha_eff = 1 - (1 - alpha)^g, which equals g ordinary steps held
 * at the new weight. Input must be strictly ascending by date.
 */
export function ewmaTrend(weights: DailyWeight[], alpha = TREND_ALPHA): TrendPoint[] {
  const out: TrendPoint[] = [];
  let prevDay: number | null = null;
  let trend = 0;
  for (const w of weights) {
    const day = parseLocalDate(w.date);
    if (prevDay === null) {
      trend = w.weightKg;
    } else {
      const gap = day - prevDay;
      if (gap <= 0) throw new EngineInputError('weights', 'dates must be strictly ascending');
      trend += (1 - (1 - alpha) ** gap) * (w.weightKg - trend);
    }
    out.push({ ...w, trendKg: trend });
    prevDay = day;
  }
  return out;
}

/** Trend on any date: the last trend value on or before it, or null if none yet. */
export function trendOn(points: TrendPoint[], date: string): number | null {
  const day = parseLocalDate(date);
  let value: number | null = null;
  for (const p of points) {
    if (parseLocalDate(p.date) > day) break;
    value = p.trendKg;
  }
  return value;
}

/** (T_today - T_7_days_ago) / T_7_days_ago x 100, or null without data. */
export function weeklyChangePct(points: TrendPoint[], date: string): number | null {
  const now = trendOn(points, date);
  const before = trendOn(points, addDays(date, -7));
  if (now === null || before === null) return null;
  return ((now - before) / before) * 100;
}

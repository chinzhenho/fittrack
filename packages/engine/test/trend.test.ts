import { describe, expect, it } from 'vitest';
import {
  addDays,
  EngineInputError,
  evaluateAdaptive,
  ewmaTrend,
  firstWeightPerDay,
  trendOn,
  weeklyChangePct,
  type AdaptiveDay,
  type DailyWeight,
} from '../src/index.js';

describe('firstWeightPerDay', () => {
  it('keeps the earliest reading of each local day, sorted by date', () => {
    const out = firstWeightPerDay([
      { localDate: '2026-10-02', measuredAt: '2026-10-02T00:30:00Z', weightKg: 70.4 },
      { localDate: '2026-10-01', measuredAt: '2026-10-01T12:00:00Z', weightKg: 71 },
      { localDate: '2026-10-01', measuredAt: '2026-09-30T23:10:00Z', weightKg: 70 },
    ]);
    expect(out).toEqual([
      { date: '2026-10-01', weightKg: 70 },
      { date: '2026-10-02', weightKg: 70.4 },
    ]);
  });
});

describe('ewmaTrend', () => {
  it('starts at the first weight and moves 10% toward each new one', () => {
    const t = ewmaTrend([
      { date: '2026-10-01', weightKg: 70 },
      { date: '2026-10-02', weightKg: 71 },
    ]);
    expect(t[0]?.trendKg).toBe(70);
    expect(t[1]?.trendKg).toBeCloseTo(70.1, 10);
  });

  it('uses an effective alpha across missed days', () => {
    const t = ewmaTrend([
      { date: '2026-10-01', weightKg: 70 },
      { date: '2026-10-04', weightKg: 73 },
    ]);
    // alpha_eff = 1 - 0.9^3 = 0.271
    expect(t[1]?.trendKg).toBeCloseTo(70.813, 10);
  });

  it('rejects duplicate dates and unsorted input', () => {
    expect(() =>
      ewmaTrend([
        { date: '2026-10-01', weightKg: 70 },
        { date: '2026-10-01', weightKg: 71 },
      ]),
    ).toThrowError(EngineInputError);
    expect(() =>
      ewmaTrend([
        { date: '2026-10-02', weightKg: 70 },
        { date: '2026-10-01', weightKg: 71 },
      ]),
    ).toThrowError(EngineInputError);
  });

  it('reads the trend on any date by carrying the last value forward', () => {
    const t = ewmaTrend([
      { date: '2026-10-01', weightKg: 70 },
      { date: '2026-10-08', weightKg: 69 },
    ]);
    expect(trendOn(t, '2026-09-30')).toBeNull();
    expect(trendOn(t, '2026-10-05')).toBe(70);
    expect(weeklyChangePct(t, '2026-10-08')).toBeCloseTo(((t[1]!.trendKg - 70) / 70) * 100, 10);
    expect(weeklyChangePct(t, '2026-10-05')).toBeNull();
  });
});

function series(start: string, n: number, f: (i: number) => number): DailyWeight[] {
  return Array.from({ length: n }, (_, i) => ({ date: addDays(start, i), weightKg: f(i) }));
}

function intake(start: string, n: number, kcal: number, complete = true): AdaptiveDay[] {
  return Array.from({ length: n }, (_, i) => ({
    date: addDays(start, i),
    intakeKcal: kcal,
    loggingComplete: complete,
  }));
}

describe('evaluateAdaptive', () => {
  const common = {
    windowEnd: '2026-10-31',
    goalStartDate: '2026-08-01',
    calorieFloorKcal: 1500,
  };

  it('blends observed and current TDEE and proposes a new target', () => {
    const r = evaluateAdaptive({
      ...common,
      days: intake('2026-10-01', 31, 2000),
      weights: series('2026-10-01', 31, () => 70),
      currentTdeeKcal: 2200,
      currentTargetKcal: 1900,
    });
    expect(r).toMatchObject({
      ok: true,
      windowStart: '2026-10-11',
      windowDays: 21,
      meanIntakeKcal: 2000,
      trendChangeKg: 0,
      observedTdeeKcal: 2000,
      newTdeeKcal: 2100,
      changeKcal: -100,
      proposedTargetKcal: 1800,
    });
  });

  it('limits each change to 150 kcal and respects the floor', () => {
    const r = evaluateAdaptive({
      ...common,
      days: intake('2026-10-01', 31, 2000),
      weights: series('2026-10-01', 31, () => 70),
      currentTdeeKcal: 2600,
      currentTargetKcal: 1600,
    });
    expect(r).toMatchObject({ ok: true, changeKcal: -150, proposedTargetKcal: 1500 });
  });

  it('accounts for trend weight change', () => {
    // Weight steps from 70 to 69 well before the window; the trend keeps falling inside it.
    const weights = [...series('2026-09-01', 40, () => 70), ...series('2026-10-11', 21, () => 69)];
    const r = evaluateAdaptive({
      ...common,
      days: intake('2026-10-01', 31, 2000),
      weights,
      currentTdeeKcal: 2200,
      currentTargetKcal: 1900,
    });
    if (!r.ok) throw new Error(r.reasons.join());
    expect(r.trendChangeKg).toBeLessThan(0);
    expect(r.observedTdeeKcal).toBeCloseTo(2000 - (r.trendChangeKg * 7700) / 20, 10);
  });

  it('refuses during the first 14 days of a goal', () => {
    const r = evaluateAdaptive({
      ...common,
      goalStartDate: '2026-10-20',
      days: intake('2026-10-01', 31, 2000),
      weights: series('2026-10-01', 31, () => 70),
      currentTdeeKcal: 2200,
      currentTargetKcal: 1900,
    });
    expect(r).toEqual({ ok: false, reasons: ['window_too_short'] });
  });

  it('uses a 14-day window when the goal is newer', () => {
    const r = evaluateAdaptive({
      ...common,
      goalStartDate: '2026-10-04',
      days: intake('2026-10-01', 31, 2000),
      weights: series('2026-10-01', 31, () => 70),
      currentTdeeKcal: 2200,
      currentTargetKcal: 1900,
    });
    expect(r).toMatchObject({ ok: true, windowStart: '2026-10-18', windowDays: 14 });
  });

  it('lists every missing data reason', () => {
    const r = evaluateAdaptive({
      ...common,
      days: intake('2026-10-11', 21, 2000, false),
      weights: series('2026-10-25', 7, () => 70),
      currentTdeeKcal: 2200,
      currentTargetKcal: 1900,
    });
    expect(r).toEqual({
      ok: false,
      reasons: ['not_enough_complete_logs', 'not_enough_weigh_ins', 'no_trend_at_window_start'],
    });
  });
});

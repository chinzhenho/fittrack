import { ADAPTIVE, KCAL_PER_KG, TARGET_ROUNDING_KCAL } from './constants.js';
import { addDays, daysBetween, parseLocalDate } from './dates.js';
import { ceilTo, clamp, roundHalfUp } from './rounding.js';
import { ewmaTrend, trendOn, type DailyWeight } from './trend.js';

export interface AdaptiveDay {
  date: string;
  intakeKcal: number | null;
  loggingComplete: boolean;
}

export interface AdaptiveInput {
  windowEnd: string;
  goalStartDate: string;
  days: AdaptiveDay[];
  /** One weight per day, ascending (see firstWeightPerDay). */
  weights: DailyWeight[];
  currentTdeeKcal: number;
  currentTargetKcal: number;
  calorieFloorKcal: number;
}

export type AdaptiveRefusal =
  | 'window_too_short'
  | 'not_enough_complete_logs'
  | 'not_enough_weigh_ins'
  | 'no_trend_at_window_start';

export type AdaptiveResult =
  | {
      ok: true;
      windowStart: string;
      windowEnd: string;
      windowDays: number;
      meanIntakeKcal: number;
      trendChangeKg: number;
      observedTdeeKcal: number;
      newTdeeKcal: number;
      /** Requested change to the target before the floor and rounding. */
      changeKcal: number;
      proposedTargetKcal: number;
    }
  | { ok: false; reasons: AdaptiveRefusal[] };

/**
 * Spec 5.7. Proposes, never applies: the user must accept the result.
 * TDEE_obs = mean intake - (trend change x 7700) / elapsed days.
 */
export function evaluateAdaptive(input: AdaptiveInput): AdaptiveResult {
  const { windowEnd } = input;
  const earliest = addDays(input.goalStartDate, ADAPTIVE.excludeDaysAfterGoalStart);
  const candidate = addDays(windowEnd, -(ADAPTIVE.windowDays - 1));
  const windowStart = parseLocalDate(earliest) > parseLocalDate(candidate) ? earliest : candidate;
  const windowDays = daysBetween(windowStart, windowEnd) + 1;
  if (windowDays < ADAPTIVE.minWindowDays) return { ok: false, reasons: ['window_too_short'] };

  const startDay = parseLocalDate(windowStart);
  const endDay = parseLocalDate(windowEnd);
  const inWindow = (date: string) => {
    const d = parseLocalDate(date);
    return d >= startDay && d <= endDay;
  };

  const reasons: AdaptiveRefusal[] = [];

  const complete = input.days.filter(
    (d) => inWindow(d.date) && d.loggingComplete && d.intakeKcal !== null,
  );
  if (complete.length < Math.ceil(ADAPTIVE.minCompleteLogFraction * windowDays)) {
    reasons.push('not_enough_complete_logs');
  }

  const weighIns = input.weights.filter((w) => inWindow(w.date)).length;
  const neededWeighIns = Math.round(
    (windowDays * ADAPTIVE.weighInsPer21Days) / ADAPTIVE.windowDays,
  );
  if (weighIns < neededWeighIns) reasons.push('not_enough_weigh_ins');

  const points = ewmaTrend(input.weights.filter((w) => parseLocalDate(w.date) <= endDay));
  const tStart = trendOn(points, windowStart);
  const tEnd = trendOn(points, windowEnd);
  if (tStart === null || tEnd === null) reasons.push('no_trend_at_window_start');

  if (reasons.length > 0 || tStart === null || tEnd === null) return { ok: false, reasons };

  const meanIntakeKcal = complete.reduce((s, d) => s + (d.intakeKcal ?? 0), 0) / complete.length;
  const trendChangeKg = tEnd - tStart;
  const observedTdeeKcal = meanIntakeKcal - (trendChangeKg * KCAL_PER_KG) / (windowDays - 1);
  const newTdeeKcal =
    ADAPTIVE.blendObserved * observedTdeeKcal +
    (1 - ADAPTIVE.blendObserved) * input.currentTdeeKcal;
  const changeKcal = clamp(
    newTdeeKcal - input.currentTdeeKcal,
    -ADAPTIVE.maxChangeKcal,
    ADAPTIVE.maxChangeKcal,
  );

  let proposedTargetKcal = roundHalfUp(input.currentTargetKcal + changeKcal, TARGET_ROUNDING_KCAL);
  if (proposedTargetKcal < input.calorieFloorKcal) {
    proposedTargetKcal = ceilTo(input.calorieFloorKcal, TARGET_ROUNDING_KCAL);
  }

  return {
    ok: true,
    windowStart,
    windowEnd,
    windowDays,
    meanIntakeKcal,
    trendChangeKg,
    observedTdeeKcal,
    newTdeeKcal,
    changeKcal,
    proposedTargetKcal,
  };
}

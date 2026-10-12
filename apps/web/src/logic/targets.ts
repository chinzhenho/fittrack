import {
  computeMacros,
  computePlan,
  evaluateAdaptive,
  ewmaTrend,
  firstWeightPerDay,
  trendOn,
  type AdaptiveResult,
  type PlanResult,
} from '@fittrack/engine';
import type { AppState, Profile, TargetVersion, WeightEntry } from '../data/types';
import { sumNutrients } from './nutrition';

export function latestWeight(weights: WeightEntry[]): WeightEntry | null {
  if (weights.length === 0) return null;
  return [...weights].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0] ?? null;
}

export function planFor(profile: Profile, weightKg: number, onDate: string): PlanResult {
  return computePlan({
    formulaSex: profile.formulaSex,
    birthDate: profile.birthDate,
    onDate,
    heightCm: profile.heightCm,
    weightKg,
    activityLevel: profile.activityLevel,
    goal: profile.goal,
    ratePctPerWeek: profile.ratePctPerWeek,
    ...(profile.targetWeightKg !== undefined && { targetWeightKg: profile.targetWeightKg }),
    screening: {
      pregnantOrLactating: profile.screening.pregnantOrLactating,
      eatingDisorderHistory: profile.screening.eatingDisorderHistory,
      kidneyDisease: profile.screening.kidneyDisease,
    },
  });
}

export function targetFromPlan(
  plan: Extract<PlanResult, { ok: true }>['plan'],
  meta: Pick<TargetVersion, 'id' | 'effectiveFrom' | 'createdAt' | 'reason'>,
  weightKg: number,
): TargetVersion {
  return {
    ...meta,
    formulaVersion: plan.formulaVersion,
    weightKg,
    bmrKcal: plan.bmrKcal,
    tdeeKcal: plan.tdeeKcal,
    calorieFloorKcal: plan.calorieFloorKcal,
    caloriesKcal: plan.caloriesKcal,
    proteinG: plan.macros.proteinG,
    carbsG: plan.macros.carbsG,
    fatG: plan.macros.fatG,
    clamps: plan.clamps,
  };
}

/** The target in force on a date: the newest version with effectiveFrom <= date. */
export function targetOn(targets: TargetVersion[], date: string): TargetVersion | null {
  const sorted = [...targets].sort(
    (a, b) =>
      a.effectiveFrom.localeCompare(b.effectiveFrom) || a.createdAt.localeCompare(b.createdAt),
  );
  let found: TargetVersion | null = null;
  for (const t of sorted) if (t.effectiveFrom <= date) found = t;
  return found ?? sorted[0] ?? null;
}

export function trendPoints(weights: WeightEntry[]) {
  return ewmaTrend(
    firstWeightPerDay(
      weights.map((w) => ({ localDate: w.date, measuredAt: w.measuredAt, weightKg: w.weightKg })),
    ),
  );
}

/** Spec 11.2: suggest recomputing when the trend has moved 2 kg or more from the target's weight. */
export function needsRecompute(state: AppState, today: string): boolean {
  const target = targetOn(state.targets, today);
  if (!target) return false;
  const trend = trendOn(trendPoints(state.weights), today);
  return trend !== null && Math.abs(trend - target.weightKg) >= 2;
}

export function adaptiveFor(state: AppState, today: string): AdaptiveResult | null {
  const profile = state.profile;
  const target = targetOn(state.targets, today);
  if (!profile || !target) return null;
  const dates = [...new Set(state.meals.map((m) => m.date))];
  const days = dates.map((date) => ({
    date,
    intakeKcal: sumNutrients(state.meals.filter((m) => m.date === date)).kcal,
    loggingComplete: state.completeDays.includes(date),
  }));
  return evaluateAdaptive({
    windowEnd: today,
    goalStartDate: profile.goalStartDate,
    days,
    weights: trendPoints(state.weights).map(({ date, weightKg }) => ({ date, weightKg })),
    currentTdeeKcal: target.tdeeKcal,
    currentTargetKcal: target.caloriesKcal,
    calorieFloorKcal: target.calorieFloorKcal,
  });
}

/** Macros for an adaptive target: same rules as the plan (spec 5.4). */
export function macrosForAdaptive(profile: Profile, caloriesKcal: number, weightKg: number) {
  return computeMacros({
    caloriesKcal,
    goal: profile.goal,
    weightKg,
    heightCm: profile.heightCm,
    kidneyDisease: profile.screening.kidneyDisease,
  });
}

/**
 * The very first weight the user entered (at onboarding, stored with the initial
 * target). It never moves, even if a weigh-in from that day is corrected later or
 * the goal changes. Falls back to the earliest weigh-in.
 */
export function startWeightKg(state: AppState): number | null {
  const initial = [...state.targets]
    .filter((t) => t.reason === 'initial')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (initial) return initial.weightKg;
  const w = [...state.weights].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))[0];
  return w ? w.weightKg : null;
}

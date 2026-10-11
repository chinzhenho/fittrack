import {
  computePlan,
  EngineInputError,
  RATE_PCT_PER_WEEK,
  type ActivityLevel,
  type FormulaSex,
  type Goal,
  type Plan,
  type PlanInput,
  type RejectReason,
} from '@fittrack/engine';

export interface CalculatorForm {
  formulaSex: FormulaSex;
  birthDate: string;
  heightCm: string;
  weightKg: string;
  activityLevel: ActivityLevel;
  goal: Goal;
  ratePctPerWeek: string;
  pregnantOrLactating: boolean;
  eatingDisorderHistory: boolean;
  kidneyDisease: boolean;
}

export const initialForm: CalculatorForm = {
  formulaSex: 'female',
  birthDate: '',
  heightCm: '',
  weightKg: '',
  activityLevel: 'sedentary',
  goal: 'maintain',
  ratePctPerWeek: '0',
  pregnantOrLactating: false,
  eatingDisorderHistory: false,
  kidneyDisease: false,
};

/** Selectable weekly rates per goal (percent of body weight), within spec 5.3 ranges. */
export const RATE_OPTIONS: Record<Goal, number[]> = {
  fat_loss: [0.25, 0.5, 0.75, 1],
  maintain: [0],
  muscle_gain: [0.1, 0.25, 0.5],
  weight_gain: [0.25, 0.5],
};

export function defaultRate(goal: Goal): string {
  return String(RATE_PCT_PER_WEEK[goal].default);
}

export type Outcome =
  | { kind: 'incomplete' }
  | { kind: 'invalid'; field: string }
  | { kind: 'rejected'; reason: RejectReason }
  | { kind: 'plan'; plan: Plan };

/** Turns the raw form into an engine result. Pure, so it is unit-tested. */
export function evaluate(form: CalculatorForm, onDate: string): Outcome {
  if (!form.birthDate || form.heightCm.trim() === '' || form.weightKg.trim() === '') {
    return { kind: 'incomplete' };
  }
  const input: PlanInput = {
    formulaSex: form.formulaSex,
    birthDate: form.birthDate,
    onDate,
    heightCm: Number(form.heightCm),
    weightKg: Number(form.weightKg),
    activityLevel: form.activityLevel,
    goal: form.goal,
    ratePctPerWeek: Number(form.ratePctPerWeek),
    screening: {
      pregnantOrLactating: form.pregnantOrLactating,
      eatingDisorderHistory: form.eatingDisorderHistory,
      kidneyDisease: form.kidneyDisease,
    },
  };
  try {
    const result = computePlan(input);
    return result.ok
      ? { kind: 'plan', plan: result.plan }
      : { kind: 'rejected', reason: result.reason };
  } catch (e) {
    if (e instanceof EngineInputError) return { kind: 'invalid', field: e.field };
    throw e;
  }
}

/** Today's date in the browser's time zone as YYYY-MM-DD. */
export function localToday(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

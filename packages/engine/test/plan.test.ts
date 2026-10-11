import { describe, expect, it } from 'vitest';
import { computePlan, EngineInputError, type PlanInput } from '../src/index.js';

// Spec section 5.10 known cases. Every number here is worked out by hand in the spec.
const ON = '2026-10-11';

function plan(input: PlanInput) {
  const result = computePlan(input);
  if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
  return result.plan;
}

describe('spec 5.10 case A: male, 30 y, 175 cm, 75 kg, light, fat loss 0.5%/week', () => {
  const p = plan({
    formulaSex: 'male',
    birthDate: '1996-01-01',
    onDate: ON,
    heightCm: 175,
    weightKg: 75,
    activityLevel: 'light',
    goal: 'fat_loss',
    ratePctPerWeek: 0.5,
  });

  it('computes BMR, TDEE and the deficit exactly', () => {
    expect(p.age).toBe(30);
    expect(p.bmrKcal).toBeCloseTo(1698.75, 10);
    expect(p.tdeeKcal).toBeCloseTo(2335.78125, 10);
    expect(p.requestedDeltaKcal).toBeCloseTo(-412.5, 10);
    expect(p.appliedDeltaKcal).toBeCloseTo(-412.5, 10);
  });

  it('rounds the target to 1920 kcal with no clamps', () => {
    expect(p.caloriesKcal).toBe(1920);
    expect(p.clamps).toEqual([]);
  });

  it('splits macros 120 g protein, 53 g fat, 241 g carbs', () => {
    expect(p.macros).toMatchObject({ proteinG: 120, fatG: 53, carbsG: 241, referenceWeightKg: 75 });
  });

  it('records the formula version', () => {
    expect(p.formulaVersion).toBe('1.0.0');
  });
});

describe('spec 5.10 case B: female, 28 y, 160 cm, 55 kg, sedentary, maintain', () => {
  const p = plan({
    formulaSex: 'female',
    birthDate: '1998-01-01',
    onDate: ON,
    heightCm: 160,
    weightKg: 55,
    activityLevel: 'sedentary',
    goal: 'maintain',
  });

  it('computes BMR 1249 and TDEE 1498.8', () => {
    expect(p.age).toBe(28);
    expect(p.bmrKcal).toBeCloseTo(1249, 10);
    expect(p.tdeeKcal).toBeCloseTo(1498.8, 10);
  });

  it('targets 1500 kcal: 66 g protein, 42 g fat, 215 g carbs', () => {
    expect(p.caloriesKcal).toBe(1500);
    expect(p.appliedDeltaKcal).toBe(0);
    expect(p.macros).toMatchObject({ proteinG: 66, fatG: 42, carbsG: 215 });
  });
});

describe('spec 5.10 case C: female, 40 y, 155 cm, 50 kg, sedentary, fat loss 1%/week', () => {
  const p = plan({
    formulaSex: 'female',
    birthDate: '1986-01-01',
    onDate: ON,
    heightCm: 155,
    weightKg: 50,
    activityLevel: 'sedentary',
    goal: 'fat_loss',
    ratePctPerWeek: 1,
  });

  it('computes BMR 1107.75 and TDEE 1329.3', () => {
    expect(p.bmrKcal).toBeCloseTo(1107.75, 10);
    expect(p.tdeeKcal).toBeCloseTo(1329.3, 10);
  });

  it('caps the 550 kcal deficit at 25% of TDEE, then lifts to the 1200 floor', () => {
    expect(p.requestedDeltaKcal).toBeCloseTo(-550, 10);
    expect(p.appliedDeltaKcal).toBeCloseTo(-129.3, 10);
    expect(p.calorieFloorKcal).toBe(1200);
    expect(p.caloriesKcal).toBe(1200);
    expect(p.clamps).toEqual(['deficit_cap', 'calorie_floor']);
  });
});

describe('spec 5.10 case D: BMI 17.9 choosing fat loss', () => {
  it('is rejected', () => {
    // 51.5 kg / 1.696^2 = 17.9
    const result = computePlan({
      formulaSex: 'female',
      birthDate: '2000-05-05',
      onDate: ON,
      heightCm: 169.6,
      weightKg: 51.5,
      activityLevel: 'light',
      goal: 'fat_loss',
      ratePctPerWeek: 0.5,
    });
    expect(result).toMatchObject({ ok: false, reason: 'underweight_fat_loss' });
  });
});

const base: PlanInput = {
  formulaSex: 'male',
  birthDate: '1996-01-01',
  onDate: ON,
  heightCm: 175,
  weightKg: 75,
  activityLevel: 'light',
  goal: 'maintain',
};

describe('goals and safety rules', () => {
  it('caps a weight-gain surplus at 500 kcal', () => {
    // 0.5% of 120 kg = 0.6 kg/week -> 660 kcal/day requested
    const p = plan({
      ...base,
      weightKg: 120,
      heightCm: 200,
      goal: 'weight_gain',
      ratePctPerWeek: 0.5,
    });
    expect(p.requestedDeltaKcal).toBeCloseTo(660, 10);
    expect(p.appliedDeltaKcal).toBe(500);
    expect(p.clamps).toContain('surplus_cap');
  });

  it('adds a modest surplus for muscle gain at the default rate', () => {
    const p = plan({ ...base, goal: 'muscle_gain' });
    expect(p.ratePctPerWeek).toBe(0.25);
    expect(p.appliedDeltaKcal).toBeCloseTo(206.25, 10);
    expect(p.caloriesKcal).toBe(2540); // 2335.78 + 206.25 = 2542.03
  });

  it('uses maintenance when the calorie floor is above TDEE', () => {
    // neutral, 60 y, 150 cm, 45 kg: BMR 1009.5, TDEE 1211.4, floor 1500 > TDEE
    const p = plan({
      ...base,
      formulaSex: 'neutral',
      birthDate: '1966-01-01',
      heightCm: 150,
      weightKg: 45,
      activityLevel: 'sedentary',
      goal: 'fat_loss',
      ratePctPerWeek: 0.5,
    });
    expect(p.bmrKcal).toBeCloseTo(1009.5, 10);
    expect(p.caloriesKcal).toBe(1210);
    expect(p.clamps).toContain('floor_above_tdee');
    expect(p.warnings).toContain('neutral_formula');
  });

  it('never rounds the target below the calorie floor', () => {
    // male, 30 y, 190 cm, 90 kg, sedentary: BMR 1942.5, capped target 1748.25 -> floor 1942.5
    const p = plan({
      ...base,
      heightCm: 190,
      weightKg: 90,
      activityLevel: 'sedentary',
      goal: 'fat_loss',
      ratePctPerWeek: 1,
    });
    expect(p.calorieFloorKcal).toBeCloseTo(1942.5, 10);
    expect(p.caloriesKcal).toBe(1950);
  });

  it('rejects a target weight below BMI 18.5', () => {
    const result = computePlan({
      ...base,
      goal: 'fat_loss',
      ratePctPerWeek: 0.5,
      targetWeightKg: 55,
    });
    expect(result).toMatchObject({ ok: false, reason: 'target_weight_underweight' });
  });

  it('rejects a deficit during pregnancy or lactation', () => {
    const result = computePlan({
      ...base,
      goal: 'fat_loss',
      ratePctPerWeek: 0.5,
      screening: { pregnantOrLactating: true },
    });
    expect(result).toMatchObject({ ok: false, reason: 'pregnancy_deficit' });
  });

  it('rejects a deficit with an eating disorder history', () => {
    const result = computePlan({
      ...base,
      goal: 'fat_loss',
      ratePctPerWeek: 0.5,
      screening: { eatingDisorderHistory: true },
    });
    expect(result).toMatchObject({ ok: false, reason: 'eating_disorder_deficit' });
  });

  it('allows maintenance during pregnancy', () => {
    const result = computePlan({ ...base, screening: { pregnantOrLactating: true } });
    expect(result.ok).toBe(true);
  });
});

describe('input validation', () => {
  it.each([
    ['heightCm', { heightCm: 119 }],
    ['heightCm', { heightCm: 231 }],
    ['weightKg', { weightKg: 29.9 }],
    ['weightKg', { weightKg: 300.1 }],
    ['weightKg', { weightKg: Number.NaN }],
    ['birthDate', { birthDate: '2010-01-01' }],
    ['birthDate', { birthDate: '1900-01-01' }],
    ['birthDate', { birthDate: '1990-02-30' }],
    ['ratePctPerWeek', { goal: 'fat_loss', ratePctPerWeek: 1.5 }],
    ['ratePctPerWeek', { goal: 'fat_loss', ratePctPerWeek: 0.1 }],
    ['ratePctPerWeek', { goal: 'muscle_gain', ratePctPerWeek: 0.6 }],
    ['targetWeightKg', { goal: 'fat_loss', ratePctPerWeek: 0.5, targetWeightKg: 80 }],
    ['targetWeightKg', { goal: 'weight_gain', ratePctPerWeek: 0.25, targetWeightKg: 70 }],
    ['proteinGPerKg', { proteinGPerKg: 3 }],
    ['fatFraction', { fatFraction: 0.5 }],
  ] as const)('rejects bad %s', (field, patch) => {
    expect(() => computePlan({ ...base, ...patch } as PlanInput)).toThrowError(EngineInputError);
    try {
      computePlan({ ...base, ...patch } as PlanInput);
    } catch (e) {
      expect((e as EngineInputError).field).toBe(field);
    }
  });

  it('ignores a rate for maintenance', () => {
    const p = plan({ ...base, ratePctPerWeek: 0.5 });
    expect(p.ratePctPerWeek).toBe(0);
  });
});

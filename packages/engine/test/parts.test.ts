import { describe, expect, it } from 'vitest';
import {
  ageOn,
  bmi,
  bmiCategory,
  computeMacros,
  daysBetween,
  addDays,
  EngineInputError,
  katchMcArdle,
  mifflinStJeor,
  netExerciseKcal,
  roundHalfUp,
  tdee,
  waistHighRisk,
} from '../src/index.js';

describe('roundHalfUp', () => {
  it('rounds halves up', () => {
    expect(roundHalfUp(214.5)).toBe(215);
    expect(roundHalfUp(240.75)).toBe(241);
    expect(roundHalfUp(1923.28, 10)).toBe(1920);
    expect(roundHalfUp(1495, 10)).toBe(1500);
  });
});

describe('dates and age', () => {
  it('counts whole years, handling birthdays and leap days', () => {
    expect(ageOn('1996-10-11', '2026-10-11')).toBe(30);
    expect(ageOn('1996-10-12', '2026-10-11')).toBe(29);
    expect(ageOn('2000-02-29', '2026-02-28')).toBe(25);
    expect(ageOn('2000-02-29', '2026-03-01')).toBe(26);
  });

  it('measures days between local dates', () => {
    expect(daysBetween('2026-02-27', '2026-03-01')).toBe(2);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('rejects malformed dates', () => {
    expect(() => daysBetween('2026-13-01', '2026-01-01')).toThrowError(EngineInputError);
    expect(() => daysBetween('26-1-1', '2026-01-01')).toThrowError(EngineInputError);
  });
});

describe('BMR and TDEE', () => {
  it('applies the Mifflin-St Jeor constants', () => {
    const body = { weightKg: 70, heightCm: 170, age: 30 };
    const core = 700 + 1062.5 - 150;
    expect(mifflinStJeor({ ...body, formulaSex: 'male' })).toBeCloseTo(core + 5, 10);
    expect(mifflinStJeor({ ...body, formulaSex: 'female' })).toBeCloseTo(core - 161, 10);
    expect(mifflinStJeor({ ...body, formulaSex: 'neutral' })).toBeCloseTo(core - 78, 10);
  });

  it('applies Katch-McArdle', () => {
    expect(katchMcArdle(60)).toBeCloseTo(1666, 10);
    expect(() => katchMcArdle(0)).toThrowError(EngineInputError);
  });

  it('multiplies by the activity factor', () => {
    expect(tdee(1000, 'sedentary')).toBeCloseTo(1200, 10);
    expect(tdee(1000, 'light')).toBeCloseTo(1375, 10);
    expect(tdee(1000, 'moderate')).toBeCloseTo(1550, 10);
    expect(tdee(1000, 'very')).toBeCloseTo(1725, 10);
    expect(tdee(1000, 'extra')).toBeCloseTo(1900, 10);
  });
});

describe('BMI and waist (Asian cut-offs)', () => {
  it('computes BMI and categories', () => {
    expect(bmi(75, 175)).toBeCloseTo(24.4898, 4);
    expect(bmiCategory(18.4)).toBe('underweight');
    expect(bmiCategory(18.5)).toBe('normal');
    expect(bmiCategory(22.9)).toBe('normal');
    expect(bmiCategory(23)).toBe('overweight');
    expect(bmiCategory(27.4)).toBe('overweight');
    expect(bmiCategory(27.5)).toBe('obese');
  });

  it('flags high-risk waist', () => {
    expect(waistHighRisk(90, 'male')).toBe(true);
    expect(waistHighRisk(89.9, 'male')).toBe(false);
    expect(waistHighRisk(80, 'female')).toBe(true);
    expect(waistHighRisk(85, 'neutral')).toBeNull();
  });
});

describe('macros', () => {
  it('uses the BMI-25 reference weight when BMI is 27.5 or more', () => {
    // 100 kg, 170 cm -> BMI 34.6 -> W_ref = 25 * 1.7^2 = 72.25
    const m = computeMacros({ caloriesKcal: 2000, goal: 'fat_loss', weightKg: 100, heightCm: 170 });
    expect(m.referenceWeightKg).toBeCloseTo(72.25, 10);
    expect(m.proteinG).toBe(116); // 1.6 * 72.25 = 115.6
  });

  it('caps protein at 35% of calories', () => {
    const m = computeMacros({
      caloriesKcal: 1950,
      goal: 'fat_loss',
      weightKg: 90,
      heightCm: 190,
      proteinGPerKg: 2.2,
    });
    expect(m.proteinG).toBe(171); // 0.35 * 1950 / 4 = 170.625
    expect(m.fatG).toBe(54);
    expect(m.carbsG).toBe(195);
    expect(m.clamps).toEqual(['protein_cap']);
  });

  it('lowers fat toward 20% to keep carbs at 130 g', () => {
    const m = computeMacros({
      caloriesKcal: 1200,
      goal: 'fat_loss',
      weightKg: 60,
      heightCm: 160,
      proteinGPerKg: 2.2,
    });
    expect(m.proteinG).toBe(105);
    expect(m.fatG).toBe(28);
    expect(m.carbsG).toBe(132);
    expect(m.clamps).toEqual(['protein_cap', 'fat_reduced_for_carbs']);
    expect(m.warnings).toEqual([]);
  });

  it('warns when carbs stay under 130 g even at 20% fat', () => {
    const m = computeMacros({
      caloriesKcal: 1200,
      goal: 'fat_loss',
      weightKg: 60,
      heightCm: 160,
      proteinGPerKg: 2.2,
      fatFraction: 0.35,
    });
    expect(m.fatG).toBe(28);
    expect(m.warnings).toEqual([]);
    const low = computeMacros({
      caloriesKcal: 900,
      goal: 'maintain',
      weightKg: 60,
      heightCm: 160,
      proteinGPerKg: 2,
    });
    expect(low.fatG).toBe(20);
    expect(low.warnings).toContain('low_carbs');
  });

  it('fixes protein at 0.8 g/kg with kidney disease', () => {
    const m = computeMacros({
      caloriesKcal: 2000,
      goal: 'muscle_gain',
      weightKg: 70,
      heightCm: 175,
      proteinGPerKg: 2,
      kidneyDisease: true,
    });
    expect(m.proteinGPerKg).toBe(0.8);
    expect(m.proteinG).toBe(56);
  });

  it('keeps macro calories within 10 kcal of the target', () => {
    for (let kcal = 1200; kcal <= 4000; kcal += 10) {
      const m = computeMacros({
        caloriesKcal: kcal,
        goal: 'maintain',
        weightKg: 70,
        heightCm: 175,
      });
      const total = 4 * m.proteinG + 9 * m.fatG + 4 * m.carbsG;
      expect(Math.abs(total - kcal)).toBeLessThanOrEqual(10);
      expect(m.carbsG).toBeGreaterThan(0);
    }
  });
});

describe('net exercise calories', () => {
  it('subtracts resting MET', () => {
    // (4 - 1) * 3.5 * 70 / 200 * 30 = 110.25
    expect(netExerciseKcal(4, 70, 30)).toBeCloseTo(110.25, 10);
    expect(netExerciseKcal(0.9, 70, 30)).toBe(0);
    expect(() => netExerciseKcal(4, 70, -1)).toThrowError(EngineInputError);
  });
});

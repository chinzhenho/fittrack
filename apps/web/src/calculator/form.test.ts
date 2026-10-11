import { describe, expect, it } from 'vitest';
import { evaluate, initialForm, localToday, type CalculatorForm } from './form';

const caseA: CalculatorForm = {
  ...initialForm,
  formulaSex: 'male',
  birthDate: '1996-01-01',
  heightCm: '175',
  weightKg: '75',
  activityLevel: 'light',
  goal: 'fat_loss',
  ratePctPerWeek: '0.5',
};

describe('evaluate', () => {
  it('waits until birth date, height and weight are filled', () => {
    expect(evaluate(initialForm, '2026-10-11')).toEqual({ kind: 'incomplete' });
    expect(evaluate({ ...caseA, weightKg: ' ' }, '2026-10-11')).toEqual({ kind: 'incomplete' });
  });

  it('matches spec case A end to end', () => {
    const out = evaluate(caseA, '2026-10-11');
    expect(out.kind).toBe('plan');
    if (out.kind === 'plan') {
      expect(out.plan.caloriesKcal).toBe(1920);
      expect(out.plan.macros).toMatchObject({ proteinG: 120, fatG: 53, carbsG: 241 });
    }
  });

  it('reports the invalid field', () => {
    expect(evaluate({ ...caseA, heightCm: '300' }, '2026-10-11')).toEqual({
      kind: 'invalid',
      field: 'heightCm',
    });
    expect(evaluate({ ...caseA, birthDate: '2015-01-01' }, '2026-10-11')).toEqual({
      kind: 'invalid',
      field: 'birthDate',
    });
  });

  it('passes screening answers to the safety rules', () => {
    expect(evaluate({ ...caseA, pregnantOrLactating: true }, '2026-10-11')).toEqual({
      kind: 'rejected',
      reason: 'pregnancy_deficit',
    });
  });
});

describe('localToday', () => {
  it('formats the local date', () => {
    expect(localToday(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

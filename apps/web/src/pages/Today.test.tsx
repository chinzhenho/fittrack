import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { getState, replaceState } from '../data/store';
import { emptyState, type Profile, type TargetVersion } from '../data/types';
import { localToday } from '../lib/dates';
import { Today } from './Today';

const profile: Profile = {
  formulaSex: 'male',
  birthDate: '1996-01-01',
  heightCm: 175,
  activityLevel: 'light',
  goal: 'fat_loss',
  ratePctPerWeek: 0.5,
  targetWeightKg: 68,
  goalStartDate: '2026-10-01',
  lifestyleMode: 'nutrition_first',
  minutesPerDay: 0,
  experience: 'beginner',
  dietTags: [],
  screening: {
    pregnantOrLactating: false,
    eatingDisorderHistory: false,
    kidneyDisease: false,
    exerciseCaution: false,
  },
  hideNumbers: false,
  consentedAt: '2026-10-01T00:00:00Z',
};

const target: TargetVersion = {
  id: 't',
  effectiveFrom: '2026-01-01',
  createdAt: '1',
  reason: 'initial',
  formulaVersion: '1.0.0',
  weightKg: 75,
  bmrKcal: 1698.75,
  tdeeKcal: 2335.78,
  calorieFloorKcal: 1698.75,
  caloriesKcal: 1920,
  proteinG: 120,
  carbsG: 241,
  fatG: 53,
  clamps: [],
};

afterEach(cleanup);

describe('Today weight card', () => {
  it('shows weight, Asian-cut-off BMI and records today’s weight from the sheet', () => {
    replaceState({
      ...emptyState,
      profile,
      targets: [target],
      weights: [{ id: 'w', date: '2026-10-01', measuredAt: 'x', weightKg: 75 }],
    });
    render(
      <MemoryRouter>
        <Today />
      </MemoryRouter>,
    );
    // 75 kg at 175 cm: BMI 24.5, which is 超重 under the Asian cut-off (23).
    expect(screen.getByText('BMI 24.5 超重')).toBeTruthy();
    expect(screen.getByText('距目标还差 7 kg')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '＋ 记体重' }));
    fireEvent.click(screen.getByRole('button', { name: '−0.5' }));
    fireEvent.click(screen.getByRole('button', { name: '−0.5' }));
    fireEvent.click(screen.getByRole('button', { name: '保存体重' }));
    const todayEntry = getState().weights.find((w) => w.date === localToday());
    expect(todayEntry?.weightKg).toBe(74);
  });
});

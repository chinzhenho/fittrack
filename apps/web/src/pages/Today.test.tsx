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
  dietTags: [],
  screening: {
    pregnantOrLactating: false,
    eatingDisorderHistory: false,
    kidneyDisease: false,
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
    // 75 kg at 175 cm: BMI 24.5, which is overweight under the Asian cut-off (23).
    expect(screen.getByText('BMI 24.5 Overweight')).toBeTruthy();
    expect(screen.getByText('7 kg to go')).toBeTruthy();

    // Inline weigh-in, pre-filled with the latest weight (75).
    expect((screen.getByLabelText("Today's weigh-in") as HTMLInputElement).value).toBe('75');
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Decrease by 0.1 kg' }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const todays = () => getState().weights.filter((w) => w.date === localToday());
    expect(todays().map((w) => w.weightKg)).toEqual([74.7]);
    expect(screen.getByText('✓ Weighed today')).toBeTruthy();

    // Editing today's weigh-in replaces it instead of adding a second one.
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: '−0.5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save weight' }));
    expect(todays().map((w) => w.weightKg)).toEqual([74.2]);
  });
});

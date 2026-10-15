import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { getState, replaceState } from '../data/store';
import { emptyState, type Profile } from '../data/types';
import { localToday } from '../lib/dates';
import { Progress } from './Progress';

const profile: Profile = {
  formulaSex: 'female',
  birthDate: '1995-05-05',
  heightCm: 160,
  activityLevel: 'light',
  goal: 'weight_gain',
  ratePctPerWeek: 0.25,
  targetWeightKg: 55,
  goalStartDate: '2026-09-01',
  lifestyleMode: 'home',
  minutesPerDay: 15,
  experience: 'beginner',
  dietTags: [],
  screening: {
    pregnantOrLactating: false,
    eatingDisorderHistory: false,
    kidneyDisease: false,
    exerciseCaution: false,
  },
  hideNumbers: false,
  consentedAt: '2026-09-01T00:00:00Z',
};

function renderProgress(p: Profile = profile, extra = {}) {
  replaceState({ ...emptyState, profile: p, ...extra });
  render(
    <MemoryRouter initialEntries={['/progress']}>
      <ToastProvider>
        <Progress />
      </ToastProvider>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('My progress', () => {
  it('scenario A: a new user sees empty states, not made-up numbers', () => {
    renderProgress();
    expect(screen.getByRole('heading', { name: 'Progress' })).toBeTruthy();
    expect(screen.getByText('No food logged in this period')).toBeTruthy();
    expect(screen.getByText('Log your first weight to start seeing changes.')).toBeTruthy();
    expect(screen.getByRole('button', { name: '+ Log weight' })).toBeTruthy();
    expect(screen.queryByText(/kcal/)).toBeNull();
  });

  it('scenario D: weight wording follows a gain goal', () => {
    const today = localToday();
    renderProgress(profile, {
      weights: [{ id: 'a', date: today, measuredAt: `${today}T07:00:00Z`, weightKg: 51.5 }],
      targets: [
        {
          id: 't',
          effectiveFrom: '2026-09-01',
          createdAt: '2026-09-01T00:00:00Z',
          reason: 'initial',
          formulaVersion: '1.0.0',
          weightKg: 50,
          bmrKcal: 1200,
          tdeeKcal: 1650,
          calorieFloorKcal: 1200,
          caloriesKcal: 1900,
          proteinG: 70,
          carbsG: 260,
          fatG: 55,
          clamps: [],
        },
      ],
    });
    expect(screen.getByText('Gained 1.5 kg')).toBeTruthy();
    expect(screen.getByText(/3.5 kg to go/)).toBeTruthy();
  });

  it('starts and changes a weekly challenge, saved in the synced state', () => {
    renderProgress();
    fireEvent.click(screen.getByRole('button', { name: 'Start challenge' }));
    expect(getState().challenges).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Try another' }));
    expect(getState().challenges[0]?.skipped).toBe(true);
    expect(screen.getByRole('button', { name: 'Start challenge' })).toBeTruthy();
  });

  it('scenario G: hidden numbers keep habits but drop weight and calories', () => {
    renderProgress({ ...profile, hideNumbers: true });
    expect(screen.getByRole('heading', { name: 'Healthy habits' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Body changes' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Weight log' })).toBeNull();
  });
});

import { addDays } from '@fittrack/engine';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { replaceState } from '../data/store';
import { emptyState, type Profile } from '../data/types';
import { localToday } from '../lib/dates';
import { Report } from './Report';

const profile: Profile = {
  formulaSex: 'male',
  birthDate: '1996-01-01',
  heightCm: 175,
  activityLevel: 'light',
  goal: 'fat_loss',
  ratePctPerWeek: 0.5,
  targetWeightKg: 70,
  goalStartDate: '2026-01-01',
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
  consentedAt: '2026-01-01T00:00:00Z',
  nickname: 'Alex',
};

afterEach(cleanup);

describe('report', () => {
  it('one page of charts and daily rows, optional food list, prints to save as PDF', () => {
    const today = localToday();
    const old = addDays(today, -60);
    const meal = (id: string, date: string, name: string, kcal: number) => ({
      id,
      date,
      meal: 'lunch' as const,
      foodId: 'x',
      name,
      grams: 300,
      nutrients: { kcal, proteinG: 20, carbsG: 60, fatG: 15 },
      sourceRef: 't',
      createdAt: `${date}T12:00:00Z`,
    });
    replaceState({
      ...emptyState,
      profile,
      meals: [meal('a', today, '鸡饭', 600), meal('b', old, 'Old soup', 200)],
      weights: [{ id: 'w', date: today, measuredAt: 'x', weightKg: 78.4 }],
    });
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    render(
      <MemoryRouter>
        <ToastProvider>
          <Report />
        </ToastProvider>
      </MemoryRouter>,
    );
    // One summary page: 30 day rows, charts, no food list until asked for.
    expect(screen.getAllByRole('row')).toHaveLength(31);
    expect(screen.getByRole('img', { name: 'Calories per day' })).toBeTruthy();
    expect(screen.getAllByText('78.4 kg').length).toBeGreaterThan(0);
    expect(screen.queryByText('鸡饭')).toBeNull();
    fireEvent.click(screen.getByLabelText(/Include each food I ate/));
    expect(screen.getByText('鸡饭')).toBeTruthy();
    // Last 30 days by default: not the meal from 60 days ago.
    expect(screen.queryByText('Old soup')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Everything' }));
    expect(screen.getByText('Old soup')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save as PDF' }));
    expect(print).toHaveBeenCalledTimes(1);
  });
});

import { describe, expect, it } from 'vitest';
import { logFood } from '../data/actions';
import { SEED_FOODS } from '../data/foods';
import { emptyState, type AppState } from '../data/types';
import { currentStreak, longestStreak, progressSummary } from './achievements';

describe('streaks', () => {
  it('counts consecutive days ending today, or yesterday before the first meal', () => {
    const dates = ['2026-10-08', '2026-10-10', '2026-10-11', '2026-10-12'];
    expect(currentStreak(dates, '2026-10-12')).toBe(3);
    expect(currentStreak(dates, '2026-10-13')).toBe(3); // today not logged yet
    expect(currentStreak(dates, '2026-10-14')).toBe(0); // missed yesterday
    expect(currentStreak([], '2026-10-12')).toBe(0);
  });

  it('finds the longest run, also across month ends', () => {
    expect(longestStreak(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-03'])).toBe(3);
    expect(longestStreak(['2026-10-05'])).toBe(1);
    expect(longestStreak([])).toBe(0);
  });
});

describe('progress summary', () => {
  const rice = SEED_FOODS[0]!;
  const profile = {
    formulaSex: 'male' as const,
    birthDate: '1996-01-01',
    heightCm: 175,
    activityLevel: 'light' as const,
    goal: 'fat_loss' as const,
    ratePctPerWeek: 0.5,
    targetWeightKg: 70,
    goalStartDate: '2026-10-01',
    lifestyleMode: 'home' as const,
    minutesPerDay: 15,
    experience: 'beginner' as const,
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

  it('summarises streaks from food records', () => {
    let s: AppState = { ...emptyState, profile };
    for (const d of ['2026-10-10', '2026-10-11', '2026-10-12']) {
      s = logFood(s, { id: d, date: d, meal: 'lunch', food: rice, grams: 100, now: d });
    }
    expect(progressSummary(s, '2026-10-12')).toEqual({ streak: 3, longest: 3, daysLogged: 3 });
  });
});

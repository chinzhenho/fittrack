import { describe, expect, it } from 'vitest';
import { addWeight, logFood } from '../data/actions';
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

  it('unlocks badges from records and measures weight change toward the goal', () => {
    let s: AppState = { ...emptyState, profile };
    for (const d of ['2026-10-10', '2026-10-11', '2026-10-12']) {
      s = logFood(s, { id: d, date: d, meal: 'lunch', food: rice, grams: 100, now: d });
    }
    s = addWeight(s, { id: 'a', date: '2026-10-10', measuredAt: '2026-10-10', weightKg: 80 });
    s = addWeight(s, { id: 'b', date: '2026-10-12', measuredAt: '2026-10-12', weightKg: 70 });
    const p = progressSummary(s, '2026-10-12');
    expect(p.streak).toBe(3);
    expect(p.daysLogged).toBe(3);
    const ids = p.badges.filter((b) => b.unlocked).map((b) => b.id);
    expect(ids).toEqual(['first', 'streak3', 'kg1']);
    // EWMA trend moves only part of the way from 80 toward 70, so 1 kg is earned, 5 kg is not.
    expect(p.towardGoalKg).toBeGreaterThan(1);
    expect(p.towardGoalKg).toBeLessThan(5);
    expect(p.badges.find((b) => b.id === 'goal')?.unlocked).toBe(false);
  });

  it('has no weight badges for maintenance', () => {
    const s: AppState = { ...emptyState, profile: { ...profile, goal: 'maintain' } };
    const p = progressSummary(s, '2026-10-12');
    expect(p.towardGoalKg).toBeNull();
    expect(p.badges.some((b) => b.id.startsWith('kg') || b.id === 'goal')).toBe(false);
  });
});

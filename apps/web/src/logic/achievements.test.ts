import { describe, expect, it } from 'vitest';
import { currentStreak } from './achievements';

describe('streaks', () => {
  it('counts consecutive days ending today, or yesterday before the first meal', () => {
    const dates = ['2026-10-08', '2026-10-10', '2026-10-11', '2026-10-12'];
    expect(currentStreak(dates, '2026-10-12')).toBe(3);
    expect(currentStreak(dates, '2026-10-13')).toBe(3); // today not logged yet
    expect(currentStreak(dates, '2026-10-14')).toBe(0); // missed yesterday
    expect(currentStreak([], '2026-10-12')).toBe(0);
  });
});

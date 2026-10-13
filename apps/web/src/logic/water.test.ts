import { describe, expect, it } from 'vitest';
import { addWater, removeWater } from '../data/actions';
import { mergeStates } from '../data/merge';
import { emptyState } from '../data/types';
import { waterByNow, waterGoalMl, waterOn } from './water';

describe('water goal', () => {
  it('follows about 1 ml per kcal of TDEE, 80% from drinks, within 1.5-3.5 L', () => {
    expect(waterGoalMl(2336)).toBe(1850); // 1868.8 -> nearest 50
    expect(waterGoalMl(1400)).toBe(1500); // floor
    expect(waterGoalMl(5000)).toBe(3500); // ceiling
  });

  it('spreads the goal from 07:00 to 21:00 in whole glasses', () => {
    expect(waterByNow(1850, 6)).toBe(0);
    expect(waterByNow(1850, 14)).toBe(750); // half the day: 925 -> 3 glasses
    expect(waterByNow(1850, 22)).toBe(1750); // whole goal, in glasses
  });
});

describe('water', () => {
  it('adds up drinks per day and can undo one', () => {
    let s = addWater(emptyState, { id: 'a', date: '2026-10-13', ml: 250, at: 't1' });
    s = addWater(s, { id: 'b', date: '2026-10-13', ml: 250, at: 't2' });
    s = addWater(s, { id: 'c', date: '2026-10-12', ml: 500, at: 't0' });
    expect(waterOn(s.water, '2026-10-13')).toBe(500);
    expect(waterOn(removeWater(s, 'b').water, '2026-10-13')).toBe(250);
  });

  it('merges water from two devices and tolerates data saved before water existed', () => {
    const a = { ...emptyState, updatedAt: '1', water: [{ id: 'a', date: 'd', ml: 250, at: 't' }] };
    const old = { ...emptyState, updatedAt: '2' } as Partial<typeof emptyState>;
    delete old.water;
    const m = mergeStates(a, old as typeof emptyState);
    expect(m.water.map((w) => w.id)).toEqual(['a']);
  });
});

describe('calorie wording follows the goal', () => {
  it('treats the target as a ceiling for fat loss and an amount to reach for gaining', async () => {
    const { calorieGap } = await import('./nutrition');
    expect(calorieGap('fat_loss', 1500, 1900)).toEqual({
      label: '还可以吃',
      kcal: 400,
      state: 'room',
    });
    expect(calorieGap('maintain', 2100, 1900)).toEqual({
      label: '超出目标',
      kcal: 200,
      state: 'over',
    });
    expect(calorieGap('weight_gain', 1500, 2600)).toEqual({
      label: '还需要吃',
      kcal: 1100,
      state: 'need',
    });
    expect(calorieGap('muscle_gain', 2700, 2600)).toEqual({
      label: '已达到目标',
      kcal: 100,
      state: 'reached',
    });
  });
});

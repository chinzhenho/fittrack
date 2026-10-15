import { describe, expect, it } from 'vitest';
import { addWater, removeWater } from '../data/actions';
import { mergeStates } from '../data/merge';
import { emptyState } from '../data/types';
import { waterOn, waterRangeMl } from './water';

describe('water guide', () => {
  it('uses body weight times the activity factor as a range', () => {
    expect(waterRangeMl(59.4, 'normal')).toEqual([2079, 2376]); // 35-40 ml/kg
    expect(waterRangeMl(75, 'low')).toEqual([2250, 2625]); // 30-35 ml/kg
    expect(waterRangeMl(75, 'high')).toEqual([3000, 3375]); // 40-45 ml/kg
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
      label: 'Left to eat',
      kcal: 400,
      state: 'room',
    });
    expect(calorieGap('maintain', 2100, 1900)).toEqual({
      label: 'Over target',
      kcal: 200,
      state: 'over',
    });
    expect(calorieGap('weight_gain', 1500, 2600)).toEqual({
      label: 'Still to eat',
      kcal: 1100,
      state: 'need',
    });
    expect(calorieGap('muscle_gain', 2700, 2600)).toEqual({
      label: 'Target reached, extra',
      kcal: 100,
      state: 'reached',
    });
  });
});

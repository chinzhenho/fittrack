import { describe, expect, it } from 'vitest';
import { waterRangeMl } from './water';

describe('water guide', () => {
  it('uses body weight times the activity factor as a range', () => {
    expect(waterRangeMl(59.4, 'normal')).toEqual([2079, 2376]); // 35-40 ml/kg
    expect(waterRangeMl(75, 'low')).toEqual([2250, 2625]); // 30-35 ml/kg
    expect(waterRangeMl(75, 'high')).toEqual([3000, 3375]); // 40-45 ml/kg
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

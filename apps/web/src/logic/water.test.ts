import { describe, expect, it } from 'vitest';
import { addWater, removeWater } from '../data/actions';
import { mergeStates } from '../data/merge';
import { emptyState } from '../data/types';
import { waterOn, WATER_GOAL_ML } from './water';

describe('water', () => {
  it('adds up drinks per day and can undo one', () => {
    let s = addWater(emptyState, { id: 'a', date: '2026-10-13', ml: 250, at: 't1' });
    s = addWater(s, { id: 'b', date: '2026-10-13', ml: 250, at: 't2' });
    s = addWater(s, { id: 'c', date: '2026-10-12', ml: 500, at: 't0' });
    expect(waterOn(s.water, '2026-10-13')).toBe(500);
    expect(waterOn(removeWater(s, 'b').water, '2026-10-13')).toBe(250);
    expect(WATER_GOAL_ML.male).toBe(2000);
  });

  it('merges water from two devices and tolerates data saved before water existed', () => {
    const a = { ...emptyState, updatedAt: '1', water: [{ id: 'a', date: 'd', ml: 250, at: 't' }] };
    const old = { ...emptyState, updatedAt: '2' } as Partial<typeof emptyState>;
    delete old.water;
    const m = mergeStates(a, old as typeof emptyState);
    expect(m.water.map((w) => w.id)).toEqual(['a']);
  });
});

import { describe, expect, it } from 'vitest';
import { decideSync, mergeStates } from './merge';
import { emptyState, type AppState, type Profile, type WeightEntry } from './types';

const profile = { goal: 'maintain' } as Profile;
const w = (id: string, kg: number): WeightEntry => ({
  id,
  date: '2026-10-12',
  measuredAt: `2026-10-12T0${id}:00:00Z`,
  weightKg: kg,
});
const state = (patch: Partial<AppState>): AppState => ({ ...emptyState, profile, ...patch });

describe('decideSync', () => {
  const U = 'user-1';
  it('uploads local data to an empty account', () => {
    expect(decideSync(state({ ownerId: null }), null, U, true)).toBe('push_local');
    expect(decideSync(emptyState, null, U, false)).toBe('nothing');
  });
  it('downloads the cloud copy to a fresh device', () => {
    expect(decideSync(emptyState, state({ updatedAt: 'b' }), U, false)).toBe('use_cloud');
  });
  it("replaces another account's leftovers with the cloud copy", () => {
    expect(decideSync(state({ ownerId: 'other' }), state({}), U, true)).toBe('use_cloud');
  });
  it('merges guest data into an existing account', () => {
    expect(decideSync(state({ ownerId: null }), state({}), U, true)).toBe('merge');
  });
  it('uses last-write-wins when only one side changed', () => {
    expect(
      decideSync(state({ ownerId: U, updatedAt: 'a' }), state({ updatedAt: 'b' }), U, false),
    ).toBe('use_cloud');
    expect(
      decideSync(state({ ownerId: U, updatedAt: 'b' }), state({ updatedAt: 'a' }), U, false),
    ).toBe('nothing');
    expect(
      decideSync(state({ ownerId: U, updatedAt: 'b' }), state({ updatedAt: 'a' }), U, true),
    ).toBe('push_local');
  });
  it('merges when both sides changed', () => {
    expect(
      decideSync(state({ ownerId: U, updatedAt: 'a' }), state({ updatedAt: 'b' }), U, true),
    ).toBe('merge');
  });
});

describe('mergeStates', () => {
  it('keeps records from both sides and the newer profile', () => {
    const older = state({
      updatedAt: '2026-10-11',
      weights: [w('1', 70), w('2', 71)],
      completeDays: ['2026-10-10'],
    });
    const newerProfile = { goal: 'fat_loss' } as Profile;
    const newer = state({
      updatedAt: '2026-10-12',
      profile: newerProfile,
      weights: [w('2', 72), w('3', 73)],
      completeDays: ['2026-10-11'],
    });
    const m = mergeStates(newer, older);
    expect(m.profile).toBe(newerProfile);
    expect(m.weights.map((x) => [x.id, x.weightKg])).toEqual([
      ['1', 70],
      ['2', 72],
      ['3', 73],
    ]);
    expect(m.completeDays).toEqual(['2026-10-10', '2026-10-11']);
    expect(m.updatedAt).toBe('2026-10-12');
  });
});

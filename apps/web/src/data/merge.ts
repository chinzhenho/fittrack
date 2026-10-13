import type { AppState } from './types';

// Combines two copies of the state when both changed (e.g. guest data on this phone
// plus an existing cloud account, or edits on two devices while one was offline).
// Records are merged by id so nothing logged on either side is lost; for the profile
// and same-id records the copy with the later updatedAt wins.
// Known limit: a record deleted on one side reappears if the other side still has it.

function byId<T extends { id: string }>(older: T[], newer: T[]): T[] {
  const map = new Map<string, T>();
  for (const x of older) map.set(x.id, x);
  for (const x of newer) map.set(x.id, x);
  return [...map.values()];
}

function union(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])].sort();
}

export function mergeStates(a: AppState, b: AppState): AppState {
  const [older, newer] = a.updatedAt <= b.updatedAt ? [a, b] : [b, a];
  const skipped: Record<string, string[]> = { ...older.skippedTasks };
  for (const [date, ids] of Object.entries(newer.skippedTasks)) {
    skipped[date] = union(skipped[date] ?? [], ids);
  }
  return {
    schemaVersion: 1,
    updatedAt: newer.updatedAt,
    ownerId: newer.ownerId ?? older.ownerId,
    profile: newer.profile ?? older.profile,
    targets: byId(older.targets, newer.targets),
    customFoods: byId(older.customFoods, newer.customFoods),
    meals: byId(older.meals, newer.meals),
    weights: byId(older.weights, newer.weights),
    completeDays: union(older.completeDays, newer.completeDays),
    restDays: union(older.restDays, newer.restDays),
    skippedTasks: skipped,
    sessions: byId(older.sessions, newer.sessions),
    activities: byId(older.activities, newer.activities),
    water: byId(older.water ?? [], newer.water ?? []),
    challenges: byId(older.challenges ?? [], newer.challenges ?? []),
    dismissedInsights: union(older.dismissedInsights ?? [], newer.dismissedInsights ?? []),
    adaptiveKeptOn: union(older.adaptiveKeptOn ?? [], newer.adaptiveKeptOn ?? []),
  };
}

export type SyncDecision = 'use_cloud' | 'push_local' | 'merge' | 'nothing';

/**
 * What to do when signing in or reopening the app.
 * localDirty: this browser has changes not yet saved to the cloud.
 */
export function decideSync(
  local: AppState,
  cloud: AppState | null,
  userId: string,
  localDirty: boolean,
): SyncDecision {
  const localHasData = local.profile !== null;
  if (!cloud) return localHasData ? 'push_local' : 'nothing';
  if (!localHasData) return 'use_cloud';
  if (local.ownerId !== null && local.ownerId !== userId) return 'use_cloud'; // another account's leftovers
  if (local.ownerId === null) return 'merge'; // guest data meets an existing account
  if (!localDirty) return cloud.updatedAt > local.updatedAt ? 'use_cloud' : 'nothing';
  return cloud.updatedAt > local.updatedAt ? 'merge' : 'push_local';
}

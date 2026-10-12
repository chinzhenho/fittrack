import { useSyncExternalStore } from 'react';
import { emptyState, type AppState } from './types';

// Local-first store: every change is saved to this browser at once, and (when signed in)
// pushed to Supabase by data/sync.ts. The browser copy is what the UI always reads.

const KEY = 'fittrack:v1';
type Listener = () => void;

const listeners = new Set<Listener>();
let persistent = true;
let state: AppState = load();

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (parsed.schemaVersion !== 1) return emptyState;
    return { ...emptyState, ...parsed };
  } catch {
    persistent = false;
    return emptyState;
  }
}

function save(next: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    persistent = true;
  } catch {
    persistent = false;
  }
}

function commit(next: AppState) {
  state = next;
  save(state);
  listeners.forEach((l) => l());
}

export function getState(): AppState {
  return state;
}

/** A user change: applies the updater and stamps updatedAt. */
export function update(updater: (s: AppState) => AppState): void {
  commit({ ...updater(state), updatedAt: new Date().toISOString() });
}

/** Replace everything as-is (e.g. with the cloud copy); keeps the given updatedAt. */
export function replaceState(next: AppState): void {
  commit({ ...emptyState, ...next });
}

export function isPersistent(): boolean {
  return persistent;
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function newId(): string {
  return crypto.randomUUID();
}

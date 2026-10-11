import { useSyncExternalStore } from 'react';
import { emptyState, type AppState } from './types';

// Local-first store. Phase 1 replaces persistence with Supabase + IndexedDB sync
// (spec 11.3); the state shape mirrors the database tables so the move is direct.

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

export function getState(): AppState {
  return state;
}

export function update(updater: (s: AppState) => AppState): void {
  state = updater(state);
  save(state);
  listeners.forEach((l) => l());
}

export function replaceState(next: AppState): void {
  update(() => next);
}

export function isPersistent(): boolean {
  return persistent;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function newId(): string {
  return crypto.randomUUID();
}

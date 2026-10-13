import { useSyncExternalStore } from 'react';
import { clearHealthRecords } from './actions';
import { getAuth, onAuthChange } from './auth';
import { decideSync, mergeStates } from './merge';
import { getState, replaceState, subscribe } from './store';
import { supabase } from './supabase';
import { emptyState, type AppState } from './types';

// Keeps the browser copy and the user's cloud row (public.user_state) in step.
// Writes go to the browser first; the cloud is updated 1.5 s after the last change,
// when the connection returns, and before signing out.

export type SyncStatus = 'off' | 'syncing' | 'synced' | 'offline' | 'error';

interface SyncInfo {
  status: SyncStatus;
  /** False while the first cloud check after sign-in is still running. */
  ready: boolean;
}

const META_KEY = 'fittrack:sync';
let info: SyncInfo = { status: 'off', ready: true };
let userId: string | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let started = false;
const listeners = new Set<() => void>();

function setInfo(patch: Partial<SyncInfo>) {
  info = { ...info, ...patch };
  listeners.forEach((l) => l());
}

export function useSync(): SyncInfo {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => info,
    () => info,
  );
}

function readMeta(): { userId: string; syncedAt: string } | null {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function writeMeta(syncedAt: string) {
  try {
    if (userId) localStorage.setItem(META_KEY, JSON.stringify({ userId, syncedAt }));
  } catch {
    /* private mode: sync still works for this session */
  }
}

function isDirty(): boolean {
  const s = getState();
  if (!s.profile) return false;
  const meta = readMeta();
  return !meta || meta.userId !== userId || s.updatedAt > meta.syncedAt;
}

async function pull(uid: string): Promise<AppState | null> {
  const { data, error } = await supabase
    .from('user_state')
    .select('state')
    .eq('user_id', uid)
    .maybeSingle();
  if (error) throw error;
  return data ? { ...emptyState, ...(data.state as AppState) } : null;
}

async function push(): Promise<void> {
  const uid = userId;
  const s = getState();
  if (!uid || !s.profile) return;
  setInfo({ status: 'syncing' });
  const { error } = await supabase
    .from('user_state')
    .upsert({ user_id: uid, state: s, updated_at: s.updatedAt || new Date().toISOString() });
  if (error) {
    setInfo({ status: navigator.onLine ? 'error' : 'offline' });
    return;
  }
  writeMeta(s.updatedAt);
  setInfo({ status: 'synced' });
}

async function reconcile(): Promise<void> {
  const uid = userId;
  if (!uid) return;
  setInfo({ status: 'syncing' });
  let cloud: AppState | null;
  try {
    cloud = await pull(uid);
  } catch {
    setInfo({ status: navigator.onLine ? 'error' : 'offline', ready: true });
    return;
  }
  if (uid !== userId) return; // signed out meanwhile
  const local = getState();
  switch (decideSync(local, cloud, uid, isDirty())) {
    case 'use_cloud':
      replaceState({ ...cloud!, ownerId: uid });
      writeMeta(cloud!.updatedAt);
      setInfo({ status: 'synced' });
      break;
    case 'push_local':
      if (local.ownerId !== uid) replaceState({ ...local, ownerId: uid });
      await push();
      break;
    case 'merge':
      replaceState({
        ...mergeStates(local, cloud!),
        ownerId: uid,
        updatedAt: new Date().toISOString(),
      });
      await push();
      break;
    case 'nothing':
      if (local.profile && local.ownerId !== uid) replaceState({ ...local, ownerId: uid });
      writeMeta(getState().updatedAt);
      setInfo({ status: 'synced' });
      break;
  }
  setInfo({ ready: true });
}

function schedulePush() {
  if (!userId || !info.ready || !isDirty()) return;
  clearTimeout(timer);
  timer = setTimeout(() => void push(), 1500);
}

/** Call once at startup. */
export function startSync() {
  if (started) return;
  started = true;
  onAuthChange(() => {
    const a = getAuth();
    const next = a.status === 'signedIn' ? a.user.id : null;
    if (next === userId) return;
    userId = next;
    if (next) {
      setInfo({ ready: false });
      void reconcile();
    } else {
      setInfo({ status: 'off', ready: true });
    }
  });
  subscribe(schedulePush);
  window.addEventListener('online', () => {
    if (isDirty()) void push();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && userId && info.ready) void reconcile();
  });
}

/** Saves pending changes, signs out and clears this browser's copy. */
export async function signOut(): Promise<void> {
  clearTimeout(timer);
  if (isDirty()) await push();
  await supabase.auth.signOut();
  clearBrowserCopy();
}

function clearBrowserCopy() {
  replaceState(emptyState);
  try {
    localStorage.removeItem(META_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Deletes all health records but keeps the account, profile and plan. Signed in, the
 * cloud copy is updated first; the browser copy changes only when that succeeded, so a
 * failure never shows as deleted.
 */
export async function deleteHealthRecords(): Promise<string | null> {
  const next: AppState = { ...clearHealthRecords(getState()), updatedAt: new Date().toISOString() };
  if (!userId) {
    replaceState(next);
    return null;
  }
  clearTimeout(timer);
  const { error } = await supabase
    .from('user_state')
    .upsert({ user_id: userId, state: next, updated_at: next.updatedAt });
  if (error) return '删除失败，请检查网络后再试。你的记录没有被删除。';
  writeMeta(next.updatedAt);
  replaceState(next);
  setInfo({ status: 'synced' });
  return null;
}

/**
 * Permanently deletes the account and all its cloud data (public.delete_my_account,
 * supabase/migrations/20261014000000_delete_account.sql), then clears this browser.
 */
export async function deleteAccount(): Promise<string | null> {
  if (!userId) return '尚未登录。';
  clearTimeout(timer);
  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    return error.code === 'PGRST202'
      ? '服务器还没有启用删除账号功能。你的账号和资料都没有被删除。'
      : '删除失败，请检查网络后再试。你的账号和资料都没有被删除。';
  }
  // The user no longer exists, so the server may refuse the sign-out call; the local
  // session is removed either way.
  await supabase.auth.signOut({ scope: 'local' });
  clearBrowserCopy();
  return null;
}

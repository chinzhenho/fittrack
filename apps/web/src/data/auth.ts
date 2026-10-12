import type { User } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';

export type AuthState =
  { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; user: User };

let auth: AuthState = { status: 'loading' };
let recovering = false;
const listeners = new Set<() => void>();

function set(next: AuthState) {
  auth = next;
  listeners.forEach((l) => l());
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') recovering = true;
  set(session?.user ? { status: 'signedIn', user: session.user } : { status: 'signedOut' });
});

export function getAuth(): AuthState {
  return auth;
}

/** True after the user opened a password-reset link (until they set a new password). */
export function isRecovering(): boolean {
  return recovering;
}

export function clearRecovering() {
  recovering = false;
}

export function onAuthChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAuth(): AuthState {
  return useSyncExternalStore(onAuthChange, getAuth, getAuth);
}

/** Supabase error messages, in plain Traditional Chinese. */
export function authErrorMessage(
  error: { message?: string | undefined; code?: string | undefined } | null,
): string {
  if (!error) return '';
  const code = error.code ?? '';
  const msg = (error.message ?? '').toLowerCase();
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials'))
    return 'Email 或密碼不正確。';
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed'))
    return '請先到信箱點擊確認連結，再登入。';
  if (code === 'user_already_exists' || msg.includes('already registered'))
    return '這個 Email 已經註冊過，請直接登入。';
  if (code === 'weak_password' || msg.includes('password should'))
    return '密碼太弱：至少 8 個字元，建議混合字母和數字。';
  if (code === 'over_email_send_rate_limit' || msg.includes('rate limit'))
    return '寄信次數太多，請稍後再試。';
  if (code === 'same_password') return '新密碼不能和舊密碼一樣。';
  if (msg.includes('failed to fetch') || msg.includes('network'))
    return '連不上伺服器，請檢查網路。';
  return '發生錯誤，請稍後再試。';
}

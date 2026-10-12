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
    return 'Email 或密码不正确。';
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed'))
    return '请先到信箱点击确认链接，再登录。';
  if (code === 'user_already_exists' || msg.includes('already registered'))
    return '这个 Email 已经注册过，请直接登录。';
  if (code === 'weak_password' || msg.includes('password should'))
    return '密码太弱：至少 8 个字元，建议混合字母和数字。';
  if (code === 'over_email_send_rate_limit' || msg.includes('rate limit'))
    return '寄信次数太多，请稍后再试。';
  if (code === 'same_password') return '新密码不能和旧密码一样。';
  if (msg.includes('failed to fetch') || msg.includes('network'))
    return '连不上服务器，请检查网络。';
  return '发生错误，请稍后再试。';
}

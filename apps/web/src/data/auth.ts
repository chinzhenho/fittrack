import type { User } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import { t } from '../lib/i18n';

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
    return t('Wrong email or password.');
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed'))
    return t('Please click the confirmation link in your email first, then log in.');
  if (code === 'user_already_exists' || msg.includes('already registered'))
    return t('This email is already registered. Please log in.');
  if (code === 'weak_password' || msg.includes('password should'))
    return t('Password too weak: use at least 8 characters, mixing letters and numbers.');
  if (code === 'over_email_send_rate_limit' || msg.includes('rate limit'))
    return t('Too many emails sent. Please try again later.');
  if (code === 'same_password') return t('The new password must be different from the old one.');
  if (code === 'email_address_invalid' || msg.includes('is invalid'))
    return t("This email address can't be used. Please check it, or try another one.");
  if (code === 'email_address_not_authorized' || msg.includes('not authorized'))
    return t("We can't send email to this address yet. Please try again later.");
  if (msg.includes('sending confirmation') || msg.includes('sending magic link'))
    return t("We couldn't send the confirmation email. Please try again later.");
  if (code === 'signup_disabled') return t('New sign-ups are closed at the moment.');
  if (msg.includes('failed to fetch') || msg.includes('network'))
    return t("Can't reach the server. Please check your connection.");
  // Unknown: show the code so the problem can be looked up.
  return code
    ? t('Something went wrong ({code}). Please try again later.', { code })
    : t('Something went wrong. Please try again later.');
}

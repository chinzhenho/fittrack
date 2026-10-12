import { useSyncExternalStore } from 'react';

// Appearance is a per-device preference, so it lives in its own key and is not synced.
// index.html applies it before first paint to avoid a flash; keep the two in step.
export type Theme = 'light' | 'dark' | 'system';

const KEY = 'fittrack:theme';
const listeners = new Set<() => void>();
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'dark' || v === 'system' ? v : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: Theme = getTheme()) {
  const dark = theme === 'dark' || (theme === 'system' && media().matches);
  document.documentElement.classList.toggle('dark', dark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#0f172a' : '#f3f6f4');
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // storage blocked: the choice still applies until the page is closed
  }
  applyTheme(theme);
  listeners.forEach((l) => l());
}

export function startTheme() {
  applyTheme();
  media().addEventListener('change', () => applyTheme());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getTheme,
    () => 'light',
  );
}

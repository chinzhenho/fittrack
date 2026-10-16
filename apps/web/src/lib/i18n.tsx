import { Fragment, useSyncExternalStore, type ReactNode } from 'react';
import { ZH } from './zh';

// Language is a per-device preference like the theme: its own key, not synced.
// Copy is written in English in the code; t() looks it up in the Simplified Chinese
// table (lib/zh.ts) when Chinese is chosen, and falls back to the English text.
// i18n.test.ts checks that every t()/tn() text in the code has a Chinese entry.
export type Lang = 'en' | 'zh';

const KEY = 'eathealthee:lang';
const listeners = new Set<() => void>();

function detect(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'en' || v === 'zh') return v;
  } catch {
    // storage blocked: use the browser language
  }
  return typeof navigator !== 'undefined' && /^zh\b/i.test(navigator.language) ? 'zh' : 'en';
}

let current: Lang = detect();

function applyLang() {
  if (typeof document !== 'undefined')
    document.documentElement.lang = current === 'zh' ? 'zh-Hans' : 'en';
}
applyLang();

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang) {
  current = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // storage blocked: the choice still applies until the page is closed
  }
  applyLang();
  listeners.forEach((l) => l());
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getLang,
    () => 'en',
  );
}

type Vars = Record<string, string | number>;

/** Translates an English text; `{name}` placeholders are filled from `vars`. */
export function t(en: string, vars?: Vars): string {
  const s = current === 'zh' ? (ZH[en] ?? en) : en;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}

/** Like t(), but placeholders may be elements, e.g. bold numbers. */
export function tn(en: string, vars: Record<string, ReactNode>): ReactNode {
  const s = current === 'zh' ? (ZH[en] ?? en) : en;
  return s.split(/(\{\w+\})/).map((part, i) => {
    const k = /^\{(\w+)\}$/.exec(part)?.[1];
    return <Fragment key={i}>{k !== undefined && k in vars ? vars[k] : part}</Fragment>;
  });
}

/**
 * Wraps a table of labels so its texts are translated when read, e.g.
 * GOAL_LABELS.fat_loss gives "减脂" in Chinese. Works for nested objects and arrays.
 */
export function tr<T extends object>(table: T): T {
  return new Proxy(table, {
    get(target, prop, receiver) {
      const v: unknown = Reflect.get(target, prop, receiver);
      if (typeof v === 'string') return t(v);
      if (v && typeof v === 'object') return tr(v);
      return v;
    },
  });
}

/** Locale for number and date formatting. */
export function locale(): string {
  return current === 'zh' ? 'zh-CN' : 'en-MY';
}

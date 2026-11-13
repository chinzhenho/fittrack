import { useEffect, useRef, useState } from 'react';
import { getLang, t } from '../lib/i18n';

/**
 * Cloudflare Turnstile: a free "are you human?" check on sign-up, log-in and password
 * reset, so scripts can't create accounts or send emails in bulk. Supabase checks the
 * token (Authentication -> Attack Protection). Most people see only a short tick.
 * The site key is public by design; the secret key lives only in Supabase.
 */
const SITE_KEY = '0x4AAAAAAF_LL0Y9AFelVqtQ';
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  remove(id: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing'));
    script.onerror = () => {
      loading = null; // allow another try
      script.remove();
      reject(new Error('turnstile failed to load'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

function TurnstileBox({ onToken }: { onToken: (token: string | null) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let id: string | null = null;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !box.current) return;
        id = api.render(box.current, {
          sitekey: SITE_KEY,
          language: getLang() === 'zh' ? 'zh-cn' : 'en',
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          size: 'flexible',
          callback: (token: string) => onToken(token),
          'expired-callback': () => onToken(null),
          'error-callback': () => {
            onToken(null);
            setFailed(true);
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [attempt, onToken]);

  if (failed) {
    return (
      <p role="alert" className="text-sm text-red-700 dark:text-red-400">
        {t("We couldn't check that you're human. Check your connection, then")}{' '}
        <button
          type="button"
          className="font-semibold underline"
          onClick={() => {
            setFailed(false);
            setAttempt((a) => a + 1);
          }}
        >
          {t('try again')}
        </button>
      </p>
    );
  }
  return <div ref={box} className="min-h-[65px]" />;
}

/**
 * The human check for a form. `token` is null until the check passes; each token works
 * once, so call `reset()` after every failed submit to get a fresh check.
 */
export function useHumanCheck() {
  const [token, setToken] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  return {
    token,
    widget: <TurnstileBox key={round} onToken={setToken} />,
    reset: () => {
      setToken(null);
      setRound((r) => r + 1);
    },
  };
}

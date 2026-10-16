import { NavLink, Outlet } from 'react-router';
import { isPersistent } from '../data/store';
import { mealForHour } from '../logic/nutrition';
import { SnapButton } from './SnapButton';
import { t, tr } from '../lib/i18n';

const NAV = tr([
  { to: '/today', label: 'Today', icon: 'M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z' },
  {
    to: '/diary',
    label: 'Diary',
    icon: 'M7 3v8a3 3 0 006 0V3M10 3v18M17 3c-1.5 2-2 4-2 7h4c0-3-.5-5-2-7zm0 7v11',
  },
  { to: '/progress', label: 'Progress', icon: 'M4 19h16M6 15l4-4 3 3 5-6' },
  { to: '/me', label: 'Me', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0' },
]);

const CAMERA =
  'M4 8a2 2 0 012-2h1.5l1.2-1.8A2 2 0 0110.4 3h3.2a2 2 0 011.7 1.2L16.5 6H18a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8zm8 8.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z';

function NavItem({ n }: { n: (typeof NAV)[number] }) {
  return (
    <NavLink
      to={n.to}
      className={({ isActive }) =>
        `flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium ${isActive ? 'text-emerald-strong dark:text-emerald' : 'text-slate-500 dark:text-slate-400'}`
      }
    >
      <Icon d={n.icon} />
      {n.label}
    </NavLink>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[26px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export function AppShell() {
  return (
    <div className="min-h-dvh lg:flex">
      <nav
        aria-label={t('Main menu')}
        className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-black/[0.06] bg-[#f3f1ec]/80 px-3 py-6 backdrop-blur-xl lg:block dark:border-white/10 dark:bg-slate-800/70"
      >
        <div className="mb-8 flex items-center gap-2 px-3">
          <img
            src="/brand/icon-192.png"
            alt=""
            className="size-9 rounded-xl bg-[#fbfaf3] ring-1 ring-black/5"
          />
          <span className="text-xl font-semibold tracking-tight">{t('EatHealthee')}</span>
        </div>
        <ul className="space-y-1">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                className={({ isActive }) =>
                  `flex min-h-10 items-center gap-3 rounded-[10px] px-3 text-[0.9375rem] ${isActive ? 'bg-[#767680]/[0.14] font-semibold text-emerald-strong dark:text-emerald' : 'text-navy hover:bg-[#767680]/[0.08] dark:text-slate-100'}`
                }
              >
                <Icon d={n.icon} />
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <SnapButton
          meal={mealForHour(new Date().getHours())}
          label={t('Log food')}
          className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-emerald-strong px-4 font-semibold text-white transition hover:brightness-110 dark:bg-emerald dark:text-black"
        >
          <Icon d={CAMERA} />
          {t('Log food')}
        </SnapButton>
      </nav>

      <div className="flex-1 pb-28 lg:pb-10">
        {!isPersistent() && (
          <p className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-950">
            {t(
              "This browser can't save data (maybe private browsing). Your logs will be lost when you close the page.",
            )}
          </p>
        )}
        <main className="mx-auto max-w-3xl px-6 py-6">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label={t('Main menu')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-[#faf9f6]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 lg:hidden dark:border-white/10 dark:bg-slate-800/75"
      >
        <ul className="grid grid-cols-5 items-end">
          {NAV.slice(0, 2).map((n) => (
            <li key={n.to}>
              <NavItem n={n} />
            </li>
          ))}
          <li className="flex flex-col items-center pb-1">
            <SnapButton
              meal={mealForHour(new Date().getHours())}
              label={t('Log food')}
              className="-mt-5 flex size-14 items-center justify-center rounded-full bg-emerald-strong text-white shadow-[0_6px_16px_rgba(53,107,79,0.3)] ring-4 ring-[#faf9f6] transition active:scale-90 dark:bg-emerald dark:text-black dark:ring-black/60"
            >
              <Icon d={CAMERA} />
            </SnapButton>
            <span className="mt-0.5 text-[0.6875rem] font-medium text-emerald-strong dark:text-emerald">
              {t('Log food')}
            </span>
          </li>
          {NAV.slice(2).map((n) => (
            <li key={n.to}>
              <NavItem n={n} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

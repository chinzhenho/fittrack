import { NavLink, Outlet } from 'react-router';
import { isPersistent } from '../data/store';

const NAV = [
  { to: '/today', label: '今天', icon: 'M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z' },
  {
    to: '/diary',
    label: '飲食',
    icon: 'M7 3v8a3 3 0 006 0V3M10 3v18M17 3c-1.5 2-2 4-2 7h4c0-3-.5-5-2-7zm0 7v11',
  },
  { to: '/workout', label: '訓練', icon: 'M4 9v6M8 7v10M16 7v10M20 9v6M8 12h8' },
  { to: '/progress', label: '進度', icon: 'M4 19h16M6 15l4-4 3 3 5-6' },
  { to: '/me', label: '我', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0' },
];

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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
        aria-label="主選單"
        className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-slate-200 bg-white px-3 py-6 lg:block dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="mb-8 flex items-center gap-2 px-3">
          <img src="/favicon.svg" alt="" className="size-8" />
          <span className="text-xl font-bold text-emerald-strong dark:text-emerald">FitTrack</span>
        </div>
        <ul className="space-y-1">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                className={({ isActive }) =>
                  `flex min-h-12 items-center gap-3 rounded-2xl px-4 text-base ${isActive ? 'bg-emerald-50 font-semibold text-emerald-900 dark:bg-emerald/15 dark:text-emerald-100' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'}`
                }
              >
                <Icon d={n.icon} />
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex-1 pb-24 lg:pb-10">
        {!isPersistent() && (
          <p className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-950">
            這個瀏覽器無法保存資料（可能是私密瀏覽模式），關閉頁面後記錄會消失。
          </p>
        )}
        <main className="mx-auto max-w-3xl px-4 py-6">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="主選單"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden dark:border-slate-700 dark:bg-slate-800/95"
      >
        <ul className="grid grid-cols-5">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                className={({ isActive }) =>
                  `group flex min-h-16 flex-col items-center justify-center gap-1 text-xs ${isActive ? 'active font-semibold text-emerald-900 dark:text-emerald-100' : 'text-slate-600 dark:text-slate-300'}`
                }
              >
                <span className="flex h-8 w-14 items-center justify-center rounded-full transition group-[.active]:bg-emerald-100 dark:group-[.active]:bg-emerald/20">
                  <Icon d={n.icon} />
                </span>
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

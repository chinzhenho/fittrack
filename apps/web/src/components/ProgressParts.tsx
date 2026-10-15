import { addDays } from '@fittrack/engine';
import { useState, type ReactNode } from 'react';
import { useToast } from './Toast';
import { Bar, Button, Card } from './ui';
import { joinMonthlyChallenge } from '../data/actions';
import { update } from '../data/store';
import type { AppState } from '../data/types';
import { formatDay, shortDate } from '../lib/dates';
import { currentStreak, loggedDates } from '../logic/achievements';
import {
  achievementFeed,
  monthKey,
  monthlyChallenge,
  monthlyTrophies,
  monthName,
  monthStats,
  nextTier,
  personalRecords,
  previousMonth,
  TIER_LABELS,
  topTier,
  trophyFamilies,
  weekStreak,
  WEEK_STREAK_DAYS,
  type Tier,
  type TrophyFamily,
} from '../logic/trophies';

/** Apple-style card with a small tinted icon, title and optional action on the right. */
export function Section({
  id,
  icon,
  tint = 'bg-emerald-500',
  title,
  sub,
  action,
  children,
}: {
  id: string;
  icon: string;
  tint?: string;
  title: string;
  sub?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="scroll-mt-20">
      <div id={id} className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className={`flex size-8 shrink-0 items-center justify-center rounded-[9px] text-base ${tint}`}
          >
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-[1.25rem] leading-tight font-bold">{title}</h2>
            {sub && (
              <p className="text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">{sub}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

const TIER_RING: Record<Tier, string> = {
  bronze: 'from-[#f0b27a] via-[#c8803f] to-[#8a5323]',
  silver: 'from-[#f4f4f6] via-[#c2c4ca] to-[#8a8d94]',
  gold: 'from-[#fff1a8] via-[#f5c518] to-[#b8860b]',
  platinum: 'from-[#e8f4ff] via-[#b9b4ff] to-[#6fb7ff]',
};

/** A round medal with a metallic ring for its tier, or a grey dashed ring when locked. */
export function Medal({
  icon,
  tier,
  size = 'md',
}: {
  icon: string;
  tier: Tier | null;
  size?: 'sm' | 'md';
}) {
  const box = size === 'sm' ? 'size-10 text-lg' : 'size-16 text-2xl';
  if (!tier) {
    return (
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-slate-50 grayscale dark:border-slate-600 dark:bg-slate-700 ${box}`}
      >
        <span className="opacity-40">{icon}</span>
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br p-[3px] shadow-[0_2px_8px_rgba(0,0,0,0.12)] ${TIER_RING[tier]} ${box}`}
    >
      <span className="flex size-full items-center justify-center rounded-full bg-white dark:bg-slate-800">
        {icon}
      </span>
    </span>
  );
}

/** Streaks and this month compared with last month. */
export function Overview({ s, today }: { s: AppState; today: string }) {
  const days = currentStreak(loggedDates(s), today);
  const weeks = weekStreak(s, today);
  const month = monthKey(today);
  const now = monthStats(s, month);
  const before = monthStats(s, previousMonth(month));
  const rows: { label: string; now: number; before: number }[] = [
    { label: 'Days logged', now: now.daysLogged, before: before.daysLogged },
    { label: 'Meals logged', now: now.meals, before: before.meals },
    { label: 'Fully logged days', now: now.fullyLogged, before: before.fullyLogged },
    { label: 'Weigh-ins', now: now.weighIns, before: before.weighIns },
  ];
  return (
    <Card className="!p-0">
      <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-700">
        <div className="p-4">
          <p className="text-xs font-semibold text-[#ff9500]">Day streak</p>
          <p className="text-[2rem] leading-tight font-bold">
            {days}
            <span className="ml-1 text-base font-semibold text-slate-500">
              {days === 1 ? 'day' : 'days'}
            </span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Days in a row with food logged
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-[#007aff] dark:text-[#0a84ff]">Week streak</p>
          <p className="text-[2rem] leading-tight font-bold">
            {weeks}
            <span className="ml-1 text-base font-semibold text-slate-500">
              {weeks === 1 ? 'week' : 'weeks'}
            </span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Weeks with {WEEK_STREAK_DAYS}+ days logged
          </p>
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 pt-3 pb-1 dark:border-slate-700">
        <p className="text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
          {monthName(month)}
        </p>
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span>{r.label}</span>
              <span className="text-right">
                <span className="font-semibold">{r.now}</span>
                <span className="block text-[0.6875rem] text-slate-500 dark:text-slate-400">
                  {monthName(previousMonth(month)).split(' ')[0]}: {r.before}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function FamilyRow({ f }: { f: TrophyFamily }) {
  const top = topTier(f);
  const next = nextTier(f);
  return (
    <li className="flex items-center gap-3 py-3">
      <Medal icon={f.icon} tier={top?.tier ?? null} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center justify-between gap-2 text-sm font-semibold">
          <span className="truncate">{f.title}</span>
          <span className="flex shrink-0 gap-1" aria-hidden="true">
            {f.levels.map((l) => (
              <span
                key={l.tier}
                className={`size-2 rounded-full ${l.earnedOn ? `bg-gradient-to-br ${TIER_RING[l.tier]}` : 'bg-slate-200 dark:bg-slate-600'}`}
              />
            ))}
          </span>
        </p>
        {next ? (
          <>
            <Bar value={Math.min(f.value, next.goal)} max={next.goal} color="bg-emerald-500" />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {Math.min(f.value, next.goal)} / {next.goal} {f.unit} → {TIER_LABELS[next.tier]}
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">All tiers earned 🎉</p>
        )}
        <span className="sr-only">
          {top ? `${TIER_LABELS[top.tier]} earned` : 'Not earned yet'}
        </span>
      </div>
    </li>
  );
}

/** Trophy case, monthly challenge, personal records and recent achievements. */
export function Achievements({ s, today, hide }: { s: AppState; today: string; hide: boolean }) {
  const toast = useToast();
  const [showAll, setShowAll] = useState(false);
  const families = trophyFamilies(s, today).filter((f) => !(hide && f.id === 'kg'));
  const earned = families
    .map((f) => ({ f, top: topTier(f) }))
    .filter((x) => x.top !== null)
    .sort((a, b) => b.top!.earnedOn!.localeCompare(a.top!.earnedOn!));
  const monthTrophies = monthlyTrophies(s, today);
  const month = monthKey(today);
  const mc = monthlyChallenge(s, month, today);
  const records = personalRecords(s, today).filter((r) => !(hide && r.id === 'weight'));
  const feed = achievementFeed(s, today).filter((i) => !(hide && i.text.startsWith('Weight')));
  const closest = families
    .map((f) => ({ f, next: nextTier(f) }))
    .filter((x) => x.next !== null)
    .sort((a, b) => b.f.value / b.next!.goal - a.f.value / a.next!.goal)[0];

  return (
    <Section
      id="achievements"
      icon="🏆"
      tint="bg-[#ffcc00]"
      title="Achievements"
      sub={`${earned.length + monthTrophies.length} medals earned`}
    >
      {/* Trophy case */}
      {earned.length + monthTrophies.length === 0 ? (
        <div className="flex items-center gap-3 rounded-[18px] bg-slate-50 p-4 dark:bg-slate-700/60">
          <Medal icon={closest?.f.icon ?? '🏅'} tier={null} />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {closest
              ? `Your first medal: ${closest.f.title}, ${closest.next!.goal} ${closest.f.unit}. You're at ${closest.f.value}.`
              : 'Log food to earn your first medal.'}
          </p>
        </div>
      ) : (
        <ul
          className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Trophy case"
        >
          {earned.map(({ f, top }) => (
            <li key={f.id} className="flex w-20 shrink-0 flex-col items-center text-center">
              <Medal icon={f.icon} tier={top!.tier} />
              <p className="mt-1.5 text-xs leading-tight font-semibold">{f.title}</p>
              <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
                {TIER_LABELS[top!.tier]} · {top!.goal}
              </p>
            </li>
          ))}
          {monthTrophies.map((m) => (
            <li key={m.month} className="flex w-20 shrink-0 flex-col items-center text-center">
              <Medal icon="📅" tier="gold" />
              <p className="mt-1.5 text-xs leading-tight font-semibold">
                {monthName(m.month).split(' ')[0]}
              </p>
              <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">Challenge</p>
            </li>
          ))}
        </ul>
      )}

      {/* Monthly challenge */}
      <div className="mt-4 overflow-hidden rounded-[18px] bg-gradient-to-br from-[#ff9500] to-[#ff5e3a] p-4 text-white">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 flex-col items-center justify-center rounded-[12px] bg-white text-[#ff5e3a]"
          >
            <span className="text-[0.625rem] leading-none font-bold uppercase">
              {monthName(month).slice(0, 3)}
            </span>
            <span className="text-lg leading-none font-bold">20</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase opacity-90">Monthly challenge</p>
            <p className="text-[1.0625rem] leading-snug font-bold">
              {monthName(month).split(' ')[0]} Logging Challenge
            </p>
            <p className="text-sm opacity-90">Log food on {mc.goal} days this month.</p>
          </div>
        </div>
        {mc.joined || mc.done ? (
          <div className="mt-3">
            <div className="h-2 rounded-full bg-white/30" aria-hidden="true">
              <div
                className="h-2 rounded-full bg-white"
                style={{ width: `${(mc.value / mc.goal) * 100}%` }}
              />
            </div>
            <p className="mt-1.5 text-sm font-semibold">
              {mc.done && mc.joined
                ? `✓ Completed on ${formatDay(mc.earnedOn!, today)}`
                : `${mc.value} / ${mc.goal} days · ${mc.daysLeft} ${mc.daysLeft === 1 ? 'day' : 'days'} left`}
            </p>
            {mc.joined && !mc.done && !mc.reachable && (
              <p className="text-xs opacity-90">
                Not enough days left to finish this month, but every day logged still counts.
              </p>
            )}
            {!mc.joined && (
              <button
                type="button"
                onClick={() => {
                  update((x) => joinMonthlyChallenge(x, month));
                  toast({ text: 'Joined! Your trophy is in the trophy case.' });
                }}
                className="mt-2 min-h-10 w-full rounded-[12px] bg-white font-semibold text-[#ff5e3a]"
              >
                Join and claim trophy
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              update((x) => joinMonthlyChallenge(x, month));
              toast({ text: `Joined the ${monthName(month).split(' ')[0]} challenge` });
            }}
            className="mt-3 min-h-11 w-full rounded-[12px] bg-white font-semibold text-[#ff5e3a]"
          >
            Join challenge
          </button>
        )}
      </div>

      {/* Personal records */}
      <h3 className="mt-5 mb-1 text-[1.0625rem] font-semibold">Personal records</h3>
      {records.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Log a few days to set your first records.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {records.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <span aria-hidden="true" className="text-xl">
                {r.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm">{r.title}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {r.id === 'week'
                    ? `Week of ${shortDate(r.on)}`
                    : r.id === 'month'
                      ? monthName(monthKey(r.on))
                      : formatDay(r.on, today)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-sm font-bold">
                {r.isNew && (
                  <span className="rounded-full bg-[#ff9500] px-1.5 py-0.5 text-[0.625rem] font-bold text-white">
                    NEW
                  </span>
                )}
                {r.value}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Recent achievements */}
      {feed.length > 0 && (
        <>
          <h3 className="mt-5 mb-1 text-[1.0625rem] font-semibold">Recent</h3>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {feed.map((i) => (
              <li key={`${i.date}-${i.text}`} className="flex items-center gap-3 py-2.5">
                <Medal icon={i.icon} tier={i.tier ?? 'gold'} size="sm" />
                <span className="min-w-0 flex-1 text-sm">{i.text}</span>
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                  {formatDay(i.date, today)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <Button variant="secondary" className="mt-4 w-full" onClick={() => setShowAll((v) => !v)}>
        {showAll ? 'Hide all medals' : 'All medals'}
      </Button>
      {showAll && (
        <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-700">
          {families.map((f) => (
            <FamilyRow key={f.id} f={f} />
          ))}
        </ul>
      )}
    </Section>
  );
}

/** Last 12 Mon–Sun weeks as bars of days logged; tapping a bar selects that week. */
export function WeekBars({
  s,
  today,
  weeks,
  selected,
  onSelect,
}: {
  s: AppState;
  today: string;
  weeks: string[];
  selected: string;
  onSelect: (week: string) => void;
}) {
  const logged = new Set(loggedDates(s));
  return (
    <div>
      <div className="flex h-28 items-end gap-1.5" role="group" aria-label="Days logged per week">
        {weeks.map((w) => {
          const n = [0, 1, 2, 3, 4, 5, 6].filter((i) => {
            const d = addDays(w, i);
            return d <= today && logged.has(d);
          }).length;
          const on = w === selected;
          return (
            <button
              key={w}
              type="button"
              aria-pressed={on}
              aria-label={`Week of ${shortDate(w)}: ${n} of 7 days logged`}
              onClick={() => onSelect(w)}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            >
              {on && <span className="text-[0.6875rem] font-bold">{n}</span>}
              <span
                className={`w-full rounded-[5px] transition ${on ? 'bg-emerald-500' : 'bg-emerald-200 dark:bg-emerald-900'}`}
                style={{ height: `${Math.max(6, (n / 7) * 80)}px` }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[0.6875rem] text-slate-500 dark:text-slate-400">
        <span>{shortDate(weeks[0]!)}</span>
        <span>This week</span>
      </div>
    </div>
  );
}

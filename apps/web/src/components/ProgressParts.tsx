import { useState, type ReactNode } from 'react';
import { Glyph, type IconName } from './Icons';
import { useToast } from './Toast';
import { Bar, Button, Card } from './ui';
import { joinMonthlyChallenge } from '../data/actions';
import { update } from '../data/store';
import type { AppState } from '../data/types';
import { formatDay, shortDate } from '../lib/dates';
import {
  achievementFeed,
  monthKey,
  monthlyChallenge,
  monthlyTrophies,
  monthName,
  monthOnly,
  nextTier,
  personalRecords,
  TIER_LABELS,
  topTier,
  trophyFamilies,
  type Tier,
  type TrophyFamily,
} from '../logic/trophies';
import { getLang, t } from '../lib/i18n';

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
  icon: IconName;
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
          <div className="min-w-0">
            <h2 className="text-xl leading-tight font-semibold tracking-tight">{title}</h2>
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

const TIER_TEXT: Record<Tier, string> = {
  bronze: 'text-[#a0612b]',
  silver: 'text-[#7c7f86]',
  gold: 'text-[#c08a00]',
  platinum: 'text-[#5e5ce6]',
};

/** A round medal with a metallic ring for its tier, or a grey dashed ring when locked. */
export function Medal({
  icon,
  tier,
  size = 'md',
}: {
  icon: IconName;
  tier: Tier | null;
  size?: 'sm' | 'md';
}) {
  const box = size === 'sm' ? 'size-10' : 'size-16';
  const glyph = size === 'sm' ? 'size-[18px]' : 'size-7';
  if (!tier) {
    return (
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-slate-50 grayscale dark:border-slate-600 dark:bg-slate-700 ${box}`}
      >
        <Glyph name={icon} className={`${glyph} text-slate-400`} />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br p-[3px] shadow-[0_2px_8px_rgba(0,0,0,0.12)] ${TIER_RING[tier]} ${box}`}
    >
      <span
        className={`flex size-full items-center justify-center rounded-full bg-white dark:bg-slate-800 ${TIER_TEXT[tier]}`}
      >
        <Glyph name={icon} className={glyph} strokeWidth={2.2} />
      </span>
    </span>
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
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              {t('Next ({tier}): {goal}', {
                tier: TIER_LABELS[next.tier],
                goal: f.describe(next.goal),
              })}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("You're at {value} / {goal} {unit}", {
                value: Math.min(f.value, next.goal),
                goal: next.goal,
                unit: f.unit,
              })}
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('All levels earned 🎉 ({goal})', { goal: f.describe(f.levels.at(-1)!.goal) })}
          </p>
        )}
        <span className="sr-only">
          {top ? t('{v1} earned', { v1: TIER_LABELS[top.tier] }) : t('Not earned yet')}
        </span>
      </div>
    </li>
  );
}

/** Trophy case, monthly challenge, personal records and recent achievements. */
export function Achievements({ s, today, hide }: { s: AppState; today: string; hide: boolean }) {
  const toast = useToast();
  const [showAll, setShowAll] = useState(false);
  const families = trophyFamilies(s).filter((f) => !(hide && f.id === 'kg'));
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
      icon="trophy"
      tint="bg-[#ffcc00]"
      title={t('Achievements')}
      sub={t('{v1} medals earned', { v1: earned.length + monthTrophies.length })}
    >
      {/* Trophy case */}
      {earned.length + monthTrophies.length === 0 ? (
        <div className="flex items-center gap-3 rounded-[18px] bg-slate-50 p-4 dark:bg-slate-700/60">
          <Medal icon={closest?.f.icon ?? 'star'} tier={null} />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {closest
              ? t("Your first medal: {title}, {goal} {unit}. You're at {value}.", {
                  title: closest.f.title,
                  goal: closest.next!.goal,
                  unit: closest.f.unit,
                  value: closest.f.value,
                })
              : t('Log food to earn your first medal.')}
          </p>
        </div>
      ) : (
        <ul
          className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label={t('Trophy case')}
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
              <Medal icon="calendar" tier="gold" />
              <p className="mt-1.5 text-xs leading-tight font-semibold">{monthOnly(m.month)}</p>
              <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
                {t('Challenge')}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Monthly challenge */}
      <div className="mt-4 overflow-hidden rounded-[18px] bg-emerald-strong p-4 text-white dark:bg-emerald-800">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 flex-col items-center justify-center rounded-[12px] bg-white text-emerald-strong"
          >
            <span className="text-[0.625rem] leading-none font-bold uppercase">
              {getLang() === 'zh' ? monthOnly(month) : monthOnly(month).slice(0, 3)}
            </span>
            <span className="text-lg leading-none font-bold">20</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase opacity-90">{t('Monthly challenge')}</p>
            <p className="text-[1.0625rem] leading-snug font-bold">
              {t('{month} Logging Challenge', { month: monthOnly(month) })}
            </p>
            <p className="text-sm opacity-90">
              {t('Log food on')} {mc.goal} {t('days this month.')}
            </p>
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
                ? t('✓ Completed on {v1}', { v1: formatDay(mc.earnedOn!, today) })
                : t(
                    mc.daysLeft === 1
                      ? '{value} / {goal} days · {daysLeft} day left'
                      : '{value} / {goal} days · {daysLeft} days left',
                    { value: mc.value, goal: mc.goal, daysLeft: mc.daysLeft },
                  )}
            </p>
            {mc.joined && !mc.done && !mc.reachable && (
              <p className="text-xs opacity-90">
                {t('Not enough days left to finish this month, but every day logged still counts.')}
              </p>
            )}
            {!mc.joined && (
              <button
                type="button"
                onClick={() => {
                  update((x) => joinMonthlyChallenge(x, month));
                  toast({ text: t('Joined! Your trophy is in the trophy case.') });
                }}
                className="mt-2 min-h-10 w-full rounded-[12px] bg-white font-semibold text-emerald-strong"
              >
                {t('Join and claim trophy')}
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              update((x) => joinMonthlyChallenge(x, month));
              toast({
                text: t('Joined the {month} challenge', { month: monthOnly(month) }),
              });
            }}
            className="mt-3 min-h-11 w-full rounded-[12px] bg-white font-semibold text-emerald-strong"
          >
            {t('Join challenge')}
          </button>
        )}
      </div>

      {/* Personal records */}
      <h3 className="mt-5 mb-1 text-[1.0625rem] font-semibold">{t('Personal records')}</h3>
      {records.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('Log a few days to set your first records.')}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {records.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block text-sm">{r.title}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {r.id === 'week'
                    ? t('Week of {v1}', { v1: shortDate(r.on) })
                    : r.id === 'month'
                      ? monthName(monthKey(r.on))
                      : formatDay(r.on, today)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-sm font-bold">
                {r.isNew && (
                  <span className="rounded-full bg-[#ff9500] px-1.5 py-0.5 text-[0.625rem] font-bold text-white">
                    {t('NEW')}
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
          <h3 className="mt-5 mb-1 text-[1.0625rem] font-semibold">{t('Recent')}</h3>
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
        {showAll ? t('Hide all medals') : t('All medals')}
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

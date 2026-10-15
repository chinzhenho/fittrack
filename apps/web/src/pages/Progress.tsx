import { addDays, trendOn } from '@fittrack/engine';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { TREND_MIN_POINTS, WeightChart } from '../components/Charts';
import { useToast } from '../components/Toast';
import { Achievements, Overview, Section, WeekBars } from '../components/ProgressParts';
import { Bar, Button, Field, inputClass, PageTitle } from '../components/ui';
import {
  acceptChallenge,
  addTarget,
  dismissInsight,
  keepTarget,
  removeWeight,
  setWeightOn,
} from '../data/actions';
import { newId, update, useAppState } from '../data/store';
import type { AppState, Profile } from '../data/types';
import { formatDay, localToday, shortDate } from '../lib/dates';
import { fmt1, fmtInt } from '../lib/format';
import {
  activeChallenge,
  challengeProgress,
  challengeRecord,
  CHALLENGES,
  habitWeek,
  isChallengeId,
  STATUS_LABELS,
  suggestedChallenges,
  type ChallengeId,
  type HabitStatus,
} from '../logic/habits';
import { CATEGORY_LABELS, insightKey, insightsFor, type Insight } from '../logic/insights';
import {
  adaptiveFor,
  latestWeight,
  macrosForAdaptive,
  startWeightKg,
  targetOn,
  trendPoints,
} from '../logic/targets';
import { mondayOf, weeklySummary, WEEKLY_LOG_GOAL } from '../logic/weekly';

const REFUSAL_TEXT: Record<string, string> = {
  window_too_short:
    'In the first 14 days of a goal, weight changes are mostly water, so we wait until after that.',
  not_enough_complete_logs:
    'At least 80% of days in the last 3 weeks need to be marked fully logged.',
  not_enough_weigh_ins: 'At least 10 weigh-ins in the last 3 weeks.',
  no_trend_at_window_start: 'A weigh-in from before the review period.',
};

const REASON_LABELS = {
  initial: 'Initial',
  profile_change: 'Profile update',
  adaptive: 'Adjusted',
};

const WEEKDAY_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const md = (d: string) => shortDate(d);
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${fmt1(Math.abs(n))}`;

function Chips<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="flex shrink-0 gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-700"
      role="group"
      aria-label={label}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-8 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap transition ${value === o.value ? 'bg-white text-emerald-900 shadow-sm dark:bg-slate-900 dark:text-emerald-100' : 'text-slate-600 dark:text-slate-300'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-slate-700/60">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-xl font-black tracking-tight">{value}</p>
      {note && (
        <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">{note}</p>
      )}
    </div>
  );
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function Progress() {
  const s = useAppState();
  const today = useMemo(() => localToday(), []);
  const { hash } = useLocation();
  // Links such as /progress#weights land on that section.
  useEffect(() => {
    if (!hash) return;
    const t = setTimeout(() => scrollToId(hash.slice(1)), 50);
    return () => clearTimeout(t);
  }, [hash]);
  const profile = s.profile;
  if (!profile) return null;
  const hide = profile.hideNumbers;

  return (
    <div className="space-y-4">
      <PageTitle sub="Every step counts. Find the pace that works for you.">Progress</PageTitle>
      {hide && (
        <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          🙈 You've hidden calorie and weight numbers, so only habits and logging are shown. Turn
          them back on in{' '}
          <Link to="/me" className="font-semibold text-emerald-strong dark:text-emerald">
            Me
          </Link>
          .
        </p>
      )}
      <Overview s={s} today={today} />
      {!hide && <BodySection s={s} profile={profile} today={today} />}
      <WeeklySection s={s} today={today} hide={hide} />
      <Achievements s={s} today={today} hide={hide} />
      <HabitsSection s={s} today={today} />
      <NextStepSection s={s} today={today} />
      <InsightsSection s={s} today={today} />
      {!hide && <AdjustSection s={s} profile={profile} today={today} />}
      {!hide && <WeightHistorySection s={s} today={today} />}
    </div>
  );
}

function WeeklySection({ s, today, hide }: { s: AppState; today: string; hide: boolean }) {
  const thisWeek = mondayOf(today);
  const weeks = Array.from({ length: 12 }, (_, i) => addDays(thisWeek, (i - 11) * 7));
  const [week, setWeek] = useState(thisWeek);
  const start = week;
  const end = addDays(week, 6) < today ? addDays(week, 6) : today;
  const w = weeklySummary(s, start, end);
  const pct = Math.round((w.loggedDays / w.dayCount) * 100);
  const goalWord =
    s.profile &&
    (s.profile.goal === 'fat_loss' ? 'loss' : s.profile.goal === 'maintain' ? 'keep' : 'gain');

  return (
    <Section
      id="summary"
      icon="calendar"
      tint="bg-[#5ac8fa]"
      title="Weekly trend"
      sub={`${md(start)} – ${md(end)}${week === thisWeek ? ' (Mon to today)' : ''}`}
    >
      <div className="mb-4">
        <WeekBars s={s} today={today} weeks={weeks} selected={week} onSelect={setWeek} />
      </div>
      {w.loggedDays === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
          <p className="text-2xl" aria-hidden="true">
            🍽️
          </p>
          <p className="mt-1 font-semibold">No food logged in this period</p>
          <p className="mt-1">
            Once you log, your average calories, protein and days on target show here.
          </p>
          <Link
            to="/diary"
            className="mt-3 inline-flex min-h-11 items-center rounded-2xl bg-emerald-strong px-4 font-semibold text-white dark:bg-emerald dark:text-slate-950"
          >
            Log food
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat
              label="Days logged"
              value={
                <>
                  {w.loggedDays}
                  <span className="text-sm font-semibold text-slate-500"> / {w.dayCount}</span>
                </>
              }
              note={`${pct}% of days`}
            />
            <Stat
              label="Fully logged"
              value={
                <>
                  {w.completeDays}
                  <span className="text-sm font-semibold text-slate-500"> days</span>
                </>
              }
              note="Marked as fully logged"
            />
            {!hide && (
              <Stat
                label="Avg calories"
                value={
                  <>
                    {fmtInt(w.avgKcal ?? 0)}
                    <span className="text-sm font-semibold text-slate-500"> kcal</span>
                  </>
                }
                note={
                  w.targetKcal !== null
                    ? `Over ${w.loggedDays} logged days · target ${fmtInt(w.targetKcal)}`
                    : `Over ${w.loggedDays} logged days`
                }
              />
            )}
            {!hide && (
              <Stat
                label="Avg protein"
                value={
                  <>
                    {fmtInt(w.avgProteinG ?? 0)}
                    <span className="text-sm font-semibold text-slate-500"> g</span>
                  </>
                }
                note={w.targetProteinG !== null ? `Target ${w.targetProteinG} g` : undefined}
              />
            )}
            <Stat
              label="Protein on target"
              value={
                w.proteinJudgedDays > 0 ? (
                  <>
                    {w.proteinMetDays}
                    <span className="text-sm font-semibold text-slate-500">
                      {' '}
                      / {w.proteinJudgedDays} days
                    </span>
                  </>
                ) : (
                  '—'
                )
              }
              note={w.proteinJudgedDays > 0 ? 'Fully logged days only' : 'Needs fully logged days'}
            />
            {!hide && (
              <Stat
                label="Calories on target"
                value={
                  w.completeDays > 0 ? (
                    <>
                      {w.withinTargetDays}
                      <span className="text-sm font-semibold text-slate-500">
                        {' '}
                        / {w.completeDays} days
                      </span>
                    </>
                  ) : (
                    '—'
                  )
                }
                note="Within ±10% and above the safety floor"
              />
            )}
          </div>
          {!hide && (
            <p className="mt-3 rounded-2xl bg-emerald-50/70 px-3 py-2.5 text-sm text-emerald-950 dark:bg-emerald/10 dark:text-emerald-50">
              ⚖️{' '}
              {w.weight ? (
                <>
                  Weight {md(w.weight.firstDate)} {fmt1(w.weight.first)} kg →{' '}
                  {md(w.weight.lastDate)} {fmt1(w.weight.last)} kg (
                  <strong>{signed(w.weight.change)} kg</strong>)
                  {goalWord !== 'keep' && Math.abs(w.weight.change) >= 0.1 && (
                    <span className="block text-xs text-emerald-900/70 dark:text-emerald-50/70">
                      Changes within a week are often water. See "Body changes" below for the
                      long-term trend.
                    </span>
                  )}
                </>
              ) : w.weighIns === 1 ? (
                'One weigh-in in this period. Weigh in once more to see a change.'
              ) : (
                'No weigh-ins in this period.'
              )}
            </p>
          )}
          {w.loggedDays < WEEKLY_LOG_GOAL && w.dayCount >= WEEKLY_LOG_GOAL && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Fewer than {WEEKLY_LOG_GOAL} days logged, so averages are only a rough guide.
            </p>
          )}
          <details className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <summary className="cursor-pointer font-semibold">How is this calculated?</summary>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 leading-relaxed">
              <li>Averages only use days with logs; days without logs never count as 0.</li>
              <li>
                Protein and calorie range only use days marked fully logged, so a day with just one
                snack logged does not skew results.
              </li>
              <li>
                "On target" means 90%–110% of your daily target and above the safety floor; eating
                too little never counts.
              </li>
              <li>Weeks start on Monday, using your phone's date.</li>
            </ul>
          </details>
        </>
      )}
    </Section>
  );
}

function BodySection({ s, profile, today }: { s: AppState; profile: Profile; today: string }) {
  const [range, setRange] = useState<'7' | '30' | '90'>('30');
  const points = trendPoints(s.weights);
  const latest = latestWeight(s.weights);
  const start = startWeightKg(s);
  const goalKg = profile.targetWeightKg;
  const goal = profile.goal;

  const action = (
    <Chips
      label="Chart range"
      value={range}
      onChange={setRange}
      options={(['7', '30', '90'] as const).map((r) => ({ value: r, label: `${r} days` }))}
    />
  );

  if (!latest) {
    return (
      <Section id="body" tint="bg-[#ff2d55]" icon="trend" title="Body changes">
        <div className="rounded-2xl bg-slate-50 p-5 text-center dark:bg-slate-700/60">
          <p className="text-3xl" aria-hidden="true">
            ⚖️
          </p>
          <p className="mt-2 font-semibold">Log your first weight to start seeing changes.</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Weigh in the morning, after the toilet and before breakfast, for the most accurate
            reading.
          </p>
          <Button className="mt-3" onClick={() => scrollToId('weights')}>
            + Log weight
          </Button>
        </div>
      </Section>
    );
  }

  const change = start !== null ? latest.weightKg - start : null;
  let changeText = '';
  if (change !== null) {
    if (Math.abs(change) < 0.05) changeText = 'Same as start';
    else if (goal === 'fat_loss')
      changeText = change < 0 ? `Lost ${fmt1(-change)} kg` : `+${fmt1(change)} kg since start`;
    else if (goal === 'maintain') changeText = `${signed(change)} kg since start`;
    else changeText = change > 0 ? `Gained ${fmt1(change)} kg` : `−${fmt1(-change)} kg since start`;
  }
  const toGoal = goalKg !== undefined && goal !== 'maintain' ? goalKg - latest.weightKg : null;
  const reached = toGoal !== null && (goal === 'fat_loss' ? toGoal >= 0 : toGoal <= 0);

  return (
    <Section id="body" tint="bg-[#ff2d55]" icon="trend" title="Body changes" action={action}>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-slate-50 px-2 py-2 dark:bg-slate-700/60">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Start</p>
          <p className="font-black">{start !== null ? `${fmt1(start)} kg` : '—'}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-2 py-2 dark:bg-emerald/15">
          <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">Latest</p>
          <p className="font-black">{fmt1(latest.weightKg)} kg</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-2 py-2 dark:bg-slate-700/60">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Goal</p>
          <p className="font-black">
            {goal === 'maintain'
              ? 'Maintain'
              : goalKg !== undefined
                ? `${fmt1(goalKg)} kg`
                : 'Not set'}
          </p>
        </div>
      </div>
      <p className="mb-3 text-sm text-slate-700 dark:text-slate-200">
        {changeText && <strong>{changeText}</strong>}
        {toGoal !== null &&
          (reached ? (
            <span> · 🎉 Goal weight reached</span>
          ) : (
            <span> · {fmt1(Math.abs(toGoal))} kg to go</span>
          ))}
        <span className="block text-xs text-slate-500 dark:text-slate-400">
          Latest weigh-in: {formatDay(latest.date, today)}
        </span>
      </p>
      {points.length < 2 ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
          Log one more weigh-in to draw your trend.
        </p>
      ) : (
        <>
          <WeightChart
            points={points}
            end={today}
            days={Number(range)}
            startKg={start}
            goalKg={goal === 'maintain' ? undefined : goalKg}
          />
          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Each dot is a weigh-in (tap one to see it); dashed lines are your start and goal. From{' '}
            {TREND_MIN_POINTS} weigh-ins, a soft wide band shows the smoothed trend, which matters
            more than any single day because weight moves with water and salt.
          </p>
        </>
      )}
    </Section>
  );
}

const TONE_STYLE: Record<Insight['tone'], { icon: string; cls: string }> = {
  good: {
    icon: '🌟',
    cls: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald/30 dark:bg-emerald/10',
  },
  tip: { icon: '💡', cls: 'border-sky-200 bg-sky-50/70 dark:border-sky-500/30 dark:bg-sky-500/10' },
  care: {
    icon: '⚠️',
    cls: 'border-amber-300 bg-amber-50 dark:border-amber-600/50 dark:bg-amber-500/10',
  },
};

function InsightsSection({ s, today }: { s: AppState; today: string }) {
  const toast = useToast();
  const [showAll, setShowAll] = useState(false);
  const list = insightsFor(s, today);
  const shown = showAll ? list : list.slice(0, 3);

  return (
    <Section
      id="insights"
      tint="bg-[#af52de]"
      icon="sparkles"
      title="Your insights"
      sub={`From your logs, ${md(addDays(today, -6))} – ${md(today)}`}
    >
      {list.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
          No new insights right now. Keep logging and we'll tell you when we spot a pattern.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {shown.map((i) => (
            <li key={i.id} className={`rounded-2xl border p-3.5 ${TONE_STYLE[i.tone].cls}`}>
              <div className="flex items-start gap-2.5">
                <span aria-hidden="true" className="text-lg leading-6">
                  {TONE_STYLE[i.tone].icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400">
                    {CATEGORY_LABELS[i.category]}
                  </p>
                  <p className="font-bold">{i.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    {i.body}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">📊 {i.data}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {i.action &&
                      (i.action.to.startsWith('#') ? (
                        <Button
                          variant="secondary"
                          className="min-h-9"
                          onClick={() => scrollToId(i.action!.to.slice(1))}
                        >
                          {i.action.label}
                        </Button>
                      ) : (
                        <Link
                          to={i.action.to}
                          className="inline-flex min-h-9 items-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium dark:border-slate-600 dark:bg-slate-700"
                        >
                          {i.action.label}
                        </Link>
                      ))}
                    <button
                      type="button"
                      className="min-h-9 rounded-2xl px-2 text-xs font-semibold text-slate-500 hover:bg-white/60 dark:text-slate-400 dark:hover:bg-white/10"
                      onClick={() => {
                        update((x) => dismissInsight(x, insightKey(i.id, today)));
                        toast({ text: 'Hidden for this week' });
                      }}
                    >
                      Hide this week
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {list.length > 3 && (
        <Button variant="ghost" className="mt-2 w-full" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Show less' : `See all ${list.length}`}
        </Button>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Insights come from fixed rules applied to your logs. They are guidance, not a medical
        diagnosis. For health concerns, talk to a doctor or dietitian.
      </p>
    </Section>
  );
}

const STATUS_STYLE: Record<HabitStatus, string> = {
  done: 'bg-emerald-500 text-white',
  partial: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-700/60 dark:text-emerald-50',
  none: 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500',
  na: 'bg-transparent text-slate-300 dark:text-slate-600',
  future: 'border border-dashed border-slate-200 dark:border-slate-600',
};
const STATUS_MARK: Record<HabitStatus, string> = {
  done: '✓',
  partial: '½',
  none: '',
  na: '–',
  future: '',
};

function HabitsSection({ s, today }: { s: AppState; today: string }) {
  const week = mondayOf(today);
  const rows = habitWeek(s, week, today);
  const active = activeChallenge(s, week);

  return (
    <Section
      id="habits"
      tint="bg-emerald-500"
      icon="leaf"
      title="Healthy habits"
      sub={`This week, ${md(week)} – ${md(addDays(week, 6))}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[19rem] border-separate border-spacing-1 text-center text-sm">
          <caption className="sr-only">Your habits each day this week</caption>
          <thead>
            <tr>
              <th scope="col" className="text-left text-xs font-semibold text-slate-500">
                <span className="sr-only">Habit</span>
              </th>
              {WEEKDAY_SHORT.map((d, i) => (
                <th
                  key={i}
                  scope="col"
                  className={`text-xs font-semibold ${addDays(week, i) === today ? 'text-emerald-strong dark:text-emerald' : 'text-slate-500'}`}
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.id}>
                <th
                  scope="row"
                  className="pr-1 text-left text-xs font-semibold whitespace-nowrap"
                  title={h.hint}
                >
                  {h.label}
                </th>
                {h.days.map((d) => (
                  <td key={d.date}>
                    <span
                      className={`mx-auto flex size-7 items-center justify-center rounded-lg text-xs font-bold ${STATUS_STYLE[d.status]}`}
                      title={`${md(d.date)} ${STATUS_LABELS[d.status]}`}
                    >
                      <span aria-hidden="true">{STATUS_MARK[d.status]}</span>
                      <span className="sr-only">
                        {md(d.date)} {STATUS_LABELS[d.status]}
                      </span>
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
        {(['done', 'partial', 'none', 'future'] as const).map((k) => (
          <li key={k} className="flex items-center gap-1">
            <span
              aria-hidden="true"
              className={`flex size-4 items-center justify-center rounded text-[9px] font-bold ${STATUS_STYLE[k]}`}
            >
              {STATUS_MARK[k]}
            </span>
            {STATUS_LABELS[k]}
          </li>
        ))}
      </ul>
      <details className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        <summary className="cursor-pointer font-semibold">What counts</summary>
        <ul className="mt-1.5 list-disc space-y-1 pl-4">
          {rows.map((h) => (
            <li key={h.id}>
              <strong>{h.label}</strong>: {h.hint}
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-4 rounded-2xl border border-slate-200 p-3 dark:border-slate-600">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Weekly challenge</p>
        {active && isChallengeId(active.challenge) ? (
          <ChallengeProgress s={s} id={active.challenge} week={week} />
        ) : (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            No challenge this week (optional).{' '}
            <button
              type="button"
              className="font-semibold text-emerald-strong underline-offset-2 hover:underline dark:text-emerald"
              onClick={() => scrollToId('next')}
            >
              Pick one
            </button>
          </p>
        )}
      </div>
    </Section>
  );
}

function ChallengeProgress({ s, id, week }: { s: AppState; id: ChallengeId; week: string }) {
  const p = challengeProgress(s, id, week);
  return (
    <div className="mt-1">
      <p className="flex items-center justify-between gap-2 text-sm font-semibold">
        <span>{CHALLENGES[id].title}</span>
        <span className={p.done ? 'text-emerald-strong dark:text-emerald' : 'text-slate-500'}>
          {p.done ? '✓ Done' : `${p.value} / ${p.max}`}
        </span>
      </p>
      <Bar value={p.value} max={p.max} color="bg-emerald-500" />
    </div>
  );
}

function NextStepSection({ s, today }: { s: AppState; today: string }) {
  const toast = useToast();
  const week = mondayOf(today);
  const active = activeChallenge(s, week);
  const options = suggestedChallenges(s, today);
  const [index, setIndex] = useState(0);
  const daysLeft = 6 - ((new Date(`${today}T00:00:00`).getDay() + 6) % 7);

  if (active && isChallengeId(active.challenge)) {
    const id = active.challenge;
    const p = challengeProgress(s, id, week);
    return (
      <Section
        id="next"
        tint="bg-[#ff9500]"
        icon="target"
        title="Next small goal"
        sub="This week's challenge"
      >
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 dark:from-emerald/15 dark:to-teal-500/10">
          <ChallengeProgress s={s} id={id} week={week} />
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {p.done
              ? '🎉 Challenge complete! You can pick a new one next Monday.'
              : `${CHALLENGES[id].why} ${daysLeft + 1} ${daysLeft === 0 ? 'day' : 'days'} left (until Sunday).`}
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => scrollToId('habits')}>
            See progress
          </Button>
          {!p.done && (
            <Button
              variant="ghost"
              onClick={() => {
                update((x) => acceptChallenge(x, challengeRecord(id, week, true)));
                setIndex(0);
                toast({ text: 'Challenge dropped. You can pick another.' });
              }}
            >
              Try another
            </Button>
          )}
        </div>
      </Section>
    );
  }

  if (options.length === 0) {
    return (
      <Section id="next" tint="bg-[#ff9500]" icon="target" title="Next small goal">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          🎉 You've already met every challenge this week. Come back on Monday for a new one.
        </p>
      </Section>
    );
  }

  const id = options[index % options.length]!;
  const p = challengeProgress(s, id, week);
  return (
    <Section
      id="next"
      tint="bg-[#ff9500]"
      icon="target"
      title="Next small goal"
      sub="Picked from the habit that needs the most help"
    >
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 dark:from-emerald/15 dark:to-teal-500/10">
        <p className="text-lg font-black">{CHALLENGES[id].title}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{CHALLENGES[id].why}</p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          So far this week {p.value} / {p.max} · ends Sunday, change any time
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          onClick={() => {
            update((x) => acceptChallenge(x, challengeRecord(id, week)));
            toast({ text: 'Challenge started! Progress updates from your logs.' });
          }}
        >
          Start challenge
        </Button>
        <Button
          variant="secondary"
          disabled={options.length < 2}
          onClick={() => setIndex((i) => i + 1)}
        >
          Try another
        </Button>
      </div>
    </Section>
  );
}

function AdjustSection({ s, profile, today }: { s: AppState; profile: Profile; today: string }) {
  const toast = useToast();
  const target = targetOn(s.targets, today);
  if (!target) return null;
  const adaptive = adaptiveFor(s, today);
  const lastAdaptive = s.targets.filter((t) => t.reason === 'adaptive').at(-1);
  const cooldown = lastAdaptive !== undefined && lastAdaptive.effectiveFrom > addDays(today, -14);
  const keptOn = [...s.adaptiveKeptOn].sort().at(-1);
  const kept = keptOn !== undefined && keptOn > addDays(today, -14);

  let body: ReactNode;
  if (cooldown) {
    body = (
      <p className="text-sm">
        Your target was last adjusted on {formatDay(lastAdaptive.effectiveFrom, today)}. A new
        target takes about two weeks to show its effect, so we'll review again after{' '}
        {formatDay(addDays(lastAdaptive.effectiveFrom, 14), today)}.
      </p>
    );
  } else if (!adaptive?.ok) {
    body = (
      <div className="space-y-2 text-sm">
        <p>We need more logs to reliably estimate what you burn. Still needed:</p>
        <ul className="list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-200">
          {(adaptive && !adaptive.ok ? adaptive.reasons : []).map((r) => (
            <li key={r}>{REFUSAL_TEXT[r]}</li>
          ))}
        </ul>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Until then, your formula-based target of {fmtInt(target.caloriesKcal)} kcal stays.
        </p>
      </div>
    );
  } else if (adaptive.proposedTargetKcal === target.caloriesKcal) {
    body = (
      <p className="text-sm">
        ✓ Based on your logs from {md(adaptive.windowStart)} – {md(adaptive.windowEnd)}, your
        current target of {fmtInt(target.caloriesKcal)} kcal fits. No change needed.
      </p>
    );
  } else if (kept) {
    body = (
      <p className="text-sm">
        You chose to keep your target of {fmtInt(target.caloriesKcal)} kcal on{' '}
        {formatDay(keptOn, today)}. We'll suggest again after{' '}
        {formatDay(addDays(keptOn, 14), today)}.
      </p>
    );
  } else {
    const up = adaptive.proposedTargetKcal > target.caloriesKcal;
    const floored = adaptive.proposedTargetKcal <= target.calorieFloorKcal;
    body = (
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-center gap-3 rounded-2xl bg-slate-50 py-3 dark:bg-slate-700/60">
          <div className="text-center">
            <p className="text-xs text-slate-500">Now</p>
            <p className="text-lg font-black">{fmtInt(target.caloriesKcal)}</p>
          </div>
          <span aria-hidden="true" className="text-xl text-slate-400">
            →
          </span>
          <div className="text-center">
            <p className="text-xs text-slate-500">Suggested</p>
            <p className="text-lg font-black text-emerald-strong dark:text-emerald">
              {fmtInt(adaptive.proposedTargetKcal)}
            </p>
          </div>
          <span className="text-xs text-slate-500">kcal / day</span>
        </div>
        <p>
          From {md(adaptive.windowStart)} – {md(adaptive.windowEnd)} ({adaptive.windowDays} days),
          your fully logged days averaged {fmtInt(adaptive.meanIntakeKcal)} kcal and your trend
          weight changed {signed(adaptive.trendChangeKg)} kg. That suggests you burn about{' '}
          {fmtInt(adaptive.observedTdeeKcal)} kcal, so we suggest {up ? 'raising' : 'lowering'} your
          target.
        </p>
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          This is an estimate: missed foods, water changes or hormonal cycles all affect it.{' '}
          {floored &&
            `It is set at your safety floor of ${fmtInt(target.calorieFloorKcal)} kcal and won't go lower. `}
          Your target only changes if you tap "Use suggestion", and the old one stays in your
          history.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => {
              const weightKg = trendOn(trendPoints(s.weights), today) ?? target.weightKg;
              const m = macrosForAdaptive(profile, adaptive.proposedTargetKcal, weightKg);
              update((x) =>
                addTarget(x, {
                  ...target,
                  id: newId(),
                  effectiveFrom: today,
                  createdAt: new Date().toISOString(),
                  reason: 'adaptive',
                  tdeeKcal: adaptive.newTdeeKcal,
                  caloriesKcal: adaptive.proposedTargetKcal,
                  proteinG: m.proteinG,
                  carbsG: m.carbsG,
                  fatG: m.fatG,
                  weightKg,
                  clamps: m.clamps,
                }),
              );
              toast({
                text: `Done. Your new daily target is ${fmtInt(adaptive.proposedTargetKcal)} kcal`,
              });
            }}
          >
            Use suggestion
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              update((x) => keepTarget(x, today));
              toast({ text: "Target kept. We'll review again in two weeks." });
            }}
          >
            Keep current target
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Section
      id="adjust"
      tint="bg-slate-400"
      icon="sliders"
      title="Target suggestion"
      sub="Fine-tunes calories from your real logs; you decide"
    >
      {body}
    </Section>
  );
}

function WeightHistorySection({ s, today }: { s: AppState; today: string }) {
  const toast = useToast();
  const [w, setW] = useState('');
  const [waist, setWaist] = useState('');
  const [wDate, setWDate] = useState(today);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resetForm = () => {
    setEditingId(null);
    setWDate(today);
    setW('');
    setWaist('');
  };
  const kg = Number(w);
  const waistCm = Number(waist);
  const valid =
    wDate !== '' &&
    wDate <= today &&
    w.trim() !== '' &&
    kg >= 30 &&
    kg <= 300 &&
    (waist.trim() === '' || (waistCm >= 40 && waistCm <= 250));
  const entries = [...s.weights].sort(
    (a, b) => b.date.localeCompare(a.date) || b.measuredAt.localeCompare(a.measuredAt),
  );

  return (
    <Section
      id="weights"
      tint="bg-[#5856d6]"
      icon="scale"
      title="Weight log"
      sub="Add past days, edit or delete"
    >
      <form
        className="space-y-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-700/40"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          const old = s.weights.find((x) => x.id === editingId);
          const entry = {
            id: editingId ?? newId(),
            date: wDate,
            // Past days get a morning timestamp; only "first reading of the day" matters.
            measuredAt:
              wDate === today
                ? new Date().toISOString()
                : new Date(`${wDate}T07:00:00`).toISOString(),
            weightKg: kg,
            ...(waist.trim() !== '' && { waistCm }),
          };
          update((x) => setWeightOn(old ? removeWeight(x, old.id) : x, entry));
          toast({ text: editingId ? 'Updated' : `Weight saved for ${formatDay(wDate, today)}` });
          resetForm();
        }}
      >
        <p className="text-sm font-bold">{editingId ? 'Edit weigh-in' : '+ New weigh-in'}</p>
        <Field label="Date">
          {(p) => (
            <input
              {...p}
              type="date"
              max={today}
              value={wDate}
              onChange={(e) => setWDate(e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Weight (kg)">
            {(p) => (
              <input
                {...p}
                ref={inputRef}
                type="number"
                inputMode="decimal"
                step="0.1"
                value={w}
                onChange={(e) => setW(e.target.value)}
                className={inputClass}
              />
            )}
          </Field>
          <Field label="Waist (cm, optional)">
            {(p) => (
              <input
                {...p}
                type="number"
                inputMode="decimal"
                step="0.1"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                className={inputClass}
              />
            )}
          </Field>
        </div>
        {w.trim() !== '' && (kg < 30 || kg > 300) && (
          <p className="text-xs text-red-700 dark:text-red-400">Weight must be 30–300 kg.</p>
        )}
        {!editingId && w.trim() !== '' && s.weights.some((x) => x.date === wDate) && (
          <p className="text-xs text-amber-800 dark:text-amber-300">
            This day already has a weigh-in; saving will replace it.
          </p>
        )}
        <div className="flex gap-2">
          {editingId && (
            <Button variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
          )}
          <Button type="submit" className="flex-1" disabled={!valid}>
            {editingId ? 'Save changes' : 'Save'}
          </Button>
        </div>
      </form>

      {entries.length === 0 ? (
        <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
          No weigh-ins yet.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-700">
          {entries.slice(0, showAll ? undefined : 7).map((e) => (
            <li key={e.id} className="flex items-center gap-2 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {fmt1(e.weightKg)} kg
                  {e.waistCm !== undefined && (
                    <span className="font-normal text-slate-600 dark:text-slate-300">
                      {' '}
                      · waist {fmt1(e.waistCm)} cm
                    </span>
                  )}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {formatDay(e.date, today)}
                </span>
              </span>
              <Button
                variant="ghost"
                className="min-h-9 px-3"
                aria-label={`Edit weight for ${e.date}`}
                onClick={() => {
                  setEditingId(e.id);
                  setWDate(e.date);
                  setW(String(e.weightKg));
                  setWaist(e.waistCm !== undefined ? String(e.waistCm) : '');
                  scrollToId('weights');
                  inputRef.current?.focus({ preventScroll: true });
                }}
              >
                Edit
              </Button>
              <button
                type="button"
                aria-label={`Delete weigh-in for ${e.date}`}
                className="flex size-10 items-center justify-center rounded-2xl text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                onClick={() => {
                  update((x) => removeWeight(x, e.id));
                  if (editingId === e.id) resetForm();
                  toast({
                    text: `Deleted weigh-in for ${formatDay(e.date, today)}`,
                    actionLabel: 'Undo',
                    onAction: () => update((x) => setWeightOn(x, e)),
                  });
                }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {entries.length > 7 && (
        <Button variant="ghost" className="w-full" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Show less' : `Show all ${entries.length}`}
        </Button>
      )}

      <details className="mt-3 rounded-2xl border border-slate-100 px-3 dark:border-slate-700">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between text-sm font-semibold">
          Daily target history ({s.targets.length})
          <span className="text-xs font-normal text-slate-500">Show</span>
        </summary>
        <ul className="space-y-1.5 pb-3 text-sm">
          {[...s.targets]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((t) => (
              <li key={t.id} className="flex justify-between gap-3">
                <span>{t.effectiveFrom}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {REASON_LABELS[t.reason]}
                </span>
                <span className="font-semibold">{fmtInt(t.caloriesKcal)} kcal</span>
              </li>
            ))}
        </ul>
      </details>
    </Section>
  );
}

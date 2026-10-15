import { addDays, trendOn } from '@fittrack/engine';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { WeightChart } from '../components/Charts';
import { useToast } from '../components/Toast';
import { Achievements, Section } from '../components/ProgressParts';
import { ThisWeek } from '../components/ThisWeek';
import { Button, InputRow, List, PageTitle } from '../components/ui';
import { addTarget, dismissInsight, keepTarget, removeWeight, setWeightOn } from '../data/actions';
import { newId, update, useAppState } from '../data/store';
import type { AppState, Profile } from '../data/types';
import { formatDay, localToday, shortDate } from '../lib/dates';
import { fmt1, fmtInt } from '../lib/format';
import { CATEGORY_LABELS, insightKey, insightsFor, type Insight } from '../logic/insights';
import {
  adaptiveFor,
  latestWeight,
  macrosForAdaptive,
  startWeightKg,
  targetOn,
  trendPoints,
} from '../logic/targets';

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
      <PageTitle sub="How your week went, your weight and what you've achieved.">
        Progress
      </PageTitle>
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
      <ThisWeek s={s} today={today} hide={hide} />
      {!hide && <BodySection s={s} profile={profile} today={today} />}
      <Achievements s={s} today={today} hide={hide} />
      <InsightsSection s={s} today={today} />
      {!hide && <AdjustSection s={s} profile={profile} today={today} />}
      {!hide && <WeightHistorySection s={s} today={today} />}
    </div>
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
      <Section id="body" tint="bg-[#ff2d55]" icon="trend" title="Your weight">
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
    <Section id="body" tint="bg-[#ff2d55]" icon="trend" title="Your weight" action={action}>
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
            Each dot is a weigh-in (tap one to see it); the dashed lines are your start and goal.
            Weight goes up and down a little every day with water and salt, so look at the direction
            over a few weeks, not one day.
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
  // Shown only when there is something to say.
  if (list.length === 0) return null;

  return (
    <Section
      id="insights"
      tint="bg-[#af52de]"
      icon="sparkles"
      title="Tips for you"
      sub="Based on your last 7 days"
    >
      {
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
      }
      {list.length > 3 && (
        <Button variant="ghost" className="mt-2 w-full" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Show less' : `See all ${list.length}`}
        </Button>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Tips come from simple rules applied to your own logs. They are not medical advice; for
        health concerns, talk to a doctor or dietitian.
      </p>
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

  // Shown only once there is a result: while data is still building up, after the user
  // chose to keep the target, or right after a change, there is nothing to act on.
  if (cooldown || kept || !adaptive?.ok) return null;

  let body: ReactNode;
  if (adaptive.proposedTargetKcal === target.caloriesKcal) {
    body = (
      <p className="text-sm">
        ✓ Based on your logs from {md(adaptive.windowStart)} – {md(adaptive.windowEnd)}, your
        current target of {fmtInt(target.caloriesKcal)} kcal fits. No change needed.
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
          your complete days averaged {fmtInt(adaptive.meanIntakeKcal)} kcal and your trend weight
          changed {signed(adaptive.trendChangeKg)} kg. That suggests you burn about{' '}
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
      title="Calorie target check"
      sub="Is your daily calorie target right for you?"
    >
      {body}
    </Section>
  );
}

function WeightHistorySection({ s, today }: { s: AppState; today: string }) {
  const toast = useToast();
  const yesterday = addDays(today, -1);
  const [formOpen, setFormOpen] = useState(false);
  const [w, setW] = useState('');
  const [waist, setWaist] = useState('');
  const [wDate, setWDate] = useState(yesterday);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resetForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setWDate(yesterday);
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
  const shown = entries.slice(0, showAll ? undefined : 10);
  const goal = s.profile?.goal;
  const dir = goal === 'fat_loss' ? -1 : goal === 'maintain' ? 0 : 1;
  // Group rows under month headings, newest first.
  const months: { month: string; rows: typeof shown }[] = [];
  for (const e of shown) {
    const m = e.date.slice(0, 7);
    if (months.at(-1)?.month !== m) months.push({ month: m, rows: [] });
    months.at(-1)!.rows.push(e);
  }

  return (
    <Section
      id="weights"
      tint="bg-[#5856d6]"
      icon="scale"
      title="Weight log"
      sub="All your weigh-ins"
    >
      {!s.weights.some((x) => x.date === today) && (
        <p className="mb-3 rounded-[14px] bg-[#5856d6]/[0.07] px-3 py-2.5 text-sm dark:bg-[#7d7aff]/15">
          Today&apos;s weight goes on the{' '}
          <Link to="/today" className="font-semibold text-[#5856d6] dark:text-[#a5a3ff]">
            Today page ›
          </Link>
        </p>
      )}

      {formOpen ? (
        <form
          className="mb-3 space-y-3"
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
          <List nested title={editingId ? 'Edit weigh-in' : 'Add a past weigh-in'}>
            <InputRow
              label="Date"
              type="date"
              max={today}
              value={wDate}
              onChange={(e) => setWDate(e.target.value)}
            />
            <InputRow
              ref={inputRef}
              label="Weight"
              unit="kg"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="0.0"
              value={w}
              onChange={(e) => setW(e.target.value)}
            />
            <InputRow
              label="Waist"
              unit="cm"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="Optional"
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
            />
          </List>
          {w.trim() !== '' && (kg < 30 || kg > 300) && (
            <p className="text-xs text-red-700 dark:text-red-400">Weight must be 30–300 kg.</p>
          )}
          {!editingId && w.trim() !== '' && s.weights.some((x) => x.date === wDate) && (
            <p className="text-xs text-amber-800 dark:text-amber-300">
              This day already has a weigh-in; saving will replace it.
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!valid}>
              {editingId ? 'Save changes' : 'Save'}
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant="secondary"
          className="mb-3 w-full"
          onClick={() => {
            setFormOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          + Add a past weigh-in
        </Button>
      )}

      {entries.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
          No weigh-ins yet.
        </p>
      ) : (
        months.map(({ month, rows }) => (
          <div key={month}>
            <h3 className="mt-2 text-[0.8125rem] text-slate-500 uppercase dark:text-slate-400">
              {monthLabel(month)}
            </h3>
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {rows.map((e) => {
                const prev = entries[entries.indexOf(e) + 1];
                const diff = prev ? Math.round((e.weightKg - prev.weightKg) * 10) / 10 : null;
                const good = diff !== null && dir !== 0 && diff * dir > 0;
                return (
                  <li key={e.id} className="flex items-center gap-2 py-2.5 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block">{formatDay(e.date, today)}</span>
                      {e.waistCm !== undefined && (
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          Waist {fmt1(e.waistCm)} cm
                        </span>
                      )}
                    </span>
                    <span className="text-right">
                      <span className="block font-semibold">{fmt1(e.weightKg)} kg</span>
                      {diff !== null && diff !== 0 && (
                        <span
                          className={`block text-xs ${good ? 'text-emerald-strong dark:text-emerald' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                          {signed(diff)} kg
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      aria-label={`Edit weight for ${e.date}`}
                      className="min-h-9 rounded-full px-2.5 text-sm text-emerald-strong hover:bg-emerald-50 dark:text-emerald dark:hover:bg-emerald/10"
                      onClick={() => {
                        setEditingId(e.id);
                        setWDate(e.date);
                        setW(String(e.weightKg));
                        setWaist(e.waistCm !== undefined ? String(e.waistCm) : '');
                        setFormOpen(true);
                        scrollToId('weights');
                        setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete weigh-in for ${e.date}`}
                      className="flex size-9 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-[#ff3b30] dark:hover:bg-red-950"
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
                );
              })}
            </ul>
          </div>
        ))
      )}
      {entries.length > 10 && (
        <Button variant="ghost" className="mt-1 w-full" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Show less' : `Show all ${entries.length}`}
        </Button>
      )}
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Daily target history is in{' '}
        <Link to="/me/targets" className="font-semibold text-emerald-strong dark:text-emerald">
          Me → Daily nutrition targets
        </Link>
        .
      </p>
    </Section>
  );
}

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const monthLabel = (m: string) => `${MONTHS_LONG[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

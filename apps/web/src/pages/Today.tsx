import { bmi, bmiCategory, trendOn, type BmiCategory } from '@fittrack/engine';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { FoodThumb, Glyph } from '../components/Icons';
import { MEAL_STYLE } from '../components/mealStyle';
import { SnapButton } from '../components/SnapButton';
import { Bar, Button, Card, Notice } from '../components/ui';
import { WaterCard } from '../components/WaterCard';
import { addTarget, setWeightOn } from '../data/actions';
import { useAuth } from '../data/auth';
import { newId, update, useAppState } from '../data/store';
import { localToday } from '../lib/dates';
import { fmt1, fmtInt } from '../lib/format';
import {
  calorieGap,
  MEAL_LABELS,
  MEAL_TYPES,
  mealForHour,
  mealsOn,
  sumNutrients,
} from '../logic/nutrition';
import {
  latestWeight,
  needsRecompute,
  planFor,
  startWeightKg,
  targetFromPlan,
  targetOn,
  trendPoints,
} from '../logic/targets';

/** Malaysia CPG Management of Obesity (2023) Asian cut-offs, in neutral wording. */
const BMI_TEXT: Record<BmiCategory, string> = {
  underweight: 'Underweight',
  normal: 'Healthy',
  overweight: 'Overweight',
  obese: 'Obese',
};

export function Today() {
  const s = useAppState();
  const today = useMemo(() => localToday(), []);
  const [weighing, setWeighing] = useState(false);
  const auth = useAuth();
  const profile = s.profile;
  const target = targetOn(s.targets, today);
  if (!profile || !target) return null;

  const todayMeals = mealsOn(s.meals, today);
  const eaten = sumNutrients(todayMeals);
  const hide = profile.hideNumbers;
  const gap = calorieGap(profile.goal, eaten.kcal, target.caloriesKcal);
  const trend = trendOn(trendPoints(s.weights), today);

  const recompute = () => {
    const w = trend ?? latestWeight(s.weights)?.weightKg;
    if (w === undefined) return;
    const r = planFor(profile, w, today);
    if (!r.ok) return;
    const now = new Date().toISOString();
    update((x) =>
      addTarget(
        x,
        targetFromPlan(
          r.plan,
          { id: newId(), effectiveFrom: today, createdAt: now, reason: 'profile_change' },
          w,
        ),
      ),
    );
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 5
      ? 'Up late'
      : hour < 12
        ? 'Good morning'
        : hour < 18
          ? 'Good afternoon'
          : 'Good evening';
  const nextMeal = mealForHour(hour);
  const initial =
    profile.avatar ??
    (auth.status === 'signedIn' ? (auth.user.email?.[0] ?? '🙂').toUpperCase() : '🙂');

  // Weight card: the latest weigh-in, the very first weight as the start, BMI from height.
  const current = latestWeight(s.weights)?.weightKg ?? null;
  const startKg = startWeightKg(s);
  const goalKg = profile.targetWeightKg;
  const losing = profile.goal === 'fat_loss';
  const change = current !== null && startKg !== null ? current - startKg : null;
  const bmiValue = current !== null ? bmi(current, profile.heightCm) : null;
  const toGoal =
    current !== null && startKg !== null && goalKg !== undefined && startKg !== goalKg
      ? Math.min(1, Math.max(0, (startKg - current) / (startKg - goalKg)))
      : null;
  const reached =
    current !== null && goalKg !== undefined && (losing ? current <= goalKg : current >= goalKg);
  const todayEntry = s.weights.find((w) => w.date === today);
  // Today's weigh-in replaces any earlier one from today (only one per day counts).
  const saveToday = (kg: number) =>
    update((x) =>
      setWeightOn(x, {
        id: todayEntry?.id ?? newId(),
        date: today,
        measuredAt: new Date().toISOString(),
        weightKg: kg,
      }),
    );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 pt-2">
        <div className="min-w-0">
          <p className="text-[0.8125rem] font-semibold text-slate-500 uppercase dark:text-slate-400">
            {new Date().toLocaleDateString('en-MY', {
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </p>
          <h1 className="text-[2.125rem] leading-tight font-bold">
            {greeting}
            {profile.nickname ? `, ${profile.nickname}` : ''}
          </h1>
        </div>
        <Link
          to="/me"
          aria-label="Me"
          className="mb-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200"
        >
          {initial}
        </Link>
      </div>

      {needsRecompute(s, today) && (
        <Notice title="Your weight trend has moved 2 kg or more">
          You can recalculate your daily target from your latest trend weight.
          <div className="mt-3">
            <Button onClick={recompute}>Recalculate target</Button>
          </div>
        </Notice>
      )}

      {/* Weight & BMI (Apple Health style summary card) */}
      {!hide && (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-[0.9375rem] font-semibold text-[#5856d6] dark:text-[#7d7aff]">
              <Glyph name="scale" className="size-[18px]" /> Weight & BMI
            </p>
            <Link
              to="/progress#weights"
              className="shrink-0 text-[0.9375rem] text-[#5856d6] hover:opacity-70 dark:text-[#a5a3ff]"
            >
              History ›
            </Link>
          </div>

          <div className="mt-3 grid grid-cols-3 items-end gap-2">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Current</p>
              <p className="flex items-baseline gap-1">
                <span className="text-[2rem] leading-none font-bold">
                  {current !== null ? fmt1(current) : '—'}
                </span>
                <span className="text-sm font-semibold text-slate-500">kg</span>
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">BMI</p>
              <p className="text-xl leading-tight font-bold">
                {bmiValue !== null ? fmt1(bmiValue) : '—'}
              </p>
              {bmiValue !== null && (
                <p className="text-[0.6875rem] font-semibold text-slate-500 dark:text-slate-400">
                  {BMI_TEXT[bmiCategory(bmiValue)]}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">Target</p>
              {goalKg !== undefined ? (
                <p className="flex items-baseline justify-end gap-1">
                  <span className="text-xl font-bold">{fmt1(goalKg)}</span>
                  <span className="text-sm font-semibold text-slate-500">kg</span>
                </p>
              ) : (
                <Link
                  to="/me/profile"
                  className="text-sm font-semibold text-emerald-strong dark:text-emerald"
                >
                  Set
                </Link>
              )}
            </div>
          </div>
          {bmiValue !== null && (
            <span className="sr-only">
              BMI {fmt1(bmiValue)} {BMI_TEXT[bmiCategory(bmiValue)]}
            </span>
          )}

          {toGoal !== null && current !== null && goalKg !== undefined && (
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {losing ? 'Weight loss progress' : 'Weight gain progress'}
                  {change !== null && Math.abs(change) >= 0.05 && (
                    <>
                      {' '}
                      · total {change > 0 ? '+' : ''}
                      {fmt1(change)} kg
                    </>
                  )}
                </span>
                <span className="font-semibold text-navy dark:text-slate-100">
                  {reached ? 'Goal reached! 🎉' : `${fmt1(Math.abs(current - goalKg))} kg to go`}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-[#5856d6] transition-all duration-500 dark:bg-[#7d7aff]"
                  style={{ width: `${Math.round(toGoal * 100)}%` }}
                />
              </div>
            </div>
          )}

          <QuickWeighIn
            key={String(current)}
            todayKg={todayEntry?.weightKg ?? null}
            suggested={current ?? 60}
            hide={false}
            onSave={saveToday}
            onEdit={() => setWeighing(true)}
          />
        </Card>
      )}
      {hide && (
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-[0.9375rem] font-semibold text-[#5856d6] dark:text-[#7d7aff]">
            <Glyph name="scale" className="size-[18px]" /> Weigh-in
          </p>
          <QuickWeighIn
            key={String(current)}
            todayKg={todayEntry?.weightKg ?? null}
            suggested={current ?? 60}
            hide
            onSave={saveToday}
            onEdit={() => setWeighing(true)}
          />
        </Card>
      )}

      {/* Calories & photo logging */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[0.9375rem] font-semibold text-[#ff9500]">
              <Glyph name="flame" className="size-[18px]" /> Calories today
            </p>
            {hide ? (
              <p className="mt-0.5 text-lg font-black">{todayMeals.length} items logged</p>
            ) : (
              <>
                <p className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-[2rem] leading-none font-bold">{fmtInt(eaten.kcal)}</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    / {fmtInt(target.caloriesKcal)} kcal target
                  </span>
                </p>
                <p
                  className={`text-xs font-semibold ${gap.state === 'over' ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}
                >
                  {gap.label} {fmtInt(gap.kcal)} kcal{gap.state === 'reached' ? ' 🎉' : ''}
                </p>
              </>
            )}
          </div>
          <SnapButton
            meal={nextMeal}
            label={`Log ${MEAL_LABELS[nextMeal].toLowerCase()}`}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-emerald-strong px-4 text-[0.9375rem] font-semibold text-white transition active:scale-95 dark:bg-emerald dark:text-black"
          >
            <Glyph name="camera" className="size-5" />
            Log food
          </SnapButton>
        </div>
        {!hide && (
          <Bar
            value={eaten.kcal}
            max={target.caloriesKcal}
            color={gap.state === 'over' ? 'bg-amber-500' : 'bg-emerald'}
          />
        )}
        <div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
          {MEAL_TYPES.map((m) => (
            <SnapButton
              key={m}
              meal={m}
              label={`Log ${MEAL_LABELS[m].toLowerCase()}`}
              className="group flex flex-col items-center rounded-[14px] bg-[#767680]/[0.08] p-2 text-center transition hover:bg-[#767680]/[0.14] active:scale-95 dark:bg-[#767680]/[0.24]"
            >
              <Glyph
                name={MEAL_STYLE[m].glyph}
                className={`size-6 transition group-hover:scale-110 ${MEAL_STYLE[m].text}`}
              />
              <span className="mt-0.5 text-xs font-medium text-navy dark:text-slate-200">
                {MEAL_LABELS[m]}
              </span>
            </SnapButton>
          ))}
        </div>
      </Card>

      {/* Today's food log */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[1.25rem] font-bold">Today's food log</h2>
          <Link
            to="/diary"
            className="text-[0.9375rem] text-emerald-strong hover:opacity-70 dark:text-emerald"
          >
            See all
          </Link>
        </div>
        {todayMeals.length === 0 ? (
          <p className="rounded-[22px] bg-white p-5 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            Nothing logged yet today. Tap "Log food" above to start.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-[22px] bg-white dark:divide-slate-700 dark:bg-slate-800">
            {MEAL_TYPES.flatMap((m) => todayMeals.filter((i) => i.meal === m)).map((i) => (
              <li key={i.id}>
                <Link
                  to="/diary"
                  className="flex items-center justify-between gap-3 p-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <FoodThumb item={i} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {i.label ?? MEAL_LABELS[i.meal]}
                        </span>
                        <span className="truncate text-[0.9375rem] font-semibold">{i.name}</span>
                      </span>
                      {!hide && (
                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                          {fmtInt(i.grams)} g · carbs {fmtInt(i.nutrients.carbsG)}g · protein{' '}
                          {fmtInt(i.nutrients.proteinG)}g · fat {fmtInt(i.nutrients.fatG)}g
                        </span>
                      )}
                    </span>
                  </span>
                  {!hide && (
                    <span className="shrink-0 text-[0.9375rem] font-semibold">
                      {fmtInt(i.nutrients.kcal)} kcal
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <WaterCard profile={profile} weightKg={current} />

      {weighing && (
        <WeightSheet
          heightCm={profile.heightCm}
          initial={s.weights.find((w) => w.date === today)?.weightKg ?? current ?? 60}
          onClose={() => setWeighing(false)}
          onSave={(kg) => {
            saveToday(kg);
            setWeighing(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * Inline weigh-in for today: the latest weight is pre-filled, so most mornings it is
 * a couple of taps on − / + and Save. After saving it shows the logged value with Edit.
 */
function QuickWeighIn({
  todayKg,
  suggested,
  hide,
  onSave,
  onEdit,
}: {
  todayKg: number | null;
  suggested: number;
  hide: boolean;
  onSave: (kg: number) => void;
  onEdit: () => void;
}) {
  const [text, setText] = useState(fmt1(suggested).replace(/,/g, ''));
  const kg = Number(text);
  const ok = text.trim() !== '' && kg >= 30 && kg <= 300;
  const step = (d: number) => setText(String(Math.round(((ok ? kg : suggested) + d) * 10) / 10));
  const stepClass =
    'flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-lg font-semibold text-[#5856d6] shadow-[0_1px_2px_rgba(0,0,0,0.08)] active:scale-95 dark:bg-slate-700 dark:text-[#a5a3ff]';

  if (todayKg !== null) {
    return (
      <div className="mt-4 flex items-center justify-between gap-3 rounded-[16px] bg-[#5856d6]/[0.07] px-3 py-2.5 dark:bg-[#7d7aff]/15">
        <p className="text-sm">
          <span className="font-semibold text-[#5856d6] dark:text-[#a5a3ff]">✓ Weighed today</span>
          {!hide && (
            <span className="text-slate-600 dark:text-slate-300"> · {fmt1(todayKg)} kg</span>
          )}
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="min-h-9 rounded-full px-3 text-sm font-semibold text-[#5856d6] hover:bg-[#5856d6]/10 dark:text-[#a5a3ff]"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <form
      className="mt-4 rounded-[16px] bg-[#5856d6]/[0.07] p-3 dark:bg-[#7d7aff]/15"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onSave(Math.round(kg * 10) / 10);
      }}
    >
      <label
        htmlFor="quick-weigh-in"
        className="text-xs font-semibold text-[#5856d6] dark:text-[#a5a3ff]"
      >
        Today's weigh-in
      </label>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          aria-label="Decrease by 0.1 kg"
          className={stepClass}
          onClick={() => step(-0.1)}
        >
          −
        </button>
        <span className="flex items-baseline gap-1">
          <input
            id="quick-weigh-in"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-20 rounded-[10px] bg-white py-1.5 text-center text-xl font-bold focus:ring-2 focus:ring-[#5856d6]/40 focus:outline-none dark:bg-slate-800"
          />
          <span className="text-sm font-semibold text-slate-500">kg</span>
        </span>
        <button
          type="button"
          aria-label="Increase by 0.1 kg"
          className={stepClass}
          onClick={() => step(0.1)}
        >
          +
        </button>
        <button
          type="submit"
          disabled={!ok}
          className="ml-auto min-h-10 rounded-full bg-[#5856d6] px-4 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40 dark:bg-[#7d7aff]"
        >
          Save
        </button>
      </div>
      {!ok && text.trim() !== '' && (
        <p className="mt-1.5 text-xs text-[#ff3b30]">Weight must be 30–300 kg.</p>
      )}
      <p className="mt-1.5 text-[0.6875rem] text-slate-500 dark:text-slate-400">
        Most accurate in the morning, after the toilet and before eating.
      </p>
    </form>
  );
}

/** Bottom sheet to record today's weight with fine steps and a live BMI preview. */
function WeightSheet({
  heightCm,
  initial,
  onClose,
  onSave,
}: {
  heightCm: number;
  initial: number;
  onClose: () => void;
  onSave: (kg: number) => void;
}) {
  const [text, setText] = useState(fmt1(initial).replace(/,/g, ''));
  const kg = Number(text);
  const ok = kg >= 30 && kg <= 300;
  const step = (d: number) => setText(String(Math.round(((ok ? kg : initial) + d) * 10) / 10));
  const b = ok ? bmi(kg, heightCm) : null;
  const stepClass =
    'flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Log today's weight"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm animate-rise space-y-4 rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl dark:bg-slate-800"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-lg dark:bg-emerald/20"
            >
              ⚖️
            </span>
            <div>
              <h2 className="font-black">Log today's weight</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Most accurate in the morning, after the toilet and before eating
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-600 dark:bg-slate-900">
          <label htmlFor="weight-sheet-input" className="block text-xs font-bold text-slate-500">
            Today's weight (kg)
          </label>
          <div className="flex items-center justify-center gap-1.5">
            <button type="button" className={stepClass} onClick={() => step(-0.5)}>
              −0.5
            </button>
            <button type="button" className={stepClass} onClick={() => step(-0.1)}>
              −0.1
            </button>
            <input
              id="weight-sheet-input"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-24 rounded-xl border-2 border-emerald-300 bg-white py-1.5 text-center text-2xl font-black text-emerald-700 dark:bg-slate-800 dark:text-emerald-300"
            />
            <button type="button" className={stepClass} onClick={() => step(0.1)}>
              +0.1
            </button>
            <button type="button" className={stepClass} onClick={() => step(0.5)}>
              +0.5
            </button>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-2 pt-2 text-sm dark:border-slate-700">
            <span className="text-slate-500">BMI (height {heightCm} cm)</span>
            <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
              {b !== null ? `${fmt1(b)} (${BMI_TEXT[bmiCategory(b)]})` : '—'}
            </span>
          </div>
        </div>
        {!ok && (
          <p className="text-sm text-red-700 dark:text-red-400">Weight must be 30 to 300 kg.</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!ok} onClick={() => onSave(kg)}>
            Save weight
          </Button>
        </div>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Change your height in Me → Profile
        </p>
      </div>
    </div>
  );
}

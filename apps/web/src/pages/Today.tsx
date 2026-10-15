import { bmi, bmiCategory, trendOn, type BmiCategory } from '@fittrack/engine';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { FoodThumb, Glyph } from '../components/Icons';
import { SnapButton } from '../components/SnapButton';
import { Bar, Button, Card, Notice } from '../components/ui';
import { WaterCard } from '../components/WaterCard';
import { addTarget, setWeightOn } from '../data/actions';
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

  // Weight card: the latest weigh-in, the very first weight as the start, BMI from height.
  const current = latestWeight(s.weights)?.weightKg ?? null;
  const goalKg = profile.targetWeightKg;
  const losing = profile.goal === 'fat_loss';
  const bmiValue = current !== null ? bmi(current, profile.heightCm) : null;
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
    <div className="space-y-9">
      <header className="pt-3">
        <p className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
          {new Date().toLocaleDateString('en-MY', {
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </p>
        <h1 className="mt-1 text-[1.875rem] leading-tight font-bold tracking-tight">
          {greeting}
          {profile.nickname ? `, ${profile.nickname}` : ''}
        </h1>
        <p className="mt-1 text-[0.9375rem] text-slate-500 dark:text-slate-400">
          One small step at a time.
        </p>
      </header>

      {needsRecompute(s, today) && (
        <Notice title="Your weight trend has moved 2 kg or more">
          You can recalculate your daily target from your latest trend weight.
          <div className="mt-3">
            <Button onClick={recompute}>Recalculate target</Button>
          </div>
        </Notice>
      )}

      {/* The one highlighted panel: today's calories and the main action. */}
      <Card tone="hero" className="space-y-4">
        <p className="text-xs font-semibold tracking-[0.08em] text-emerald-strong uppercase dark:text-emerald">
          Calories today
        </p>
        {hide ? (
          <p className="text-[2rem] leading-none font-bold tracking-tight">
            {todayMeals.length} {todayMeals.length === 1 ? 'item' : 'items'} logged
          </p>
        ) : (
          <div>
            <p className="flex items-baseline gap-2">
              <span className="text-[2.75rem] leading-none font-bold tracking-tight tabular-nums">
                {fmtInt(eaten.kcal)}
              </span>
              <span className="text-[0.9375rem] text-emerald-800 dark:text-emerald-200">
                / {fmtInt(target.caloriesKcal)} kcal
              </span>
            </p>
            <Bar
              value={eaten.kcal}
              max={target.caloriesKcal}
              color={
                gap.state === 'over'
                  ? 'bg-[#b5793a] dark:bg-[#e8b978]'
                  : 'bg-emerald-strong dark:bg-emerald'
              }
              track="bg-emerald-200/70 dark:bg-white/10"
            />
            <div className="mt-2 flex justify-between text-sm">
              <span
                className={`font-medium ${gap.state === 'over' ? 'text-[#87551d] dark:text-amber-300' : 'text-emerald-800 dark:text-emerald-200'}`}
              >
                {gap.label} {fmtInt(gap.kcal)} kcal
              </span>
              <span className="text-emerald-800 tabular-nums dark:text-emerald-200">
                {Math.round((eaten.kcal / Math.max(1, target.caloriesKcal)) * 100)}%
              </span>
            </div>
          </div>
        )}
        <SnapButton
          meal={nextMeal}
          label="Log food"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-emerald-strong px-4 text-[0.9375rem] font-semibold text-white transition hover:bg-emerald-800 active:scale-[0.99] dark:bg-emerald dark:text-black"
        >
          <Glyph name="camera" className="size-5" />
          Log food
        </SnapButton>
      </Card>

      {/* Today's meals: a plain list, spaced out instead of ruled. */}
      <section aria-label="Today's meals">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Today's meals</h2>
          <Link
            to="/diary"
            className="text-sm font-medium text-emerald-strong hover:opacity-70 dark:text-emerald"
          >
            View all →
          </Link>
        </div>
        {todayMeals.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Nothing logged yet today. Snap or search your first meal.
          </p>
        ) : (
          <ul className="mt-2">
            {MEAL_TYPES.flatMap((m) => todayMeals.filter((i) => i.meal === m)).map((i) => (
              <li key={i.id}>
                <Link
                  to="/diary"
                  className="flex min-h-[76px] items-center justify-between gap-4 py-2.5 transition hover:opacity-80"
                >
                  <span className="flex min-w-0 items-center gap-4">
                    <FoodThumb item={i} size="size-14" />
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold">{i.name}</span>
                      <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">
                        {i.label ?? MEAL_LABELS[i.meal]}
                      </span>
                    </span>
                  </span>
                  {!hide && (
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {fmtInt(i.nutrients.kcal)} kcal
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Protein, carbs and fat as three thin bars. */}
      {!hide && (
        <section aria-label="Nutrition" className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Nutrition</h2>
          {(
            [
              ['Protein', eaten.proteinG, target.proteinG, 'bg-emerald-strong dark:bg-emerald'],
              ['Carbs', eaten.carbsG, target.carbsG, 'bg-[#b5793a] dark:bg-[#e8b978]'],
              ['Fat', eaten.fatG, target.fatG, 'bg-[#b8664f] dark:bg-[#e69a8a]'],
            ] as const
          ).map(([name, value, max, color]) => (
            <div key={name}>
              <div className="flex justify-between text-sm">
                <span className="font-medium">{name}</span>
                <span className="text-slate-500 tabular-nums dark:text-slate-400">
                  {fmtInt(value)} / {fmtInt(max)} g
                </span>
              </div>
              <div
                className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-white/10"
                aria-hidden="true"
              >
                <div
                  className={`h-1.5 rounded-full ${color}`}
                  style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Weight: the number, one line of context and the quick weigh-in. */}
      <section aria-label="Weight">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">{hide ? 'Weigh-in' : 'Weight'}</h2>
          {!hide && (
            <Link
              to="/progress#weights"
              className="shrink-0 text-sm font-medium text-emerald-strong hover:opacity-70 dark:text-emerald"
            >
              History →
            </Link>
          )}
        </div>

        {!hide && (
          <div className="mt-3">
            <p className="flex items-baseline gap-1.5">
              <span className="text-[2rem] leading-none font-bold tracking-tight tabular-nums">
                {current !== null ? fmt1(current) : '—'}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">kg</span>
            </p>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {bmiValue !== null && (
                <span aria-hidden="true">
                  BMI {fmt1(bmiValue)} · {BMI_TEXT[bmiCategory(bmiValue)]}
                </span>
              )}
              {current !== null && goalKg !== undefined && (
                <>
                  {bmiValue !== null && ' · '}
                  <span className="font-medium text-navy dark:text-slate-100">
                    {reached ? 'Goal reached! 🎉' : `${fmt1(Math.abs(current - goalKg))} kg to go`}
                  </span>
                </>
              )}
              {goalKg === undefined && (
                <Link
                  to="/me/body"
                  className="ml-1 font-medium text-emerald-strong dark:text-emerald"
                >
                  Set a target weight
                </Link>
              )}
            </p>
            {bmiValue !== null && (
              <span className="sr-only">
                BMI {fmt1(bmiValue)} {BMI_TEXT[bmiCategory(bmiValue)]}
              </span>
            )}
          </div>
        )}

        <QuickWeighIn
          key={String(current)}
          todayKg={todayEntry?.weightKg ?? null}
          suggested={current ?? 60}
          hide={hide}
          onSave={saveToday}
          onEdit={() => setWeighing(true)}
        />
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
    'flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-lg font-semibold text-emerald-strong shadow-[0_1px_2px_rgba(0,0,0,0.08)] active:scale-95 dark:bg-slate-700 dark:text-emerald';

  if (todayKg !== null) {
    return (
      <div className="mt-4 flex items-center justify-between gap-3 rounded-[16px] bg-slate-50 px-3 py-2.5 dark:bg-white/5">
        <p className="text-sm">
          <span className="font-semibold text-emerald-strong dark:text-emerald">
            ✓ Weighed today
          </span>
          {!hide && (
            <span className="text-slate-600 dark:text-slate-300"> · {fmt1(todayKg)} kg</span>
          )}
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="min-h-9 rounded-full px-3 text-sm font-semibold text-emerald-strong hover:bg-emerald-50 dark:text-emerald"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <form
      className="mt-4 rounded-[16px] bg-slate-50 p-3 dark:bg-white/5"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onSave(Math.round(kg * 10) / 10);
      }}
    >
      <label
        htmlFor="quick-weigh-in"
        className="text-xs font-semibold text-emerald-strong dark:text-emerald"
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
            className="w-20 rounded-[10px] bg-white py-1.5 text-center text-xl font-bold focus:ring-2 focus:ring-emerald/40 focus:outline-none dark:bg-slate-800"
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
          className="ml-auto min-h-10 rounded-full bg-emerald-strong px-4 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40 dark:bg-emerald dark:text-black"
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

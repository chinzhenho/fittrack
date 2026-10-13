import { bmi, bmiCategory, trendOn, type BmiCategory } from '@fittrack/engine';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { MEAL_STYLE } from '../components/mealStyle';
import { SnapButton } from '../components/SnapButton';
import { Bar, Button, Card, Notice } from '../components/ui';
import { WaterCard } from '../components/WaterCard';
import { addTarget, setWeightOn } from '../data/actions';
import { useAuth } from '../data/auth';
import { newId, update, useAppState } from '../data/store';
import type { MealType } from '../data/types';
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
  underweight: '体重过轻',
  normal: '正常范围',
  overweight: '超重',
  obese: '肥胖',
};

const MEAL_BUTTON: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍵',
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
  const greeting = hour < 5 ? '夜深了' : hour < 12 ? '早安' : hour < 18 ? '午安' : '晚上好';
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
  const weighedToday = s.weights.some((w) => w.date === today);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-50 text-lg font-bold text-emerald-800 dark:bg-emerald/15 dark:text-emerald-100"
        >
          {initial}
        </span>
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString('zh-CN', {
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}
          </p>
          <h1 className="text-2xl leading-tight font-black tracking-tight">
            {greeting}
            {profile.nickname ? `，${profile.nickname}` : ''}
          </h1>
        </div>
      </div>

      {needsRecompute(s, today) && (
        <Notice title="体重趋势已变化 2 kg 以上">
          可以按最新的趋势体重重新计算每日目标。
          <div className="mt-3">
            <Button onClick={recompute}>重新计算目标</Button>
          </div>
        </Notice>
      )}

      {/* Weight & BMI */}
      {!hide && (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5cae6f] via-[#43955f] to-[#2f6e5b] p-4 text-white shadow-xl shadow-[#2f6e5b]/20">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 -bottom-6 size-32 rounded-full bg-white/10 blur-2xl"
          />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="flex size-9 items-center justify-center rounded-xl bg-white/20 text-lg"
              >
                ⚖️
              </span>
              <div>
                <p className="text-xs font-semibold text-emerald-50">今日体重 & BMI</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {bmiValue !== null && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold text-emerald-800">
                      BMI {fmt1(bmiValue)} {BMI_TEXT[bmiCategory(bmiValue)]}
                    </span>
                  )}
                  {change !== null && Math.abs(change) >= 0.05 && (
                    <span className="text-xs text-emerald-50">
                      累计 {change > 0 ? '+' : ''}
                      {fmt1(change)} kg
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setWeighing(true)}
              className="flex min-h-10 shrink-0 items-center gap-1 rounded-xl bg-white px-3 text-sm font-black text-emerald-800 shadow-sm transition hover:bg-emerald-50 active:scale-95"
            >
              {weighedToday ? '✎ 改体重' : '＋ 记体重'}
            </button>
          </div>

          <div className="relative mt-4 flex items-end justify-between gap-2">
            <div>
              <p className="text-xs text-emerald-100">目前体重</p>
              <p className="flex items-baseline gap-1">
                <span className="text-4xl leading-none font-black">
                  {current !== null ? fmt1(current) : '—'}
                </span>
                <span className="text-sm font-bold text-emerald-100">kg</span>
              </p>
            </div>
            {bmiValue !== null && (
              <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-1.5 text-center">
                <p className="text-[11px] text-emerald-100">BMI 指数</p>
                <p className="text-lg leading-tight font-black">{fmt1(bmiValue)}</p>
                <p className="text-[10px] text-emerald-200">身高 {profile.heightCm} cm</p>
              </div>
            )}
            <div className="text-right">
              <p className="text-xs text-emerald-100">目标体重</p>
              {goalKg !== undefined ? (
                <p className="flex items-baseline justify-end gap-1">
                  <span className="text-xl font-black">{fmt1(goalKg)}</span>
                  <span className="text-sm font-semibold text-emerald-200">kg</span>
                </p>
              ) : (
                <Link to="/me/profile" className="text-sm font-semibold underline">
                  设置
                </Link>
              )}
            </div>
          </div>

          {toGoal !== null && current !== null && goalKg !== undefined && (
            <div className="relative mt-3 space-y-1 border-t border-white/15 pt-3">
              <div className="flex justify-between text-xs text-emerald-100">
                <span>{losing ? '减重进程' : '增重进程'}</span>
                <span className="font-bold text-white">
                  {reached ? '已达成目标！🎉' : `距目标还差 ${fmt1(Math.abs(current - goalKg))} kg`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/20 p-0.5">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${Math.round(toGoal * 100)}%` }}
                />
              </div>
            </div>
          )}
        </section>
      )}

      {/* Calories & photo logging */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">今日已摄取热量</p>
            {hide ? (
              <p className="mt-0.5 text-lg font-black">已记录 {todayMeals.length} 项</p>
            ) : (
              <>
                <p className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-3xl font-black">{fmtInt(eaten.kcal)}</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    / {fmtInt(target.caloriesKcal)} kcal 目标
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
            label={`拍照记录${MEAL_LABELS[nextMeal]}`}
            className="flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/25 transition active:scale-95"
          >
            <span
              aria-hidden="true"
              className="flex size-7 items-center justify-center rounded-lg bg-white/20"
            >
              📷
            </span>
            拍照记录食物
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
              label={`拍照记录${MEAL_LABELS[m]}`}
              className="group flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-2 text-center transition hover:border-emerald-200 hover:bg-emerald-50 active:scale-95 dark:border-slate-600 dark:bg-slate-700"
            >
              <span aria-hidden="true" className="text-xl transition group-hover:scale-110">
                {MEAL_BUTTON[m]}
              </span>
              <span className="mt-0.5 text-xs font-black text-slate-700 group-hover:text-emerald-700 dark:text-slate-200">
                {MEAL_LABELS[m]}
              </span>
            </SnapButton>
          ))}
        </div>
      </Card>

      {/* Today's food log */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-black tracking-wider text-slate-500 dark:text-slate-400">
            <span aria-hidden="true">📅</span>
            今日饮食日志
          </h2>
          <Link
            to="/diary"
            className="text-xs font-semibold text-emerald-strong hover:underline dark:text-emerald"
          >
            修改 / 查看全部 ›
          </Link>
        </div>
        {todayMeals.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-slate-200 p-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            今天还没有记录。点上面的“拍照记录食物”开始吧。
          </p>
        ) : (
          <ul className="space-y-2.5">
            {MEAL_TYPES.flatMap((m) => todayMeals.filter((i) => i.meal === m)).map((i) => (
              <li key={i.id}>
                <Link
                  to="/diary"
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-900/5 transition hover:ring-emerald-200 dark:bg-slate-800 dark:ring-white/10"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-lg ${MEAL_STYLE[i.meal].bg}`}
                    >
                      {MEAL_BUTTON[i.meal]}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-extrabold text-emerald-800 dark:bg-emerald/20 dark:text-emerald-100">
                          {i.label ?? MEAL_LABELS[i.meal]}
                        </span>
                        <span className="truncate text-sm font-black">{i.name}</span>
                      </span>
                      {!hide && (
                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                          {fmtInt(i.grams)} g · 碳水 {fmtInt(i.nutrients.carbsG)}g · 蛋白质{' '}
                          {fmtInt(i.nutrients.proteinG)}g · 脂肪 {fmtInt(i.nutrients.fatG)}g
                        </span>
                      )}
                    </span>
                  </span>
                  {!hide && (
                    <span className="shrink-0 text-sm font-black">
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
            update((x) =>
              setWeightOn(x, {
                id: newId(),
                date: today,
                measuredAt: new Date().toISOString(),
                weightKg: kg,
              }),
            );
            setWeighing(false);
          }}
        />
      )}
    </div>
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
        aria-label="记录今天的体重"
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
              <h2 className="font-black">记录今天的体重</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                早上如厕后、吃东西前量最准
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-600 dark:bg-slate-900">
          <label htmlFor="weight-sheet-input" className="block text-xs font-bold text-slate-500">
            今日体重（kg）
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
            <span className="text-slate-500">换算 BMI（身高 {heightCm} cm）</span>
            <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
              {b !== null ? `${fmt1(b)}（${BMI_TEXT[bmiCategory(b)]}）` : '—'}
            </span>
          </div>
        </div>
        {!ok && <p className="text-sm text-red-700 dark:text-red-400">体重需介于 30 至 300 kg。</p>}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button disabled={!ok} onClick={() => onSave(kg)}>
            保存体重
          </Button>
        </div>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          身高可在“我 → 个人资料”修改
        </p>
      </div>
    </div>
  );
}

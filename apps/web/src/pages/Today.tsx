import { addDays, trendOn, weeklyChangePct } from '@fittrack/engine';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Ring } from '../components/Charts';
import { MEAL_STYLE } from '../components/mealStyle';
import { Bar, Button, Card, CardTitle, Notice } from '../components/ui';
import { addTarget, setDayComplete, setWeightOn, skipTask } from '../data/actions';
import { newId, update, useAppState } from '../data/store';
import { localToday } from '../lib/dates';
import { fmt1, fmtInt } from '../lib/format';
import { GOAL_LABELS } from '../lib/messages';
import {
  calorieGap,
  MEAL_LABELS,
  MEAL_TYPES,
  mealForHour,
  mealsOn,
  sumNutrients,
} from '../logic/nutrition';
import { waterByNow, waterGoalMl, WATER_STEP_ML } from '../logic/water';
import { SnapButton } from '../components/SnapButton';
import { useAuth } from '../data/auth';
import {
  latestWeight,
  needsRecompute,
  planFor,
  targetFromPlan,
  targetOn,
  startWeightKg,
  trendPoints,
} from '../logic/targets';
import { tasksFor } from '../logic/tasks';

export function Today() {
  const s = useAppState();
  const today = useMemo(() => localToday(), []);
  const [weightInput, setWeightInput] = useState('');
  const [editingWeight, setEditingWeight] = useState(false);
  const auth = useAuth();
  const profile = s.profile;
  const target = targetOn(s.targets, today);
  if (!profile || !target) return null;

  const eaten = sumNutrients(mealsOn(s.meals, today));
  const points = trendPoints(s.weights);
  const trend = trendOn(points, today);
  const weekly = weeklyChangePct(points, today);
  const tasks = tasksFor(s, today);
  const hide = profile.hideNumbers;
  const gap = calorieGap(profile.goal, eaten.kcal, target.caloriesKcal);

  const saveWeight = () => {
    const kg = Number(weightInput);
    if (!(kg >= 30 && kg <= 300)) return;
    update((x) =>
      setWeightOn(x, {
        id: newId(),
        date: today,
        measuredAt: new Date().toISOString(),
        weightKg: kg,
      }),
    );
    setWeightInput('');
    setEditingWeight(false);
  };

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
  const todayMeals = mealsOn(s.meals, today);
  const latest = latestWeight(s.weights);
  const startKg = startWeightKg(s);
  // The card shows what the user actually weighed; the smoothed trend is a side note.
  const current = latest?.weightKg ?? null;
  const goalKg = profile.targetWeightKg;
  const change = current !== null && startKg !== null ? current - startKg : null;
  const toGoal =
    current !== null && startKg !== null && goalKg !== undefined && startKg !== goalKg
      ? Math.min(1, Math.max(0, (startKg - current) / (startKg - goalKg)))
      : null;
  const todayWeight = s.weights.find((w) => w.date === today);
  const prev = s.weights
    .filter((w) => w.date < today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
  const losing = profile.goal === 'fat_loss';
  const movingRight = change !== null && (losing ? change < 0 : change > 0);
  const reached =
    current !== null && goalKg !== undefined && (losing ? current <= goalKg : current >= goalKg);
  const weeklyKg = current !== null ? (profile.ratePctPerWeek / 100) * current : 0;
  const weeksLeft =
    current !== null && goalKg !== undefined && weeklyKg > 0
      ? Math.ceil(Math.abs(current - goalKg) / weeklyKg)
      : null;
  const doneCount = tasks.filter((t) => t.done).length;
  const nextMeal = mealForHour(hour);
  const waterGoal = waterGoalMl(target.tdeeKcal);
  const now = new Date();
  const waterNow = waterByNow(waterGoal, now.getHours(), now.getMinutes());
  const initial =
    profile.avatar ??
    (auth.status === 'signedIn' ? (auth.user.email?.[0] ?? '🙂').toUpperCase() : '🙂');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-50 text-lg font-bold text-emerald-800 dark:bg-emerald/15 dark:text-emerald-100"
          >
            {initial}
          </span>
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">
              今日饮食看板 ·{' '}
              {new Date().toLocaleDateString('zh-CN', {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </p>
            <h1 className="text-[1.6rem] leading-tight font-black tracking-tight">
              {greeting}
              {profile.nickname ? `，${profile.nickname}` : ''} <span className="text-xl">🥗</span>
            </h1>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 dark:bg-emerald/20 dark:text-emerald-100">
          🎯 {GOAL_LABELS[profile.goal]}
        </span>
      </div>

      {needsRecompute(s, today) && (
        <Notice title="体重趋势已变化 2 kg 以上">
          可以按最新的趋势体重重新计算每日目标。
          <div className="mt-3">
            <Button onClick={recompute}>重新计算目标</Button>
          </div>
        </Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          {!hide ? (
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 p-5 text-white shadow-lg shadow-emerald-700/25">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-8 -bottom-8 size-40 rounded-full bg-white/10 blur-xl"
              />
              <div className="relative flex items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                    🔥 今日热量
                  </span>
                  <p className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-4xl font-black tracking-tight">{fmtInt(gap.kcal)}</span>
                    <span className="text-sm font-medium text-emerald-50">
                      kcal {gap.label}
                      {gap.state === 'reached' ? ' 🎉' : ''}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-emerald-50">
                    已吃 {fmtInt(eaten.kcal)} / 目标 {fmtInt(target.caloriesKcal)} kcal
                  </p>
                </div>
                <div className="relative shrink-0">
                  <Ring
                    value={eaten.kcal}
                    max={target.caloriesKcal}
                    label={`已摄取 ${fmtInt(eaten.kcal)} / ${fmtInt(target.caloriesKcal)} kcal`}
                    trackClass="stroke-white/20"
                    barClass={gap.state === 'over' ? 'stroke-amber-300' : 'stroke-white'}
                    size="size-24"
                  />
                  <span className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black">
                      {Math.round((eaten.kcal / target.caloriesKcal) * 100)}%
                    </span>
                    <span className="text-[10px] text-emerald-100">已完成</span>
                  </span>
                </div>
              </div>
              <div className="relative mt-4 grid grid-cols-3 gap-2 border-t border-white/15 pt-4 text-center">
                {[
                  { n: '碳水', v: eaten.carbsG, t: target.carbsG },
                  { n: '蛋白质', v: eaten.proteinG, t: target.proteinG },
                  { n: '脂肪', v: eaten.fatG, t: target.fatG },
                ].map((m) => (
                  <div key={m.n} className="rounded-xl bg-black/10 p-2">
                    <p className="text-[11px] text-emerald-100">{m.n}</p>
                    <p className="mt-0.5 text-sm font-bold">
                      {fmtInt(m.v)}
                      <span className="text-xs font-normal text-emerald-100"> / {m.t}g</span>
                    </p>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/20">
                      <div
                        className="h-full rounded-full bg-white"
                        style={{ width: `${Math.min(100, (m.v / m.t) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <Card>
              <CardTitle>今天的饮食</CardTitle>
              <p className="text-sm">
                今天记录了 {todayMeals.length} 项食物。数字已隐藏，可在“我”页面打开。
              </p>
            </Card>
          )}

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-xl dark:bg-sky-500/20"
              >
                💧
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">今天建议喝水</p>
                {profile.screening.kidneyDisease ? (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    你有肾脏方面的状况，喝水量请按医生的建议。
                  </p>
                ) : (
                  <>
                    <p className="mt-0.5 text-2xl font-black text-sky-700 dark:text-sky-300">
                      约 {fmtInt(waterGoal)} ml
                      <span className="ml-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400">
                        ≈ {Math.round(waterGoal / WATER_STEP_ML)} 杯
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {waterNow > 0
                        ? `现在大约应喝到 ${fmtInt(waterNow)} ml，记得每 1–2 小时喝一杯。`
                        : '早上起床先喝一杯水，之后每 1–2 小时喝一杯。'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      按你每天的消耗计算（每杯 {WATER_STEP_ML} ml）。天气热、出汗或运动时要多喝
                      {profile.screening.pregnantOrLactating ? '；怀孕或哺乳期间需要再多一些' : ''}
                      。
                    </p>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">今天的三餐</h2>
            <Link
              to="/diary"
              className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald/15 dark:text-emerald-100"
            >
              饮食日记 ›
            </Link>
          </div>
          <ul className="space-y-3">
            {MEAL_TYPES.filter((m) => todayMeals.some((i) => i.meal === m)).map((meal) => {
              const list = todayMeals.filter((i) => i.meal === meal);
              const n = sumNutrients(list);
              return (
                <li key={meal}>
                  <Link
                    to="/diary"
                    className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-900/5 transition hover:shadow-md dark:bg-slate-800 dark:ring-white/10"
                  >
                    <span
                      aria-hidden="true"
                      className={`flex size-14 shrink-0 items-center justify-center rounded-xl text-2xl ${MEAL_STYLE[meal].bg}`}
                    >
                      {MEAL_STYLE[meal].icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold">
                        {MEAL_LABELS[meal]} ·{' '}
                        {list.map((i) => (i.label ? `${i.label}：${i.name}` : i.name)).join('、')}
                      </span>
                      {!hide && (
                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                          蛋白质 {fmtInt(n.proteinG)}g · 碳水 {fmtInt(n.carbsG)}g · 脂肪{' '}
                          {fmtInt(n.fatG)}g
                        </span>
                      )}
                      <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald/15 dark:text-emerald-200">
                        {list.length} 项食物
                      </span>
                    </span>
                    {!hide && (
                      <span className="shrink-0 text-right">
                        <span className="block text-base font-black">{fmtInt(n.kcal)}</span>
                        <span className="block text-[11px] text-slate-400">kcal</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          {!todayMeals.some((i) => i.meal === nextMeal) && (
            <SnapButton
              meal={nextMeal}
              label={`拍照记录${MEAL_LABELS[nextMeal]}`}
              className={`flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 p-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald/40 dark:bg-emerald/10 dark:text-emerald-100 ${todayMeals.length ? 'mt-3' : ''}`}
            >
              📷 快拍{MEAL_LABELS[nextMeal]} · AI 立即算热量
            </SnapButton>
          )}
          {MEAL_TYPES.some((m) => m !== nextMeal && !todayMeals.some((i) => i.meal === m)) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {MEAL_TYPES.filter(
                (m) => m !== nextMeal && !todayMeals.some((i) => i.meal === m),
              ).map((m) => (
                <Link
                  key={m}
                  to={`/diary/add?meal=${m}`}
                  className="inline-flex min-h-10 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:border-emerald dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  ＋ {MEAL_LABELS[m]}
                </Link>
              ))}
            </div>
          )}
        </section>

        <Card>
          <CardTitle
            action={
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-900 dark:bg-emerald/15 dark:text-emerald-100">
                {doneCount} / {tasks.length}
              </span>
            }
          >
            今天的小目标
          </CardTitle>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <span
                  aria-hidden="true"
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${t.done ? 'border-emerald-strong bg-emerald-strong text-white dark:border-emerald dark:bg-emerald dark:text-slate-950' : 'border-slate-300 dark:border-slate-500'}`}
                >
                  {t.done ? '✓' : ''}
                </span>
                <div className={`min-w-0 flex-1 ${t.skipped && !t.done ? 'opacity-50' : ''}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={`text-sm font-medium ${t.done ? 'text-slate-500 line-through' : ''}`}
                    >
                      {t.link && !t.done ? <Link to={t.link}>{t.title}</Link> : t.title}
                      <span className="sr-only">{t.done ? '（已完成）' : '（未完成）'}</span>
                    </p>
                    {t.progress && !hide && (
                      <span className="shrink-0 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {t.progress.text}
                      </span>
                    )}
                  </div>
                  {t.progress && !hide && !t.done ? (
                    <Bar value={t.progress.value} max={t.progress.max} color="bg-emerald" />
                  ) : (
                    !t.done && (
                      <p className="text-xs text-slate-600 dark:text-slate-300">{t.hint}</p>
                    )
                  )}
                </div>
                {t.id === 'log_weight' && !t.done ? (
                  <Button
                    variant="secondary"
                    className="min-h-9 shrink-0 px-3"
                    onClick={() => {
                      const input = document.getElementById('quick-weight');
                      input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      input?.focus({ preventScroll: true });
                    }}
                  >
                    记录
                  </Button>
                ) : t.id === 'mark_complete' ? (
                  <Button
                    variant={t.done ? 'ghost' : 'secondary'}
                    className="min-h-9 shrink-0 px-3"
                    onClick={() => update((x) => setDayComplete(x, today, !t.done))}
                  >
                    {t.done ? '取消' : '确认'}
                  </Button>
                ) : (
                  !t.done && (
                    <button
                      type="button"
                      className="min-h-11 shrink-0 px-1 text-xs text-slate-500 dark:text-slate-400"
                      onClick={() => update((x) => skipTask(x, today, t.id, !t.skipped))}
                    >
                      {t.skipped ? '恢复' : '跳过'}
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            {doneCount === tasks.length ? '🎉 今天全部完成了！' : '跳过不算失败，做到一个也很好。'}
          </p>
        </Card>

        {!hide && (
          <Card>
            <CardTitle
              action={
                <Link
                  to="/progress"
                  className="text-sm font-medium text-emerald-strong dark:text-emerald"
                >
                  看图表 ›
                </Link>
              }
            >
              体重
            </CardTitle>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300">目前体重</p>
                <p className="text-3xl font-bold">
                  {current !== null ? fmt1(current) : '—'}
                  <span className="ml-1 text-base font-medium">kg</span>
                </p>
                {trend !== null && current !== null && Math.abs(trend - current) >= 0.05 && (
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    平滑趋势 {fmt1(trend)} kg（减少每天水分起伏的影响）
                  </p>
                )}
              </div>
              {change !== null && Math.abs(change) >= 0.05 && (
                <p
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${movingRight ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald/15 dark:text-emerald-100' : 'bg-slate-100 dark:bg-slate-700'}`}
                >
                  {change > 0 ? '+' : ''}
                  {fmt1(change)} kg
                  <span className="ml-1 font-normal">比起点</span>
                </p>
              )}
            </div>
            {goalKg !== undefined && toGoal !== null && current !== null && startKg !== null && (
              <div className="mt-4 text-sm">
                {reached ? (
                  <p className="font-medium">🎉 已达到目标 {fmt1(goalKg)} kg！</p>
                ) : change === null || Math.abs(change) < 0.05 ? (
                  <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-700">
                    <span>
                      起点 <strong>{fmt1(startKg)}</strong>
                    </span>
                    <span aria-hidden="true" className="text-slate-400">
                      →
                    </span>
                    <span>
                      目标 <strong>{fmt1(goalKg)}</strong> kg
                    </span>
                    <span className="ml-auto text-xs text-slate-600 dark:text-slate-300">
                      {losing ? '要减' : '要增'} {fmt1(Math.abs(current - goalKg))} kg
                    </span>
                  </div>
                ) : (
                  <>
                    <p className="font-medium">
                      还要{losing ? '减' : '增'} {fmt1(Math.abs(current - goalKg))} kg 到目标{' '}
                      {fmt1(goalKg)} kg
                    </p>
                    <Bar value={toGoal} max={1} color="bg-emerald" />
                    <div className="mt-1 flex justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span>起点 {fmt1(startKg)}</span>
                      <span>已完成 {Math.round(toGoal * 100)}%</span>
                      <span>目标 {fmt1(goalKg)}</span>
                    </div>
                  </>
                )}
                {!reached && weeksLeft !== null && (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    按你选的速度（每周约 {fmt1(weeklyKg)} kg），大约 {weeksLeft}{' '}
                    周后到达。这只是估算。
                  </p>
                )}
              </div>
            )}
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
              {prev && todayWeight
                ? `比上次（${prev.date.slice(5).replace('-', '/')}）${todayWeight.weightKg - prev.weightKg > 0 ? '+' : ''}${fmt1(todayWeight.weightKg - prev.weightKg)} kg。每天会因水分起伏，看长期趋势就好。`
                : weekly !== null
                  ? `过去 7 天 ${weekly > 0 ? '+' : ''}${fmt1(weekly)}%`
                  : '明天起每天量一次，这里会显示和上次的差别。'}
            </p>
            {todayWeight && !editingWeight ? (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 py-1 pr-1 pl-4 text-sm text-emerald-900 dark:bg-emerald/15 dark:text-emerald-100">
                <span>✓ 今天已记录 {fmt1(todayWeight.weightKg)} kg</span>
                <Button
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => {
                    setWeightInput(String(todayWeight.weightKg));
                    setEditingWeight(true);
                  }}
                >
                  更改
                </Button>
              </div>
            ) : (
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveWeight();
                }}
              >
                <label className="sr-only" htmlFor="quick-weight">
                  今天的体重（kg）
                </label>
                <input
                  id="quick-weight"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min={30}
                  max={300}
                  placeholder="输入今天的体重 kg"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="min-h-11 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base dark:border-slate-600 dark:bg-slate-900"
                />
                <Button
                  type="submit"
                  className="shrink-0 whitespace-nowrap"
                  disabled={!(Number(weightInput) >= 30 && Number(weightInput) <= 300)}
                >
                  记录
                </Button>
              </form>
            )}
          </Card>
        )}
      </div>

      <WeekCard today={today} hide={hide} />
    </div>
  );
}

const TIPS = [
  '饮料换成无糖（kosong）或少糖（siew dai），是最容易减少热量的方法之一。',
  '炒饭、炒面通常用油较多；想吃得轻一点，可以选汤面或白饭配菜。',
  '每餐先有一份蛋白质（鸡蛋、豆腐、鱼、鸡肉），比较容易吃饱。',
  '打包时咖喱汁、酱汁可以另外装，自己决定要加多少。',
  '外食时多点一份青菜，份量多了，热量却增加不多。',
  '晚上嘴馋时，先喝一杯水或无糖茶，等 10 分钟再决定要不要吃。',
  '体重每天会因为水分和食物而上下起伏，看趋势比看单日更准。',
];

const WEEKDAY = ['一', '二', '三', '四', '五', '六', '日'];

/** This week (Monday to Sunday) at a glance: logged days, calories per day, and a tip. */
function WeekCard({ today, hide }: { today: string; hide: boolean }) {
  const s = useAppState();
  const mondayOffset = (new Date(`${today}T00:00:00`).getDay() + 6) % 7;
  const monday = addDays(today, -mondayOffset);
  const info = WEEKDAY.map((label, i) => {
    const date = addDays(monday, i);
    const meals = mealsOn(s.meals, date);
    return {
      date,
      label,
      future: date > today,
      logged: meals.length > 0,
      complete: s.completeDays.includes(date),
      kcal: sumNutrients(meals).kcal,
      target: targetOn(s.targets, date)?.caloriesKcal,
    };
  });
  const logged = info.filter((d) => d.logged);
  // Averages use finished days only; today is still in progress.
  const past = logged.filter((d) => d.date < today);
  const avg = past.length > 0 ? past.reduce((t, d) => t + d.kcal, 0) / past.length : null;
  const withinTarget = past.filter((d) => d.target !== undefined && d.kcal <= d.target).length;
  const tipIndex = Math.floor(new Date(`${today}T00:00:00`).getTime() / 86_400_000) % TIPS.length;

  const stats = [
    { label: '有记录', value: `${logged.length} 天` },
    ...(hide
      ? []
      : [
          { label: '每日平均', value: avg !== null ? `${fmtInt(avg)} kcal` : '—' },
          {
            label: '没超过目标',
            value: past.length > 0 ? `${withinTarget} / ${past.length} 天` : '—',
          },
        ]),
  ];

  return (
    <Card>
      <CardTitle>本周</CardTitle>
      <ol className="grid grid-cols-7 gap-1 text-center">
        {info.map((d) => {
          const isToday = d.date === today;
          const over = d.target !== undefined && d.kcal > d.target;
          return (
            <li key={d.date} className={d.future ? 'opacity-40' : ''}>
              <span
                className={`text-xs ${isToday ? 'font-bold text-emerald-strong dark:text-emerald' : 'text-slate-600 dark:text-slate-300'}`}
              >
                {d.label}
              </span>
              <span
                className={`mx-auto mt-1 flex size-9 items-center justify-center rounded-full text-sm font-semibold ${isToday ? 'ring-2 ring-emerald-strong ring-offset-2 dark:ring-emerald dark:ring-offset-slate-800' : ''} ${d.complete ? 'bg-emerald-strong text-white dark:bg-emerald dark:text-slate-950' : d.logged ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald/25 dark:text-emerald-100' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}
              >
                {d.complete ? '✓' : Number(d.date.slice(8))}
                <span className="sr-only">
                  {d.complete ? '已完整记录' : d.logged ? '有记录' : '没有记录'}
                </span>
              </span>
              {!hide && (
                <span
                  className={`mt-1 block text-[11px] ${over ? 'font-semibold text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  {d.logged ? fmtInt(d.kcal) : ''}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <dl className={`mt-4 grid gap-2 ${hide ? 'grid-cols-1' : 'grid-cols-3'}`}>
        {stats.map((x) => (
          <div key={x.label} className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-700">
            <dt className="text-xs text-slate-600 dark:text-slate-300">{x.label}</dt>
            <dd className="font-semibold">{x.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
        💡 {TIPS[tipIndex]}
      </p>
    </Card>
  );
}

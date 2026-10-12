import { addDays, trendOn, weeklyChangePct } from '@fittrack/engine';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Ring } from '../components/Charts';
import { MEAL_STYLE } from '../components/mealStyle';
import { Bar, Button, Card, CardTitle, Notice } from '../components/ui';
import {
  addActivity,
  addTarget,
  setDayComplete,
  setRestDay,
  setWeightOn,
  skipTask,
} from '../data/actions';
import { newId, update, useAppState } from '../data/store';
import { localToday } from '../lib/dates';
import { fmt1, fmtInt } from '../lib/format';
import { GOAL_LABELS, MODE_LABELS } from '../lib/messages';
import { MEAL_LABELS, MEAL_TYPES, mealsOn, sumNutrients } from '../logic/nutrition';
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
import { templateById, templatesFor, type WorkoutTemplate } from '../logic/workouts';

export function Today() {
  const s = useAppState();
  const today = useMemo(() => localToday(), []);
  const navigate = useNavigate();
  const [weightInput, setWeightInput] = useState('');
  const [editingWeight, setEditingWeight] = useState(false);
  const [showNoWorkout, setShowNoWorkout] = useState(false);
  const profile = s.profile;
  const target = targetOn(s.targets, today);
  if (!profile || !target) return null;

  const eaten = sumNutrients(mealsOn(s.meals, today));
  const points = trendPoints(s.weights);
  const trend = trendOn(points, today);
  const weekly = weeklyChangePct(points, today);
  const tasks = tasksFor(s, today);
  const isRest = s.restDays.includes(today);
  const hide = profile.hideNumbers;
  const remaining = target.caloriesKcal - eaten.kcal;

  const suggested =
    templatesFor(profile.lifestyleMode)
      .filter((t) => t.id !== 'stretch-10')
      .filter((t) => profile.minutesPerDay === 0 || t.minutes <= Math.max(profile.minutesPerDay, 5))
      .at(-1) ?? templateById('home-5');

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

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {new Date().toLocaleDateString('zh-TW', {
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </p>
        <h1 className="text-[1.7rem] font-bold tracking-tight">{greeting} 👋</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-900 dark:bg-emerald/20 dark:text-emerald-100">
            🎯 {GOAL_LABELS[profile.goal]}
          </span>
          <span className="rounded-full bg-white px-3 py-1 font-medium ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            {MODE_LABELS[profile.lifestyleMode].name}
          </span>
        </div>
      </div>

      {needsRecompute(s, today) && (
        <Notice title="體重趨勢已變化 2 kg 以上">
          可以按最新的趨勢體重重新計算每日目標。
          <div className="mt-3">
            <Button onClick={recompute}>重新計算目標</Button>
          </div>
        </Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {!hide ? (
          <section className="flex flex-col justify-center rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-800 p-5 text-white shadow-md">
            <div className="flex items-center gap-5">
              <div className="relative">
                <Ring
                  value={eaten.kcal}
                  max={target.caloriesKcal}
                  label={`已攝取 ${fmtInt(eaten.kcal)} / ${fmtInt(target.caloriesKcal)} kcal`}
                  trackClass="stroke-white/20"
                  barClass={remaining >= 0 ? 'stroke-white' : 'stroke-amber-300'}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-emerald-50">
                    {remaining >= 0 ? '還可以吃' : '超出目標'}
                  </span>
                  <span className="text-3xl font-bold">{fmtInt(Math.abs(remaining))}</span>
                  <span className="text-xs text-emerald-50">kcal</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-3 text-sm">
                <p className="text-emerald-50">
                  已吃 <span className="font-semibold text-white">{fmtInt(eaten.kcal)}</span> /{' '}
                  {fmtInt(target.caloriesKcal)} kcal
                </p>
                {[
                  { n: '蛋白質', v: eaten.proteinG, t: target.proteinG, c: 'bg-rose-300' },
                  { n: '碳水', v: eaten.carbsG, t: target.carbsG, c: 'bg-sky-300' },
                  { n: '脂肪', v: eaten.fatG, t: target.fatG, c: 'bg-amber-300' },
                ].map((m) => (
                  <div key={m.n}>
                    <div className="flex justify-between">
                      <span className="font-medium">{m.n}</span>
                      <span className="text-emerald-50">
                        {fmtInt(m.v)} / {m.t} g
                      </span>
                    </div>
                    <Bar value={m.v} max={m.t} color={m.c} track="bg-white/20" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <Card>
            <CardTitle>今天的飲食</CardTitle>
            <p className="text-sm">
              今天記錄了 {todayMeals.length} 項食物。數字已隱藏，可在「我」頁面打開。
            </p>
          </Card>
        )}

        <Card>
          <CardTitle>今天吃了什麼</CardTitle>
          <ul className="space-y-1">
            {MEAL_TYPES.map((meal) => {
              const list = todayMeals.filter((i) => i.meal === meal);
              const kcal = sumNutrients(list).kcal;
              return (
                <li key={meal}>
                  <Link
                    to={`/diary/add?meal=${meal}`}
                    aria-label={`加入${MEAL_LABELS[meal]}`}
                    className="flex min-h-14 items-center gap-3 rounded-2xl px-2 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <span
                      aria-hidden="true"
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-lg ${MEAL_STYLE[meal].bg}`}
                    >
                      {MEAL_STYLE[meal].icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{MEAL_LABELS[meal]}</span>
                      <span className="block truncate text-xs text-slate-600 dark:text-slate-300">
                        {list.length === 0
                          ? '還沒有記錄'
                          : list
                              .map((i) => (i.label ? `${i.label}：${i.name}` : i.name))
                              .join('、')}
                      </span>
                    </span>
                    {!hide && list.length > 0 && (
                      <span className="shrink-0 text-sm font-semibold">{fmtInt(kcal)} kcal</span>
                    )}
                    <span
                      aria-hidden="true"
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-lg font-semibold text-emerald-900 dark:bg-emerald/15 dark:text-emerald-100"
                    >
                      ＋
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardTitle
            action={
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-900 dark:bg-emerald/15 dark:text-emerald-100">
                {doneCount} / {tasks.length}
              </span>
            }
          >
            今天的小目標
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
                {(t.id === 'walk_10' || t.id === 'walk_20') && !t.done && t.progress ? (
                  <Button
                    variant="secondary"
                    className="min-h-9 shrink-0 px-3"
                    onClick={() => {
                      const left = (t.progress?.max ?? 0) - (t.progress?.value ?? 0);
                      update((x) =>
                        addActivity(x, { id: newId(), date: today, type: 'walk', minutes: left }),
                      );
                    }}
                  >
                    走了
                  </Button>
                ) : t.id === 'log_weight' && !t.done ? (
                  <Button
                    variant="secondary"
                    className="min-h-9 shrink-0 px-3"
                    onClick={() => {
                      const input = document.getElementById('quick-weight');
                      input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      input?.focus({ preventScroll: true });
                    }}
                  >
                    記錄
                  </Button>
                ) : t.id === 'mark_complete' ? (
                  <Button
                    variant={t.done ? 'ghost' : 'secondary'}
                    className="min-h-9 shrink-0 px-3"
                    onClick={() => update((x) => setDayComplete(x, today, !t.done))}
                  >
                    {t.done ? '取消' : '確認'}
                  </Button>
                ) : (
                  !t.done && (
                    <button
                      type="button"
                      className="min-h-11 shrink-0 px-1 text-xs text-slate-500 dark:text-slate-400"
                      onClick={() => update((x) => skipTask(x, today, t.id, !t.skipped))}
                    >
                      {t.skipped ? '恢復' : '跳過'}
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            {doneCount === tasks.length ? '🎉 今天全部完成了！' : '跳過不算失敗，做到一個也很好。'}
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
                  看圖表 ›
                </Link>
              }
            >
              體重
            </CardTitle>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300">目前體重</p>
                <p className="text-3xl font-bold">
                  {current !== null ? fmt1(current) : '—'}
                  <span className="ml-1 text-base font-medium">kg</span>
                </p>
                {trend !== null && current !== null && Math.abs(trend - current) >= 0.05 && (
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    平滑趨勢 {fmt1(trend)} kg（減少每天水分起伏的影響）
                  </p>
                )}
              </div>
              {change !== null && Math.abs(change) >= 0.05 && (
                <p
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${movingRight ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald/15 dark:text-emerald-100' : 'bg-slate-100 dark:bg-slate-700'}`}
                >
                  {change > 0 ? '+' : ''}
                  {fmt1(change)} kg
                  <span className="ml-1 font-normal">比起點</span>
                </p>
              )}
            </div>
            {goalKg !== undefined && toGoal !== null && current !== null && startKg !== null && (
              <div className="mt-4 text-sm">
                {reached ? (
                  <p className="font-medium">🎉 已達到目標 {fmt1(goalKg)} kg！</p>
                ) : change === null || Math.abs(change) < 0.05 ? (
                  <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-700">
                    <span>
                      起點 <strong>{fmt1(startKg)}</strong>
                    </span>
                    <span aria-hidden="true" className="text-slate-400">
                      →
                    </span>
                    <span>
                      目標 <strong>{fmt1(goalKg)}</strong> kg
                    </span>
                    <span className="ml-auto text-xs text-slate-600 dark:text-slate-300">
                      {losing ? '要減' : '要增'} {fmt1(Math.abs(current - goalKg))} kg
                    </span>
                  </div>
                ) : (
                  <>
                    <p className="font-medium">
                      還要{losing ? '減' : '增'} {fmt1(Math.abs(current - goalKg))} kg 到目標{' '}
                      {fmt1(goalKg)} kg
                    </p>
                    <Bar value={toGoal} max={1} color="bg-emerald" />
                    <div className="mt-1 flex justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span>起點 {fmt1(startKg)}</span>
                      <span>已完成 {Math.round(toGoal * 100)}%</span>
                      <span>目標 {fmt1(goalKg)}</span>
                    </div>
                  </>
                )}
                {!reached && weeksLeft !== null && (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    按你選的速度（每週約 {fmt1(weeklyKg)} kg），大約 {weeksLeft}{' '}
                    週後到達。這只是估算。
                  </p>
                )}
              </div>
            )}
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
              {prev && todayWeight
                ? `比上次（${prev.date.slice(5).replace('-', '/')}）${todayWeight.weightKg - prev.weightKg > 0 ? '+' : ''}${fmt1(todayWeight.weightKg - prev.weightKg)} kg。每天會因水分起伏，看長期趨勢就好。`
                : weekly !== null
                  ? `過去 7 天 ${weekly > 0 ? '+' : ''}${fmt1(weekly)}%`
                  : '明天起每天量一次，這裡會顯示和上次的差別。'}
            </p>
            {todayWeight && !editingWeight ? (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 py-1 pr-1 pl-4 text-sm text-emerald-900 dark:bg-emerald/15 dark:text-emerald-100">
                <span>✓ 今天已記錄 {fmt1(todayWeight.weightKg)} kg</span>
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
                  今天的體重（kg）
                </label>
                <input
                  id="quick-weight"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min={30}
                  max={300}
                  placeholder="輸入今天的體重 kg"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="min-h-11 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base dark:border-slate-600 dark:bg-slate-900"
                />
                <Button
                  type="submit"
                  className="shrink-0 whitespace-nowrap"
                  disabled={!(Number(weightInput) >= 30 && Number(weightInput) <= 300)}
                >
                  記錄
                </Button>
              </form>
            )}
          </Card>
        )}
      </div>

      <WeekCard today={today} hide={hide} />
      {profile.lifestyleMode !== 'nutrition_first' && (
        <ActivityCard
          {...{ isRest, today, suggested, showNoWorkout, setShowNoWorkout, navigate }}
          caution={profile.screening.exerciseCaution}
        />
      )}
    </div>
  );
}

function ActivityCard({
  isRest,
  today,
  suggested,
  caution,
  showNoWorkout,
  setShowNoWorkout,
  navigate,
}: {
  isRest: boolean;
  today: string;
  suggested: WorkoutTemplate | undefined;
  caution: boolean;
  showNoWorkout: boolean;
  setShowNoWorkout: (f: (v: boolean) => boolean) => void;
  navigate: (to: string) => void;
}) {
  return (
    <Card>
      <CardTitle>今天的活動</CardTitle>
      {caution && (
        <p className="mb-3 text-sm text-amber-800 dark:text-amber-300">
          你曾表示需要限制運動：開始前請先諮詢醫生，並選擇低衝擊的活動。
        </p>
      )}
      {isRest ? (
        <div className="space-y-3 text-sm">
          <p>今天是休息日，休息也是計劃的一部分。想動一動的話，可以做 10 分鐘伸展。</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate('/workout/start/stretch-10')}>
              伸展 10 分鐘
            </Button>
            <Button variant="ghost" onClick={() => update((x) => setRestDay(x, today, false))}>
              取消休息日
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {suggested && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{suggested.name}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{suggested.note}</p>
              </div>
              <Button onClick={() => navigate(`/workout/start/${suggested.id}`)}>開始</Button>
            </div>
          )}
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setShowNoWorkout((v) => !v)}
            aria-expanded={showNoWorkout}
          >
            我現在不想運動
          </Button>
          {showNoWorkout && (
            <ul className="grid gap-2 text-sm">
              <li>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => navigate('/workout/start/home-5')}
                >
                  我只有 5 分鐘
                </Button>
              </li>
              <li>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => navigate('/workout/start/home-15-low')}
                >
                  我想在家輕鬆活動
                </Button>
              </li>
              <li>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => navigate('/workout/start/walk-20')}
                >
                  我不想健身，只想出去走走
                </Button>
              </li>
              <li>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => update((x) => setRestDay(x, today, true))}
                >
                  我今天很累，想休息
                </Button>
              </li>
              <li>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => navigate('/workout')}
                >
                  我想換一個訓練
                </Button>
              </li>
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

const TIPS = [
  '飲料換成無糖（kosong）或少糖（siew dai），是最容易減少熱量的方法之一。',
  '炒飯、炒麵通常用油較多；想吃得輕一點，可以選湯麵或白飯配菜。',
  '每餐先有一份蛋白質（雞蛋、豆腐、魚、雞肉），比較容易吃飽。',
  '打包時咖喱汁、醬汁可以另外裝，自己決定要加多少。',
  '外食時多點一份青菜，份量多了，熱量卻增加不多。',
  '晚上嘴饞時，先喝一杯水或無糖茶，等 10 分鐘再決定要不要吃。',
  '體重每天會因為水分和食物而上下起伏，看趨勢比看單日更準。',
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
    { label: '有記錄', value: `${logged.length} 天` },
    ...(hide
      ? []
      : [
          { label: '每日平均', value: avg !== null ? `${fmtInt(avg)} kcal` : '—' },
          {
            label: '沒超過目標',
            value: past.length > 0 ? `${withinTarget} / ${past.length} 天` : '—',
          },
        ]),
  ];

  return (
    <Card>
      <CardTitle>本週</CardTitle>
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
                  {d.complete ? '已完整記錄' : d.logged ? '有記錄' : '沒有記錄'}
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

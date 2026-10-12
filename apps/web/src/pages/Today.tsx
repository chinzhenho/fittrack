import { addDays, trendOn, weeklyChangePct } from '@fittrack/engine';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Ring } from '../components/Charts';
import { MEAL_STYLE } from '../components/mealStyle';
import { Bar, Button, Card, CardTitle, Notice } from '../components/ui';
import { addTarget, setDayComplete, setRestDay, setWeightOn, skipTask } from '../data/actions';
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
  const first = [...s.weights].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))[0];
  const current = trend ?? latest?.weightKg ?? null;
  const goalKg = profile.targetWeightKg;
  const change = current !== null && first ? current - first.weightKg : null;
  const toGoal =
    current !== null && first && goalKg !== undefined && first.weightKg !== goalKg
      ? Math.min(1, Math.max(0, (first.weightKg - current) / (first.weightKg - goalKg)))
      : null;
  const todayWeight = s.weights.find((w) => w.date === today);
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
            <p className="mt-4 text-xs text-emerald-50">
              {eaten.kcal === 0
                ? '今天還沒有記錄，從下一餐開始吧。'
                : eaten.proteinG < target.proteinG * 0.5 && hour >= 15
                  ? `蛋白質還差 ${fmtInt(target.proteinG - eaten.proteinG)} g，晚餐可以多吃些雞蛋、豆腐、魚或雞肉。`
                  : remaining < 0
                    ? '今天吃多了一點沒關係，看的是一週的平均。'
                    : '進度不錯，繼續保持！'}{' '}
              <Link to="/how-we-calculate" className="underline">
                怎樣計算？
              </Link>
            </p>
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
                {t.id === 'mark_complete' ? (
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
                <p className="text-3xl font-bold">
                  {current !== null ? fmt1(current) : '—'}
                  <span className="ml-1 text-base font-medium">kg</span>
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {trend !== null ? '趨勢體重（平滑每天的起伏）' : '最新記錄'}
                </p>
              </div>
              {change !== null && first && first.date !== today && (
                <p className="text-right text-sm">
                  <span className="font-semibold">
                    {change > 0 ? '+' : ''}
                    {fmt1(change)} kg
                  </span>
                  <span className="block text-xs text-slate-600 dark:text-slate-300">
                    自 {first.date.slice(5).replace('-', '/')} 開始
                  </span>
                </p>
              )}
            </div>
            {goalKg !== undefined && toGoal !== null && (
              <div className="mt-3 text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>目標 {fmt1(goalKg)} kg</span>
                  <span>{Math.round(toGoal * 100)}%</span>
                </div>
                <Bar value={toGoal} max={1} color="bg-emerald" />
              </div>
            )}
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              {weekly !== null
                ? `過去 7 天 ${weekly > 0 ? '+' : ''}${fmt1(weekly)}%`
                : '記錄滿一週後會顯示每週變化'}
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
                  placeholder="今天的體重 kg"
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

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

/** Last 7 days at a glance: which days were logged, average intake, and a tip. */
function WeekCard({ today, hide }: { today: string; hide: boolean }) {
  const s = useAppState();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const info = days.map((date) => {
    const meals = mealsOn(s.meals, date);
    return {
      date,
      logged: meals.length > 0,
      complete: s.completeDays.includes(date),
      kcal: sumNutrients(meals).kcal,
      target: targetOn(s.targets, date)?.caloriesKcal,
    };
  });
  // Average only finished days (before today) that have records.
  const past = info.filter((d) => d.date < today && d.logged);
  const avg = past.length > 0 ? past.reduce((t, d) => t + d.kcal, 0) / past.length : null;
  const avgTarget =
    past.length > 0 ? past.reduce((t, d) => t + (d.target ?? 0), 0) / past.length : null;
  const loggedDays = info.filter((d) => d.logged).length;
  const tipIndex = Math.floor(new Date(`${today}T00:00:00`).getTime() / 86_400_000) % TIPS.length;

  return (
    <Card>
      <CardTitle
        action={
          <span className="text-sm text-slate-600 dark:text-slate-300">
            記錄了 {loggedDays} / 7 天
          </span>
        }
      >
        最近 7 天
      </CardTitle>
      <ol className="grid grid-cols-7 gap-1 text-center text-xs">
        {info.map((d) => (
          <li key={d.date}>
            <span className="text-slate-600 dark:text-slate-300">
              {d.date === today ? '今' : WEEKDAY[new Date(`${d.date}T00:00:00`).getDay()]}
            </span>
            <span
              className={`mx-auto mt-1 flex size-9 items-center justify-center rounded-full text-sm font-semibold ${d.complete ? 'bg-emerald-strong text-white dark:bg-emerald dark:text-slate-950' : d.logged ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald/25 dark:text-emerald-100' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'}`}
            >
              {d.complete ? '✓' : Number(d.date.slice(8))}
              <span className="sr-only">
                {d.complete ? '已完整記錄' : d.logged ? '有記錄' : '沒有記錄'}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
        <span>
          <span className="mr-1 inline-block size-2.5 rounded-full bg-emerald-strong align-middle dark:bg-emerald" />
          已完整記錄
        </span>
        <span>
          <span className="mr-1 inline-block size-2.5 rounded-full bg-emerald-100 align-middle dark:bg-emerald/25" />
          有記錄
        </span>
      </p>
      {!hide && (
        <p className="mt-3 text-sm">
          {avg !== null && avgTarget !== null ? (
            <>
              之前記錄的日子平均每天 <strong>{fmtInt(avg)} kcal</strong>（目標 {fmtInt(avgTarget)}）
            </>
          ) : (
            '記錄幾天後，這裡會顯示你的每日平均熱量。'
          )}
        </p>
      )}
      <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
        💡 {TIPS[tipIndex]}
      </p>
    </Card>
  );
}

import { trendOn, weeklyChangePct } from '@fittrack/engine';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Ring } from '../components/Charts';
import { Bar, Button, Card, CardTitle, Notice, PageTitle } from '../components/ui';
import { addTarget, addWeight, setRestDay, skipTask } from '../data/actions';
import { newId, update, useAppState } from '../data/store';
import { formatDateZh, localToday } from '../lib/dates';
import { fmt1, fmtInt } from '../lib/format';
import { GOAL_LABELS, MODE_LABELS } from '../lib/messages';
import { mealForHour, mealsOn, sumNutrients } from '../logic/nutrition';
import {
  latestWeight,
  needsRecompute,
  planFor,
  targetFromPlan,
  targetOn,
  trendPoints,
} from '../logic/targets';
import { tasksFor } from '../logic/tasks';
import { templateById, templatesFor } from '../logic/workouts';

export function Today() {
  const s = useAppState();
  const today = useMemo(() => localToday(), []);
  const navigate = useNavigate();
  const [weightInput, setWeightInput] = useState('');
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
      addWeight(x, {
        id: newId(),
        date: today,
        measuredAt: new Date().toISOString(),
        weightKg: kg,
      }),
    );
    setWeightInput('');
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

  return (
    <div className="space-y-4">
      <PageTitle sub={`${GOAL_LABELS[profile.goal]} · ${MODE_LABELS[profile.lifestyleMode].name}`}>
        {formatDateZh(today, today)}
      </PageTitle>

      {needsRecompute(s, today) && (
        <Notice title="體重趨勢已變化 2 kg 以上">
          可以按最新的趨勢體重重新計算每日目標。
          <div className="mt-3">
            <Button onClick={recompute}>重新計算目標</Button>
          </div>
        </Notice>
      )}

      {!hide ? (
        <section className="rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-800 p-5 text-white shadow-md">
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
                  {remaining >= 0 ? '還可攝取' : '超出目標'}
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
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-emerald-50">
              「剩餘」只是和目標的差距，不等於實際熱量赤字。
            </p>
            <Link
              to={`/diary/add?meal=${mealForHour(new Date().getHours())}`}
              className="inline-flex min-h-11 shrink-0 items-center rounded-2xl bg-white px-4 text-sm font-semibold text-emerald-900 shadow-sm hover:bg-emerald-50"
            >
              ＋ 記錄飲食
            </Link>
          </div>
        </section>
      ) : (
        <Card>
          <CardTitle>今天的飲食</CardTitle>
          <p className="text-sm">
            今天記錄了 {mealsOn(s.meals, today).length} 項食物。數字已隱藏，可在「我」頁面打開。
          </p>
        </Card>
      )}

      <Card>
        <CardTitle>今天的小目標</CardTitle>
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2">
              <span
                aria-hidden="true"
                className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${t.done ? 'border-emerald-strong bg-emerald-strong text-white dark:border-emerald dark:bg-emerald dark:text-slate-950' : 'border-slate-300 dark:border-slate-500'}`}
              >
                {t.done ? '✓' : ''}
              </span>
              <div className={`min-w-0 flex-1 ${t.skipped && !t.done ? 'opacity-50' : ''}`}>
                <p className="text-sm font-medium">
                  {t.link ? <Link to={t.link}>{t.title}</Link> : t.title}
                  <span className="sr-only">{t.done ? '（已完成）' : '（未完成）'}</span>
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{t.hint}</p>
              </div>
              {!t.done && (
                <button
                  type="button"
                  className="min-h-11 px-2 text-xs text-slate-600 dark:text-slate-300"
                  onClick={() => update((x) => skipTask(x, today, t.id, !t.skipped))}
                >
                  {t.skipped ? '恢復' : '今天跳過'}
                </button>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          完成 {tasks.filter((t) => t.done).length} / {tasks.length}。跳過不算失敗。
        </p>
      </Card>

      {!hide && (
        <Card>
          <CardTitle
            action={
              <Link to="/progress" className="text-sm text-emerald-strong dark:text-emerald">
                詳細
              </Link>
            }
          >
            體重趨勢
          </CardTitle>
          <p className="text-3xl font-semibold">{trend !== null ? `${fmt1(trend)} kg` : '—'}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {weekly !== null
              ? `過去 7 天 ${weekly > 0 ? '+' : ''}${fmt1(weekly)}%`
              : '記錄一週後會顯示每週變化'}
          </p>
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
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-500 dark:bg-slate-700"
            />
            <Button
              type="submit"
              disabled={!(Number(weightInput) >= 30 && Number(weightInput) <= 300)}
            >
              記錄
            </Button>
          </form>
        </Card>
      )}

      <Card>
        <CardTitle>今天的活動</CardTitle>
        {profile.screening.exerciseCaution && (
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
    </div>
  );
}

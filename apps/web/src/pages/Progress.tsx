import { addDays, trendOn, weeklyChangePct } from '@fittrack/engine';
import { useMemo, useState } from 'react';
import { WeightChart } from '../components/Charts';
import { useToast } from '../components/Toast';
import {
  Bar,
  Button,
  Card,
  CardTitle,
  Field,
  inputClass,
  Notice,
  PageTitle,
} from '../components/ui';
import { addTarget, removeWeight, setWeightOn } from '../data/actions';
import { newId, update, useAppState } from '../data/store';
import { formatDateZh, localToday } from '../lib/dates';
import { fmt1, fmtInt } from '../lib/format';
import { progressSummary } from '../logic/achievements';
import {
  adaptiveFor,
  macrosForAdaptive,
  startWeightKg,
  targetOn,
  trendPoints,
} from '../logic/targets';

const REFUSAL_TEXT: Record<string, string> = {
  window_too_short: '目标开始后的头 14 天体重变化主要是水分，之后才会评估。',
  not_enough_complete_logs: '最近 3 周需要至少八成日子标记“饮食已完整记录”。',
  not_enough_weigh_ins: '最近 3 周需要至少 10 次体重记录。',
  no_trend_at_window_start: '评估期开始前需要有体重记录。',
};

export function Progress() {
  const s = useAppState();
  const today = useMemo(() => localToday(), []);
  const toast = useToast();
  const [range, setRange] = useState<'7' | '30' | '90'>('30');
  const [w, setW] = useState('');
  const [waist, setWaist] = useState('');
  const [wDate, setWDate] = useState(today);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const resetForm = () => {
    setEditingId(null);
    setWDate(today);
    setW('');
    setWaist('');
  };
  const points = trendPoints(s.weights);
  const trend = trendOn(points, today);
  const weekly = weeklyChangePct(points, today);
  const target = targetOn(s.targets, today);
  const profile = s.profile;
  const adaptive = adaptiveFor(s, today);
  const lastAdaptive = s.targets.filter((t) => t.reason === 'adaptive').at(-1);
  const adaptiveCooldown =
    lastAdaptive !== undefined && lastAdaptive.effectiveFrom > addDays(today, -14);

  if (profile?.hideNumbers) {
    return (
      <div className="space-y-4">
        <PageTitle>进度</PageTitle>
        <Notice>你已选择隐藏热量和体重数字。可以在“我”页面重新打开。</Notice>
      </div>
    );
  }

  const kg = Number(w);
  const waistCm = Number(waist);
  const valid =
    wDate !== '' &&
    wDate <= today &&
    kg >= 30 &&
    kg <= 300 &&
    (waist.trim() === '' || (waistCm >= 40 && waistCm <= 250));
  const entries = [...s.weights].sort(
    (a, b) => b.date.localeCompare(a.date) || b.measuredAt.localeCompare(a.measuredAt),
  );

  const summary = progressSummary(s, today);
  const goalKg = profile?.targetWeightKg;
  const unlocked = summary.badges.filter((b) => b.unlocked).length;
  const next = summary.badges
    .filter((b) => !b.unlocked)
    .sort((a, b) => b.progress.value / b.progress.max - a.progress.value / a.progress.max)[0];
  const goalWord = profile?.goal === 'fat_loss' ? '已减' : '已增';

  return (
    <div className="space-y-4">
      <PageTitle>进度</PageTitle>

      <section className="grid grid-cols-3 gap-2 rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-800 p-4 text-center text-white shadow-md">
        <div>
          <p className="text-2xl font-bold">🔥 {summary.streak}</p>
          <p className="text-xs text-emerald-50">连续记录（天）</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{summary.daysLogged}</p>
          <p className="text-xs text-emerald-50">总共记录（天）</p>
        </div>
        <div>
          <p className="text-2xl font-bold">
            {summary.towardGoalKg !== null ? fmt1(Math.max(0, summary.towardGoalKg)) : '—'}
          </p>
          <p className="text-xs text-emerald-50">
            {summary.towardGoalKg !== null ? `${goalWord}（kg）` : '维持体重中'}
          </p>
        </div>
      </section>

      <Card>
        <CardTitle
          action={
            <div
              className="flex gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-700"
              role="group"
              aria-label="期间"
            >
              {(['7', '30', '90'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={range === r}
                  onClick={() => setRange(r)}
                  className={`min-h-8 rounded-full px-3 text-xs font-medium ${range === r ? 'bg-white text-emerald-900 shadow-sm dark:bg-slate-900 dark:text-emerald-100' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  {r} 天
                </button>
              ))}
            </div>
          }
        >
          体重趋势
        </CardTitle>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-bold">
              {trend !== null ? fmt1(trend) : '—'}
              <span className="ml-1 text-base font-medium">kg</span>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              趋势体重{entries[0] && ` · 最新记录 ${fmt1(entries[0].weightKg)} kg`}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {weekly !== null
                ? `过去 7 天 ${weekly > 0 ? '+' : ''}${fmt1(weekly)}%`
                : '记录满一周后显示每周变化'}
            </p>
          </div>
          {goalKg !== undefined && (
            <p className="shrink-0 rounded-full bg-emerald-50 whitespace-nowrap px-3 py-1 text-sm font-medium text-emerald-900 dark:bg-emerald/15 dark:text-emerald-100">
              🎯 目标 {fmt1(goalKg)} kg
            </p>
          )}
        </div>
        <WeightChart
          points={points}
          end={today}
          days={Number(range)}
          startKg={startWeightKg(s)}
          goalKg={goalKg}
        />
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          灰点是每天的体重，绿线是趋势，虚线是起点和目标。每天会因水分、盐分上下起伏，看绿线就好。
        </p>
      </Card>

      <Card>
        <CardTitle
          action={
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {unlocked} / {summary.badges.length}
            </span>
          }
        >
          成就
        </CardTitle>
        {next && (
          <div className="mb-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm dark:bg-emerald/15">
            <p>
              下一个：
              <strong>
                {next.icon} {next.title}
              </strong>{' '}
              — {next.need}
            </p>
            {next.progress.max > 1 && (
              <Bar value={next.progress.value} max={next.progress.max} color="bg-emerald" />
            )}
          </div>
        )}
        {summary.longest > summary.streak && (
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            最长连续记录：{summary.longest} 天
          </p>
        )}
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {summary.badges.map((b) => (
            <li
              key={b.id}
              className={`rounded-2xl p-3 ${b.unlocked ? 'bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30' : 'bg-slate-50 dark:bg-slate-700'}`}
            >
              <p
                className={`text-2xl ${b.unlocked ? '' : 'opacity-40 grayscale'}`}
                aria-hidden="true"
              >
                {b.icon}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {b.title}
                <span className="sr-only">{b.unlocked ? '（已获得）' : '（未获得）'}</span>
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {b.unlocked ? '✓ 已获得' : b.need}
              </p>
              {!b.unlocked && b.progress.max > 1 && (
                <>
                  <Bar value={b.progress.value} max={b.progress.max} color="bg-amber-400" />
                  <p className="mt-1 text-right text-[11px] text-slate-600 dark:text-slate-300">
                    {fmt1(b.progress.value).replace(/\.0$/, '')} / {b.progress.max}
                  </p>
                </>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {target && (
        <Card>
          <CardTitle>目标调整建议</CardTitle>
          {adaptiveCooldown ? (
            <p className="text-sm">上一次调整在 {lastAdaptive?.effectiveFrom}，14 天后再评估。</p>
          ) : adaptive?.ok ? (
            <div className="space-y-3 text-sm">
              <p>
                过去 {adaptive.windowDays} 天平均摄取 {fmtInt(adaptive.meanIntakeKcal)}{' '}
                kcal，趋势体重变化 {adaptive.trendChangeKg > 0 ? '+' : ''}
                {fmt1(adaptive.trendChangeKg)} kg，推算实际消耗约{' '}
                {fmtInt(adaptive.observedTdeeKcal)} kcal。
              </p>
              {adaptive.proposedTargetKcal === target.caloriesKcal ? (
                <p className="font-medium">目前的目标合适，不需要调整。</p>
              ) : (
                <>
                  <p className="font-medium">
                    建议把每日目标从 {fmtInt(target.caloriesKcal)} 调整为{' '}
                    {fmtInt(adaptive.proposedTargetKcal)} kcal。
                  </p>
                  <Button
                    onClick={() => {
                      if (!profile) return;
                      const m = macrosForAdaptive(
                        profile,
                        adaptive.proposedTargetKcal,
                        trend ?? target.weightKg,
                      );
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
                          weightKg: trend ?? target.weightKg,
                          clamps: m.clamps,
                        }),
                      );
                      toast({ text: '已更新每日目标' });
                    }}
                  >
                    接受建议
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p>还没有足够的资料。需要：</p>
              <ul className="list-disc space-y-1 pl-5">
                {(adaptive && !adaptive.ok ? adaptive.reasons : []).map((r) => (
                  <li key={r}>{REFUSAL_TEXT[r]}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <Card className="space-y-4">
        <CardTitle>{editingId ? '修改体重记录' : '记录体重'}</CardTitle>
        <form
          className="space-y-3"
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
            toast({ text: editingId ? '已更新' : `已记录 ${formatDateZh(wDate, today)} 的体重` });
            resetForm();
          }}
        >
          <Field label="日期">
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
            <Field label="体重（kg）">
              {(p) => (
                <input
                  {...p}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={w}
                  onChange={(e) => setW(e.target.value)}
                  className={inputClass}
                />
              )}
            </Field>
            <Field label="腰围（cm，选填）">
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
          {!editingId && s.weights.some((x) => x.date === wDate) && (
            <p className="text-xs text-amber-800 dark:text-amber-300">
              这一天已经有记录，保存后会取代它。
            </p>
          )}
          <div className="flex gap-2">
            {editingId && (
              <Button variant="secondary" onClick={resetForm}>
                取消
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={!valid}>
              {editingId ? '保存修改' : '保存'}
            </Button>
          </div>
        </form>

        {entries.length > 0 && (
          <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-700 dark:border-slate-700">
            {entries.slice(0, showAll ? undefined : 7).map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {fmt1(e.weightKg)} kg
                    {e.waistCm !== undefined && (
                      <span className="font-normal text-slate-600 dark:text-slate-300">
                        {' '}
                        · 腰围 {fmt1(e.waistCm)} cm
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-slate-600 dark:text-slate-300">
                    {formatDateZh(e.date, today)}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  className="min-h-9 px-3"
                  aria-label={`修改 ${e.date} 的体重`}
                  onClick={() => {
                    setEditingId(e.id);
                    setWDate(e.date);
                    setW(String(e.weightKg));
                    setWaist(e.waistCm !== undefined ? String(e.waistCm) : '');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  修改
                </Button>
                <button
                  type="button"
                  aria-label={`删除 ${e.date} 的体重记录`}
                  className="flex size-10 items-center justify-center rounded-2xl text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                  onClick={() => {
                    update((x) => removeWeight(x, e.id));
                    toast({
                      text: `已删除 ${formatDateZh(e.date, today)} 的体重`,
                      actionLabel: '撤销',
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
            {showAll ? '收起' : `显示全部 ${entries.length} 笔`}
          </Button>
        )}
      </Card>

      <Card>
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center justify-between text-lg font-semibold">
            每日目标历史
            <span className="text-sm font-normal text-slate-600 dark:text-slate-300">展开</span>
          </summary>
          <div className="mt-3">
            <ul className="space-y-1 text-sm">
              {[...s.targets].reverse().map((t) => (
                <li key={t.id} className="flex justify-between gap-3">
                  <span>{t.effectiveFrom}</span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {
                      { initial: '初始', profile_change: '资料更新', adaptive: '动态调整' }[
                        t.reason
                      ]
                    }
                  </span>
                  <span className="font-medium">{fmtInt(t.caloriesKcal)} kcal</span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      </Card>
    </div>
  );
}

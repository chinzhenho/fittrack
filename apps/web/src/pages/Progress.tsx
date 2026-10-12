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
import { adaptiveFor, macrosForAdaptive, targetOn, trendPoints } from '../logic/targets';

const REFUSAL_TEXT: Record<string, string> = {
  window_too_short: '目標開始後的頭 14 天體重變化主要是水分，之後才會評估。',
  not_enough_complete_logs: '最近 3 週需要至少八成日子標記「飲食已完整記錄」。',
  not_enough_weigh_ins: '最近 3 週需要至少 10 次體重記錄。',
  no_trend_at_window_start: '評估期開始前需要有體重記錄。',
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
        <PageTitle>進度</PageTitle>
        <Notice>你已選擇隱藏熱量和體重數字。可以在「我」頁面重新打開。</Notice>
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
  const goalWord = profile?.goal === 'fat_loss' ? '已減' : '已增';

  return (
    <div className="space-y-4">
      <PageTitle>進度</PageTitle>

      <section className="grid grid-cols-3 gap-2 rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-800 p-4 text-center text-white shadow-md">
        <div>
          <p className="text-2xl font-bold">🔥 {summary.streak}</p>
          <p className="text-xs text-emerald-50">連續記錄（天）</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{summary.daysLogged}</p>
          <p className="text-xs text-emerald-50">總共記錄（天）</p>
        </div>
        <div>
          <p className="text-2xl font-bold">
            {summary.towardGoalKg !== null ? fmt1(Math.max(0, summary.towardGoalKg)) : '—'}
          </p>
          <p className="text-xs text-emerald-50">
            {summary.towardGoalKg !== null ? `${goalWord}（kg）` : '維持體重中'}
          </p>
        </div>
      </section>

      <Card>
        <CardTitle
          action={
            <div
              className="flex gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-700"
              role="group"
              aria-label="期間"
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
          體重趨勢
        </CardTitle>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-bold">
              {trend !== null ? fmt1(trend) : '—'}
              <span className="ml-1 text-base font-medium">kg</span>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              趨勢體重{entries[0] && ` · 最新記錄 ${fmt1(entries[0].weightKg)} kg`}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {weekly !== null
                ? `過去 7 天 ${weekly > 0 ? '+' : ''}${fmt1(weekly)}%`
                : '記錄滿一週後顯示每週變化'}
            </p>
          </div>
          {goalKg !== undefined && (
            <p className="shrink-0 rounded-full bg-emerald-50 whitespace-nowrap px-3 py-1 text-sm font-medium text-emerald-900 dark:bg-emerald/15 dark:text-emerald-100">
              🎯 目標 {fmt1(goalKg)} kg
            </p>
          )}
        </div>
        <WeightChart points={points} end={today} days={Number(range)} />
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          灰點是每天的體重，綠線是趨勢。每天會因水分、鹽分上下起伏，看綠線就好。
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
              下一個：
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
            最長連續記錄：{summary.longest} 天
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
                <span className="sr-only">{b.unlocked ? '（已獲得）' : '（未獲得）'}</span>
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {b.unlocked ? '✓ 已獲得' : b.need}
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
          <CardTitle>目標調整建議</CardTitle>
          {adaptiveCooldown ? (
            <p className="text-sm">上一次調整在 {lastAdaptive?.effectiveFrom}，14 天後再評估。</p>
          ) : adaptive?.ok ? (
            <div className="space-y-3 text-sm">
              <p>
                過去 {adaptive.windowDays} 天平均攝取 {fmtInt(adaptive.meanIntakeKcal)}{' '}
                kcal，趨勢體重變化 {adaptive.trendChangeKg > 0 ? '+' : ''}
                {fmt1(adaptive.trendChangeKg)} kg，推算實際消耗約{' '}
                {fmtInt(adaptive.observedTdeeKcal)} kcal。
              </p>
              {adaptive.proposedTargetKcal === target.caloriesKcal ? (
                <p className="font-medium">目前的目標合適，不需要調整。</p>
              ) : (
                <>
                  <p className="font-medium">
                    建議把每日目標從 {fmtInt(target.caloriesKcal)} 調整為{' '}
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
                      toast({ text: '已更新每日目標' });
                    }}
                  >
                    接受建議
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p>還沒有足夠的資料。需要：</p>
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
        <CardTitle>{editingId ? '修改體重記錄' : '記錄體重'}</CardTitle>
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
            toast({ text: editingId ? '已更新' : `已記錄 ${formatDateZh(wDate, today)} 的體重` });
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
            <Field label="體重（kg）">
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
            <Field label="腰圍（cm，選填）">
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
              這一天已經有記錄，儲存後會取代它。
            </p>
          )}
          <div className="flex gap-2">
            {editingId && (
              <Button variant="secondary" onClick={resetForm}>
                取消
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={!valid}>
              {editingId ? '儲存修改' : '儲存'}
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
                        · 腰圍 {fmt1(e.waistCm)} cm
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
                  aria-label={`修改 ${e.date} 的體重`}
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
                  aria-label={`刪除 ${e.date} 的體重記錄`}
                  className="flex size-10 items-center justify-center rounded-2xl text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                  onClick={() => {
                    update((x) => removeWeight(x, e.id));
                    toast({
                      text: `已刪除 ${formatDateZh(e.date, today)} 的體重`,
                      actionLabel: '復原',
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
            {showAll ? '收起' : `顯示全部 ${entries.length} 筆`}
          </Button>
        )}
      </Card>

      <Card>
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center justify-between text-lg font-semibold">
            每日目標歷史
            <span className="text-sm font-normal text-slate-600 dark:text-slate-300">展開</span>
          </summary>
          <div className="mt-3">
            <ul className="space-y-1 text-sm">
              {[...s.targets].reverse().map((t) => (
                <li key={t.id} className="flex justify-between gap-3">
                  <span>{t.effectiveFrom}</span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {
                      { initial: '初始', profile_change: '資料更新', adaptive: '動態調整' }[
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

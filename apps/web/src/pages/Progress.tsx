import { addDays, trendOn } from '@fittrack/engine';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { WeightChart } from '../components/Charts';
import { useToast } from '../components/Toast';
import { Bar, Button, Card, Field, inputClass, PageTitle } from '../components/ui';
import {
  acceptChallenge,
  addTarget,
  dismissInsight,
  keepTarget,
  removeWeight,
  setWeightOn,
} from '../data/actions';
import { newId, update, useAppState } from '../data/store';
import type { AppState, Profile } from '../data/types';
import { formatDateZh, localToday } from '../lib/dates';
import { fmt1, fmtInt } from '../lib/format';
import { progressSummary } from '../logic/achievements';
import {
  activeChallenge,
  challengeProgress,
  challengeRecord,
  CHALLENGES,
  habitWeek,
  isChallengeId,
  STATUS_LABELS,
  suggestedChallenges,
  type ChallengeId,
  type HabitStatus,
} from '../logic/habits';
import { CATEGORY_LABELS, insightKey, insightsFor, type Insight } from '../logic/insights';
import {
  adaptiveFor,
  latestWeight,
  macrosForAdaptive,
  startWeightKg,
  targetOn,
  trendPoints,
} from '../logic/targets';
import {
  mondayOf,
  PERIOD_LABELS,
  periodRange,
  weeklySummary,
  WEEKLY_LOG_GOAL,
  type Period,
} from '../logic/weekly';

const REFUSAL_TEXT: Record<string, string> = {
  window_too_short: '目标开始后的头 14 天，体重变化主要是水分，之后才会评估。',
  not_enough_complete_logs: '最近 3 周需要至少八成的日子标记“已完整记录”。',
  not_enough_weigh_ins: '最近 3 周需要至少 10 次体重记录。',
  no_trend_at_window_start: '评估期开始前需要有体重记录。',
};

const REASON_LABELS = { initial: '初始', profile_change: '资料更新', adaptive: '动态调整' };

const WEEKDAY_SHORT = ['一', '二', '三', '四', '五', '六', '日'];

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`;
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${fmt1(Math.abs(n))}`;

/** Card with an anchor id and a heading row. */
function Section({
  id,
  icon,
  title,
  sub,
  action,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  sub?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="scroll-mt-20">
      <div id={id} className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg dark:bg-emerald/15"
          >
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg leading-tight font-black">{title}</h2>
            {sub && (
              <p className="text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">{sub}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

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

function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-slate-700/60">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-xl font-black tracking-tight">{value}</p>
      {note && (
        <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">{note}</p>
      )}
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
      <PageTitle sub="每一步都算数，慢慢找到适合自己的节奏。">我的成长</PageTitle>
      {hide && (
        <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          🙈 你已隐藏热量和体重数字，这里只显示习惯和记录情况。可以在
          <Link to="/me" className="font-semibold text-emerald-strong dark:text-emerald">
            「我的」
          </Link>
          重新打开。
        </p>
      )}
      <WeeklySection s={s} today={today} hide={hide} />
      {!hide && <BodySection s={s} profile={profile} today={today} />}
      <InsightsSection s={s} today={today} />
      <HabitsSection s={s} today={today} />
      <NextStepSection s={s} today={today} />
      {!hide && <AdjustSection s={s} profile={profile} today={today} />}
      {!hide && <WeightHistorySection s={s} today={today} />}
    </div>
  );
}

function WeeklySection({ s, today, hide }: { s: AppState; today: string; hide: boolean }) {
  const [period, setPeriod] = useState<Period>('this_week');
  const { start, end } = periodRange(period, today);
  const w = weeklySummary(s, start, end);
  const pct = Math.round((w.loggedDays / w.dayCount) * 100);
  const goalWord =
    s.profile &&
    (s.profile.goal === 'fat_loss' ? 'loss' : s.profile.goal === 'maintain' ? 'keep' : 'gain');

  return (
    <Section
      id="summary"
      icon="📅"
      title="本周总结"
      sub={`${md(start)} – ${md(end)}${period === 'this_week' ? '（周一至今天）' : ''}`}
      action={
        <Chips
          label="统计期间"
          value={period}
          onChange={setPeriod}
          options={(Object.keys(PERIOD_LABELS) as Period[]).map((p) => ({
            value: p,
            label: PERIOD_LABELS[p],
          }))}
        />
      }
    >
      {w.loggedDays === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
          <p className="text-2xl" aria-hidden="true">
            🍽️
          </p>
          <p className="mt-1 font-semibold">这段期间还没有饮食记录</p>
          <p className="mt-1">记录后，这里会显示平均热量、蛋白质和达标天数。</p>
          <Link
            to="/diary"
            className="mt-3 inline-flex min-h-11 items-center rounded-2xl bg-emerald-strong px-4 font-semibold text-white dark:bg-emerald dark:text-slate-950"
          >
            去记录饮食
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat
              label="有记录的天数"
              value={
                <>
                  {w.loggedDays}
                  <span className="text-sm font-semibold text-slate-500"> / {w.dayCount} 天</span>
                </>
              }
              note={`完成度 ${pct}%`}
            />
            <Stat
              label="完整记录"
              value={
                <>
                  {w.completeDays}
                  <span className="text-sm font-semibold text-slate-500"> 天</span>
                </>
              }
              note="已标记“已完整记录”"
            />
            {!hide && (
              <Stat
                label="平均热量"
                value={
                  <>
                    {fmtInt(w.avgKcal ?? 0)}
                    <span className="text-sm font-semibold text-slate-500"> kcal</span>
                  </>
                }
                note={
                  w.targetKcal !== null
                    ? `${w.loggedDays} 个有记录日 · 目标 ${fmtInt(w.targetKcal)}`
                    : `${w.loggedDays} 个有记录日`
                }
              />
            )}
            {!hide && (
              <Stat
                label="平均蛋白质"
                value={
                  <>
                    {fmtInt(w.avgProteinG ?? 0)}
                    <span className="text-sm font-semibold text-slate-500"> g</span>
                  </>
                }
                note={w.targetProteinG !== null ? `目标 ${w.targetProteinG} g` : undefined}
              />
            )}
            <Stat
              label="蛋白质达标"
              value={
                w.proteinJudgedDays > 0 ? (
                  <>
                    {w.proteinMetDays}
                    <span className="text-sm font-semibold text-slate-500">
                      {' '}
                      / {w.proteinJudgedDays} 天
                    </span>
                  </>
                ) : (
                  '—'
                )
              }
              note={w.proteinJudgedDays > 0 ? '以完整记录日计算' : '需要完整记录的日子'}
            />
            {!hide && (
              <Stat
                label="热量在目标范围"
                value={
                  w.completeDays > 0 ? (
                    <>
                      {w.withinTargetDays}
                      <span className="text-sm font-semibold text-slate-500">
                        {' '}
                        / {w.completeDays} 天
                      </span>
                    </>
                  ) : (
                    '—'
                  )
                }
                note="目标 ±10%，且不低于安全下限"
              />
            )}
          </div>
          {!hide && (
            <p className="mt-3 rounded-2xl bg-emerald-50/70 px-3 py-2.5 text-sm text-emerald-950 dark:bg-emerald/10 dark:text-emerald-50">
              ⚖️{' '}
              {w.weight ? (
                <>
                  体重 {md(w.weight.firstDate)} {fmt1(w.weight.first)} kg → {md(w.weight.lastDate)}{' '}
                  {fmt1(w.weight.last)} kg（<strong>{signed(w.weight.change)} kg</strong>）
                  {goalWord !== 'keep' && Math.abs(w.weight.change) >= 0.1 && (
                    <span className="block text-xs text-emerald-900/70 dark:text-emerald-50/70">
                      一周内的变化常受水分影响，长期趋势请看下面的“身体变化”。
                    </span>
                  )}
                </>
              ) : w.weighIns === 1 ? (
                '这段期间量了 1 次体重，再量一次就能看到变化。'
              ) : (
                '这段期间没有体重记录。'
              )}
            </p>
          )}
          {w.loggedDays < WEEKLY_LOG_GOAL && w.dayCount >= WEEKLY_LOG_GOAL && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              记录不到 {WEEKLY_LOG_GOAL} 天，平均值仅供参考。
            </p>
          )}
          <details className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <summary className="cursor-pointer font-semibold">怎么计算？</summary>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 leading-relaxed">
              <li>平均值只用有记录的日子计算，没有记录的日子不会当作 0。</li>
              <li>
                蛋白质与热量范围只看标记“已完整记录”的日子，避免只记了一样点心的日子影响结果。
              </li>
              <li>“在目标范围”是每日目标的 90%–110%，而且不低于安全下限，吃太少不会被算作达标。</li>
              <li>一周从周一开始，按你手机的日期计算。</li>
            </ul>
          </details>
        </>
      )}
    </Section>
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
      label="图表期间"
      value={range}
      onChange={setRange}
      options={(['7', '30', '90'] as const).map((r) => ({ value: r, label: `${r} 天` }))}
    />
  );

  if (!latest) {
    return (
      <Section id="body" icon="📈" title="身体变化">
        <div className="rounded-2xl bg-slate-50 p-5 text-center dark:bg-slate-700/60">
          <p className="text-3xl" aria-hidden="true">
            ⚖️
          </p>
          <p className="mt-2 font-semibold">记录第一次体重，开始看到身体的变化。</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            建议每天早上、上完厕所后、吃早餐前量，比较准确。
          </p>
          <Button className="mt-3" onClick={() => scrollToId('weights')}>
            ＋ 记录体重
          </Button>
        </div>
      </Section>
    );
  }

  const change = start !== null ? latest.weightKg - start : null;
  let changeText = '';
  if (change !== null) {
    if (Math.abs(change) < 0.05) changeText = '与起点相同';
    else if (goal === 'fat_loss')
      changeText = change < 0 ? `已减 ${fmt1(-change)} kg` : `比起点 +${fmt1(change)} kg`;
    else if (goal === 'maintain') changeText = `与起点相差 ${signed(change)} kg`;
    else changeText = change > 0 ? `已增 ${fmt1(change)} kg` : `比起点 −${fmt1(-change)} kg`;
  }
  const toGoal = goalKg !== undefined && goal !== 'maintain' ? goalKg - latest.weightKg : null;
  const reached = toGoal !== null && (goal === 'fat_loss' ? toGoal >= 0 : toGoal <= 0);

  return (
    <Section id="body" icon="📈" title="身体变化" action={action}>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-slate-50 px-2 py-2 dark:bg-slate-700/60">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">起点</p>
          <p className="font-black">{start !== null ? `${fmt1(start)} kg` : '—'}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-2 py-2 dark:bg-emerald/15">
          <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">最新</p>
          <p className="font-black">{fmt1(latest.weightKg)} kg</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-2 py-2 dark:bg-slate-700/60">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">目标</p>
          <p className="font-black">
            {goal === 'maintain' ? '维持' : goalKg !== undefined ? `${fmt1(goalKg)} kg` : '未设定'}
          </p>
        </div>
      </div>
      <p className="mb-3 text-sm text-slate-700 dark:text-slate-200">
        {changeText && <strong>{changeText}</strong>}
        {toGoal !== null &&
          (reached ? (
            <span> · 🎉 已到达目标体重</span>
          ) : (
            <span> · 距离目标还差 {fmt1(Math.abs(toGoal))} kg</span>
          ))}
        <span className="block text-xs text-slate-500 dark:text-slate-400">
          最新记录：{formatDateZh(latest.date, today)}
        </span>
      </p>
      {points.length < 2 ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
          再记录一次体重，就能画出变化趋势。
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
            灰点是每次的体重（点一下看数值），绿线是平滑后的趋势，虚线是起点和目标。体重每天会因水分、盐分起伏，看绿线就好。
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

  return (
    <Section
      id="insights"
      icon="🔍"
      title="专属健康洞察"
      sub={`根据你近 7 天（${md(addDays(today, -6))} – ${md(today)}）的记录`}
    >
      {list.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
          暂时没有新的洞察。继续记录，我们会在发现规律时告诉你。
        </p>
      ) : (
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
                        toast({ text: '本周不再显示这条洞察' });
                      }}
                    >
                      本周不再显示
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {list.length > 3 && (
        <Button variant="ghost" className="mt-2 w-full" onClick={() => setShowAll((v) => !v)}>
          {showAll ? '收起' : `查看全部 ${list.length} 条`}
        </Button>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        洞察由固定规则根据你的记录产生，只供参考，不是医疗诊断。如有健康问题，请咨询医生或营养师。
      </p>
    </Section>
  );
}

const STATUS_STYLE: Record<HabitStatus, string> = {
  done: 'bg-emerald-500 text-white',
  partial: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-700/60 dark:text-emerald-50',
  none: 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500',
  na: 'bg-transparent text-slate-300 dark:text-slate-600',
  future: 'border border-dashed border-slate-200 dark:border-slate-600',
};
const STATUS_MARK: Record<HabitStatus, string> = {
  done: '✓',
  partial: '½',
  none: '',
  na: '–',
  future: '',
};

function HabitsSection({ s, today }: { s: AppState; today: string }) {
  const week = mondayOf(today);
  const rows = habitWeek(s, week, today);
  const active = activeChallenge(s, week);
  const summary = progressSummary(s, today);
  const unlocked = summary.badges.filter((b) => b.unlocked).length;
  const next = summary.badges
    .filter((b) => !b.unlocked)
    .sort((a, b) => b.progress.value / b.progress.max - a.progress.value / a.progress.max)[0];
  const [showBadges, setShowBadges] = useState(false);

  return (
    <Section
      id="habits"
      icon="🌱"
      title="健康习惯"
      sub={`本周 ${md(week)} – ${md(addDays(week, 6))}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[19rem] border-separate border-spacing-1 text-center text-sm">
          <caption className="sr-only">本周每天的习惯完成情况</caption>
          <thead>
            <tr>
              <th scope="col" className="text-left text-xs font-semibold text-slate-500">
                <span className="sr-only">习惯</span>
              </th>
              {WEEKDAY_SHORT.map((d, i) => (
                <th
                  key={d}
                  scope="col"
                  className={`text-xs font-semibold ${addDays(week, i) === today ? 'text-emerald-strong dark:text-emerald' : 'text-slate-500'}`}
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.id}>
                <th
                  scope="row"
                  className="pr-1 text-left text-xs font-semibold whitespace-nowrap"
                  title={h.hint}
                >
                  {h.label}
                </th>
                {h.days.map((d) => (
                  <td key={d.date}>
                    <span
                      className={`mx-auto flex size-7 items-center justify-center rounded-lg text-xs font-bold ${STATUS_STYLE[d.status]}`}
                      title={`${md(d.date)} ${STATUS_LABELS[d.status]}`}
                    >
                      <span aria-hidden="true">{STATUS_MARK[d.status]}</span>
                      <span className="sr-only">
                        {md(d.date)} {STATUS_LABELS[d.status]}
                      </span>
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
        {(['done', 'partial', 'none', 'future'] as const).map((k) => (
          <li key={k} className="flex items-center gap-1">
            <span
              aria-hidden="true"
              className={`flex size-4 items-center justify-center rounded text-[9px] font-bold ${STATUS_STYLE[k]}`}
            >
              {STATUS_MARK[k]}
            </span>
            {STATUS_LABELS[k]}
          </li>
        ))}
      </ul>
      <details className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        <summary className="cursor-pointer font-semibold">完成标准</summary>
        <ul className="mt-1.5 list-disc space-y-1 pl-4">
          {rows.map((h) => (
            <li key={h.id}>
              <strong>{h.label}</strong>：{h.hint}
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-4 rounded-2xl border border-slate-200 p-3 dark:border-slate-600">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">每周自选目标</p>
        {active && isChallengeId(active.challenge) ? (
          <ChallengeProgress s={s} id={active.challenge} week={week} />
        ) : (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            这周还没有选择目标（可选）。
            <button
              type="button"
              className="font-semibold text-emerald-strong underline-offset-2 hover:underline dark:text-emerald"
              onClick={() => scrollToId('next')}
            >
              去选一个
            </button>
          </p>
        )}
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-700">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-bold">🏆 成就</h3>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {unlocked} / {summary.badges.length}
          </span>
        </div>
        <div className="mb-3 flex gap-2 text-center text-xs">
          <div className="flex-1 rounded-2xl bg-orange-50 py-2 dark:bg-orange-500/10">
            <p className="text-lg font-black">🔥 {summary.streak}</p>
            <p className="text-slate-600 dark:text-slate-300">目前连续记录（天）</p>
          </div>
          <div className="flex-1 rounded-2xl bg-slate-50 py-2 dark:bg-slate-700/60">
            <p className="text-lg font-black">{summary.longest}</p>
            <p className="text-slate-600 dark:text-slate-300">最长连续（天）</p>
          </div>
          <div className="flex-1 rounded-2xl bg-slate-50 py-2 dark:bg-slate-700/60">
            <p className="text-lg font-black">{summary.daysLogged}</p>
            <p className="text-slate-600 dark:text-slate-300">累计记录（天）</p>
          </div>
        </div>
        {next && (
          <div className="mb-3 rounded-2xl bg-amber-50 px-3 py-2.5 text-sm dark:bg-amber-500/10">
            <p>
              下一个：
              <strong>
                {next.icon} {next.title}
              </strong>{' '}
              — {next.need}
            </p>
            {next.progress.max > 1 && (
              <>
                <Bar value={next.progress.value} max={next.progress.max} color="bg-amber-400" />
                <p className="mt-1 text-right text-[11px] text-slate-500">
                  {fmt1(next.progress.value).replace(/\.0$/, '')} / {next.progress.max}
                </p>
              </>
            )}
          </div>
        )}
        <Button variant="ghost" className="w-full" onClick={() => setShowBadges((v) => !v)}>
          {showBadges ? '收起成就' : '查看全部成就'}
        </Button>
        {showBadges && (
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
        )}
      </div>
    </Section>
  );
}

function ChallengeProgress({ s, id, week }: { s: AppState; id: ChallengeId; week: string }) {
  const p = challengeProgress(s, id, week);
  return (
    <div className="mt-1">
      <p className="flex items-center justify-between gap-2 text-sm font-semibold">
        <span>{CHALLENGES[id].title}</span>
        <span className={p.done ? 'text-emerald-strong dark:text-emerald' : 'text-slate-500'}>
          {p.done ? '✓ 完成' : `${p.value} / ${p.max}`}
        </span>
      </p>
      <Bar value={p.value} max={p.max} color="bg-emerald-500" />
    </div>
  );
}

function NextStepSection({ s, today }: { s: AppState; today: string }) {
  const toast = useToast();
  const week = mondayOf(today);
  const active = activeChallenge(s, week);
  const options = suggestedChallenges(s, today);
  const [index, setIndex] = useState(0);
  const daysLeft = 6 - ((new Date(`${today}T00:00:00`).getDay() + 6) % 7);

  if (active && isChallengeId(active.challenge)) {
    const id = active.challenge;
    const p = challengeProgress(s, id, week);
    return (
      <Section id="next" icon="🎯" title="下一个小目标" sub="本周挑战进行中">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 dark:from-emerald/15 dark:to-teal-500/10">
          <ChallengeProgress s={s} id={id} week={week} />
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {p.done
              ? '🎉 这周的挑战完成了！下周一可以选新的挑战。'
              : `${CHALLENGES[id].why} 还有 ${daysLeft + 1} 天（到周日）。`}
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => scrollToId('habits')}>
            查看进度
          </Button>
          {!p.done && (
            <Button
              variant="ghost"
              onClick={() => {
                update((x) => acceptChallenge(x, challengeRecord(id, week, true)));
                setIndex(0);
                toast({ text: '已放弃这周的挑战，可以重新选一个' });
              }}
            >
              换一个目标
            </Button>
          )}
        </div>
      </Section>
    );
  }

  if (options.length === 0) {
    return (
      <Section id="next" icon="🎯" title="下一个小目标">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          🎉 这周所有挑战的条件都已经达到了，下周一再来选新的挑战吧。
        </p>
      </Section>
    );
  }

  const id = options[index % options.length]!;
  const p = challengeProgress(s, id, week);
  return (
    <Section id="next" icon="🎯" title="下一个小目标" sub="根据你近 7 天最需要加强的习惯推荐">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 dark:from-emerald/15 dark:to-teal-500/10">
        <p className="text-lg font-black">{CHALLENGES[id].title}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{CHALLENGES[id].why}</p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          这周目前 {p.value} / {p.max} · 挑战到周日结束，可随时更换
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          onClick={() => {
            update((x) => acceptChallenge(x, challengeRecord(id, week)));
            toast({ text: '挑战开始！进度会根据你的记录自动更新' });
          }}
        >
          开始挑战
        </Button>
        <Button
          variant="secondary"
          disabled={options.length < 2}
          onClick={() => setIndex((i) => i + 1)}
        >
          换一个目标
        </Button>
      </div>
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

  let body: ReactNode;
  if (cooldown) {
    body = (
      <p className="text-sm">
        上一次调整在 {formatDateZh(lastAdaptive.effectiveFrom, today)}
        。新目标需要约两周才看得出效果，
        {formatDateZh(addDays(lastAdaptive.effectiveFrom, 14), today)} 之后会再评估。
      </p>
    );
  } else if (!adaptive?.ok) {
    body = (
      <div className="space-y-2 text-sm">
        <p>需要更多记录，才能可靠地估算你的实际消耗。还需要：</p>
        <ul className="list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-200">
          {(adaptive && !adaptive.ok ? adaptive.reasons : []).map((r) => (
            <li key={r}>{REFUSAL_TEXT[r]}</li>
          ))}
        </ul>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          在那之前，会继续使用按公式计算的目标 {fmtInt(target.caloriesKcal)} kcal。
        </p>
      </div>
    );
  } else if (adaptive.proposedTargetKcal === target.caloriesKcal) {
    body = (
      <p className="text-sm">
        ✓ 根据 {md(adaptive.windowStart)} – {md(adaptive.windowEnd)} 的记录，目前的目标{' '}
        {fmtInt(target.caloriesKcal)} kcal 合适，不需要调整。
      </p>
    );
  } else if (kept) {
    body = (
      <p className="text-sm">
        你在 {formatDateZh(keptOn, today)} 选择保留目前的目标 {fmtInt(target.caloriesKcal)} kcal。
        {formatDateZh(addDays(keptOn, 14), today)} 之后会再提供建议。
      </p>
    );
  } else {
    const up = adaptive.proposedTargetKcal > target.caloriesKcal;
    const floored = adaptive.proposedTargetKcal <= target.calorieFloorKcal;
    body = (
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-center gap-3 rounded-2xl bg-slate-50 py-3 dark:bg-slate-700/60">
          <div className="text-center">
            <p className="text-xs text-slate-500">目前</p>
            <p className="text-lg font-black">{fmtInt(target.caloriesKcal)}</p>
          </div>
          <span aria-hidden="true" className="text-xl text-slate-400">
            →
          </span>
          <div className="text-center">
            <p className="text-xs text-slate-500">建议</p>
            <p className="text-lg font-black text-emerald-strong dark:text-emerald">
              {fmtInt(adaptive.proposedTargetKcal)}
            </p>
          </div>
          <span className="text-xs text-slate-500">kcal / 天</span>
        </div>
        <p>
          在 {md(adaptive.windowStart)} – {md(adaptive.windowEnd)}（{adaptive.windowDays}{' '}
          天）里，你完整记录日的平均摄取是 {fmtInt(adaptive.meanIntakeKcal)} kcal，趋势体重变化{' '}
          {signed(adaptive.trendChangeKg)} kg，推算你的实际消耗约{' '}
          {fmtInt(adaptive.observedTdeeKcal)} kcal，所以建议把目标{up ? '调高' : '调低'}。
        </p>
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          这是估计值：漏记的食物、水分变化或生理周期都会影响结果。
          {floored && `建议已按安全下限 ${fmtInt(target.calorieFloorKcal)} kcal 设定，不会更低。`}
          只有你按“采用”才会改变目标，旧目标会保留在历史中。
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
              toast({ text: `已采用，新的每日目标是 ${fmtInt(adaptive.proposedTargetKcal)} kcal` });
            }}
          >
            采用建议
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              update((x) => keepTarget(x, today));
              toast({ text: '已保留目前的目标，两周后再评估' });
            }}
          >
            保留目前目标
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Section
      id="adjust"
      icon="⚙️"
      title="目标调整建议"
      sub="根据实际记录微调每日热量，由你决定是否采用"
    >
      {body}
    </Section>
  );
}

function WeightHistorySection({ s, today }: { s: AppState; today: string }) {
  const toast = useToast();
  const [w, setW] = useState('');
  const [waist, setWaist] = useState('');
  const [wDate, setWDate] = useState(today);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resetForm = () => {
    setEditingId(null);
    setWDate(today);
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

  return (
    <Section id="weights" icon="⚖️" title="体重记录" sub="可补记过去的日子，也可以修改或删除">
      <form
        className="space-y-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-700/40"
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
        <p className="text-sm font-bold">{editingId ? '修改体重记录' : '＋ 新增体重记录'}</p>
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
                ref={inputRef}
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
        {w.trim() !== '' && (kg < 30 || kg > 300) && (
          <p className="text-xs text-red-700 dark:text-red-400">体重需在 30–300 kg 之间。</p>
        )}
        {!editingId && w.trim() !== '' && s.weights.some((x) => x.date === wDate) && (
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

      {entries.length === 0 ? (
        <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
          还没有体重记录。
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-700">
          {entries.slice(0, showAll ? undefined : 7).map((e) => (
            <li key={e.id} className="flex items-center gap-2 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {fmt1(e.weightKg)} kg
                  {e.waistCm !== undefined && (
                    <span className="font-normal text-slate-600 dark:text-slate-300">
                      {' '}
                      · 腰围 {fmt1(e.waistCm)} cm
                    </span>
                  )}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
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
                  scrollToId('weights');
                  inputRef.current?.focus({ preventScroll: true });
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
                  if (editingId === e.id) resetForm();
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

      <details className="mt-3 rounded-2xl border border-slate-100 px-3 dark:border-slate-700">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between text-sm font-semibold">
          每日目标历史（{s.targets.length}）
          <span className="text-xs font-normal text-slate-500">展开</span>
        </summary>
        <ul className="space-y-1.5 pb-3 text-sm">
          {[...s.targets]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((t) => (
              <li key={t.id} className="flex justify-between gap-3">
                <span>{t.effectiveFrom}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {REASON_LABELS[t.reason]}
                </span>
                <span className="font-semibold">{fmtInt(t.caloriesKcal)} kcal</span>
              </li>
            ))}
        </ul>
      </details>
    </Section>
  );
}

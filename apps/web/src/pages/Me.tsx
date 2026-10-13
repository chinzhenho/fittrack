import {
  ACTIVITY_FACTORS,
  ageOn,
  EngineInputError,
  RATE_PCT_PER_WEEK,
  SEX_CONSTANT,
  type ActivityLevel,
  type FormulaSex,
  type Goal,
} from '@fittrack/engine';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useToast } from '../components/Toast';
import {
  BackArrow,
  backButtonClass,
  Button,
  Card,
  CardTitle,
  Check,
  Field,
  inputClass,
  Notice,
  PageTitle,
  Segmented,
} from '../components/ui';
import { addTarget, saveProfile, setHideNumbers, updateProfileDetails } from '../data/actions';
import { useAuth } from '../data/auth';
import {
  deleteAccount,
  deleteHealthRecords,
  signOut,
  useSync,
  type SyncStatus,
} from '../data/sync';
import { getState, isPersistent, newId, replaceState, update, useAppState } from '../data/store';
import { emptyState, type DietTag, type Profile, type TargetVersion } from '../data/types';
import { localToday } from '../lib/dates';
import { fmt1, fmtInt } from '../lib/format';
import {
  ACTIVITY_LABELS,
  clampMessage,
  DIET_LABELS,
  fieldMessage,
  GOAL_LABELS,
  rejectMessage,
  SEX_LABELS,
} from '../lib/messages';
import { setTheme, useTheme, type Theme } from '../lib/theme';
import { latestWeight, planFor, targetFromPlan, targetOn } from '../logic/targets';

const RATE_OPTIONS: Record<Goal, number[]> = {
  fat_loss: [0.25, 0.5, 0.75, 1],
  maintain: [0],
  muscle_gain: [0.1, 0.25, 0.5],
  weight_gain: [0.25, 0.5],
};

const SYNC_TEXT: Record<SyncStatus, string> = {
  off: '',
  syncing: '同步中…',
  synced: '✓ 记录已同步到你的账号',
  offline: '目前离线：记录先保存在这部设备，恢复网络后会自动同步。',
  error: '同步失败，稍后会自动重试。',
};

const REASON_LABELS: Record<TargetVersion['reason'], string> = {
  initial: '初始',
  profile_change: '资料更新',
  adaptive: '动态调整',
};

const AVATARS = ['🥗', '🍎', '🥑', '🍳', '🍜', '🍛', '🥦', '🍓', '💪', '🏃', '🧘', '😊'];

type Mode = 'home' | 'plan' | 'profile' | 'targets';

type Macros = Pick<TargetVersion, 'caloriesKcal' | 'proteinG' | 'carbsG' | 'fatG'>;

/** Old and new daily targets side by side, before the user confirms a change. */
function TargetCompare({
  before,
  after,
  onConfirm,
  onKeep,
}: {
  before: Macros;
  after: Macros;
  onConfirm: () => void;
  onKeep: () => void;
}) {
  const rows: { k: string; a: number; b: number; u: string }[] = [
    { k: '每日热量', a: before.caloriesKcal, b: after.caloriesKcal, u: 'kcal' },
    { k: '蛋白质', a: before.proteinG, b: after.proteinG, u: 'g' },
    { k: '碳水化合物', a: before.carbsG, b: after.carbsG, u: 'g' },
    { k: '脂肪', a: before.fatG, b: after.fatG, u: 'g' },
  ];
  return (
    <div
      role="region"
      aria-label="新旧目标比较"
      className="space-y-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald/40 dark:bg-emerald/10"
    >
      <p className="font-bold">确认更新每日目标？</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 dark:text-slate-400">
            <th scope="col" className="text-left font-semibold">
              项目
            </th>
            <th scope="col" className="text-right font-semibold">
              原本
            </th>
            <th scope="col" className="text-right font-semibold">
              更新后
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.k} className="border-t border-emerald-100 dark:border-emerald/20">
              <th scope="row" className="py-1.5 text-left font-medium">
                {r.k}
              </th>
              <td className="text-right text-slate-500 dark:text-slate-400">
                {fmtInt(r.a)} {r.u}
              </td>
              <td className="text-right font-bold">
                {fmtInt(r.b)} {r.u}
                {r.b !== r.a && (
                  <span className="ml-1 text-xs font-semibold text-emerald-strong dark:text-emerald">
                    ({r.b > r.a ? '+' : '−'}
                    {fmtInt(Math.abs(r.b - r.a))})
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-600 dark:text-slate-300">
        新目标从今天开始生效。以前的饮食记录和目标历史都会保留，不会被改动。
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onKeep}>
          保留原计划
        </Button>
        <Button onClick={onConfirm}>确认更新</Button>
      </div>
    </div>
  );
}

function Row({
  to,
  icon,
  title,
  sub,
}: {
  to: string;
  icon: string;
  title: string;
  sub?: ReactNode;
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700"
      >
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg dark:bg-slate-700"
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          {sub && (
            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{sub}</span>
          )}
        </span>
        <span aria-hidden="true" className="text-slate-400">
          ›
        </span>
      </Link>
    </li>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 px-1 text-xs font-bold tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </h2>
      <Card className="p-3">{children}</Card>
    </section>
  );
}

function BackToMe() {
  return (
    <Link to="/me" className={backButtonClass}>
      <BackArrow />
      我的
    </Link>
  );
}

export function Me({ mode = 'home' }: { mode?: Mode }) {
  const s = useAppState();
  const toast = useToast();
  const navigate = useNavigate();
  const theme = useTheme();
  const today = useMemo(() => localToday(), []);
  const profile = s.profile;
  const [draft, setDraft] = useState<Profile | null>(profile);
  const [heightText, setHeightText] = useState(String(profile?.heightCm ?? ''));
  const [targetText, setTargetText] = useState(
    profile?.targetWeightKg !== undefined ? String(profile.targetWeightKg) : '',
  );
  const [confirming, setConfirming] = useState(false);
  const [danger, setDanger] = useState<'records' | 'account' | 'device' | null>(null);
  const [deleteWord, setDeleteWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth();
  const sync = useSync();
  if (!profile || !draft) return null;
  const signedIn = auth.status === 'signedIn';
  const email = signedIn ? (auth.user.email ?? '') : '';

  const weight = latestWeight(s.weights)?.weightKg ?? 0;
  const target = targetOn(s.targets, today);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setDraft({ ...draft, [k]: v });
  // The profile as it would be saved: typed height and target weight applied, empty
  // optional texts removed (exactOptionalPropertyTypes: no undefined values).
  const candidate: Profile = (() => {
    const rest: Profile = { ...draft };
    delete rest.targetWeightKg;
    delete rest.nickname;
    const nickname = draft.nickname?.trim().slice(0, 20);
    return {
      ...rest,
      heightCm: Number(heightText),
      ...(targetText.trim() !== '' &&
        draft.goal !== 'maintain' && {
          targetWeightKg: Number(targetText),
        }),
      ...(nickname && { nickname }),
    };
  })();
  // Fields managed elsewhere (display toggle, dates) do not count as an edit.
  const comparable = (p: Profile) =>
    JSON.stringify({ ...p, hideNumbers: false, goalStartDate: '', consentedAt: '' });
  const changed = comparable(candidate) !== comparable(profile);
  // Name, avatar and target weight do not change the calorie target.
  const forTarget = (p: Profile) => {
    const rest: Profile = { ...p };
    delete rest.nickname;
    delete rest.avatar;
    delete rest.targetWeightKg;
    delete rest.waterActivity;
    return comparable(rest);
  };
  const targetChanges = forTarget(candidate) !== forTarget(profile);

  let preview: ReturnType<typeof planFor> | null = null;
  let invalid: string | null = null;
  try {
    preview = planFor(candidate, weight, today);
  } catch (e) {
    if (e instanceof EngineInputError) invalid = e.field;
    else throw e;
  }

  const save = () => {
    if (!preview?.ok) return;
    if (!targetChanges) {
      update((x) =>
        updateProfileDetails(x, { ...candidate, goalStartDate: profile.goalStartDate }),
      );
      toast({ text: '已保存' });
      navigate('/me');
      return;
    }
    const next: Profile = {
      ...candidate,
      goalStartDate:
        draft.goal !== profile.goal || draft.ratePctPerWeek !== profile.ratePctPerWeek
          ? today
          : profile.goalStartDate,
    };
    const now = new Date().toISOString();
    update((x) =>
      saveProfile(
        x,
        next,
        targetFromPlan(
          preview.plan,
          { id: newId(), effectiveFrom: today, createdAt: now, reason: 'profile_change' },
          weight,
        ),
      ),
    );
    toast({ text: `已更新，新的每日目标是 ${fmtInt(preview.plan.caloriesKcal)} kcal` });
    navigate('/me');
  };

  const keepPlan = () => {
    setDraft(profile);
    setHeightText(String(profile.heightCm));
    setTargetText(profile.targetWeightKg !== undefined ? String(profile.targetWeightKg) : '');
    setConfirming(false);
    toast({ text: '已保留原计划，没有任何改动' });
    navigate('/me');
  };

  const saveBar = (label: string) => (
    <>
      {changed && preview && !preview.ok && (
        <Notice tone="warn" title={rejectMessage(preview.reason).title}>
          {rejectMessage(preview.reason).body}
        </Notice>
      )}
      {confirming && changed && targetChanges && preview?.ok && target ? (
        <TargetCompare
          before={target}
          after={{ caloriesKcal: preview.plan.caloriesKcal, ...preview.plan.macros }}
          onConfirm={save}
          onKeep={keepPlan}
        />
      ) : (
        <Button
          className="min-h-12 w-full text-base"
          disabled={!changed || !preview?.ok}
          onClick={() => (targetChanges && target ? setConfirming(true) : save())}
        >
          {changed && targetChanges && target ? '预览新的每日目标' : label}
        </Button>
      )}
    </>
  );

  if (mode === 'profile') {
    const avatarNow = draft.avatar ?? (signedIn ? (email[0] ?? '🙂').toUpperCase() : '🙂');
    return (
      <div className="space-y-4">
        <BackToMe />
        <PageTitle sub="昵称和头像只用来显示；身体资料用来计算你的每日目标。">个人资料</PageTitle>

        <Card className="space-y-5">
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="flex size-20 shrink-0 items-center justify-center rounded-full border-4 border-emerald-500 bg-emerald-50 text-4xl font-bold text-emerald-800 dark:bg-emerald/15 dark:text-emerald-100"
            >
              {avatarNow}
            </span>
            <div className="min-w-0 flex-1">
              <Field label="昵称（选填）">
                {(p) => (
                  <input
                    {...p}
                    maxLength={20}
                    placeholder="例如：小明"
                    value={draft.nickname ?? ''}
                    onChange={(e) => setDraft({ ...draft, nickname: e.target.value })}
                    className={inputClass}
                  />
                )}
              </Field>
            </div>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">头像</legend>
            <div className="mt-2 grid grid-cols-6 gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-label={`头像 ${a}`}
                  aria-pressed={draft.avatar === a}
                  onClick={() => setDraft({ ...draft, avatar: a })}
                  className={`flex aspect-square items-center justify-center rounded-2xl text-2xl transition ${draft.avatar === a ? 'bg-emerald-100 ring-2 ring-emerald-strong dark:bg-emerald/20 dark:ring-emerald' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card className="space-y-5">
          <CardTitle>身体资料</CardTitle>
          <Segmented
            label="计算公式"
            hint="Mifflin–St Jeor 公式分男性与女性版本；中性为两者平均"
            value={draft.formulaSex}
            options={(Object.keys(SEX_LABELS) as FormulaSex[]).map((x) => ({
              value: x,
              label: SEX_LABELS[x],
            }))}
            onChange={(v) => set('formulaSex', v)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="出生日期"
              error={invalid === 'birthDate' ? fieldMessage('birthDate') : null}
            >
              {(p) => (
                <input
                  {...p}
                  type="date"
                  max={today}
                  value={draft.birthDate}
                  onChange={(e) => set('birthDate', e.target.value)}
                  className={inputClass}
                />
              )}
            </Field>
            <Field
              label="身高（cm）"
              error={invalid === 'heightCm' ? fieldMessage('heightCm') : null}
            >
              {(p) => (
                <input
                  {...p}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={heightText}
                  onChange={(e) => setHeightText(e.target.value)}
                  className={inputClass}
                />
              )}
            </Field>
          </div>
          {draft.goal !== 'maintain' && (
            <Field
              label="目标体重（kg，选填）"
              hint="只用来显示进度，不影响每日热量"
              error={
                invalid === 'targetWeightKg'
                  ? draft.goal === 'fat_loss'
                    ? '目标体重需低于现在的体重。'
                    : '目标体重需高于现在的体重。'
                  : null
              }
            >
              {(p) => (
                <input
                  {...p}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={targetText}
                  onChange={(e) => setTargetText(e.target.value)}
                  className={inputClass}
                />
              )}
            </Field>
          )}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-700">
            <span>
              目前体重 <strong>{profile.hideNumbers ? '已隐藏' : `${fmt1(weight)} kg`}</strong>
            </span>
            <Link
              to="/progress#weights"
              className="font-semibold text-emerald-strong dark:text-emerald"
            >
              去记录体重 ›
            </Link>
          </div>
          {saveBar('保存个人资料')}
        </Card>
      </div>
    );
  }

  if (mode === 'plan') {
    return (
      <div className="space-y-4">
        <BackToMe />
        <PageTitle sub="改完后会先显示新旧目标比较，由你确认才会更新。">目标与生活方式</PageTitle>
        <Card className="space-y-5">
          <CardTitle>目标</CardTitle>
          <Segmented
            label="目标"
            value={draft.goal}
            options={(Object.keys(GOAL_LABELS) as Goal[]).map((g) => ({
              value: g,
              label: GOAL_LABELS[g],
            }))}
            onChange={(g) =>
              setDraft({ ...draft, goal: g, ratePctPerWeek: RATE_PCT_PER_WEEK[g].default })
            }
          />
          {draft.goal !== 'maintain' && (
            <Segmented
              label="每周体重变化（占体重的百分比）"
              value={String(draft.ratePctPerWeek)}
              options={RATE_OPTIONS[draft.goal].map((r) => ({ value: String(r), label: `${r}%` }))}
              onChange={(v) => set('ratePctPerWeek', Number(v))}
            />
          )}
        </Card>

        <Card className="space-y-5">
          <CardTitle>生活与健康</CardTitle>
          <Segmented
            label="日常活动水平"
            value={draft.activityLevel}
            options={(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => ({
              value: a,
              label: ACTIVITY_LABELS[a].name,
              sub: ACTIVITY_LABELS[a].hint,
            }))}
            onChange={(v) => set('activityLevel', v)}
          />
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">健康状况</legend>
            <Check
              checked={draft.screening.pregnantOrLactating}
              onChange={(v) => set('screening', { ...draft.screening, pregnantOrLactating: v })}
            >
              正在怀孕或哺乳
            </Check>
            <Check
              checked={draft.screening.eatingDisorderHistory}
              onChange={(v) => set('screening', { ...draft.screening, eatingDisorderHistory: v })}
            >
              曾被诊断或正在接受饮食失调治疗
            </Check>
            <Check
              checked={draft.screening.kidneyDisease}
              onChange={(v) => set('screening', { ...draft.screening, kidneyDisease: v })}
            >
              有肾脏疾病
            </Check>
          </fieldset>
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">饮食偏好</legend>
            {(Object.keys(DIET_LABELS) as DietTag[]).map((t) => (
              <Check
                key={t}
                checked={draft.dietTags.includes(t)}
                onChange={(on) =>
                  set(
                    'dietTags',
                    on ? [...draft.dietTags, t] : draft.dietTags.filter((x) => x !== t),
                  )
                }
              >
                {DIET_LABELS[t]}
              </Check>
            ))}
          </fieldset>

          {saveBar('保存')}
        </Card>
      </div>
    );
  }

  if (mode === 'targets') {
    return (
      <TargetsPage
        profile={profile}
        target={target}
        targets={s.targets}
        weight={weight}
        today={today}
      />
    );
  }

  const initial = profile.avatar ?? (signedIn ? (email[0] ?? '?').toUpperCase() : '🙂');
  const hide = profile.hideNumbers;

  const exportData = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eathealthee-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ text: '已开始下载备份文件' });
  };

  const run = async (job: () => Promise<string | null>, onDone: () => void) => {
    setBusy(true);
    setError(null);
    const err = await job();
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    onDone();
  };

  const closeDanger = () => {
    setDanger(null);
    setDeleteWord('');
    setError(null);
  };

  return (
    <div className="space-y-5">
      <PageTitle sub="管理你的健康计划与应用设置。">我的</PageTitle>

      <section className="rounded-3xl bg-gradient-to-br from-[#5cae6f] via-[#43955f] to-[#2f6e5b] p-5 text-white shadow-md">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-white/60 bg-white/20 text-3xl font-bold"
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-black">
              {profile.nickname ?? (signedIn ? '未设定昵称' : '访客')}
            </p>
            <p className="truncate text-sm text-emerald-50">{signedIn ? email : '未登录'}</p>
          </div>
          <Link
            to="/me/profile"
            className="shrink-0 rounded-full border border-white/50 px-3 py-1.5 text-xs font-bold hover:bg-white/15"
          >
            编辑资料
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-white/20 px-3 py-1">🎯 {GOAL_LABELS[profile.goal]}</span>
          {target && !hide && (
            <span className="rounded-full bg-white/20 px-3 py-1">
              🔥 每日 {fmtInt(target.caloriesKcal)} kcal
            </span>
          )}
        </div>
        {signedIn && SYNC_TEXT[sync.status] && (
          <p className="mt-3 text-xs text-emerald-50">{SYNC_TEXT[sync.status]}</p>
        )}
        {!signedIn && (
          <div className="mt-4 flex gap-2">
            <Link
              to="/signup"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-emerald-900"
            >
              注册账号
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-white/50 px-4 text-sm font-semibold"
            >
              登录
            </Link>
          </div>
        )}
      </section>

      <Group title="我的健康计划">
        <ul>
          <Row
            to="/me/plan"
            icon="🎯"
            title="目标与生活方式"
            sub={`${GOAL_LABELS[profile.goal]}${profile.goal !== 'maintain' ? ` · 每周 ${profile.ratePctPerWeek}%` : ''} · ${ACTIVITY_LABELS[profile.activityLevel].name}`}
          />
          <Row
            to="/me/profile"
            icon="🙂"
            title="身体资料"
            sub={`身高 ${profile.heightCm} cm · 出生 ${profile.birthDate}${profile.targetWeightKg !== undefined && !hide ? ` · 目标 ${fmt1(profile.targetWeightKg)} kg` : ''}`}
          />
          <Row
            to="/me/targets"
            icon="🍽️"
            title="每日营养目标"
            sub={
              target && !hide
                ? `${fmtInt(target.caloriesKcal)} kcal · 蛋白质 ${target.proteinG} g · 计算方式与历史`
                : '计算方式与目标历史'
            }
          />
          <Row
            to="/progress#weights"
            icon="⚖️"
            title="体重记录"
            sub={hide ? '新增、修改或删除体重' : weight ? `最新 ${fmt1(weight)} kg` : '还没有记录'}
          />
        </ul>
      </Group>

      <Group title="外观与显示">
        <div className="space-y-4 p-2">
          <Segmented<Theme>
            label="主题"
            value={theme}
            options={[
              { value: 'light', label: '☀️ 浅色' },
              { value: 'dark', label: '🌙 深色' },
              { value: 'system', label: '跟随手机' },
            ]}
            onChange={setTheme}
          />
          <div>
            <Check checked={hide} onChange={(v) => update((x) => setHideNumbers(x, v))}>
              隐藏热量和体重数字
            </Check>
            <p className="mt-1 pl-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              开启后，今天、饮食、我的成长等页面不显示热量和体重数字，只显示习惯与记录情况，适合不想被数字影响心情，或在别人面前打开应用时使用。这只是画面上的隐私：资料仍会照常保存、同步，导出的备份也包含数字。
            </p>
          </div>
          <p className="rounded-2xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
            📏 单位：公制（公斤 kg、厘米 cm、千卡 kcal）。目前只支持公制。
          </p>
        </div>
      </Group>

      <Group title="提醒与通知">
        <div className="space-y-2 p-2 text-sm leading-relaxed">
          <p>
            🔕 EatHealthee 目前<strong>没有</strong>推送通知或提醒功能，也不会在背景发送任何通知。
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            想养成记录习惯，可以用手机自带的闹钟或“提醒事项”，在早餐、午餐、晚餐时间提醒自己打开应用记录。
          </p>
        </div>
      </Group>

      <Group title="隐私与数据">
        <div className="space-y-4 p-2 text-sm">
          <p className="text-slate-600 dark:text-slate-300">
            {signedIn
              ? '🔒 资料保存在你的账号（Supabase，服务器在新加坡），每个账号只能读写自己的资料；这部设备也有一份副本供离线使用。'
              : isPersistent()
                ? '📱 资料只保存在这部设备的浏览器中。清除浏览器资料或换手机会令资料消失，建议注册或定期导出备份。'
                : '⚠️ 这个浏览器目前无法保存资料（可能是私密浏览模式）。'}
          </p>

          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-700/60">
            <p className="font-semibold">导出我的资料</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              下载一个 JSON
              文件，包含个人资料、计划、目标历史、饮食与体重记录。文件只会保存在你的设备上，内含健康资料，请妥善保管。
            </p>
            <Button variant="secondary" className="mt-2" onClick={exportData}>
              ⬇️ 导出备份（JSON）
            </Button>
          </div>

          <div className="space-y-2 rounded-2xl border border-slate-200 p-3 dark:border-slate-600">
            <p className="font-semibold">删除资料</p>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li>
                <strong>删除单笔记录：</strong>在“饮食”页或“我的成长 → 体重记录”按
                ✕，删除后可以撤销。
              </li>
              <li>
                <strong>删除所有健康记录：</strong>清除全部饮食、体重和习惯记录，保留
                {signedIn ? '账号、' : ''}个人资料和计划。
              </li>
              {signedIn && (
                <li>
                  <strong>删除账号：</strong>在下方“账号与安全”，连同登录 Email
                  和所有资料一起永久删除。
                </li>
              )}
            </ul>
            {danger === 'records' ? (
              <Notice tone="warn" title="确定删除所有健康记录？">
                所有饮食、体重、喝水和习惯记录都会
                {signedIn ? '从云端和这部设备' : '从这部设备'}
                永久删除，无法撤销。个人资料、计划和目标历史会保留。建议先导出备份。
                {error && (
                  <p role="alert" className="mt-2 font-semibold text-red-700 dark:text-red-400">
                    {error}
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() =>
                      void run(deleteHealthRecords, () => {
                        closeDanger();
                        toast({ text: '已删除所有健康记录' });
                      })
                    }
                  >
                    {busy ? '正在删除…' : '确定删除'}
                  </Button>
                  <Button variant="secondary" disabled={busy} onClick={closeDanger}>
                    取消
                  </Button>
                </div>
              </Notice>
            ) : (
              <Button
                variant="danger"
                className="w-full"
                onClick={() => {
                  closeDanger();
                  setDanger('records');
                }}
              >
                删除所有健康记录
              </Button>
            )}
            {!signedIn &&
              (danger === 'device' ? (
                <Notice tone="warn" title="确定删除这部设备上的全部资料？">
                  个人资料、计划和所有记录都会被永久删除，无法撤销，之后会回到欢迎页重新设置。
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="danger"
                      onClick={() => {
                        replaceState(emptyState);
                        navigate('/welcome', { replace: true });
                      }}
                    >
                      确定删除
                    </Button>
                    <Button variant="secondary" onClick={closeDanger}>
                      取消
                    </Button>
                  </div>
                </Notice>
              ) : (
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => {
                    closeDanger();
                    setDanger('device');
                  }}
                >
                  删除这部设备上的全部资料
                </Button>
              ))}
          </div>
        </div>
      </Group>

      {signedIn && (
        <Group title="账号与安全">
          <ul>
            <li className="flex min-h-14 items-center gap-3 px-2">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg dark:bg-slate-700"
              >
                ✉️
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">登录 Email</span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                  {email}
                </span>
              </span>
            </li>
            <Row to="/update-password" icon="🔑" title="更改密码" />
          </ul>
          <div className="mt-2 border-t border-slate-100 px-2 pt-3 dark:border-slate-700">
            {danger === 'account' ? (
              <Notice tone="warn" title="永久删除账号？">
                你的登录
                Email、密码、云端所有饮食和体重记录、计划与设置都会被永久删除，无法恢复。建议先在上方导出备份。
                <Field label="请输入「删除」两个字确认">
                  {(p) => (
                    <input
                      {...p}
                      value={deleteWord}
                      onChange={(e) => setDeleteWord(e.target.value)}
                      className={inputClass}
                      autoComplete="off"
                    />
                  )}
                </Field>
                {error && (
                  <p role="alert" className="mt-2 font-semibold text-red-700 dark:text-red-400">
                    {error}
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="danger"
                    disabled={busy || deleteWord.trim() !== '删除'}
                    onClick={() =>
                      void run(deleteAccount, () => navigate('/welcome', { replace: true }))
                    }
                  >
                    {busy ? '正在删除…' : '永久删除账号'}
                  </Button>
                  <Button variant="secondary" disabled={busy} onClick={closeDanger}>
                    取消
                  </Button>
                </div>
              </Notice>
            ) : (
              <button
                type="button"
                className="min-h-11 w-full rounded-2xl text-sm font-semibold text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                onClick={() => {
                  closeDanger();
                  setDanger('account');
                }}
              >
                删除账号
              </button>
            )}
          </div>
        </Group>
      )}

      <Group title="帮助与信息">
        <ul>
          <Row to="/how-we-calculate" icon="🧮" title="计算方法" />
          <Row to="/help/faq" icon="💬" title="常见问题" />
          <Row to="/legal/disclaimer" icon="🩺" title="健康免责声明" />
          <Row to="/legal/privacy" icon="🔒" title="隐私政策" />
          <Row to="/legal/credits" icon="📚" title="数据来源" />
        </ul>
        <p className="mt-2 border-t border-slate-100 px-2 pt-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          应用版本 {__APP_VERSION__}（{__BUILD_DATE__}）
        </p>
      </Group>

      {signedIn && (
        <div className="pb-4">
          <Button
            variant="danger"
            className="w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await signOut();
              navigate('/welcome', { replace: true });
            }}
          >
            {busy ? '正在退出…' : '退出登录'}
          </Button>
          <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            退出前会先把记录同步到账号，之后在任何设备登录都能取回。
          </p>
        </div>
      )}
    </div>
  );
}

function TargetsPage({
  profile,
  target,
  targets,
  weight,
  today,
}: {
  profile: Profile;
  target: TargetVersion | null;
  targets: TargetVersion[];
  weight: number;
  today: string;
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const [recalc, setRecalc] = useState(false);
  if (!target) {
    return (
      <div className="space-y-4">
        <BackToMe />
        <PageTitle>每日营养目标</PageTitle>
        <Notice>还没有每日目标，请先完成个人资料设置。</Notice>
      </div>
    );
  }

  const age = ageOn(profile.birthDate, target.effectiveFrom);
  const bmrCalc =
    10 * target.weightKg + 6.25 * profile.heightCm - 5 * age + SEX_CONSTANT[profile.formulaSex];
  // Show the worked formula only if today's profile still reproduces the stored value.
  const formulaMatches = Math.abs(bmrCalc - target.bmrKcal) < 1;
  const factor = ACTIVITY_FACTORS[profile.activityLevel];
  const adjust = target.caloriesKcal - target.tdeeKcal;
  const kcalOf = { p: target.proteinG * 4, c: target.carbsG * 4, f: target.fatG * 9 };
  const total = kcalOf.p + kcalOf.c + kcalOf.f || 1;
  let fresh: ReturnType<typeof planFor> | null = null;
  try {
    if (weight > 0) fresh = planFor(profile, weight, today);
  } catch {
    fresh = null;
  }
  const hide = profile.hideNumbers;

  return (
    <div className="space-y-4">
      <BackToMe />
      <PageTitle sub="你的每日目标是怎么算出来的。">每日营养目标</PageTitle>

      {hide && (
        <Notice>
          你已选择隐藏数字。这一页会显示数字，因为它是计算说明；如不想看，可直接返回。
        </Notice>
      )}

      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { k: '每日热量', v: `${fmtInt(target.caloriesKcal)}`, u: 'kcal' },
            {
              k: '蛋白质',
              v: `${target.proteinG}`,
              u: `g · ${Math.round((kcalOf.p / total) * 100)}%`,
            },
            {
              k: '碳水化合物',
              v: `${target.carbsG}`,
              u: `g · ${Math.round((kcalOf.c / total) * 100)}%`,
            },
            { k: '脂肪', v: `${target.fatG}`, u: `g · ${Math.round((kcalOf.f / total) * 100)}%` },
          ].map((x) => (
            <div key={x.k} className="rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-slate-700/60">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{x.k}</p>
              <p className="text-xl font-black">{x.v}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{x.u}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          从 {target.effectiveFrom} 起生效（{REASON_LABELS[target.reason]}），按当时体重{' '}
          {fmt1(target.weightKg)} kg 计算。
        </p>
      </Card>

      <Card className="space-y-4 text-sm leading-relaxed">
        <CardTitle>计算步骤</CardTitle>
        <div>
          <p className="font-bold">① 基础代谢（BMR）：{fmtInt(target.bmrKcal)} kcal</p>
          <p className="text-slate-600 dark:text-slate-300">
            身体在完全休息时一天消耗的热量，使用 Mifflin–St Jeor 公式：
          </p>
          <p className="mt-1 rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs dark:bg-slate-700/60">
            10 × 体重 + 6.25 × 身高 − 5 × 年龄{' '}
            {profile.formulaSex === 'male'
              ? '+ 5'
              : profile.formulaSex === 'female'
                ? '− 161'
                : '− 78'}
            {formulaMatches && (
              <>
                <br />= 10 × {fmt1(target.weightKg)} + 6.25 × {profile.heightCm} − 5 × {age}{' '}
                {SEX_CONSTANT[profile.formulaSex] >= 0 ? '+' : '−'}{' '}
                {Math.abs(SEX_CONSTANT[profile.formulaSex])} ≈ {fmtInt(target.bmrKcal)}
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            公式选项：{SEX_LABELS[profile.formulaSex]}
            {profile.formulaSex === 'neutral' && '（男性与女性常数的平均）'}
          </p>
        </div>
        <div>
          <p className="font-bold">② 每日总消耗（TDEE）：{fmtInt(target.tdeeKcal)} kcal</p>
          <p className="text-slate-600 dark:text-slate-300">
            {target.reason === 'adaptive'
              ? '这个数字已根据你的实际摄取和体重趋势调整过，比公式估算更贴近你。'
              : `BMR × 活动系数 ${factor}（${ACTIVITY_LABELS[profile.activityLevel].name}）。`}
          </p>
        </div>
        <div>
          <p className="font-bold">
            ③ 按目标调整：
            {adjust === 0
              ? '不增不减'
              : `${adjust > 0 ? '+' : '−'}${fmtInt(Math.abs(adjust))} kcal`}
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            {GOAL_LABELS[profile.goal]}
            {profile.goal !== 'maintain' && `，每周约 ${profile.ratePctPerWeek}% 体重`}。
            {profile.goal === 'fat_loss'
              ? '热量赤字不超过 TDEE 的 25%。'
              : profile.goal === 'maintain'
                ? ''
                : '热量盈余每天不超过 500 kcal。'}
          </p>
        </div>
        <div>
          <p className="font-bold">④ 安全下限：{fmtInt(target.calorieFloorKcal)} kcal</p>
          <p className="text-slate-600 dark:text-slate-300">
            每日目标不会低于你的 BMR，也不低于 1200（女性）/ 1500（男性、中性）kcal。
          </p>
        </div>
        {target.clamps.length > 0 && (
          <Notice title="这次计算做了以下调整">
            <ul className="list-disc space-y-1 pl-5">
              {target.clamps.map((c) => (
                <li key={c}>
                  {clampMessage(c as Parameters<typeof clampMessage>[0], target.calorieFloorKcal)}
                </li>
              ))}
            </ul>
          </Notice>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          公式只是起点，每个人的实际消耗会不同。记录足够后，“我的成长 →
          目标调整建议”会根据你的实际资料提出微调。
          <Link
            to="/how-we-calculate"
            className="ml-1 font-semibold text-emerald-strong dark:text-emerald"
          >
            完整计算方法 ›
          </Link>
        </p>
      </Card>

      <Card className="space-y-3">
        <CardTitle>用最新体重重新计算</CardTitle>
        {!fresh ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">先记录体重，才能重新计算。</p>
        ) : !fresh.ok ? (
          <Notice tone="warn" title={rejectMessage(fresh.reason).title}>
            {rejectMessage(fresh.reason).body}
          </Notice>
        ) : fresh.plan.caloriesKcal === target.caloriesKcal &&
          fresh.plan.macros.proteinG === target.proteinG ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ✓ 用最新体重 {fmt1(weight)} kg 计算的结果和目前的目标相同，不需要更新。
          </p>
        ) : recalc ? (
          <TargetCompare
            before={target}
            after={{ caloriesKcal: fresh.plan.caloriesKcal, ...fresh.plan.macros }}
            onKeep={() => {
              setRecalc(false);
              toast({ text: '已保留原计划，没有任何改动' });
            }}
            onConfirm={() => {
              const plan = fresh.plan;
              update((x) =>
                addTarget(
                  x,
                  targetFromPlan(
                    plan,
                    {
                      id: newId(),
                      effectiveFrom: today,
                      createdAt: new Date().toISOString(),
                      reason: 'profile_change',
                    },
                    weight,
                  ),
                ),
              );
              setRecalc(false);
              toast({ text: `已更新，新的每日目标是 ${fmtInt(plan.caloriesKcal)} kcal` });
              navigate('/me/targets', { replace: true });
            }}
          />
        ) : (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              目前目标按 {fmt1(target.weightKg)} kg 计算，你最新的体重是 {fmt1(weight)}{' '}
              kg。可以先预览新旧目标，再决定是否更新。
            </p>
            <Button variant="secondary" className="w-full" onClick={() => setRecalc(true)}>
              预览重新计算的结果
            </Button>
          </>
        )}
      </Card>

      <Card>
        <CardTitle>目标历史</CardTitle>
        <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-700">
          {[...targets]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  <span className="block font-medium">{t.effectiveFrom}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {REASON_LABELS[t.reason]} · 体重 {fmt1(t.weightKg)} kg
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-bold">{fmtInt(t.caloriesKcal)} kcal</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    蛋白质 {t.proteinG} g
                  </span>
                </span>
              </li>
            ))}
        </ul>
      </Card>
    </div>
  );
}

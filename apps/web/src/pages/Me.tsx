import {
  EngineInputError,
  RATE_PCT_PER_WEEK,
  type ActivityLevel,
  type FormulaSex,
  type Goal,
} from '@fittrack/engine';
import { useMemo, useState } from 'react';
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
import { saveProfile, setHideNumbers } from '../data/actions';
import { useAuth } from '../data/auth';
import { deleteCloudData, signOut, useSync, type SyncStatus } from '../data/sync';
import { getState, isPersistent, newId, replaceState, update, useAppState } from '../data/store';
import { emptyState, type DietTag, type LifestyleMode, type Profile } from '../data/types';
import { localToday } from '../lib/dates';
import { fmt1, fmtInt } from '../lib/format';
import { setTheme, useTheme, type Theme } from '../lib/theme';
import {
  ACTIVITY_LABELS,
  DIET_LABELS,
  fieldMessage,
  GOAL_LABELS,
  MODE_LABELS,
  rejectMessage,
  SEX_LABELS,
} from '../lib/messages';
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
  synced: '✓ 所有记录已同步到你的账号',
  offline: '目前离线：记录先保存在这部设备，恢复网络后会自动同步。',
  error: '同步失败，稍后会自动重试。',
};

export function Me({ mode = 'home' }: { mode?: 'home' | 'plan' }) {
  const s = useAppState();
  const toast = useToast();
  const navigate = useNavigate();
  const theme = useTheme();
  const today = useMemo(() => localToday(), []);
  const profile = s.profile;
  const [draft, setDraft] = useState<Profile | null>(profile);
  const [heightText, setHeightText] = useState(String(profile?.heightCm ?? ''));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const auth = useAuth();
  const sync = useSync();
  if (!profile || !draft) return null;
  const signedIn = auth.status === 'signedIn';

  const weight = latestWeight(s.weights)?.weightKg ?? 0;
  const target = targetOn(s.targets, today);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setDraft({ ...draft, [k]: v });
  // Fields managed elsewhere (display toggle, dates) do not count as an edit.
  const comparable = (p: Profile) =>
    JSON.stringify({ ...p, hideNumbers: false, goalStartDate: '', consentedAt: '' });
  const changed = comparable({ ...draft, heightCm: Number(heightText) }) !== comparable(profile);

  let preview: ReturnType<typeof planFor> | null = null;
  let invalid: string | null = null;
  try {
    preview = planFor({ ...draft, heightCm: Number(heightText) }, weight, today);
  } catch (e) {
    if (e instanceof EngineInputError) invalid = e.field;
    else throw e;
  }

  const save = () => {
    if (!preview?.ok) return;
    const next: Profile = {
      ...draft,
      heightCm: Number(heightText),
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
    toast({ text: `已保存，新的每日目标是 ${fmtInt(preview.plan.caloriesKcal)} kcal` });
    navigate('/me');
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fittrack-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (mode === 'plan') {
    return (
      <div className="space-y-4">
        <Link to="/me" className={backButtonClass}>
          <BackArrow />我
        </Link>
        <PageTitle sub="改完按最下面的“保存并重新计算”">我的计划</PageTitle>
        <Card className="space-y-5">
          <CardTitle>目标与生活方式</CardTitle>
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
              label="每周体重变化"
              value={String(draft.ratePctPerWeek)}
              options={RATE_OPTIONS[draft.goal].map((r) => ({ value: String(r), label: `${r}%` }))}
              onChange={(v) => set('ratePctPerWeek', Number(v))}
            />
          )}
          <Segmented
            label="生活方式模式"
            hint="切换模式不会影响热量公式，只会改变建议的任务和训练"
            value={draft.lifestyleMode}
            options={(Object.keys(MODE_LABELS) as LifestyleMode[]).map((m) => ({
              value: m,
              label: MODE_LABELS[m].name,
            }))}
            onChange={(m) => set('lifestyleMode', m)}
          />
        </Card>

        <Card className="space-y-5">
          <CardTitle>身体资料</CardTitle>
          <Segmented
            label="计算公式"
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
          <p className="text-xs text-slate-600 dark:text-slate-300">
            体重请在“进度”页面记录，计算会使用最新的体重（{weight} kg）。
          </p>
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
            <Check
              checked={draft.screening.exerciseCaution}
              onChange={(v) => set('screening', { ...draft.screening, exerciseCaution: v })}
            >
              医生曾建议我限制运动，或我有心脏、关节等问题
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

          {changed && preview && !preview.ok && (
            <Notice tone="warn" title={rejectMessage(preview.reason).title}>
              {rejectMessage(preview.reason).body}
            </Notice>
          )}
          {changed && preview?.ok && target && (
            <Notice>
              保存后每日目标会由 {fmtInt(target.caloriesKcal)} kcal 变为{' '}
              {fmtInt(preview.plan.caloriesKcal)} kcal。旧的记录和目标历史会保留。
            </Notice>
          )}
          <Button className="w-full" disabled={!changed || !preview?.ok} onClick={save}>
            保存并重新计算
          </Button>
        </Card>
      </div>
    );
  }

  const initial = signedIn ? (auth.user.email?.[0] ?? '?').toUpperCase() : '🙂';
  const row =
    'flex min-h-14 w-full items-center gap-3 px-1 text-left hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl';

  return (
    <div className="space-y-4">
      <PageTitle>我</PageTitle>

      <section className="rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-800 p-5 text-white shadow-md">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl font-bold"
          >
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">
              {signedIn ? auth.user.email : '访客（未登录）'}
            </p>
            <p className="text-sm text-emerald-50">
              {signedIn
                ? SYNC_TEXT[sync.status] || '已登录'
                : '目前资料只存在这部设备。注册后换手机也能看到记录。'}
            </p>
          </div>
        </div>
        {target && !profile.hideNumbers && (
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { k: '每日热量', v: `${fmtInt(target.caloriesKcal)}`, u: 'kcal' },
              { k: '蛋白质', v: `${target.proteinG}`, u: 'g' },
              { k: '目标', v: GOAL_LABELS[profile.goal], u: '' },
            ].map((x) => (
              <div key={x.k} className="rounded-2xl bg-white/15 px-2 py-2">
                <dt className="text-xs text-emerald-50">{x.k}</dt>
                <dd className="font-semibold">
                  {x.v}
                  {x.u && <span className="ml-0.5 text-xs font-normal">{x.u}</span>}
                </dd>
              </div>
            ))}
          </dl>
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

      <Card className="p-3">
        <ul>
          <li>
            <Link to="/me/plan" className={row}>
              <span aria-hidden="true" className="text-xl">
                🎯
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">我的计划</span>
                <span className="block truncate text-xs text-slate-600 dark:text-slate-300">
                  {GOAL_LABELS[profile.goal]}
                  {profile.goal !== 'maintain' && ` · 每周 ${profile.ratePctPerWeek}%`} ·{' '}
                  {MODE_LABELS[profile.lifestyleMode].name} · 身高 {profile.heightCm} cm
                </span>
              </span>
              <span aria-hidden="true" className="text-slate-400">
                ›
              </span>
            </Link>
          </li>
          <li>
            <Link to="/workout" className={row}>
              <span aria-hidden="true" className="text-xl">
                🏃
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">运动与训练</span>
                <span className="block text-xs text-slate-600 dark:text-slate-300">
                  在家、Gym、散步的训练和记录
                </span>
              </span>
              <span aria-hidden="true" className="text-slate-400">
                ›
              </span>
            </Link>
          </li>
          <li>
            <Link to="/progress" className={row}>
              <span aria-hidden="true" className="text-xl">
                ⚖️
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">体重记录</span>
                <span className="block text-xs text-slate-600 dark:text-slate-300">
                  目前 {fmt1(weight)} kg
                </span>
              </span>
              <span aria-hidden="true" className="text-slate-400">
                ›
              </span>
            </Link>
          </li>
        </ul>
      </Card>

      <Card className="space-y-4">
        <CardTitle>显示</CardTitle>
        <Segmented<Theme>
          label="外观"
          value={theme}
          options={[
            { value: 'light', label: '☀️ 浅色' },
            { value: 'dark', label: '🌙 深色' },
            { value: 'system', label: '跟随手机' },
          ]}
          onChange={setTheme}
        />
        <Check checked={profile.hideNumbers} onChange={(v) => update((x) => setHideNumbers(x, v))}>
          隐藏热量和体重数字（只看习惯和食物）
        </Check>
      </Card>

      <Card className="space-y-3">
        <CardTitle>资料与账号</CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {signedIn
            ? '资料保存在你的账号（服务器在新加坡），这部设备也有一份副本供离线使用。'
            : isPersistent()
              ? '资料只保存在这部设备的浏览器中。清除浏览器资料或换手机会令资料消失，建议注册或定期导出备份。'
              : '这个浏览器目前无法保存资料。'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportData}>
            导出备份
          </Button>
          {signedIn && (
            <>
              <Link
                to="/update-password"
                className="inline-flex min-h-11 items-center rounded-2xl border border-slate-200 px-4 text-sm font-medium dark:border-slate-600"
              >
                更改密码
              </Link>
            </>
          )}
        </div>
        {!confirmDelete ? (
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            删除全部资料
          </Button>
        ) : (
          <Notice tone="warn" title="确定删除？">
            {signedIn
              ? '你账号里的所有饮食、体重、训练记录和设置都会从云端和这部设备永久删除，无法撤销，然后自动退出登录。建议先导出备份。'
              : '所有饮食、体重、训练记录和设置都会被永久删除，无法撤销。建议先导出备份。'}
            <div className="mt-3 flex gap-2">
              <Button
                variant="danger"
                disabled={busy}
                onClick={async () => {
                  if (signedIn) {
                    setBusy(true);
                    const err = await deleteCloudData();
                    setBusy(false);
                    if (err) return toast({ text: err });
                    navigate('/welcome', { replace: true });
                    return;
                  }
                  replaceState(emptyState);
                  navigate('/welcome', { replace: true });
                }}
              >
                确定删除
              </Button>
              <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
                取消
              </Button>
            </div>
          </Notice>
        )}
      </Card>

      <Card className="p-3">
        <ul>
          {[
            { to: '/how-we-calculate', icon: '🧮', label: '计算方法与资料来源' },
            { to: '/legal/disclaimer', icon: '🩺', label: '健康免责声明' },
            { to: '/legal/privacy', icon: '🔒', label: '隐私政策' },
            { to: '/legal/credits', icon: '📚', label: '资料来源' },
          ].map((x) => (
            <li key={x.to}>
              <Link to={x.to} className={row}>
                <span aria-hidden="true" className="text-xl">
                  {x.icon}
                </span>
                <span className="flex-1 text-sm font-medium">{x.label}</span>
                <span aria-hidden="true" className="text-slate-400">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

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
          <p className="mt-2 text-center text-xs text-slate-600 dark:text-slate-300">
            退出前会先把记录同步到账号，之后在任何设备登录都能取回。
          </p>
        </div>
      )}
    </div>
  );
}

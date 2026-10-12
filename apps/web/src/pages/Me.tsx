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
  synced: '✓ 所有記錄已同步到你的帳號',
  offline: '目前離線：記錄先保存在這部裝置，恢復網路後會自動同步。',
  error: '同步失敗，稍後會自動重試。',
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
    toast({ text: `已儲存，新的每日目標是 ${fmtInt(preview.plan.caloriesKcal)} kcal` });
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
        <Link
          to="/me"
          className="inline-flex min-h-11 items-center text-sm font-medium text-emerald-strong dark:text-emerald"
        >
          ‹ 我
        </Link>
        <PageTitle sub="改完按最下面的「儲存並重新計算」">我的計劃</PageTitle>
        <Card className="space-y-5">
          <CardTitle>目標與生活方式</CardTitle>
          <Segmented
            label="目標"
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
              label="每週體重變化"
              value={String(draft.ratePctPerWeek)}
              options={RATE_OPTIONS[draft.goal].map((r) => ({ value: String(r), label: `${r}%` }))}
              onChange={(v) => set('ratePctPerWeek', Number(v))}
            />
          )}
          <Segmented
            label="生活方式模式"
            hint="切換模式不會影響熱量公式，只會改變建議的任務和訓練"
            value={draft.lifestyleMode}
            options={(Object.keys(MODE_LABELS) as LifestyleMode[]).map((m) => ({
              value: m,
              label: MODE_LABELS[m].name,
            }))}
            onChange={(m) => set('lifestyleMode', m)}
          />
        </Card>

        <Card className="space-y-5">
          <CardTitle>身體資料</CardTitle>
          <Segmented
            label="計算公式"
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
            體重請在「進度」頁面記錄，計算會使用最新的體重（{weight} kg）。
          </p>
          <Segmented
            label="日常活動水平"
            value={draft.activityLevel}
            options={(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => ({
              value: a,
              label: ACTIVITY_LABELS[a].name,
              sub: ACTIVITY_LABELS[a].hint,
            }))}
            onChange={(v) => set('activityLevel', v)}
          />
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">健康狀況</legend>
            <Check
              checked={draft.screening.pregnantOrLactating}
              onChange={(v) => set('screening', { ...draft.screening, pregnantOrLactating: v })}
            >
              正在懷孕或哺乳
            </Check>
            <Check
              checked={draft.screening.eatingDisorderHistory}
              onChange={(v) => set('screening', { ...draft.screening, eatingDisorderHistory: v })}
            >
              曾被診斷或正在接受飲食失調治療
            </Check>
            <Check
              checked={draft.screening.kidneyDisease}
              onChange={(v) => set('screening', { ...draft.screening, kidneyDisease: v })}
            >
              有腎臟疾病
            </Check>
            <Check
              checked={draft.screening.exerciseCaution}
              onChange={(v) => set('screening', { ...draft.screening, exerciseCaution: v })}
            >
              醫生曾建議我限制運動，或我有心臟、關節等問題
            </Check>
          </fieldset>
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">飲食偏好</legend>
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
              儲存後每日目標會由 {fmtInt(target.caloriesKcal)} kcal 變為{' '}
              {fmtInt(preview.plan.caloriesKcal)} kcal。舊的記錄和目標歷史會保留。
            </Notice>
          )}
          <Button className="w-full" disabled={!changed || !preview?.ok} onClick={save}>
            儲存並重新計算
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
              {signedIn ? auth.user.email : '訪客（未登入）'}
            </p>
            <p className="text-sm text-emerald-50">
              {signedIn ? SYNC_TEXT[sync.status] || '已登入' : '資料只保存在這部裝置'}
            </p>
          </div>
        </div>
        {target && !profile.hideNumbers && (
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { k: '每日熱量', v: `${fmtInt(target.caloriesKcal)}`, u: 'kcal' },
              { k: '蛋白質', v: `${target.proteinG}`, u: 'g' },
              { k: '目標', v: GOAL_LABELS[profile.goal], u: '' },
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
              註冊並備份
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-white/50 px-4 text-sm font-semibold"
            >
              登入
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
                <span className="block font-medium">我的計劃</span>
                <span className="block truncate text-xs text-slate-600 dark:text-slate-300">
                  {GOAL_LABELS[profile.goal]}
                  {profile.goal !== 'maintain' && ` · 每週 ${profile.ratePctPerWeek}%`} ·{' '}
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
                <span className="block font-medium">運動與訓練</span>
                <span className="block text-xs text-slate-600 dark:text-slate-300">
                  在家、Gym、散步的訓練和記錄
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
                <span className="block font-medium">體重記錄</span>
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
        <CardTitle>顯示</CardTitle>
        <Segmented<Theme>
          label="外觀"
          value={theme}
          options={[
            { value: 'light', label: '☀️ 淺色' },
            { value: 'dark', label: '🌙 深色' },
            { value: 'system', label: '跟隨手機' },
          ]}
          onChange={setTheme}
        />
        <Check checked={profile.hideNumbers} onChange={(v) => update((x) => setHideNumbers(x, v))}>
          隱藏熱量和體重數字（只看習慣和食物）
        </Check>
      </Card>

      <Card className="space-y-3">
        <CardTitle>資料與帳號</CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {signedIn
            ? '資料保存在你的帳號（伺服器在新加坡），這部裝置也有一份副本供離線使用。'
            : isPersistent()
              ? '資料只保存在這部裝置的瀏覽器中。清除瀏覽器資料或換手機會令資料消失，建議註冊或定期匯出備份。'
              : '這個瀏覽器目前無法保存資料。'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportData}>
            匯出備份
          </Button>
          {signedIn && (
            <>
              <Link
                to="/update-password"
                className="inline-flex min-h-11 items-center rounded-2xl border border-slate-200 px-4 text-sm font-medium dark:border-slate-600"
              >
                更改密碼
              </Link>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await signOut();
                  navigate('/welcome', { replace: true });
                }}
              >
                登出
              </Button>
            </>
          )}
        </div>
        {!confirmDelete ? (
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            刪除全部資料
          </Button>
        ) : (
          <Notice tone="warn" title="確定刪除？">
            {signedIn
              ? '你帳號裡的所有飲食、體重、訓練記錄和設定都會從雲端和這部裝置永久刪除，無法復原，然後自動登出。建議先匯出備份。'
              : '所有飲食、體重、訓練記錄和設定都會被永久刪除，無法復原。建議先匯出備份。'}
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
                確定刪除
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
            { to: '/how-we-calculate', icon: '🧮', label: '計算方法與資料來源' },
            { to: '/legal/disclaimer', icon: '🩺', label: '健康免責聲明' },
            { to: '/legal/privacy', icon: '🔒', label: '隱私政策' },
            { to: '/legal/credits', icon: '📚', label: '資料與圖片來源' },
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
    </div>
  );
}

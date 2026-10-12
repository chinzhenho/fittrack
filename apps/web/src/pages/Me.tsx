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
import { fmtInt } from '../lib/format';
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

export function Me() {
  const s = useAppState();
  const toast = useToast();
  const navigate = useNavigate();
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

  return (
    <div className="space-y-4">
      <PageTitle>我</PageTitle>

      <Card className="space-y-3">
        <CardTitle>帳號</CardTitle>
        {signedIn ? (
          <>
            <p className="text-sm">
              已登入：<span className="font-medium">{auth.user.email}</span>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">{SYNC_TEXT[sync.status]}</p>
            <div className="flex flex-wrap gap-2">
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
              <Link
                to="/update-password"
                className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm text-emerald-strong hover:bg-emerald/10 dark:text-emerald"
              >
                更改密碼
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              你沒有登入：資料只保存在這部裝置。註冊後，現有的記錄會自動上傳到你的帳號，換手機也不會遺失。
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/signup"
                className="inline-flex min-h-11 items-center rounded-xl bg-emerald px-4 text-sm font-semibold text-navy"
              >
                註冊並備份
              </Link>
              <Link
                to="/login"
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm dark:border-slate-600"
              >
                登入
              </Link>
            </div>
          </>
        )}
      </Card>

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
        <p className="text-xs text-slate-500 dark:text-slate-400">
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
                set('dietTags', on ? [...draft.dietTags, t] : draft.dietTags.filter((x) => x !== t))
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

      <Card className="space-y-3">
        <CardTitle>顯示</CardTitle>
        <Check checked={profile.hideNumbers} onChange={(v) => update((x) => setHideNumbers(x, v))}>
          隱藏熱量和體重數字（只顯示習慣和食物）
        </Check>
      </Card>

      <Card className="space-y-3">
        <CardTitle>你的資料</CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {signedIn
            ? '資料保存在你的帳號（伺服器在新加坡），這部裝置也有一份副本供離線使用。'
            : isPersistent()
              ? '所有資料只保存在這部裝置的瀏覽器中。清除瀏覽器資料或換手機會令資料消失，建議註冊或定期匯出備份。'
              : '這個瀏覽器目前無法保存資料。'}
        </p>
        <Button variant="secondary" onClick={exportData}>
          匯出全部資料（JSON）
        </Button>
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

      <Card>
        <ul className="space-y-1 text-sm">
          <li>
            <Link className="flex min-h-11 items-center underline" to="/how-we-calculate">
              計算方法與資料來源
            </Link>
          </li>
          <li>
            <Link className="flex min-h-11 items-center underline" to="/legal/disclaimer">
              健康免責聲明
            </Link>
          </li>
          <li>
            <Link className="flex min-h-11 items-center underline" to="/legal/privacy">
              隱私政策
            </Link>
          </li>
        </ul>
      </Card>
    </div>
  );
}

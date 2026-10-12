import {
  EngineInputError,
  RATE_PCT_PER_WEEK,
  type ActivityLevel,
  type FormulaSex,
  type Goal,
} from '@fittrack/engine';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button, Card, Check, Field, inputClass, Notice } from '../components/ui';
import { completeOnboarding } from '../data/actions';
import { useAuth } from '../data/auth';
import { newId, update } from '../data/store';
import type { DietTag, Experience, LifestyleMode, Profile } from '../data/types';
import { localToday } from '../lib/dates';
import {
  ACTIVITY_LABELS,
  DIET_LABELS,
  fieldMessage,
  GOAL_LABELS,
  MODE_LABELS,
  rejectMessage,
  SEX_LABELS,
} from '../lib/messages';
import { planFor, targetFromPlan } from '../logic/targets';
import { PlanSummary } from './PlanSummary';

const RATE_OPTIONS: Record<Goal, number[]> = {
  fat_loss: [0.25, 0.5, 0.75, 1],
  maintain: [0],
  muscle_gain: [0.1, 0.25, 0.5],
  weight_gain: [0.25, 0.5],
};

interface Draft {
  adult: boolean;
  terms: boolean;
  healthConsent: boolean;
  goal: Goal;
  mode: LifestyleMode;
  minutesPerDay: number;
  experience: Experience;
  formulaSex: FormulaSex;
  birthDate: string;
  heightCm: string;
  weightKg: string;
  activityLevel: ActivityLevel;
  pregnantOrLactating: boolean;
  eatingDisorderHistory: boolean;
  kidneyDisease: boolean;
  exerciseCaution: boolean;
  ratePctPerWeek: number;
  targetWeightKg: string;
  dietTags: DietTag[];
}

const initial: Draft = {
  adult: false,
  terms: false,
  healthConsent: false,
  goal: 'maintain',
  mode: 'nutrition_first',
  minutesPerDay: 15,
  experience: 'beginner',
  formulaSex: 'female',
  birthDate: '',
  heightCm: '',
  weightKg: '',
  activityLevel: 'sedentary',
  pregnantOrLactating: false,
  eatingDisorderHistory: false,
  kidneyDisease: false,
  exerciseCaution: false,
  ratePctPerWeek: 0,
  targetWeightKg: '',
  dietTags: [],
};

export function toProfile(d: Draft, today: string, now: string): Profile {
  return {
    formulaSex: d.formulaSex,
    birthDate: d.birthDate,
    heightCm: Number(d.heightCm),
    activityLevel: d.activityLevel,
    goal: d.goal,
    ratePctPerWeek: d.goal === 'maintain' ? 0 : d.ratePctPerWeek,
    ...(d.targetWeightKg.trim() !== '' &&
      d.goal !== 'maintain' && { targetWeightKg: Number(d.targetWeightKg) }),
    goalStartDate: today,
    lifestyleMode: d.mode,
    minutesPerDay: d.minutesPerDay,
    experience: d.experience,
    dietTags: d.dietTags,
    screening: {
      pregnantOrLactating: d.pregnantOrLactating,
      eatingDisorderHistory: d.eatingDisorderHistory,
      kidneyDisease: d.kidneyDisease,
      exerciseCaution: d.exerciseCaution,
    },
    hideNumbers: false,
    consentedAt: now,
  };
}

type StepId =
  | 'start'
  | 'goal'
  | 'mode'
  | 'minutes'
  | 'experience'
  | 'sex'
  | 'body'
  | 'activity'
  | 'health'
  | 'rate'
  | 'target'
  | 'diet'
  | 'plan';

const ALL_STEPS: StepId[] = [
  'start',
  'goal',
  'mode',
  'minutes',
  'experience',
  'sex',
  'body',
  'activity',
  'health',
  'rate',
  'target',
  'diet',
  'plan',
];

const GOAL_ICONS: Record<Goal, string> = {
  fat_loss: '🔥',
  maintain: '⚖️',
  muscle_gain: '💪',
  weight_gain: '🍚',
};

const MODE_ICONS: Record<LifestyleMode, string> = {
  nutrition_first: '🥗',
  home: '🏠',
  gym: '🏋️',
  outdoor: '🏃',
  mixed: '🔀',
};

/** One question, answered by tapping a card; picking an answer moves on right away. */
function Choices<T extends string>({
  options,
  value,
  onPick,
}: {
  options: { value: T; label: string; sub?: string; icon?: string }[];
  value: T | undefined;
  onPick: (value: T) => void;
}) {
  return (
    <div className="space-y-3">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onPick(o.value)}
            className={`flex min-h-16 w-full items-center gap-4 rounded-2xl border-2 bg-white px-4 py-3 text-left transition hover:border-emerald active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-emerald dark:bg-slate-800 ${selected ? 'border-emerald-strong bg-emerald-50 dark:border-emerald dark:bg-emerald/15' : 'border-slate-200 dark:border-slate-700'}`}
          >
            {o.icon && (
              <span aria-hidden="true" className="text-2xl">
                {o.icon}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold">{o.label}</span>
              {o.sub && (
                <span className="block text-sm text-slate-600 dark:text-slate-300">{o.sub}</span>
              )}
            </span>
            <span aria-hidden="true" className="text-xl text-slate-400">
              ›
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Onboarding() {
  const [step, setStep] = useState<StepId>('start');
  const [d, setD] = useState<Draft>(initial);
  // Choice questions show no pre-selected answer until the user has picked one.
  const [answered, setAnswered] = useState<Set<StepId>>(new Set());
  const navigate = useNavigate();
  const signedIn = useAuth().status === 'signedIn';
  const today = useMemo(() => localToday(), []);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const steps = ALL_STEPS.filter((s) => d.goal !== 'maintain' || (s !== 'rate' && s !== 'target'));
  const index = Math.max(0, steps.indexOf(step));
  const goNext = (goal: Goal = d.goal) => {
    const list = ALL_STEPS.filter((s) => goal !== 'maintain' || (s !== 'rate' && s !== 'target'));
    const next = list[list.indexOf(step) + 1];
    if (next) setStep(next);
    window.scrollTo?.(0, 0);
  };
  const goBack = () => {
    const prev = steps[index - 1];
    if (prev) setStep(prev);
  };
  const pick = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    set(k, v);
    setAnswered((a) => new Set(a).add(step));
    goNext();
  };
  const shown = <T,>(v: T) => (answered.has(step) ? v : undefined);

  const evaluated = useMemo(() => {
    if (!d.birthDate || !d.heightCm || !d.weightKg) return { kind: 'incomplete' as const };
    try {
      const profile = toProfile(d, today, new Date().toISOString());
      return {
        kind: 'result' as const,
        profile,
        result: planFor(profile, Number(d.weightKg), today),
      };
    } catch (e) {
      if (e instanceof EngineInputError) return { kind: 'invalid' as const, field: e.field };
      throw e;
    }
  }, [d, today]);

  const bodyError = evaluated.kind === 'invalid' ? evaluated.field : null;
  const bodyFieldError = (f: string) => (bodyError === f ? fieldMessage(f) : null);

  const canNext = (() => {
    switch (step) {
      case 'start':
        return d.adult && d.terms && d.healthConsent;
      case 'body':
        return (
          evaluated.kind === 'result' ||
          (evaluated.kind === 'invalid' &&
            !['birthDate', 'heightCm', 'weightKg'].includes(evaluated.field))
        );
      case 'target':
        return !(evaluated.kind === 'invalid' && evaluated.field === 'targetWeightKg');
      default:
        return true;
    }
  })();

  const finish = () => {
    if (evaluated.kind !== 'result' || !evaluated.result.ok) return;
    const now = new Date().toISOString();
    const weightKg = Number(d.weightKg);
    const { profile } = evaluated;
    const target = targetFromPlan(
      evaluated.result.plan,
      { id: newId(), effectiveFrom: today, createdAt: now, reason: 'initial' },
      weightKg,
    );
    update((s) =>
      completeOnboarding(
        s,
        { ...profile, consentedAt: now },
        { id: newId(), date: today, measuredAt: now, weightKg },
        target,
      ),
    );
    navigate('/today', { replace: true });
  };

  const weight = Number(d.weightKg);
  const anyHealth =
    d.pregnantOrLactating || d.eatingDisorderHistory || d.kidneyDisease || d.exerciseCaution;

  const TITLES: Record<StepId, string> = {
    start: '歡迎！先花 1 分鐘設定',
    goal: '你目前最主要的目標是？',
    mode: '你比較喜歡哪種方式？',
    minutes: '每天願意花多少時間？',
    experience: '你目前的運動經驗？',
    sex: '用哪個計算公式？',
    body: '你的身體資料',
    activity: '你平時的活動量？',
    health: '有沒有以下情況？',
    rate: '想多快達到目標？',
    target: '有目標體重嗎？',
    diet: '有飲食限制嗎？',
    plan: '你的計劃',
  };
  const HINTS: Partial<Record<StepId, string>> = {
    mode: '之後隨時可以切換，記錄不會消失',
    sex: 'Mifflin–St Jeor 公式分男性與女性版本；中性為兩者平均',
    activity: '工作加運動一起算',
    health: '只用於安全檢查，讓建議不會對你造成風險。可以選多項。',
    rate: '較慢的速度比較容易堅持，也較能保留肌肉',
    target: '選填。只用於顯示進度，不影響每日熱量',
    diet: '可以選多項，也可以跳過',
  };

  // Steps answered by tapping a card have no bottom button.
  const tapStep = ['goal', 'mode', 'minutes', 'experience', 'sex', 'activity', 'rate'].includes(
    step,
  );

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 bg-mist/95 backdrop-blur dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-xl items-center gap-2 px-2 py-2">
          {index > 0 ? (
            <Button variant="ghost" onClick={goBack} aria-label="上一步">
              ‹ 上一步
            </Button>
          ) : (
            <span className="flex min-h-11 items-center gap-2 px-2">
              <img src="/favicon.svg" alt="" className="size-7" />
              <span className="text-lg font-bold text-emerald-strong dark:text-emerald">
                FitTrack
              </span>
            </span>
          )}
          <span className="ml-auto px-2 text-sm text-slate-600 dark:text-slate-300">
            {index + 1} / {steps.length}
          </span>
        </div>
        <div className="mx-auto max-w-xl px-4">
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-2 rounded-full bg-emerald transition-all"
              style={{ width: `${((index + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-6 pb-10">
        <h1 className="text-2xl font-bold">{TITLES[step]}</h1>
        {HINTS[step] && (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{HINTS[step]}</p>
        )}

        <div className="mt-5 space-y-5">
          {step === 'start' && (
            <Card className="space-y-5">
              <p className="leading-relaxed">
                FitTrack 依照你的生活方式，幫你安全地減脂、增重、增肌或維持體重。不用去 Gym
                也可以開始。
              </p>
              <Notice>
                {signedIn
                  ? '你已登入：資料會經加密連線保存到你的帳號（伺服器在新加坡），換裝置登入也看得到，只有你能存取。'
                  : '你沒有登入：資料只保存在這部裝置的瀏覽器中。之後可以在「我」頁面註冊，把資料備份到帳號。'}
              </Notice>
              <div className="space-y-1">
                <Check checked={d.adult} onChange={(v) => set('adult', v)}>
                  我年滿 18 歲
                </Check>
                <Check checked={d.terms} onChange={(v) => set('terms', v)}>
                  我已閱讀並接受
                  <Link
                    to="/legal/disclaimer"
                    className="mx-1 text-emerald-strong underline dark:text-emerald"
                    target="_blank"
                  >
                    健康免責聲明
                  </Link>
                  和
                  <Link
                    to="/legal/privacy"
                    className="ml-1 text-emerald-strong underline dark:text-emerald"
                    target="_blank"
                  >
                    隱私政策
                  </Link>
                </Check>
                <Check checked={d.healthConsent} onChange={(v) => set('healthConsent', v)}>
                  我同意 FitTrack 使用我提供的身體與健康資料來計算建議
                </Check>
              </div>
            </Card>
          )}

          {step === 'goal' && (
            <Choices
              value={shown(d.goal)}
              options={(Object.keys(GOAL_LABELS) as Goal[]).map((g) => ({
                value: g,
                label: GOAL_LABELS[g],
                icon: GOAL_ICONS[g],
              }))}
              onPick={(g) => {
                setD((x) => ({ ...x, goal: g, ratePctPerWeek: RATE_PCT_PER_WEEK[g].default }));
                setAnswered((a) => new Set(a).add('goal'));
                goNext(g);
              }}
            />
          )}

          {step === 'mode' && (
            <Choices
              value={shown(d.mode)}
              options={(Object.keys(MODE_LABELS) as LifestyleMode[]).map((m) => ({
                value: m,
                label: MODE_LABELS[m].name,
                sub: MODE_LABELS[m].hint,
                icon: MODE_ICONS[m],
              }))}
              onPick={(m) => pick('mode', m)}
            />
          )}

          {step === 'minutes' && (
            <Choices
              value={shown(String(d.minutesPerDay))}
              options={[
                { value: '5', label: '5 分鐘' },
                { value: '15', label: '10–15 分鐘' },
                { value: '30', label: '20–30 分鐘' },
                { value: '45', label: '45 分鐘以上' },
                { value: '0', label: '不一定' },
              ]}
              onPick={(v) => pick('minutesPerDay', Number(v))}
            />
          )}

          {step === 'experience' && (
            <Choices<Experience>
              value={shown(d.experience)}
              options={[
                { value: 'beginner', label: '初學者', sub: '很少運動' },
                { value: 'occasional', label: '偶爾運動' },
                { value: 'regular', label: '已有規律習慣' },
              ]}
              onPick={(v) => pick('experience', v)}
            />
          )}

          {step === 'sex' && (
            <Choices
              value={shown(d.formulaSex)}
              options={(Object.keys(SEX_LABELS) as FormulaSex[]).map((s) => ({
                value: s,
                label: SEX_LABELS[s],
              }))}
              onPick={(v) => pick('formulaSex', v)}
            />
          )}

          {step === 'body' && (
            <Card className="space-y-4">
              <Field label="出生日期" error={bodyFieldError('birthDate')}>
                {(p) => (
                  <input
                    {...p}
                    type="date"
                    max={today}
                    value={d.birthDate}
                    onChange={(e) => set('birthDate', e.target.value)}
                    className={inputClass}
                  />
                )}
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="身高（cm）" error={bodyFieldError('heightCm')}>
                  {(p) => (
                    <input
                      {...p}
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={d.heightCm}
                      onChange={(e) => set('heightCm', e.target.value)}
                      className={inputClass}
                    />
                  )}
                </Field>
                <Field label="體重（kg）" error={bodyFieldError('weightKg')}>
                  {(p) => (
                    <input
                      {...p}
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={d.weightKg}
                      onChange={(e) => set('weightKg', e.target.value)}
                      className={inputClass}
                    />
                  )}
                </Field>
              </div>
            </Card>
          )}

          {step === 'activity' && (
            <Choices
              value={shown(d.activityLevel)}
              options={(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => ({
                value: a,
                label: ACTIVITY_LABELS[a].name,
                sub: ACTIVITY_LABELS[a].hint,
              }))}
              onPick={(v) => pick('activityLevel', v)}
            />
          )}

          {step === 'health' && (
            <>
              <Card className="space-y-1">
                <Check
                  checked={d.pregnantOrLactating}
                  onChange={(v) => set('pregnantOrLactating', v)}
                >
                  正在懷孕或哺乳
                </Check>
                <Check
                  checked={d.eatingDisorderHistory}
                  onChange={(v) => set('eatingDisorderHistory', v)}
                >
                  曾被診斷或正在接受飲食失調治療
                </Check>
                <Check checked={d.kidneyDisease} onChange={(v) => set('kidneyDisease', v)}>
                  有腎臟疾病
                </Check>
                <Check checked={d.exerciseCaution} onChange={(v) => set('exerciseCaution', v)}>
                  醫生曾建議我限制運動，或我有心臟、關節等問題
                </Check>
              </Card>
              {d.exerciseCaution && (
                <Notice tone="warn">
                  開始運動前，建議先諮詢醫生。我們會優先推薦低衝擊的活動。
                </Notice>
              )}
              {d.kidneyDisease && (
                <Notice tone="warn">
                  蛋白質目標會固定為每公斤 0.8 g，請按醫生或營養師的建議調整。
                </Notice>
              )}
            </>
          )}

          {step === 'rate' && (
            <Choices
              value={shown(String(d.ratePctPerWeek))}
              options={RATE_OPTIONS[d.goal].map((r) => ({
                value: String(r),
                label: `每週 ${r}% 體重`,
                ...(weight > 0 && { sub: `約 ${((r / 100) * weight).toFixed(2)} kg／週` }),
                ...(r === RATE_PCT_PER_WEEK[d.goal].default && { icon: '⭐' }),
              }))}
              onPick={(v) => pick('ratePctPerWeek', Number(v))}
            />
          )}

          {step === 'target' && (
            <Card>
              <Field
                label="目標體重（kg）"
                error={
                  evaluated.kind === 'invalid' && evaluated.field === 'targetWeightKg'
                    ? d.goal === 'fat_loss'
                      ? '目標體重需低於現在的體重。'
                      : '目標體重需高於現在的體重。'
                    : null
                }
              >
                {(p) => (
                  <input
                    {...p}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={d.targetWeightKg}
                    onChange={(e) => set('targetWeightKg', e.target.value)}
                    className={inputClass}
                  />
                )}
              </Field>
            </Card>
          )}

          {step === 'diet' && (
            <Card className="space-y-1">
              {(Object.keys(DIET_LABELS) as DietTag[]).map((t) => (
                <Check
                  key={t}
                  checked={d.dietTags.includes(t)}
                  onChange={(on) =>
                    set('dietTags', on ? [...d.dietTags, t] : d.dietTags.filter((x) => x !== t))
                  }
                >
                  {DIET_LABELS[t]}
                </Check>
              ))}
            </Card>
          )}

          {step === 'plan' && evaluated.kind === 'result' && !evaluated.result.ok && (
            <Notice tone="warn" title={rejectMessage(evaluated.result.reason).title}>
              {rejectMessage(evaluated.result.reason).body}
              <div className="mt-3">
                <Button variant="secondary" onClick={() => setStep('goal')}>
                  更改目標
                </Button>
              </div>
            </Notice>
          )}
          {step === 'plan' && evaluated.kind === 'result' && evaluated.result.ok && (
            <Card>
              <PlanSummary plan={evaluated.result.plan} goal={d.goal} />
            </Card>
          )}
        </div>

        {!tapStep && (
          <div className="mt-6">
            {step === 'plan' ? (
              <Button
                className="w-full"
                disabled={!(evaluated.kind === 'result' && evaluated.result.ok)}
                onClick={finish}
              >
                開始使用
              </Button>
            ) : step === 'health' && !anyHealth ? (
              <Button className="w-full" onClick={() => goNext()}>
                以上都沒有
              </Button>
            ) : step === 'diet' && d.dietTags.length === 0 ? (
              <Button className="w-full" onClick={() => goNext()}>
                沒有特別限制
              </Button>
            ) : step === 'target' && d.targetWeightKg.trim() === '' ? (
              <Button className="w-full" onClick={() => goNext()}>
                跳過
              </Button>
            ) : (
              <Button className="w-full" disabled={!canNext} onClick={() => goNext()}>
                下一步
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

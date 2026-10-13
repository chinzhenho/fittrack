import {
  EngineInputError,
  RATE_PCT_PER_WEEK,
  type ActivityLevel,
  type FormulaSex,
  type Goal,
} from '@fittrack/engine';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  BackArrow,
  backButtonClass,
  Button,
  Card,
  Check,
  Field,
  inputClass,
  Notice,
} from '../components/ui';
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
        return d.terms && d.healthConsent;
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
    start: '欢迎！先花 1 分钟设置',
    goal: '你目前最主要的目标是？',
    mode: '你比较喜欢哪种方式？',
    minutes: '每天愿意花多少时间？',
    experience: '你目前的运动经验？',
    sex: '用哪个计算公式？',
    body: '你的身体资料',
    activity: '你平时的活动量？',
    health: '有没有以下情况？',
    rate: '想多快达到目标？',
    target: '有目标体重吗？',
    diet: '有饮食限制吗？',
    plan: '你的计划',
  };
  const HINTS: Partial<Record<StepId, string>> = {
    mode: '之后随时可以切换，记录不会消失',
    sex: 'Mifflin–St Jeor 公式分男性与女性版本；中性为两者平均',
    activity: '工作加运动一起算',
    health: '只用于安全检查，让建议不会对你造成风险。可以选多项。',
    rate: '较慢的速度比较容易坚持，也较能保留肌肉',
    target: '选填。只用于显示进度，不影响每日热量',
    diet: '可以选多项，也可以跳过',
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
            <button type="button" onClick={goBack} className={backButtonClass}>
              <BackArrow />
              上一步
            </button>
          ) : (
            <span className="flex min-h-11 items-center gap-2 px-2">
              <img src="/brand/favicon.svg" alt="" className="size-8" />
              <span className="text-lg font-bold text-emerald-strong dark:text-emerald">
                EatHealthee
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
                EatHealthee 依照你的生活方式，帮你安全地减脂、增重、增肌或维持体重。不用去 Gym
                也可以开始。
              </p>
              <Notice>
                {signedIn
                  ? '你已登录：资料会经加密连线保存到你的账号（服务器在新加坡），换设备登录也看得到，只有你能存取。'
                  : '你没有登录：资料只保存在这部设备的浏览器中。之后可以在“我”页面注册，把资料备份到账号。'}
              </Notice>
              <div className="space-y-1">
                <Check checked={d.terms} onChange={(v) => set('terms', v)}>
                  我年满 18 岁，并已阅读和接受
                  <Link
                    to="/legal/disclaimer"
                    className="mx-1 text-emerald-strong underline dark:text-emerald"
                    target="_blank"
                  >
                    健康免责声明
                  </Link>
                  和
                  <Link
                    to="/legal/privacy"
                    className="ml-1 text-emerald-strong underline dark:text-emerald"
                    target="_blank"
                  >
                    隐私政策
                  </Link>
                </Check>
                <Check checked={d.healthConsent} onChange={(v) => set('healthConsent', v)}>
                  我同意 EatHealthee 使用我提供的身体与健康资料来计算建议
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
                { value: '5', label: '5 分钟' },
                { value: '15', label: '10–15 分钟' },
                { value: '30', label: '20–30 分钟' },
                { value: '45', label: '45 分钟以上' },
                { value: '0', label: '不一定' },
              ]}
              onPick={(v) => pick('minutesPerDay', Number(v))}
            />
          )}

          {step === 'experience' && (
            <Choices<Experience>
              value={shown(d.experience)}
              options={[
                { value: 'beginner', label: '初学者', sub: '很少运动' },
                { value: 'occasional', label: '偶尔运动' },
                { value: 'regular', label: '已有规律习惯' },
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
                <Field label="体重（kg）" error={bodyFieldError('weightKg')}>
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
                  正在怀孕或哺乳
                </Check>
                <Check
                  checked={d.eatingDisorderHistory}
                  onChange={(v) => set('eatingDisorderHistory', v)}
                >
                  曾被诊断或正在接受饮食失调治疗
                </Check>
                <Check checked={d.kidneyDisease} onChange={(v) => set('kidneyDisease', v)}>
                  有肾脏疾病
                </Check>
                <Check checked={d.exerciseCaution} onChange={(v) => set('exerciseCaution', v)}>
                  医生曾建议我限制运动，或我有心脏、关节等问题
                </Check>
              </Card>
              {d.exerciseCaution && (
                <Notice tone="warn">
                  开始运动前，建议先咨询医生。我们会优先推荐低冲击的活动。
                </Notice>
              )}
              {d.kidneyDisease && (
                <Notice tone="warn">
                  蛋白质目标会固定为每公斤 0.8 g，请按医生或营养师的建议调整。
                </Notice>
              )}
            </>
          )}

          {step === 'rate' && (
            <Choices
              value={shown(String(d.ratePctPerWeek))}
              options={RATE_OPTIONS[d.goal].map((r) => ({
                value: String(r),
                label: `每周 ${r}% 体重`,
                ...(weight > 0 && { sub: `约 ${((r / 100) * weight).toFixed(2)} kg／周` }),
                ...(r === RATE_PCT_PER_WEEK[d.goal].default && { icon: '⭐' }),
              }))}
              onPick={(v) => pick('ratePctPerWeek', Number(v))}
            />
          )}

          {step === 'target' && (
            <Card>
              <Field
                label="目标体重（kg）"
                error={
                  evaluated.kind === 'invalid' && evaluated.field === 'targetWeightKg'
                    ? d.goal === 'fat_loss'
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
                  更改目标
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
                开始使用
              </Button>
            ) : step === 'health' && !anyHealth ? (
              <Button className="w-full" onClick={() => goNext()}>
                以上都没有
              </Button>
            ) : step === 'diet' && d.dietTags.length === 0 ? (
              <Button className="w-full" onClick={() => goNext()}>
                没有特别限制
              </Button>
            ) : step === 'target' && d.targetWeightKg.trim() === '' ? (
              <Button className="w-full" onClick={() => goNext()}>
                跳过
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

import {
  EngineInputError,
  RATE_PCT_PER_WEEK,
  type ActivityLevel,
  type FormulaSex,
  type Goal,
} from '@fittrack/engine';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button, Card, Check, Field, inputClass, Notice, Segmented } from '../components/ui';
import { completeOnboarding } from '../data/actions';
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

const STEPS = ['開始', '目標', '生活方式', '身體資料', '健康', '速度', '飲食', '你的計劃'] as const;

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

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(initial);
  const navigate = useNavigate();
  const today = useMemo(() => localToday(), []);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

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
      case 0:
        return d.adult && d.terms && d.healthConsent;
      case 3:
        return (
          evaluated.kind === 'result' ||
          (evaluated.kind === 'invalid' &&
            !['birthDate', 'heightCm', 'weightKg'].includes(evaluated.field))
        );
      case 5:
        return (
          evaluated.kind === 'result' ||
          (evaluated.kind === 'invalid' && evaluated.field !== 'targetWeightKg')
        );
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

  return (
    <div className="min-h-dvh">
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-4">
          <img src="/favicon.svg" alt="" className="size-8" />
          <span className="text-lg font-semibold">FitTrack</span>
          <span className="ml-auto text-sm text-slate-300">
            {step + 1} / {STEPS.length}
          </span>
        </div>
        <div className="h-1 bg-white/10">
          <div
            className="h-1 bg-emerald transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-semibold">{STEPS[step]}</h1>
        <Card className="space-y-5">
          {step === 0 && (
            <>
              <p className="leading-relaxed">
                FitTrack 依照你的生活方式，幫你安全地減脂、增重、增肌或維持體重。不用去 Gym
                也可以開始。
              </p>
              <Notice>
                你的資料目前只保存在這部裝置的瀏覽器中，不會上傳。之後加入帳號同步時會先徵求你的同意。
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
            </>
          )}

          {step === 1 && (
            <Segmented
              label="你目前最主要的目標"
              value={d.goal}
              options={(Object.keys(GOAL_LABELS) as Goal[]).map((g) => ({
                value: g,
                label: GOAL_LABELS[g],
              }))}
              onChange={(g) =>
                setD((x) => ({ ...x, goal: g, ratePctPerWeek: RATE_PCT_PER_WEEK[g].default }))
              }
            />
          )}

          {step === 2 && (
            <>
              <Segmented
                label="你比較喜歡哪種方式？"
                hint="之後隨時可以切換，記錄不會消失"
                value={d.mode}
                options={(Object.keys(MODE_LABELS) as LifestyleMode[]).map((m) => ({
                  value: m,
                  label: MODE_LABELS[m].name,
                  sub: MODE_LABELS[m].hint,
                }))}
                onChange={(m) => set('mode', m)}
              />
              <Segmented
                label="每天願意花多少時間？"
                value={String(d.minutesPerDay)}
                options={[
                  { value: '5', label: '5 分鐘' },
                  { value: '15', label: '10–15 分鐘' },
                  { value: '30', label: '20–30 分鐘' },
                  { value: '45', label: '45 分鐘以上' },
                  { value: '0', label: '不一定' },
                ]}
                onChange={(v) => set('minutesPerDay', Number(v))}
              />
              <Segmented
                label="目前的運動經驗"
                value={d.experience}
                options={[
                  { value: 'beginner', label: '初學者，很少運動' },
                  { value: 'occasional', label: '偶爾運動' },
                  { value: 'regular', label: '已有規律習慣' },
                ]}
                onChange={(v) => set('experience', v)}
              />
            </>
          )}

          {step === 3 && (
            <>
              <Segmented
                label="計算公式"
                hint="Mifflin–St Jeor 公式分男性與女性版本；中性為兩者平均"
                value={d.formulaSex}
                options={(Object.keys(SEX_LABELS) as FormulaSex[]).map((s) => ({
                  value: s,
                  label: SEX_LABELS[s],
                }))}
                onChange={(v) => set('formulaSex', v)}
              />
              <div className="grid gap-4 sm:grid-cols-3">
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
              <Segmented
                label="日常活動水平（工作加運動一起算）"
                value={d.activityLevel}
                options={(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => ({
                  value: a,
                  label: ACTIVITY_LABELS[a].name,
                  sub: ACTIVITY_LABELS[a].hint,
                }))}
                onChange={(v) => set('activityLevel', v)}
              />
            </>
          )}

          {step === 4 && (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                這些問題只用於安全檢查，讓建議不會對你造成風險。
              </p>
              <div className="space-y-1">
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
              </div>
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

          {step === 5 &&
            (d.goal === 'maintain' ? (
              <p>你選擇了維持體重，不需要設定速度。</p>
            ) : (
              <>
                <Segmented
                  label="每週體重變化"
                  hint="較慢的速度比較容易堅持，也較能保留肌肉"
                  value={String(d.ratePctPerWeek)}
                  options={RATE_OPTIONS[d.goal].map((r) => ({
                    value: String(r),
                    label: `${r}% 體重`,
                    ...(weight > 0 && { sub: `約 ${((r / 100) * weight).toFixed(2)} kg／週` }),
                  }))}
                  onChange={(v) => set('ratePctPerWeek', Number(v))}
                />
                <Field
                  label="目標體重（kg，選填）"
                  hint="只用於顯示進度，不影響每日熱量"
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
              </>
            ))}

          {step === 6 && (
            <fieldset>
              <legend className="text-sm font-medium">飲食偏好（選填）</legend>
              <div className="mt-2 space-y-1">
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
              </div>
            </fieldset>
          )}

          {step === 7 && evaluated.kind === 'result' && !evaluated.result.ok && (
            <Notice tone="warn" title={rejectMessage(evaluated.result.reason).title}>
              {rejectMessage(evaluated.result.reason).body}
              <div className="mt-3">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  更改目標
                </Button>
              </div>
            </Notice>
          )}
          {step === 7 && evaluated.kind === 'result' && evaluated.result.ok && (
            <PlanSummary plan={evaluated.result.plan} goal={d.goal} />
          )}
        </Card>

        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              上一步
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button className="flex-1" disabled={!canNext} onClick={() => setStep(step + 1)}>
              下一步
            </Button>
          ) : (
            <Button
              className="flex-1"
              disabled={!(evaluated.kind === 'result' && evaluated.result.ok)}
              onClick={finish}
            >
              開始使用
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

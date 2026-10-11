import {
  KCAL_PER_G,
  type ActivityLevel,
  type FormulaSex,
  type Goal,
  type Plan,
} from '@fittrack/engine';
import { useId, useMemo, useState, type ReactNode } from 'react';
import {
  defaultRate,
  evaluate,
  initialForm,
  localToday,
  RATE_OPTIONS,
  type CalculatorForm,
} from './form';
import {
  ACTIVITY_LABELS,
  clampMessage,
  fieldMessage,
  GOAL_LABELS,
  rejectMessage,
  SEX_LABELS,
  warningMessage,
} from './messages';

const fmt = new Intl.NumberFormat('zh-Hant', { maximumFractionDigits: 0 });
const fmt1 = new Intl.NumberFormat('zh-Hant', { maximumFractionDigits: 2 });

export function CalculatorPage() {
  const [form, setForm] = useState<CalculatorForm>(initialForm);
  const today = useMemo(() => localToday(), []);
  const outcome = useMemo(() => evaluate(form, today), [form, today]);

  const set = <K extends keyof CalculatorForm>(key: K, value: CalculatorForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setGoal = (goal: Goal) =>
    setForm((f) => ({ ...f, goal, ratePctPerWeek: defaultRate(goal) }));

  const invalidField = outcome.kind === 'invalid' ? outcome.field : null;
  const weight = Number(form.weightKg);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <section
        aria-labelledby="form-title"
        className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900 sm:p-6"
      >
        <h1 id="form-title" className="text-xl font-semibold">
          計算你的每日熱量目標
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          示範頁：資料只在這個畫面計算，不會保存或傳送。
        </p>

        <div className="mt-6 space-y-5">
          <Segmented
            label="目標"
            value={form.goal}
            options={(Object.keys(GOAL_LABELS) as Goal[]).map((g) => ({
              value: g,
              label: GOAL_LABELS[g],
            }))}
            onChange={setGoal}
          />

          {form.goal !== 'maintain' && (
            <Segmented
              label="每週體重變化"
              value={form.ratePctPerWeek}
              options={RATE_OPTIONS[form.goal].map((r) => ({
                value: String(r),
                label: weight > 0 ? `${r}%（約 ${fmt1.format((r / 100) * weight)} kg）` : `${r}%`,
              }))}
              onChange={(v) => set('ratePctPerWeek', v)}
            />
          )}

          <Segmented
            label="計算公式"
            hint="Mifflin–St Jeor 公式分男性與女性版本"
            value={form.formulaSex}
            options={(Object.keys(SEX_LABELS) as FormulaSex[]).map((s) => ({
              value: s,
              label: SEX_LABELS[s],
            }))}
            onChange={(v) => set('formulaSex', v)}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="出生日期"
              error={invalidField === 'birthDate' ? fieldMessage('birthDate') : null}
            >
              {(id, describedBy) => (
                <input
                  id={id}
                  type="date"
                  max={today}
                  value={form.birthDate}
                  onChange={(e) => set('birthDate', e.target.value)}
                  aria-invalid={invalidField === 'birthDate'}
                  aria-describedby={describedBy}
                  className={inputClass}
                />
              )}
            </Field>
            <Field
              label="身高（cm）"
              error={invalidField === 'heightCm' ? fieldMessage('heightCm') : null}
            >
              {(id, describedBy) => (
                <input
                  id={id}
                  type="number"
                  inputMode="decimal"
                  min={120}
                  max={230}
                  step="0.1"
                  value={form.heightCm}
                  onChange={(e) => set('heightCm', e.target.value)}
                  aria-invalid={invalidField === 'heightCm'}
                  aria-describedby={describedBy}
                  className={inputClass}
                />
              )}
            </Field>
            <Field
              label="體重（kg）"
              error={invalidField === 'weightKg' ? fieldMessage('weightKg') : null}
            >
              {(id, describedBy) => (
                <input
                  id={id}
                  type="number"
                  inputMode="decimal"
                  min={30}
                  max={300}
                  step="0.1"
                  value={form.weightKg}
                  onChange={(e) => set('weightKg', e.target.value)}
                  aria-invalid={invalidField === 'weightKg'}
                  aria-describedby={describedBy}
                  className={inputClass}
                />
              )}
            </Field>
          </div>

          <fieldset>
            <legend className="text-sm font-medium">日常活動水平（工作加運動一起算）</legend>
            <div className="mt-2 grid gap-2">
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => (
                <label
                  key={level}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 has-checked:border-emerald has-checked:bg-emerald/10 dark:border-slate-700"
                >
                  <input
                    type="radio"
                    name="activity"
                    value={level}
                    checked={form.activityLevel === level}
                    onChange={() => set('activityLevel', level)}
                    className="size-4 accent-emerald-strong"
                  />
                  <span className="text-sm">
                    <span className="font-medium">{ACTIVITY_LABELS[level].name}</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      ：{ACTIVITY_LABELS[level].hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium">健康狀況（選填，只用於安全檢查）</legend>
            <div className="mt-2 grid gap-2">
              <Check
                checked={form.pregnantOrLactating}
                onChange={(v) => set('pregnantOrLactating', v)}
              >
                正在懷孕或哺乳
              </Check>
              <Check
                checked={form.eatingDisorderHistory}
                onChange={(v) => set('eatingDisorderHistory', v)}
              >
                曾被診斷或正在接受飲食失調治療
              </Check>
              <Check checked={form.kidneyDisease} onChange={(v) => set('kidneyDisease', v)}>
                有腎臟疾病
              </Check>
            </div>
          </fieldset>
        </div>
      </section>

      <section aria-live="polite" aria-labelledby="result-title" className="lg:sticky lg:top-6">
        <h2 id="result-title" className="sr-only">
          計算結果
        </h2>
        {outcome.kind === 'incomplete' && (
          <Placeholder>填寫出生日期、身高和體重後，這裡會顯示你的估算結果。</Placeholder>
        )}
        {outcome.kind === 'invalid' && <Placeholder>{fieldMessage(outcome.field)}</Placeholder>}
        {outcome.kind === 'rejected' && <Rejected {...rejectMessage(outcome.reason)} />}
        {outcome.kind === 'plan' && <Result plan={outcome.plan} goal={form.goal} />}
      </section>
    </div>
  );
}

const inputClass =
  'mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-navy shadow-xs focus:border-emerald focus:outline-2 focus:outline-emerald/40 aria-invalid:border-red-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error: string | null;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children(id, error ? errorId : undefined)}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex min-h-11 cursor-pointer items-center rounded-full border border-slate-300 px-4 text-sm has-checked:border-emerald has-checked:bg-emerald has-checked:font-medium has-checked:text-navy has-focus-visible:outline-2 has-focus-visible:outline-emerald dark:border-slate-600"
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-emerald-strong"
      />
      {children}
    </label>
  );
}

function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
      {children}
    </div>
  );
}

function Rejected({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function Result({ plan, goal }: { plan: Plan; goal: Goal }) {
  const { macros, caloriesKcal } = plan;
  const rows = [
    {
      name: '蛋白質',
      grams: macros.proteinG,
      kcal: macros.proteinG * KCAL_PER_G.protein,
      color: 'bg-emerald',
    },
    {
      name: '碳水化合物',
      grams: macros.carbsG,
      kcal: macros.carbsG * KCAL_PER_G.carbs,
      color: 'bg-sky-500',
    },
    { name: '脂肪', grams: macros.fatG, kcal: macros.fatG * KCAL_PER_G.fat, color: 'bg-amber-500' },
  ];
  const delta = Math.round(plan.appliedDeltaKcal);
  const notes = [
    ...plan.clamps.map((c) => clampMessage(c, plan.calorieFloorKcal)),
    ...plan.warnings.map(warningMessage),
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-navy p-6 text-white shadow-sm dark:bg-slate-800 dark:ring-1 dark:ring-emerald/40">
        <p className="text-sm text-slate-300">{GOAL_LABELS[goal]} · 每日熱量目標（估算）</p>
        <p className="mt-1 text-5xl font-semibold tracking-tight">
          {fmt.format(caloriesKcal)}
          <span className="ml-2 text-xl font-normal text-slate-300">kcal</span>
        </p>
        <p className="mt-2 text-sm text-slate-300">
          {delta === 0
            ? '約等於你的估算維持熱量'
            : delta < 0
              ? `比估算維持熱量少約 ${fmt.format(-delta)} kcal`
              : `比估算維持熱量多約 ${fmt.format(delta)} kcal`}
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
        <p className="text-sm font-medium">三大營養素</p>
        <ul className="mt-3 space-y-3">
          {rows.map((r) => {
            const pct = Math.round((r.kcal / caloriesKcal) * 100);
            return (
              <li key={r.name}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{r.name}</span>
                  <span>
                    <span className="font-semibold">{r.grams} g</span>
                    <span className="text-slate-500 dark:text-slate-400"> · {pct}%</span>
                  </span>
                </div>
                <div
                  className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800"
                  aria-hidden="true"
                >
                  <div
                    className={`h-2 rounded-full ${r.color}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          蛋白質按 {macros.proteinGPerKg} g/kg × {fmt1.format(macros.referenceWeightKg)} kg
          參考體重計算。
        </p>
      </div>

      {notes.length > 0 && (
        <ul className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-900">
          {notes.map((n) => (
            <li key={n} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald" />
              {n}
            </li>
          ))}
        </ul>
      )}

      <details className="rounded-2xl bg-white p-5 text-sm shadow-sm dark:bg-slate-900">
        <summary className="min-h-11 cursor-pointer content-center font-medium">
          為什麼是這個數字？
        </summary>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-slate-500 dark:text-slate-400">年齡</dt>
          <dd>{plan.age} 歲</dd>
          <dt className="text-slate-500 dark:text-slate-400">BMR（估算）</dt>
          <dd>{fmt.format(plan.bmrKcal)} kcal · Mifflin–St Jeor</dd>
          <dt className="text-slate-500 dark:text-slate-400">TDEE（估算）</dt>
          <dd>{fmt.format(plan.tdeeKcal)} kcal · BMR × 活動係數</dd>
          <dt className="text-slate-500 dark:text-slate-400">每週速度</dt>
          <dd>{plan.ratePctPerWeek}% 體重</dd>
          <dt className="text-slate-500 dark:text-slate-400">安全下限</dt>
          <dd>{fmt.format(Math.ceil(plan.calorieFloorKcal))} kcal</dd>
          <dt className="text-slate-500 dark:text-slate-400">公式版本</dt>
          <dd>{plan.formulaVersion}</dd>
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          公式估算對多數人的誤差約在 ±10% 內。正式版會根據你 2–3
          週的實際體重趨勢和飲食記錄自動建議調整。
        </p>
      </details>
    </div>
  );
}

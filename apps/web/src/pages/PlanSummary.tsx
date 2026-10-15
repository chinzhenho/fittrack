import { KCAL_PER_G, type Goal, type Plan } from '@fittrack/engine';
import { Link } from 'react-router';
import { Bar } from '../components/ui';
import { fmt1, fmtInt } from '../lib/format';
import { clampMessage, GOAL_LABELS, warningMessage } from '../lib/messages';

export function PlanSummary({ plan, goal }: { plan: Plan; goal: Goal }) {
  const { macros, caloriesKcal } = plan;
  const delta = Math.round(plan.appliedDeltaKcal);
  const rows = [
    {
      name: 'Protein',
      g: macros.proteinG,
      kcal: macros.proteinG * KCAL_PER_G.protein,
      color: 'bg-emerald-strong dark:bg-emerald',
    },
    {
      name: 'Carbs',
      g: macros.carbsG,
      kcal: macros.carbsG * KCAL_PER_G.carbs,
      color: 'bg-[#b5793a] dark:bg-[#e8b978]',
    },
    {
      name: 'Fat',
      g: macros.fatG,
      kcal: macros.fatG * KCAL_PER_G.fat,
      color: 'bg-[#b8664f] dark:bg-[#e69a8a]',
    },
  ];
  const notes = [
    ...plan.clamps.map((c) => clampMessage(c, plan.calorieFloorKcal)),
    ...plan.warnings.map(warningMessage),
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-navy p-5 text-white dark:bg-slate-700 dark:ring-1 dark:ring-emerald/40">
        <p className="text-sm text-slate-300">
          {GOAL_LABELS[goal]} · daily calorie target (estimate)
        </p>
        <p className="mt-1 text-5xl font-semibold tracking-tight">
          {fmtInt(caloriesKcal)}
          <span className="ml-2 text-xl font-normal text-slate-300">kcal</span>
        </p>
        <p className="mt-2 text-sm text-slate-300">
          {delta === 0
            ? 'About your estimated maintenance calories'
            : delta < 0
              ? `About ${fmtInt(-delta)} kcal below estimated maintenance`
              : `About ${fmtInt(delta)} kcal above estimated maintenance`}
        </p>
      </div>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.name}>
            <div className="flex items-baseline justify-between text-sm">
              <span>{r.name}</span>
              <span>
                <span className="font-semibold">{r.g} g</span>
                <span className="text-slate-600 dark:text-slate-300">
                  {' '}
                  · {Math.round((r.kcal / caloriesKcal) * 100)}%
                </span>
              </span>
            </div>
            <Bar value={r.kcal} max={caloriesKcal} color={r.color} />
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-600 dark:text-slate-300">
        Protein is {macros.proteinGPerKg} g/kg × {fmt1(macros.referenceWeightKg)} kg reference
        weight. BMR about {fmtInt(plan.bmrKcal)} kcal, TDEE about {fmtInt(plan.tdeeKcal)} kcal.
        <Link to="/how-we-calculate" className="underline">
          How we calculate
        </Link>
      </p>
      {notes.length > 0 && (
        <ul className="space-y-2 text-sm leading-relaxed">
          {notes.map((n) => (
            <li key={n} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald" />
              {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

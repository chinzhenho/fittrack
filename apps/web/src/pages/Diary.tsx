import { addDays } from '@fittrack/engine';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useToast } from '../components/Toast';
import { Bar, Button, Card, Check, PageTitle } from '../components/ui';
import { removeMeal, restoreMeal, setDayComplete } from '../data/actions';
import { update, useAppState } from '../data/store';
import type { MealType } from '../data/types';
import { formatDateZh, localToday } from '../lib/dates';
import { fmt1, fmtInt } from '../lib/format';
import { MEAL_LABELS, MEAL_TYPES, mealsOn, sumNutrients } from '../logic/nutrition';
import { targetOn } from '../logic/targets';

const MEAL_STYLE: Record<MealType, { icon: string; bg: string }> = {
  breakfast: { icon: '🍳', bg: 'bg-amber-100 dark:bg-amber-500/20' },
  lunch: { icon: '🍛', bg: 'bg-emerald-100 dark:bg-emerald/20' },
  dinner: { icon: '🍲', bg: 'bg-sky-100 dark:bg-sky-500/20' },
  snack: { icon: '🍎', bg: 'bg-rose-100 dark:bg-rose-500/20' },
};

export function Diary() {
  const s = useAppState();
  const [params, setParams] = useSearchParams();
  const today = useMemo(() => localToday(), []);
  const date = params.get('date') ?? today;
  const toast = useToast();
  const items = mealsOn(s.meals, date);
  const total = sumNutrients(items);
  const target = targetOn(s.targets, date);
  const hide = s.profile?.hideNumbers ?? false;
  const complete = s.completeDays.includes(date);

  const go = (d: string) => setParams(d === today ? {} : { date: d });

  return (
    <div className="space-y-4">
      <PageTitle>飲食日記</PageTitle>
      <div className="flex items-center justify-between rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800 dark:ring-white/10">
        <Button variant="ghost" aria-label="前一天" onClick={() => go(addDays(date, -1))}>
          ‹ 前一天
        </Button>
        <span className="font-semibold">{formatDateZh(date, today)}</span>
        <Button
          variant="ghost"
          aria-label="後一天"
          disabled={date >= today}
          onClick={() => go(addDays(date, 1))}
        >
          後一天 ›
        </Button>
      </div>

      {!hide && (
        <Card>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-300">已吃</p>
              <p className="text-3xl font-bold">
                {fmtInt(total.kcal)}
                <span className="ml-1 text-base font-medium text-slate-600 dark:text-slate-300">
                  {target ? `/ ${fmtInt(target.caloriesKcal)} kcal` : 'kcal'}
                </span>
              </p>
            </div>
            {target && (
              <p
                className={`rounded-full px-3 py-1 text-sm font-semibold ${total.kcal <= target.caloriesKcal ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald/15 dark:text-emerald-100' : 'bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100'}`}
              >
                {total.kcal <= target.caloriesKcal
                  ? `還可吃 ${fmtInt(target.caloriesKcal - total.kcal)}`
                  : `超出 ${fmtInt(total.kcal - target.caloriesKcal)}`}
              </p>
            )}
          </div>
          {target && (
            <Bar
              value={total.kcal}
              max={target.caloriesKcal}
              color={total.kcal > target.caloriesKcal ? 'bg-amber-500' : 'bg-emerald'}
            />
          )}
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            {[
              { n: '蛋白質', v: total.proteinG, t: target?.proteinG, c: 'bg-rose-500' },
              { n: '碳水', v: total.carbsG, t: target?.carbsG, c: 'bg-sky-500' },
              { n: '脂肪', v: total.fatG, t: target?.fatG, c: 'bg-amber-500' },
            ].map((m) => (
              <div key={m.n}>
                <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className={`size-2.5 rounded-full ${m.c}`} aria-hidden="true" />
                  {m.n}
                </p>
                <p className="font-semibold">
                  {fmtInt(m.v)}
                  <span className="font-normal text-slate-600 dark:text-slate-300">
                    {m.t !== undefined ? ` / ${m.t} g` : ' g'}
                  </span>
                </p>
                {m.t !== undefined && <Bar value={m.v} max={m.t} color={m.c} />}
              </div>
            ))}
          </div>
        </Card>
      )}

      {MEAL_TYPES.map((meal) => {
        const list = items.filter((i) => i.meal === meal);
        const sub = sumNutrients(list);
        return (
          <Card key={meal}>
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-xl ${MEAL_STYLE[meal].bg}`}
              >
                {MEAL_STYLE[meal].icon}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">{MEAL_LABELS[meal]}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {list.length === 0
                    ? '還沒有記錄'
                    : hide
                      ? `${list.length} 項`
                      : `${list.length} 項 · ${fmtInt(sub.kcal)} kcal`}
                </p>
              </div>
              <Link
                to={`/diary/add?date=${date}&meal=${meal}`}
                aria-label={`加入${MEAL_LABELS[meal]}`}
                className="inline-flex min-h-11 items-center rounded-2xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 dark:bg-emerald/15 dark:text-emerald-100 dark:hover:bg-emerald/25"
              >
                ＋ 加入
              </Link>
            </div>
            {list.length > 0 && (
              <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-700 dark:border-slate-700">
                {list.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{i.name}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {fmt1(i.grams)} g
                        {!hide &&
                          ` · 蛋白質 ${fmt1(i.nutrients.proteinG)} g · 碳水 ${fmt1(i.nutrients.carbsG)} g · 脂肪 ${fmt1(i.nutrients.fatG)} g`}
                      </p>
                    </div>
                    {!hide && (
                      <span className="shrink-0 font-semibold">
                        {fmtInt(i.nutrients.kcal)} kcal
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label={`刪除 ${i.name}`}
                      className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                      onClick={() => {
                        update((x) => removeMeal(x, i.id));
                        toast({
                          text: `已刪除 ${i.name}`,
                          actionLabel: '復原',
                          onAction: () => update((x) => restoreMeal(x, i)),
                        });
                      }}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}

      <Card>
        <Check checked={complete} onChange={(v) => update((x) => setDayComplete(x, date, v))}>
          這一天的飲食已完整記錄
        </Check>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          只有標記為完整的日子，才會用來估算你的實際消耗和建議調整。
        </p>
      </Card>
    </div>
  );
}

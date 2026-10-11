import { addDays } from '@fittrack/engine';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useToast } from '../components/Toast';
import { Button, Card, Check, PageTitle } from '../components/ui';
import { removeMeal, restoreMeal, setDayComplete } from '../data/actions';
import { update, useAppState } from '../data/store';
import { formatDateZh, localToday } from '../lib/dates';
import { fmt1, fmtInt } from '../lib/format';
import { MEAL_LABELS, MEAL_TYPES, mealsOn, sumNutrients } from '../logic/nutrition';
import { targetOn } from '../logic/targets';

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
      <div className="flex items-center justify-between rounded-2xl bg-white p-2 shadow-sm dark:bg-slate-900">
        <Button variant="ghost" aria-label="前一天" onClick={() => go(addDays(date, -1))}>
          ‹
        </Button>
        <span className="font-medium">{formatDateZh(date, today)}</span>
        <Button
          variant="ghost"
          aria-label="後一天"
          disabled={date >= today}
          onClick={() => go(addDays(date, 1))}
        >
          ›
        </Button>
      </div>

      {!hide && (
        <Card>
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            {[
              {
                n: '熱量',
                v: `${fmtInt(total.kcal)}`,
                t: target ? `/ ${fmtInt(target.caloriesKcal)} kcal` : 'kcal',
              },
              {
                n: '蛋白質',
                v: `${fmtInt(total.proteinG)}`,
                t: target ? `/ ${target.proteinG} g` : 'g',
              },
              { n: '碳水', v: `${fmtInt(total.carbsG)}`, t: target ? `/ ${target.carbsG} g` : 'g' },
              { n: '脂肪', v: `${fmtInt(total.fatG)}`, t: target ? `/ ${target.fatG} g` : 'g' },
            ].map((c) => (
              <div key={c.n}>
                <p className="text-xs text-slate-500 dark:text-slate-400">{c.n}</p>
                <p className="text-lg font-semibold">{c.v}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{c.t}</p>
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
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">
                {MEAL_LABELS[meal]}
                {!hide && list.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                    {fmtInt(sub.kcal)} kcal
                  </span>
                )}
              </h2>
              <Link
                to={`/diary/add?date=${date}&meal=${meal}`}
                className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-emerald-strong hover:bg-emerald/10 dark:text-emerald"
              >
                ＋ 加入
              </Link>
            </div>
            {list.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">還沒有記錄。</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {list.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{i.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {fmt1(i.grams)} g
                        {!hide &&
                          ` · ${fmtInt(i.nutrients.kcal)} kcal · 蛋白質 ${fmt1(i.nutrients.proteinG)} g · 碳水 ${fmt1(i.nutrients.carbsG)} g · 脂肪 ${fmt1(i.nutrients.fatG)} g`}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`刪除 ${i.name}`}
                      className="flex size-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
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
        <p className="text-xs text-slate-500 dark:text-slate-400">
          只有標記為完整的日子，才會用來估算你的實際消耗和建議調整。
        </p>
      </Card>
    </div>
  );
}

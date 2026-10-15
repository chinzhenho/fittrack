import { addDays } from '@fittrack/engine';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { FoodThumb, IconTile } from '../components/Icons';
import { MEAL_STYLE } from '../components/mealStyle';
import { MonthCalendar } from '../components/MonthCalendar';
import { useToast } from '../components/Toast';
import {
  Bar,
  Button,
  Card,
  Check,
  Field,
  inputClass,
  PageTitle,
  Segmented,
} from '../components/ui';
import { editMeal, removeMeal, restoreMeal, setDayComplete } from '../data/actions';
import { update, useAppState } from '../data/store';
import type { MealItem, MealType } from '../data/types';
import { formatDateFull, formatDay, localToday } from '../lib/dates';
import { fmt1, fmtInt } from '../lib/format';
import { calorieGap, MEAL_LABELS, MEAL_TYPES, mealsOn, sumNutrients } from '../logic/nutrition';
import { targetOn } from '../logic/targets';

export function Diary() {
  const s = useAppState();
  const [params, setParams] = useSearchParams();
  const today = useMemo(() => localToday(), []);
  const date = params.get('date') ?? today;
  const items = mealsOn(s.meals, date);
  const total = sumNutrients(items);
  const target = targetOn(s.targets, date);
  const hide = s.profile?.hideNumbers ?? false;
  const complete = s.completeDays.includes(date);
  const gap =
    target && s.profile ? calorieGap(s.profile.goal, total.kcal, target.caloriesKcal) : null;

  const [picking, setPicking] = useState(false);
  const go = (d: string) => setParams(d === today ? {} : { date: d });

  return (
    <div className="space-y-4">
      <PageTitle>Food diary</PageTitle>
      <div className="flex items-center justify-between rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800 dark:ring-white/10">
        <Button variant="ghost" aria-label="Previous day" onClick={() => go(addDays(date, -1))}>
          ‹<span className="hidden sm:inline"> Previous</span>
        </Button>
        <button
          type="button"
          onClick={() => setPicking((v) => !v)}
          aria-expanded={picking}
          aria-label={`Choose a date, now ${formatDateFull(date)}`}
          className="flex min-h-11 items-center gap-2 rounded-2xl px-3 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <span aria-hidden="true">📅</span>
          <span className="text-left leading-tight">
            <span className="block font-semibold">
              {date === today || date === addDays(today, -1)
                ? formatDay(date, today)
                : formatDateFull(date)}
            </span>
            {(date === today || date === addDays(today, -1)) && (
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                {formatDateFull(date)}
              </span>
            )}
          </span>
          <span
            aria-hidden="true"
            className={`text-slate-400 transition ${picking ? 'rotate-180' : ''}`}
          >
            ▾
          </span>
        </button>
        <Button
          variant="ghost"
          aria-label="Next day"
          disabled={date >= today}
          onClick={() => go(addDays(date, 1))}
        >
          <span className="hidden sm:inline">Next </span>›
        </Button>
      </div>

      {picking && (
        <div className="space-y-2">
          <MonthCalendar
            value={date}
            max={today}
            logged={new Set(s.meals.map((m) => m.date))}
            complete={new Set(s.completeDays)}
            onPick={(d) => {
              go(d);
              setPicking(false);
            }}
          />
          {date !== today && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                go(today);
                setPicking(false);
              }}
            >
              Back to today
            </Button>
          )}
        </div>
      )}

      {!hide && (
        <Card>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-300">Eaten</p>
              <p className="text-3xl font-bold">
                {fmtInt(total.kcal)}
                <span className="ml-1 text-base font-medium text-slate-600 dark:text-slate-300">
                  {target ? `/ ${fmtInt(target.caloriesKcal)} kcal` : 'kcal'}
                </span>
              </p>
            </div>
            {target && (
              <p
                className={`rounded-full px-3 py-1 text-sm font-semibold ${gap?.state === 'over' ? 'bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100' : 'bg-emerald-50 text-emerald-900 dark:bg-emerald/15 dark:text-emerald-100'}`}
              >
                {gap && `${gap.label} ${fmtInt(gap.kcal)}`}
              </p>
            )}
          </div>
          {target && (
            <Bar
              value={total.kcal}
              max={target.caloriesKcal}
              color={gap?.state === 'over' ? 'bg-amber-500' : 'bg-emerald'}
            />
          )}
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            {[
              { n: 'Protein', v: total.proteinG, t: target?.proteinG, c: 'bg-rose-500' },
              { n: 'Carbs', v: total.carbsG, t: target?.carbsG, c: 'bg-sky-500' },
              { n: 'Fat', v: total.fatG, t: target?.fatG, c: 'bg-amber-500' },
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
              <IconTile name={MEAL_STYLE[meal].glyph} tint={MEAL_STYLE[meal].tile} />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">{MEAL_LABELS[meal]}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {list.length === 0
                    ? 'Nothing logged'
                    : hide
                      ? `${list.length} ${list.length === 1 ? 'item' : 'items'}`
                      : `${list.length} ${list.length === 1 ? 'item' : 'items'} · ${fmtInt(sub.kcal)} kcal`}
                </p>
              </div>
              <Link
                to={`/diary/add?date=${date}&meal=${meal}`}
                aria-label={`Add to ${MEAL_LABELS[meal].toLowerCase()}`}
                className="inline-flex min-h-11 items-center rounded-2xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 dark:bg-emerald/15 dark:text-emerald-100 dark:hover:bg-emerald/25"
              >
                + Add
              </Link>
            </div>
            {list.length > 0 && (
              <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-700 dark:border-slate-700">
                {list.map((i) => (
                  <MealRow key={i.id} item={i} hide={hide} />
                ))}
              </ul>
            )}
          </Card>
        );
      })}

      <Card>
        <Check checked={complete} onChange={(v) => update((x) => setDayComplete(x, date, v))}>
          I logged everything I ate this day
        </Check>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Tick this when every meal is logged. Only complete days are used to check what you really
          burn and to suggest target changes.
        </p>
      </Card>
    </div>
  );
}

/** One logged food. Tap to change the amount or meal, or delete it (with undo). */
function MealRow({ item: i, hide }: { item: MealItem; hide: boolean }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [grams, setGrams] = useState(String(i.grams));
  const [meal, setMeal] = useState<MealType>(i.meal);
  const [label, setLabel] = useState(i.label ?? '');
  const g = Number(grams);
  const ok = g > 0 && g <= 5000;

  const remove = () => {
    update((x) => removeMeal(x, i.id));
    toast({
      text: `Deleted ${i.name}`,
      actionLabel: 'Undo',
      onAction: () => update((x) => restoreMeal(x, i)),
    });
  };

  if (!editing) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Edit ${i.name}`}
          className="flex w-full items-center gap-3 rounded-2xl py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <FoodThumb item={i} size="size-10" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">
              {i.label && (
                <span className="mr-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-900 dark:bg-rose-500/20 dark:text-rose-100">
                  {i.label}
                </span>
              )}
              {i.name}
            </span>
            <span className="block text-xs text-slate-600 dark:text-slate-300">
              {fmt1(i.grams)} g
              {!hide &&
                ` · protein ${fmt1(i.nutrients.proteinG)} g · carbs ${fmt1(i.nutrients.carbsG)} g · fat ${fmt1(i.nutrients.fatG)} g`}
            </span>
          </span>
          {!hide && <span className="shrink-0 font-semibold">{fmtInt(i.nutrients.kcal)} kcal</span>}
          <span aria-hidden="true" className="shrink-0 pr-1 text-sm text-slate-400">
            ✎
          </span>
        </button>
      </li>
    );
  }

  return (
    <li className="space-y-3 rounded-2xl bg-slate-50 p-3 my-2 dark:bg-slate-700">
      <p className="font-medium">{i.name}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (g)" error={ok ? null : 'Must be 1 to 5000 g'}>
          {(p) => (
            <input
              {...p}
              type="number"
              inputMode="decimal"
              step="1"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        {!hide && ok && (
          <div className="self-end pb-3 text-sm">
            ≈ <strong>{fmtInt((i.nutrients.kcal * g) / i.grams)}</strong> kcal
          </div>
        )}
      </div>
      <Segmented
        label="Meal"
        value={meal}
        options={MEAL_TYPES.map((m) => ({ value: m, label: MEAL_LABELS[m] }))}
        onChange={setMeal}
      />
      {meal === 'snack' && (
        <Field label="Name (optional)">
          {(p) => (
            <input
              {...p}
              maxLength={20}
              value={label}
              placeholder="e.g. tea time, supper"
              onChange={(e) => setLabel(e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
      )}
      <div className="flex gap-2">
        <Button variant="danger" onClick={remove}>
          Delete
        </Button>
        <Button variant="secondary" onClick={() => setEditing(false)}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          disabled={!ok}
          onClick={() => {
            update((x) => editMeal(x, i.id, { grams: g, meal, label }));
            setEditing(false);
            toast({ text: 'Updated' });
          }}
        >
          Save
        </Button>
      </div>
    </li>
  );
}

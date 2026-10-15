import { addDays } from '@fittrack/engine';
import { useAppState } from '../data/store';
import { fmtInt } from '../lib/format';
import { mealsOn, sumNutrients } from '../logic/nutrition';
import { targetOn } from '../logic/targets';
import { Card, CardTitle } from './ui';

const TIPS = [
  'Switching drinks to kosong (no sugar) or siew dai (less sugar) is one of the easiest ways to cut calories.',
  'Fried rice and fried noodles usually use a lot of oil; for something lighter, pick soup noodles or rice with dishes.',
  'Start each meal with a protein (egg, tofu, fish, chicken) to feel full sooner.',
  'When taking away, ask for curry and sauce on the side so you decide how much to add.',
  'Add a side of vegetables when eating out: more food, few extra calories.',
  'Craving a late-night snack? Have water or unsweetened tea first, then decide in 10 minutes.',
  'Weight goes up and down daily with water and food. The trend tells you more than any single day.',
];

const WEEKDAY = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** This week (Monday to Sunday) at a glance: logged days, calories per day, and a tip. */
export function WeekCard({ today, hide }: { today: string; hide: boolean }) {
  const s = useAppState();
  const mondayOffset = (new Date(`${today}T00:00:00`).getDay() + 6) % 7;
  const monday = addDays(today, -mondayOffset);
  const info = WEEKDAY.map((label, i) => {
    const date = addDays(monday, i);
    const meals = mealsOn(s.meals, date);
    return {
      date,
      label,
      future: date > today,
      logged: meals.length > 0,
      complete: s.completeDays.includes(date),
      kcal: sumNutrients(meals).kcal,
      target: targetOn(s.targets, date)?.caloriesKcal,
    };
  });
  const logged = info.filter((d) => d.logged);
  // Averages use finished days only; today is still in progress.
  const past = logged.filter((d) => d.date < today);
  const avg = past.length > 0 ? past.reduce((t, d) => t + d.kcal, 0) / past.length : null;
  const withinTarget = past.filter((d) => d.target !== undefined && d.kcal <= d.target).length;
  const tipIndex = Math.floor(new Date(`${today}T00:00:00`).getTime() / 86_400_000) % TIPS.length;

  const stats = [
    { label: 'Days logged', value: `${logged.length}` },
    ...(hide
      ? []
      : [
          { label: 'Daily average', value: avg !== null ? `${fmtInt(avg)} kcal` : '—' },
          {
            label: 'Within target',
            value: past.length > 0 ? `${withinTarget} / ${past.length} days` : '—',
          },
        ]),
  ];

  return (
    <Card>
      <CardTitle>This week</CardTitle>
      <ol className="grid grid-cols-7 gap-1 text-center">
        {info.map((d) => {
          const isToday = d.date === today;
          const over = d.target !== undefined && d.kcal > d.target;
          return (
            <li key={d.date} className={d.future ? 'opacity-40' : ''}>
              <span
                className={`text-xs ${isToday ? 'font-bold text-emerald-strong dark:text-emerald' : 'text-slate-600 dark:text-slate-300'}`}
              >
                {d.label}
              </span>
              <span
                className={`mx-auto mt-1 flex size-9 items-center justify-center rounded-full text-sm font-semibold ${isToday ? 'ring-2 ring-emerald-strong ring-offset-2 dark:ring-emerald dark:ring-offset-slate-800' : ''} ${d.complete ? 'bg-emerald-strong text-white dark:bg-emerald dark:text-slate-950' : d.logged ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald/25 dark:text-emerald-100' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}
              >
                {d.complete ? '✓' : Number(d.date.slice(8))}
                <span className="sr-only">
                  {d.complete ? 'Fully logged' : d.logged ? 'Logged' : 'Not logged'}
                </span>
              </span>
              {!hide && (
                <span
                  className={`mt-1 block text-[11px] ${over ? 'font-semibold text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  {d.logged ? fmtInt(d.kcal) : ''}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <dl className={`mt-4 grid gap-2 ${hide ? 'grid-cols-1' : 'grid-cols-3'}`}>
        {stats.map((x) => (
          <div key={x.label} className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-700">
            <dt className="text-xs text-slate-600 dark:text-slate-300">{x.label}</dt>
            <dd className="font-semibold">{x.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
        💡 {TIPS[tipIndex]}
      </p>
    </Card>
  );
}

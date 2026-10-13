import { addDays } from '@fittrack/engine';
import { useAppState } from '../data/store';
import { fmtInt } from '../lib/format';
import { mealsOn, sumNutrients } from '../logic/nutrition';
import { targetOn } from '../logic/targets';
import { Card, CardTitle } from './ui';

const TIPS = [
  '饮料换成无糖（kosong）或少糖（siew dai），是最容易减少热量的方法之一。',
  '炒饭、炒面通常用油较多；想吃得轻一点，可以选汤面或白饭配菜。',
  '每餐先有一份蛋白质（鸡蛋、豆腐、鱼、鸡肉），比较容易吃饱。',
  '打包时咖喱汁、酱汁可以另外装，自己决定要加多少。',
  '外食时多点一份青菜，份量多了，热量却增加不多。',
  '晚上嘴馋时，先喝一杯水或无糖茶，等 10 分钟再决定要不要吃。',
  '体重每天会因为水分和食物而上下起伏，看趋势比看单日更准。',
];

const WEEKDAY = ['一', '二', '三', '四', '五', '六', '日'];

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
    { label: '有记录', value: `${logged.length} 天` },
    ...(hide
      ? []
      : [
          { label: '每日平均', value: avg !== null ? `${fmtInt(avg)} kcal` : '—' },
          {
            label: '没超过目标',
            value: past.length > 0 ? `${withinTarget} / ${past.length} 天` : '—',
          },
        ]),
  ];

  return (
    <Card>
      <CardTitle>本周</CardTitle>
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
                  {d.complete ? '已完整记录' : d.logged ? '有记录' : '没有记录'}
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

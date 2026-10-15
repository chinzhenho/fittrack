import { addDays } from '@fittrack/engine';
import { useState } from 'react';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Monday-first weekday index (0..6) of a YYYY-MM-DD date. */
function weekdayMon(date: string): number {
  return (new Date(`${date}T00:00:00`).getDay() + 6) % 7;
}

function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function shiftMonth(first: string, delta: number): string {
  const y = Number(first.slice(0, 4));
  const m = Number(first.slice(5, 7)) - 1 + delta;
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Month grid for picking a day. Days with records get a dot, fully recorded days a
 * check; days after `max` cannot be picked.
 */
export function MonthCalendar({
  value,
  max,
  logged,
  complete,
  onPick,
}: {
  value: string;
  max: string;
  logged: Set<string>;
  complete: Set<string>;
  onPick: (date: string) => void;
}) {
  const [first, setFirst] = useState(() => monthStart(value));
  const lead = weekdayMon(first);
  const days: string[] = [];
  for (let d = first; d.slice(0, 7) === first.slice(0, 7); d = addDays(d, 1)) days.push(d);
  const canNext = shiftMonth(first, 1) <= max;
  const title = `${MONTHS[Number(first.slice(5, 7)) - 1]} ${first.slice(0, 4)}`;

  return (
    <div className="rounded-3xl bg-slate-100 p-4 shadow-lg ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setFirst(shiftMonth(first, -1))}
          className="flex size-10 items-center justify-center rounded-full text-lg hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          ‹
        </button>
        <p className="font-semibold" aria-live="polite">
          {title}
        </p>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canNext}
          onClick={() => setFirst(shiftMonth(first, 1))}
          className="flex size-10 items-center justify-center rounded-full text-lg hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-700"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 dark:text-slate-400">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="py-1">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {days.map((d) => {
          const future = d > max;
          const selected = d === value;
          const isToday = d === max;
          const has = logged.has(d) || complete.has(d);
          return (
            <button
              key={d}
              type="button"
              disabled={future}
              onClick={() => onPick(d)}
              aria-label={`${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8))}${complete.has(d) ? ', complete day' : logged.has(d) ? ', logged' : ''}`}
              aria-pressed={selected}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl text-sm transition disabled:opacity-40 ${selected ? 'bg-emerald-strong font-bold text-white shadow-md dark:bg-emerald dark:text-slate-950' : has ? 'bg-white font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200 hover:ring-emerald dark:bg-slate-700 dark:text-white dark:ring-slate-600' : 'bg-slate-200/60 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500'} ${isToday && !selected ? 'outline-2 outline-offset-1 outline-emerald-strong dark:outline-emerald' : ''}`}
            >
              {Number(d.slice(8))}
              {complete.has(d) && (
                <span
                  aria-hidden="true"
                  className={`absolute bottom-0.5 text-[10px] leading-none font-bold ${selected ? 'text-white dark:text-slate-950' : 'text-emerald-600 dark:text-emerald-400'}`}
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-1.5">
          <span className="size-3.5 rounded bg-white ring-1 ring-slate-300" /> Logged
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3.5 rounded bg-slate-200" /> Not logged
        </span>
        <span>
          <span className="font-bold text-emerald-600">✓</span> Complete day
        </span>
      </p>
    </div>
  );
}

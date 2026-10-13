import { addDays } from '@fittrack/engine';

/** Today's date in the browser's time zone as YYYY-MM-DD. */
export function localToday(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function formatDateZh(date: string, today = localToday()): string {
  if (date === today) return '今天';
  if (date === addDays(today, -1)) return '昨天';
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${m} 月 ${d} 日（${weekday}）`;
}

export function lastNDays(end: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - n + 1));
}

/** Full date, e.g. "10月13日 周二", without the 今天/昨天 shortcut. */
export function formatDateFull(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return `${m}月${d}日 周${WEEKDAYS[new Date(y, m - 1, d).getDay()]}`;
}

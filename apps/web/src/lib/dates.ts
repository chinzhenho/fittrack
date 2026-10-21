import { addDays } from '@fittrack/engine';
import { getLang, t } from './i18n';

/** Today's date in the browser's time zone as YYYY-MM-DD. */
export function localToday(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** "Today", "Yesterday", or e.g. "Tue, 13 Oct". */
export function formatDay(date: string, today = localToday()): string {
  if (date === today) return t('Today');
  if (date === addDays(today, -1)) return t('Yesterday');
  return formatDateFull(date);
}

/** Full date, e.g. "Tue, 13 Oct" or "10月13日 周二", without the Today/Yesterday shortcut. */
export function formatDateFull(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const wd = new Date(y, m - 1, d).getDay();
  return getLang() === 'zh'
    ? `${m}月${d}日 ${WEEKDAYS_ZH[wd]}`
    : `${WEEKDAYS[wd]}, ${d} ${MONTHS[m - 1]}`;
}

/** Day and month, e.g. "13 Oct" or "10月13日". */
export function shortDate(date: string): string {
  const m = Number(date.slice(5, 7));
  const d = Number(date.slice(8));
  return getLang() === 'zh' ? `${m}月${d}日` : `${d} ${MONTHS[m - 1]}`;
}

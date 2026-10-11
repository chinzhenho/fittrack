import { EngineInputError } from './errors.js';

// Local dates are 'YYYY-MM-DD' strings already resolved in the user's time zone
// (spec 11.4). Internally we count whole days with UTC so no DST or offset leaks in.

const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseLocalDate(date: string, field = 'date'): number {
  const m = DATE_RE.exec(date);
  if (!m) throw new EngineInputError(field, `expected YYYY-MM-DD, got "${date}"`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const back = new Date(ms);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) {
    throw new EngineInputError(field, `not a real date: "${date}"`);
  }
  return ms / DAY_MS;
}

export function formatDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return parseLocalDate(to) - parseLocalDate(from);
}

export function addDays(date: string, days: number): string {
  return formatDay(parseLocalDate(date) + days);
}

/** Whole years of age on `onDate`. A 29 Feb birthday counts from 1 Mar in common years. */
export function ageOn(birthDate: string, onDate: string): number {
  parseLocalDate(birthDate, 'birthDate');
  parseLocalDate(onDate, 'onDate');
  const [by, bm, bd] = birthDate.split('-').map(Number) as [number, number, number];
  const [oy, om, od] = onDate.split('-').map(Number) as [number, number, number];
  let age = oy - by;
  if (om < bm || (om === bm && od < bd)) age -= 1;
  return age;
}

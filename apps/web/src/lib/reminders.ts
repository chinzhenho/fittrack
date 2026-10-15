// Daily reminders through the phone's own calendar: we build a standard .ics file with
// repeating events and an alert at the event time. No server and no notification
// permission is needed, and the user can change or delete them in their calendar app.

export type ReminderId = 'weigh' | 'breakfast' | 'lunch' | 'dinner';

export interface Reminder {
  id: ReminderId;
  label: string;
  title: string;
  /** "HH:MM", 24-hour, local time. */
  time: string;
  on: boolean;
}

export const DEFAULT_REMINDERS: Reminder[] = [
  { id: 'weigh', label: 'Weigh-in', title: 'Weigh yourself', time: '07:30', on: true },
  { id: 'breakfast', label: 'Breakfast', title: 'Log your breakfast', time: '08:30', on: true },
  { id: 'lunch', label: 'Lunch', title: 'Log your lunch', time: '13:00', on: true },
  { id: 'dinner', label: 'Dinner', title: 'Log your dinner', time: '19:30', on: true },
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Escapes text for an iCalendar TEXT value. */
function esc(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * An iCalendar file with one daily event per enabled reminder, starting `startDate`
 * (YYYY-MM-DD). Times are "floating" (no time zone), so they follow the phone's clock.
 */
export function remindersIcs(
  reminders: Reminder[],
  startDate: string,
  appUrl: string,
  now = new Date(),
): string {
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const day = startDate.replace(/-/g, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EatHealthee//Reminders//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const r of reminders.filter((x) => x.on)) {
    const [h, m] = r.time.split(':').map(Number) as [number, number];
    lines.push(
      'BEGIN:VEVENT',
      `UID:eathealthee-${r.id}@eathealthee.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${day}T${pad(h)}${pad(m)}00`,
      'DURATION:PT5M',
      'RRULE:FREQ=DAILY',
      `SUMMARY:${esc(`EatHealthee: ${r.title}`)}`,
      `DESCRIPTION:${esc(`Open EatHealthee: ${appUrl}`)}`,
      `URL:${appUrl}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(r.title)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

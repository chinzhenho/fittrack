import { describe, expect, it } from 'vitest';
import { DEFAULT_REMINDERS, remindersIcs } from './reminders';

describe('calendar reminders', () => {
  it('builds one daily event with an alert for each enabled reminder', () => {
    const reminders = DEFAULT_REMINDERS.map((r) => (r.id === 'lunch' ? { ...r, on: false } : r));
    const ics = remindersIcs(
      reminders,
      '2026-10-16',
      'https://app.eathealthee.workers.dev/today',
      new Date(Date.UTC(2026, 9, 15, 10, 0, 0)),
    );
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(ics).toContain('DTSTART:20261016T073000');
    expect(ics).toContain('DURATION:PT5M');
    expect(ics).toContain('RRULE:FREQ=DAILY');
    expect(ics).toContain('TRIGGER:PT0M');
    expect(ics).toContain('SUMMARY:EatHealthee: Log your dinner');
    expect(ics).not.toContain('Log your lunch');
    expect(ics).toContain('DTSTAMP:20261015T100000Z');
  });

  it('uses a duration, so a reminder just before midnight stays valid', () => {
    const ics = remindersIcs(
      [{ id: 'dinner', label: 'Dinner', title: 'Log your dinner', time: '23:58', on: true }],
      '2026-10-16',
      'https://x.test',
    );
    expect(ics).toContain('DTSTART:20261016T235800');
    expect(ics).not.toContain('DTEND');
  });
});

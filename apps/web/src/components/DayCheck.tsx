import { answerDayCheck } from '../data/actions';
import { update } from '../data/store';
import type { AppState } from '../data/types';
import { formatDay } from '../lib/dates';
import { fmtInt } from '../lib/format';
import { t } from '../lib/i18n';
import { sumNutrients, mealsOn } from '../logic/nutrition';
import { useToast } from './Toast';
import { Button } from './ui';

/**
 * Asks about days logged at under half the usual intake: did the user eat less, or
 * forget some food? Only answered days are used to check the calorie target.
 */
export function DayCheck({
  s,
  dates,
  today,
  hide,
}: {
  s: AppState;
  dates: string[];
  today: string;
  hide: boolean;
}) {
  const toast = useToast();
  if (dates.length === 0) return null;
  return (
    <section aria-label={t('Check your logs')} className="space-y-3">
      {dates.map((d) => {
        const kcal = sumNutrients(mealsOn(s.meals, d)).kcal;
        return (
          <div key={d} className="rounded-[18px] bg-[#fbf3e8] p-4 dark:bg-amber-500/10">
            <p className="font-semibold">
              {t('{day}: did you eat less than usual?', { day: formatDay(d, today) })}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {hide
                ? t('You logged much less than usual that day.')
                : t('You logged {kcal} kcal, much less than usual.', { kcal: fmtInt(kcal) })}{' '}
              {t('If some food is missing, we leave the day out so your target stays right.')}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  update((x) => answerDayCheck(x, d, false));
                  toast({ text: t('Got it. That day is left out of target checks.') });
                }}
              >
                {t('I forgot some food')}
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  update((x) => answerDayCheck(x, d, true));
                  toast({ text: t('Got it. That day counts as fully logged.') });
                }}
              >
                {t('I ate less')}
              </Button>
            </div>
          </div>
        );
      })}
    </section>
  );
}

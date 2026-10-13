import type { Profile } from '../data/types';
import { fmtInt } from '../lib/format';
import { waterByNow, waterGoalMl, WATER_STEP_ML } from '../logic/water';
import { Card } from './ui';

/** Personal daily drinking reminder (see logic/water.ts for the formula). */
export function WaterCard({ profile, tdeeKcal }: { profile: Profile; tdeeKcal: number }) {
  const waterGoal = waterGoalMl(tdeeKcal);
  const now = new Date();
  const waterNow = waterByNow(waterGoal, now.getHours(), now.getMinutes());
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-xl dark:bg-sky-500/20"
        >
          💧
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">今天建议喝水</p>
          {profile.screening.kidneyDisease ? (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              你有肾脏方面的状况，喝水量请按医生的建议。
            </p>
          ) : (
            <>
              <p className="mt-0.5 text-2xl font-black text-sky-700 dark:text-sky-300">
                约 {fmtInt(waterGoal)} ml
                <span className="ml-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  ≈ {Math.round(waterGoal / WATER_STEP_ML)} 杯
                </span>
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {waterNow > 0
                  ? `现在大约应喝到 ${fmtInt(waterNow)} ml，记得每 1–2 小时喝一杯。`
                  : '早上起床先喝一杯水，之后每 1–2 小时喝一杯。'}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                按你每天的消耗计算（每杯 {WATER_STEP_ML} ml）。天气热、出汗或运动时要多喝
                {profile.screening.pregnantOrLactating ? '；怀孕或哺乳期间需要再多一些' : ''}。
              </p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

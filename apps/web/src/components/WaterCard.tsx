import { useState } from 'react';
import { updateProfileDetails } from '../data/actions';
import { update } from '../data/store';
import type { Profile } from '../data/types';
import { fmt1, fmtInt } from '../lib/format';
import { Glyph } from './Icons';
import { WATER_ACTIVITY, WATER_CUP_ML, waterRangeMl, type WaterActivity } from '../logic/water';
import { Button, Card } from './ui';

/** Daily drinking guide from body weight and activity (see logic/water.ts). */
export function WaterCard({ profile, weightKg }: { profile: Profile; weightKg: number | null }) {
  const [adjusting, setAdjusting] = useState(false);
  const activity = profile.waterActivity ?? 'normal';

  if (profile.screening.kidneyDisease) {
    return (
      <Card className="flex items-start gap-3 p-4">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-lg dark:bg-sky-500/20"
        >
          💧
        </span>
        <div>
          <p className="text-sm font-black">Daily water guide</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            You have a kidney condition, so please follow your doctor's advice on how much to drink.
          </p>
        </div>
      </Card>
    );
  }
  if (weightKg === null) return null;

  const [min, max] = waterRangeMl(weightKg, activity);
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[0.9375rem] font-semibold text-[#32ade6] dark:text-[#64d2ff]">
          <Glyph name="drop" className="size-[18px]" /> Daily water guide
        </p>
        <button
          type="button"
          onClick={() => setAdjusting(true)}
          className="min-h-9 shrink-0 rounded-full bg-[#32ade6]/10 px-3 text-sm font-semibold text-[#0a84c6] transition hover:bg-[#32ade6]/15 active:scale-95 dark:bg-[#64d2ff]/15 dark:text-[#64d2ff]"
        >
          Adjust
        </button>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="flex items-baseline gap-1">
            <span className="text-[1.75rem] leading-none font-bold whitespace-nowrap">
              {fmtInt(min)}–{fmtInt(max)}
            </span>
            <span className="text-sm font-semibold text-slate-500">ml</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            About {Math.round(min / WATER_CUP_ML)}–{Math.round(max / WATER_CUP_ML)} mugs · based on{' '}
            {fmt1(weightKg)} kg
          </p>
        </div>
        <div className="shrink-0 text-right text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          <span className="block">On waking 300ml</span>
          <span className="block">Before meals 200ml</span>
        </div>
      </div>

      {adjusting && (
        <WaterSheet
          weightKg={weightKg}
          value={activity}
          onClose={() => setAdjusting(false)}
          onSave={(a) => {
            update((x) =>
              x.profile ? updateProfileDetails(x, { ...x.profile, waterActivity: a }) : x,
            );
            setAdjusting(false);
          }}
        />
      )}
    </Card>
  );
}

function WaterSheet({
  weightKg,
  value,
  onClose,
  onSave,
}: {
  weightKg: number;
  value: WaterActivity;
  onClose: () => void;
  onSave: (a: WaterActivity) => void;
}) {
  const [choice, setChoice] = useState<WaterActivity>(value);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Water guide settings"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm animate-rise space-y-4 rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl dark:bg-slate-800"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
          <div>
            <h2 className="font-black">Water guide settings</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Adjust the daily guide to your lifestyle
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
          >
            ✕
          </button>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-700">
          Weight used <strong>{fmt1(weightKg)} kg</strong>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            Your latest logged weight is used automatically
          </span>
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-bold">Activity and environment</legend>
          {(Object.keys(WATER_ACTIVITY) as WaterActivity[]).map((a) => {
            const f = WATER_ACTIVITY[a].mlPerKg;
            const [lo, hi] = waterRangeMl(weightKg, a);
            return (
              <label
                key={a}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-sm transition ${choice === a ? 'border-sky-500 bg-sky-50 dark:bg-sky-500/15' : 'border-slate-200 dark:border-slate-600'}`}
              >
                <span>
                  <span className="block font-semibold">{WATER_ACTIVITY[a].label}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {f}–{f + 5} ml per kg
                  </span>
                </span>
                <span className="shrink-0 text-xs font-bold text-sky-700 dark:text-sky-300">
                  {fmtInt(lo)}~{fmtInt(hi)} ml
                </span>
                <input
                  type="radio"
                  name="water-activity"
                  className="sr-only"
                  checked={choice === a}
                  onChange={() => setChoice(a)}
                />
              </label>
            );
          })}
        </fieldset>
        <p className="rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-xs leading-relaxed text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100">
          🌿 Sip little and often. No need to count every cup; drink before you feel thirsty.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(choice)}>Update guide</Button>
        </div>
      </div>
    </div>
  );
}

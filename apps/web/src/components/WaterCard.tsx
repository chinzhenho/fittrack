import { useState } from 'react';
import { updateProfileDetails } from '../data/actions';
import { update } from '../data/store';
import type { Profile } from '../data/types';
import { fmt1, fmtInt } from '../lib/format';
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
          <p className="text-sm font-black">每日饮水建议</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            你有肾脏方面的状况，喝水量请按医生的建议。
          </p>
        </div>
      </Card>
    );
  }
  if (weightKg === null) return null;

  const [min, max] = waterRangeMl(weightKg, activity);
  return (
    <Card className="p-4 ring-sky-100 dark:ring-sky-500/20">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-lg shadow-sm dark:bg-sky-500/20"
          >
            💧
          </span>
          <div>
            <p className="text-sm font-black whitespace-nowrap">每日饮水建议</p>
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
                科学调配
              </span>
              <span className="whitespace-nowrap">依体重 {fmt1(weightKg)} kg 估算</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAdjusting(true)}
          className="flex min-h-9 shrink-0 items-center gap-1 rounded-xl border border-sky-100 bg-sky-50 px-2.5 text-xs font-bold text-sky-700 transition hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-200"
        >
          <span aria-hidden="true">⚙︎</span> 调整系数
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-emerald-50/50 p-3 dark:border-sky-500/20 dark:from-sky-500/10 dark:to-emerald-500/5">
        <div>
          <p className="text-xs font-bold text-sky-600 dark:text-sky-300">建议每日饮水量</p>
          <p className="flex items-baseline gap-1">
            <span className="text-2xl font-black tracking-tight text-sky-800 dark:text-sky-200">
              {fmtInt(min)} ~ {fmtInt(max)}
            </span>
            <span className="text-xs font-bold text-slate-500">ml</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            约等于马克杯{' '}
            <strong>
              {Math.round(min / WATER_CUP_ML)} ~ {Math.round(max / WATER_CUP_ML)} 杯
            </strong>
          </p>
        </div>
        <div className="shrink-0 text-right text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          <span className="block">晨起 300ml</span>
          <span className="block">餐前 200ml</span>
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
        aria-label="个人化饮水建议设定"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm animate-rise space-y-4 rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl dark:bg-slate-800"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-700">
          <div>
            <h2 className="font-black">个人化饮水建议设定</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              根据生活型态调整每日喝水基准
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
          >
            ✕
          </button>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-700">
          参考体重 <strong>{fmt1(weightKg)} kg</strong>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            自动使用你最新记录的体重
          </span>
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-bold">活动量与环境</legend>
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
                    每公斤 {f}–{f + 5} ml
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
          🌿 喝水重在少量多次，不必逐杯计算；口渴前就补一点。
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={() => onSave(choice)}>更新建议量</Button>
        </div>
      </div>
    </div>
  );
}

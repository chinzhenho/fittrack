import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { useToast } from '../components/Toast';
import { Button, Card, Field, inputClass, Notice, PageTitle } from '../components/ui';
import { addActivity, removeSession, saveSession } from '../data/actions';
import { getState, newId, update, useAppState } from '../data/store';
import type { LoggedSet, WorkoutSession as Session } from '../data/types';
import { localToday } from '../lib/dates';
import { exerciseById, newRecords, templateById, type WorkoutTemplate } from '../logic/workouts';

function freshSession(t: WorkoutTemplate, date: string): Session {
  const sets: LoggedSet[] = t.items.flatMap((item) =>
    Array.from({ length: item.sets }, () => ({
      exerciseId: item.exerciseId,
      ...(item.reps !== undefined && { reps: item.reps }),
      ...(item.seconds !== undefined && { durationS: item.seconds }),
      done: false,
    })),
  );
  return {
    id: newId(),
    date,
    templateId: t.id,
    startedAt: new Date().toISOString(),
    sets,
    painExerciseIds: [],
  };
}

export function WorkoutSession() {
  const { templateId = '' } = useParams();
  const template = templateById(templateId);
  if (!template) return <Navigate to="/workout" replace />;
  return template.activity ? (
    <ActivityLogger template={template} />
  ) : (
    <SetLogger template={template} />
  );
}

function SetLogger({ template }: { template: WorkoutTemplate }) {
  const s = useAppState();
  const navigate = useNavigate();
  const toast = useToast();
  const today = useMemo(() => localToday(), []);
  const [restLeft, setRestLeft] = useState(0);

  // Resume an unfinished session of this template, otherwise start one and save it at once,
  // so closing the page keeps the progress (spec 17, week 12).
  const existing = s.sessions.find((x) => !x.endedAt && x.templateId === template.id);
  useEffect(() => {
    if (!getState().sessions.some((x) => !x.endedAt && x.templateId === template.id)) {
      update((x) => saveSession(x, freshSession(template, today)));
    }
  }, [template, today]);

  useEffect(() => {
    if (restLeft <= 0) return;
    const t = setTimeout(() => setRestLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [restLeft]);

  if (!existing) return null;
  const session = existing;
  const save = (next: Session) => update((x) => saveSession(x, next));

  const patchSet = (index: number, patch: Partial<LoggedSet>) =>
    save({
      ...session,
      sets: session.sets.map((set, i) => (i === index ? { ...set, ...patch } : set)),
    });

  const toggleDone = (index: number) => {
    const set = session.sets[index];
    if (!set) return;
    patchSet(index, { done: !set.done });
    if (!set.done) setRestLeft(exerciseById(set.exerciseId)?.weighted ? 90 : 45);
  };

  const finish = () => {
    const done: Session = { ...session, endedAt: new Date().toISOString() };
    const earlier = getState().sessions.filter((x) => x.endedAt && x.id !== session.id);
    const records = newRecords(done, earlier);
    save(done);
    toast({
      text: records.length
        ? `完成！新的個人紀錄：${records.map((id) => exerciseById(id)?.name).join('、')}`
        : `完成 ${template.name}！`,
    });
    navigate('/workout');
  };

  const exerciseIds = [...new Set(session.sets.map((x) => x.exerciseId))];
  const doneCount = session.sets.filter((x) => x.done).length;

  return (
    <div className="space-y-4">
      <PageTitle sub={template.note}>{template.name}</PageTitle>

      {restLeft > 0 && (
        <div
          className="sticky top-2 z-30 flex items-center justify-between rounded-2xl bg-navy p-4 text-white shadow-lg dark:bg-slate-700"
          role="timer"
          aria-live="off"
        >
          <span>
            組間休息 <span className="text-2xl font-semibold tabular-nums">{restLeft}</span> 秒
          </span>
          <Button variant="secondary" onClick={() => setRestLeft(0)}>
            跳過
          </Button>
        </div>
      )}

      {exerciseIds.map((id) => {
        const ex = exerciseById(id);
        if (!ex) return null;
        const pain = session.painExerciseIds.includes(id);
        return (
          <Card key={id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{ex.name}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">{ex.cue}</p>
              </div>
              {!pain && (
                <button
                  type="button"
                  className="min-h-11 shrink-0 rounded-xl px-2 text-xs text-amber-800 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950"
                  onClick={() =>
                    save({ ...session, painExerciseIds: [...session.painExerciseIds, id] })
                  }
                >
                  感到疼痛
                </button>
              )}
            </div>
            {pain ? (
              <div className="mt-3">
                <Notice tone="warn">
                  已停止這個動作。如果疼痛持續或明顯，請尋求醫療協助，不要勉強繼續。
                </Notice>
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {session.sets.map((set, i) =>
                  set.exerciseId !== id ? null : (
                    <li key={i} className="flex items-end gap-2">
                      <span className="w-12 shrink-0 whitespace-nowrap pb-3 text-sm text-slate-600 dark:text-slate-300">
                        第 {session.sets.slice(0, i + 1).filter((x) => x.exerciseId === id).length}{' '}
                        組
                      </span>
                      {ex.kind === 'reps' ? (
                        <NumberBox
                          label="次數"
                          value={set.reps}
                          onChange={(v) => patchSet(i, v === undefined ? { reps: 0 } : { reps: v })}
                        />
                      ) : (
                        <NumberBox
                          label="秒"
                          value={set.durationS}
                          onChange={(v) => patchSet(i, { durationS: v ?? 0 })}
                        />
                      )}
                      {ex.weighted && (
                        <NumberBox
                          label="重量 kg"
                          value={set.weightKg}
                          step="0.5"
                          onChange={(v) => {
                            const { weightKg: _drop, ...rest } = set;
                            void _drop;
                            save({
                              ...session,
                              sets: session.sets.map((x, j) =>
                                j === i
                                  ? v === undefined
                                    ? { ...rest }
                                    : { ...rest, weightKg: v }
                                  : x,
                              ),
                            });
                          }}
                        />
                      )}
                      <Button
                        variant={set.done ? 'primary' : 'secondary'}
                        aria-pressed={set.done}
                        className="shrink-0"
                        onClick={() => toggleDone(i)}
                      >
                        {set.done ? '✓ 完成' : '完成'}
                      </Button>
                    </li>
                  ),
                )}
              </ul>
            )}
          </Card>
        );
      })}

      <div className="flex gap-3">
        <Button
          variant="ghost"
          onClick={() => {
            update((x) => removeSession(x, session.id));
            navigate('/workout');
          }}
        >
          放棄
        </Button>
        <Button className="flex-1" disabled={doneCount === 0} onClick={finish}>
          結束訓練（{doneCount} / {session.sets.length} 組）
        </Button>
      </div>
    </div>
  );
}

function NumberBox({
  label,
  value,
  step = '1',
  onChange,
}: {
  label: string;
  value: number | undefined;
  step?: string;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div className="min-w-0 flex-1">
      <Field label={label}>
        {(p) => (
          <input
            {...p}
            type="number"
            inputMode="decimal"
            min={0}
            step={step}
            value={value ?? ''}
            onChange={(e) =>
              onChange(e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)))
            }
            className={inputClass}
          />
        )}
      </Field>
    </div>
  );
}

function ActivityLogger({ template }: { template: WorkoutTemplate }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [minutes, setMinutes] = useState(String(template.activity?.minutes ?? 20));
  const m = Number(minutes);
  const ok = m >= 1 && m <= 600;
  return (
    <div className="space-y-4">
      <PageTitle sub={template.note}>{template.name}</PageTitle>
      <Card className="space-y-4">
        <p className="text-sm">完成後記錄實際的分鐘數。走路、跑步都算數。</p>
        <Field label="分鐘" error={ok ? null : '請輸入 1 至 600 分鐘。'}>
          {(p) => (
            <input
              {...p}
              type="number"
              inputMode="numeric"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <Button
          className="w-full"
          disabled={!ok}
          onClick={() => {
            update((x) =>
              addActivity(x, {
                id: newId(),
                date: localToday(),
                type: template.activity?.type ?? 'walk',
                minutes: m,
              }),
            );
            toast({ text: `已記錄 ${m} 分鐘活動` });
            navigate('/today');
          }}
        >
          記錄活動
        </Button>
      </Card>
    </div>
  );
}

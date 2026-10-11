import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, CardTitle, PageTitle } from '../components/ui';
import { removeSession } from '../data/actions';
import { update, useAppState } from '../data/store';
import { formatDateZh, localToday } from '../lib/dates';
import { MODE_LABELS } from '../lib/messages';
import {
  bestWeights,
  exerciseById,
  TEMPLATES,
  templateById,
  templatesFor,
  type WorkoutTemplate,
} from '../logic/workouts';

export function Workout() {
  const s = useAppState();
  const navigate = useNavigate();
  const today = useMemo(() => localToday(), []);
  const [showAll, setShowAll] = useState(false);
  const mode = s.profile?.lifestyleMode ?? 'mixed';
  const mine = templatesFor(mode);
  const others = TEMPLATES.filter((t) => !mine.includes(t));
  const unfinished = s.sessions.find((x) => !x.endedAt);
  const finished = s.sessions
    .filter((x) => x.endedAt)
    .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''));
  const best = bestWeights(s.sessions);
  const activities = [...s.activities].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  return (
    <div className="space-y-4">
      <PageTitle sub={`目前模式：${MODE_LABELS[mode].name}（可在「我」頁面切換）`}>訓練</PageTitle>

      {unfinished && (
        <Card className="ring-2 ring-emerald">
          <p className="font-medium">
            有一個未完成的訓練：{templateById(unfinished.templateId)?.name}
          </p>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => navigate(`/workout/start/${unfinished.templateId}`)}>
              繼續
            </Button>
            <Button variant="ghost" onClick={() => update((x) => removeSession(x, unfinished.id))}>
              放棄
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <CardTitle>適合你的訓練</CardTitle>
        <TemplateList templates={mine} onStart={(id) => navigate(`/workout/start/${id}`)} />
        <Button
          variant="ghost"
          className="mt-2"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
        >
          {showAll ? '收起其他訓練' : `查看其他訓練（${others.length}）`}
        </Button>
        {showAll && (
          <TemplateList templates={others} onStart={(id) => navigate(`/workout/start/${id}`)} />
        )}
      </Card>

      {best.size > 0 && (
        <Card>
          <CardTitle>個人最佳重量</CardTitle>
          <ul className="space-y-1 text-sm">
            {[...best].map(([id, kg]) => (
              <li key={id} className="flex justify-between">
                <span>{exerciseById(id)?.name ?? id}</span>
                <span className="font-medium">{kg} kg</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardTitle>最近記錄</CardTitle>
        {finished.length === 0 && activities.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            還沒有訓練記錄。從一個 5 分鐘的活動開始吧。
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {finished.slice(0, 10).map((x) => (
              <li key={x.id} className="flex justify-between gap-3 py-2">
                <span>{templateById(x.templateId)?.name}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {formatDateZh(x.date, today)} · {x.sets.filter((t) => t.done).length} 組
                </span>
              </li>
            ))}
            {activities.map((a) => (
              <li key={a.id} className="flex justify-between gap-3 py-2">
                <span>
                  {{ walk: '走路', run: '跑步', cycle: '騎腳車', other: '其他活動' }[a.type]}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {formatDateZh(a.date, today)} · {a.minutes} 分鐘
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function TemplateList({
  templates,
  onStart,
}: {
  templates: WorkoutTemplate[];
  onStart: (id: string) => void;
}) {
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {templates.map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="font-medium">{t.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              約 {t.minutes} 分鐘 · {t.note}
            </p>
          </div>
          <Button variant="secondary" onClick={() => onStart(t.id)}>
            開始
          </Button>
        </li>
      ))}
    </ul>
  );
}

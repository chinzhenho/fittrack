import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { BackButton, Button, Card, CardTitle, PageTitle } from '../components/ui';
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
      <BackButton fallback="/me" />
      <PageTitle sub={`目前模式：${MODE_LABELS[mode].name}（可在“我”页面切换）`}>训练</PageTitle>

      {unfinished && (
        <Card className="ring-2 ring-emerald">
          <p className="font-medium">
            有一个未完成的训练：{templateById(unfinished.templateId)?.name}
          </p>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => navigate(`/workout/start/${unfinished.templateId}`)}>
              继续
            </Button>
            <Button variant="ghost" onClick={() => update((x) => removeSession(x, unfinished.id))}>
              放弃
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <CardTitle>适合你的训练</CardTitle>
        <TemplateList templates={mine} onStart={(id) => navigate(`/workout/start/${id}`)} />
        <Button
          variant="ghost"
          className="mt-2"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
        >
          {showAll ? '收起其他训练' : `查看其他训练（${others.length}）`}
        </Button>
        {showAll && (
          <TemplateList templates={others} onStart={(id) => navigate(`/workout/start/${id}`)} />
        )}
      </Card>

      {best.size > 0 && (
        <Card>
          <CardTitle>个人最佳重量</CardTitle>
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
        <CardTitle>最近记录</CardTitle>
        {finished.length === 0 && activities.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            还没有训练记录。从一个 5 分钟的活动开始吧。
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-700">
            {finished.slice(0, 10).map((x) => (
              <li key={x.id} className="flex justify-between gap-3 py-2">
                <span>{templateById(x.templateId)?.name}</span>
                <span className="text-slate-600 dark:text-slate-300">
                  {formatDateZh(x.date, today)} · {x.sets.filter((t) => t.done).length} 组
                </span>
              </li>
            ))}
            {activities.map((a) => (
              <li key={a.id} className="flex justify-between gap-3 py-2">
                <span>
                  {{ walk: '走路', run: '跑步', cycle: '骑脚车', other: '其他活动' }[a.type]}
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  {formatDateZh(a.date, today)} · {a.minutes} 分钟
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
    <ul className="divide-y divide-slate-100 dark:divide-slate-700">
      {templates.map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="font-medium">{t.name}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              约 {t.minutes} 分钟 · {t.note}
            </p>
          </div>
          <Button variant="secondary" onClick={() => onStart(t.id)}>
            开始
          </Button>
        </li>
      ))}
    </ul>
  );
}

import { addDays } from '@fittrack/engine';
import type { AppState, LifestyleMode } from '../data/types';
import { mealsOn, sumNutrients } from './nutrition';

// Daily "small wins" (spec 7.1 and 18.3). Completion is computed from the records,
// never stored, so it is always consistent with what the user logged.

export type TaskId =
  | 'log_meal'
  | 'log_three'
  | 'protein_meal'
  | 'mark_complete'
  | 'log_weight'
  | 'walk_10'
  | 'walk_20'
  | 'home_short'
  | 'planned_workout'
  | 'stretch';

export interface Task {
  id: TaskId;
  title: string;
  hint: string;
  done: boolean;
  skipped: boolean;
  link?: string;
}

const COPY: Record<TaskId, { title: string; hint: string; link?: string }> = {
  log_meal: { title: '記錄一餐', hint: '先從一餐開始就好', link: '/diary' },
  log_three: { title: '記錄三餐', hint: '早餐、午餐、晚餐都記一下', link: '/diary' },
  protein_meal: { title: '一餐含 20 g 蛋白質', hint: '例如雞蛋、豆腐、魚或雞肉', link: '/diary' },
  mark_complete: { title: '標記今天已完整記錄', hint: '讓趨勢分析更準確', link: '/diary' },
  log_weight: { title: '記錄體重', hint: '建議早上如廁後、進食前量', link: '/progress' },
  walk_10: { title: '散步 10 分鐘', hint: '走路也算數', link: '/workout' },
  walk_20: { title: '快走 20 分鐘', hint: '能說話但不能唱歌的節奏', link: '/workout' },
  home_short: { title: '完成 5 或 10 分鐘訓練', hint: '在家就能做', link: '/workout' },
  planned_workout: { title: '完成今天的訓練', hint: '記錄重量和次數', link: '/workout' },
  stretch: { title: '伸展 10 分鐘', hint: '休息日也可以照顧身體', link: '/workout' },
};

function isDone(id: TaskId, s: AppState, date: string): boolean {
  const meals = mealsOn(s.meals, date);
  const sessions = s.sessions.filter((x) => x.date === date && x.endedAt);
  const activityMin = s.activities
    .filter((a) => a.date === date)
    .reduce((t, a) => t + a.minutes, 0);
  switch (id) {
    case 'log_meal':
      return meals.length > 0;
    case 'log_three':
      return (['breakfast', 'lunch', 'dinner'] as const).every((m) =>
        meals.some((x) => x.meal === m),
      );
    case 'protein_meal':
      return (['breakfast', 'lunch', 'dinner', 'snack'] as const).some(
        (m) => sumNutrients(meals.filter((x) => x.meal === m)).proteinG >= 20,
      );
    case 'mark_complete':
      return s.completeDays.includes(date);
    case 'log_weight':
      return s.weights.some((w) => w.date === date);
    case 'walk_10':
      return activityMin >= 10;
    case 'walk_20':
      return activityMin >= 20;
    case 'home_short':
      return sessions.some((x) => x.templateId === 'home-5' || x.templateId === 'home-10');
    case 'planned_workout':
      return sessions.some((x) => x.templateId !== 'stretch-10');
    case 'stretch':
      return sessions.some((x) => x.templateId === 'stretch-10');
  }
}

function activityTask(mode: LifestyleMode, restDay: boolean, easy: boolean): TaskId {
  if (restDay) return 'stretch';
  switch (mode) {
    case 'nutrition_first':
      return 'walk_10';
    case 'home':
      return 'home_short';
    case 'gym':
      return easy ? 'home_short' : 'planned_workout';
    case 'outdoor':
      return easy ? 'walk_10' : 'walk_20';
    case 'mixed':
      return easy ? 'walk_10' : 'home_short';
  }
}

function taskIdsFor(s: AppState, date: string, easy: boolean): TaskId[] {
  const p = s.profile;
  if (!p) return [];
  const rest = s.restDays.includes(date);
  const act = activityTask(p.lifestyleMode, rest, easy);
  if (easy) return ['log_meal', act];
  const last: TaskId = p.hideNumbers ? 'mark_complete' : 'log_weight';
  return ['log_three', 'protein_meal', act, last];
}

/** Completion rate over the 7 days before `date` (spec 7.1: < 30% -> only 2 easy tasks). */
export function recentCompletion(s: AppState, date: string): number | null {
  let total = 0;
  let done = 0;
  for (let i = 1; i <= 7; i++) {
    const d = addDays(date, -i);
    if (!s.profile || d < s.profile.consentedAt.slice(0, 10)) continue;
    const ids = taskIdsFor(s, d, false);
    total += ids.length;
    done += ids.filter((id) => isDone(id, s, d)).length;
  }
  return total === 0 ? null : done / total;
}

export function tasksFor(s: AppState, date: string): Task[] {
  const rate = recentCompletion(s, date);
  const easy = rate !== null && rate < 0.3;
  const skipped = s.skippedTasks[date] ?? [];
  return taskIdsFor(s, date, easy).map((id) => ({
    id,
    ...COPY[id],
    done: isDone(id, s, date),
    skipped: skipped.includes(id),
  }));
}

import { addDays } from '@fittrack/engine';
import type { AppState, LifestyleMode } from '../data/types';
import { mealsOn, sumNutrients } from './nutrition';
import { targetOn } from './targets';

// Daily "small wins" (spec 7.1 and 18.3). Completion is computed from the records,
// never stored, so it is always consistent with what the user logged.

export type TaskId =
  | 'log_meal'
  | 'log_three'
  | 'protein_meal'
  | 'protein_target'
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
  /** How far along the task is today, e.g. 2 of 3 meals. */
  progress?: { value: number; max: number; text: string };
}

const COPY: Record<TaskId, { title: string; hint: string; link?: string }> = {
  log_meal: { title: '記錄一餐', hint: '先從一餐開始就好', link: '/diary' },
  log_three: { title: '記錄三餐', hint: '早餐、午餐、晚餐都記一下', link: '/diary' },
  protein_meal: { title: '一餐含 20 g 蛋白質', hint: '例如雞蛋、豆腐、魚或雞肉', link: '/diary' },
  protein_target: { title: '蛋白質吃夠', hint: '雞蛋、豆腐、魚、雞肉都是好選擇', link: '/diary' },
  mark_complete: { title: '確認今天全部記錄了', hint: '完整的日子會讓建議更準確' },
  log_weight: { title: '記錄今天的體重', hint: '早上如廁後、吃東西前量最準' },
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
    case 'protein_target': {
      const t = targetOn(s.targets, date);
      return t !== null && sumNutrients(meals).proteinG >= t.proteinG;
    }
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
  // With numbers hidden the user does not want to weigh in, so ask for a complete day instead.
  return p.hideNumbers
    ? ['log_three', 'protein_meal', act, 'mark_complete']
    : ['log_three', 'protein_target', act, 'log_weight'];
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
    ...progressFor(id, s, date),
  }));
}

function progressFor(id: TaskId, s: AppState, date: string): Pick<Task, 'progress'> {
  const meals = mealsOn(s.meals, date);
  const minutes = s.activities.filter((a) => a.date === date).reduce((t, a) => t + a.minutes, 0);
  switch (id) {
    case 'log_three': {
      const n = (['breakfast', 'lunch', 'dinner'] as const).filter((m) =>
        meals.some((x) => x.meal === m),
      ).length;
      return { progress: { value: n, max: 3, text: `${n} / 3 餐` } };
    }
    case 'protein_target': {
      const t = targetOn(s.targets, date);
      if (!t) return {};
      const g = Math.round(sumNutrients(meals).proteinG);
      return { progress: { value: g, max: t.proteinG, text: `${g} / ${t.proteinG} g` } };
    }
    case 'walk_10':
    case 'walk_20': {
      const max = id === 'walk_10' ? 10 : 20;
      return { progress: { value: minutes, max, text: `${minutes} / ${max} 分鐘` } };
    }
    default:
      return {};
  }
}

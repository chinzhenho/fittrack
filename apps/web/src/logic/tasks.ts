import { addDays } from '@fittrack/engine';
import type { AppState } from '../data/types';
import { isGainGoal, mealsOn, sumNutrients } from './nutrition';
import { targetOn } from './targets';

// Daily "small wins" (spec 7.1 and 18.3). Completion is computed from the records,
// never stored, so it is always consistent with what the user logged.

export type TaskId =
  | 'log_meal'
  | 'log_three'
  | 'protein_meal'
  | 'protein_target'
  | 'kcal_within'
  | 'mark_complete'
  | 'log_weight';

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
  log_meal: { title: '记录一餐', hint: '先从一餐开始就好', link: '/diary' },
  log_three: { title: '记录三餐', hint: '早餐、午餐、晚餐都记一下', link: '/diary' },
  protein_meal: { title: '一餐含 20 g 蛋白质', hint: '例如鸡蛋、豆腐、鱼或鸡肉', link: '/diary' },
  protein_target: { title: '蛋白质吃够', hint: '鸡蛋、豆腐、鱼、鸡肉都是好选择', link: '/diary' },
  kcal_within: {
    title: '热量不超过目标',
    hint: '记录晚餐后才会计算',
    link: '/diary',
  },
  mark_complete: { title: '确认今天全部记录了', hint: '完整的日子会让建议更准确' },
  log_weight: { title: '记录今天的体重', hint: '早上如厕后、吃东西前量最准' },
};

function isDone(id: TaskId, s: AppState, date: string): boolean {
  const meals = mealsOn(s.meals, date);
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
    case 'kcal_within': {
      const t = targetOn(s.targets, date);
      if (t === null) return false;
      const kcal = sumNutrients(meals).kcal;
      // Gaining: done once the target is reached. Losing or maintaining: judged only
      // once dinner is in, so the day is not "done" at breakfast.
      if (s.profile && isGainGoal(s.profile.goal)) return kcal >= t.caloriesKcal;
      return meals.some((x) => x.meal === 'dinner') && kcal <= t.caloriesKcal;
    }
    case 'mark_complete':
      return s.completeDays.includes(date);
    case 'log_weight':
      return s.weights.some((w) => w.date === date);
  }
}

function taskIdsFor(s: AppState, date: string, easy: boolean): TaskId[] {
  const p = s.profile;
  if (!p) return [];
  // The app is about eating, so the third goal is staying within the calorie target.
  if (easy) return ['log_meal', 'kcal_within'];
  // With numbers hidden the user does not want to weigh in, so ask for a complete day instead.
  return p.hideNumbers
    ? ['log_three', 'protein_meal', 'kcal_within', 'mark_complete']
    : ['log_three', 'protein_target', 'kcal_within', 'log_weight'];
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
    ...(id === 'kcal_within' &&
      s.profile &&
      isGainGoal(s.profile.goal) && { title: '热量吃够目标', hint: '增重需要每天吃够热量' }),
    done: isDone(id, s, date),
    skipped: skipped.includes(id),
    ...progressFor(id, s, date),
  }));
}

function progressFor(id: TaskId, s: AppState, date: string): Pick<Task, 'progress'> {
  const meals = mealsOn(s.meals, date);
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
    case 'kcal_within': {
      const t = targetOn(s.targets, date);
      if (!t) return {};
      const kcal = Math.round(sumNutrients(meals).kcal);
      return {
        progress: { value: kcal, max: t.caloriesKcal, text: `${kcal} / ${t.caloriesKcal} kcal` },
      };
    }
    default:
      return {};
  }
}

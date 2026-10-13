import { addDays, trendOn } from '@fittrack/engine';
import type { AppState } from '../data/types';
import { fmt1, fmtInt } from '../lib/format';
import { adaptiveFor, targetOn, trendPoints } from './targets';
import { datesBetween, mondayOf, weeklySummary } from './weekly';

// Personal insights: fixed rules over the user's own records, never a diagnosis or a
// promise. Each rule states what it looked at, so the user can check it. A rule only
// speaks when it has enough data; dismissing hides it until the next week.

export type InsightCategory =
  'recording' | 'consistency' | 'protein' | 'calories' | 'meals' | 'weight' | 'adjust';

export type InsightTone = 'good' | 'tip' | 'care';

export interface Insight {
  id: string;
  category: InsightCategory;
  tone: InsightTone;
  title: string;
  body: string;
  /** The numbers behind it, e.g. "近 7 天：5 天有记录". */
  data: string;
  action?: { label: string; to: string };
  /** Contains calories or weight, so it is hidden when numbers are hidden. */
  numeric: boolean;
  /** Lower is more important. */
  priority: number;
}

export const CATEGORY_LABELS: Record<InsightCategory, string> = {
  recording: '记录',
  consistency: '坚持',
  protein: '蛋白质',
  calories: '热量',
  meals: '餐次',
  weight: '体重趋势',
  adjust: '目标',
};

export function insightKey(id: string, today: string): string {
  return `${id}:${mondayOf(today)}`;
}

export function insightsFor(s: AppState, today: string): Insight[] {
  const profile = s.profile;
  if (!profile) return [];
  const start = addDays(today, -6);
  const w = weeklySummary(s, start, today);
  const out: Insight[] = [];
  const goal = profile.goal;

  // Recording and consistency.
  if (w.loggedDays < 3) {
    out.push({
      id: 'few_logs',
      category: 'recording',
      tone: 'tip',
      title: '再多记录几天',
      body: '有 3 天以上的记录，才看得出你的饮食规律。不用每样都很精准，先记下大概就好。',
      data: `近 7 天：${w.loggedDays} 天有饮食记录`,
      action: { label: '去记录饮食', to: '/diary' },
      numeric: false,
      priority: 1,
    });
  } else if (w.loggedDays >= 5) {
    out.push({
      id: 'steady_logs',
      category: 'consistency',
      tone: 'good',
      title: '记录很稳定',
      body: '你最近几乎每天都有记录，这是看清自己饮食习惯最重要的一步。',
      data: `近 7 天：${w.loggedDays} 天有饮食记录`,
      numeric: false,
      priority: 8,
    });
  }

  // Few days marked complete: the calorie judgement and target suggestions need them.
  if (w.loggedDays >= 3 && w.completeDays < w.loggedDays / 2) {
    out.push({
      id: 'mark_complete',
      category: 'recording',
      tone: 'tip',
      title: '记完一天后，标记“已完整记录”',
      body: '只有标记为完整的日子，才会用来判断热量是否在目标内，以及计算目标调整建议。没有吃完或漏记的日子不用标记。',
      data: `近 7 天：${w.loggedDays} 天有记录，其中 ${w.completeDays} 天已标记完整`,
      action: { label: '去饮食页标记', to: '/diary' },
      numeric: false,
      priority: 2,
    });
  }

  // Protein: judged on complete days only.
  if (w.proteinJudgedDays >= 3 && w.targetProteinG !== null) {
    const rate = w.proteinMetDays / w.proteinJudgedDays;
    if (rate < 0.5) {
      out.push({
        id: 'protein_low',
        category: 'protein',
        tone: 'tip',
        title: '蛋白质常常不够',
        body: '可以在每一餐加一份蛋白质，例如鸡蛋、豆腐、鱼、鸡肉或一杯牛奶。',
        data: `近 7 天完整记录的 ${w.proteinJudgedDays} 天中，${w.proteinMetDays} 天达到 ${w.targetProteinG} g`,
        numeric: false,
        priority: 3,
      });
    } else if (rate >= 0.8) {
      out.push({
        id: 'protein_good',
        category: 'protein',
        tone: 'good',
        title: '蛋白质吃得很稳',
        body: '大部分日子都达到蛋白质目标，继续保持这个习惯。',
        data: `近 7 天完整记录的 ${w.proteinJudgedDays} 天中，${w.proteinMetDays} 天达标`,
        numeric: false,
        priority: 9,
      });
    }
  }

  // Calories: complete days only, compared with the target and the safety floor.
  const t = targetOn(s.targets, today);
  if (t && w.completeDays >= 3 && w.avgCompleteKcal !== null) {
    const avg = w.avgCompleteKcal;
    const data = `近 7 天 ${w.completeDays} 个完整记录日，平均 ${fmtInt(avg)} kcal；目标 ${fmtInt(t.caloriesKcal)} kcal`;
    if (avg < t.calorieFloorKcal) {
      out.push({
        id: 'kcal_below_floor',
        category: 'calories',
        tone: 'care',
        title: '吃得比安全下限还少',
        body: `长期吃得太少可能让人疲倦、难以坚持，也可能流失肌肉。建议每天至少吃到 ${fmtInt(t.calorieFloorKcal)} kcal；如果有不适，请咨询医生或营养师。`,
        data,
        numeric: true,
        priority: 0,
      });
    } else if (avg > t.caloriesKcal * 1.1 && goal !== 'muscle_gain' && goal !== 'weight_gain') {
      out.push({
        id: 'kcal_above',
        category: 'calories',
        tone: 'tip',
        title: '热量常常超出目标',
        body: '可以留意分量较大或含油、含糖较多的一餐，从一餐开始调整就好，不必每天都完美。',
        data,
        numeric: true,
        priority: 4,
      });
    } else if (avg < t.caloriesKcal * 0.9 && (goal === 'muscle_gain' || goal === 'weight_gain')) {
      out.push({
        id: 'kcal_below_gain',
        category: 'calories',
        tone: 'tip',
        title: '热量还没吃够',
        body: '增重需要吃得比消耗多。可以加一份点心，或在正餐多加一些饭、坚果或牛奶。',
        data,
        numeric: true,
        priority: 4,
      });
    }
  }

  // Meal pattern: breakfast rarely logged.
  if (w.loggedDays >= 4) {
    const days = datesBetween(start, today).filter((d) => s.meals.some((m) => m.date === d));
    const breakfast = days.filter((d) =>
      s.meals.some((m) => m.date === d && m.meal === 'breakfast'),
    ).length;
    if (breakfast <= days.length / 3) {
      out.push({
        id: 'breakfast_rare',
        category: 'meals',
        tone: 'tip',
        title: '早餐很少出现在记录里',
        body: '如果你习惯不吃早餐，那没有问题；如果只是忘了记，补记早餐会让一天的热量更准确。',
        data: `近 7 天有记录的 ${days.length} 天中，${breakfast} 天有早餐`,
        numeric: false,
        priority: 6,
      });
    }
  }

  // Weight trend over 14 days, only with enough weigh-ins.
  const points = trendPoints(s.weights);
  const weighIns = new Set(s.weights.filter((x) => x.date > addDays(today, -14)).map((x) => x.date))
    .size;
  const now = trendOn(points, today);
  const before = trendOn(points, addDays(today, -14));
  if (weighIns >= 4 && now !== null && before !== null) {
    const change = now - before;
    const perWeekPct = ((change / before) * 100) / 2;
    const data = `近 14 天量了 ${weighIns} 次，趋势体重 ${change > 0 ? '+' : ''}${fmt1(change)} kg`;
    const toward = goal === 'fat_loss' ? change < -0.2 : goal === 'maintain' ? false : change > 0.2;
    if (goal === 'fat_loss' && perWeekPct < -1) {
      out.push({
        id: 'loss_fast',
        category: 'weight',
        tone: 'care',
        title: '体重下降得比较快',
        body: '每周减超过体重的 1% 比较难坚持，也较容易流失肌肉。可以确认是否吃得太少。',
        data,
        numeric: true,
        priority: 1,
      });
    } else if (toward) {
      out.push({
        id: 'trend_toward',
        category: 'weight',
        tone: 'good',
        title: '体重趋势在往目标方向走',
        body: '看的是平滑后的趋势，而不是某一天的数字。继续保持现在的做法。',
        data,
        numeric: true,
        priority: 7,
      });
    } else if (goal === 'maintain' && Math.abs(change) <= 0.5) {
      out.push({
        id: 'trend_stable',
        category: 'weight',
        tone: 'good',
        title: '体重维持得很稳定',
        body: '两周内的趋势变化很小，代表你现在的吃法大致符合消耗。',
        data,
        numeric: true,
        priority: 7,
      });
    } else if (goal !== 'maintain') {
      out.push({
        id: 'trend_flat',
        category: 'weight',
        tone: 'tip',
        title: '最近两周趋势变化不大',
        body: '体重会受水分、盐分和生理周期影响，两周不变很常见。先确认记录是否完整，再考虑调整。',
        data,
        numeric: true,
        priority: 5,
      });
    }
  }

  // Adjustment suggestion ready.
  const adaptive = adaptiveFor(s, today);
  const kept = s.adaptiveKeptOn.some((d) => d > addDays(today, -14));
  if (adaptive?.ok && t && adaptive.proposedTargetKcal !== t.caloriesKcal && !kept) {
    out.push({
      id: 'adjust_ready',
      category: 'adjust',
      tone: 'tip',
      title: '有新的目标调整建议',
      body: '根据你最近的记录，系统算出了一个可能更合适的每日目标。要不要采用由你决定。',
      data: `根据 ${adaptive.windowDays} 天的记录`,
      action: { label: '查看建议', to: '#adjust' },
      numeric: true,
      priority: 2,
    });
  }

  const dismissed = new Set(s.dismissedInsights);
  return out
    .filter((i) => !dismissed.has(insightKey(i.id, today)))
    .filter((i) => !profile.hideNumbers || !i.numeric)
    .sort((a, b) => a.priority - b.priority);
}

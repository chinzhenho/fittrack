import { addDays, trendOn } from '@fittrack/engine';
import type { AppState } from '../data/types';
import { fmt1, fmtInt } from '../lib/format';
import { adaptiveFor, targetOn, trendPoints } from './targets';
import { datesBetween, mondayOf, weeklySummary } from './weekly';
import { t, tr } from '../lib/i18n';

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
  /** The numbers behind it, e.g. "Last 7 days: 5 days logged". */
  data: string;
  action?: { label: string; to: string };
  /** Contains calories or weight, so it is hidden when numbers are hidden. */
  numeric: boolean;
  /** Lower is more important. */
  priority: number;
}

export const CATEGORY_LABELS: Record<InsightCategory, string> = tr({
  recording: 'Logging',
  consistency: 'Consistency',
  protein: 'Protein',
  calories: 'Calories',
  meals: 'Meals',
  weight: 'Weight',
  adjust: 'Target',
});

export function insightKey(id: string, today: string): string {
  return `${id}:${mondayOf(today)}`;
}

export function insightsFor(s: AppState, today: string): Insight[] {
  const profile = s.profile;
  if (!profile) return [];
  const start = addDays(today, -6);
  const w = weeklySummary(s, start, today, today);
  const out: Insight[] = [];
  const goal = profile.goal;

  // Recording and consistency.
  if (w.loggedDays < 3) {
    out.push({
      id: 'few_logs',
      category: 'recording',
      tone: 'tip',
      title: t('Log a few more days'),
      body: t(
        "With 3 or more days logged, your eating patterns start to show. It doesn't need to be perfect; a rough log is fine.",
      ),
      data: t('Last 7 days: food logged on {loggedDays} days', { loggedDays: w.loggedDays }),
      action: { label: t('Log food'), to: '/diary' },
      numeric: false,
      priority: 1,
    });
  } else if (w.loggedDays >= 5) {
    out.push({
      id: 'steady_logs',
      category: 'consistency',
      tone: 'good',
      title: t("You're logging consistently"),
      body: t(
        "You've logged almost every day recently. That's the most important step to understanding your eating habits.",
      ),
      data: t('Last 7 days: food logged on {loggedDays} days', { loggedDays: w.loggedDays }),
      numeric: false,
      priority: 8,
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
        title: t('Protein is often low'),
        body: t(
          'Try adding a protein to each meal, such as eggs, tofu, fish, chicken or a glass of milk.',
        ),
        data: t(
          'Last 7 days: you reached {targetProteinG} g on {proteinMetDays} of {proteinJudgedDays} complete days',
          {
            targetProteinG: w.targetProteinG,
            proteinMetDays: w.proteinMetDays,
            proteinJudgedDays: w.proteinJudgedDays,
          },
        ),
        numeric: false,
        priority: 3,
      });
    } else if (rate >= 0.8) {
      out.push({
        id: 'protein_good',
        category: 'protein',
        tone: 'good',
        title: t('Protein is on track'),
        body: t('You hit your protein target on most days. Keep it up.'),
        data: t('Last 7 days: on target {proteinMetDays} of {proteinJudgedDays} complete days', {
          proteinMetDays: w.proteinMetDays,
          proteinJudgedDays: w.proteinJudgedDays,
        }),
        numeric: false,
        priority: 9,
      });
    }
  }

  // Calories: complete days only, compared with the target and the safety floor.
  const tg = targetOn(s.targets, today);
  if (tg && w.completeDays >= 3 && w.avgCompleteKcal !== null) {
    const avg = w.avgCompleteKcal;
    const data = t(
      'Last 7 days: about {avg} kcal a day on complete days; your target is {target} kcal',
      { avg: fmtInt(avg), target: fmtInt(tg.caloriesKcal) },
    );
    if (avg < tg.calorieFloorKcal) {
      out.push({
        id: 'kcal_below_floor',
        category: 'calories',
        tone: 'care',
        title: t('Eating below your safety floor'),
        body: t(
          'Eating too little for long can leave you tired, make it hard to keep going, and cost muscle. Aim for at least {v1} kcal a day; if you feel unwell, talk to a doctor or dietitian.',
          { v1: fmtInt(tg.calorieFloorKcal) },
        ),
        data,
        numeric: true,
        priority: 0,
      });
    } else if (avg > tg.caloriesKcal * 1.1 && goal !== 'muscle_gain' && goal !== 'weight_gain') {
      out.push({
        id: 'kcal_above',
        category: 'calories',
        tone: 'tip',
        title: t('Often over your calorie target'),
        body: t(
          "Look for the meal with the biggest portion or the most oil or sugar, and start there. It doesn't have to be perfect every day.",
        ),
        data,
        numeric: true,
        priority: 4,
      });
    } else if (avg < tg.caloriesKcal * 0.9 && (goal === 'muscle_gain' || goal === 'weight_gain')) {
      out.push({
        id: 'kcal_below_gain',
        category: 'calories',
        tone: 'tip',
        title: t('Not eating enough to gain'),
        body: t(
          'Gaining weight means eating more than you burn. Add a snack, or a little more rice, nuts or milk at meals.',
        ),
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
        title: t('Breakfast is rarely logged'),
        body: t(
          "If you usually skip breakfast, that's fine. If you just forget to log it, adding it makes your daily calories more accurate.",
        ),
        data: t('Breakfast on {breakfast} of {length} logged days (last 7 days)', {
          breakfast,
          length: days.length,
        }),
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
    const data = t('Last 14 days: {n} weigh-ins, about {change} kg', {
      n: weighIns,
      change: `${change > 0 ? '+' : ''}${fmt1(change)}`,
    });
    const toward = goal === 'fat_loss' ? change < -0.2 : goal === 'maintain' ? false : change > 0.2;
    if (goal === 'fat_loss' && perWeekPct < -1) {
      out.push({
        id: 'loss_fast',
        category: 'weight',
        tone: 'care',
        title: t('Losing weight quite fast'),
        body: t(
          "Losing more than 1% of body weight a week is hard to keep up and can cost muscle. Check that you're not eating too little.",
        ),
        data,
        numeric: true,
        priority: 1,
      });
    } else if (toward) {
      out.push({
        id: 'trend_toward',
        category: 'weight',
        tone: 'good',
        title: t('Your weight is moving toward your goal'),
        body: t(
          "Over the last two weeks your weight has been going the right way. Keep doing what you're doing.",
        ),
        data,
        numeric: true,
        priority: 7,
      });
    } else if (goal === 'maintain' && Math.abs(change) <= 0.5) {
      out.push({
        id: 'trend_stable',
        category: 'weight',
        tone: 'good',
        title: t('Your weight is steady'),
        body: t("Your weight barely moved in two weeks, so you're eating about what you burn."),
        data,
        numeric: true,
        priority: 7,
      });
    } else if (goal !== 'maintain') {
      out.push({
        id: 'trend_flat',
        category: 'weight',
        tone: 'tip',
        title: t('Little change in the last two weeks'),
        body: t(
          'Water, salt and hormonal cycles all affect weight, so two flat weeks are common. Check your logs are complete before changing anything.',
        ),
        data,
        numeric: true,
        priority: 5,
      });
    }
  }

  // Adjustment suggestion ready.
  const adaptive = adaptiveFor(s, today);
  const kept = s.adaptiveKeptOn.some((d) => d > addDays(today, -14));
  if (adaptive?.ok && tg && adaptive.proposedTargetKcal !== tg.caloriesKcal && !kept) {
    out.push({
      id: 'adjust_ready',
      category: 'adjust',
      tone: 'tip',
      title: t('A new target suggestion is ready'),
      body: t(
        "Based on your recent logs, we worked out a daily target that may suit you better. It's your choice whether to use it.",
      ),
      data: t('Based on {windowDays} days of logs', { windowDays: adaptive.windowDays }),
      action: { label: t('See suggestion'), to: '#adjust' },
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

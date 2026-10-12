import type {
  ActivityLevel,
  FormulaSex,
  Goal,
  PlanClamp,
  PlanWarning,
  RejectReason,
} from '@fittrack/engine';
import type { DietTag, LifestyleMode } from '../data/types';

// Traditional Chinese copy. Moves to packages/i18n when English and Simplified Chinese are added.
// Tone rules: spec 18.4 (friendly, specific, no shaming, estimates labelled).

export const SEX_LABELS: Record<FormulaSex, string> = {
  female: '女性公式',
  male: '男性公式',
  neutral: '中性（两者平均）',
};

export const GOAL_LABELS: Record<Goal, string> = {
  fat_loss: '减脂',
  maintain: '维持体重',
  muscle_gain: '增肌',
  weight_gain: '健康增重',
};

export const ACTIVITY_LABELS: Record<ActivityLevel, { name: string; hint: string }> = {
  sedentary: { name: '久坐', hint: '办公室工作，几乎不运动' },
  light: { name: '轻度', hint: '每周运动 1–3 天，或需要站立的工作' },
  moderate: { name: '中度', hint: '每周运动 3–5 天，或大量走动的工作' },
  very: { name: '高度', hint: '每周运动 6–7 天，或体力劳动工作' },
  extra: { name: '极高', hint: '体力劳动工作，加上每天训练' },
};

export const MODE_LABELS: Record<LifestyleMode, { name: string; hint: string }> = {
  nutrition_first: { name: '暂时不运动', hint: '先从饮食和生活习惯开始' },
  home: { name: '在家运动', hint: '不需要器材' },
  gym: { name: '去 Gym', hint: '使用健身器材' },
  outdoor: { name: '户外活动', hint: '走路、跑步或骑脚车' },
  mixed: { name: '混合模式', hint: '每天按时间灵活安排' },
};

export const DIET_LABELS: Record<DietTag, string> = {
  halal: 'Halal',
  vegetarian: '素食',
  no_beef: '不吃牛肉',
  no_pork: '不吃猪肉',
};

export function clampMessage(clamp: PlanClamp, floorKcal: number): string {
  switch (clamp) {
    case 'deficit_cap':
      return '热量赤字已限制在估算 TDEE 的 25% 以内。';
    case 'calorie_floor':
      return `已提高到安全下限 ${Math.ceil(floorKcal)} kcal（不低于估算 BMR，也不低于 1200 / 1500 kcal）。所选速度实际会较慢。`;
    case 'floor_above_tdee':
      return '安全下限高于你的估算 TDEE，所以暂时以维持热量为目标。建议增加日常活动，或咨询营养师。';
    case 'surplus_cap':
      return '热量盈余已限制在每天 500 kcal 以内。';
    case 'protein_cap':
      return '蛋白质已限制在总热量的 35% 以内。';
    case 'fat_reduced_for_carbs':
      return '为了让碳水化合物不少于 130 g，脂肪比例已调低（不低于 20%）。';
  }
}

export function warningMessage(warning: PlanWarning): string {
  switch (warning) {
    case 'neutral_formula':
      return '中性公式是男女公式的平均值，误差可能比较大。';
    case 'low_carbs':
      return '碳水化合物低于 130 g（成人建议摄取量），建议调整目标。';
  }
}

export function rejectMessage(reason: RejectReason): { title: string; body: string } {
  switch (reason) {
    case 'underweight_fat_loss':
      return {
        title: '目前不建议减脂',
        body: '你的 BMI 低于 18.5。可以改选“维持体重”或“健康增重”。',
      };
    case 'target_weight_underweight':
      return {
        title: '目标体重太低',
        body: '这个目标体重对应的 BMI 低于 18.5，请选择较高的目标。',
      };
    case 'pregnancy_deficit':
      return {
        title: '怀孕或哺乳期间不提供热量赤字',
        body: '这段时间的营养需求不同，请先咨询医生或注册营养师。你仍然可以选择“维持体重”。',
      };
    case 'eating_disorder_deficit':
      return {
        title: '为了你的安全，不提供热量赤字目标',
        body: '如果你需要帮助，请联系医疗专业人员。你仍然可以选择“维持体重”。',
      };
  }
}

export function fieldMessage(field: string): string {
  switch (field) {
    case 'birthDate':
      return '请输入有效的出生日期；年龄需介于 18 至 100 岁。';
    case 'heightCm':
      return '身高需介于 120 至 230 cm。';
    case 'weightKg':
      return '体重需介于 30 至 300 kg。';
    case 'ratePctPerWeek':
      return '请选择每周速度。';
    default:
      return '请检查输入的资料。';
  }
}

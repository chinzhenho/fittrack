import type {
  ActivityLevel,
  FormulaSex,
  Goal,
  PlanClamp,
  PlanWarning,
  RejectReason,
} from '@fittrack/engine';

// Traditional Chinese copy for the phase 0 demo. Moves to packages/i18n in phase 1.
// Tone rules: spec 18.4 (friendly, specific, no shaming, estimates labelled).

export const SEX_LABELS: Record<FormulaSex, string> = {
  female: '女性公式',
  male: '男性公式',
  neutral: '中性（兩者平均）',
};

export const GOAL_LABELS: Record<Goal, string> = {
  fat_loss: '減脂',
  maintain: '維持體重',
  muscle_gain: '增肌',
  weight_gain: '健康增重',
};

export const ACTIVITY_LABELS: Record<ActivityLevel, { name: string; hint: string }> = {
  sedentary: { name: '久坐', hint: '辦公室工作，幾乎不運動' },
  light: { name: '輕度', hint: '每週運動 1–3 天，或需要站立的工作' },
  moderate: { name: '中度', hint: '每週運動 3–5 天，或大量走動的工作' },
  very: { name: '高度', hint: '每週運動 6–7 天，或體力勞動工作' },
  extra: { name: '極高', hint: '體力勞動工作，加上每天訓練' },
};

export function clampMessage(clamp: PlanClamp, floorKcal: number): string {
  switch (clamp) {
    case 'deficit_cap':
      return '熱量赤字已限制在估算 TDEE 的 25% 以內。';
    case 'calorie_floor':
      return `已提高到安全下限 ${Math.ceil(floorKcal)} kcal（不低於估算 BMR，也不低於 1200 / 1500 kcal）。所選速度實際會較慢。`;
    case 'floor_above_tdee':
      return '安全下限高於你的估算 TDEE，所以暫時以維持熱量為目標。建議增加日常活動，或諮詢營養師。';
    case 'surplus_cap':
      return '熱量盈餘已限制在每天 500 kcal 以內。';
    case 'protein_cap':
      return '蛋白質已限制在總熱量的 35% 以內。';
    case 'fat_reduced_for_carbs':
      return '為了讓碳水化合物不少於 130 g，脂肪比例已調低（不低於 20%）。';
  }
}

export function warningMessage(warning: PlanWarning): string {
  switch (warning) {
    case 'neutral_formula':
      return '中性公式是男女公式的平均值，誤差可能比較大。';
    case 'low_carbs':
      return '碳水化合物低於 130 g（成人建議攝取量），建議調整目標。';
  }
}

export function rejectMessage(reason: RejectReason): { title: string; body: string } {
  switch (reason) {
    case 'underweight_fat_loss':
      return {
        title: '目前不建議減脂',
        body: '你的 BMI 低於 18.5。可以改選「維持體重」或「健康增重」。',
      };
    case 'target_weight_underweight':
      return {
        title: '目標體重太低',
        body: '這個目標體重對應的 BMI 低於 18.5，請選擇較高的目標。',
      };
    case 'pregnancy_deficit':
      return {
        title: '懷孕或哺乳期間不提供熱量赤字',
        body: '這段時間的營養需求不同，請先諮詢醫生或註冊營養師。你仍然可以選擇「維持體重」。',
      };
    case 'eating_disorder_deficit':
      return {
        title: '為了你的安全，不提供熱量赤字目標',
        body: '如果你需要支援，請聯絡醫療專業人員。你仍然可以選擇「維持體重」。',
      };
  }
}

export function fieldMessage(field: string): string {
  switch (field) {
    case 'birthDate':
      return '請輸入有效的出生日期；年齡需介於 18 至 100 歲。';
    case 'heightCm':
      return '身高需介於 120 至 230 cm。';
    case 'weightKg':
      return '體重需介於 30 至 300 kg。';
    case 'ratePctPerWeek':
      return '請選擇每週速度。';
    default:
      return '請檢查輸入的資料。';
  }
}

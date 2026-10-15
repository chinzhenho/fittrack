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
  female: 'Female formula',
  male: 'Male formula',
  neutral: 'Neutral (average of both)',
};

export const GOAL_LABELS: Record<Goal, string> = {
  fat_loss: 'Lose fat',
  maintain: 'Maintain weight',
  muscle_gain: 'Build muscle',
  weight_gain: 'Gain weight',
};

export const ACTIVITY_LABELS: Record<ActivityLevel, { name: string; hint: string }> = {
  sedentary: { name: 'Sedentary', hint: 'Desk job, little or no exercise' },
  light: { name: 'Light', hint: 'Exercise 1–3 days a week, or a job on your feet' },
  moderate: { name: 'Moderate', hint: 'Exercise 3–5 days a week, or a job with lots of walking' },
  very: { name: 'Very active', hint: 'Exercise 6–7 days a week, or physical work' },
  extra: { name: 'Extra active', hint: 'Physical work plus daily training' },
};

export const MODE_LABELS: Record<LifestyleMode, { name: string; hint: string }> = {
  nutrition_first: { name: 'No exercise yet', hint: 'Start with food and habits' },
  home: { name: 'Home workouts', hint: 'No equipment needed' },
  gym: { name: 'Gym', hint: 'Using gym equipment' },
  outdoor: { name: 'Outdoors', hint: 'Walking, running or cycling' },
  mixed: { name: 'Mixed', hint: 'Flexible, day by day' },
};

export const DIET_LABELS: Record<DietTag, string> = {
  halal: 'Halal',
  vegetarian: 'Vegetarian',
  no_beef: 'No beef',
  no_pork: 'No pork',
};

export function clampMessage(clamp: PlanClamp, floorKcal: number): string {
  switch (clamp) {
    case 'deficit_cap':
      return 'The calorie deficit is capped at 25% of your estimated TDEE.';
    case 'calorie_floor':
      return `Raised to the safety floor of ${Math.ceil(floorKcal)} kcal (never below your estimated BMR, or 1,200 / 1,500 kcal). Progress will be slower than the pace you chose.`;
    case 'floor_above_tdee':
      return 'Your safety floor is above your estimated TDEE, so the target is maintenance for now. Try adding daily activity, or talk to a dietitian.';
    case 'surplus_cap':
      return 'The calorie surplus is capped at 500 kcal a day.';
    case 'protein_cap':
      return 'Protein is capped at 35% of total calories.';
    case 'fat_reduced_for_carbs':
      return 'Fat was lowered (not below 20%) so carbs stay at 130 g or more.';
  }
}

export function warningMessage(warning: PlanWarning): string {
  switch (warning) {
    case 'neutral_formula':
      return 'The neutral formula averages the male and female versions, so it may be less precise.';
    case 'low_carbs':
      return 'Carbs are below 130 g (the adult recommended intake). Consider adjusting your goal.';
  }
}

export function rejectMessage(reason: RejectReason): { title: string; body: string } {
  switch (reason) {
    case 'underweight_fat_loss':
      return {
        title: 'Fat loss is not recommended right now',
        body: 'Your BMI is below 18.5. You can choose "Maintain weight" or "Gain weight" instead.',
      };
    case 'target_weight_underweight':
      return {
        title: 'Target weight too low',
        body: 'This target weight means a BMI below 18.5. Please choose a higher target.',
      };
    case 'pregnancy_deficit':
      return {
        title: 'No calorie deficit during pregnancy or breastfeeding',
        body: 'Your nutrition needs are different during this time. Please talk to a doctor or registered dietitian first. You can still choose "Maintain weight".',
      };
    case 'eating_disorder_deficit':
      return {
        title: "For your safety, we don't offer a calorie deficit",
        body: 'If you need support, please reach out to a healthcare professional. You can still choose "Maintain weight".',
      };
  }
}

export function fieldMessage(field: string): string {
  switch (field) {
    case 'birthDate':
      return 'Enter a valid date of birth; age must be 18 to 100.';
    case 'heightCm':
      return 'Height must be 120 to 230 cm.';
    case 'weightKg':
      return 'Weight must be 30 to 300 kg.';
    case 'ratePctPerWeek':
      return 'Please choose a weekly pace.';
    default:
      return 'Please check what you entered.';
  }
}

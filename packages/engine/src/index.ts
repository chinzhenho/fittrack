export * from './constants.js';
export { EngineInputError } from './errors.js';
export { roundHalfUp } from './rounding.js';
export { addDays, ageOn, daysBetween, parseLocalDate } from './dates.js';
export {
  bmi,
  bmiCategory,
  katchMcArdle,
  mifflinStJeor,
  netExerciseKcal,
  tdee,
  waistHighRisk,
  type BmiCategory,
  type BodyInput,
} from './energy.js';
export { computeMacros, referenceWeightKg, type MacroInput, type Macros } from './macros.js';
export {
  computePlan,
  type Plan,
  type PlanClamp,
  type PlanInput,
  type PlanResult,
  type PlanWarning,
  type RejectReason,
  type Screening,
} from './plan.js';
export {
  ewmaTrend,
  firstWeightPerDay,
  trendOn,
  weeklyChangePct,
  type DailyWeight,
  type TrendPoint,
  type WeightReading,
} from './trend.js';
export {
  evaluateAdaptive,
  type AdaptiveDay,
  type AdaptiveInput,
  type AdaptiveRefusal,
  type AdaptiveResult,
} from './adaptive.js';

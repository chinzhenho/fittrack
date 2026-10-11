/** Round half up to the nearest `step` (all engine values are non-negative). */
export function roundHalfUp(value: number, step = 1): number {
  return Math.round(value / step) * step;
}

export function ceilTo(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

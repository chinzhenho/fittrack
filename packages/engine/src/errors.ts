/** Thrown when an input is outside the range the engine accepts (spec 5.1). */
export class EngineInputError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = 'EngineInputError';
    this.field = field;
  }
}

export function requireFinite(value: number, field: string): void {
  if (!Number.isFinite(value)) throw new EngineInputError(field, 'must be a finite number');
}

export function requireRange(value: number, min: number, max: number, field: string): void {
  requireFinite(value, field);
  if (value < min || value > max) {
    throw new EngineInputError(field, `must be between ${min} and ${max}, got ${value}`);
  }
}

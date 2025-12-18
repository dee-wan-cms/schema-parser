export function assertString(value: unknown, context: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid parameter name: non-string.`)
  }
}

export function assertNonEmpty(value: string, context: string): void {
  if (value.length === 0) {
    throw new Error(`${context}: cannot be empty`)
  }
}

export function assertArray<T>(value: unknown, context: string): asserts value is T[] {
  if (!Array.isArray(value)) {
    throw new Error(`${context}: must be an array`)
  }
}

export function assertInRange(
  value: number,
  min: number,
  max: number,
  context: string
): void {
  if (value < min || value > max) {
    throw new Error(`${context}: ${value} must be between ${min} and ${max}`)
  }
}

export function assertInteger(value: number, context: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${context}: ${value} must be an integer`)
  }
}

export function assertFinite(value: number, context: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${context}: ${value} must be finite`)
  }
}

export function assertValidArrayIndex(value: number, context: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid array index: ${context}`)
  }
}
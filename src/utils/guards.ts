export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function exists<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (isNullish(value)) return false
  if (typeof value !== 'object') return false
  if (Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

export function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function hasMinLength<T extends { length: number }>(
  value: T,
  min: number
): boolean {
  return value.length >= min
}

export function isEmpty<T extends { length: number }>(value: T): boolean {
  return value.length === 0
}

export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}
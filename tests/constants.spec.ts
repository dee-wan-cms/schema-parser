// tests/constants.spec.ts
import { describe, it, expect } from 'vitest'
import {
  ARRAY_MARKERS,
  FILTER_OPS,
  NUMERIC_KEYWORDS,
  SQL_KEYWORDS,
  DANGEROUS_SQL_KEYWORDS,
  CACHE_TTL,
} from '../src/constants'

describe('constants', () => {
  it('ARRAY_MARKERS is frozen', () => {
    expect(Object.isFrozen(ARRAY_MARKERS)).toBe(true)
    expect(ARRAY_MARKERS).toEqual({ START: '[', END: ']' })
  })

  it('FILTER_OPS contains expected operations', () => {
    expect([...FILTER_OPS]).toEqual(
      expect.arrayContaining(['in', 'notIn', 'has', 'hasSome', 'hasEvery'])
    )
  })

  it('NUMERIC_KEYWORDS contains pagination keywords', () => {
    expect([...NUMERIC_KEYWORDS]).toEqual(
      expect.arrayContaining(['take', 'skip', 'limit', 'offset', 'cursor'])
    )
  })

  it('SQL_KEYWORDS and DANGEROUS_SQL_KEYWORDS are populated', () => {
    expect(SQL_KEYWORDS.size).toBeGreaterThan(10)
    expect(DANGEROUS_SQL_KEYWORDS.has('drop')).toBe(true)
  })

  it('CACHE_TTL has valid bounds', () => {
    expect(Object.isFrozen(CACHE_TTL)).toBe(true)
    expect(CACHE_TTL.MIN).toBe(1)
    expect(CACHE_TTL.MAX).toBe(31536000)
    expect(CACHE_TTL.DEFAULT).toBe(300)
  })
})
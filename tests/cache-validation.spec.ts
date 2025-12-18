import { describe, it, expect } from 'vitest'
import { parseCacheConfig } from '../src/directives'
import { CACHE_TTL } from '../src/constants'

describe('Cache TTL Boundary Conditions', () => {
  it.each([
    [CACHE_TTL.MIN, CACHE_TTL.MIN],
    [CACHE_TTL.MAX, CACHE_TTL.MAX],
    [600, 600],
  ])('accepts valid TTL %d', (ttl, expected) => {
    const result = parseCacheConfig({ ttl }, 300)
    expect(result).toEqual({ enabled: true, ttl: expected })
  })

  it.each([
    CACHE_TTL.MIN - 1,
    CACHE_TTL.MAX + 1,
    0,
    -1,
    -999,
  ])('rejects out-of-range TTL %d, uses default', (ttl) => {
    const result = parseCacheConfig({ ttl }, 300)
    expect(result.ttl).toBe(300)
  })

  it.each([
    1.5,
    1.999,
    0.1,
    Number.EPSILON,
  ])('rejects non-integer TTL %d', (ttl) => {
    const result = parseCacheConfig({ ttl }, 300)
    expect(result.ttl).toBe(300)
  })

  it.each([
    Infinity,
    -Infinity,
    NaN,
  ])('rejects special float value %s', (ttl) => {
    const result = parseCacheConfig({ ttl }, 300)
    expect(result.ttl).toBe(300)
  })

  it('preserves binding when TTL is invalid', () => {
    const result = parseCacheConfig({ ttl: -1, binding: 'CACHE' }, 300)
    expect(result).toEqual({ enabled: true, ttl: 300, binding: 'CACHE' })
  })
})

describe('Default TTL Validation', () => {
  it.each([
    [-1, 'Invalid TTL'],
    [0, 'Invalid TTL'],
    [CACHE_TTL.MAX + 1, 'Invalid TTL'],
    [1.5, 'Invalid TTL'],
    [NaN, 'Invalid TTL'],
  ])('throws for invalid default TTL %d', (defaultTtl, errorMsg) => {
    expect(() => parseCacheConfig(true, defaultTtl)).toThrow(errorMsg)
  })
})
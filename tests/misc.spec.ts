// tests/coverage-gaps.spec.ts
import { describe, it, expect } from 'vitest'
import {
  sanitizeParamName,
  extractParamsFromQuery,
  deduplicateParams,
  isDynamicParameter,
} from '../src/extractors'
import { extractCompleteJson, hasDirectives } from '../src/parser'
import { transformQuery } from '../src/transformer'
import { parseCacheConfig } from '../src/directives'
import {
  assertNonEmpty,
  assertInRange,
  assertValidArrayIndex,
} from '../src/utils/validators'
import { isString } from '../src/utils/guards'
import { hash32 } from '../src/utils/string'
import { secondLastElement } from '../src/utils/array'
import { POST_MODEL } from './fixtures'

describe('extractors edge cases', () => {
  it('handles uppercase SQL keywords embedded in param names', () => {
    const name = 'userSELECTid'
    const result = sanitizeParamName(name)
    expect(result).not.toContain('SELECT')
    expect(result.toLowerCase()).not.toMatch(/select/)
  })

  it('handles keyword collision after full processing chain', () => {
    const tokens = ['param', 'DROP', 'TABLE']
    const joined = tokens.join('_')
    const result = sanitizeParamName(joined)
    expect(result).not.toMatch(/drop.*table/i)
  })

  it('exercises collision loop with multiple hash attempts', () => {
    const base = 'x'
    const raw1 = 'x'
    const raw2 = 'x_collide'
    const raw3 = 'x_another'

    const query = {
      where: {
        a: `$${raw1}`,
        b: `$${raw2}`,
        c: `$${raw3}`,
      },
    } as any

    const result = extractParamsFromQuery(query, POST_MODEL)
    expect(result.params).toHaveLength(3)
    const names = result.params.map((p) => p.name)
    expect(new Set(names).size).toBe(3)
  })

  it('rejects non-array input to deduplicateParams', () => {
    expect(deduplicateParams(null as any)).toEqual([])
    expect(deduplicateParams(undefined as any)).toEqual([])
    expect(deduplicateParams({} as any)).toEqual([])
  })

  it('detects empty __DYNAMIC___ wrapper edge case', () => {
    expect(isDynamicParameter('__DYNAMIC___')).toBe(false)
    expect(isDynamicParameter('__DYNAMIC____')).toBe(true)
  })
})

describe('parser edge cases', () => {
  it('handles non-string input to cleanJsonFromComments via extractCompleteJson', () => {
    expect(extractCompleteJson('')).toBeNull()
    expect(extractCompleteJson(null as any)).toBeNull()
  })

  it('handles escape sequences at string boundaries', () => {
    expect(extractCompleteJson('{ "a": "x\\\\" }')).toBe('{ "a": "x\\\\" }')
    expect(extractCompleteJson('{ "a": "\\\\x" }')).toBe('{ "a": "\\\\x" }')
  })

  it('handles multiple consecutive escapes', () => {
    expect(extractCompleteJson('{ "a": "\\\\\\\\" }')).toBe('{ "a": "\\\\\\\\" }')
  })

  it('handles negative brace count', () => {
    expect(extractCompleteJson('} {')).toBeNull()
  })

  it('handles hasDirectives with null', () => {
    expect(hasDirectives(null as any)).toBe(false)
  })
})

describe('directives edge cases', () => {
  it('handles non-number TTL types', () => {
    const result1 = parseCacheConfig({ ttl: '600' as any }, 300)
    expect(result1.ttl).toBe(300)

    const result2 = parseCacheConfig({ ttl: null as any }, 300)
    expect(result2.ttl).toBe(300)

    const result3 = parseCacheConfig({ ttl: {} as any }, 300)
    expect(result3.ttl).toBe(300)
  })

  it('handles non-plain object cache directive', () => {
    class CacheConfig {
      ttl = 600
    }
    const result = parseCacheConfig(new CacheConfig() as any, 300)
    expect(result.ttl).toBe(300)
  })
})

describe('transformer edge cases', () => {
  it('handles non-string keys in query objects', () => {
    const query = Object.create(null)
    query.where = {}
    query.where[Symbol('test')] = 'value'

    const result = transformQuery(query, POST_MODEL)
    expect(result.errors).toHaveLength(0)
  })
})

describe('validators coverage', () => {
  it('assertNonEmpty throws on empty string', () => {
    expect(() => assertNonEmpty('', 'test')).toThrow('cannot be empty')
  })

  it('assertNonEmpty passes on non-empty string', () => {
    expect(() => assertNonEmpty('x', 'test')).not.toThrow()
  })

  it('assertInRange throws when out of range', () => {
    expect(() => assertInRange(5, 1, 4, 'test')).toThrow('between 1 and 4')
    expect(() => assertInRange(0, 1, 4, 'test')).toThrow('between 1 and 4')
  })

  it('assertInRange passes when in range', () => {
    expect(() => assertInRange(2, 1, 4, 'test')).not.toThrow()
    expect(() => assertInRange(1, 1, 4, 'test')).not.toThrow()
    expect(() => assertInRange(4, 1, 4, 'test')).not.toThrow()
  })

  it('assertValidArrayIndex throws on invalid indices', () => {
    expect(() => assertValidArrayIndex(-1, 'test')).toThrow('Invalid array index')
    expect(() => assertValidArrayIndex(1.5, 'test')).toThrow('Invalid array index')
    expect(() => assertValidArrayIndex(Infinity, 'test')).toThrow('Invalid array index')
  })

  it('assertValidArrayIndex passes on valid indices', () => {
    expect(() => assertValidArrayIndex(0, 'test')).not.toThrow()
    expect(() => assertValidArrayIndex(5, 'test')).not.toThrow()
  })
})

describe('guards coverage', () => {
  it('isString type guard', () => {
    expect(isString('hello')).toBe(true)
    expect(isString('')).toBe(true)
    expect(isString(123)).toBe(false)
    expect(isString(null)).toBe(false)
    expect(isString(undefined)).toBe(false)
    expect(isString({})).toBe(false)
  })
})

describe('string utils coverage', () => {
  it('hash32 throws on non-string input', () => {
    expect(() => hash32(123 as any)).toThrow('Hash input must be string')
    expect(() => hash32(null as any)).toThrow('Hash input must be string')
    expect(() => hash32({} as any)).toThrow('Hash input must be string')
  })
})

describe('array utils coverage', () => {
  it('secondLastElement returns correct element', () => {
    expect(secondLastElement([1, 2, 3])).toBe(2)
    expect(secondLastElement([1, 2])).toBe(1)
    expect(secondLastElement([1])).toBeUndefined()
    expect(secondLastElement([])).toBeUndefined()
  })
})
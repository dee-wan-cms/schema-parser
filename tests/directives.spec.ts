import { describe, it, expect } from 'vitest'
import { processModelDirectives, parseCacheConfig, getDirectiveProps } from '../src/directives'
import { POST_MODEL, MINIMAL_DATAMODEL, withDoc } from './fixtures'
import { CACHE_TTL } from '../src/constants'
import { directive } from './test-helpers'

describe('Cache Config', () => {
  const configs: [any, number, any][] = [
    [undefined, 300, { enabled: true, ttl: 300 }],
    [true, 450, { enabled: true, ttl: 450 }],
    [false, 300, { enabled: false }],
    [{ ttl: 600 }, 300, { enabled: true, ttl: 600 }],
    [{ ttl: 600, binding: 'X' }, 300, { enabled: true, ttl: 600, binding: 'X' }],
  ]

  it.each(configs)('parseCacheConfig(%j, %d) -> %j', (input, defaultTtl, expected) => {
    expect(parseCacheConfig(input, defaultTtl)).toEqual(expected)
  })

  it.each([
    [{ ttl: -1 }, 300],
    [{ ttl: 0 }, 300],
    [{ ttl: 1.5 }, 300],
    [{ ttl: Infinity }, 300],
    [{ ttl: NaN }, 300],
  ])('falls back to default for invalid: %j', (input, expected) => {
    expect(parseCacheConfig(input, 300).ttl).toBe(expected)
  })

  it.each([-1, 0, CACHE_TTL.MAX + 1, 1.5, NaN])('throws for invalid default: %d', (ttl) => {
    expect(() => parseCacheConfig(true, ttl)).toThrow('Invalid TTL')
  })
})

describe('Directive Processing', () => {
  it('parses complete directive', () => {
    const doc = directive('test', { where: { status: '$status' } }, { ttl: 600 })
    const { directives } = processModelDirectives(withDoc(POST_MODEL, doc), MINIMAL_DATAMODEL)

    expect(directives).toHaveLength(1)
    expect(directives[0]).toMatchObject({
      header: 'test',
      modelName: 'Post',
      cache: { enabled: true, ttl: 600 },
    })
    expect(directives[0].parameters.all).toHaveLength(1)
  })

  it('maintains parameter order and deduplication', () => {
    const ordered = directive('test', {
      where: { status: '$a', views: { gte: '$b' }, authorId: '$c' },
    })
    const { directives } = processModelDirectives(withDoc(POST_MODEL, ordered), MINIMAL_DATAMODEL)
    expect(directives[0].query.dynamicKeys).toEqual(['a', 'b', 'c'])
    expect(directives[0].parameters.all.map((p) => p.position)).toEqual([1, 2, 3])

    const dedup = directive('test', { where: { status: '$x', OR: [{ status: '$x' }] } })
    const dedupResult = processModelDirectives(withDoc(POST_MODEL, dedup), MINIMAL_DATAMODEL)
    expect(dedupResult.directives[0].parameters.all).toHaveLength(1)
  })

  it('processes multiple directives and handles errors', () => {
    const multi = `
      ${directive('a', { where: { status: 'x' } })}
      ${directive('b', { where: { status: 'y' } })}
    `
    const { directives } = processModelDirectives(withDoc(POST_MODEL, multi), MINIMAL_DATAMODEL)
    expect(directives.map((d) => d.header)).toEqual(['a', 'b'])

    const invalid = `
      @optimize { invalid json }
      ${directive('valid', { where: { status: 'x' } })}
    `
    const result = processModelDirectives(withDoc(POST_MODEL, invalid), MINIMAL_DATAMODEL)
    expect(result.directives).toHaveLength(1)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('validates fields and tracks caching', () => {
    const bad = directive('test', { where: { nonExistent: 'x' } })
    const result = processModelDirectives(withDoc(POST_MODEL, bad), MINIMAL_DATAMODEL)
    expect(result.directives).toHaveLength(0)
    expect(result.errors.some((e) => e.message.includes('nonExistent'))).toBe(true)

    const cached = `
      ${directive('cached', { where: {} }, true)}
      ${directive('uncached', { where: {} }, false)}
    `
    expect(processModelDirectives(withDoc(POST_MODEL, cached), MINIMAL_DATAMODEL).hasCaching).toBe(true)
  })

  it('preserves context', () => {
    const doc = directive('test', { where: { status: 'x' } })
    const { directives } = processModelDirectives(withDoc(POST_MODEL, doc), MINIMAL_DATAMODEL)
    expect(directives[0].context.model.name).toBe('Post')
    expect(directives[0].context.allModels).toHaveLength(1)
  })
})

describe('getDirectiveProps', () => {
  it('is a convenience wrapper', () => {
    const doc = directive('x', { where: { status: 'y' } })
    const props = getDirectiveProps(withDoc(POST_MODEL, doc), MINIMAL_DATAMODEL)
    expect(props).toHaveLength(1)
    expect(props[0].header).toBe('x')
  })
})
import { describe, it, expect } from 'vitest'
import { processAllDirectives, processModelDirectives, parseCacheConfig } from '../src/directives'
import { BLOG_DATAMODEL, POST_MODEL, USER_MODEL, withDoc } from './fixtures'

describe('directives pipeline branches', () => {
  it('processAllDirectives returns only models with directives or errors', () => {
    const doc = `@optimize {"header":"x","query":{"where":{"status":"active"}}}`
    const models = [
      withDoc(POST_MODEL, doc),
      withDoc(USER_MODEL, ''),
    ]

    const results = processAllDirectives(models as any, BLOG_DATAMODEL as any)

    expect(results.size).toBe(1)
    expect(results.has('Post')).toBe(true)
    expect(results.has('User')).toBe(false)
  })

  it('throws when skipInvalid is false and directive has validation errors', () => {
    const doc = `@optimize {"header":"bad","query":{"where":{"nonExistent":"x"}}}`
    expect(() =>
      processModelDirectives(withDoc(POST_MODEL, doc), BLOG_DATAMODEL as any, {
        skipInvalid: false,
      }),
    ).toThrow()
  })

  it('preserves binding even when ttl is missing/invalid and falls back to default', () => {
    const result = parseCacheConfig({ binding: 'CACHE' } as any, 300)
    expect(result).toEqual({ enabled: true, ttl: 300, binding: 'CACHE' })
  })
})

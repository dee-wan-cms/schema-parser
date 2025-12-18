import { describe, it, expect } from 'vitest'
import { sanitizeParamName } from '../src/extractors'
import { testDirective, expectSafe } from './test-helpers'
import { POST_MODEL, MINIMAL_DATAMODEL } from './fixtures'

describe('SQL Injection Prevention', () => {
  const maliciousCases = [
    'DROP TABLE users',
    "'; DROP TABLE users--",
    '1 OR 1=1',
    'SELECT * FROM',
    "admin'--",
    "1' UNION SELECT NULL--",
    '../../../etc/passwd',
    '<script>alert(1)</script>',
  ]

  it.each(maliciousCases)('sanitizes "%s"', (malicious) => {
    const out = sanitizeParamName(malicious)
    expectSafe(out)
  })

  it.each(['DROP_TABLE_users', 'SELECT_FROM_users', 'DELETE_FROM_table'])(
    'strips embedded keywords: %s',
    (input) => {
      const result = sanitizeParamName(input)
      expect(result.toLowerCase()).not.toMatch(/\b(drop|select|delete|table|from|where)\b/)
    }
  )

  it('handles edge cases', () => {
    const a = sanitizeParamName('DROP')
    const b = sanitizeParamName('DROP')
    expect(a).toBe(b)
    expectSafe(a)

    expect(sanitizeParamName('a'.repeat(1000)).length).toBeLessThanOrEqual(64)
    expect(sanitizeParamName('user😀name')).toBe('username')
    expect(sanitizeParamName('用户名')).toMatch(/^param_/)
  })

  it('prevents injection in directives', () => {
    const doc = `@optimize {"header":"t","query":{"where":{"status":"$DROP_TABLE"}}}`
    const result = testDirective(POST_MODEL, MINIMAL_DATAMODEL, doc)
    const param = result.directives[0]?.parameters.all[0]
    expect(param?.name).not.toContain('DROP')
    expect(param?.name).toBeDefined()
  })
})

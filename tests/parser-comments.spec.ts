import { describe, it, expect } from 'vitest'
import { parseDirectives } from '../src/parser'

describe('parser comment-cleaning', () => {
  it('parses directive JSON where lines are prefixed with ///', () => {
    const documentation = `
@optimize {
/// "header": "ok",
/// "query": { "where": { "status": "active" } }
}
    `
    const { directives, errors } = parseDirectives(documentation)
    expect(errors).toHaveLength(0)
    expect(directives).toHaveLength(1)
    expect(directives[0]).toMatchObject({
      header: 'ok',
      query: { where: { status: 'active' } },
    })
  })
})
 
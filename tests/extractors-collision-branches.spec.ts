import { describe, it, expect } from 'vitest'
import { isDynamicParameter, extractParamsFromQuery } from '../src/extractors'
import { POST_MODEL } from './fixtures'

function hash32(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) ^ input.charCodeAt(i)
  }
  return (h >>> 0).toString(36)
}

describe('extractors collision and marker branches', () => {
  it('treats empty __DYNAMIC___ wrapper as not dynamic', () => {
    expect(isDynamicParameter('__DYNAMIC___')).toBe(false)
  })

  it('avoids sanitized-name collision and exercises the fallback loop', () => {
    const raw2 = 'userid'
    const suffix = hash32(raw2.toLowerCase()).slice(0, 6)
    const candidate = `userid_${suffix}`

    const query: any = {
      where: {
        a: `$${candidate}`,
        b: '$user-id',
        c: `$${raw2}`,
      },
    }

    const out = extractParamsFromQuery(query, POST_MODEL)

    expect(out.params).toHaveLength(3)

    const names = out.params.map((p) => p.name)
    expect(names).toContain(candidate)
    expect(names).toContain('userid')

    const last = out.params.find((p) => p.originalName === raw2)
    expect(last).toBeDefined()
    expect(last?.name).not.toBe('userid')
    expect(last?.name).not.toBe(candidate)
  })
})

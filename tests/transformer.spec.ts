import { describe, it, expect } from 'vitest'
import { transformQuery, processQuery } from '../src/transformer'
import { POST_MODEL } from './fixtures'

describe('transformQuery', () => {
  it('transforms dynamic params to internal markers', () => {
    const result = transformQuery(
      { where: { status: '$status' } },
      POST_MODEL
    )

    expect(result.processed.where).toHaveProperty('status', '__DYNAMIC_status__')
    expect(result.dynamicKeys).toEqual(['status'])
  })

  it('preserves static values', () => {
    const result = transformQuery(
      { where: { status: 'active', views: 100 } },
      POST_MODEL
    )

    expect(result.processed.where).toEqual({ status: 'active', views: 100 })
    expect(result.staticValues).toContain('active')
    expect(result.staticValues).toContain(100)
  })

  it('validates field existence at top-level where', () => {
    const result = transformQuery(
      { where: { nonExistent: 'x' } },
      POST_MODEL
    )

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('nonExistent')
  })

  it('validates field existence under nested logical operators', () => {
    const result = transformQuery(
      { where: { OR: [{ nonExistent: 'x' }] } },
      POST_MODEL
    )

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('nonExistent')
  })

  it('allows logical operators AND/OR/NOT', () => {
    const result = transformQuery(
      { where: { AND: [{ status: 'x' }], OR: [{ views: 1 }], NOT: { published: false } } },
      POST_MODEL
    )

    expect(result.errors).toHaveLength(0)
  })

  it('handles deeply nested structures', () => {
    const result = transformQuery(
      {
        where: {
          AND: [
            { status: '$a' },
            { OR: [{ views: { gte: '$b' } }, { published: '$c' }] },
          ],
        },
      },
      POST_MODEL
    )

    expect(result.dynamicKeys).toEqual(['a', 'b', 'c'])
    expect(result.parameters.map((p) => p.position)).toEqual([1, 2, 3])
  })
})

describe('processQuery', () => {
  it('returns ProcessedQuery with original and processed', () => {
    const query = { where: { status: '$s' } }
    const { result, errors } = processQuery(query, POST_MODEL)

    expect(result.original).toEqual(query)
    expect(result.processed.where).toHaveProperty('status', '__DYNAMIC_s__')
    expect(errors).toHaveLength(0)
  })
})

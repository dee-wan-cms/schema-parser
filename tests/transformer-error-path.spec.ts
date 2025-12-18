import { describe, it, expect } from 'vitest'
import { transformQuery } from '../src/transformer'
import { POST_MODEL } from './fixtures'

describe('transformer error-path coverage', () => {
  it('returns an error when extractors throw and does not crash', () => {
    const query: any = { where: new Date() }
    const result = transformQuery(query, POST_MODEL)

    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.processed).toEqual(query)
    expect(result.parameters).toEqual([])
    expect(result.dynamicKeys).toEqual([])
    expect(result.staticValues).toEqual([])
  })
})

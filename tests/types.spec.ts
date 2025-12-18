import { describe, it, expect } from 'vitest'
import { validateParamMap } from '../src/types'

describe('validateParamMap', () => {
  it.each([
    [{ index: 1, dynamicName: 'x' }],
    [{ index: 1, value: 'static' }],
    [{ index: 99, dynamicName: 'y' }],
  ])('accepts valid: %j', (mapping) => {
    expect(() => validateParamMap(mapping)).not.toThrow()
  })

  it.each([
    [{ index: 0, dynamicName: 'x' }, 'integer >= 1'],
    [{ index: -1, dynamicName: 'x' }, 'integer >= 1'],
    [{ index: 1.5, dynamicName: 'x' }, 'integer >= 1'],
    [{ index: 1, dynamicName: 'x', value: 'y' }, 'both'],
    [{ index: 1 }, 'neither'],
  ])('rejects invalid: %j (error contains "%s")', (mapping, errorMsg) => {
    expect(() => validateParamMap(mapping)).toThrow(errorMsg)
  })
})
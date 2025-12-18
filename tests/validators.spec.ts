// tests/validators.spec.ts
import { describe, it, expect } from 'vitest'
import {
  assertString,
  assertNonEmpty,
  assertArray,
  assertInRange,
  assertInteger,
  assertFinite,
  assertValidArrayIndex,
} from '../src/utils/validators'

describe('assertString', () => {
  it('passes for valid strings', () => {
    expect(() => assertString('hello', 'test')).not.toThrow()
    expect(() => assertString('', 'test')).not.toThrow()
    expect(() => assertString('123', 'test')).not.toThrow()
  })

  it('throws for non-strings', () => {
    expect(() => assertString(123, 'test')).toThrow('Invalid parameter name: non-string')
    expect(() => assertString(null, 'test')).toThrow('Invalid parameter name: non-string')
    expect(() => assertString(undefined, 'test')).toThrow('Invalid parameter name: non-string')
    expect(() => assertString({}, 'test')).toThrow('Invalid parameter name: non-string')
    expect(() => assertString([], 'test')).toThrow('Invalid parameter name: non-string')
    expect(() => assertString(true, 'test')).toThrow('Invalid parameter name: non-string')
  })

  it('uses type assertion correctly', () => {
    const value: unknown = 'test'
    assertString(value, 'ctx')
    const result: string = value
    expect(result).toBe('test')
  })
})

describe('assertNonEmpty', () => {
  it('passes for non-empty strings', () => {
    expect(() => assertNonEmpty('a', 'field')).not.toThrow()
    expect(() => assertNonEmpty('hello', 'field')).not.toThrow()
    expect(() => assertNonEmpty(' ', 'field')).not.toThrow()
  })

  it('throws for empty strings', () => {
    expect(() => assertNonEmpty('', 'field')).toThrow('field: cannot be empty')
    expect(() => assertNonEmpty('', 'parameter')).toThrow('parameter: cannot be empty')
  })
})

describe('assertArray', () => {
  it('passes for arrays', () => {
    expect(() => assertArray([], 'test')).not.toThrow()
    expect(() => assertArray([1, 2, 3], 'test')).not.toThrow()
    expect(() => assertArray(['a', 'b'], 'test')).not.toThrow()
    expect(() => assertArray([null, undefined], 'test')).not.toThrow()
  })

  it('throws for non-arrays', () => {
    expect(() => assertArray('not array', 'field')).toThrow('field: must be an array')
    expect(() => assertArray(123, 'field')).toThrow('field: must be an array')
    expect(() => assertArray({}, 'field')).toThrow('field: must be an array')
    expect(() => assertArray(null, 'field')).toThrow('field: must be an array')
    expect(() => assertArray(undefined, 'field')).toThrow('field: must be an array')
  })

  it('uses type assertion correctly', () => {
    const value: unknown = [1, 2, 3]
    assertArray<number>(value, 'ctx')
    const result: number[] = value
    expect(result).toEqual([1, 2, 3])
  })
})

describe('assertInRange', () => {
  it('passes for values in range', () => {
    expect(() => assertInRange(5, 1, 10, 'value')).not.toThrow()
    expect(() => assertInRange(1, 1, 10, 'value')).not.toThrow()
    expect(() => assertInRange(10, 1, 10, 'value')).not.toThrow()
    expect(() => assertInRange(0, -10, 10, 'value')).not.toThrow()
  })

  it('throws for values below range', () => {
    expect(() => assertInRange(0, 1, 10, 'value')).toThrow('value: 0 must be between 1 and 10')
    expect(() => assertInRange(-5, 1, 10, 'value')).toThrow('value: -5 must be between 1 and 10')
  })

  it('throws for values above range', () => {
    expect(() => assertInRange(11, 1, 10, 'value')).toThrow('value: 11 must be between 1 and 10')
    expect(() => assertInRange(100, 1, 10, 'value')).toThrow('value: 100 must be between 1 and 10')
  })

  it('handles edge cases', () => {
    expect(() => assertInRange(0.5, 0, 1, 'decimal')).not.toThrow()
    expect(() => assertInRange(-0, 0, 1, 'negative-zero')).not.toThrow()
  })

  it('includes context in error message', () => {
    expect(() => assertInRange(15, 1, 10, 'TTL')).toThrow('TTL: 15 must be between 1 and 10')
    expect(() => assertInRange(-1, 0, 100, 'age')).toThrow('age: -1 must be between 0 and 100')
  })
})

describe('assertInteger', () => {
  it('passes for integers', () => {
    expect(() => assertInteger(0, 'value')).not.toThrow()
    expect(() => assertInteger(1, 'value')).not.toThrow()
    expect(() => assertInteger(-1, 'value')).not.toThrow()
    expect(() => assertInteger(999999, 'value')).not.toThrow()
  })

  it('throws for non-integers', () => {
    expect(() => assertInteger(1.5, 'value')).toThrow('value: 1.5 must be an integer')
    expect(() => assertInteger(0.1, 'value')).toThrow('value: 0.1 must be an integer')
    expect(() => assertInteger(99.99, 'value')).toThrow('value: 99.99 must be an integer')
  })

  it('throws for special numeric values', () => {
    expect(() => assertInteger(Infinity, 'value')).toThrow('value: Infinity must be an integer')
    expect(() => assertInteger(-Infinity, 'value')).toThrow('value: -Infinity must be an integer')
    expect(() => assertInteger(NaN, 'value')).toThrow('value: NaN must be an integer')
  })

  it('includes context in error message', () => {
    expect(() => assertInteger(1.5, 'TTL')).toThrow('TTL: 1.5 must be an integer')
    expect(() => assertInteger(2.7, 'count')).toThrow('count: 2.7 must be an integer')
  })
})

describe('assertFinite', () => {
  it('passes for finite numbers', () => {
    expect(() => assertFinite(0, 'value')).not.toThrow()
    expect(() => assertFinite(1.5, 'value')).not.toThrow()
    expect(() => assertFinite(-999.99, 'value')).not.toThrow()
    expect(() => assertFinite(Number.MAX_SAFE_INTEGER, 'value')).not.toThrow()
    expect(() => assertFinite(Number.MIN_SAFE_INTEGER, 'value')).not.toThrow()
  })

  it('throws for Infinity', () => {
    expect(() => assertFinite(Infinity, 'value')).toThrow('value: Infinity must be finite')
    expect(() => assertFinite(-Infinity, 'value')).toThrow('value: -Infinity must be finite')
  })

  it('throws for NaN', () => {
    expect(() => assertFinite(NaN, 'value')).toThrow('value: NaN must be finite')
  })

  it('includes context in error message', () => {
    expect(() => assertFinite(Infinity, 'TTL')).toThrow('TTL: Infinity must be finite')
    expect(() => assertFinite(NaN, 'count')).toThrow('count: NaN must be finite')
  })
})

describe('assertValidArrayIndex', () => {
  it('passes for valid indices', () => {
    expect(() => assertValidArrayIndex(0, 'index')).not.toThrow()
    expect(() => assertValidArrayIndex(1, 'index')).not.toThrow()
    expect(() => assertValidArrayIndex(999, 'index')).not.toThrow()
    expect(() => assertValidArrayIndex(Number.MAX_SAFE_INTEGER, 'index')).not.toThrow()
  })

  it('throws for negative indices', () => {
    expect(() => assertValidArrayIndex(-1, 'index')).toThrow('Invalid array index: index')
    expect(() => assertValidArrayIndex(-999, 'index')).toThrow('Invalid array index: index')
  })

  it('throws for non-integers', () => {
    expect(() => assertValidArrayIndex(1.5, 'index')).toThrow('Invalid array index: index')
    expect(() => assertValidArrayIndex(0.1, 'index')).toThrow('Invalid array index: index')
  })

  it('throws for non-finite values', () => {
    expect(() => assertValidArrayIndex(Infinity, 'index')).toThrow('Invalid array index: index')
    expect(() => assertValidArrayIndex(-Infinity, 'index')).toThrow('Invalid array index: index')
    expect(() => assertValidArrayIndex(NaN, 'index')).toThrow('Invalid array index: index')
  })

  it('includes context in error message', () => {
    expect(() => assertValidArrayIndex(-1, 'arr[0]')).toThrow('Invalid array index: arr[0]')
    expect(() => assertValidArrayIndex(1.5, 'position')).toThrow('Invalid array index: position')
  })
})

describe('validators integration', () => {
  it('can chain validators for complex validation', () => {
    const validateTTL = (value: unknown, context: string) => {
      assertFinite(value as number, context)
      assertInteger(value as number, context)
      assertInRange(value as number, 1, 31536000, context)
    }

    expect(() => validateTTL(300, 'TTL')).not.toThrow()
    expect(() => validateTTL(1.5, 'TTL')).toThrow('must be an integer')
    expect(() => validateTTL(0, 'TTL')).toThrow('must be between')
    expect(() => validateTTL(Infinity, 'TTL')).toThrow('must be finite')
  })

  it('validates array elements', () => {
    const validateArrayOfStrings = (value: unknown, context: string) => {
      assertArray<string>(value, context)
      const arr = value as string[]
      arr.forEach((item, i) => {
        assertString(item, `${context}[${i}]`)
        assertNonEmpty(item, `${context}[${i}]`)
      })
    }

    expect(() => validateArrayOfStrings(['a', 'b'], 'items')).not.toThrow()
    expect(() => validateArrayOfStrings(['a', ''], 'items')).toThrow('items[1]: cannot be empty')
    expect(() => validateArrayOfStrings('not array', 'items')).toThrow('must be an array')
  })

  it('validates parameter indices', () => {
    const validateParamIndex = (value: unknown, context: string) => {
      assertFinite(value as number, context)
      assertValidArrayIndex(value as number, context)
    }

    expect(() => validateParamIndex(0, 'param')).not.toThrow()
    expect(() => validateParamIndex(5, 'param')).not.toThrow()
    expect(() => validateParamIndex(-1, 'param')).toThrow('Invalid array index')
    expect(() => validateParamIndex(Infinity, 'param')).toThrow('must be finite')
  })
})

describe('validator error messages', () => {
  it('provides clear error messages for debugging', () => {
    try {
      assertInRange(150, 1, 100, 'cache TTL')
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe('cache TTL: 150 must be between 1 and 100')
    }

    try {
      assertInteger(1.5, 'position')
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe('position: 1.5 must be an integer')
    }
  })

  it('includes value in error message when relevant', () => {
    expect(() => assertInteger(3.14, 'pi')).toThrow('pi: 3.14 must be an integer')
    expect(() => assertInRange(200, 1, 100, 'percent')).toThrow('percent: 200 must be between 1 and 100')
  })
})
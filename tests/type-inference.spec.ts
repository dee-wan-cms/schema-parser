import { describe, it, expect } from 'vitest'
import { inferParameterType } from '../src/extractors'
import { POST_MODEL } from './fixtures'

describe('Type Inference Edge Cases', () => {
  it('infers number for comparison operators', () => {
    const paths = [
      ['where', 'views', 'gt'],
      ['where', 'views', 'gte'],
      ['where', 'views', 'lt'],
      ['where', 'views', 'lte'],
    ]
    paths.forEach(path => {
      expect(inferParameterType(path, POST_MODEL)).toBe('number')
    })
  })

  it('infers boolean for flag-like fields', () => {
    const paths = [
      ['where', 'isActive'],
      ['where', 'hasAccess'],
      ['where', 'enabled'],
    ]
    paths.forEach(path => {
      expect(inferParameterType(path, POST_MODEL)).toBe('boolean')
    })
  })

  it('infers string for unknown fields', () => {
    expect(inferParameterType(['where', 'unknownField'], POST_MODEL)).toBe('string')
  })

  it('handles empty path', () => {
    expect(inferParameterType([], POST_MODEL)).toBe('string')
  })

  it('handles path with only operators', () => {
    expect(inferParameterType(['in', 'notIn'], POST_MODEL)).toBe('string')
  })

  it('infers from field name patterns', () => {
    expect(inferParameterType(['where', 'userId'], POST_MODEL)).toBe('number')
    expect(inferParameterType(['where', 'postCount'], POST_MODEL)).toBe('number')
    expect(inferParameterType(['where', 'userAge'], POST_MODEL)).toBe('number')
  })
})
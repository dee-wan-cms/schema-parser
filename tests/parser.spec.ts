import { describe, it, expect } from 'vitest'
import {
  extractCompleteJson,
  extractDirectives,
  parseDirectiveJson,
  parseDirectives,
  hasDirectives,
} from '../src/parser'

describe('JSON Extraction', () => {
  const validCases: [string, string][] = [
    ['{ "a": 1 }', '{ "a": 1 }'],
    ['{ "a": { "b": 2 } }', '{ "a": { "b": 2 } }'],
    ['{ "a": "{ b }" }', '{ "a": "{ b }" }'],
    ['{ "a": "\\"x\\"" }', '{ "a": "\\"x\\"" }'],
    ['{ "arr": [1,2] } extra', '{ "arr": [1,2] }'],
    ['{ "path": "C:\\\\Users\\\\file" }', '{ "path": "C:\\\\Users\\\\file" }'],
    ['{ "a": "{\\"b\\": \\"c\\"}" }', '{ "a": "{\\"b\\": \\"c\\"}" }'],
  ]

  it.each(validCases)('extracts complete JSON: %s', (input, expected) => {
    expect(extractCompleteJson(input)).toBe(expected)
  })

  it.each([
    ['{ "a": 1', null],
    ['{ "a":', null],
    ['{"unclosed', null],
    ['{ "a": "\\', null],
    ['}{', null],
    ['{ }}}', '{ }'],
  ])('handles malformed: %s -> %s', (input, expected) => {
    expect(extractCompleteJson(input)).toBe(expected)
  })

  it('handles deep nesting', () => {
    const nested = '{ "a": ' + '{ "b": '.repeat(100) + 'null' + ' }'.repeat(101)
    expect(extractCompleteJson(nested)).not.toBeNull()
  })
})

describe('Directive Extraction', () => {
  it('extracts directives at various positions', () => {
    expect(extractDirectives('@optimize { "header": "x", "query": {} }')).toHaveLength(1)
    expect(extractDirectives('text\n@optimize { "header": "x", "query": {} }')).toHaveLength(1)
    expect(extractDirectives('@optimize {"header":"a","query":{}} @optimize {"header":"b","query":{}}')).toHaveLength(2)
  })

  it.each([
    [undefined, []],
    ['', []],
    ['no directives', []],
    ['@optimize no json', []],
    ['@optimize { incomplete', []],
  ])('returns empty for invalid: %s', (input, expected) => {
    expect(extractDirectives(input)).toEqual(expected)
  })

  it('tracks line numbers', () => {
    expect(extractDirectives('line1\n@optimize { "header": "x", "query": {} }')[0].line).toBe(2)
  })
})

describe('Directive Validation', () => {
  const invalidCases: [string, string][] = [
    ['{ "query": {} }', 'header'],
    ['{ "header": "   ", "query": {} }', 'empty'],
    ['{ "header": "x" }', 'query'],
    ['{ "header": 123, "query": {} }', 'invalid'],
    ['{ "header": null, "query": {} }', 'invalid'],
    ['{ "header": "x", "query": "string" }', 'invalid'],
    ['{ invalid }', 'JSON'],
  ]

  it.each(invalidCases)('rejects: %s (mentions "%s")', (input, keyword) => {
    const result = parseDirectiveJson(input)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.message.toLowerCase()).toContain(keyword.toLowerCase())
  })

  it('accepts valid formats', () => {
    const valid = parseDirectiveJson('{ "header": "test", "query": { "where": {} } }')
    expect(valid.success).toBe(true)
    
    const withArgs = parseDirectiveJson('{ "header": "x", "args": { "a": 1 } }')
    expect(withArgs.success).toBe(true)
    if (withArgs.success) expect(withArgs.data.query).toEqual({ a: 1 })
  })

  it('collects errors separately', () => {
    const { directives, errors } = parseDirectives(`
      @optimize { invalid }
      @optimize { "header": "ok", "query": {} }
    `)
    expect(directives).toHaveLength(1)
    expect(errors).toHaveLength(1)
  })
})

describe('hasDirectives', () => {
  it.each([
    ['@optimize {}', true],
    ['text @optimize here', true],
    ['no directive', false],
    ['', false],
    [undefined, false],
  ])('%s -> %s', (input, expected) => {
    expect(hasDirectives(input)).toBe(expected)
  })
})
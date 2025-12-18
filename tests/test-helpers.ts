import { expect } from 'vitest'
import type { DMMF } from '@prisma/generator-helper'
import { processModelDirectives } from '../src/directives'
import type { MINIMAL_DATAMODEL, POST_MODEL } from './fixtures'

export const directive = (header: string, query: object, cache?: unknown) =>
  `@optimize ${JSON.stringify({ header, query, cache })}`

export const testDirective = (
  model: typeof POST_MODEL,
  datamodel: typeof MINIMAL_DATAMODEL,
  doc: string,
  config = {}
) => processModelDirectives({ ...model, documentation: doc }, datamodel, config)

export const expectSafe = (value: string) => {
  expect(value).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
  expect(value).not.toMatch(/drop|select|delete|update|insert|union|exec|truncate/i)
  expect(value).not.toContain(';')
  expect(value).not.toContain('--')
  expect(value).not.toContain('<')
  expect(value).not.toContain('>')
}

export const expectPath = (obj: any, path: string[], expected: any) => {
  expect(extractParamValue(obj, path)).toBe(expected)
}

import { extractParamValue } from '../src/extractors'
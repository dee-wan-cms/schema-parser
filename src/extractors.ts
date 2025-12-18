import type { DMMF } from '@prisma/generator-helper'
import {
  ARRAY_MARKERS,
  FILTER_OPS,
  NUMERIC_KEYWORDS,
  SQL_KEYWORDS,
  DANGEROUS_SQL_KEYWORDS,
} from './constants'
import type {
  ExtractedParams,
  ParameterDefinition,
  InputSchema,
  ParameterSet,
} from './types'
import { 
  isNonEmptyString, 
  isPlainObject, 
  exists, 
  isNullish,
  isEmpty,
  hasMinLength 
} from './utils/guards'
import { assertArray, assertString, assertFinite, assertInteger } from './utils/validators'
import { 
  hash32, 
  sanitizeAlphanumeric, 
  removeLeadingTrailingUnderscores, 
  collapseUnderscores,
  startsWithDigit,
  trimAndCheck
} from './utils/string'
import { lastElement, deduplicateBy } from './utils/array'

export const DYNAMIC_MARKERS = Object.freeze({
  PREFIX: '__DYNAMIC_',
  SUFFIX: '__',
  PARAM_PREFIX: '$',
} as const)

const MIN_ARRAY_MARKER_LENGTH = 3
const MIN_DYNAMIC_PARAM_LENGTH = 2
const MAX_PARAM_NAME_LENGTH = 64
const HASH_SUFFIX_LENGTH = 6

const ALL_SQL_KEYWORDS: ReadonlySet<string> = new Set([
  ...Array.from(SQL_KEYWORDS),
  ...Array.from(DANGEROUS_SQL_KEYWORDS),
])

const UNSAFE_KEYS: ReadonlySet<string> = new Set([
  '__proto__',
  'prototype',
  'constructor',
])

function isUnsafeKey(key: string): boolean {
  return UNSAFE_KEYS.has(key)
}

export function isArrayMarker(segment: string): boolean {
  return isNonEmptyString(segment)
    && hasMinLength(segment, MIN_ARRAY_MARKER_LENGTH)
    && segment.startsWith(ARRAY_MARKERS.START)
    && segment.endsWith(ARRAY_MARKERS.END)
}

export function isDynamicParameter(value: unknown): boolean {
  if (!isNonEmptyString(value)) return false

  const startsWithPrefix = value.startsWith(DYNAMIC_MARKERS.PARAM_PREFIX)
  if (startsWithPrefix) {
    return hasMinLength(value, MIN_DYNAMIC_PARAM_LENGTH)
  }

  const hasDynamicWrapper = 
    value.startsWith(DYNAMIC_MARKERS.PREFIX) && 
    value.endsWith(DYNAMIC_MARKERS.SUFFIX)
    
  if (hasDynamicWrapper) {
    const innerLength = value.length - 
      DYNAMIC_MARKERS.PREFIX.length - 
      DYNAMIC_MARKERS.SUFFIX.length
    return innerLength > 0
  }

  return false
}

function stripUppercaseKeywordEmbeds(token: string): string {
  let out = token
  for (const kw of ALL_SQL_KEYWORDS) {
    const upper = kw.toUpperCase()
    if (out.includes(upper)) {
      out = out.split(upper).join('')
    }
  }
  return out
}

function keywordSafeFallback(originalLower: string): string {
  const suffix = hash32(originalLower).slice(0, HASH_SUFFIX_LENGTH)
  return `param_${suffix}`
}

export function sanitizeParamName(name: string): string {
  assertString(name, 'Parameter name')
  
  const { trimmed, hasContent } = trimAndCheck(name)
  if (!hasContent) {
    throw new Error('Invalid parameter name: empty.')
  }

  const alnum = sanitizeAlphanumeric(trimmed)
  const originalLower = trimmed.toLowerCase()
  const alnumLower = alnum.toLowerCase()

  if (ALL_SQL_KEYWORDS.has(originalLower) || ALL_SQL_KEYWORDS.has(alnumLower)) {
    return keywordSafeFallback(originalLower)
  }

  const tokens = alnum
    .split('_')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => {
      const lower = t.toLowerCase()
      if (ALL_SQL_KEYWORDS.has(lower)) return ''
      const stripped = stripUppercaseKeywordEmbeds(t)
      if (stripped.length === 0) return ''
      if (ALL_SQL_KEYWORDS.has(stripped.toLowerCase())) return ''
      return stripped
    })
    .filter((t) => t.length > 0)

  let sanitized = collapseUnderscores(tokens.join('_'))
  sanitized = removeLeadingTrailingUnderscores(sanitized)

  if (sanitized.length === 0) {
    return keywordSafeFallback(originalLower)
  }

  if (startsWithDigit(sanitized)) {
    sanitized = `param_${sanitized}`
  }

  if (sanitized.length > MAX_PARAM_NAME_LENGTH) {
    sanitized = sanitized.substring(0, MAX_PARAM_NAME_LENGTH)
  }

  const finalLower = sanitized.toLowerCase()
  if (ALL_SQL_KEYWORDS.has(finalLower)) {
    const suffix = hash32(`${originalLower}:${finalLower}`).slice(0, HASH_SUFFIX_LENGTH)
    sanitized = `param_${suffix}`
    if (sanitized.length > MAX_PARAM_NAME_LENGTH) {
      sanitized = sanitized.substring(0, MAX_PARAM_NAME_LENGTH)
    }
  }

  return sanitized
}

export function extractDynamicName(marker: string): string {
  if (!isDynamicParameter(marker)) {
    throw new Error(`Not a dynamic parameter: ${marker}`)
  }

  const rawName = marker.startsWith(DYNAMIC_MARKERS.PREFIX)
    ? marker.slice(DYNAMIC_MARKERS.PREFIX.length, -DYNAMIC_MARKERS.SUFFIX.length)
    : marker.slice(1)

  return sanitizeParamName(rawName)
}

export function toInternalMarker(paramName: string): string {
  const safe = sanitizeParamName(paramName)
  return `${DYNAMIC_MARKERS.PREFIX}${safe}${DYNAMIC_MARKERS.SUFFIX}`
}

export function inferParameterType(
  path: string[],
  model: DMMF.Model
): 'string' | 'number' | 'boolean' | 'object' {
  if (!Array.isArray(path) || isEmpty(path)) return 'string'

  const lastKey = lastElement(path)
  if (!isNonEmptyString(lastKey)) return 'string'

  if (NUMERIC_KEYWORDS.has(lastKey)) return 'number'

  if (path.length >= 2 && path[0] === 'where') {
    const fieldName = path[1]
    if (isNonEmptyString(fieldName)) {
      const field = model.fields.find((f) => f.name === fieldName)
      if (field) return prismaTypeToParamType(String(field.type))
    }
  }

  for (const segment of path) {
    if (!isNonEmptyString(segment)) continue
    const lower = segment.toLowerCase()
    if (lower === 'gt' || lower === 'gte' || lower === 'lt' || lower === 'lte') {
      return 'number'
    }
  }

  const lowerKey = lastKey.toLowerCase()
  if (lowerKey.includes('id') || lowerKey.includes('count') || lowerKey.includes('age')) {
    return 'number'
  }

  if (lowerKey.includes('is') || lowerKey.includes('has') || lowerKey.includes('enabled')) {
    return 'boolean'
  }

  return 'string'
}

function prismaTypeToParamType(
  prismaType: string
): 'string' | 'number' | 'boolean' | 'object' {
  switch (prismaType) {
    case 'Int':
    case 'Float':
    case 'Decimal':
    case 'BigInt':
      return 'number'
    case 'Boolean':
      return 'boolean'
    case 'Json':
      return 'object'
    default:
      return 'string'
  }
}

export function normalizeParamPath(path: string[]): string[] {
  if (!Array.isArray(path)) return []
  
  return path.filter((segment) => {
    return isNonEmptyString(segment) 
      && !isArrayMarker(segment) 
      && !FILTER_OPS.has(segment)
  })
}

export function pathToDotNotation(path: string[]): string {
  if (!Array.isArray(path)) return ''
  
  return path
    .filter((segment) => isNonEmptyString(segment) && !isArrayMarker(segment))
    .join('.')
}

function makeUniqueSanitizedName(
  base: string,
  raw: string,
  used: Set<string>
): string {
  const rawLower = raw.toLowerCase()
  let suffix = hash32(rawLower).slice(0, HASH_SUFFIX_LENGTH)
  let candidate = `${base}_${suffix}`

  if (candidate.length > MAX_PARAM_NAME_LENGTH) {
    const maxBase = Math.max(1, MAX_PARAM_NAME_LENGTH - 1 - suffix.length)
    candidate = `${base.substring(0, maxBase)}_${suffix}`
  }

  if (startsWithDigit(candidate)) {
    candidate = `param_${candidate}`
  }

  if (ALL_SQL_KEYWORDS.has(candidate.toLowerCase())) {
    suffix = hash32(`${rawLower}:${candidate.toLowerCase()}`).slice(0, HASH_SUFFIX_LENGTH)
    candidate = `param_${suffix}`
  }

  let n = 1
  while (used.has(candidate)) {
    const altSuffix = hash32(`${rawLower}:${n}`).slice(0, HASH_SUFFIX_LENGTH)
    candidate = `${base}_${altSuffix}`
    
    if (candidate.length > MAX_PARAM_NAME_LENGTH) {
      const maxBase = Math.max(1, MAX_PARAM_NAME_LENGTH - 1 - altSuffix.length)
      candidate = `${base.substring(0, maxBase)}_${altSuffix}`
    }
    
    if (startsWithDigit(candidate)) {
      candidate = `param_${candidate}`
    }
    
    if (ALL_SQL_KEYWORDS.has(candidate.toLowerCase())) {
      candidate = `param_${hash32(`${rawLower}:${candidate.toLowerCase()}`).slice(0, HASH_SUFFIX_LENGTH)}`
    }
    
    n++
    if (n > 1000) {
      throw new Error(`Failed to generate unique parameter name after 1000 attempts`)
    }
  }

  return candidate
}

export function extractParamsFromQuery(
  query: Record<string, unknown>,
  model: DMMF.Model
): ExtractedParams {
  const params: ParameterDefinition[] = []
  const dynamicKeys: string[] = []
  const staticValues: unknown[] = []
  const usedNames = new Set<string>()
  const nameToRaw = new Map<string, string>()
  let position = 1

  function assertPlainObject(obj: unknown): asserts obj is Record<string, unknown> {
    if (isNullish(obj)) return

    if (!isPlainObject(obj)) {
      throw new Error('Disallowed non-plain object in query')
    }

    const keys = Object.getOwnPropertyNames(obj)
    for (const key of keys) {
      if (isUnsafeKey(key)) {
        throw new Error(`Disallowed key in query object: ${key}`)
      }
    }
  }

  function traverse(obj: unknown, path: string[] = []): unknown {
    if (isDynamicParameter(obj)) {
      const raw = (obj as string).startsWith(DYNAMIC_MARKERS.PREFIX)
        ? (obj as string).slice(DYNAMIC_MARKERS.PREFIX.length, -DYNAMIC_MARKERS.SUFFIX.length)
        : (obj as string).slice(1)

      let sanitized = sanitizeParamName(raw)

      if (nameToRaw.has(sanitized)) {
        const existingRaw = nameToRaw.get(sanitized)
        if (existingRaw !== raw) {
          sanitized = makeUniqueSanitizedName(sanitized, raw, usedNames)
        }
      }

      const inferredType = inferParameterType(path, model)

      if (!usedNames.has(sanitized)) {
        usedNames.add(sanitized)
        nameToRaw.set(sanitized, raw)
        params.push({
          name: sanitized,
          originalName: raw,
          path: [...path],
          type: inferredType,
          required: true,
          position,
        })
        dynamicKeys.push(sanitized)
        position++
      }

      return toInternalMarker(sanitized)
    }

    if (Array.isArray(obj)) {
      return obj.map((item, i) =>
        traverse(item, [...path, `${ARRAY_MARKERS.START}${i}${ARRAY_MARKERS.END}`])
      )
    }

    if (exists(obj) && typeof obj === 'object') {
      assertPlainObject(obj)

      const result: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(obj)) {
        result[key] = traverse(value, [...path, key])
      }
      return result
    }

    staticValues.push(obj)
    return obj
  }

  const processedQuery = traverse(query) as Record<string, unknown>

  const inputSchema: InputSchema = {
    required: params.filter((p) => p.required === true).map((p) => p.name),
    optional: params.filter((p) => p.required === false).map((p) => p.name),
    types: Object.fromEntries(params.map((p) => [p.name, p.type])),
  }

  validatePositions(params)

  return { processedQuery, params, inputSchema, dynamicKeys, staticValues }
}

export function validatePositions(params: ParameterDefinition[]): void {
  assertArray(params, 'validatePositions params')
  
  if (isEmpty(params)) return
  
  for (let i = 0; i < params.length; i++) {
    const param = params[i]
    if (isNullish(param)) {
      throw new Error(`Parameter at index ${i} is null or undefined`)
    }
    
    const expectedPosition = i + 1
    if (param.position !== expectedPosition) {
      throw new Error(
        `CRITICAL: Parameter position gap detected - param '${param.name}' at index ${i} has position ${param.position}, expected ${expectedPosition}`
      )
    }
  }
}

export function extractParamValue(
  params: Record<string, unknown>,
  path: string[]
): unknown {
  if (isNullish(params) || typeof params !== 'object') return undefined
  if (!Array.isArray(path) || isEmpty(path)) return undefined

  let value: unknown = params

  for (const segment of path) {
    if (!isNonEmptyString(segment)) return undefined
    
    if (segment.trim().length === 0) return undefined
    if (isUnsafeKey(segment)) return undefined

    if (isArrayMarker(segment)) {
      const indexStr = segment.slice(1, -1)
      const index = parseInt(indexStr, 10)

      if (!Number.isFinite(index) || !Number.isInteger(index) || index < 0) {
        throw new Error(`Invalid array index: ${segment}`)
      }

      if (!Array.isArray(value) || index >= value.length) {
        return undefined
      }

      value = value[index]
      continue
    }

    if (isNullish(value) || !isPlainObject(value)) return undefined
    if (!Object.prototype.hasOwnProperty.call(value, segment)) return undefined

    value = value[segment]
  }

  return value
}

export function validateDynamicParams(
  params: Record<string, unknown>,
  dynamicParams: ParameterDefinition[]
): void {
  assertArray(dynamicParams, 'validateDynamicParams')
  
  if (isEmpty(dynamicParams)) return

  const missing: string[] = []

  for (const param of dynamicParams) {
    if (isNullish(param) || isNullish(param.path)) continue
    if (!Array.isArray(param.path) || isEmpty(param.path)) continue

    const value = extractParamValue(params, param.path)
    
    if (isNullish(value)) {
      const dotPath = pathToDotNotation(param.path)
      const { hasContent } = trimAndCheck(dotPath)
      
      if (hasContent) {
        missing.push(`${param.name} (path: ${dotPath})`)
      } else {
        missing.push(param.name)
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(', ')}`)
  }
}

export function organizeParameters(params: ParameterDefinition[]): ParameterSet {
  assertArray(params, 'organizeParameters')
  
  const all = [...params].sort((a, b) => a.position - b.position)
  const required = all.filter((p) => p.required === true)
  const optional = all.filter((p) => p.required === false)

  const typeMap: Record<string, 'string' | 'number' | 'boolean' | 'object'> = {}
  for (const param of all) {
    typeMap[param.name] = param.type
  }

  return { all, required, optional, typeMap }
}

export function deduplicateParams(params: ParameterDefinition[]): ParameterDefinition[] {
  if (!Array.isArray(params)) return []
  return deduplicateBy(params, (p) => p.name)
}
import type { DMMF } from '@prisma/generator-helper'
import type { ParameterDefinition, ProcessedQuery } from './types'
import { extractParamsFromQuery, isDynamicParameter } from './extractors'
import { isNonEmptyString } from './utils/guards'
import { lastElement, secondLastElement } from './utils/array'

const ARRAY_INDEX_PATTERN = /^\[\d+\]$/

function isArrayIndexSegment(seg: string): boolean {
  return isNonEmptyString(seg) && ARRAY_INDEX_PATTERN.test(seg)
}

export function transformQuery(
  query: Record<string, any>,
  model: DMMF.Model,
): {
  processed: Record<string, any>
  parameters: ParameterDefinition[]
  staticValues: any[]
  dynamicKeys: string[]
  errors: string[]
} {
  const errors: string[] = []
  const fieldNames = new Set(model.fields.map((f) => f.name))
  const logicalOps = new Set(['AND', 'OR', 'NOT'])
  const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor'])

  function isWhereInputObject(path: string[]): boolean {
    if (!Array.isArray(path) || path.length === 0) return false
    
    if (path.length === 1 && path[0] === 'where') {
      return true
    }
    
    if (path.length >= 2 && path[0] === 'where') {
      const last = lastElement(path)
      if (isNonEmptyString(last) && logicalOps.has(last)) {
        return true
      }
    }
    
    if (path.length >= 3 && path[0] === 'where') {
      const last = lastElement(path)
      const secondLast = secondLastElement(path)
      
      if (isNonEmptyString(last) && isNonEmptyString(secondLast)) {
        if (isArrayIndexSegment(last) && logicalOps.has(secondLast)) {
          return true
        }
      }
    }
    
    return false
  }

  function validateFields(obj: any, path: string[] = []): void {
    if (isDynamicParameter(obj)) return

    if (Array.isArray(obj)) {
      obj.forEach((item, i) => validateFields(item, [...path, `[${i}]`]))
      return
    }

    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof key !== 'string') continue
        
        if (unsafeKeys.has(key)) {
          errors.push(`Disallowed key '${key}' in query object`)
          continue
        }

        if (isWhereInputObject(path)) {
          if (!logicalOps.has(key) && !fieldNames.has(key)) {
            errors.push(`Field '${key}' does not exist on model '${model.name}'`)
          }
        }

        validateFields(value, [...path, key])
      }
    }
  }

  validateFields(query)

  try {
    const extracted = extractParamsFromQuery(query, model)
    return {
      processed: extracted.processedQuery,
      parameters: extracted.params,
      staticValues: extracted.staticValues,
      dynamicKeys: extracted.dynamicKeys,
      errors,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      processed: query,
      parameters: [],
      staticValues: [],
      dynamicKeys: [],
      errors: [...errors, msg],
    }
  }
}

export function processQuery(
  query: Record<string, any>,
  model: DMMF.Model,
): { result: ProcessedQuery; errors: string[]; parameters: ParameterDefinition[] } {
  const { processed, parameters, staticValues, dynamicKeys, errors } = transformQuery(query, model)

  return {
    result: { original: query, processed, staticValues, dynamicKeys },
    errors,
    parameters,
  }
}

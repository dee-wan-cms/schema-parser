import type { DMMF } from '@prisma/generator-helper'
import { processQuery } from './transformer'
import type {
  DirectiveProps,
  DirectivePipelineConfig,
  ModelDirectiveResult,
  CacheConfig,
  RawDirectiveJSON,
} from './types'
import { parseDirectives } from './parser'
import { CACHE_TTL } from './constants'
import { isPlainObject, inRange } from './utils/guards'
import { organizeParameters } from './extractors'

const DEFAULT_CONFIG: DirectivePipelineConfig = {
  defaultCacheTtl: CACHE_TTL.DEFAULT,
  skipInvalid: true,
}

function validateTTL(ttl: number, context: string): number {
  if (typeof ttl !== 'number') {
    throw new Error(`Invalid TTL in ${context}: ${ttl}. Must be a number.`)
  }
  
  if (!Number.isFinite(ttl)) {
    throw new Error(`Invalid TTL in ${context}: ${ttl}. Must be finite.`)
  }
  
  if (!Number.isInteger(ttl)) {
    throw new Error(`Invalid TTL in ${context}: ${ttl}. Must be integer between ${CACHE_TTL.MIN} and ${CACHE_TTL.MAX}.`)
  }
  
  if (!inRange(ttl, CACHE_TTL.MIN, CACHE_TTL.MAX)) {
    throw new Error(`Invalid TTL in ${context}: ${ttl}. Must be integer between ${CACHE_TTL.MIN} and ${CACHE_TTL.MAX}.`)
  }
  
  return ttl
}

function isValidTTL(ttl: unknown): ttl is number {
  return typeof ttl === 'number' 
    && Number.isFinite(ttl) 
    && Number.isInteger(ttl) 
    && inRange(ttl, CACHE_TTL.MIN, CACHE_TTL.MAX)
}

export function parseCacheConfig(
  directive: RawDirectiveJSON['cache'],
  defaultTtl: number,
): CacheConfig {
  const validatedDefault = validateTTL(defaultTtl, 'defaultCacheTtl config')

  if (directive === false) {
    return { enabled: false }
  }
  
  if (directive === undefined || directive === true) {
    return { enabled: true, ttl: validatedDefault }
  }

  if (isPlainObject(directive)) {
    const ttl = (directive as any).ttl
    const binding = (directive as any).binding

    if (isValidTTL(ttl)) {
      return { enabled: true, ttl, binding }
    }
    
    return { enabled: true, ttl: validatedDefault, binding }
  }

  return { enabled: true, ttl: validatedDefault }
}

function processDirective(
  raw: RawDirectiveJSON,
  model: DMMF.Model,
  datamodel: DMMF.Datamodel,
  config: DirectivePipelineConfig,
): { directive?: DirectiveProps; errors: string[] } {
  const queryResult = processQuery(raw.query as Record<string, unknown>, model)

  if (queryResult.errors.length > 0) {
    return { errors: queryResult.errors }
  }

  const cache = parseCacheConfig(raw.cache, config.defaultCacheTtl)

  const directive: DirectiveProps = {
    header: raw.header,
    modelName: model.name,
    query: queryResult.result,
    parameters: organizeParameters(queryResult.parameters),
    cache,
    context: {
      model,
      datamodel,
      allModels: datamodel.models as unknown as DMMF.Model[],
      enums: datamodel.enums as unknown as DMMF.DatamodelEnum[],
    },
  }

  return { directive, errors: [] }
}

export function processModelDirectives(
  model: DMMF.Model,
  datamodel: DMMF.Datamodel,
  config: Partial<DirectivePipelineConfig> = {},
): ModelDirectiveResult {
  const fullConfig: DirectivePipelineConfig = { ...DEFAULT_CONFIG, ...config }

  const { directives: rawDirectives, errors: parseErrors } = parseDirectives(model.documentation)

  const processedDirectives: DirectiveProps[] = []
  const allErrors = [...parseErrors]

  for (const raw of rawDirectives) {
    try {
      const result = processDirective(raw, model, datamodel, fullConfig)

      if (result.errors.length > 0) {
        for (const message of result.errors) {
          allErrors.push({ message, level: 'error', raw: JSON.stringify(raw) })
        }
        
        if (fullConfig.skipInvalid === false) {
          throw new Error(result.errors.join('; '))
        }
        continue
      }

      if (result.directive) {
        processedDirectives.push(result.directive)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      allErrors.push({
        message: `Failed to process directive: ${errorMessage}`,
        level: 'error',
        raw: JSON.stringify(raw),
      })
      
      if (fullConfig.skipInvalid === false) {
        throw error
      }
    }
  }

  const hasCaching = processedDirectives.some((d) => d.cache.enabled === true)

  return {
    modelName: model.name,
    directives: processedDirectives,
    errors: allErrors,
    hasCaching,
  }
}

export function processAllDirectives(
  models: DMMF.Model[],
  datamodel: DMMF.Datamodel,
  config: Partial<DirectivePipelineConfig> = {},
): Map<string, ModelDirectiveResult> {
  const results = new Map<string, ModelDirectiveResult>()

  for (const model of models) {
    const result = processModelDirectives(model, datamodel, config)
    
    if (result.directives.length > 0 || result.errors.length > 0) {
      results.set(model.name, result)
    }
  }

  return results
}

export function getDirectiveProps(
  model: DMMF.Model,
  datamodel: DMMF.Datamodel,
  defaultTtl: number = CACHE_TTL.DEFAULT,
): DirectiveProps[] {
  const result = processModelDirectives(model, datamodel, { defaultCacheTtl: defaultTtl })
  return result.directives
}
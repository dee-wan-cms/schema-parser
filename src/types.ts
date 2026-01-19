// src/types.ts
import type { DMMF } from '@prisma/generator-helper'

export interface RawDirective {
  raw: string
  json: RawDirectiveJSON
  line?: number
}

export interface RawDirectiveJSON {
  method: string
  query: Record<string, unknown>
  cache?: CacheDirective
}

export type CacheDirective = 
  | boolean 
  | { ttl: number; binding?: string }

export interface ParameterDefinition {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object'
  path: string[]
  required: boolean
  position: number
  originalName?: string
}

export interface ParameterSet {
  all: ParameterDefinition[]
  required: ParameterDefinition[]
  optional: ParameterDefinition[]
  typeMap: Record<string, 'string' | 'number' | 'boolean' | 'object'>
}

export interface ProcessedQuery {
  original: Record<string, unknown>
  processed: Record<string, unknown>
  staticValues: unknown[]
  dynamicKeys: string[]
}

export interface CacheConfig {
  enabled: boolean
  ttl?: number
  binding?: string
}

export interface DirectiveProps {
  method: string
  modelName: string
  query: ProcessedQuery
  parameters: ParameterSet
  cache: CacheConfig
  context: {
    model: DMMF.Model
    datamodel: DMMF.Datamodel
    allModels: DMMF.Model[]
    enums: DMMF.DatamodelEnum[]
  }
}

export interface ModelDirectiveResult {
  modelName: string
  directives: DirectiveProps[]
  errors: DirectiveError[]
  hasCaching: boolean
}

export interface DirectiveError {
  message: string
  level: 'error' | 'warning'
  line?: number
  raw?: string
}

export interface DirectivePipelineConfig {
  defaultCacheTtl: number
  skipInvalid: boolean
}

export interface ParamMap {
  index: number
  path?: string
  dynamicName?: string
  value?: unknown
}

export function validateParamMap(mapping: ParamMap): void {
  if (!Number.isInteger(mapping.index) || mapping.index < 1) {
    throw new Error(`Invalid ParamMap index: ${mapping.index} (must be integer >= 1)`)
  }
  
  const hasDynamic = mapping.dynamicName !== undefined
  const hasStatic = mapping.value !== undefined
  
  if (hasDynamic && hasStatic) {
    throw new Error(`ParamMap ${mapping.index} has both dynamicName and value`)
  }
  
  if (!hasDynamic && !hasStatic) {
    throw new Error(`ParamMap ${mapping.index} has neither dynamicName nor value`)
  }
}

export interface ParsedOptimization {
  method: string
  query: Record<string, unknown>
  cache?: { ttl: number } | boolean
  sql: string
  staticParams: unknown[]
  dynamicKeys: string[]
  params: ParameterDefinition[]
  inputSchema: InputSchema
  paramMappings: ParamMap[]
}

export interface InputSchema {
  required: string[]
  optional: string[]
  types: Record<string, 'string' | 'number' | 'boolean' | 'object'>
}

export interface ExtractedParams {
  processedQuery: Record<string, unknown>
  params: ParameterDefinition[]
  inputSchema: InputSchema
  dynamicKeys: string[]
  staticValues: unknown[]
}

export interface Field {
  name: string
  type: string
  isRequired: boolean
  isRelation: boolean
  relatedModel?: string
  relationName?: string
  foreignKey?: string
  references?: string
  isForeignKeyLocal?: boolean
}

export interface Model {
  name: string
  tableName: string
  fields: Field[]
}
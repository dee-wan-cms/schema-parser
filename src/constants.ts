export const ARRAY_MARKERS = Object.freeze({
  START: '[',
  END: ']',
} as const)

export const FILTER_OPS: ReadonlySet<string> = new Set([
  'in',
  'notIn',
  'has',
  'hasSome',
  'hasEvery',
])

export const NUMERIC_KEYWORDS: ReadonlySet<string> = new Set([
  'take',
  'skip',
  'limit',
  'offset',
  'cursor',
])

export const SQL_KEYWORDS: ReadonlySet<string> = new Set([
  'select',
  'from',
  'where',
  'and',
  'or',
  'not',
  'in',
  'like',
  'between',
  'order',
  'by',
  'group',
  'having',
  'limit',
  'offset',
  'join',
  'inner',
  'left',
  'right',
  'outer',
  'on',
  'as',
  'table',
  'column',
  'index',
  'user',
  'users',
  'values',
  'update',
  'insert',
  'delete',
  'create',
  'drop',
  'alter',
  'truncate',
  'grant',
  'revoke',
  'exec',
  'execute',
])

export const DANGEROUS_SQL_KEYWORDS: ReadonlySet<string> = new Set([
  'drop',
  'delete',
  'insert',
  'update',
  'select',
  'union',
  'exec',
  'execute',
  'truncate',
  'grant',
  'revoke',
  'alter',
  'create',
  'from',
  'where',
  'into',
  'and',
  'or',
  'not',
])

export const CACHE_TTL = Object.freeze({
  MIN: 1,
  MAX: 31536000,
  DEFAULT: 300,
} as const)

export const MIN_TTL = CACHE_TTL.MIN
export const MAX_TTL = CACHE_TTL.MAX

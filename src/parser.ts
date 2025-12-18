import type { RawDirectiveJSON, DirectiveError } from './types'
import { isNonEmptyString, isEmpty } from './utils/guards'

const DIRECTIVE_MARKER = '@optimize'
const COMMENT_PREFIX = '///'
const OPEN_BRACE = '{'
const CLOSE_BRACE = '}'
const DOUBLE_QUOTE = '"'
const BACKSLASH = '\\'
const NEWLINE = '\n'

function cleanJsonFromComments(raw: string): string {
  if (!isNonEmptyString(raw)) return ''
  
  return raw
    .split(NEWLINE)
    .map((line) => {
      const trimmed = line.trim()
      if (trimmed.startsWith(COMMENT_PREFIX)) {
        return trimmed.replace(/^\/\/\/\s?/, '')
      }
      return trimmed
    })
    .join(NEWLINE)
}

export function extractCompleteJson(str: string): string | null {
  if (!isNonEmptyString(str)) return null
  
  let braceCount = 0
  let inString = false
  let escapeNext = false

  for (let i = 0; i < str.length; i++) {
    const char = str[i]

    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (char === BACKSLASH) {
      escapeNext = true
      continue
    }

    if (char === DOUBLE_QUOTE) {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === OPEN_BRACE) {
      braceCount++
    } else if (char === CLOSE_BRACE) {
      braceCount--
      
      if (braceCount === 0) {
        return str.substring(0, i + 1)
      }
      
      if (braceCount < 0) {
        return null
      }
    }
  }

  return null
}

export function extractDirectives(
  documentation: string | undefined,
): Array<{ raw: string; line: number }> {
  if (!isNonEmptyString(documentation)) return []

  const results: Array<{ raw: string; line: number }> = []
  let searchFrom = 0

  while (searchFrom < documentation.length) {
    const directiveIndex = documentation.indexOf(DIRECTIVE_MARKER, searchFrom)
    if (directiveIndex === -1) break

    const line = documentation.substring(0, directiveIndex).split(NEWLINE).length
    const restOfDoc = documentation.substring(directiveIndex + DIRECTIVE_MARKER.length)
    const jsonStartIndex = restOfDoc.indexOf(OPEN_BRACE)

    if (jsonStartIndex === -1) {
      searchFrom = directiveIndex + DIRECTIVE_MARKER.length
      continue
    }

    const jsonPart = restOfDoc.substring(jsonStartIndex)
    const completeJson = extractCompleteJson(jsonPart)

    if (completeJson && typeof completeJson === 'string') {
      const cleanedJson = cleanJsonFromComments(completeJson)
      results.push({ raw: cleanedJson, line })
      searchFrom = directiveIndex + DIRECTIVE_MARKER.length + jsonStartIndex + completeJson.length
    } else {
      searchFrom = directiveIndex + DIRECTIVE_MARKER.length
    }
  }

  return results
}

export function parseDirectiveJson(
  raw: string,
  line?: number,
):
  | { success: true; data: RawDirectiveJSON }
  | { success: false; error: DirectiveError } {
  if (!isNonEmptyString(raw)) {
    return {
      success: false,
      error: { message: 'Input must be a string', level: 'error', line, raw: String(raw) },
    }
  }
  
  try {
    const parsed = JSON.parse(raw)

    if (!parsed || typeof parsed !== 'object') {
      return {
        success: false,
        error: { message: 'Parsed value must be an object', level: 'error', line, raw },
      }
    }

    const hasValidHeader = parsed.header && typeof parsed.header === 'string'
    if (!hasValidHeader) {
      return {
        success: false,
        error: { message: 'Missing or invalid "header" field', level: 'error', line, raw },
      }
    }

    if (isEmpty(parsed.header.trim())) {
      return {
        success: false,
        error: { message: 'Header cannot be empty', level: 'error', line, raw },
      }
    }

    const queryField = parsed.query ?? parsed.args
    const hasValidQuery = queryField && typeof queryField === 'object'
    if (!hasValidQuery) {
      return {
        success: false,
        error: {
          message: 'Missing or invalid "query" or "args" field',
          level: 'error',
          line,
          raw,
        },
      }
    }

    return {
      success: true,
      data: { header: parsed.header, query: queryField, cache: parsed.cache },
    }
  } catch (err) {
    return {
      success: false,
      error: {
        message: `JSON parsing failed: ${err instanceof Error ? err.message : String(err)}`,
        level: 'error',
        line,
        raw,
      },
    }
  }
}

export function parseDirectives(
  documentation: string | undefined,
): { directives: RawDirectiveJSON[]; errors: DirectiveError[] } {
  const extracted = extractDirectives(documentation)
  const directives: RawDirectiveJSON[] = []
  const errors: DirectiveError[] = []

  for (const { raw, line } of extracted) {
    const result = parseDirectiveJson(raw, line)
    if (result.success) {
      directives.push(result.data)
    } else {
      errors.push(result.error)
    }
  }

  return { directives, errors }
}

export function hasDirectives(documentation: string | undefined): boolean {
  return isNonEmptyString(documentation) && documentation.includes(DIRECTIVE_MARKER)
}
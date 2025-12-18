export function trimAndCheck(value: string): { trimmed: string; hasContent: boolean } {
  const trimmed = value.trim()
  return { trimmed, hasContent: trimmed.length > 0 }
}

export function hash32(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Hash input must be string')
  }
  let h = 5381
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) ^ input.charCodeAt(i)
  }
  return (h >>> 0).toString(36)
}

export function sanitizeAlphanumeric(str: string): string {
  return str.replace(/[^a-zA-Z0-9_]/g, '')
}

export function removeLeadingTrailingUnderscores(str: string): string {
  return str.replace(/^_+|_+$/g, '')
}

export function collapseUnderscores(str: string): string {
  return str.replace(/_+/g, '_')
}

export function startsWithDigit(str: string): boolean {
  return /^\d/.test(str)
}
export function lastElement<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1]
}

export function secondLastElement<T>(arr: T[]): T | undefined {
  return arr[arr.length - 2]
}

export function filterStrings(items: unknown[]): string[] {
  return items.filter((item): item is string => typeof item === 'string')
}

export function deduplicateBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const k = key(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
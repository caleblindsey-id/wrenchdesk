export function normalizeSerial(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  return trimmed === '' ? null : trimmed
}

export function serialsMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const na = normalizeSerial(a)
  const nb = normalizeSerial(b)
  if (!na || !nb) return false
  return na.toLowerCase() === nb.toLowerCase()
}

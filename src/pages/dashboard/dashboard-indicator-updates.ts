export function hasMeaningfulIndicatorChange(rawValue: unknown): boolean {
  if (rawValue === null || rawValue === undefined || rawValue === '') return false

  const parsed = typeof rawValue === 'number'
    ? rawValue
    : Number.parseFloat(String(rawValue).replaceAll(',', '').replace('%', '').trim())

  return Number.isFinite(parsed) && Number(parsed.toFixed(2)) !== 0
}

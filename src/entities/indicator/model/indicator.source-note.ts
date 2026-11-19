import type { Indicator } from './indicator.types'

export function latestSourceDate(rows: Indicator[]) {
  const latest = rows
    .map((row) => String(row.raw?.last_update ?? row.updatedAt ?? '').slice(0, 10))
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort()
    .at(-1)
  if (!latest) return ''
  return new Date(`${latest}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

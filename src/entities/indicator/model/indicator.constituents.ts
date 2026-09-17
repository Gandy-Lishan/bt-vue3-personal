import type { IndicatorTableColumnKind } from './indicator.table'
import type { IndicatorConstituentRow } from './indicator.types'

/**
 * The constituent conditions table is built entirely from the payload, so its columns
 * are derived per response rather than declared. Headers are the API's field names
 * verbatim — no translation, no prettifying.
 */

/** Internal row identifier, never shown as a column. */
const hiddenKeys = new Set(['url'])

const symbolKey = 'symbol'
const dateKey = 'date'

/** Used when the payload yields no usable columns at all. */
export const fallbackConstituentColumns: ConstituentColumn[] = [
  { key: 'Symbol', label: 'Symbol', kind: 'text' },
  { key: 'Close', label: 'Close', kind: 'number' },
  { key: 'Date', label: 'Date', kind: 'date' },
]

export interface ConstituentColumn {
  /** API field name; also the cell lookup key. */
  key: string
  /** Header text — the field name as returned, unmodified. */
  label: string
  kind: 'text' | 'number' | 'date'
}

/**
 * A value counts as numeric when it is not NaN. Strings are coerced, but blanks and
 * booleans are not numbers for display purposes (`Number('')` is 0, not NaN).
 */
export function isConstituentNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'string') return value.trim() !== '' && !Number.isNaN(Number(value))
  return false
}

function columnKind(key: string, rows: IndicatorConstituentRow[]): ConstituentColumn['kind'] {
  if (key.toLowerCase() === dateKey) return 'date'

  const hasNumber = rows.some((row) => isConstituentNumber(row[key]))
  return hasNumber ? 'number' : 'text'
}

/**
 * Columns come from the first row only, with `Symbol` forced to the front and `Date`
 * to the back and everything else left in payload order.
 */
export function constituentColumns(rows: IndicatorConstituentRow[]): ConstituentColumn[] {
  const first = rows[0]
  if (!first) return [...fallbackConstituentColumns]

  const keys = Object.keys(first).filter((key) => !hiddenKeys.has(key.toLowerCase()))
  if (!keys.length) return [...fallbackConstituentColumns]

  const firstKey = keys.find((key) => key.toLowerCase() === symbolKey)
  const lastKey = keys.find((key) => key.toLowerCase() === dateKey)
  const middleKeys = keys.filter((key) => key !== firstKey && key !== lastKey)

  return [...(firstKey ? [firstKey] : []), ...middleKeys, ...(lastKey ? [lastKey] : [])].map((key) => ({
    key,
    label: key,
    kind: columnKind(key, rows),
  }))
}

/** Cell text. Numeric values keep two decimals; dates are truncated to the day. */
export function constituentCellValue(row: IndicatorConstituentRow, column: ConstituentColumn) {
  const value = row[column.key]
  if (value === null || value === undefined || value === '') return '-'

  if (column.kind === 'date') {
    return typeof value === 'string' ? value.slice(0, 10) : '-'
  }

  if (isConstituentNumber(value)) return Number(value).toFixed(2)
  return String(value)
}

/**
 * Sort key. Dates compare as the leading `YYYY-MM-DD` text, which orders
 * chronologically without ever constructing a `Date`, and never touches a timezone.
 */
export function constituentSortValue(
  row: IndicatorConstituentRow,
  key: string,
  kind: IndicatorTableColumnKind = 'text',
): string | number | null {
  const value = row[key]
  if (value === null || value === undefined || value === '') return null

  if (kind === 'number') return isConstituentNumber(value) ? Number(value) : null
  if (kind === 'date') return typeof value === 'string' ? value.slice(0, 10) : null

  return String(value).toLocaleLowerCase()
}

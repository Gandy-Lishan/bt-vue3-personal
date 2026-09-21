/**
 * Date handling for indicator values.
 *
 * The API sends dates as literal strings ("2020-04-02"). They are read as the UTC
 * calendar date the API states, and are never re-projected through the browser's
 * local timezone — a user in UTC-8 must see the same day as a user in UTC+8.
 *
 * Nothing here calls `new Date(string)`: for a value like "2020-04-02" that parses as
 * UTC midnight, but for "2020/04/02" it parses as *local* midnight, and any later
 * local-time formatting or arithmetic can slide the date by a day. Reading the
 * year/month/day straight out of the string removes that class of bug entirely.
 */

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** Leading `YYYY-MM-DD` or `YYYY/MM/DD`; any time or offset suffix is ignored. */
const datePattern = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/

export interface IndicatorDateParts {
  year: number
  month: number
  day: number
}

/**
 * Read the calendar date as written by the API. Returns null when the value is empty
 * or is not a real calendar date (so "2020-02-31" is rejected rather than displayed).
 */
export function parseIndicatorDate(value: unknown): IndicatorDateParts | null {
  const match = String(value ?? '').trim().match(datePattern)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const timestamp = Date.UTC(year, month - 1, day)

  // Round-trip through UTC to reject dates that do not exist.
  const date = new Date(timestamp)
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }

  return { year, month, day }
}

/** "2020-04-02" → "April 2, 2020". Falls back to "—", or the raw text if unparseable. */
export function formatIndicatorDate(value: unknown): string {
  const text = String(value ?? '').trim()
  if (!text) return '—'

  const parts = parseIndicatorDate(text)
  if (!parts) return text

  return `${monthNames[parts.month - 1]} ${parts.day}, ${parts.year}`
}

/**
 * The API date string shown verbatim, for columns that must not be reformatted.
 * Nothing is parsed or re-projected here — whatever the backend sent is what renders.
 */
export function rawIndicatorDate(value: unknown): string {
  return String(value ?? '').trim() || '—'
}

/** "2026-09-17T00:00:00.000" -> "2026-09-17"; falls back to the raw text. */
export function rawIndicatorDateOnly(value: unknown): string {
  const text = rawIndicatorDate(value)
  if (text === '—') return text

  const parts = parseIndicatorDate(text)
  if (!parts) return text

  return [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-')
}

/**
 * Sort key for a date column. Built with `Date.UTC`, so ordering is identical in every
 * timezone. Unparseable dates sort last via the null handling in `compareSortValues`.
 */
export function indicatorDateTimestamp(value: unknown): number | null {
  const parts = parseIndicatorDate(value)
  if (!parts) return null

  return Date.UTC(parts.year, parts.month - 1, parts.day)
}

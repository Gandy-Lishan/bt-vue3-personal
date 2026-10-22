import type { ActiveStudiesResponse, ActiveStudyRow } from './active-study.types'

type RawRecord = Record<string, unknown>

function text(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim()
}

function number(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function safeJsonParse(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function payloadRecord(payload: unknown): RawRecord {
  const parsed = safeJsonParse(payload)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  const root = parsed as RawRecord
  const nested = safeJsonParse(root.data)
  return nested && typeof nested === 'object' && !Array.isArray(nested)
    ? nested as RawRecord
    : root
}

function reportHref(filename: string) {
  if (!filename) return ''
  if (/^https?:\/\//i.test(filename)) return filename
  return `https://sentimentrader.com/blog/${filename.replace(/^\/+/, '')}`
}

function normalizeRow(value: unknown, index: number): ActiveStudyRow | null {
  const parsed = safeJsonParse(value)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const row = parsed as RawRecord
  const title = text(row.title)
  const market = text(row.market)
  if (!title || !market) return null

  const date = text(row.date)
  const timestamp = new Date(date.length === 10 ? `${date}T00:00:00Z` : date).getTime()
  const filename = text(row.filename ?? row.url)

  return {
    id: text(row.id ?? row.index) || `${date}-${filename || title}-${index}`,
    date,
    dateTimestamp: Number.isNaN(timestamp) ? null : timestamp,
    title,
    market,
    forecast: text(row.forecast),
    timeframe: text(row.timeframe ?? row.time_frame),
    filename,
    href: reportHref(filename),
  }
}

export function normalizeActiveStudies(payload: unknown): ActiveStudiesResponse {
  const record = payloadRecord(payload)
  const rowsValue = safeJsonParse(record.active_studies)
  const rows = Array.isArray(rowsValue) ? rowsValue : []
  const items = rows
    .map(normalizeRow)
    .filter((row): row is ActiveStudyRow => row !== null)
    .sort((left, right) => (right.dateTimestamp ?? -Infinity) - (left.dateTimestamp ?? -Infinity))

  return {
    items,
    summary: {
      shortTermBullish: number(record.short_term_bullish),
      shortTermBearish: number(record.short_term_bearish),
      mediumTermBullish: number(record.med_term_bullish),
      mediumTermBearish: number(record.med_term_bearish),
      longTermBullish: number(record.long_term_bullish),
      longTermBearish: number(record.long_term_bearish),
    },
  }
}

export function activeStudySortValue(row: ActiveStudyRow, key: string) {
  if (key === 'date') return row.dateTimestamp
  return String(row[key as keyof ActiveStudyRow] ?? '')
}

export function activeStudyTimeframeLabel(timeframe: string) {
  if (['Short to Intermediate', 'Intermediate to Long', 'Intermediate', 'Medium-Term'].includes(timeframe)) {
    return 'Medium'
  }
  if (['Short', 'Short-Term'].includes(timeframe)) return 'Short'
  if (['Long', 'Long-Term'].includes(timeframe)) return 'Long'
  return timeframe
}


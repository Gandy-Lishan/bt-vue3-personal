import type { ArchivedStudyRow } from './archived-study.types'

type RawRecord = Record<string, unknown>

function text(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim()
}

function safeJsonParse(value: unknown): unknown {
  let parsed = value
  for (let depth = 0; depth < 5 && typeof parsed === 'string'; depth += 1) {
    try {
      const next = JSON.parse(parsed)
      if (next === parsed) break
      parsed = next
    } catch {
      break
    }
  }
  return parsed
}

function extractRows(payload: unknown, depth = 0): unknown[] {
  if (depth > 5) return []
  const parsed = safeJsonParse(payload)
  if (Array.isArray(parsed)) return parsed
  if (!parsed || typeof parsed !== 'object') return []
  const record = parsed as RawRecord
  for (const key of ['data', 'results', 'archived_studies']) {
    if (!(key in record)) continue
    const rows = extractRows(record[key], depth + 1)
    if (rows.length) return rows
  }
  return []
}

function reportHref(filename: string) {
  if (!filename) return ''
  if (/^https?:\/\//i.test(filename)) return filename
  return `https://sentimentrader.com/blog/${filename.replace(/^\/+/, '')}`
}

function normalizeRating(value: unknown) {
  const rating = Math.round(Number(value))
  return Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : 0
}

function normalizeRow(value: unknown, index: number): ArchivedStudyRow | null {
  const parsed = safeJsonParse(value)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const row = parsed as RawRecord
  const market = text(row.market)
  if (!market || ['none', 'null'].includes(market.toLowerCase())) return null

  const title = text(row.title)
  if (!title) return null
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
    outcome: text(row.outcome),
    rating: normalizeRating(row.rating),
    timeframe: text(row.timeframe ?? row.time_frame),
    filename,
    href: reportHref(filename),
  }
}

export function normalizeArchivedStudies(payload: unknown): ArchivedStudyRow[] {
  return extractRows(payload)
    .map(normalizeRow)
    .filter((row): row is ArchivedStudyRow => row !== null)
    .sort((left, right) => (right.dateTimestamp ?? -Infinity) - (left.dateTimestamp ?? -Infinity))
}

export function archivedStudySortValue(row: ArchivedStudyRow, key: string) {
  if (key === 'date') return row.dateTimestamp
  if (key === 'rating') return row.rating
  return String(row[key as keyof ArchivedStudyRow] ?? '')
}


import type { IntradayMinute } from './minute.types'

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
  for (const key of ['data', 'results', 'minutes', 'intraday_minutes']) {
    if (!(key in record)) continue
    const rows = extractRows(record[key], depth + 1)
    if (rows.length) return rows
  }
  return []
}

function normalizeMinute(value: unknown, index: number): IntradayMinute | null {
  if (Array.isArray(value)) {
    const title = text(value[1])
    if (!title) return null
    return {
      id: text(value[0]) || `minute-${index}`,
      title,
      contentHtml: text(value[4]),
      publishedAt: text(value[5]),
      author: text(value[7]) || 'SentimenTrader',
    }
  }

  const parsed = safeJsonParse(value)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const row = parsed as RawRecord
  const title = text(row.title ?? row.post_title)
  if (!title) return null
  return {
    id: text(row.id ?? row.pk) || `minute-${index}`,
    title,
    contentHtml: text(row.content ?? row.post_content ?? row.body),
    publishedAt: text(row.published_at ?? row.post_date ?? row.date),
    author: text(row.author ?? row.post_author) || 'SentimenTrader',
  }
}

export function normalizeIntradayMinutes(payload: unknown): IntradayMinute[] {
  return extractRows(payload)
    .map(normalizeMinute)
    .filter((minute): minute is IntradayMinute => minute !== null)
}

export function formatMinuteDate(value: string) {
  const trimmed = value.trim()
  const numericTimestamp = /^\d+$/.test(trimmed) ? Number(trimmed) : null
  const timestamp = numericTimestamp === null
    ? value
    : numericTimestamp < 10_000_000_000
      ? numericTimestamp * 1000
      : numericTimestamp
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(date)
}


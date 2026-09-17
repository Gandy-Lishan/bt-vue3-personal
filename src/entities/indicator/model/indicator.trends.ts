import type { Indicator } from './indicator.types'

export const INDICATOR_TREND_POINT_COUNT = 30

export type IndicatorTrendTone = 'green' | 'red'

/** Each url maps to one or more lines. Most indicators have a single line. */
export type IndicatorTrendMap = Record<string, number[][]>

type TrendRecord = Record<string, unknown>

const seriesKeys = ['recent_data', 'data', 'values', 'series', 'chart_data', 'points', 'trend']
const valueKeys = ['value', 'last_value', 'close', 'y', 'last', 'price', 'reading', 'v']

/**
 * Per-point fields that are never plotted. `change`/`percent_change` sit alongside
 * `close` in the common row shape and would otherwise become extra lines once a row has
 * no recognised primary key.
 */
const ignoredPointKeys = new Set([
  'date',
  'time',
  'timestamp',
  'datetime',
  'day',
  'label',
  'change',
  'percent_change',
  'pct_change',
  'net_change',
  'url',
  'chart_url',
  'id',
  'symbol',
  'name',
])

function safeJsonParse(value: unknown) {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value.replace(/\bNaN\b/g, 'null'))
  } catch {
    return value
  }
}

function isRecord(value: unknown): value is TrendRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function trendNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const numeric = Number(String(value).replace('%', ''))
  return Number.isFinite(numeric) ? numeric : null
}

function pointValue(point: unknown): number | null {
  const parsed = safeJsonParse(point)
  const direct = trendNumber(parsed)
  if (direct !== null) return direct

  if (Array.isArray(parsed)) {
    for (let index = parsed.length - 1; index >= 0; index -= 1) {
      const numeric = trendNumber(parsed[index])
      if (numeric !== null) return numeric
    }
    return null
  }

  if (!isRecord(parsed)) return null

  for (const key of valueKeys) {
    const numeric = trendNumber(parsed[key])
    if (numeric !== null) return numeric
  }

  return null
}

function tail(values: number[]) {
  return values.slice(-INDICATOR_TREND_POINT_COUNT)
}

function parsedPoints(series: unknown): unknown[] {
  const parsed = safeJsonParse(series)
  if (isRecord(parsed)) {
    const nestedSeries = seriesKeys.find((key) => Array.isArray(safeJsonParse(parsed[key])))
    return nestedSeries ? parsedPoints(parsed[nestedSeries]) : []
  }

  return Array.isArray(parsed) ? parsed : []
}

/**
 * Lines for rows with no recognised primary key — the two-line shape, e.g.
 * `{ Date, smart_money, dumb_money }`. Every numeric field becomes a line, in the order
 * the payload declares them, which is what decides blue (first) versus dark red (second).
 */
function stackedSeries(points: unknown[]): number[][] {
  const keys: string[] = []

  for (const point of points) {
    const parsed = safeJsonParse(point)
    if (!isRecord(parsed)) continue

    for (const [key, value] of Object.entries(parsed)) {
      if (ignoredPointKeys.has(key.toLowerCase())) continue
      if (trendNumber(value) === null) continue
      if (!keys.includes(key)) keys.push(key)
    }
  }

  return (
    keys
      .map((key) =>
        points.map((point) => {
          const parsed = safeJsonParse(point)
          return isRecord(parsed) ? trendNumber(parsed[key]) : null
        }),
      )
      // Every line has to cover the same points, or the lines would plot out of step.
      .filter((line): line is number[] => line.every((value) => value !== null))
      .map(tail)
      .filter((line) => line.length >= 2)
  )
}

/**
 * One line per series. A row with a recognised primary key (close, value, …) yields a
 * single line and keeps the usual directional colouring; anything else is treated as a
 * stacked multi-line series.
 */
export function normalizeTrendSeries(series: unknown): number[][] {
  const points = parsedPoints(series)
  if (!points.length) return []

  const primary = points.map(pointValue)
  if (primary.every((value) => value !== null)) {
    const line = tail(primary as number[])
    return line.length >= 2 ? [line] : []
  }

  return stackedSeries(points)
}

function rowUrl(record: TrendRecord) {
  const value = record.url ?? record.chart_url ?? record.symbol ?? record.indicator_url ?? record.indicator ?? record.id
  return String(value ?? '').trim()
}

function rowSeries(record: TrendRecord) {
  for (const key of seriesKeys) {
    if (record[key] !== undefined && record[key] !== null) return record[key]
  }
  return undefined
}

function addTrend(result: IndicatorTrendMap, key: string, series: unknown) {
  const url = key.trim()
  if (!url) return

  const lines = normalizeTrendSeries(series)
  if (lines.length) {
    result[url] = lines
  }
}

function processTrendNode(node: unknown, requestedUrls: string[], result: IndicatorTrendMap) {
  const parsed = safeJsonParse(node)

  if (Array.isArray(parsed)) {
    let mappedRows = false
    for (const item of parsed) {
      if (!isRecord(item)) continue
      const url = rowUrl(item)
      const series = rowSeries(item)
      if (!url || series === undefined) continue

      addTrend(result, url, series)
      mappedRows = true
    }

    if (!mappedRows && requestedUrls.length === 1) {
      addTrend(result, requestedUrls[0], parsed)
    }
    return
  }

  if (!isRecord(parsed)) return

  const url = rowUrl(parsed)
  const series = rowSeries(parsed)
  if (url && series !== undefined) {
    addTrend(result, url, series)
    return
  }

  if (parsed.data !== undefined) {
    processTrendNode(parsed.data, requestedUrls, result)
  }

  for (const [key, value] of Object.entries(parsed)) {
    if (key === 'data') continue
    addTrend(result, key, value)
  }
}

export function normalizeIndicatorTrendPayload(payload: unknown, requestedUrls: string[] = []) {
  const result: IndicatorTrendMap = {}
  processTrendNode(payload, requestedUrls, result)
  return result
}

/** Direction tone for the single-line case; a stacked chart colours by position instead. */
export function indicatorTrendTone(indicator: Pick<Indicator, 'change' | 'trendLines'>): IndicatorTrendTone {
  const [primary] = indicator.trendLines ?? []
  if (primary && primary.length >= 2) {
    return primary[primary.length - 1] < primary[0] ? 'red' : 'green'
  }

  return indicator.change < 0 ? 'red' : 'green'
}

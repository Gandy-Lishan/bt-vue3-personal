import type { Indicator } from './indicator.types'

export const INDICATOR_TREND_POINT_COUNT = 30

export type IndicatorTrendTone = 'green' | 'red'
export type IndicatorTrendMap = Record<string, number[]>

type TrendRecord = Record<string, unknown>

const seriesKeys = ['recent_data', 'data', 'values', 'series', 'chart_data', 'points', 'trend']
const valueKeys = ['value', 'last_value', 'close', 'y', 'last', 'price', 'reading', 'v']

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

export function normalizeTrendSeries(series: unknown) {
  const parsed = safeJsonParse(series)
  const nestedSeries = isRecord(parsed) ? seriesKeys.find((key) => Array.isArray(safeJsonParse(parsed[key]))) : undefined

  if (isRecord(parsed) && nestedSeries) return normalizeTrendSeries(parsed[nestedSeries])
  if (!Array.isArray(parsed)) return []

  const points = parsed
    .map(pointValue)
    .filter((value): value is number => value !== null)
    .slice(-INDICATOR_TREND_POINT_COUNT)

  return points.length >= 2 ? points : []
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

  const points = normalizeTrendSeries(series)
  if (points.length >= 2) {
    result[url] = points
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

export function indicatorTrendTone(indicator: Pick<Indicator, 'change' | 'trend'>): IndicatorTrendTone {
  if (indicator.trend.length >= 2) {
    return indicator.trend[indicator.trend.length - 1] < indicator.trend[0] ? 'red' : 'green'
  }

  return indicator.change < 0 ? 'red' : 'green'
}

import type { IndicatorChartData, IndicatorChartDataRow, IndicatorSeasonalityChartData, IndicatorSeasonalityPoint } from './indicator.types'

const trendReltrendSuffix = '_trend_reltrend'
const trendSuffix = '_trend'
const reltrendSuffix = '_reltrend'
const volatilitySuffix = '_volatility'
const volatility60dSuffix = '_volatility_60d'
const volatility20dKey = 'volatility_20d'
const volatility60dKey = 'volatility_60d'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function pointArray(value: unknown): IndicatorSeasonalityPoint[] {
  return Array.isArray(value) ? (value as IndicatorSeasonalityPoint[]) : []
}

export function isIndicatorSeasonalityChartData(value: unknown): value is IndicatorSeasonalityChartData {
  if (!isRecord(value)) return false

  return (
    Array.isArray(value.day_of_year) ||
    Array.isArray(value.current_day_of_year) ||
    Array.isArray(value.month)
  )
}

export function normalizeIndicatorSeasonalityChartData(value: unknown): IndicatorSeasonalityChartData | null {
  if (!isIndicatorSeasonalityChartData(value)) return null

  return {
    day_of_year: pointArray(value.day_of_year),
    current_day_of_year: pointArray(value.current_day_of_year),
    month: pointArray(value.month),
  }
}

export function isSeasonalityIndicatorType(value: unknown) {
  return String(value ?? '').toLowerCase().includes('seasonality')
}

function standaloneDetailSeriesKeys(id: string) {
  const normalizedId = id.toLowerCase()

  if (normalizedId.endsWith(trendReltrendSuffix)) {
    const prefix = normalizedId.slice(0, -trendReltrendSuffix.length)
    return new Set([`${prefix}${trendSuffix}`, `${prefix}${reltrendSuffix}`])
  }

  if (normalizedId.endsWith(volatility60dSuffix)) {
    return new Set([normalizedId, volatility60dKey])
  }

  if (normalizedId.endsWith(volatilitySuffix)) {
    return new Set([normalizedId, volatility20dKey])
  }

  if (normalizedId.endsWith(trendSuffix) || normalizedId.endsWith(reltrendSuffix)) {
    return new Set([normalizedId])
  }

  return new Set<string>()
}

function isStandaloneDetailSeriesKey(key: string) {
  const lower = key.toLowerCase()
  return (
    lower === volatility20dKey ||
    lower === volatility60dKey ||
    lower.endsWith(trendSuffix) ||
    lower.endsWith(reltrendSuffix) ||
    lower.endsWith(volatilitySuffix) ||
    lower.endsWith(volatility60dSuffix)
  )
}

function chartDataKeys(rows: IndicatorChartDataRow[]) {
  return Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
}

export function pruneStandaloneDetailChartData(id: string, data: IndicatorChartData): IndicatorChartData {
  if (!Array.isArray(data)) return data

  const desiredKeys = standaloneDetailSeriesKeys(id)
  if (!desiredKeys.size) return data

  const keys = chartDataKeys(data)
  const hasDesiredSeries = keys.some((key) => desiredKeys.has(key.toLowerCase()))
  if (!hasDesiredSeries) return data

  const extraSeriesKeys = keys.filter((key) => isStandaloneDetailSeriesKey(key) && !desiredKeys.has(key.toLowerCase()))
  if (!extraSeriesKeys.length) return data

  return data.map((row) => {
    const next = { ...row }
    for (const key of extraSeriesKeys) {
      delete next[key]
    }
    return next
  })
}

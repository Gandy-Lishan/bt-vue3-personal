import type { IndicatorSeasonalityChartData, IndicatorSeasonalityPoint } from './indicator.types'

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

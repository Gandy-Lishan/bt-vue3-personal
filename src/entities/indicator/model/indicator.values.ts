import { formatIndicatorDate, indicatorDateTimestamp, rawIndicatorDate } from './indicator.dates'
import type { Indicator, IndicatorSortDirection } from './indicator.types'
import type { IndicatorTableColumn, IndicatorTableColumnKind } from './indicator.table'

export function indicatorRawValue(indicator: Indicator, key: string) {
  const raw = indicator.raw ?? {}
  if (raw[key] !== undefined && raw[key] !== null && raw[key] !== '') return raw[key]

  const fallbacks: Record<string, unknown> = {
    chart_name: indicator.name,
    name: indicator.name,
    groups: indicator.group,
    sub_type: indicator.subgroup,
    timeframe: indicator.timeFrame,
    last_value: indicator.currentValue,
    last_change: indicator.change,
    last_update: indicator.updatedAt,
    sentiment: indicator.sentimentScore,
    type: indicator.type,
    market_symbol: indicator.marketSymbol,
    url: indicator.id,
    symbol: indicator.id,
  }

  return fallbacks[key]
}

export function parseIndicatorNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const numeric = Number(String(value).replace('%', ''))
  return Number.isFinite(numeric) ? numeric : null
}

export function formatIndicatorNumber(value: unknown) {
  const numeric = parseIndicatorNumber(value)
  if (numeric === null) return '—'
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2)
}

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/[A-Za-z]+/g, (word) => {
    if (word === word.toUpperCase()) return word
    return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`
  })
}

export function isIndicatorGroupColumn(column: IndicatorTableColumn) {
  const label = column.label.trim().toLowerCase()
  return ['group', 'groups', 'sub type'].includes(label) && ['sub_type', 'groups'].includes(column.key)
}

function hasPercentChange(indicator: Indicator, column: IndicatorTableColumn) {
  return column.key === 'last_change' && String(indicator.raw?.last_change_type ?? '').toLowerCase() === 'percent'
}

export function displayIndicatorTimeFrame(value: unknown) {
  const text = String(value ?? '').trim().replace(/-/g, ' ')
  if (!text) return '—'
  if (['Short to Intermediate', 'Intermediate to Long', 'Intermediate', 'Medium Term'].includes(text)) return 'Medium'
  if (text === 'Short Term') return 'Short'
  if (text === 'Long Term') return 'Long'
  return text.replace(/\s+Term$/i, '')
}

export function displayIndicatorValue(indicator: Indicator, column: IndicatorTableColumn) {
  const value = column.key === 'timeframe' ? indicator.timeFrame : indicatorRawValue(indicator, column.key)

  if (column.kind === 'date') return column.rawDate ? rawIndicatorDate(value) : formatIndicatorDate(value)
  if (column.kind === 'number') return formatIndicatorNumber(value)
  if (column.kind === 'change') {
    const formatted = formatIndicatorNumber(value)
    if (formatted === '—' || !hasPercentChange(indicator, column)) return formatted
    return formatted.endsWith('%') ? formatted : `${formatted}%`
  }

  if (value === undefined || value === null || value === '') return '—'

  const text = String(value)
  if (column.key === 'timeframe') return displayIndicatorTimeFrame(text)
  if (isIndicatorGroupColumn(column)) return titleCase(text)
  return column.uppercase ? text.toUpperCase() : text
}

export function displayIndicatorGroup(indicator: Indicator, columns: IndicatorTableColumn[] = []) {
  const groupColumn = columns.find(isIndicatorGroupColumn)
  if (groupColumn) return displayIndicatorValue(indicator, groupColumn)

  const type = String(indicatorRawValue(indicator, 'type') ?? '').trim()
  if (type && type.toLowerCase() !== 'indicator') return titleCase(type)

  return titleCase(String(indicatorRawValue(indicator, 'groups') ?? indicator.group))
}

export function indicatorSortValue(indicator: Indicator, key: string, kind: IndicatorTableColumnKind = 'text') {
  if (kind === 'sentiment') return indicator.sentimentScore

  const value = indicatorRawValue(indicator, key)
  if (kind === 'number' || kind === 'change') return parseIndicatorNumber(value)
  if (kind === 'date') return indicatorDateTimestamp(value)

  if (value === undefined || value === null || value === '') return null
  return String(value).toLocaleLowerCase()
}

export function compareSortValues(
  left: string | number | null,
  right: string | number | null,
  direction: IndicatorSortDirection,
) {
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1

  const compared =
    typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' })

  return direction === 'asc' ? compared : -compared
}

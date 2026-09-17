import { displayIndicatorValue } from './indicator.values'
import type { IndicatorTableColumn } from './indicator.table'
import type { Indicator } from './indicator.types'

/**
 * The trend column is a sparkline — a mini chart rather than data — so it is left out
 * of the export. Everything else exports with the same value the table renders.
 */
function isExportableColumn(column: IndicatorTableColumn) {
  return column.kind !== 'sparkline'
}

/**
 * The table draws sentiment as a meter (and a legend explains the 1-7 scale), so the
 * numeric score is exported rather than the value `displayIndicatorValue` would give.
 */
export function indicatorCsvValue(indicator: Indicator, column: IndicatorTableColumn) {
  if (column.kind === 'sentiment') return indicator.sentimentScore
  return displayIndicatorValue(indicator, column)
}

export function indicatorCsvTable(indicators: Indicator[], columns: IndicatorTableColumn[]) {
  const exportableColumns = columns.filter(isExportableColumn)

  return {
    headers: exportableColumns.map((column) => column.label),
    rows: indicators.map((indicator) =>
      exportableColumns.map((column) => indicatorCsvValue(indicator, column)),
    ),
  }
}

export function indicatorCsvFilename(label: string, isoDate: string) {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug || 'indicators'}-${isoDate}.csv`
}

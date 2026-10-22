export interface WatchListColumn {
  indicator: string
  bar: number
}

export interface WatchListRecord {
  url: string
  name: string
  tickers: string[]
  columns: WatchListColumn[]
  updatedAt: string
}

export interface WatchListPriceRecord {
  Close?: number | null
  Optix?: number | null
  Trend?: number | null
  RelTrend?: number | null
  'Historical Volatility (20-Day)'?: number | null
  'Historical Volatility (60-Day)'?: number | null
}

export interface WatchListTickerResult {
  optixUrl: string
  name: string
  records: WatchListPriceRecord[]
}

export type WatchListResult = Record<string, WatchListTickerResult>

export interface WatchListPreviewColumn extends WatchListColumn {
  key: string
  label: string
}

export interface WatchListPreviewRow {
  Ticker: string
  Name: string
  Close: number | null
  optixUrl: string
  [key: string]: string | number | null
}

export interface WatchListHeatmapGroup {
  name: string
  points: Array<{ ticker: string; value: number; url: string }>
}

export const WATCH_LIST_INDICATORS = [
  { value: 'Trend Score', label: 'Trend Score', bar: 1 },
  { value: 'RelTrend Score', label: 'RelTrend Score', bar: 1 },
  { value: 'Optix', label: 'Optix', bar: 1 },
  { value: 'ROC', label: 'Rate of Change', bar: 1 },
  { value: 'HV20', label: 'Historical Volatility (20-Day)', bar: 20 },
  { value: 'HV60', label: 'Historical Volatility (60-Day)', bar: 60 },
  { value: 'Optix MA5', label: 'Symbol Optix 5-Day Moving Average', bar: 5 },
  { value: 'Optix MA10', label: 'Symbol Optix 10-Day Moving Average', bar: 10 },
  { value: 'Optix MA20', label: 'Symbol Optix 21-Day Moving Average', bar: 21 },
  { value: 'Optix MA63', label: 'Symbol Optix 63-Day Moving Average', bar: 63 },
  { value: 'Close MA5', label: 'Symbol Close 5-Day Moving Average', bar: 5 },
  { value: 'Close MA10', label: 'Symbol Close 10-Day Moving Average', bar: 10 },
  { value: 'Close MA21', label: 'Symbol Close 21-Day Moving Average', bar: 21 },
  { value: 'Close MA63', label: 'Symbol Close 63-Day Moving Average', bar: 63 },
  { value: 'Close MA126', label: 'Symbol Close 126-Day Moving Average', bar: 126 },
  { value: 'Close MA252', label: 'Symbol Close 252-Day Moving Average', bar: 252 },
  { value: 'ROC5', label: '5-Day Rate of Change', bar: 5 },
  { value: 'ROC10', label: '10-Day Rate of Change', bar: 10 },
  { value: 'ROC21', label: '21-Day Rate of Change', bar: 21 },
  { value: 'ROC63', label: '63-Day Rate of Change', bar: 63 },
  { value: 'ROC126', label: '126-Day Rate of Change', bar: 126 },
  { value: 'ROC252', label: '252-Day Rate of Change', bar: 252 },
] as const

function finiteNumbers(values: Array<number | null | undefined>) {
  return values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
}

function average(values: number[], bars: number) {
  if (bars < 1 || values.length < bars) return null
  const slice = values.slice(-bars)
  return Number((slice.reduce((sum, value) => sum + value, 0) / bars).toFixed(2))
}

function rateOfChange(values: number[], bars: number) {
  if (bars < 1 || values.length <= bars) return null
  const current = values.at(-1)
  const previous = values.at(-(bars + 1))
  if (current === undefined || previous === undefined || previous === 0) return null
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(2))
}

export function indicatorLabel(column: WatchListColumn) {
  const option = WATCH_LIST_INDICATORS.find((item) => item.value === column.indicator)
  return option?.label ?? column.indicator
}

export function buildWatchListPreview(result: WatchListResult, columns: WatchListColumn[]) {
  const previewColumns: WatchListPreviewColumn[] = columns.map((column, index) => ({
    ...column,
    key: `${column.indicator}-${column.bar}-${index}`,
    label: indicatorLabel(column),
  }))
  const heatmap = new Map<string, WatchListHeatmapGroup>()
  const rows: WatchListPreviewRow[] = []

  Object.entries(result).forEach(([ticker, tickerResult]) => {
    const records = tickerResult.records ?? []
    if (!records.length) return
    const closes = finiteNumbers(records.map((item) => item.Close))
    const optix = finiteNumbers(records.map((item) => item.Optix))
    const latest = records.at(-1) ?? {}
    const row: WatchListPreviewRow = {
      Ticker: ticker,
      Name: tickerResult.name,
      Close: closes.length ? Number((closes.at(-1) ?? 0).toFixed(2)) : null,
      optixUrl: tickerResult.optixUrl,
    }

    previewColumns.forEach((column) => {
      let value: number | null = null
      const indicator = column.indicator
      if (indicator === 'Trend Score') value = latest.Trend ?? null
      else if (indicator === 'RelTrend Score') value = latest.RelTrend ?? null
      else if (indicator === 'Optix') value = latest.Optix === null || latest.Optix === undefined ? null : Number(latest.Optix.toFixed(2))
      else if (indicator === 'HV20') value = latest['Historical Volatility (20-Day)'] ?? null
      else if (indicator === 'HV60') value = latest['Historical Volatility (60-Day)'] ?? null
      else if (indicator.startsWith('Optix MA')) value = average(optix, column.bar)
      else if (indicator.startsWith('Close MA')) value = average(closes, column.bar)
      else if (indicator.startsWith('ROC')) value = rateOfChange(closes, column.bar)
      row[column.key] = indicator.startsWith('ROC') && value !== null ? `${value}%` : value

      if (value !== null && ['Trend Score', 'RelTrend Score', 'Optix', 'HV20', 'HV60'].some((name) => indicator === name) || (value !== null && indicator.startsWith('Optix MA'))) {
        const groupName = column.label
        const group = heatmap.get(groupName) ?? { name: groupName, points: [] }
        group.points.push({ ticker, value, url: tickerResult.optixUrl })
        heatmap.set(groupName, group)
      }
    })
    rows.push(row)
  })

  return { columns: previewColumns, rows, heatmap: [...heatmap.values()] }
}

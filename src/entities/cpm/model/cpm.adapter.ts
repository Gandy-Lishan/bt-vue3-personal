import type {
  CpmBacktestRawRow,
  CpmBacktestRow,
  CpmCorrelationResult,
  CpmPatternPreviewPoint,
  CpmPatternPreviewResult,
  CpmRecentDataRow,
  CpmSortKey,
  CpmStatus,
} from './cpm.types'

export const CPM_PAGE_SIZE = 10

export const cpmSortOptions = [
  { key: 'name', label: 'Name', kind: 'text' },
  { key: 'symbol', label: 'Symbol', kind: 'text' },
  { key: 'timeframe', label: 'Timeframe', kind: 'text' },
  { key: 'status', label: 'Status', kind: 'text' },
  { key: 'barsNumber', label: 'Bars Number', kind: 'number' },
  { key: 'totalTrades', label: 'Total Trades', kind: 'number' },
  { key: 'totalReturn', label: 'Total Return', kind: 'number' },
  { key: 'createdAt', label: 'Created', kind: 'date' },
] as const

function text(value: unknown, fallback = '') {
  if (value === undefined || value === null) return fallback
  return String(value)
}

export function parseCpmNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = Number(String(value).replace(/[%,$]/g, '').trim())
  return Number.isFinite(parsed) ? parsed : null
}

export function formatCpmNumber(value: unknown, decimals = 1, trimTrailingZeros = false) {
  const number = parseCpmNumber(value)
  if (number === null) return '-'
  const formatted = number.toFixed(decimals)
  return trimTrailingZeros ? formatted.replace(/\.0+$/, '') : formatted
}

export function formatCpmPercent(value: unknown, decimals = 1) {
  const number = parseCpmNumber(value)
  if (number === null) return '-'
  return `${number.toFixed(decimals)}%`
}

export function normalizeCpmStatus(value: unknown): CpmStatus {
  const normalized = text(value).trim().toLowerCase()
  if (normalized === 'finish' || normalized === 'finished' || normalized === 'success') return 'Finish'
  if (normalized === 'running' || normalized === 'pending') return 'Running'
  if (normalized === 'fail' || normalized === 'failed' || normalized === 'error') return 'Fail'
  return 'Unknown'
}

export function normalizeCpmBacktestRow(raw: CpmBacktestRawRow, index = 0): CpmBacktestRow {
  const url = text(raw.url)
  const name = text(raw.name, url || `CPM ${index + 1}`)
  const startDate = text(raw.start_date)
  const endDate = text(raw.end_date)

  return {
    id: url || `${name}-${index}`,
    url,
    name,
    symbol: text(raw.symbol),
    timeframe: text(raw.timeframe),
    startDate,
    endDate,
    period: startDate && endDate ? `${startDate} - ${endDate}` : '-',
    status: normalizeCpmStatus(raw.status),
    barsNumber: parseCpmNumber(raw.bars_num),
    totalTrades: parseCpmNumber(raw.total_trades),
    totalReturn: parseCpmNumber(raw.total_return),
    createdAt: text(raw.create_date),
    raw,
  }
}

export function cpmSearchScore(row: CpmBacktestRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return 1

  const haystack = [row.name, row.symbol, row.timeframe, row.status, row.period].join(' ').toLowerCase()
  if (!haystack.includes(normalizedQuery)) return null
  if (row.name.toLowerCase().startsWith(normalizedQuery)) return 4
  if (row.symbol.toLowerCase().startsWith(normalizedQuery)) return 3
  return 2
}

export function cpmSortValue(row: CpmBacktestRow, key: string) {
  const sortKey = key as CpmSortKey
  if (sortKey === 'barsNumber') return row.barsNumber
  if (sortKey === 'totalTrades') return row.totalTrades
  if (sortKey === 'totalReturn') return row.totalReturn
  if (sortKey === 'createdAt') return row.createdAt ? new Date(row.createdAt).getTime() : null
  return String(row[sortKey] ?? '')
}

function extractArray(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
  return []
}

export function normalizeCpmCorrelationResult(payload: unknown): CpmCorrelationResult {
  const record = payload && typeof payload === 'object' && !Array.isArray(payload) ? (payload as Record<string, unknown>) : {}
  const data = record.data && typeof record.data === 'object' && !Array.isArray(record.data)
    ? (record.data as Record<string, unknown>)
    : record
  const code = parseCpmNumber(record.code)
  const message = text(record.message || record.detail)
  const matrixRows = extractArray(data.corr_matrix ?? data.corr_info ?? data.data)
  const seriesRows = extractArray(data.corr_roll ?? data.beta_roll ?? data.result)

  return {
    code,
    message,
    data,
    matrixRows,
    seriesRows,
  }
}

function timestampFromDate(value: unknown) {
  const date = text(value).trim()
  if (!date) return null
  const timestamp = Date.parse(`${date}T00:00:00Z`)
  return Number.isFinite(timestamp) ? timestamp : null
}

function extractStockRecentItems(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
  }
  if (!payload || typeof payload !== 'object') return []

  const record = payload as Record<string, unknown>
  if (Array.isArray(record.data)) return extractStockRecentItems(record.data)
  return [record]
}

function recentRowsForItem(item: Record<string, unknown> | undefined) {
  return Array.isArray(item?.data) ? (item.data as CpmRecentDataRow[]) : []
}

function patternPreviewMessage(value: unknown, hasPoints: boolean) {
  const message = text(value).trim()
  if (!message) return hasPoints ? '' : 'No pattern data found.'
  if (/execution failed|traceback|sql|syntax|pymysql|django/i.test(message)) {
    return 'No pattern data found for this symbol and pattern period.'
  }
  return message
}

export function normalizeCpmPatternPreviewRows(rows: CpmRecentDataRow[]): CpmPatternPreviewPoint[] {
  const datedRows = rows
    .map((row) => {
      const timestamp = timestampFromDate(row.Date)
      if (timestamp === null) return null
      return {
        row,
        date: text(row.Date),
        timestamp,
        close: parseCpmNumber(row.close),
        percentChange: parseCpmNumber(row.percent_change),
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => left.timestamp - right.timestamp)

  const firstClose = datedRows.find((item) => item.close !== null && item.close !== 0)?.close ?? null
  let cumulative = 1

  return datedRows.map((item) => {
    let normalizedReturn: number
    if (firstClose !== null && item.close !== null) {
      normalizedReturn = ((item.close / firstClose) - 1) * 100
    } else {
      cumulative *= 1 + ((item.percentChange ?? 0) / 100)
      normalizedReturn = (cumulative - 1) * 100
    }

    return {
      date: item.date,
      timestamp: item.timestamp,
      close: item.close,
      normalizedReturn,
    }
  })
}

export function normalizeCpmPatternPreviewPayload(payload: unknown, requestedSymbol = ''): CpmPatternPreviewResult {
  const items = extractStockRecentItems(payload)
  const requested = requestedSymbol.trim().toLowerCase()
  const exactMatch = requested ? items.find((item) => text(item.symbol).trim().toLowerCase() === requested) : undefined
  const selected =
    exactMatch && recentRowsForItem(exactMatch).length
      ? exactMatch
      : items.find((item) => recentRowsForItem(item).length) ?? exactMatch ?? items[0]
  const rows = recentRowsForItem(selected)
  const points = normalizeCpmPatternPreviewRows(rows)
  const message = patternPreviewMessage(selected?.error, points.length > 0)

  return {
    symbol: text(selected?.symbol, requestedSymbol),
    points,
    message,
  }
}

export function cpmCsvFilename(label: string, isoDate: string) {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'cpm'}-${isoDate}.csv`
}

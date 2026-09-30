import type {
  StrategyScopeKey,
  StrategyScopeOption,
  StrategySignalRow,
  StrategySignalSortKey,
  StrategySortKey,
  StrategySummaryRow,
  StrategySummarySortKey,
} from './strategy.types'

export type StrategySortableValue = string | number | null

const SCOPE_OPTIONS: StrategyScopeOption[] = [
  { key: 'all', label: 'All Strategies' },
  { key: 'legacy', label: 'Legacy Index', category: 'Legacy' },
  { key: 'index', label: 'Index', category: 'INDEX' },
  { key: 'bond', label: 'Bond', category: 'Bond' },
  { key: 'factors', label: 'Factors', category: 'Factors' },
  { key: 'sector', label: 'Sector', category: 'Sector' },
  { key: 'favorites', label: 'My Favorites' },
  { key: 'basket', label: 'My Strategies Basket' },
]

function safeJsonParse(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value.replace(/\bNaN\b/g, 'null'))
  } catch {
    return value
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function recordValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return null
}

function extractRowsPayload(payload: unknown): unknown[] {
  const parsed = safeJsonParse(payload)
  if (Array.isArray(parsed)) return parsed
  if (!isRecord(parsed)) return []

  const direct = safeJsonParse(parsed.data ?? parsed.content ?? parsed.rows ?? parsed.result)
  if (Array.isArray(direct)) return direct
  if (isRecord(direct)) {
    const nested = safeJsonParse(direct.data ?? direct.content ?? direct.rows ?? direct.result)
    if (Array.isArray(nested)) return nested
  }

  return []
}

function text(value: unknown, fallback = '') {
  const next = String(value ?? '').trim()
  return next || fallback
}

export function parseStrategyNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const normalized = String(value).replace(/[$,%]/g, '').replace(/,/g, '').trim()
  if (!normalized || normalized === '-' || normalized.toLowerCase() === 'nan') return null
  const numeric = Number(normalized)
  return Number.isFinite(numeric) ? numeric : null
}

function numberFromRecord(record: Record<string, unknown>, keys: string[]) {
  return parseStrategyNumber(recordValue(record, keys))
}

function normalizeDate(value: unknown) {
  if (value === undefined || value === null || value === '') return { label: '', timestamp: null }
  const input = String(value).trim()
  const parsed = /^\d+$/.test(input) ? Number(input) : value
  const date = new Date(parsed as string | number | Date)
  if (Number.isNaN(date.getTime())) return { label: input, timestamp: null }

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return { label: `${year}-${month}-${day}`, timestamp: date.getTime() }
}

function normalizeBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

export function normalizeStrategySignalRows(payload: unknown): StrategySignalRow[] {
  return extractRowsPayload(payload)
    .filter(isRecord)
    .map((raw, index) => {
      const modelName = text(recordValue(raw, ['model_name', 'modelName', 'name']), '')
      if (!modelName) return null

      const url = text(recordValue(raw, ['url', 'model', 'model_url', 'modelUrl']), modelName)
      const lastSignalDate = normalizeDate(recordValue(raw, ['date', 'lastSignalDate', 'Last Signal Date']))

      return {
        id: `${url || modelName}-${index}`,
        modelName,
        url,
        category: text(recordValue(raw, ['category', '_category']), ''),
        timeFrame: text(recordValue(raw, ['type', 'timeFrame', 'time_frame']), '—'),
        currentSignal: text(recordValue(raw, ['current_state', 'currentSignal', 'signal']), '—'),
        lastSignalDate: lastSignalDate.label || '—',
        lastSignalTimestamp: lastSignalDate.timestamp,
        frequency: text(recordValue(raw, ['update_frequency', 'frequency']), '—'),
        ytdReturn: numberFromRecord(raw, ['YTD_return', 'ytdReturn', 'YTD Return']),
        cagr: numberFromRecord(raw, ['CAGR', 'cagr']),
        favorite: normalizeBoolean(recordValue(raw, ['favorite', 'is_favorite', 'isFavorite'])),
        currentDay: normalizeBoolean(recordValue(raw, ['current_day', 'currentDay'])),
        updated: text(recordValue(raw, ['updated', 'update_date']), ''),
        raw,
      } satisfies StrategySignalRow
    })
    .filter((row): row is StrategySignalRow => row !== null)
    .sort((left, right) => (right.lastSignalTimestamp ?? 0) - (left.lastSignalTimestamp ?? 0))
}

export function strategySignalMap(rows: StrategySignalRow[]) {
  const map = new Map<string, StrategySignalRow>()
  for (const row of rows) map.set(row.url, row)
  return map
}

export function normalizeStrategySummaryRows(
  payload: unknown,
  signalRows: StrategySignalRow[] = [],
): StrategySummaryRow[] {
  const signalsByUrl = strategySignalMap(signalRows)

  return extractRowsPayload(payload)
    .filter(isRecord)
    .map((raw, index) => {
      const url = text(recordValue(raw, ['model', 'url', 'model_url', 'modelUrl']), '')
      const linked = url ? signalsByUrl.get(url) : undefined
      const modelName = text(recordValue(raw, ['model_name', 'modelName', 'name']), linked?.modelName ?? '')
      if (!modelName) return null

      return {
        id: `${url || modelName}-${index}`,
        modelName,
        url: url || linked?.url || modelName,
        category: text(recordValue(raw, ['category', '_category']), linked?.category ?? ''),
        favorite: normalizeBoolean(recordValue(raw, ['favorite', 'is_favorite', 'isFavorite']) ?? linked?.favorite),
        cagr: numberFromRecord(raw, ['CAGR', 'cagr']),
        benchmarkCagr: numberFromRecord(raw, ['benchmark_CAGR', 'benchmarkCagr']),
        netProfit: numberFromRecord(raw, ['net_profit_pct', 'netProfit']),
        maxDrawdown: numberFromRecord(raw, ['max_drawdown', 'maxDrawdown']),
        sharpeRatio: numberFromRecord(raw, ['sharp_ratio', 'sharpeRatio']),
        profitLossRatio: numberFromRecord(raw, ['profit_loss_ratio', 'profitLossRatio']),
        averageWin: numberFromRecord(raw, ['average_win', 'averageWin']),
        averageLoss: numberFromRecord(raw, ['average_loss', 'averageLoss']),
        totalTrades: numberFromRecord(raw, ['total_trades', 'totalTrades']),
        winRate: numberFromRecord(raw, ['win_rate_pct', 'winRate']),
        raw,
      } satisfies StrategySummaryRow
    })
    .filter((row): row is StrategySummaryRow => row !== null)
}

export function strategyScopeOptions(rows: StrategySignalRow[]): StrategyScopeOption[] {
  return SCOPE_OPTIONS.map((scope) => {
    if (scope.key === 'all') return { ...scope, count: rows.length }
    if (scope.key === 'favorites') return { ...scope, count: rows.filter((row) => row.favorite).length }
    if (scope.key === 'basket') return { ...scope, count: 0 }
    return { ...scope, count: rows.filter((row) => row.category === scope.category).length }
  })
}

export function strategyScopeTitle(scope: StrategyScopeKey) {
  if (scope === 'favorites') return 'My Favorite Strategies'
  if (scope === 'basket') return 'My Strategies Basket'
  const option = SCOPE_OPTIONS.find((item) => item.key === scope)
  if (!option || scope === 'all') return 'Strategies'
  return `${option.label} Strategies`
}

export function strategyScopeDescription(scope: StrategyScopeKey, count: number) {
  if (scope === 'favorites') return `${count} strategies in your favorites`
  if (scope === 'basket') return 'Strategies selected for your basket.'
  return `${count} strategies in this scope`
}

export function matchesStrategyScope(row: { category: string; favorite: boolean }, scope: StrategyScopeKey) {
  if (scope === 'all') return true
  if (scope === 'favorites') return row.favorite
  if (scope === 'basket') return false
  const option = SCOPE_OPTIONS.find((item) => item.key === scope)
  return Boolean(option?.category && row.category === option.category)
}

export function strategySearchScore(row: { modelName: string; category: string }, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return 0

  const targets = [row.modelName, row.category].map((value) => value.toLowerCase()).filter(Boolean)
  if (targets.some((target) => target === normalizedQuery)) return 1000
  if (targets.some((target) => target.startsWith(normalizedQuery))) return 800

  const indexes = targets.map((target) => target.indexOf(normalizedQuery)).filter((index) => index >= 0)
  if (!indexes.length) return null
  return 600 - Math.min(...indexes)
}

export function strategySignalSortValue(row: StrategySignalRow, key: StrategySignalSortKey): StrategySortableValue {
  if (key === 'modelName') return row.modelName.toLowerCase()
  if (key === 'timeFrame') return row.timeFrame.toLowerCase()
  if (key === 'currentSignal') return row.currentSignal.toLowerCase()
  if (key === 'lastSignalDate') return row.lastSignalTimestamp
  if (key === 'frequency') return row.frequency.toLowerCase()
  if (key === 'ytdReturn') return row.ytdReturn
  if (key === 'cagr') return row.cagr
  return null
}

export function strategySummarySortValue(row: StrategySummaryRow, key: StrategySummarySortKey): StrategySortableValue {
  if (key === 'modelName') return row.modelName.toLowerCase()
  if (key === 'cagr') return row.cagr
  if (key === 'benchmarkCagr') return row.benchmarkCagr
  if (key === 'netProfit') return row.netProfit
  if (key === 'maxDrawdown') return row.maxDrawdown
  if (key === 'sharpeRatio') return row.sharpeRatio
  if (key === 'profitLossRatio') return row.profitLossRatio
  if (key === 'averageWin') return row.averageWin
  if (key === 'averageLoss') return row.averageLoss
  if (key === 'totalTrades') return row.totalTrades
  if (key === 'winRate') return row.winRate
  return null
}

export function formatStrategyNumber(value: number | null, decimals = 2) {
  if (value === null) return '—'
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatStrategyPercent(value: number | null, decimals = 2) {
  if (value === null) return '—'
  return `${formatStrategyNumber(value, decimals)}%`
}

export function formatStrategyInteger(value: number | null) {
  if (value === null) return '—'
  return Math.round(value).toLocaleString('en-US')
}

export function strategyLastMonthEndLabel(date = new Date()) {
  const value = new Date(date.getFullYear(), date.getMonth(), 0)
  return value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function strategySignalCsvTable(rows: StrategySignalRow[], ytdLabel: string) {
  return {
    headers: [
      'Model Name',
      'Time Frame',
      'Current Signal',
      'Last Signal Date',
      'Frequency',
      `YTD Return (%) as of ${ytdLabel}`,
      'CAGR (%) since Jul 1, 2006',
      'Favorite',
    ],
    rows: rows.map((row) => [
      row.modelName,
      row.timeFrame,
      row.currentSignal,
      row.lastSignalDate,
      row.frequency,
      row.ytdReturn ?? '',
      row.cagr ?? '',
      row.favorite ? 'Yes' : 'No',
    ]),
  }
}

export function strategySummaryCsvTable(rows: StrategySummaryRow[]) {
  return {
    headers: [
      'Model Name',
      'Strategy CAGR (%)',
      'Benchmark CAGR (%)',
      'Net Profit (%)',
      'Max Drawdown (%)',
      'Sharpe Ratio',
      'P/L Ratio',
      'Avg Win (%)',
      'Avg Loss (%)',
      'Trades',
      'Win Rate (%)',
    ],
    rows: rows.map((row) => [
      row.modelName,
      row.cagr ?? '',
      row.benchmarkCagr ?? '',
      row.netProfit ?? '',
      row.maxDrawdown ?? '',
      row.sharpeRatio ?? '',
      row.profitLossRatio ?? '',
      row.averageWin ?? '',
      row.averageLoss ?? '',
      row.totalTrades ?? '',
      row.winRate ?? '',
    ]),
  }
}

export function isStrategySortKey(key: string): key is StrategySortKey {
  return Boolean(key)
}

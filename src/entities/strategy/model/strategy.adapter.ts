import type {
  StrategyScopeKey,
  StrategyScopeOption,
  StrategyDetail,
  StrategyChartSeries,
  StrategyPairPriceRow,
  StrategyPerformanceRow,
  StrategyRow,
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

function normalizeDateLabel(value: unknown) {
  return normalizeDate(value).label
}

function normalizeBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

export function normalizeStrategySignalDates(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(normalizeDateLabel).filter(Boolean)
  }

  const input = text(value)
  if (!input) return []

  try {
    const parsed = JSON.parse(input.replace(/'/g, '"'))
    if (Array.isArray(parsed)) return parsed.map(normalizeDateLabel).filter(Boolean)
  } catch {
    // Fall back to extracting ISO date tokens from Python-style list strings.
  }

  return Array.from(new Set(input.match(/\d{4}-\d{2}-\d{2}/g) ?? []))
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

export function normalizeStrategyDescriptionHtml(value: unknown) {
  return text(value)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/<a\s+([^>]*href=["'])([^"']+)(["'][^>]*)>/gi, (_match, beforeHref, href, afterHref) => {
      return `<a ${beforeHref}${normalizeStrategyDescriptionHref(href)}${afterHref}>`
    })
}

function strategySlugFromPath(pathname: string) {
  const slug = decodeURIComponent(pathname).replace(/^\/+|\/+$/g, '')
  if (!slug || slug.includes('/') || !slug.includes('_')) return ''
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(slug)) return ''
  return slug
}

function normalizeStrategyDescriptionHref(href: string) {
  const trimmed = href.trim()
  if (!trimmed || trimmed.startsWith('#')) return trimmed
  if (/^(?:javascript|data):/i.test(trimmed)) return '#'
  if (/^(?:mailto|tel):/i.test(trimmed)) return trimmed
  if (/^\/\//.test(trimmed)) return trimmed

  try {
    const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(trimmed)
    const parsed = new URL(trimmed, 'http://localhost:5173')

    if (isAbsolute && !['localhost', '127.0.0.1'].includes(parsed.hostname.toLowerCase())) {
      return trimmed
    }

    if (parsed.pathname === '/strategy/descriptions') return `${parsed.pathname}${parsed.search}${parsed.hash}`

    const slug = strategySlugFromPath(parsed.pathname)
    if (!slug) return trimmed
    return `/strategy/descriptions?url=${encodeURIComponent(slug)}`
  } catch {
    return trimmed
  }
}

function normalizeProfitLossRatio(value: unknown) {
  const number = parseStrategyNumber(value)
  if (number === -1) return 'Low risk'
  return number
}

export function normalizeStrategyPerformanceRows(
  payload: unknown,
  signalRows: StrategySignalRow[] = [],
  fallbackName = '',
): StrategyPerformanceRow[] {
  const signalsByUrl = strategySignalMap(signalRows)

  return extractRowsPayload(payload)
    .filter(isRecord)
    .map((raw, index) => {
      const model = text(recordValue(raw, ['model', 'url', 'model_url', 'modelUrl']), '')
      const linked = model ? signalsByUrl.get(model) : undefined
      const modelName = text(recordValue(raw, ['model_name', 'modelName', 'name']), linked?.modelName ?? fallbackName)
      if (!model && !modelName) return null

      const startDate = normalizeDate(recordValue(raw, ['start_date', 'startDate']))
      const endDate = normalizeDate(recordValue(raw, ['end_date', 'endDate']))
      const symbolNotLong = text(recordValue(raw, ['symbol_not_long', 'symbolNotLong']), 'CASH')

      return {
        id: `${model || modelName}-${symbolNotLong}-${index}`,
        model: model || linked?.url || modelName,
        modelName,
        symbolNotLong,
        startDate: startDate.label || '—',
        startTimestamp: startDate.timestamp,
        endDate: endDate.label || '—',
        endTimestamp: endDate.timestamp,
        cagr: numberFromRecord(raw, ['CAGR', 'cagr']),
        benchmarkCagr: numberFromRecord(raw, ['benchmark_CAGR', 'benchmarkCagr']),
        maxDrawdown: numberFromRecord(raw, ['max_drawdown', 'maxDrawdown']),
        netProfit: numberFromRecord(raw, ['net_profit_pct', 'netProfit']),
        expectancy: numberFromRecord(raw, ['expectancy', 'Expectancy']),
        sharpeRatio: numberFromRecord(raw, ['sharp_ratio', 'sharpeRatio']),
        informationRatio: numberFromRecord(raw, ['info_ratio', 'informationRatio']),
        profitLossRatio: normalizeProfitLossRatio(recordValue(raw, ['profit_loss_ratio', 'profitLossRatio'])),
        averageWin: numberFromRecord(raw, ['average_win', 'averageWin']),
        averageLoss: numberFromRecord(raw, ['average_loss', 'averageLoss']),
        totalTrades: numberFromRecord(raw, ['total_trades', 'totalTrades']),
        winRate: numberFromRecord(raw, ['win_rate_pct', 'winRate']),
        tradesPerYear: numberFromRecord(raw, ['trades_per_year', 'tradesPerYear']),
        ytdReturn: numberFromRecord(raw, ['YTD_return', 'ytdReturn', 'YTD Return']),
        tradeTableUrl: text(recordValue(raw, ['trade_table_outfile', 'tradeTableUrl']), ''),
        returnsUrl: text(recordValue(raw, ['returns_outfile', 'returnsUrl']), ''),
        drawdownUrl: text(recordValue(raw, ['drawdown_outfile', 'drawdownUrl']), ''),
        heatmapUrl: text(recordValue(raw, ['heatmap_outfile', 'heatmapUrl']), ''),
        annualReturnsUrl: text(recordValue(raw, ['annual_returns_outfile', 'annualReturnsUrl']), ''),
        descriptionHtml: normalizeStrategyDescriptionHtml(recordValue(raw, ['description', 'descriptionHtml'])),
        symbol1: text(recordValue(raw, ['symbol1', 'symbol_1']), ''),
        symbol2: text(recordValue(raw, ['symbol2', 'symbol_2']), ''),
        singleModel: text(recordValue(raw, ['single_model', 'singleModel']), ''),
        buySignal1: normalizeStrategySignalDates(recordValue(raw, ['buy_signal_1', 'buySignal1'])),
        sellSignal1: normalizeStrategySignalDates(recordValue(raw, ['sell_signal_1', 'sellSignal1'])),
        buySignal2: normalizeStrategySignalDates(recordValue(raw, ['buy_signal_2', 'buySignal2'])),
        sellSignal2: normalizeStrategySignalDates(recordValue(raw, ['sell_signal_2', 'sellSignal2'])),
        raw,
      } satisfies StrategyPerformanceRow
    })
    .filter((row): row is StrategyPerformanceRow => row !== null)
}

export function normalizeStrategyDetail(
  payload: unknown,
  options: {
    url: string
    name?: string
    signals?: StrategySignalRow[]
    summaries?: StrategySummaryRow[]
  },
): StrategyDetail {
  const performances = normalizeStrategyPerformanceRows(payload, options.signals ?? [], options.name ?? '')
  const signal =
    options.signals?.find((row) => row.url === options.url || row.modelName === options.name) ??
    null
  const summary =
    options.summaries?.find((row) => row.url === options.url || row.modelName === options.name) ??
    null
  const firstPerformance = performances[0]

  return {
    url: options.url || firstPerformance?.model || signal?.url || summary?.url || '',
    modelName: options.name || signal?.modelName || summary?.modelName || firstPerformance?.modelName || options.url,
    descriptionHtml: firstPerformance?.descriptionHtml || normalizeStrategyDescriptionHtml(signal?.raw.description),
    signal,
    summary,
    performances,
  }
}

function emptySummaryFromSignal(signal: StrategySignalRow): StrategySummaryRow {
  return {
    id: `${signal.id}-summary`,
    modelName: signal.modelName,
    url: signal.url,
    category: signal.category,
    favorite: signal.favorite,
    cagr: signal.cagr,
    benchmarkCagr: null,
    netProfit: null,
    maxDrawdown: null,
    sharpeRatio: null,
    profitLossRatio: null,
    averageWin: null,
    averageLoss: null,
    totalTrades: null,
    winRate: null,
    raw: {},
  }
}

export function mergeStrategyRows(signalRows: StrategySignalRow[], summaryRows: StrategySummaryRow[]): StrategyRow[] {
  const summariesByUrl = new Map(summaryRows.map((row) => [row.url, row]))

  return signalRows.map((signal) => {
    const summary = summariesByUrl.get(signal.url) ?? emptySummaryFromSignal(signal)
    return {
      id: signal.id,
      modelName: signal.modelName,
      url: signal.url,
      category: signal.category,
      favorite: signal.favorite,
      currentDay: signal.currentDay,
      signal,
      summary,
    }
  })
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

export function strategyRowSortValue(row: StrategyRow, key: StrategySortKey): StrategySortableValue {
  if (key === 'modelName') return row.modelName.toLowerCase()
  if (key === 'timeFrame') return row.signal.timeFrame.toLowerCase()
  if (key === 'currentSignal') return row.signal.currentSignal.toLowerCase()
  if (key === 'lastSignalDate') return row.signal.lastSignalTimestamp
  if (key === 'frequency') return row.signal.frequency.toLowerCase()
  if (key === 'ytdReturn') return row.signal.ytdReturn
  if (key === 'cagr') return row.signal.cagr ?? row.summary.cagr
  if (key === 'benchmarkCagr') return row.summary.benchmarkCagr
  if (key === 'netProfit') return row.summary.netProfit
  if (key === 'maxDrawdown') return row.summary.maxDrawdown
  if (key === 'sharpeRatio') return row.summary.sharpeRatio
  if (key === 'profitLossRatio') return row.summary.profitLossRatio
  if (key === 'averageWin') return row.summary.averageWin
  if (key === 'averageLoss') return row.summary.averageLoss
  if (key === 'totalTrades') return row.summary.totalTrades
  if (key === 'winRate') return row.summary.winRate
  return null
}

export function normalizeStrategyPairPriceRows(payload: unknown): StrategyPairPriceRow[] {
  return extractRowsPayload(payload)
    .filter(isRecord)
    .map((raw, index) => {
      const date = normalizeDate(recordValue(raw, ['DT', 'date', 'Date']))
      const close = numberFromRecord(raw, ['Close', 'close'])
      if (!date.label || date.timestamp === null || close === null) return null

      return {
        id: `${date.label}-${index}`,
        date: date.label,
        timestamp: date.timestamp,
        close,
        raw,
      } satisfies StrategyPairPriceRow
    })
    .filter((row): row is StrategyPairPriceRow => row !== null)
}

export function strategyChartSeriesFromPrices(
  symbol: string,
  prices: StrategyPairPriceRow[],
  buySignals: string[],
  sellSignals: string[],
): StrategyChartSeries | null {
  if (!symbol || !prices.length) return null

  const buyDates = new Set(buySignals)
  const sellDates = new Set(sellSignals)

  return {
    symbol,
    points: prices.map((row) => [
      row.timestamp,
      row.close,
      buyDates.has(row.date) ? 1 : null,
      sellDates.has(row.date) ? -1 : null,
    ]),
  }
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

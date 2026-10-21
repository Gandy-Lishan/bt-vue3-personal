import type {
  SmartScannerBacktestDetail,
  SmartScannerBacktestHistoryRow,
  SmartScannerChartPoint,
  SmartScannerDetailRequest,
  SmartScannerPeriodSummaryRow,
  SmartScannerRange,
  SmartScannerRangeDefinition,
  SmartScannerRangeKey,
  SmartScannerRow,
  SmartScannerSortKey,
  SmartScannerTradeRow,
} from './smart-scanner.types'

export type SmartScannerSortableValue = string | number | null

export const SMART_SCANNER_SIGNAL_LABELS: Record<string, string> = {
  "Symbol Close > its' MA200 and Optix MA5 < 35": 'Optix #1',
  "Symbol Close > its' MA200 and Optix < 30": 'Optix #2',
  'Optix MA10 < 30 and Optix < 20': 'Optix #3',
  "Symbol Close > its' MA200 and Optix MA5 > 43 After Below 35": 'Optix #5',
  "Symbol Close > its' MA200 and Optix MA10 > 43 After Below 35": 'Optix #6',
  "Symbol Close > its' MA200 and Optix > 43 After Below 30": 'Optix #7',
}

export const SMART_SCANNER_SIGNAL_DESCRIPTIONS: Record<string, string> = {
  MA: 'This strategy utilizes the crossover of closing prices and moving averages as trading signals. It can further specify the direction of trades and operating rules, such as determining long signals after a golden cross and short signals after a death cross.',
  MAGap: "This strategy determines trading signals by comparing the difference between the moving average of the current day and the previous day. It can further specify the direction of trades and operating rules, such as determining long signals after a golden cross and short signals after a death cross.",
  MACDHist: 'This strategy uses the crossover signals of the MACD histogram as trading signals. It can further specify the direction of trades and operating rules, such as determining long signals after a golden cross and short signals after a death cross.',
  MACDHistGap: "This strategy determines trading signals by comparing the difference between the MACDHist and the previous day's value. It can further specify the direction of trades and operating rules, such as determining long signals after a golden cross and short signals after a death cross.",
  'Hammer followed by a rise': "If the previous day's candlestick shows a long lower shadow, indicating support at the bottom, a long signal is generated when the price rises above a certain threshold after the opening.",
  'Shooting Star followed by a fall': "If the previous day's candlestick shows a long upper shadow, indicating resistance at the top, a short signal is generated when the price falls below a certain threshold after the opening.",
  'UpTrend Pattern': 'When the price surpasses the upward trendline connecting the peak points of an uptrend, it indicates a potential future rise and generates a long signal.',
  'DownTrend Pattern': 'When the price falls below the downward trendline connecting the trough points of a downtrend, it indicates a potential future decline and generates a short signal.',
  "Symbol Close > its' MA200 and Optix MA5 < 35": 'Stocks that are above their 200-day moving average with an Optix 5-day moving average less than 35.',
  "Symbol Close > its' MA200 and Optix < 30": 'Stocks that are above their 200-day moving average with an Optix less than 30.',
  'Optix #4': 'Stocks whose Optix crosses below 0.5.',
  'Optix MA10 < 30 and Optix < 20': "Optix indicators with a 10-day moving average less than 30 and that day's Optix value is less than 20.",
  "Symbol Close > its' MA200 and Optix MA5 > 43 After Below 35": 'Stocks that are above their 200-day moving average with an Optix 5-day moving average less than 35, then above 43.',
  "Symbol Close > its' MA200 and Optix MA10 > 43 After Below 35": 'Stocks that are above their 200-day moving average with an Optix 10-day moving average less than 35, then above 43.',
  "Symbol Close > its' MA200 and Optix > 43 After Below 30": 'Stocks that are above their 200-day moving average with an Optix less than 30, then above 43.',
  PriceBreakout: "When the closing price ranks above 0 relative to the past 21 trading days' closing prices, a golden cross occurs, indicating an upward breakout and generating a long signal.",
  HighPoints: 'When the highest price ranks above 100 relative to the past 13 trading days, it forms a 13-day new high and generates a long signal.',
  LowPoints: 'When the lowest price ranks below 0 relative to the past 13 trading days, it forms a 13-day new low and generates a short signal.',
  RSI: 'When RSI forms a golden cross above 40, it suggests recovery from an oversold state toward the midpoint and can indicate a potential long signal.',
  'Head and Shoulders Top': 'A head and shoulders top is a bearish reversal pattern formed by a left shoulder, head, right shoulder, and neckline.',
  'Head and Shoulders Bottom': 'A head and shoulders bottom is a bullish reversal pattern formed after a market decline, with the head as the deepest valley.',
  'Double Top': 'A double top is a reversal pattern shaped like the letter M, indicating that prices may fall.',
  'Double Bottom': 'A double bottom, also known as a W bottom, is a bullish reversal pattern formed by two similar lows.',
  'Triple Tap': 'Triple Tap refers to repeated bounces off a support line, often suggesting strong buying support near that level.',
  'Rounding Bottom': 'A rounding bottom is a U-shaped chart pattern that can signify a reversal in long-term price movement.',
  'Ascending Channel': 'An ascending channel contains price action between upward sloping parallel lines, with higher highs and higher lows.',
  'Descending Channel': 'A descending channel indicates a downward trend contained between downward sloping parallel lines.',
  'Symbol All-Time High': 'Symbol All-Time High is the highest closing price a symbol has reached in its trading history.',
  'Symbol All-Time Low': 'Symbol All-Time Low is the lowest closing price a symbol has reached in its trading history.',
  'Symbol 52-Week High': 'Symbol 52-Week High is the highest closing price at which a symbol has traded in the last 52 weeks.',
  'Symbol 52-Week Low': 'Symbol 52-Week Low is the lowest closing price at which a symbol has traded in the last 52 weeks.',
  'Symbol 4-Week High': 'Symbol 4-Week High is the highest closing price at which a symbol has traded in the last 4 weeks.',
  'Symbol 4-Week Low': 'Symbol 4-Week Low is the lowest closing price at which a symbol has traded in the last 4 weeks.',
  'Symbol 13-Week High': 'Symbol 13-Week High is the highest closing price at which a symbol has traded in the last 13 weeks.',
  'Symbol 13-Week Low': 'Symbol 13-Week Low is the lowest closing price at which a symbol has traded in the last 13 weeks.',
  'Trend Score Breakout': "When a stock's Trend Score rises above 7, it indicates a strong positive market trend.",
  'Trend Score Breakdown': "When a stock's Trend Score falls below 3, it indicates a weak market trend.",
}

export const SMART_SCANNER_RANGE_DEFINITIONS: SmartScannerRangeDefinition[] = [
  { key: 'profitTarget', label: 'Profit Target', suffix: '%', step: '0.1' },
  { key: 'stopLoss', label: 'Stop Loss', suffix: '%', step: '0.1' },
  { key: 'timeInMarket', label: 'Time In Market', suffix: 'bars', step: '1' },
  { key: 'maxRisk', label: 'Max Risk', suffix: '%', step: '0.1' },
  { key: 'zScore', label: 'Z-Score', step: '0.1' },
  { key: 'sharpeRatio', label: 'Sharpe Ratio', step: '0.1' },
  { key: 'stdDev', label: 'Std. Dev', step: '0.1' },
  { key: 'expectedReturn', label: 'Expected Return', suffix: '%', step: '0.1' },
  { key: 'winRate', label: 'Win Rate', suffix: '%', step: '0.1' },
  { key: 'pctChange', label: 'Change', suffix: '%', step: '0.01' },
  { key: 'trendScore', label: 'Trend Score', step: '1' },
  { key: 'relTrendScore', label: 'RelTrend Score', step: '1' },
  { key: 'optix', label: 'Optix', step: '1' },
  { key: 'tradeNumber', label: 'Total Trades', step: '1' },
]

const DEFAULT_RANGE_ENTRIES: Array<[SmartScannerRangeKey, SmartScannerRange]> = [
  ['profitTarget', { min: 2, max: 20 }],
  ['stopLoss', { min: 2, max: 15 }],
  ['timeInMarket', { min: 5, max: 42 }],
  ['maxRisk', { min: 5, max: 50 }],
  ['zScore', { min: -5, max: 5 }],
  ['sharpeRatio', { min: 0, max: 2 }],
  ['stdDev', { min: 0, max: 10 }],
  ['expectedReturn', { min: 0, max: 5 }],
  ['winRate', { min: 52, max: 80 }],
  ['pctChange', { min: -10, max: 10 }],
  ['trendScore', { min: 0, max: 10 }],
  ['relTrendScore', { min: 0, max: 10 }],
  ['optix', { min: 0, max: 100 }],
  ['tradeNumber', { min: 1, max: 100 }],
]

function safeJsonParse(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value.replace(/\bNaN\b/g, 'null'))
  } catch {
    return value
  }
}

function recordValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function extractRowsPayload(payload: unknown): unknown {
  const parsed = safeJsonParse(payload)
  if (Array.isArray(parsed)) return parsed
  if (!parsed || typeof parsed !== 'object') return []

  const record = parsed as Record<string, unknown>
  const direct = safeJsonParse(record.data ?? record.content ?? record.rows ?? record.result)
  if (Array.isArray(direct)) return direct
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
    const dataRecord = direct as Record<string, unknown>
    const nested = safeJsonParse(dataRecord.data ?? dataRecord.content ?? dataRecord.rows ?? dataRecord.result)
    if (Array.isArray(nested)) return nested
  }

  return []
}

function normalizeDate(value: unknown) {
  if (value === undefined || value === null || value === '') return { label: '', timestamp: null }

  const text = String(value).trim()
  const dateOnly = text.split('T')[0]
  const [year, month, day] = dateOnly.split('-').map(Number)
  if (year && month && day) {
    return {
      label: dateOnly,
      timestamp: Date.UTC(year, month - 1, day),
    }
  }

  const timestamp = Date.parse(text)
  return Number.isFinite(timestamp)
    ? { label: new Date(timestamp).toISOString().slice(0, 10), timestamp }
    : { label: text, timestamp: null }
}

export function parseScannerNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const normalized = String(value).replace(/[$,%]/g, '').replace(/,/g, '').trim()
  if (!normalized || normalized === '-' || normalized.toLowerCase() === 'nan') return null
  const numeric = Number(normalized)
  return Number.isFinite(numeric) ? numeric : null
}

function normalizeText(value: unknown, fallback = '—') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeSymbol(value: unknown) {
  return normalizeText(value, '').toUpperCase()
}

export function smartScannerSignalLabel(signal: string) {
  return SMART_SCANNER_SIGNAL_LABELS[signal] ?? signal
}

export function smartScannerSignalDescription(signal: string) {
  const label = smartScannerSignalLabel(signal)
  return SMART_SCANNER_SIGNAL_DESCRIPTIONS[signal] ?? SMART_SCANNER_SIGNAL_DESCRIPTIONS[label] ?? ''
}

export function smartScannerDetailRequestFromRow(row: SmartScannerRow): SmartScannerDetailRequest {
  return {
    id: row.id,
    symbol: row.symbol,
    date: row.date,
    signal: row.signal,
    signalLabel: row.signalLabel,
    category: row.category,
    direction: row.direction,
    close: row.close,
    pctChange: row.pctChange,
    trendScore: row.trendScore,
    winRate: row.winRate,
    timeInMarket: row.timeInMarket,
  }
}

/**
 * 【Vue2→Vue3 兼容】构建原版 Vue2 scanner 详情页 URL 所需的 rowData 对象
 * 字段名必须大写，与原版 `btv2.sentimentrader.com/scannerai/scannerai_chart` 格式完全一致
 */
export function legacySmartScannerRowData(row: SmartScannerRow): Record<string, unknown> {
  return {
    id: 'test',
    Symbol: row.symbol,
    Date: row.date,
    _Signal: row.signal,
    Category: row.category,
    Direction: row.direction,
  }
}

export function parseSmartScannerDetailRequest(value: unknown): SmartScannerDetailRequest | null {
  const parsed = safeJsonParse(value)
  if (!isRecord(parsed)) return null

  const symbol = normalizeSymbol(recordValue(parsed, ['Symbol', 'symbol', 'ticker', 'Ticker']))
  const date = normalizeText(recordValue(parsed, ['Date', 'date']), '')
  const signal = normalizeText(recordValue(parsed, ['_Signal', 'signal', 'Signal']), '')
  if (!symbol || !date || !signal) return null

  return {
    id: normalizeText(recordValue(parsed, ['id']), `${symbol}-${date}-${signal}`),
    symbol,
    date,
    signal,
    signalLabel: smartScannerSignalLabel(signal),
    category: normalizeText(recordValue(parsed, ['Category', 'category']), ''),
    direction: normalizeText(recordValue(parsed, ['Direction', 'direction']), ''),
    close: parseScannerNumber(recordValue(parsed, ['Close', 'close', 'lastPrice', 'LastPrice'])),
    pctChange: parseScannerNumber(recordValue(parsed, ['PctChange', 'pctChange', 'Change'])),
    trendScore: parseScannerNumber(recordValue(parsed, ['TrendScore', 'trendScore'])),
    winRate: parseScannerNumber(recordValue(parsed, ['WinRate', 'winRate'])),
    timeInMarket: parseScannerNumber(recordValue(parsed, ['TimeInMarket', 'timeInMarket'])),
  }
}

export function normalizeSmartScannerRows(payload: unknown): SmartScannerRow[] {
  const rowsPayload = extractRowsPayload(payload)
  if (!Array.isArray(rowsPayload)) return []

  return rowsPayload
    .map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const raw = item as Record<string, unknown>
      const symbol = normalizeSymbol(recordValue(raw, ['Symbol', 'symbol', 'Ticker', 'ticker']))
      if (!symbol) return null

      const date = normalizeDate(recordValue(raw, ['Date', 'date', 'ScanDate', 'scan_date']))
      const signal = normalizeText(recordValue(raw, ['_Signal', 'Signal', 'signal']), '')

      return {
        id: `${symbol}-${date.label || index}-${signal || index}`,
        date: date.label,
        dateTimestamp: date.timestamp,
        symbol,
        close: parseScannerNumber(recordValue(raw, ['Close', 'close', 'LastClose', 'last_close'])),
        pctChange: parseScannerNumber(recordValue(raw, ['PctChange', 'Change', 'change'])),
        trend: normalizeText(recordValue(raw, ['Market', 'Trend', 'market', 'trend'])),
        trendScore: parseScannerNumber(recordValue(raw, ['TrendScore', 'trend_score'])),
        relTrendScore: parseScannerNumber(recordValue(raw, ['RelTrendScore', 'reltrend_score'])),
        direction: normalizeText(recordValue(raw, ['Direction', 'direction'])),
        signal,
        signalLabel: smartScannerSignalLabel(signal),
        category: normalizeText(recordValue(raw, ['Category', 'category']), ''),
        winRate: parseScannerNumber(recordValue(raw, ['WinRate', 'win_rate'])),
        stopLoss: parseScannerNumber(recordValue(raw, ['StopLoss', 'stop_loss'])),
        profitTarget: parseScannerNumber(recordValue(raw, ['ProfitTarget', 'profit_target'])),
        timeInMarket: parseScannerNumber(recordValue(raw, ['TimeInMarket', 'time_in_market'])),
        expectedReturn: parseScannerNumber(recordValue(raw, ['ExpectedReturn', 'expected_return'])),
        zScore: parseScannerNumber(recordValue(raw, ['Z_Score', 'ZScore', 'z_score'])),
        avgWin: parseScannerNumber(recordValue(raw, ['AvgWin', 'avg_win'])),
        maxRisk: parseScannerNumber(recordValue(raw, ['MaxRisk', 'max_risk'])),
        avgLoss: parseScannerNumber(recordValue(raw, ['AvgLoss', 'avg_loss'])),
        medianReturn: parseScannerNumber(recordValue(raw, ['MedianReturn', 'median_return'])),
        tradeNumber: parseScannerNumber(recordValue(raw, ['TradeNumber', 'total_trades', 'trade_number'])),
        annualReturn: parseScannerNumber(recordValue(raw, ['AnnualReturn', 'annual_return'])),
        avgReturn: parseScannerNumber(recordValue(raw, ['AvgReturn', 'avg_return'])),
        stdDev: parseScannerNumber(recordValue(raw, ['StdDev', 'std_dev'])),
        sharpeRatio: parseScannerNumber(recordValue(raw, ['SharpeRatio', 'sharpe_ratio'])),
        optix: parseScannerNumber(recordValue(raw, ['Optix', 'optix'])),
        alloc: parseScannerNumber(recordValue(raw, ['Alloc', 'alloc'])),
        raw,
      }
    })
    .filter((row): row is SmartScannerRow => row !== null)
}

export function smartScannerSortValue(row: SmartScannerRow, key: SmartScannerSortKey): SmartScannerSortableValue {
  if (key === 'date') return row.dateTimestamp
  if (key === 'symbol') return row.symbol.toLowerCase()
  if (key === 'close') return row.close
  if (key === 'pctChange') return row.pctChange
  if (key === 'trend') return row.trend.toLowerCase()
  if (key === 'trendScore') return row.trendScore
  if (key === 'direction') return row.direction.toLowerCase()
  if (key === 'signal') return row.signalLabel.toLowerCase()
  if (key === 'winRate') return row.winRate
  if (key === 'stopLoss') return row.stopLoss
  if (key === 'profitTarget') return row.profitTarget
  if (key === 'timeInMarket') return row.timeInMarket
  if (key === 'expectedReturn') return row.expectedReturn
  if (key === 'zScore') return row.zScore
  return null
}

export function formatScannerNumber(value: number | null, decimals = 1, trimTrailingZero = true) {
  if (value === null) return '—'
  const formatted = value.toFixed(decimals)
  return trimTrailingZero ? formatted.replace(/\.0$/, '') : formatted
}

export function formatScannerPercent(value: number | null, signed = false, decimals = 1) {
  if (value === null) return '—'
  const prefix = signed && value > 0 ? '+' : ''
  return `${prefix}${formatScannerNumber(value, decimals)}%`
}

export function formatScannerPrice(value: number | null) {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function createSmartScannerDefaultRanges(): Record<SmartScannerRangeKey, SmartScannerRange> {
  return Object.fromEntries(DEFAULT_RANGE_ENTRIES.map(([key, range]) => [key, { ...range }])) as Record<
    SmartScannerRangeKey,
    SmartScannerRange
  >
}

export function copySmartScannerRanges(
  source: Record<SmartScannerRangeKey, SmartScannerRange>,
  target: Record<SmartScannerRangeKey, SmartScannerRange>,
) {
  for (const [key, range] of DEFAULT_RANGE_ENTRIES) {
    target[key].min = source[key]?.min ?? range.min
    target[key].max = source[key]?.max ?? range.max
  }
}

export function resetSmartScannerRanges(target: Record<SmartScannerRangeKey, SmartScannerRange>) {
  const defaults = createSmartScannerDefaultRanges()
  copySmartScannerRanges(defaults, target)
}

export function normalizeSmartScannerRangeBounds(target: Record<SmartScannerRangeKey, SmartScannerRange>) {
  for (const definition of SMART_SCANNER_RANGE_DEFINITIONS) {
    const range = target[definition.key]
    if (range.min !== null && range.max !== null && range.min > range.max) {
      const nextMin = range.max
      range.max = range.min
      range.min = nextMin
    }
  }
}

export function smartScannerRangeValue(row: SmartScannerRow, key: SmartScannerRangeKey) {
  if (key === 'profitTarget') return row.profitTarget
  if (key === 'stopLoss') return row.stopLoss
  if (key === 'timeInMarket') return row.timeInMarket
  if (key === 'maxRisk') return row.maxRisk
  if (key === 'zScore') return row.zScore
  if (key === 'sharpeRatio') return row.sharpeRatio
  if (key === 'stdDev') return row.stdDev
  if (key === 'expectedReturn') return row.expectedReturn
  if (key === 'winRate') return row.winRate
  if (key === 'pctChange') return row.pctChange
  if (key === 'trendScore') return row.trendScore
  if (key === 'relTrendScore') return row.relTrendScore
  if (key === 'optix') return row.optix
  if (key === 'tradeNumber') return row.tradeNumber
  return null
}

export function matchesSmartScannerRange(row: SmartScannerRow, key: SmartScannerRangeKey, range: SmartScannerRange) {
  const value = smartScannerRangeValue(row, key)
  if (value === null) return true
  if (range.min !== null && value < range.min) return false
  if (range.max !== null && value > range.max) return false
  return true
}

export function smartScannerSignalOptions(rows: SmartScannerRow[]) {
  return Array.from(
    new Set(
      rows
        .map((row) => row.signalLabel)
        .filter((signal) => signal && signal !== '—')
        .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })),
    ),
  )
}

export function matchesSmartScannerSignal(row: SmartScannerRow, selectedSignals: string[]) {
  const selected = selectedSignals.filter((signal) => signal && signal !== 'All')
  if (!selected.length) return true
  return selected.includes(row.signal) || selected.includes(row.signalLabel)
}

export function smartScannerSearchScore(row: SmartScannerRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return 0

  const targets = [row.symbol, row.signalLabel, row.signal, row.trend, row.direction, row.date]
    .map((value) => String(value ?? '').toLowerCase())
    .filter(Boolean)

  if (targets.some((target) => target === normalizedQuery)) return 1000
  if (targets.some((target) => target.startsWith(normalizedQuery))) return 800

  const indexes = targets.map((target) => target.indexOf(normalizedQuery)).filter((index) => index >= 0)
  if (!indexes.length) return null
  return 600 - Math.min(...indexes)
}

function roundedCount(value: number | null) {
  return value === null ? '' : Math.round(value)
}

function positiveTradeCount(row: SmartScannerRow) {
  if (row.tradeNumber === null || row.winRate === null) return null
  return Math.round((row.tradeNumber * row.winRate) / 100)
}

function negativeTradeCount(row: SmartScannerRow) {
  const positive = positiveTradeCount(row)
  if (row.tradeNumber === null || positive === null) return null
  return Math.round(row.tradeNumber - positive)
}

export function smartScannerCsvTable(rows: SmartScannerRow[]) {
  return {
    headers: [
      'Date',
      'Symbol',
      'Close',
      'Change (%)',
      'Market',
      'Trend Score',
      'Direction',
      'Signal',
      'Win Rate (%)',
      'Stop Loss (%)',
      'Profit Target (%)',
      'Time In Market (Bars)',
      'Expected Return (%)',
      'Z-Score',
      'Average Win (%)',
      'Max Risk (%)',
      'Average Loss (%)',
      'Median Return (%)',
      'Total Trades',
      'Annual Return (%)',
      'Total Positive',
      'Average Return (%)',
      'Total Negative',
      'Std. Dev',
      'Sharpe Ratio',
      'RelTrend Score',
      'Optix',
      'Allocation (%)',
    ],
    rows: rows.map((row) => [
      row.date,
      row.symbol,
      row.close ?? '',
      row.pctChange ?? '',
      row.trend === '—' ? '' : row.trend,
      roundedCount(row.trendScore),
      row.direction === '—' ? '' : row.direction,
      row.signalLabel,
      row.winRate ?? '',
      row.stopLoss ?? '',
      row.profitTarget ?? '',
      roundedCount(row.timeInMarket),
      row.expectedReturn ?? '',
      row.zScore ?? '',
      row.avgWin ?? '',
      row.maxRisk ?? '',
      row.avgLoss ?? '',
      row.medianReturn ?? '',
      roundedCount(row.tradeNumber),
      row.annualReturn ?? '',
      positiveTradeCount(row) ?? '',
      row.avgReturn ?? '',
      negativeTradeCount(row) ?? '',
      row.stdDev ?? '',
      row.sharpeRatio ?? '',
      roundedCount(row.relTrendScore),
      roundedCount(row.optix),
      row.alloc ?? '',
    ]),
  }
}

function firstRecordPayload(payload: unknown): Record<string, unknown> {
  const parsed = safeJsonParse(payload)
  if (isRecord(parsed)) {
    const data = safeJsonParse(parsed.data)
    if (isRecord(data)) return data
    return parsed
  }
  return {}
}

function legacyArray(value: unknown): unknown[] {
  const parsed = safeJsonParse(value)
  if (Array.isArray(parsed)) return parsed
  if (typeof parsed !== 'string') return []

  const trimmed = parsed.trim()
  if (!trimmed) return []

  try {
    const fixed = trimmed.replace(/'/g, '"')
    const maybeArray = JSON.parse(fixed) as unknown
    return Array.isArray(maybeArray) ? maybeArray : []
  } catch {
    return []
  }
}

function textArray(value: unknown): string[] {
  return legacyArray(value).map((item) => String(item ?? '').trim())
}

function numberArray(value: unknown): Array<number | null> {
  return legacyArray(value).map(parseScannerNumber)
}

function numberFromRecord(record: Record<string, unknown>, keys: string[]) {
  return parseScannerNumber(recordValue(record, keys))
}

function textFromRecord(record: Record<string, unknown>, keys: string[], fallback = '—') {
  return normalizeText(recordValue(record, keys), fallback)
}

function totalPositiveCount(tradeNumber: number | null, winRate: number | null) {
  if (tradeNumber === null || winRate === null) return null
  return Math.round((tradeNumber * winRate) / 100)
}

function totalNegativeCount(tradeNumber: number | null, winRate: number | null) {
  if (tradeNumber === null || winRate === null) return null
  return Math.round((tradeNumber * (100 - winRate)) / 100)
}

function normalizeTradeRows(record: Record<string, unknown>): SmartScannerTradeRow[] {
  const entryDates = textArray(recordValue(record, ['EntryTradeDate', 'entryTradeDate', 'entry_dates']))
  const exitDates = textArray(recordValue(record, ['ExitTradeDate', 'exitTradeDate', 'exit_dates']))
  const exitReasons = textArray(recordValue(record, ['ExitReason', 'exitReason', 'exit_reasons']))
  const eachReturns = numberArray(recordValue(record, ['EachReturn', 'eachReturn', 'each_returns']))

  return entryDates.map((entryDate, index) => ({
    id: `${entryDate}-${exitDates[index] ?? index}`,
    index: index + 1,
    entryDate,
    exitDate: exitDates[index] ?? '',
    exitReason: exitReasons[index] ?? '',
    eachReturn: eachReturns[index] ?? null,
  }))
}

function normalizeHistoryRows(record: Record<string, unknown>): SmartScannerBacktestHistoryRow[] {
  const payload = safeJsonParse(recordValue(record, ['BacktestHistory', 'backtestHistory', 'history', 'History']))
  const rows = Array.isArray(payload) ? payload : []

  return rows
    .filter(isRecord)
    .map((row, index) => ({
      id: `${textFromRecord(row, ['Entry Date', 'entryDate', 'EntryDate'], String(index))}-${index}`,
      entryDate: textFromRecord(row, ['Entry Date', 'entryDate', 'EntryDate'], ''),
      oneMonth: numberFromRecord(row, ['1 Month [%]', '1 Month Later [%]', 'oneMonth']),
      twoMonths: numberFromRecord(row, ['2 Months [%]', '2 Months Later [%]', 'twoMonths']),
      threeMonths: numberFromRecord(row, ['3 Months [%]', '3 Months Later [%]', 'threeMonths']),
      fourMonths: numberFromRecord(row, ['4 Months [%]', '4 Months Later [%]', 'fourMonths']),
      fiveMonths: numberFromRecord(row, ['5 Months [%]', '5 Months Later [%]', 'fiveMonths']),
      sixMonths: numberFromRecord(row, ['6 Months [%]', '6 Months Later [%]', 'sixMonths']),
      oneYear: numberFromRecord(row, ['1 Year [%]', '1 Year Later [%]', 'oneYear']),
    }))
}

function normalizePeriodSummaryRows(record: Record<string, unknown>): SmartScannerPeriodSummaryRow[] {
  const payload = safeJsonParse(recordValue(record, ['PeriodSummary', 'periodSummary', 'result_quotes', 'zScoreResult']))
  const rows = Array.isArray(payload) ? payload : []

  return rows
    .filter(isRecord)
    .map((row, index) => ({
      id: `${textFromRecord(row, ['property', 'metric', 'Period'], String(index))}-${index}`,
      metric: textFromRecord(row, ['property', 'metric', 'Period'], ''),
      oneMonth: numberFromRecord(row, ['1 Month [%]', '1 Month', 'oneMonth']),
      twoMonths: numberFromRecord(row, ['2 Months [%]', '2 Months', 'twoMonths']),
      threeMonths: numberFromRecord(row, ['3 Months [%]', '3 Months', 'threeMonths']),
      fourMonths: numberFromRecord(row, ['4 Months [%]', '4 Months', 'fourMonths']),
      fiveMonths: numberFromRecord(row, ['5 Months [%]', '5 Months', 'fiveMonths']),
      sixMonths: numberFromRecord(row, ['6 Months [%]', '6 Months', 'sixMonths']),
      oneYear: numberFromRecord(row, ['1 Year [%]', '1 Year', 'oneYear']),
    }))
}

function chartRowsFromPayload(value: unknown): SmartScannerChartPoint[] {
  const parsed = safeJsonParse(value)
  if (!Array.isArray(parsed)) return []

  return parsed
    .filter(isRecord)
    .map((row) => ({
      date: textFromRecord(row, ['Date', 'date', 'DT', 'time'], ''),
      price: numberFromRecord(row, ['Close', 'close', 'price', 'Open', 'open']),
      indicator: numberFromRecord(row, ['Optix', 'optix', 'indicator', 'value']),
    }))
    .filter((row) => row.date && (row.price !== null || row.indicator !== null))
}

function normalizeChartRows(record: Record<string, unknown>) {
  for (const key of ['chartRows', 'ChartRows', 'chart_data', 'ChartData', 'quotes', 'Quotes', 'priceData']) {
    const rows = chartRowsFromPayload(record[key])
    if (rows.length) return rows
  }
  return []
}

export function normalizeSmartScannerBacktestDetail(
  payload: unknown,
  request: SmartScannerDetailRequest,
): SmartScannerBacktestDetail {
  const record = firstRecordPayload(payload)
  const symbol = textFromRecord(record, ['Symbol', 'symbol'], request.symbol).toUpperCase()
  const signal = textFromRecord(record, ['_Signal', 'Signal', 'signal'], request.signal)
  const winRate = numberFromRecord(record, ['WinRate', 'winRate']) ?? request.winRate
  const tradeNumber = numberFromRecord(record, ['TradeNumber', 'tradeNumber', 'total_trades'])
  const totalPositive =
    numberFromRecord(record, ['TotalPositive', 'totalPositive', 'total_positive']) ?? totalPositiveCount(tradeNumber, winRate)
  const totalNegative =
    numberFromRecord(record, ['TotalNegative', 'totalNegative', 'total_negative']) ?? totalNegativeCount(tradeNumber, winRate)

  return {
    request,
    symbol,
    displayName: textFromRecord(record, ['CompanyName', 'companyName', 'name', 'Name'], symbol),
    exchange: textFromRecord(record, ['Exchange', 'exchange'], 'NYSE'),
    close: numberFromRecord(record, ['Close', 'close', 'LastClose', 'lastClose']) ?? request.close,
    pctChange: numberFromRecord(record, ['PctChange', 'pctChange', 'Change']) ?? request.pctChange,
    asOfDate: textFromRecord(record, ['Date', 'date'], request.date),
    signal,
    signalLabel: smartScannerSignalLabel(signal),
    direction: textFromRecord(record, ['Direction', 'direction'], request.direction),
    category: textFromRecord(record, ['Category', 'category'], request.category),
    trendScore: numberFromRecord(record, ['TrendScore', 'trendScore']) ?? request.trendScore,
    winRate,
    timeInMarket: numberFromRecord(record, ['TimeInMarket', 'timeInMarket']) ?? request.timeInMarket,
    annualReturn: numberFromRecord(record, ['AnnualReturn', 'annualReturn']),
    medianReturn: numberFromRecord(record, ['MedianReturn', 'medianReturn']),
    avgReturn: numberFromRecord(record, ['AvgReturn', 'avgReturn']),
    stdDev: numberFromRecord(record, ['StdDev', 'stdDev']),
    maxRisk: numberFromRecord(record, ['MaxRisk', 'maxRisk']),
    avgWin: numberFromRecord(record, ['AvgWin', 'avgWin']),
    avgLoss: numberFromRecord(record, ['AvgLoss', 'avgLoss']),
    tradeNumber,
    totalPositive,
    totalNegative,
    trades: normalizeTradeRows(record),
    backtestHistory: normalizeHistoryRows(record),
    periodSummary: normalizePeriodSummaryRows(record),
    chartRows: normalizeChartRows(record),
    raw: record,
  }
}

export function smartScannerBacktestCsvTable(detail: SmartScannerBacktestDetail, activeTab: 'summary' | 'history') {
  if (activeTab === 'history') {
    return {
      headers: ['Entry Date', '1 Month Later (%)', '2 Months Later (%)', '3 Months Later (%)', '4 Months Later (%)', '5 Months Later (%)', '6 Months Later (%)', '1 Year Later (%)'],
      rows: detail.backtestHistory.map((row) => [
        row.entryDate,
        row.oneMonth ?? '',
        row.twoMonths ?? '',
        row.threeMonths ?? '',
        row.fourMonths ?? '',
        row.fiveMonths ?? '',
        row.sixMonths ?? '',
        row.oneYear ?? '',
      ]),
    }
  }

  return {
    headers: ['#', 'Entry Date', 'Exit Date', 'Exit Reason', 'Each Return (%)'],
    rows: detail.trades.map((row) => [row.index, row.entryDate, row.exitDate, row.exitReason, row.eachReturn ?? '']),
  }
}

export function todayScannerDate() {
  return new Date().toISOString().slice(0, 10)
}

function scannerDateFromPayload(value: unknown, depth = 0): string | null {
  if (depth > 4) return null

  const parsed = safeJsonParse(value)
  if (typeof parsed === 'string' && /^\d{4}-\d{2}-\d{2}/.test(parsed)) return parsed.slice(0, 10)
  if (parsed !== value) return scannerDateFromPayload(parsed, depth + 1)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null

  const record = parsed as Record<string, unknown>
  for (const key of [
    'LastUpdatePickDate',
    'lastUpdatePickDate',
    'last_update_pick_date',
    'data',
    'curDate',
    'currentDate',
    'date',
  ]) {
    const date = scannerDateFromPayload(record[key], depth + 1)
    if (date) return date
  }

  return null
}

export function extractSmartScannerCurrentDate(payload: unknown) {
  return scannerDateFromPayload(payload)
}

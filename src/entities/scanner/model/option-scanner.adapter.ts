import type {
  OptionScannerRange,
  OptionScannerRangeDefinition,
  OptionScannerRangeKey,
  OptionScannerRow,
  OptionScannerSortKey,
} from './option-scanner.types'

export type OptionScannerSortableValue = string | number | null

export const OPTION_SCANNER_RANGE_DEFINITIONS: OptionScannerRangeDefinition[] = [
  { key: 'volume', label: 'Volume', step: '1' },
  { key: 'openInterest', label: 'Open Interest', step: '1' },
  { key: 'impliedVolatility', label: 'Implied Volatility', suffix: '%', step: '0.1' },
  { key: 'delta', label: 'Delta', step: '0.0001' },
  { key: 'vega', label: 'Vega', step: '0.0001' },
]

const DEFAULT_OPTION_RANGE_ENTRIES: Array<[OptionScannerRangeKey, OptionScannerRange]> = [
  ['volume', { min: 10, max: null }],
  ['openInterest', { min: 100, max: null }],
  ['impliedVolatility', { min: 10, max: 150 }],
  ['delta', { min: 0, max: 0.08 }],
  ['vega', { min: 0, max: 1 }],
]

export const OPTION_SCANNER_COLUMN_HINTS: Record<string, string> = {
  symbol:
    "The ticker symbol for the underlying asset, extracted from the option's contract symbol. It identifies the asset the option is based on.",
  lastClose: 'The most recent closing price of the underlying asset.',
  expireDate: 'The date on which the option contract becomes void. An unexercised option has no value after this date.',
  dte: 'An abbreviation for "Days to Expiration." It is calculated as: Expire Date - Last Trade Date.',
  strike: 'The predetermined price at which the holder of the option can buy or sell the underlying asset.',
  breakEven:
    'The price the underlying asset must reach for an option seller to incur no profit and no loss at expiration. For a short option position, it is calculated as: Strike - Credit.',
  probabilityOfProfit:
    'The estimated probability that the option will be profitable for the seller if held to expiration. It is derived from the Black-Scholes model.',
  credit: 'The premium received by an option seller from the buyer for selling one option contract.',
  margin:
    'The estimated amount of collateral a broker requires an option seller to hold to cover potential losses. Calculation: Strike * 100.',
  returnPercent:
    'The return on margin, representing the efficiency of the trade by showing the potential profit as a percentage of the required collateral.',
  cagr:
    'Compound Annual Growth Rate. Potential Calculation: EV Score % * (252 / DTE). This annualizes the return on margin to compare options with different expiration dates.',
  expectedValueScore:
    'Risk-adjusted expected return on margin. EV = [(Win% * NetCredit) - (Loss% * TailLoss)] / Margin. Higher scores indicate robust positive expectancy under volatility stress.',
}

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

function normalizeText(value: unknown, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

export function parseOptionScannerNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const normalized = String(value).replace(/[$,%]/g, '').replace(/,/g, '').trim()
  if (!normalized || normalized === '-' || normalized.toLowerCase() === 'nan') return null
  const numeric = Number(normalized)
  return Number.isFinite(numeric) ? numeric : null
}

function numberFromRecord(record: Record<string, unknown>, keys: string[]) {
  return parseOptionScannerNumber(recordValue(record, keys))
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

function impliedVolatilityFromRecord(record: Record<string, unknown>) {
  const raw = recordValue(record, ['IV', 'iv', 'impliedVolatility', 'implied_volatility'])
  const parsed = parseOptionScannerNumber(raw)
  if (parsed === null) return null
  if (typeof raw === 'string' && raw.includes('%')) return parsed
  return parsed <= 10 ? parsed * 100 : parsed
}

function returnPercentFromRecord(record: Record<string, unknown>) {
  const raw = recordValue(record, ['return_per', 'returnPercent', 'Return %', 'return_on_full'])
  const parsed = parseOptionScannerNumber(raw)
  if (parsed === null) return null
  if (typeof raw === 'string' && raw.includes('%')) return parsed
  return parsed > 0 && parsed < 1 ? parsed * 100 : parsed
}

export function normalizeOptionScannerRows(payload: unknown): OptionScannerRow[] {
  return extractRowsPayload(payload)
    .filter(isRecord)
    .map((raw, index) => {
      const symbol = normalizeText(recordValue(raw, ['ticker', 'Symbol', 'symbol']), '').toUpperCase()
      if (!symbol) return null

      const expire = normalizeDate(recordValue(raw, ['expirDate', 'Expire Date', 'expireDate', 'expirationDate']))
      const tradeDate = normalizeDate(recordValue(raw, ['trade_date', 'Trade Date', 'tradeDate']))
      const scanDate = normalizeDate(recordValue(raw, ['scan_date', 'Scan Date', 'scanDate']))
      const earningsDate = normalizeDate(recordValue(raw, ['EarningsDate', 'earnings_date', 'earningsDate']))
      const contractSymbol = normalizeText(recordValue(raw, ['ContractSymbol', 'contractSymbol', 'contract_symbol']), '')

      return {
        id: `${symbol}-${contractSymbol || index}-${expire.label || index}`,
        symbol,
        lastClose: numberFromRecord(raw, ['stkpx', 'Last Close', 'lastClose']),
        expireDate: expire.label,
        expireTimestamp: expire.timestamp,
        dte: numberFromRecord(raw, ['DTE', 'dte', 'yte']),
        strike: numberFromRecord(raw, ['strike', 'Strike']),
        breakEven: numberFromRecord(raw, ['be', 'Break Even', 'breakEven']),
        probabilityOfProfit: numberFromRecord(raw, ['POP_est', 'Prob. of Profit', 'probabilityOfProfit', 'pop']),
        credit: numberFromRecord(raw, ['credit', 'Credit', 'credit_per_contract']),
        margin: numberFromRecord(raw, ['margin', 'Margin']),
        returnPercent: returnPercentFromRecord(raw),
        expectedValueScore: numberFromRecord(raw, ['ev_score', 'Expected Value Score', 'expectedValueScore']),
        cagr: numberFromRecord(raw, ['cagr', 'CAGR %', 'cagrPercent']),
        volume: numberFromRecord(raw, ['Volume', 'volume']),
        openInterest: numberFromRecord(raw, ['OI', 'Open Interest', 'openInterest']),
        impliedVolatility: impliedVolatilityFromRecord(raw),
        delta: numberFromRecord(raw, ['Delta', 'delta']),
        vega: numberFromRecord(raw, ['Vega', 'vega']),
        contractSymbol,
        tradeDate: tradeDate.label,
        scanDate: scanDate.label,
        earningsDate: earningsDate.label,
        raw,
      } satisfies OptionScannerRow
    })
    .filter((row): row is OptionScannerRow => row !== null)
}

export function extractOptionScannerLatestTradeDate(payload: unknown) {
  const rows = extractRowsPayload(payload)
  for (const row of rows) {
    if (!isRecord(row)) continue
    const latest = normalizeDate(recordValue(row, ['Latest Trade Date', 'latestTradeDate', 'LatestTradeDate']))
    if (latest.label) return latest.label
    const tradeDate = normalizeDate(recordValue(row, ['trade_date', 'Trade Date', 'tradeDate']))
    if (tradeDate.label) return tradeDate.label
  }
  return null
}

export function formatOptionNumber(value: number | null, decimals = 2, trimTrailingZero = true) {
  if (value === null) return '—'
  const formatted = value.toFixed(decimals)
  return trimTrailingZero ? formatted.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1') : formatted
}

export function formatOptionPercent(value: number | null, decimals = 2) {
  if (value === null) return '—'
  return `${formatOptionNumber(value, decimals)}%`
}

export function formatOptionPrice(value: number | null, decimals = 2) {
  return formatOptionNumber(value, decimals, false)
}

export function createOptionScannerDefaultRanges(): Record<OptionScannerRangeKey, OptionScannerRange> {
  return Object.fromEntries(DEFAULT_OPTION_RANGE_ENTRIES.map(([key, range]) => [key, { ...range }])) as Record<
    OptionScannerRangeKey,
    OptionScannerRange
  >
}

export function copyOptionScannerRanges(
  source: Record<OptionScannerRangeKey, OptionScannerRange>,
  target: Record<OptionScannerRangeKey, OptionScannerRange>,
) {
  for (const [key, range] of DEFAULT_OPTION_RANGE_ENTRIES) {
    target[key].min = source[key]?.min ?? range.min
    target[key].max = source[key]?.max ?? range.max
  }
}

export function resetOptionScannerRanges(target: Record<OptionScannerRangeKey, OptionScannerRange>) {
  const defaults = createOptionScannerDefaultRanges()
  copyOptionScannerRanges(defaults, target)
}

export function normalizeOptionScannerRangeBounds(target: Record<OptionScannerRangeKey, OptionScannerRange>) {
  for (const definition of OPTION_SCANNER_RANGE_DEFINITIONS) {
    const range = target[definition.key]
    if (range.min !== null && range.max !== null && range.min > range.max) {
      const nextMin = range.max
      range.max = range.min
      range.min = nextMin
    }
  }
}

export function optionScannerRangeValue(row: OptionScannerRow, key: OptionScannerRangeKey) {
  if (key === 'volume') return row.volume
  if (key === 'openInterest') return row.openInterest
  if (key === 'impliedVolatility') return row.impliedVolatility
  if (key === 'delta') return row.delta
  if (key === 'vega') return row.vega
  return null
}

export function matchesOptionScannerRange(row: OptionScannerRow, key: OptionScannerRangeKey, range: OptionScannerRange) {
  const value = optionScannerRangeValue(row, key)
  if (value === null) return true
  if (range.min !== null && value < range.min) return false
  if (range.max !== null && value > range.max) return false
  return true
}

export function optionScannerSortValue(row: OptionScannerRow, key: OptionScannerSortKey): OptionScannerSortableValue {
  if (key === 'symbol') return row.symbol.toLowerCase()
  if (key === 'lastClose') return row.lastClose
  if (key === 'expireDate') return row.expireTimestamp
  if (key === 'dte') return row.dte
  if (key === 'strike') return row.strike
  if (key === 'breakEven') return row.breakEven
  if (key === 'probabilityOfProfit') return row.probabilityOfProfit
  if (key === 'credit') return row.credit
  if (key === 'margin') return row.margin
  if (key === 'returnPercent') return row.returnPercent
  if (key === 'expectedValueScore') return row.expectedValueScore
  if (key === 'cagr') return row.cagr
  return null
}

export function optionScannerSearchScore(row: OptionScannerRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return 0

  const targets = [row.symbol, row.contractSymbol, row.expireDate, row.tradeDate]
    .map((value) => String(value ?? '').toLowerCase())
    .filter(Boolean)

  if (targets.some((target) => target === normalizedQuery)) return 1000
  if (targets.some((target) => target.startsWith(normalizedQuery))) return 800

  const indexes = targets.map((target) => target.indexOf(normalizedQuery)).filter((index) => index >= 0)
  if (!indexes.length) return null
  return 600 - Math.min(...indexes)
}

export function optionScannerCsvTable(rows: OptionScannerRow[]) {
  return {
    headers: [
      'Symbol',
      'Last Close',
      'Expire Date',
      'DTE',
      'Strike',
      'Break Even',
      'Prob. of Profit',
      'Credit',
      'Margin',
      'Return %',
      'Expected Value Score',
      'CAGR %',
      'Volume',
      'Open Interest',
      'IV',
      'Delta',
      'Vega',
      'Contract Symbol',
      'Trade Date',
      'Scan Date',
      'Earnings Date',
    ],
    rows: rows.map((row) => [
      row.symbol,
      row.lastClose ?? '',
      row.expireDate,
      row.dte ?? '',
      row.strike ?? '',
      row.breakEven ?? '',
      row.probabilityOfProfit ?? '',
      row.credit ?? '',
      row.margin ?? '',
      row.returnPercent ?? '',
      row.expectedValueScore ?? '',
      row.cagr ?? '',
      row.volume ?? '',
      row.openInterest ?? '',
      row.impliedVolatility ?? '',
      row.delta ?? '',
      row.vega ?? '',
      row.contractSymbol,
      row.tradeDate,
      row.scanDate,
      row.earningsDate,
    ]),
  }
}

export function todayOptionScannerDate() {
  return new Date().toISOString().slice(0, 10)
}

import {
  formatMarketCurrency,
  formatMarketPercent,
  parseMarketNumber,
} from './market-prediction.adapter'
import type { MarketPredictionRow } from './market-prediction.types'
import type {
  MarketAnalystConsensusItem,
  MarketAnalystTargetRow,
  MarketBalanceSheetRow,
  MarketCashFlowRow,
  MarketCompanyProfile,
  MarketDetailTab,
  MarketEarningsRow,
  MarketFinancialRow,
  MarketMetric,
  MarketNewsRow,
  MarketPredictionDetail,
  MarketSecRow,
} from './market-detail.types'

export const marketDetailTabs: Array<{ id: MarketDetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'chart', label: 'Chart' },
  { id: 'analysts', label: 'Analysts' },
  { id: 'earnings', label: 'Earnings' },
  { id: 'financials', label: 'Financials' },
  { id: 'balanceSheet', label: 'Balance Sheet' },
  { id: 'cashFlow', label: 'Cash Flow' },
  { id: 'ownership', label: 'Ownership' },
  { id: 'news', label: 'News' },
  { id: 'sec', label: 'SEC' },
]

export interface MarketDetailRawParts {
  profile?: unknown
  analyst?: unknown
  earnings?: unknown
  income?: unknown
  balance?: unknown
  cash?: unknown
  ownership?: unknown
  news?: unknown
  sec?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function safeMarketJsonParse(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value.replace(/\bNaN\b/g, 'null'))
  } catch {
    return value
  }
}

export function marketRecordValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return null
}

export function marketDataRecord(payload: unknown): Record<string, unknown> {
  const parsed = safeMarketJsonParse(payload)
  if (!isRecord(parsed)) return {}

  const data = safeMarketJsonParse(parsed.data)
  if (isRecord(data)) {
    const nested = safeMarketJsonParse(data.data)
    return isRecord(nested) ? nested : data
  }

  return parsed
}

function parseArray(value: unknown): Record<string, unknown>[] {
  const parsed = safeMarketJsonParse(value)
  return Array.isArray(parsed) ? parsed.filter(isRecord) : []
}

function parseNestedDataArray(record: Record<string, unknown>, path: string[]) {
  let current: unknown = record
  for (const key of path) {
    current = isRecord(current) ? current[key] : undefined
  }
  return parseArray(current)
}

function textValue(value: unknown, fallback = '—') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function dateParts(value: unknown) {
  if (value === undefined || value === null || value === '') return { label: '—', timestamp: null }

  const text = String(value)
  const dateOnly = text.split('T')[0]
  const [year, month, day] = dateOnly.split('-').map(Number)
  if (year && month && day) {
    const timestamp = Date.UTC(year, month - 1, day)
    return {
      label: new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(timestamp)),
      timestamp,
    }
  }

  const timestamp = Date.parse(text)
  return Number.isFinite(timestamp)
    ? { label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(timestamp)), timestamp }
    : { label: text, timestamp: null }
}

function periodLabel(row: Record<string, unknown>) {
  const period = String(row.period ?? '').trim()
  const date = row.fiscal_date_ending ?? row.date
  if (period === 'FY') return String(date ?? '').slice(0, 4) || '—'
  return dateParts(date).label
}

export function formatMarketCompact(value: number | null, options: { currency?: boolean; percent?: boolean } = {}) {
  if (value === null) return '—'
  if (options.percent) return formatMarketPercent(normalizePercentValue(value))
  const prefix = options.currency ? '$' : ''
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  const scaled =
    abs >= 1_000_000_000_000
      ? `${(abs / 1_000_000_000_000).toFixed(2)}T`
      : abs >= 1_000_000_000
        ? `${(abs / 1_000_000_000).toFixed(2)}B`
        : abs >= 1_000_000
          ? `${(abs / 1_000_000).toFixed(2)}M`
          : abs >= 1_000
            ? `${(abs / 1_000).toFixed(2)}K`
            : abs.toFixed(2)
  return `${sign}${prefix}${scaled}`
}

function normalizePercentValue(value: number) {
  return Math.abs(value) > 0 && Math.abs(value) <= 1 ? value * 100 : value
}

function parsePercentValue(value: unknown) {
  const numeric = parseMarketNumber(value)
  return numeric === null ? null : normalizePercentValue(numeric)
}

function metric(label: string, value: unknown, options?: { currency?: boolean; percent?: boolean; toneValue?: number | null }): MarketMetric {
  const numeric = parseMarketNumber(value)
  const tone =
    options?.toneValue === undefined || options.toneValue === null
      ? undefined
      : options.toneValue > 0
        ? 'positive'
        : options.toneValue < 0
          ? 'negative'
          : 'neutral'
  return {
    label,
    value: numeric === null ? textValue(value) : formatMarketCompact(numeric, options),
    tone,
  }
}

function normalizeProfile(payload: unknown, ticker: string, prediction: MarketPredictionRow | null): MarketCompanyProfile {
  const record = marketDataRecord(payload)
  const profile = isRecord(record.profile) ? record.profile : {}
  const detail = isRecord(record.latest_detail) ? record.latest_detail : {}
  const trading = isRecord(record.trading_stat) ? record.trading_stat : {}
  const price = parseMarketNumber(marketRecordValue(trading, ['price', 'close', 'Close'])) ?? prediction?.lastPrice ?? null
  const previousClose = parseMarketNumber(marketRecordValue(trading, ['previous_close', 'previousClose']))
  const change = price !== null && previousClose !== null ? price - previousClose : null
  const changePercent = price !== null && previousClose !== null && previousClose !== 0 ? (change! / previousClose) * 100 : null
  const symbol = textValue(marketRecordValue(profile, ['symbol', 'Symbol']), ticker).toUpperCase()

  return {
    companyName: textValue(marketRecordValue(profile, ['companyName', 'company_name', 'name']), symbol),
    symbol,
    industry: textValue(marketRecordValue(profile, ['industry', 'sector'])),
    exchange: textValue(marketRecordValue(profile, ['exchange', 'exchangeShortName'])),
    description: textValue(profile.description, 'No company profile is available yet.'),
    logoUrl: `https://images.financialmodelingprep.com/symbol/${symbol}.png`,
    price,
    previousClose,
    change,
    changePercent,
    companyStats: [
      metric('Market Cap', detail.market_cap, { currency: true }),
      metric('P/B Ratio', detail.pb_ratio),
      metric('EV/Sales', detail.ev_to_sales),
      metric('P/S Ratio', detail.price_to_sales_ratio),
      metric('Beta', detail.beta),
      metric('Return on Equity', detail.roe, { percent: true }),
      metric('Current Ratio', detail.current_ratio),
      metric('FCF Yield', detail.free_cash_flow_yield, { percent: true }),
    ],
    tradingStats: [
      metric('Open', trading.open_price, { currency: true }),
      metric('Previous Close', trading.previous_close, { currency: true }),
      metric('Day High', trading.day_high, { currency: true }),
      metric('Day Low', trading.day_low, { currency: true }),
      metric('52W High', trading.year_high, { currency: true }),
      metric('52W Low', trading.year_low, { currency: true }),
      metric('Volume', trading.volume),
      metric('Avg Volume', trading.avg_volume),
    ],
  }
}

function normalizeAnalyst(payload: unknown): {
  consensus: MarketAnalystConsensusItem[]
  targets: MarketAnalystTargetRow[]
  latestRating: string
} {
  const record = marketDataRecord(payload)
  const rating = isRecord(record.rating_data) ? record.rating_data : {}
  const targets = parseArray(record.pt_data).map((row) => {
    const date = dateParts(row.end_date)
    return {
      date: date.label,
      timestamp: date.timestamp,
      target: parseMarketNumber(row.target_mean),
      minPrice: parseMarketNumber(row.price_min),
      maxPrice: parseMarketNumber(row.price_max),
      reportCount: parseMarketNumber(row.num),
      accuracy: parseMarketNumber(row.mean_acc),
    }
  })

  const consensus: MarketAnalystConsensusItem[] = [
    { label: 'Strong Buy', percent: parsePercentValue(rating.analyst_ratings_strong_buy_percent), count: parseMarketNumber(rating.analyst_ratings_strong_buy), color: '#16a34a' },
    { label: 'Buy', percent: parsePercentValue(rating.analyst_ratings_buy_percent), count: parseMarketNumber(rating.analyst_ratings_buy), color: '#62b84f' },
    { label: 'Hold', percent: parsePercentValue(rating.analyst_ratings_hold_percent), count: parseMarketNumber(rating.analyst_ratings_hold), color: '#f59e0b' },
    { label: 'Sell', percent: parsePercentValue(rating.analyst_ratings_sell_percent), count: parseMarketNumber(rating.analyst_ratings_sell), color: '#f97316' },
    { label: 'Strong Sell', percent: parsePercentValue(rating.analyst_ratings_strong_sell_percent), count: parseMarketNumber(rating.analyst_ratings_strong_sell), color: '#ef4444' },
  ]

  return { consensus, targets, latestRating: textValue(rating.latest_rating, '') }
}

function normalizeEarnings(payload: unknown): MarketEarningsRow[] {
  const record = marketDataRecord(payload)
  const earning = isRecord(record.earning_data) ? record.earning_data : {}
  return parseArray(earning.history_earn_data).map((row) => ({
    period: periodLabel(row),
    estimatedEps: parseMarketNumber(row.eps_estimated),
    actualEps: parseMarketNumber(row.eps),
    estimatedRevenue: parseMarketNumber(row.revenue_estimated),
    actualRevenue: parseMarketNumber(row.revenue),
    surprise: parseMarketNumber(row.eps_surprise),
  }))
}

function normalizeIncome(payload: unknown, balancePayload: unknown): MarketFinancialRow[] {
  const incomeRecord = marketDataRecord(payload)
  const balanceRecord = marketDataRecord(balancePayload)
  const income = parseNestedDataArray(incomeRecord, ['income_data', 'data'])
  const balance = parseNestedDataArray(balanceRecord, ['balance_data', 'data'])
  return income.map((row, index) => ({
    period: periodLabel(row),
    revenue: parseMarketNumber(row.revenue),
    netIncome: parseMarketNumber(row.net_income),
    ebitda: parseMarketNumber(row.ebitda),
    totalDebt: parseMarketNumber(balance[index]?.total_debt),
  }))
}

function normalizeBalance(payload: unknown): MarketBalanceSheetRow[] {
  const record = marketDataRecord(payload)
  return parseNestedDataArray(record, ['balance_data', 'data']).map((row) => ({
    period: periodLabel(row),
    totalAssets: parseMarketNumber(row.total_assets),
    totalLiabilities: parseMarketNumber(row.total_liabilities),
    totalEquity: parseMarketNumber(row.total_equity),
    currentRatio: parseMarketNumber(row.current_ratio),
  }))
}

function normalizeCash(payload: unknown): MarketCashFlowRow[] {
  const record = marketDataRecord(payload)
  return parseNestedDataArray(record, ['cash_data', 'data']).map((row) => ({
    period: periodLabel(row),
    operatingCashFlow: parseMarketNumber(row.net_cash_provided_by_operating_activities),
    freeCashFlow: parseMarketNumber(row.free_cash_flow),
    cashBalance: parseMarketNumber(row.cash_at_end_of_period),
  }))
}

function normalizeOwnership(payload: unknown): Array<{ title: string; metrics: MarketMetric[] }> {
  const record = marketDataRecord(payload)
  const holder = isRecord(record.holder_data) ? record.holder_data : {}
  return [
    {
      title: 'Insider Transactions',
      metrics: [
        metric('Annual Trading Volume', holder.insider_activity_annual_trading_volume, { currency: true }),
        metric('Buy/Sell Ratio', holder.insider_activity_buy_sell_ratio),
        metric('Net Buying Sentiment', holder.insider_activity_net_buy_sentiment, { percent: true }),
      ],
    },
    {
      title: 'Institutional Holdings',
      metrics: [
        metric('Total Holding', holder.institution_activity_total_holding, { currency: true }),
        metric('Quarterly Change', holder.institution_activity_quarterly_change, { percent: true }),
        metric('Average Position', holder.institution_activity_avg_position, { currency: true }),
      ],
    },
    {
      title: 'Mutual Fund Holdings',
      metrics: [
        metric('Total Fund Holding', holder.mutual_fund_total_holding, { currency: true }),
        metric('Unique Funds', holder.mutual_fund_unique_funds),
        metric('Average Holding Size', holder.mutual_fund_avg_holding_size, { currency: true }),
      ],
    },
  ]
}

function normalizeNews(payload: unknown): MarketNewsRow[] {
  const record = marketDataRecord(payload)
  return parseArray(record.news_data).map((row, index) => ({
    id: `${row.symbol ?? 'news'}-${index}`,
    date: dateParts(row.published_date).label,
    symbol: textValue(row.symbol),
    title: textValue(row.news_title),
    source: textValue(row.source),
    url: textValue(row.news_url, ''),
  }))
}

function normalizeSec(payload: unknown): MarketSecRow[] {
  const record = marketDataRecord(payload)
  return parseArray(record.sec_data).map((row, index) => ({
    id: `${row.symbol ?? 'sec'}-${index}`,
    date: dateParts(row.filling_date).label,
    type: textValue(row.sec_type),
    description: textValue(row.description),
    url: textValue(row.finalLink, ''),
  }))
}

function defaultConsensusFromPrediction(prediction: MarketPredictionRow | null): MarketAnalystConsensusItem[] {
  const labels: MarketAnalystConsensusItem[] = [
    { label: 'Strong Buy', percent: 0, count: 0, color: '#16a34a' },
    { label: 'Buy', percent: 0, count: 0, color: '#62b84f' },
    { label: 'Hold', percent: 0, count: 0, color: '#f59e0b' },
    { label: 'Sell', percent: 0, count: 0, color: '#f97316' },
    { label: 'Strong Sell', percent: 0, count: 0, color: '#ef4444' },
  ]
  if (!prediction) return labels
  const target = labels.find((item) => item.label.toLowerCase() === prediction.rating.toLowerCase()) ?? labels.find((item) => item.label.toLowerCase().includes(prediction.ratingCategory))
  if (target) {
    target.percent = 100
    target.count = prediction.analystCoverage
  }
  return labels
}

function fallbackAnalystTarget(prediction: MarketPredictionRow | null): MarketAnalystTargetRow[] {
  if (!prediction) return []
  return [
    {
      date: prediction.predictionEndDate,
      timestamp: prediction.predictionEndTimestamp,
      target: prediction.target,
      minPrice: null,
      maxPrice: null,
      reportCount: prediction.analystCoverage,
      accuracy: prediction.meanAccuracy,
    },
  ]
}

export function latestItem<T>(rows: T[]) {
  return rows.length ? rows[rows.length - 1] : null
}

export function predictionDisplayName(row: MarketPredictionRow) {
  return textValue(marketRecordValue(row.raw, ['companyName', 'company_name', 'name', 'Name']), row.ticker)
}

export function normalizeMarketPredictionDetail(
  ticker: string,
  parts: MarketDetailRawParts,
  prediction: MarketPredictionRow | null,
): MarketPredictionDetail {
  const analyst = normalizeAnalyst(parts.analyst)
  const analystTargets = analyst.targets.length ? analyst.targets : fallbackAnalystTarget(prediction)

  return {
    ticker,
    prediction,
    profile: normalizeProfile(parts.profile, ticker, prediction),
    analystConsensus: analyst.consensus.some((item) => (item.count ?? 0) > 0 || (item.percent ?? 0) > 0)
      ? analyst.consensus
      : defaultConsensusFromPrediction(prediction),
    analystTargets,
    earnings: normalizeEarnings(parts.earnings),
    financials: normalizeIncome(parts.income, parts.balance),
    balanceSheet: normalizeBalance(parts.balance),
    cashFlow: normalizeCash(parts.cash),
    ownershipPanels: normalizeOwnership(parts.ownership),
    news: normalizeNews(parts.news),
    sec: normalizeSec(parts.sec),
  }
}

export function targetSummaryText(row: MarketAnalystTargetRow) {
  return [
    formatMarketCurrency(row.target),
    row.accuracy === null ? '— accuracy' : `${formatMarketPercent(row.accuracy)} accuracy`,
    row.reportCount === null ? '— reports' : `${row.reportCount} reports`,
  ].join(' · ')
}

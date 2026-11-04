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
  MarketEarningsInfo,
  MarketEarningsRow,
  MarketFinancialRow,
  MarketInsiderTransactionRow,
  MarketInstitutionalHoldingRow,
  MarketMetric,
  MarketMutualFundHoldingRow,
  MarketNewsRow,
  MarketPredictionDetail,
  MarketSecRow,
  MarketUpcomingEarningsRow,
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

export function formatUTCDate(isoStr: unknown): string {
  const text = String(isoStr ?? '').trim()
  if (!text) return '—'
  const [year, month, day] = text.split('T')[0].split('-').map(Number)
  if (!year || !month || !day) return text
  const date = new Date(Date.UTC(year, month - 1, day))
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
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

function newsTimeLabel(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text) return '—'

  const timestamp = Date.parse(text)
  if (!Number.isFinite(timestamp)) return text

  const date = new Date(timestamp)
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const year = date.getUTCFullYear()
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const hour24 = date.getUTCHours()
  const ampm = hour24 >= 12 ? 'PM' : 'AM'
  const hour = hour24 % 12 || 12

  return `${month}/${day}/${year} ${hour}:${minutes} ${ampm}`
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

function metric(
  label: string,
  value: unknown,
  options?: {
    currency?: boolean
    percent?: boolean
    toneValue?: number | null
    description?: string
    suffix?: string
  },
): MarketMetric {
  const numeric = parseMarketNumber(value)
  const tone =
    options?.toneValue === undefined || options.toneValue === null
      ? undefined
      : options.toneValue > 0
        ? 'positive'
        : options.toneValue < 0
          ? 'negative'
          : 'neutral'
  const formatted = numeric === null ? textValue(value) : `${formatMarketCompact(numeric, options)}${options?.suffix ?? ''}`
  return {
    label,
    value: formatted,
    tone,
    description: options?.description,
    available: numeric !== null,
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
      metric('Market Cap', detail.market_cap, {
        currency: true,
        description: "Market cap is the most direct indicator of a company's size. It's calculated by multiplying the total number of outstanding shares by the current stock price.",
      }),
      metric('P/E Ratio', detail.pe_ratio, {
        description: 'The Price-to-Earnings (P/E) ratio divides the current share price by the earnings per share (EPS). It indicates how much investors are willing to pay for each unit of earnings.',
      }),
      metric('P/B Ratio', detail.pb_ratio, {
        description: 'The Price-to-Book (P/B) ratio divides the current share price by the book value per share, comparing market value to book value (net assets).',
      }),
      metric('EV/Sales', detail.ev_to_sales, {
        description: 'EV/Sales divides Enterprise Value by total sales revenue. It is similar to P/S but factors in debt and cash for a more comprehensive view of company value.',
      }),
      metric('EV/EBITDA', detail.enterprise_value_over_ebitda, {
        description: "EV/EBITDA divides Enterprise Value by EBITDA, reflecting the core business's cash-generating capability before interest, taxes, depreciation and amortization.",
      }),
      metric('P/S Ratio', detail.price_to_sales_ratio, {
        description: 'The Price-to-Sales (P/S) ratio divides market capitalization by total sales revenue from the last fiscal year, useful for growth companies that may not yet be profitable.',
      }),
      metric('Beta', detail.beta, {
        description: 'The Beta Coefficient measures the volatility of an individual stock or investment portfolio relative to the overall market.',
      }),
      metric('Return on Equity', detail.roe, {
        percent: true,
        description: "Return on Equity (ROE) is net income divided by average shareholders' equity. It measures how effectively a company uses shareholder capital to generate profits.",
      }),
      metric('ROIC', detail.roic, {
        percent: true,
        description: 'Return on Invested Capital (ROIC) measures how efficiently a company uses all its invested capital (equity and debt) to generate profits.',
      }),
      metric('Current Ratio', detail.current_ratio, {
        description: "The Current Ratio divides current assets by current liabilities. It measures a company's ability to pay off short-term debts.",
      }),
      metric('FCF Yield', detail.free_cash_flow_yield, {
        percent: true,
        description: 'Free Cash Flow Yield divides Free Cash Flow by market capitalization. It shows the cash left after operations and capital expenditures relative to company value.',
      }),
      metric('Dividend Yield', detail.dividend_yield, {
        percent: true,
        description: 'Dividend yield divides the annual dividend per share by the current share price. It measures how much cash dividend an investor receives per share.',
      }),
    ],
    tradingStats: [
      metric('Price', trading.price, { currency: true }),
      metric('Open', trading.open_price, { currency: true }),
      metric('Previous Close', trading.previous_close, { currency: true }),
      metric('Day High', trading.day_high, { currency: true }),
      metric('Day Low', trading.day_low, { currency: true }),
      metric('52W High', trading.year_high, { currency: true }),
      metric('52W Low', trading.year_low, { currency: true }),
      metric('Volume', trading.volume),
      metric('Avg Volume', trading.avg_volume),
      metric('ATR (14)', trading.atr14),
      metric('200MA Distance', trading.ma200_distance, { suffix: '%' }),
      metric('Relative Volume', trading.relative_volume, { suffix: 'x' }),
    ],
  }
}

function normalizeAnalyst(payload: unknown): {
  consensus: MarketAnalystConsensusItem[]
  targets: MarketAnalystTargetRow[]
  latestRating: number | null
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

  return { consensus, targets, latestRating: parseMarketNumber(rating.latest_rating) }
}

function normalizeEarnings(payload: unknown): MarketEarningsRow[] {
  const record = marketDataRecord(payload)
  const earning = isRecord(record.earning_data) ? record.earning_data : {}
  return parseArray(earning.history_earn_data).map((row) => ({
    period: periodLabel(row),
    fiscalDate: textValue(row.fiscal_date_ending, ''),
    estimatedEps: parseMarketNumber(row.eps_estimated),
    actualEps: parseMarketNumber(row.eps),
    estimatedRevenue: parseMarketNumber(row.revenue_estimated),
    actualRevenue: parseMarketNumber(row.revenue),
    surprise: parseMarketNumber(row.eps_surprise),
    epsSurprise: parseMarketNumber(row.eps_surprise),
    revenueSurprise: parseMarketNumber(row.revenue_surprise),
    yoyGrowth: parseMarketNumber(row.yoy_growth),
    qoqGrowth: parseMarketNumber(row.qoq_growth),
  }))
}

function normalizeEarningsInfo(payload: unknown): MarketEarningsInfo | null {
  const record = marketDataRecord(payload)
  const earning = isRecord(record.earning_data) ? record.earning_data : {}
  const avgEps = parseMarketNumber(earning.avg_eps)
  const beatCount = parseMarketNumber(earning.beat_count)
  const missCount = parseMarketNumber(earning.miss_count)
  const avgSurprise = parseMarketNumber(earning.avg_eps_surprise)
  if (avgEps === null && beatCount === null && missCount === null && avgSurprise === null) return null
  return { avgEps, beatCount, missCount, avgSurprise }
}

function normalizeUpcomingEarnings(payload: unknown): MarketUpcomingEarningsRow[] {
  const record = marketDataRecord(payload)
  const earning = isRecord(record.earning_data) ? record.earning_data : {}
  return parseArray(earning.upcoming_earn_data).map((row) => ({
    date: formatUTCDate(row.fiscal_date_ending),
    estimatedEps: parseMarketNumber(row.eps_estimated),
    estimatedRevenue: parseMarketNumber(row.revenue_estimated),
  }))
}

export function normalizeIncome(payload: unknown, balancePayload: unknown): MarketFinancialRow[] {
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
    grossProfit: parseMarketNumber(row.gross_profit),
    operatingIncome: parseMarketNumber(row.operating_income),
    grossMargin: parseMarketNumber(row.gross_margin),
    operatingMargin: parseMarketNumber(row.operating_margin),
    netMargin: parseMarketNumber(row.net_margin),
    assetTurnover: parseMarketNumber(row.asset_turnover),
    returnOnEquity: parseMarketNumber(row.return_on_equity),
    returnOnAsset: parseMarketNumber(row.return_on_asset),
    altmanZScore: parseMarketNumber(row.altman_z_score),
    piotroskiScore: parseMarketNumber(row.piotroski_score),
    revenueYoY: parseMarketNumber(row.revenue_yoy_growth),
    grossProfitYoY: parseMarketNumber(row.gross_profit_yoy_growth),
    operatingIncomeYoY: parseMarketNumber(row.operating_income_yoy_growth),
    netIncomeYoY: parseMarketNumber(row.net_income_yoy_growth),
    ebitdaYoY: parseMarketNumber(row.ebitda_yoy_growth),
    revenueRatio: parseMarketNumber(row.revenue_ratio),
    grossProfitRatio: parseMarketNumber(row.gross_profit_ratio),
    operatingIncomeRatio: parseMarketNumber(row.operating_income_ratio),
    netIncomeRatio: parseMarketNumber(row.net_income_ratio),
    ebitdaRatio: parseMarketNumber(row.ebitda_ratio),
  }))
}

export function normalizeBalance(payload: unknown): MarketBalanceSheetRow[] {
  const record = marketDataRecord(payload)
  return parseNestedDataArray(record, ['balance_data', 'data']).map((row) => ({
    period: periodLabel(row),
    totalAssets: parseMarketNumber(row.total_assets),
    totalLiabilities: parseMarketNumber(row.total_liabilities),
    totalEquity: parseMarketNumber(row.total_equity),
    currentRatio: parseMarketNumber(row.current_ratio),
    cashAndCashEquivalents: parseMarketNumber(row.cash_and_cash_equivalents),
    totalDebt: parseMarketNumber(row.total_debt),
    // Assets
    totalCurrentAssets: parseMarketNumber(row.total_current_assets),
    totalNonCurrentAssets: parseMarketNumber(row.total_non_current_assets),
    shortTermInvestments: parseMarketNumber(row.short_term_investments),
    netReceivables: parseMarketNumber(row.net_receivables),
    inventory: parseMarketNumber(row.inventory),
    longTermInvestments: parseMarketNumber(row.long_term_investments),
    propertyPlantEquipmentNet: parseMarketNumber(row.property_plant_equipment_net),
    goodwill: parseMarketNumber(row.goodwill),
    intangibleAssets: parseMarketNumber(row.intangible_assets),
    // Liabilities
    totalCurrentLiabilities: parseMarketNumber(row.total_current_liabilities),
    totalNonCurrentLiabilities: parseMarketNumber(row.total_non_current_liabilities),
    accountPayables: parseMarketNumber(row.account_payables),
    shortTermDebt: parseMarketNumber(row.short_term_debt),
    deferredRevenue: parseMarketNumber(row.deferred_revenue),
    deferredRevenueNonCurrent: parseMarketNumber(row.deferred_revenue_non_current),
    otherNonCurrentLiabilities: parseMarketNumber(row.other_non_current_liabilities),
    longTermDebt: parseMarketNumber(row.long_term_debt),
    retainedEarnings: parseMarketNumber(row.retained_earnings),
    commonStock: parseMarketNumber(row.common_stock),
    // Ratios
    quickRatio: parseMarketNumber(row.quick_ratio),
    cashRatio: parseMarketNumber(row.cash_ratio),
    assetTurnover: parseMarketNumber(row.asset_turnover),
    fixedAssetTurnover: parseMarketNumber(row.fixed_asset_turnover),
    inventoryTurnover: parseMarketNumber(row.inventory_turnover),
    d2eRatio: parseMarketNumber(row.d2e_ratio),
    d2cRatio: parseMarketNumber(row.d2c_ratio),
    equityRatio: parseMarketNumber(row.equity_ratio),
    assetGrowth: parseMarketNumber(row.asset_growth),
    liabilitiesGrowth: parseMarketNumber(row.liabilities_growth),
    equityGrowth: parseMarketNumber(row.equity_growth),
  }))
}

export function normalizeCash(payload: unknown): MarketCashFlowRow[] {
  const record = marketDataRecord(payload)
  return parseNestedDataArray(record, ['cash_data', 'data']).map((row) => ({
    period: periodLabel(row),
    fiscalDate: textValue(row.date, ''),
    operatingCashFlow: parseMarketNumber(row.net_cash_provided_by_operating_activities),
    freeCashFlow: parseMarketNumber(row.free_cash_flow),
    cashBalance: parseMarketNumber(row.cash_at_end_of_period),
    netIncome: parseMarketNumber(row.net_income),
    depreciationAndAmortization: parseMarketNumber(row.depreciation_and_amortization),
    changeInWorkingCapital: parseMarketNumber(row.change_in_working_capital),
    capitalExpenditure: parseMarketNumber(row.capital_expenditure),
    acquisitionsNet: parseMarketNumber(row.acquisitions_net),
    debtRepayment: parseMarketNumber(row.debt_repayment),
    commonStockRepurchased: parseMarketNumber(row.common_stock_repurchased),
    dividendsPaid: parseMarketNumber(row.dividends_paid),
    netChangeInCash: parseMarketNumber(row.net_change_in_cash),
    investingCashFlow: parseMarketNumber(row.net_cash_used_for_investing_activities),
    financingCashFlow: parseMarketNumber(row.net_cash_used_provided_by_financing_activities),
    operatingCashFlowRatio: parseMarketNumber(row.operating_cash_flow_ratio),
    cashFlowYield: parseMarketNumber(row.cash_flow_yield),
    cashConversionCycle: parseMarketNumber(row.cash_conversion_cycle),
    operatingCashFlowGrowth: parseMarketNumber(row.operating_cash_flow_growth),
    freeCashFlowGrowth: parseMarketNumber(row.free_cash_flow_growth),
    reinvestmentRate: parseMarketNumber(row.reinvestment_rate),
    capexToOperatingCash: parseMarketNumber(row.capEx2operating_cash),
    cashFlowCoverage: parseMarketNumber(row.cash_flow_coverage),
    cashConversionChange: parseMarketNumber(row.cash_conversion_change),
    operatingRatioChange: parseMarketNumber(row.operating_ratio_change),
    freeCashFlowMargin: parseMarketNumber(row.free_cash_flow_margin),
    freeFlowToDebt: parseMarketNumber(row.free_flow2debt),
  }))
}

// Mirrors Vue2 `formatNumber(value, 'customSign', sign)`: the magnitude is
// formatted from `Math.abs(value)` with two fixed decimals (units above 1K),
// so trailing zeros are kept and negative values lose their minus sign.
function formatOwnershipCustom(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${(abs / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(2)}K`
  return abs.toFixed(2)
}

function ownershipMetric(label: string, value: unknown, format: 'currency' | 'number' | 'percent', suffix = '', description = ''): MarketMetric {
  const numeric = parseMarketNumber(value)
  let formatted: string
  if (numeric === null) {
    formatted = '-'
  } else if (format === 'percent') {
    formatted = `${formatOwnershipCustom(numeric)}%`
  } else if (format === 'number') {
    formatted = formatOwnershipCustom(numeric)
  } else {
    formatted = formatMarketCompact(numeric, { currency: true })
  }
  return {
    label,
    value: `${formatted}${suffix}`,
    description,
    zero: numeric === 0,
  }
}

function normalizeOwnership(payload: unknown): {
  panels: Array<{ title: string; metrics: MarketMetric[] }>
  insiders: MarketInsiderTransactionRow[]
  institutions: MarketInstitutionalHoldingRow[]
  funds: MarketMutualFundHoldingRow[]
} {
  const record = marketDataRecord(payload)
  const holder = isRecord(record.holder_data) ? record.holder_data : {}

  const panels = [
    {
      title: 'Executive Insider Activity',
      metrics: [
        ownershipMetric('Annual Trading Volume', holder.insider_activity_annual_trading_volume, 'currency', '', 'The total number of shares bought and sold by company insiders within a year.'),
        ownershipMetric('Buy/Sell Ratio', holder.insider_activity_buy_sell_ratio, 'number', 'x', 'The ratio of the total number of shares bought by insiders to the total number of shares sold by insiders over a specific period (e.g., quarterly or annually).'),
        ownershipMetric('Net Buying Sentiment', holder.insider_activity_net_buy_sentiment, 'percent', '', 'Net Buy Sentiment is a qualitative or quantitative metric derived from the Insider Buy/Sell Ratio, usually expressed as a percentage or a sentiment score. It indicates whether insiders are, overall, net buyers or net sellers.'),
      ],
    },
    {
      title: 'Institutional Activity',
      metrics: [
        ownershipMetric('Total Holding', holder.institution_activity_total_holding, 'currency', '', 'The total number of shares of a company\'s stock held by all reporting institutional investors at a specific point in time (typically reported quarterly through 13F filings).'),
        ownershipMetric('Quarterly Change', holder.institution_activity_quarterly_change, 'percent', '', 'The percentage or absolute change in total institutional holdings from one quarter to the next.'),
        ownershipMetric('Average Position', holder.institution_activity_avg_position, 'currency', '', 'The average number of shares held by each institutional investor.'),
      ],
    },
    {
      title: 'Mutual Fund Holdings',
      metrics: [
        ownershipMetric('Total Fund Holding', holder.mutual_fund_total_holding, 'currency', '', 'The total number of shares of a company\'s stock held by all reporting mutual funds.'),
        ownershipMetric('Unique Funds', holder.mutual_fund_unique_funds, 'number', '', 'The number of distinct mutual funds that hold a company\'s stock.'),
        ownershipMetric('Average Holding Size', holder.mutual_fund_avg_holding_size, 'currency', '', 'The average number of shares held by each independent mutual fund.'),
      ],
    },
  ]

  const insiders = parseNestedDataArray(record, ['insider_data', 'data']).map((row, index) => ({
    id: `insider-${index}`,
    date: dateParts(row.transaction_date).label,
    timestamp: dateParts(row.transaction_date).timestamp,
    insider: textValue(row.reporting_name),
    type: textValue(row.type),
    shares: parseMarketNumber(row.securities_transacted),
    price: parseMarketNumber(row.price),
    value: parseMarketNumber(row.value),
  }))

  const institutions = parseArray(holder.institutional_holders).map((row, index) => ({
    id: `institution-${index}`,
    name: textValue(row.holder),
    date: dateParts(row.date_reported).label,
    timestamp: dateParts(row.date_reported).timestamp,
    shares: parseMarketNumber(row.shares),
    changesShares: parseMarketNumber(row.share_change),
    changePercent: parseMarketNumber(row.change_percent),
    value: parseMarketNumber(row.value),
  }))

  const funds = parseArray(holder.fund_holders).map((row, index) => ({
    id: `fund-${index}`,
    name: textValue(row.holder),
    shares: parseMarketNumber(row.shares),
    dayReported: dateParts(row.date_reported).label,
    timestamp: dateParts(row.date_reported).timestamp,
    value: parseMarketNumber(row.value),
  }))

  return { panels, insiders, institutions, funds }
}

function normalizeNews(payload: unknown): MarketNewsRow[] {
  const record = marketDataRecord(payload)
  return parseArray(record.news_data).map((row, index) => ({
    id: `${row.symbol ?? 'news'}-${index}`,
    date: dateParts(row.published_date).label,
    time: newsTimeLabel(row.published_date),
    publishedAt: textValue(row.published_date, ''),
    symbol: textValue(row.symbol),
    title: textValue(row.news_title),
    source: textValue(row.source),
    imageUrl: textValue(row.image_url, ''),
    url: textValue(row.news_url, ''),
  }))
}

function normalizeSec(payload: unknown): MarketSecRow[] {
  const record = marketDataRecord(payload)
  return parseArray(record.sec_data).map((row, index) => ({
    id: `${row.symbol ?? 'sec'}-${index}`,
    date: dateParts(row.filling_date).label,
    ticker: textValue(row.symbol),
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

  const ownership = normalizeOwnership(parts.ownership)

  return {
    ticker,
    prediction,
    profile: normalizeProfile(parts.profile, ticker, prediction),
    analystConsensus: analyst.consensus.some((item) => (item.count ?? 0) > 0 || (item.percent ?? 0) > 0)
      ? analyst.consensus
      : defaultConsensusFromPrediction(prediction),
    analystLatestRating: analyst.latestRating,
    analystTargets,
    earnings: normalizeEarnings(parts.earnings),
    earningsInfo: normalizeEarningsInfo(parts.earnings),
    upcomingEarnings: normalizeUpcomingEarnings(parts.earnings),
    financials: normalizeIncome(parts.income, parts.balance),
    balanceSheet: normalizeBalance(parts.balance),
    cashFlow: normalizeCash(parts.cash),
    ownershipPanels: ownership.panels,
    ownershipInsiders: ownership.insiders,
    ownershipInstitutions: ownership.institutions,
    ownershipFunds: ownership.funds,
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

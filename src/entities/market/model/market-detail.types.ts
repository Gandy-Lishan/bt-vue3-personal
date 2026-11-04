import type { MarketPredictionRow } from './market-prediction.types'

export type MarketDetailTab =
  | 'overview'
  | 'chart'
  | 'analysts'
  | 'earnings'
  | 'financials'
  | 'balanceSheet'
  | 'cashFlow'
  | 'ownership'
  | 'news'
  | 'sec'

export interface MarketMetric {
  label: string
  value: string
  tone?: 'positive' | 'negative' | 'neutral'
  description?: string
  /** True when the underlying value parsed as exactly zero (used to hide all-zero panels). */
  zero?: boolean
}

export interface MarketChartPoint {
  label: string
  value: number | null
  secondaryValue?: number | null
}

/** Daily OHLC row from `/dev/st_data/pair_data` (Chart tab). */
export interface MarketPriceRow {
  date: string
  open: number | null
  high: number | null
  low: number | null
  close: number | null
}

export interface MarketCompanyProfile {
  companyName: string
  symbol: string
  industry: string
  exchange: string
  description: string
  logoUrl: string
  price: number | null
  previousClose: number | null
  change: number | null
  changePercent: number | null
  companyStats: MarketMetric[]
  tradingStats: MarketMetric[]
}

export interface MarketAnalystConsensusItem {
  label: string
  percent: number | null
  count: number | null
  color: string
}

export interface MarketAnalystTargetRow {
  date: string
  timestamp: number | null
  target: number | null
  minPrice: number | null
  maxPrice: number | null
  reportCount: number | null
  accuracy: number | null
}

export interface MarketEarningsRow {
  period: string
  fiscalDate?: string
  estimatedEps: number | null
  actualEps: number | null
  estimatedRevenue: number | null
  actualRevenue: number | null
  surprise: number | null
  epsSurprise?: number | null
  revenueSurprise?: number | null
  yoyGrowth?: number | null
  qoqGrowth?: number | null
}

export interface MarketEarningsInfo {
  avgEps: number | null
  beatCount: number | null
  missCount: number | null
  avgSurprise: number | null
}

export interface MarketUpcomingEarningsRow {
  date: string
  estimatedEps: number | null
  estimatedRevenue: number | null
}

export interface MarketFinancialRow {
  period: string
  revenue: number | null
  netIncome: number | null
  ebitda: number | null
  totalDebt?: number | null
  // Additional fields for Financials tab
  grossProfit?: number | null
  operatingIncome?: number | null
  grossMargin?: number | null
  operatingMargin?: number | null
  netMargin?: number | null
  assetTurnover?: number | null
  returnOnEquity?: number | null
  returnOnAsset?: number | null
  altmanZScore?: number | null
  piotroskiScore?: number | null
  revenueYoY?: number | null
  grossProfitYoY?: number | null
  operatingIncomeYoY?: number | null
  netIncomeYoY?: number | null
  ebitdaYoY?: number | null
  revenueRatio?: number | null
  grossProfitRatio?: number | null
  operatingIncomeRatio?: number | null
  netIncomeRatio?: number | null
  ebitdaRatio?: number | null
}

export interface MarketCashFlowRow {
  period: string
  fiscalDate?: string
  operatingCashFlow: number | null
  freeCashFlow: number | null
  cashBalance: number | null
  // Raw API fields for activities tables and charts
  netIncome?: number | null
  depreciationAndAmortization?: number | null
  changeInWorkingCapital?: number | null
  capitalExpenditure?: number | null
  acquisitionsNet?: number | null
  debtRepayment?: number | null
  commonStockRepurchased?: number | null
  dividendsPaid?: number | null
  netChangeInCash?: number | null
  investingCashFlow?: number | null
  financingCashFlow?: number | null
  operatingCashFlowRatio?: number | null
  cashFlowYield?: number | null
  cashConversionCycle?: number | null
  operatingCashFlowGrowth?: number | null
  freeCashFlowGrowth?: number | null
  reinvestmentRate?: number | null
  capexToOperatingCash?: number | null
  cashFlowCoverage?: number | null
  cashConversionChange?: number | null
  operatingRatioChange?: number | null
  freeCashFlowMargin?: number | null
  freeFlowToDebt?: number | null
}

export interface MarketBalanceSheetRow {
  period: string
  totalAssets: number | null
  totalLiabilities: number | null
  totalEquity: number | null
  currentRatio: number | null
  // Additional fields for Financials tab
  cashAndCashEquivalents?: number | null
  totalDebt?: number | null
  // Additional fields for Balance Sheet tab — Assets
  totalCurrentAssets?: number | null
  totalNonCurrentAssets?: number | null
  shortTermInvestments?: number | null
  netReceivables?: number | null
  inventory?: number | null
  longTermInvestments?: number | null
  propertyPlantEquipmentNet?: number | null
  goodwill?: number | null
  intangibleAssets?: number | null
  // Liabilities
  totalCurrentLiabilities?: number | null
  totalNonCurrentLiabilities?: number | null
  accountPayables?: number | null
  shortTermDebt?: number | null
  deferredRevenue?: number | null
  deferredRevenueNonCurrent?: number | null
  otherNonCurrentLiabilities?: number | null
  longTermDebt?: number | null
  retainedEarnings?: number | null
  commonStock?: number | null
  // Ratios
  quickRatio?: number | null
  cashRatio?: number | null
  assetTurnover?: number | null
  fixedAssetTurnover?: number | null
  inventoryTurnover?: number | null
  d2eRatio?: number | null
  d2cRatio?: number | null
  equityRatio?: number | null
  assetGrowth?: number | null
  liabilitiesGrowth?: number | null
  equityGrowth?: number | null
}

export interface MarketNewsRow {
  id: string
  date: string
  time: string
  publishedAt: string
  symbol: string
  title: string
  source: string
  imageUrl: string
  url: string
}

export interface MarketSecRow {
  id: string
  date: string
  ticker: string
  type: string
  description: string
  url: string
}

export interface MarketInsiderTransactionRow {
  id: string
  date: string
  timestamp: number | null
  insider: string
  type: string
  shares: number | null
  price: number | null
  value: number | null
}

export interface MarketInstitutionalHoldingRow {
  id: string
  name: string
  date: string
  timestamp: number | null
  shares: number | null
  changesShares: number | null
  changePercent: number | null
  value: number | null
}

export interface MarketMutualFundHoldingRow {
  id: string
  name: string
  shares: number | null
  dayReported: string
  timestamp: number | null
  value: number | null
}

export interface MarketPredictionDetail {
  ticker: string
  prediction: MarketPredictionRow | null
  profile: MarketCompanyProfile
  analystConsensus: MarketAnalystConsensusItem[]
  analystLatestRating: number | null
  analystTargets: MarketAnalystTargetRow[]
  earnings: MarketEarningsRow[]
  earningsInfo: MarketEarningsInfo | null
  upcomingEarnings: MarketUpcomingEarningsRow[]
  financials: MarketFinancialRow[]
  balanceSheet: MarketBalanceSheetRow[]
  cashFlow: MarketCashFlowRow[]
  ownershipPanels: Array<{ title: string; metrics: MarketMetric[] }>
  ownershipInsiders: MarketInsiderTransactionRow[]
  ownershipInstitutions: MarketInstitutionalHoldingRow[]
  ownershipFunds: MarketMutualFundHoldingRow[]
  news: MarketNewsRow[]
  sec: MarketSecRow[]
}

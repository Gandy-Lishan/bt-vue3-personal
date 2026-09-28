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
}

export interface MarketChartPoint {
  label: string
  value: number | null
  secondaryValue?: number | null
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
  estimatedEps: number | null
  actualEps: number | null
  estimatedRevenue: number | null
  actualRevenue: number | null
  surprise: number | null
}

export interface MarketFinancialRow {
  period: string
  revenue: number | null
  netIncome: number | null
  ebitda: number | null
  totalDebt?: number | null
}

export interface MarketCashFlowRow {
  period: string
  operatingCashFlow: number | null
  freeCashFlow: number | null
  cashBalance: number | null
}

export interface MarketBalanceSheetRow {
  period: string
  totalAssets: number | null
  totalLiabilities: number | null
  totalEquity: number | null
  currentRatio: number | null
}

export interface MarketNewsRow {
  id: string
  date: string
  symbol: string
  title: string
  source: string
  url: string
}

export interface MarketSecRow {
  id: string
  date: string
  type: string
  description: string
  url: string
}

export interface MarketPredictionDetail {
  ticker: string
  prediction: MarketPredictionRow | null
  profile: MarketCompanyProfile
  analystConsensus: MarketAnalystConsensusItem[]
  analystTargets: MarketAnalystTargetRow[]
  earnings: MarketEarningsRow[]
  financials: MarketFinancialRow[]
  balanceSheet: MarketBalanceSheetRow[]
  cashFlow: MarketCashFlowRow[]
  ownershipPanels: Array<{ title: string; metrics: MarketMetric[] }>
  news: MarketNewsRow[]
  sec: MarketSecRow[]
}

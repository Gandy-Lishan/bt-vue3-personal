export const SMART_SCANNER_PAGE_SIZE = 10

export type SmartScannerDirection = 'Long' | 'Short'
export type SmartScannerSortDirection = 'asc' | 'desc'

export type SmartScannerSortKey =
  | 'date'
  | 'symbol'
  | 'close'
  | 'pctChange'
  | 'trend'
  | 'trendScore'
  | 'direction'
  | 'signal'
  | 'winRate'
  | 'stopLoss'
  | 'profitTarget'
  | 'timeInMarket'
  | 'expectedReturn'
  | 'zScore'

export type SmartScannerRangeKey =
  | 'profitTarget'
  | 'stopLoss'
  | 'timeInMarket'
  | 'maxRisk'
  | 'zScore'
  | 'sharpeRatio'
  | 'stdDev'
  | 'expectedReturn'
  | 'winRate'
  | 'pctChange'
  | 'trendScore'
  | 'relTrendScore'
  | 'optix'
  | 'tradeNumber'

export interface SmartScannerRange {
  min: number | null
  max: number | null
}

export interface SmartScannerRangeDefinition {
  key: SmartScannerRangeKey
  label: string
  suffix?: string
  step?: string
}

export interface SmartScannerRow {
  id: string
  date: string
  dateTimestamp: number | null
  symbol: string
  close: number | null
  pctChange: number | null
  trend: string
  trendScore: number | null
  relTrendScore: number | null
  direction: string
  signal: string
  signalLabel: string
  category: string
  winRate: number | null
  stopLoss: number | null
  profitTarget: number | null
  timeInMarket: number | null
  expectedReturn: number | null
  zScore: number | null
  avgWin: number | null
  maxRisk: number | null
  avgLoss: number | null
  medianReturn: number | null
  tradeNumber: number | null
  annualReturn: number | null
  avgReturn: number | null
  stdDev: number | null
  sharpeRatio: number | null
  optix: number | null
  alloc: number | null
  raw: Record<string, unknown>
}

export interface SmartScannerDetailRequest {
  id: string
  symbol: string
  date: string
  signal: string
  signalLabel: string
  category: string
  direction: string
  close: number | null
  pctChange: number | null
  trendScore: number | null
  winRate: number | null
  timeInMarket: number | null
}

export interface SmartScannerTradeRow {
  id: string
  index: number
  entryDate: string
  exitDate: string
  exitReason: string
  eachReturn: number | null
}

export interface SmartScannerBacktestHistoryRow {
  id: string
  entryDate: string
  oneMonth: number | null
  twoMonths: number | null
  threeMonths: number | null
  fourMonths: number | null
  fiveMonths: number | null
  sixMonths: number | null
  oneYear: number | null
}

export interface SmartScannerPeriodSummaryRow {
  id: string
  metric: string
  oneMonth: number | null
  twoMonths: number | null
  threeMonths: number | null
  fourMonths: number | null
  fiveMonths: number | null
  sixMonths: number | null
  oneYear: number | null
}

export interface SmartScannerChartPoint {
  date: string
  price: number | null
  indicator: number | null
}

export interface SmartScannerBacktestDetail {
  request: SmartScannerDetailRequest
  symbol: string
  displayName: string
  exchange: string
  close: number | null
  pctChange: number | null
  asOfDate: string
  signal: string
  signalLabel: string
  direction: string
  category: string
  trendScore: number | null
  winRate: number | null
  timeInMarket: number | null
  annualReturn: number | null
  medianReturn: number | null
  avgReturn: number | null
  stdDev: number | null
  maxRisk: number | null
  avgWin: number | null
  avgLoss: number | null
  tradeNumber: number | null
  totalPositive: number | null
  totalNegative: number | null
  trades: SmartScannerTradeRow[]
  backtestHistory: SmartScannerBacktestHistoryRow[]
  periodSummary: SmartScannerPeriodSummaryRow[]
  chartRows: SmartScannerChartPoint[]
  raw: Record<string, unknown>
}

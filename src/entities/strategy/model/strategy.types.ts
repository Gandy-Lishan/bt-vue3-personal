export const STRATEGY_PAGE_SIZE = 10

export type StrategyViewMode = 'table' | 'cards'
export type StrategyTab = 'signals' | 'summary'
export type StrategySortDirection = 'asc' | 'desc'

export type StrategyScopeKey =
  | 'all'
  | 'legacy'
  | 'index'
  | 'bond'
  | 'factors'
  | 'sector'
  | 'favorites'
  | 'basket'

export type StrategySignalSortKey =
  | 'modelName'
  | 'timeFrame'
  | 'currentSignal'
  | 'lastSignalDate'
  | 'frequency'
  | 'ytdReturn'
  | 'cagr'

export type StrategySummarySortKey =
  | 'modelName'
  | 'cagr'
  | 'benchmarkCagr'
  | 'netProfit'
  | 'maxDrawdown'
  | 'sharpeRatio'
  | 'profitLossRatio'
  | 'averageWin'
  | 'averageLoss'
  | 'totalTrades'
  | 'winRate'

export type StrategySortKey = StrategySignalSortKey | StrategySummarySortKey

export interface StrategySignalRow {
  id: string
  modelName: string
  url: string
  category: string
  timeFrame: string
  currentSignal: string
  lastSignalDate: string
  lastSignalTimestamp: number | null
  frequency: string
  ytdReturn: number | null
  cagr: number | null
  favorite: boolean
  currentDay: boolean
  updated: string
  raw: Record<string, unknown>
}

export interface StrategySummaryRow {
  id: string
  modelName: string
  url: string
  category: string
  favorite: boolean
  cagr: number | null
  benchmarkCagr: number | null
  netProfit: number | null
  maxDrawdown: number | null
  sharpeRatio: number | null
  profitLossRatio: number | null
  averageWin: number | null
  averageLoss: number | null
  totalTrades: number | null
  winRate: number | null
  raw: Record<string, unknown>
}

export interface StrategyPerformanceRow {
  id: string
  model: string
  modelName: string
  symbolNotLong: string
  startDate: string
  startTimestamp: number | null
  endDate: string
  endTimestamp: number | null
  cagr: number | null
  benchmarkCagr: number | null
  maxDrawdown: number | null
  netProfit: number | null
  expectancy: number | null
  sharpeRatio: number | null
  informationRatio: number | null
  profitLossRatio: number | string | null
  averageWin: number | null
  averageLoss: number | null
  totalTrades: number | null
  winRate: number | null
  tradesPerYear: number | null
  ytdReturn: number | null
  tradeTableUrl: string
  returnsUrl: string
  drawdownUrl: string
  heatmapUrl: string
  annualReturnsUrl: string
  descriptionHtml: string
  symbol1: string
  symbol2: string
  singleModel: string
  buySignal1: string[]
  sellSignal1: string[]
  buySignal2: string[]
  sellSignal2: string[]
  raw: Record<string, unknown>
}

export interface StrategyPairPriceRow {
  id: string
  date: string
  timestamp: number
  close: number
  raw: Record<string, unknown>
}

export interface StrategyChartSeries {
  symbol: string
  points: Array<[number, number, 1 | null, -1 | null]>
}

export interface StrategyDetail {
  url: string
  modelName: string
  descriptionHtml: string
  signal: StrategySignalRow | null
  summary: StrategySummaryRow | null
  performances: StrategyPerformanceRow[]
}

export interface StrategyRow {
  id: string
  modelName: string
  url: string
  category: string
  favorite: boolean
  currentDay: boolean
  signal: StrategySignalRow
  summary: StrategySummaryRow
}

export interface StrategyScopeOption {
  key: StrategyScopeKey
  label: string
  category?: string
  count?: number
}

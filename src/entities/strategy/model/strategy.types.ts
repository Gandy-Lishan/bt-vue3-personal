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

export interface StrategyScopeOption {
  key: StrategyScopeKey
  label: string
  category?: string
  count?: number
}

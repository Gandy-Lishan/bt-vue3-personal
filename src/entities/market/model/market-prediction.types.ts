export const MARKET_PREDICTION_PAGE_SIZE = 12

export type MarketPredictionViewMode = 'table' | 'cards'

export type MarketPredictionSortDirection = 'asc' | 'desc'

export type MarketPredictionSortKey =
  | 'ticker'
  | 'lastPrice'
  | 'target'
  | 'potentialUpside'
  | 'predictionEndDate'
  | 'analystCoverage'
  | 'meanAccuracy'
  | 'rating'

export type MarketPredictionRatingCategory = 'buy' | 'hold' | 'sell' | 'other'

export interface MarketPredictionRow {
  id: string
  ticker: string
  lastPrice: number | null
  target: number | null
  potentialUpside: number | null
  predictionEndDate: string
  predictionEndTimestamp: number | null
  analystCoverage: number | null
  meanAccuracy: number | null
  rating: string
  ratingCategory: MarketPredictionRatingCategory
  raw: Record<string, unknown>
}

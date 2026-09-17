export type IndicatorSection = 'indicators' | 'popular' | 'favorites'

export type IndicatorViewMode = 'table' | 'cards'

export type IndicatorSortDirection = 'asc' | 'desc'

export type IndicatorSentiment = 'pessimistic' | 'neutral' | 'optimistic'

export type IndicatorDetailTab = 'detail' | 'research' | 'related' | 'constituents'

export type IndicatorFavoriteSource = 'account' | 'legacy'

/**
 * One row of the constituent conditions table. Keys are column names as returned by
 * the API and drive the table's columns, so nothing here is a fixed shape.
 */
export type IndicatorConstituentRow = Record<string, unknown>

export interface IndicatorGroup {
  id: string
  label: string
  fullName?: string
  shortLabel?: string
  description: string
  source: string
  views: number
  icon: string
  subgroups: IndicatorSubgroup[]
}

export interface IndicatorSubgroup {
  id: string
  label: string
  source: string
  fullName?: string
}

export interface Indicator {
  id: string
  name: string
  group: string
  groupId: string
  subgroup: string
  sourceList: string
  timeFrame: string
  currentValue: number
  change: number
  updatedAt: string
  sentiment: IndicatorSentiment
  sentimentScore: number
  trendLines: number[][]
  favorite: boolean
  favoriteSource?: IndicatorFavoriteSource
  favoriteLocked?: boolean
  type: string
  marketSymbol?: string
  raw?: Record<string, unknown>
}

export interface IndicatorDetail {
  id: string
  title: string
  group: string
  timeFrame: string
  updateSchedule: string
  source: string
  currentValue: number
  change: number
  updatedAt: string
  sentiment: IndicatorSentiment
  sentimentScore: number
  description: string
  interpretation: string
  construction: string
  constructionHtml: string
  currentReading: string
  related: string[]
  relatedCharts: IndicatorRelatedChart[]
  constituentConditions: IndicatorConstituentRow[]
  research: string[]
  blogResults: IndicatorResearchPost[]
  thresholdRows: IndicatorThresholdRow[]
  returnSegments: IndicatorReturnSegment[]
  showReturns: boolean
  trendLines: number[][]
  benchmarkTrend: number[]
  type: string
  marketSymbol?: string
  sourceList?: string
  pess?: number | null
  opt?: number | null
  raw?: Record<string, unknown>
}

export interface IndicatorResearchPost {
  title: string
  url?: string
  date?: string
  summary?: string
}

export interface IndicatorRelatedChart {
  title: string
  url: string
  type?: string
}

export interface IndicatorThresholdRow {
  location: string
  annualizedReturn: string
  percentTime: string
}

export type IndicatorReturnSegment = Record<string, string | number | null>

export type IndicatorChartDataRow = Record<string, string | number | boolean | null | undefined>

export type IndicatorSeasonalityPoint = Record<string, string | number | boolean | null | undefined>

export interface IndicatorSeasonalityChartData {
  day_of_year: IndicatorSeasonalityPoint[]
  current_day_of_year: IndicatorSeasonalityPoint[]
  month: IndicatorSeasonalityPoint[]
}

export type IndicatorChartData = IndicatorChartDataRow[] | IndicatorSeasonalityChartData

export interface IndicatorRawRow {
  url?: string
  chart_url?: string
  symbol?: string
  chart_name?: string
  name?: string
  groups?: string
  sub_type?: string
  timeframe?: string
  last_value?: string | number | null
  last_change?: string | number | null
  last_update?: string
  sentiment?: string | number | null
  favorite?: boolean
  type?: string
  source_list?: string
  market_symbol?: string
  last_change_type?: string
  [key: string]: unknown
}

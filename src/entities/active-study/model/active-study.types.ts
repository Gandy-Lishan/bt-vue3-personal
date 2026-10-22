export type ActiveStudyForecast = 'Up' | 'Down' | 'Flat' | string

export interface ActiveStudyRow {
  id: string
  date: string
  dateTimestamp: number | null
  title: string
  market: string
  forecast: ActiveStudyForecast
  timeframe: string
  filename: string
  href: string
}

export interface ActiveStudySummary {
  shortTermBullish: number
  shortTermBearish: number
  mediumTermBullish: number
  mediumTermBearish: number
  longTermBullish: number
  longTermBearish: number
}

export interface ActiveStudiesResponse {
  items: ActiveStudyRow[]
  summary: ActiveStudySummary
}

export type ActiveStudySortKey = 'date' | 'title' | 'market' | 'forecast' | 'timeframe'


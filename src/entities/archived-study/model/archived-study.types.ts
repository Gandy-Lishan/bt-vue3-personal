export interface ArchivedStudyRow {
  id: string
  date: string
  dateTimestamp: number | null
  title: string
  market: string
  forecast: string
  outcome: string
  rating: number
  timeframe: string
  filename: string
  href: string
}

export type ArchivedStudySortKey = 'date' | 'title' | 'market' | 'forecast' | 'outcome' | 'rating' | 'timeframe'


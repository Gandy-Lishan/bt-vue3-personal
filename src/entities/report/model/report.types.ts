export type ReportViewMode = 'table' | 'cards'

export interface ReportLibraryItem {
  id: string
  title: string
  excerpt: string
  author: string
  publishedAt: string
  category: string
  topics: string[]
  isPublic: boolean
  hasAccess: boolean
  imageUrl: string
  isFavorite: boolean
  userLevel: string
  href: string
}

export interface ReportDetail extends ReportLibraryItem {
  contentHtml: string
  forecasts: ReportForecast[]
}

export interface ReportForecast {
  forecast: string
  market: string
  timeframe: string
}

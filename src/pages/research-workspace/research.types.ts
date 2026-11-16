export type ResearchGroup = 'spotlights' | 'intraday' | 'market-analytics'

export interface ResearchMetric {
  label: string
  value: string
  detail: string
  tone?: 'positive' | 'negative' | 'primary'
}

export interface ResearchSeries {
  name: string
  value: string
  change: string
  status: string
  points: number[]
}

export interface ResearchTable {
  title: string
  description: string
  columns: string[]
  rows: string[][]
}

export interface ResearchPageData {
  metrics: ResearchMetric[]
  series: ResearchSeries[]
  tables: ResearchTable[]
  updatedAt: string
  riskChart?: {
    dates: string[]
    price: number[]
    measure: number[]
    regimes: number[]
  }
  environmentChart?: {
    dates: string[]
    price: number[]
    score: number[]
  }
  tacticalChart?: {
    dates: string[]
    price: number[]
    regimes: number[]
  }
}

export interface ResearchPageDefinition {
  slug: string
  group: ResearchGroup
  title: string
  subtitle: string
  intro: string
  kind: 'composite' | 'overview' | 'intraday' | 'calendar' | 'heatmap' | 'ranking'
}

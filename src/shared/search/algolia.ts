import { liteClient } from 'algoliasearch/lite'

export type AlgoliaSearchSourceId = 'charts' | 'reports' | 'blogs' | 'market'

export interface AlgoliaSearchResult {
  id: string
  sourceId: AlgoliaSearchSourceId
  sourceLabel: string
  title: string
  subtitle: string
  href: string
  external: boolean
  premium: boolean
}

export interface AlgoliaSearchSection {
  id: AlgoliaSearchSourceId
  label: string
  description: string
  results: AlgoliaSearchResult[]
}

type AlgoliaHit = Record<string, unknown>

const ALGOLIA_APP_ID = import.meta.env.VITE_ALGOLIA_APP_ID || 'K88SIIDLSF'
const ALGOLIA_SEARCH_KEY = import.meta.env.VITE_ALGOLIA_SEARCH_KEY || '080aea2b84a5e1263909139a3d6f1df1'

const searchClient = liteClient(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY)

const sourceDefinitions: Array<{
  id: AlgoliaSearchSourceId
  indexName: string
  label: string
  description: string
}> = [
  { id: 'charts', indexName: 'charts', label: 'Charts', description: 'Indicators and chart pages' },
  { id: 'reports', indexName: 'reports', label: 'Daily Reports', description: 'Published report archive' },
  { id: 'blogs', indexName: 'blog', label: 'Blog Posts', description: 'Research and market notes' },
]

const reportBaseUrl = 'https://users.sentimentrader.com/users/report/'
const validReportCategories = new Set([
  'quantedge',
  'kaeppelscorner',
  'SentimentEdge',
  'ModelEdge',
  'TradingEdge',
  'impactedge',
])

function text(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value)
}

function numericFlag(value: unknown) {
  return Number(value) === 1
}

function pathSegment(value: string) {
  return encodeURIComponent(value)
}

function isTrendScoreChart(chartUrl: string) {
  return chartUrl.endsWith('_trend') || chartUrl.endsWith('_reltrend') || chartUrl.endsWith('_trend_reltrend')
}

function isHistoricalVolatilityChart(chartUrl: string) {
  return chartUrl.endsWith('_volatility') || chartUrl.endsWith('_volatility_60d')
}

function chartHref(chartUrl: string) {
  if (isTrendScoreChart(chartUrl)) return `/trend_score/${pathSegment(chartUrl)}`
  if (isHistoricalVolatilityChart(chartUrl)) return `/historical/${pathSegment(chartUrl)}`
  return `/indicators/${pathSegment(chartUrl)}`
}

function blogHref(hit: AlgoliaHit) {
  const category = text(hit.category)
  const url = text(hit.url)
  const slug = url.split('/').filter(Boolean).pop() ?? text(hit.objectID)

  if (validReportCategories.has(category) && slug) {
    return `/MR/${category}/${pathSegment(slug)}`
  }

  const blogPath = url.match(/\/blog\/.*/)
  if (blogPath) return `/MR${blogPath[0]}`

  return url || `/MR/${pathSegment(category || 'blog')}/${pathSegment(slug)}`
}

function blogSubtitle(category: string) {
  const categoryLabels: Record<string, string> = {
    quantedge: "Kaeppel's Corner",
    kaeppelscorner: "Kaeppel's Corner",
    sentimentedge: 'SentimentEdge',
    modeledge: 'ModelEdge',
    tradingedge: 'TradingEdge',
  }

  return categoryLabels[category.toLowerCase()] ?? ''
}

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href)
}

function chartResults(hits: AlgoliaHit[]): AlgoliaSearchResult[] {
  return hits
    .filter((hit) => {
      const chartUrl = text(hit.chart_url || hit.url)
      if (!chartUrl) return false
      if (text(hit.updated).toLowerCase() === 'quarterly') return false
      return true
    })
    .map((hit) => {
      const chartUrl = text(hit.chart_url || hit.url)
      const title = text(hit.chart_name || hit.name || chartUrl)

      return {
        id: `charts-${text(hit.objectID || chartUrl)}`,
        sourceId: 'charts',
        sourceLabel: 'Charts',
        title,
        subtitle: '',
        href: chartHref(chartUrl),
        external: false,
        premium: numericFlag(hit.premium),
      }
    })
}

function reportResults(hits: AlgoliaHit[]): AlgoliaSearchResult[] {
  return hits
    .filter((hit) => text(hit.filename) && text(hit.title))
    .map((hit) => {
      const filename = text(hit.filename)

      return {
        id: `reports-${text(hit.objectID || filename)}`,
        sourceId: 'reports',
        sourceLabel: 'Daily Reports',
        title: text(hit.title),
        subtitle: '',
        href: `${reportBaseUrl}${encodeURIComponent(filename)}`,
        external: true,
        premium: false,
      }
    })
}

function blogResults(hits: AlgoliaHit[]): AlgoliaSearchResult[] {
  return hits
    .filter((hit) => text(hit.category) !== 'Lite' && text(hit.title))
    .map((hit) => {
      const href = blogHref(hit)
      const category = text(hit.category)

      return {
        id: `blogs-${text(hit.objectID || hit.url || hit.title)}`,
        sourceId: 'blogs',
        sourceLabel: 'Blog Posts',
        title: text(hit.title),
        subtitle: blogSubtitle(category),
        href,
        external: isExternalHref(href),
        premium: category === 'Premium',
      }
    })
}

function transformHits(sourceId: AlgoliaSearchSourceId, hits: AlgoliaHit[]) {
  if (sourceId === 'charts') return chartResults(hits)
  if (sourceId === 'reports') return reportResults(hits)
  return blogResults(hits)
}

export async function searchAlgoliaContent(query: string, hitsPerPage = 5): Promise<AlgoliaSearchSection[]> {
  const response = await searchClient.searchForHits<AlgoliaHit>({
    requests: sourceDefinitions.map((source) => ({
      indexName: source.indexName,
      query: query.trim(),
      hitsPerPage,
    })),
  })

  return sourceDefinitions.map((source, index) => ({
    id: source.id,
    label: source.label,
    description: source.description,
    results: transformHits(source.id, response.results[index]?.hits ?? []),
  }))
}

export const algoliaSearchSources = sourceDefinitions.map(({ id, label }) => ({ id, label }))

import { getSeededIndicatorDetail } from '../model/indicator.fixtures'
import { normalizeIndicatorDetail, normalizeIndicatorRows } from '../model/indicator.adapter'
import { normalizeIndicatorSeasonalityChartData } from '../model/indicator.chart'
import { normalizeIndicatorTrendPayload, type IndicatorTrendMap } from '../model/indicator.trends'
import type { Indicator, IndicatorChartData, IndicatorChartDataRow, IndicatorDetail, IndicatorRawRow } from '../model/indicator.types'

const requestMap = new Map<string, string>([
  ['country_breadth_overview', 'country_breadth_overview/'],
  ['commod_spotlight', 'spot_light_overview/?spot_light_type=commod_spotlight'],
  ['sector_spotlight', 'spot_light_overview/?spot_light_type=sector_spotlight'],
  ['country_spotlight', 'spot_light_overview/?spot_light_type=country_spotlight'],
  ['watchlist', 'user_watchlist_trend/'],
])

export class IndicatorRequestError extends Error {
  status: number
  path: string

  constructor(status: number, path: string) {
    super(`Indicator request failed: ${status} ${path}`)
    this.name = 'IndicatorRequestError'
    this.status = status
    this.path = path
  }
}

function requestUrlForSource(source: string) {
  if (source.startsWith('sector_trend_reltrend')) return source
  if (isTrendScoreSource(source)) return `trend_reltrend?index=${source}`
  if (isHistoricalVolatilitySource(source)) return `volatility?index=${source.replace('historical_', '')}`
  return requestMap.get(source) ?? source
}

function isTrendScoreSource(source: string) {
  return [
    'sp1500',
    'sp1500&rel_trend=1',
    'spx',
    'spx&rel_trend=1',
    'ndx',
    'ndx&rel_trend=1',
    'crp',
    'crp&rel_trend=1',
    'russell',
    'russell&rel_trend=1',
    'etf_domestic',
    'etf_domestic&rel_trend=1',
    'etf_foreign',
    'etf_foreign&rel_trend=1',
    'etf_other',
    'etf_other&rel_trend=1',
  ].includes(source)
}

function isHistoricalVolatilitySource(source: string) {
  return [
    'historical_sp1500',
    'historical_spx',
    'historical_ndx',
    'historical_crp',
    'historical_russell',
    'historical_etf_domestic',
    'historical_etf_foreign',
    'historical_etf_other',
  ].includes(source)
}

function safeJsonParse(value: unknown) {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value.replace(/\bNaN\b/g, 'null'))
  } catch {
    return value
  }
}

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok || !contentType.includes('application/json')) {
    throw new IndicatorRequestError(response.status, path)
  }

  return response.json() as Promise<T>
}

function extractRows(payload: unknown, source: string): IndicatorRawRow[] {
  const parsed = safeJsonParse(payload)
  if (Array.isArray(parsed)) return parsed as IndicatorRawRow[]
  if (!parsed || typeof parsed !== 'object') return []

  const record = parsed as Record<string, unknown>
  if (source === 'commod_sentiment_seasonality') {
    const screenData = safeJsonParse(record.screen_data)
    return Array.isArray(screenData) ? (screenData as IndicatorRawRow[]) : []
  }
  if (Array.isArray(record.data)) return record.data as IndicatorRawRow[]
  const nestedData = safeJsonParse(record.data)
  if (Array.isArray(nestedData)) return nestedData as IndicatorRawRow[]

  return []
}

function extractChartRows(payload: unknown): IndicatorChartDataRow[] {
  const parsed = safeJsonParse(payload)
  if (Array.isArray(parsed)) return parsed as IndicatorChartDataRow[]
  if (!parsed || typeof parsed !== 'object') return []

  const record = parsed as Record<string, unknown>
  if (Array.isArray(record.data)) return record.data as IndicatorChartDataRow[]

  const nestedData = safeJsonParse(record.data)
  if (Array.isArray(nestedData)) return nestedData as IndicatorChartDataRow[]

  return []
}

function extractChartData(payload: unknown): IndicatorChartData {
  const parsed = safeJsonParse(payload)
  if (Array.isArray(parsed)) return parsed as IndicatorChartDataRow[]

  const seasonalityData = normalizeIndicatorSeasonalityChartData(parsed)
  if (seasonalityData) return seasonalityData

  if (!parsed || typeof parsed !== 'object') return []

  const record = parsed as Record<string, unknown>
  if (Array.isArray(record.data)) return record.data as IndicatorChartDataRow[]

  const nestedData = safeJsonParse(record.data)
  if (Array.isArray(nestedData)) return nestedData as IndicatorChartDataRow[]

  return normalizeIndicatorSeasonalityChartData(nestedData) ?? []
}

export async function fetchIndicatorList(source: string, signal?: AbortSignal): Promise<Indicator[]> {
  try {
    const payload = await fetchJson<unknown>(`/dev/st_data/${requestUrlForSource(source)}`, signal)
    return normalizeIndicatorRows(extractRows(payload, source), source)
  } catch {
    return []
  }
}

export async function fetchSectorTrendScore(signal?: AbortSignal): Promise<IndicatorRawRow[]> {
  try {
    const payload = await fetchJson<unknown>('/dev/st_data/sector_trend_score', signal)
    return extractRows(payload, 'sector_trend_score')
  } catch {
    return []
  }
}

export async function fetchIndicatorInfoRows(ids: string[], signal?: AbortSignal): Promise<IndicatorRawRow[]> {
  const uniqueIds = Array.from(new Set(ids.map((id) => String(id).trim()).filter(Boolean)))
  if (!uniqueIds.length) return []

  const rows: Array<IndicatorRawRow | null> = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const payload = await fetchJson<unknown>(`/dev/st_data/search_url_info?url=${encodeURIComponent(id)}`, signal)
        const parsed = safeJsonParse(payload)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null

        const row = parsed as IndicatorRawRow
        return {
          ...row,
          url: String(row.url ?? row.chart_url ?? id),
          chart_name: String(row.chart_name ?? row.name ?? id),
        }
      } catch {
        return null
      }
    }),
  )

  return rows.filter((row): row is IndicatorRawRow => row !== null)
}

export function fetchLegacyFavoriteIndicators(signal?: AbortSignal): Promise<Indicator[]> {
  return fetchIndicatorList('btv1_user_favorite_indicator', signal)
}

export async function fetchIndicatorChartData(id: string, signal?: AbortSignal): Promise<IndicatorChartData> {
  if (!id) return []

  try {
    const payload = await fetchJson<unknown>(`/dev/st_data/get_data?index=${encodeURIComponent(id)}`, signal)
    return extractChartData(payload)
  } catch {
    return []
  }
}

export async function fetchIndicatorDownloadData(id: string, signal?: AbortSignal): Promise<IndicatorChartDataRow[]> {
  if (!id) return []

  const payload = await fetchJson<unknown>(`/dev/st_data/download_csv?index=${encodeURIComponent(id)}`, signal)
  return extractChartRows(payload)
}

export async function fetchIndicatorTrends(urls: string[], signal?: AbortSignal): Promise<IndicatorTrendMap> {
  const indicatorList = Array.from(new Set(urls.filter(Boolean)))
  if (!indicatorList.length) return {}

  try {
    const response = await fetch('/dev/st_data/stock_recent_data', {
      method: 'POST',
      credentials: 'include',
      signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        indicator_list: indicatorList,
      }),
    })

    const contentType = response.headers.get('content-type') ?? ''
    if (!response.ok || !contentType.includes('application/json')) {
      throw new Error(`Indicator trend request failed: ${response.status}`)
    }

    const payload = await response.json()
    const trendMap = normalizeIndicatorTrendPayload(payload, indicatorList)
    const trendMapByLowerUrl = new Map(Object.entries(trendMap).map(([url, points]) => [url.toLowerCase(), points]))

    return indicatorList.reduce<IndicatorTrendMap>((acc, url) => {
      acc[url] = trendMap[url] ?? trendMapByLowerUrl.get(url.toLowerCase()) ?? []
      return acc
    }, {})
  } catch {
    return indicatorList.reduce<IndicatorTrendMap>((acc, url) => {
      acc[url] = []
      return acc
    }, {})
  }
}

export async function fetchIndicatorDetail(id: string, signal?: AbortSignal): Promise<IndicatorDetail> {
  const fallback = getSeededIndicatorDetail(id)

  try {
    const payload = await fetchJson<unknown>(`/dev/st_data/search_url_info?url=${encodeURIComponent(id)}`, signal)
    const parsed = safeJsonParse(payload)
    if (!parsed || typeof parsed !== 'object') return fallback
    return normalizeIndicatorDetail(parsed as Record<string, unknown>, fallback)
  } catch (error) {
    if (error instanceof IndicatorRequestError && error.status === 404) throw error
    return fallback
  }
}

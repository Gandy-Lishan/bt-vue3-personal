import type { ReportDetail, ReportForecast, ReportLibraryItem } from '../model/report.types'
import { getCurrentAccessLevels } from '@/shared/auth/permission'
import { canAccessReport, isReportPublic } from '../model/report.access'

type RawReport = Record<string, unknown>

export interface ReportLibraryQuery {
  page?: number
  userLevel?: string
  tag?: string
  archiveYear?: number
  search?: string
}

export interface ReportLibraryResponse {
  items: ReportLibraryItem[]
  count: number | null
  hasMore: boolean
}

export class ReportRequestError extends Error {
  constructor(status: number) {
    super(`Report request failed with status ${status}`)
    this.name = 'ReportRequestError'
  }
}

function text(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim()
}

function safeJsonParse(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function extractRows(payload: unknown): RawReport[] {
  const parsed = safeJsonParse(payload)
  if (Array.isArray(parsed)) return parsed.filter((item): item is RawReport => Boolean(item && typeof item === 'object'))
  if (!parsed || typeof parsed !== 'object') return []

  const record = parsed as RawReport
  for (const key of ['data', 'results', 'blogs', 'blog_list']) {
    const rows = safeJsonParse(record[key])
    if (Array.isArray(rows)) return rows.filter((item): item is RawReport => Boolean(item && typeof item === 'object'))
  }
  return []
}

function paginationMeta(payload: unknown, rowCount: number) {
  const parsed = safeJsonParse(payload)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { count: null, hasMore: rowCount >= 9 }
  }
  const record = parsed as RawReport
  const countValue = Number(record.count)
  return {
    count: Number.isFinite(countValue) ? countValue : null,
    hasMore: Boolean(record.next),
  }
}

function normalizeTopics(row: RawReport) {
  const rawTopics = safeJsonParse(row.blog_tags ?? row.dbTags ?? row.db_tags ?? row.tags)
  if (typeof rawTopics === 'string') return rawTopics.split(',').map((topic) => topic.trim()).filter(Boolean)
  if (!Array.isArray(rawTopics)) return []
  return rawTopics
    .map((topic) => typeof topic === 'object' && topic ? text((topic as RawReport).tag ?? (topic as RawReport).name) : text(topic))
    .filter(Boolean)
}

function normalizeForecasts(row: RawReport): ReportForecast[] {
  const rawForecasts = safeJsonParse(row.forecasts ?? row.forecast)
  if (!Array.isArray(rawForecasts)) return []
  return rawForecasts
    .filter((item): item is RawReport => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      forecast: text(item.forecast ?? item.direction),
      market: text(item.market ?? item.symbol),
      timeframe: text(item.timeframe ?? item.time_frame),
    }))
    .filter((item) => item.forecast && item.forecast.toLowerCase() !== 'none')
}

function categoryFromUserLevel(userLevel: string) {
  const categories: Record<string, string> = {
    basic: 'Daily Report',
    public: 'Daily Report',
    free: 'Daily Report',
    sentimentedge: 'SentimentEdge report',
    modeledge: 'ModelEdge report',
    quantedge: "Kaeppel's Corner",
    kaeppelscorner: "Kaeppel's Corner",
    impactedge: 'Market Impact Analysis',
    tradingedge: 'TradingEdge',
  }
  return categories[userLevel] ?? 'Daily Report'
}

function normalizeReport(row: RawReport, index: number): ReportLibraryItem | null {
  const title = text(row.title)
  const url = text(row.url)
  if (!title || !url) return null

  const userLevel = text(row.user_level).toLowerCase()
  const category = text(row.category) || categoryFromUserLevel(userLevel)
  const publishedAt = text(row.post_date)
  const isPublic = isReportPublic(userLevel, publishedAt)

  return {
    id: url || `report-${index}`,
    title,
    excerpt: text(row.meta_description),
    author: text(row.author) || 'by Sentimentrader',
    publishedAt,
    category,
    topics: normalizeTopics(row),
    isPublic,
    hasAccess: canAccessReport(getCurrentAccessLevels(), userLevel, publishedAt),
    imageUrl: text(row.image ?? row.featured_image),
    isFavorite: Boolean(row.is_favorite),
    userLevel,
    href: `/MR/blog/${encodeURIComponent(url)}`,
  }
}

function extractDetail(payload: unknown): RawReport | null {
  const parsed = safeJsonParse(payload)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const record = parsed as RawReport
  for (const key of ['data', 'result', 'blog', 'post']) {
    const nested = safeJsonParse(record[key])
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) return nested as RawReport
  }
  return record
}

function normalizeReportDetail(row: RawReport): ReportDetail | null {
  const report = normalizeReport(row, 0)
  if (!report) return null
  return {
    ...report,
    contentHtml: text(row.post_content ?? row.content),
    forecasts: normalizeForecasts(row),
  }
}

async function fetchPayload(path: string, signal?: AbortSignal) {
  const response = await fetch(path, {
    credentials: 'include',
    signal,
    headers: { Accept: 'application/json, text/plain' },
  })

  if (!response.ok) throw new ReportRequestError(response.status)
  const payloadText = await response.text()
  const payload = safeJsonParse(payloadText)
  if (typeof payload === 'string') throw new ReportRequestError(response.status)
  return payload
}

function normalizeItems(rows: RawReport[]): ReportLibraryItem[] {
  return rows
    .map(normalizeReport)
    .filter((report): report is ReportLibraryItem => report !== null)
}

function normalizeResponse(payload: unknown): ReportLibraryResponse {
  const rows = extractRows(payload)
  return { items: normalizeItems(rows), ...paginationMeta(payload, rows.length) }
}

async function fetchStDataReportLibrary(query: ReportLibraryQuery, signal?: AbortSignal) {
  const searchParams = new URLSearchParams()
  if (query.archiveYear) {
    searchParams.set('year', String(query.archiveYear))
    searchParams.set('page', String(query.page ?? 1))
    const endpoint = query.archiveYear <= 2019 ? 'old_archived_reports' : 'archived_reports'
    return normalizeResponse(await fetchPayload(`/dev/st_data/${endpoint}?${searchParams.toString()}`, signal))
  }
  if (query.page && query.page > 1) searchParams.set('page', String(query.page))
  if (query.userLevel) searchParams.set('user_level', query.userLevel)
  if (query.tag) searchParams.set('blog_tags', query.tag)
  if (query.search) searchParams.set('search', query.search)
  const path = `/dev/st_data/blog_list${searchParams.size ? `?${searchParams.toString()}` : ''}`
  return normalizeResponse(await fetchPayload(path, signal))
}

export async function fetchReportLibrary(query: ReportLibraryQuery = {}, signal?: AbortSignal): Promise<ReportLibraryResponse> {
  return fetchStDataReportLibrary(query, signal)
}

export async function fetchReportFavorites(page = 1, signal?: AbortSignal, limit?: number): Promise<ReportLibraryResponse> {
  const searchParams = new URLSearchParams()
  if (page > 1) searchParams.set('page', String(page))
  if (limit && limit > 0) searchParams.set('page_size', String(limit))
  const path = `/dev/st_data/blog_favortie_list${searchParams.size ? `?${searchParams.toString()}` : ''}`
  const payload = await fetchPayload(path, signal)
  const allRows = extractRows(payload)
  const rows = limit && limit > 0 ? allRows.slice(0, limit) : allRows
  // The favorite list response omits user_level, so every entry would fall back
  // to the Daily Report category. blog_info is authoritative for user_level.
  const enriched = await Promise.all(rows.map(async (row) => {
    const url = text(row.url)
    if (!url || text(row.user_level)) return row
    try {
      const info = extractDetail(await fetchPayload(`/dev/st_data/blog_info/?url=${encodeURIComponent(url)}`, signal))
      return info ? { ...row, ...info } : row
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      return row
    }
  }))
  return { items: normalizeItems(enriched), ...paginationMeta(payload, allRows.length) }
}

export async function fetchReportDetail(url: string, signal?: AbortSignal): Promise<ReportDetail> {
  const encodedUrl = encodeURIComponent(url)
  const [infoPayload, listPayload] = await Promise.all([
    fetchPayload(`/dev/st_data/blog_info/?url=${encodedUrl}`, signal),
    fetchPayload(`/dev/st_data/blog_list?url=${encodedUrl}`, signal).catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      return null
    }),
  ])
  const infoRow = extractDetail(infoPayload)
  const listRow = listPayload
    ? extractRows(listPayload).find((item) => text(item.url) === url)
    : undefined
  // blog_info is authoritative for the article, tags and forecasts. The list
  // response only supplements fields such as is_favorite when they are absent.
  const row = infoRow ? { ...(listRow ?? {}), ...infoRow } : listRow
  const detail = row ? normalizeReportDetail(row) : null
  if (detail) return detail
  throw new ReportRequestError(404)
}

export async function setReportFavorite(url: string, favorite: boolean) {
  const formData = new FormData()
  formData.append('blog', url)
  const path = favorite
    ? '/dev/st_data/blog_favortie_add'
    : `/dev/st_data/blog_favortie_delete?blog=${encodeURIComponent(url)}`
  const response = await fetch(path, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })
  if (!response.ok) throw new ReportRequestError(response.status)
}

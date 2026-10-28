export type MarketMetricRow = Record<string, unknown>

export interface MarketRange {
  min: number | null
  max: number | null
}

export interface MarketScreenConfig {
  name: string
  groups: string[]
  ranges: Record<string, MarketRange>
  columns: string[]
}

export interface MarketMetricQuery {
  group: string
  page: number
  pageSize: number
  symbol?: string
  ordering?: string
  ranges?: Record<string, MarketRange>
  signal?: AbortSignal
}

export interface MarketMetricResult {
  rows: MarketMetricRow[]
  total: number
}

type JsonObject = Record<string, unknown>

function parse(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { return value }
}

function object(value: unknown): JsonObject {
  const parsed = parse(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as JsonObject : {}
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json, text/plain', ...init.headers },
  })
  if (!response.ok) throw new Error(`Market Screen request failed: ${response.status}`)
  return parse(await response.text())
}

function unwrap(value: unknown): unknown {
  const payload = object(value)
  return payload.data ?? payload.results ?? value
}

export async function fetchMarketMetrics(query: MarketMetricQuery): Promise<MarketMetricResult> {
  const params = new URLSearchParams({
    paginate: 'true',
    page: String(query.page),
    page_size: String(query.pageSize),
    groups: query.group,
  })
  if (query.symbol?.trim()) params.set('symbol', query.symbol.trim())
  if (query.ordering) params.set('ordering', query.ordering)
  Object.entries(query.ranges ?? {}).forEach(([field, range]) => {
    if (range.min !== null) params.set(`${field}_min`, String(range.min))
    if (range.max !== null) params.set(`${field}_max`, String(range.max))
  })

  const raw = await request(`/dev/st_data/asset_latest_metrics?${params}`, { signal: query.signal })
  const data = unwrap(raw)
  const payload = object(data)
  const rowsValue = payload.results ?? data
  const rows = Array.isArray(rowsValue)
    ? rowsValue.filter((row): row is MarketMetricRow => !!row && typeof row === 'object')
    : []
  return { rows, total: Number(payload.count ?? rows.length) }
}

export async function fetchMetricWatchlistConfig(name = 'default'): Promise<JsonObject> {
  const params = new URLSearchParams({ name })
  const raw = await request(`/dev/st_data/user_metric_watchlist?${params}`)
  const data = unwrap(raw)
  if (Array.isArray(data)) return object(data[0])
  const payload = object(data)
  if (Array.isArray(payload.results)) return object(payload.results[0])
  return payload
}

export async function saveMetricWatchlistConfig(config: JsonObject): Promise<void> {
  await request('/dev/st_data/user_metric_watchlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
}

export function parseConfigValue<T>(value: unknown, fallback: T): T {
  const parsed = parse(value)
  return parsed === undefined || parsed === null ? fallback : parsed as T
}

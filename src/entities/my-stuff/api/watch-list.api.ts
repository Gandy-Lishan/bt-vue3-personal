import type { WatchListColumn, WatchListRecord, WatchListResult, WatchListTickerResult } from '../model/watch-list'

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { return value }
}

function objectValue(value: unknown): Record<string, unknown> {
  const parsed = parseJson(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
}

function arrayValue(value: unknown): unknown[] {
  const parsed = parseJson(value)
  if (Array.isArray(parsed)) return parsed
  const object = objectValue(parsed)
  for (const key of ['results', 'data', 'content']) {
    const candidate = parseJson(object[key])
    if (Array.isArray(candidate)) return candidate
  }
  return []
}

function stringArray(value: unknown) {
  const parsed = parseJson(value)
  if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
  return String(parsed ?? '').split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean)
}

function normalizeColumns(value: unknown): WatchListColumn[] {
  return arrayValue(value).map((item) => {
    const column = objectValue(item)
    return { indicator: String(column.indicator ?? ''), bar: Number(column.bar ?? 1) }
  }).filter((item) => item.indicator)
}

function normalizeRecord(value: unknown, index: number): WatchListRecord {
  const row = objectValue(value)
  return {
    url: String(row.url ?? `watch-list-${index}`),
    name: String(row.name ?? 'Untitled watch list'),
    tickers: stringArray(row.tickers),
    columns: normalizeColumns(row.columns),
    updatedAt: String(row.final_latest_date ?? row.update_date ?? row.create_date ?? ''),
  }
}

function normalizeResult(value: unknown): WatchListResult {
  const raw = objectValue(parseJson(value))
  const result: WatchListResult = {}
  Object.entries(raw).forEach(([ticker, item]) => {
    const row = objectValue(item)
    const records = arrayValue(row.records).filter((record): record is Record<string, number | null> => Boolean(record) && typeof record === 'object' && !Array.isArray(record))
    result[ticker] = {
      optixUrl: String(row.optix_url ?? ''),
      name: String(row.ticker_name ?? ''),
      records,
    } as WatchListTickerResult
  })
  return result
}

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: { Accept: 'application/json, text/plain;q=0.9, */*;q=0.8', ...init.headers },
  })
  if (!response.ok) throw new Error(`Watch List request failed: ${response.status}`)
  return parseJson(await response.text())
}

function formBody(data: Record<string, string>) {
  const body = new FormData()
  Object.entries(data).forEach(([key, value]) => body.append(key, value))
  return body
}

function unwrapResult(payload: unknown) {
  const root = objectValue(payload)
  const code = Number(root.code ?? 0)
  const data = parseJson(root.data)
  return { code, url: String(root.url ?? objectValue(data).url ?? ''), result: normalizeResult(data) }
}

export async function fetchWatchLists(signal?: AbortSignal) {
  const payload = await request('/dev/watchlist_app/get_watchlist_records/?ordering=-create_date', { signal })
  return arrayValue(payload).map(normalizeRecord)
}

export async function fetchWatchListDetail(url: string, signal?: AbortSignal) {
  return unwrapResult(await request(`/dev/watchlist_app/watchlist/?url=${encodeURIComponent(url)}`, { signal }))
}

export async function previewWatchList(tickers: string[], signal?: AbortSignal) {
  return unwrapResult(await request('/dev/watchlist_app/get_tickers_data', {
    method: 'POST', body: formBody({ tickers: JSON.stringify(tickers) }), signal,
  }))
}

export async function saveWatchList(name: string, tickers: string[], columns: WatchListColumn[], url = '', signal?: AbortSignal) {
  return unwrapResult(await request(`/dev/watchlist_app/watchlist${url ? `?url=${encodeURIComponent(url)}` : ''}`, {
    method: url ? 'PUT' : 'POST',
    body: formBody({ name, tickers: JSON.stringify(tickers), columns: JSON.stringify(columns) }),
    signal,
  }))
}

export async function deleteWatchList(url: string, signal?: AbortSignal) {
  await request(`/dev/watchlist_app/watchlist?url=${encodeURIComponent(url)}`, { method: 'DELETE', signal })
}

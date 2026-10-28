import { fetchWatchLists, previewWatchList } from '@/entities/my-stuff/api/watch-list.api'
import type { WatchListResult } from '@/entities/my-stuff/model/watch-list'

export type MetricRow = Record<string, unknown>

export interface DashboardWatchlist {
  name: string
  tickers: string[]
  rows: MetricRow[]
  source: 'personal' | 'empty'
}

function parse(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { return value }
}

function object(value: unknown): MetricRow {
  const parsed = parse(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as MetricRow : {}
}

function list(value: unknown): MetricRow[] {
  const parsed = parse(value)
  if (Array.isArray(parsed)) return parsed.filter((row): row is MetricRow => !!row && typeof row === 'object')
  const payload = object(parsed)
  for (const key of ['data', 'results', 'content']) {
    const nested = parse(payload[key])
    if (Array.isArray(nested)) return list(nested)
    if (nested && typeof nested === 'object' && nested !== parsed) {
      const rows = list(nested)
      if (rows.length) return rows
    }
  }
  return []
}

async function get(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, { credentials: 'include', signal, headers: { Accept: 'application/json, text/plain' } })
  if (!response.ok) throw new Error(`Dashboard request failed: ${response.status}`)
  return parse(await response.text())
}

export async function fetchDashboardDate(signal?: AbortSignal): Promise<string> {
  const payload = object(await get('/dev/st_data/dashboard', signal))
  return String(object(payload.data).date ?? payload.date ?? '')
}

/** Same trading-day source used by the legacy My Signals dashboard. */
export async function fetchLatestSignalTradingDate(signal?: AbortSignal): Promise<string> {
  const payload = object(await get('/dev/mysignal_app/get_newest_date', signal))
  if (Number(payload.code) !== 217) throw new Error('Latest signal trading date unavailable')
  const date = String(payload.data ?? '').match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (!date) throw new Error('Invalid latest signal trading date')
  return `${date[1]}-${date[2]!.padStart(2, '0')}-${date[3]!.padStart(2, '0')}`
}

export async function fetchDashboardWatchlist(signal?: AbortSignal): Promise<DashboardWatchlist> {
  // This endpoint is ordered by -create_date. Dashboard uses only the newest saved watch list.
  const savedLists = await fetchWatchLists(signal)
  const latestWatchlist = savedLists[0]
  const source = latestWatchlist ? 'personal' : 'empty'
  const tickers = latestWatchlist
    ? [...new Set(latestWatchlist.tickers.map((ticker) => ticker.trim()).filter(Boolean))].slice(0, 10)
    : []
  const name = latestWatchlist?.name ?? ''
  if (!tickers.length) return { name, tickers, rows: [], source }

  // My Watch List permits at most ten tickers per preview request.
  const batches = Array.from({ length: Math.ceil(tickers.length / 10) }, (_, index) => tickers.slice(index * 10, index * 10 + 10))
  const responses = await Promise.all(batches.map((batch) => previewWatchList(batch, signal)))
  const result = Object.assign({}, ...responses.map((response) => {
    if (response.code && response.code !== 215) throw new Error('Watch List preview failed')
    return response.result
  })) as WatchListResult
  const rows = tickers.map((ticker): MetricRow => {
    const item = result[ticker] ?? result[ticker.toLowerCase()] ?? result[ticker.toUpperCase()]
    const history = item?.records ?? []
    const latest = history.at(-1)
    const closes = history.map((record) => record.Close).filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    const close = closes.at(-1) ?? null
    const previous = closes.at(-2) ?? null
    return {
      symbol: ticker,
      company: item?.name ?? '',
      close,
      daily_change: close !== null && previous !== null ? Number((close - previous).toFixed(2)) : null,
      daily_change_percent: close !== null && previous !== null && previous !== 0
        ? Number((((close - previous) / Math.abs(previous)) * 100).toFixed(2))
        : null,
      optix: latest?.Optix ?? null,
      trend: latest?.Trend ?? null,
      volatility_20d: latest?.['Historical Volatility (20-Day)'] ?? null,
      volatility_60d: latest?.['Historical Volatility (60-Day)'] ?? null,
      trend_30d: closes.slice(-30),
    }
  })
  return { name, tickers, rows, source }
}

export async function fetchDashboardMarket(group: string, signal?: AbortSignal): Promise<MetricRow[]> {
  const query = new URLSearchParams({ paginate: 'true', page: '1', page_size: '10', groups: group })
  return list(await get(`/dev/st_data/asset_latest_metrics?${query}`, signal))
}

export async function fetchDashboardSectors(signal?: AbortSignal): Promise<MetricRow[]> {
  return list(await get('/dev/st_data/sector_trend_score', signal))
}

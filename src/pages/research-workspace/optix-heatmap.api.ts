export type OptixPricePoint = { date: string; close: number }

export interface OptixHeatmapData {
  window: number
  windows: number[]
  dates: string[]
  assets: Array<{ name: string; group: string; symbol: string; available: boolean; latest: number | null; change: number | null }>
  values: Record<string, Array<number | null>>
}

const researchBase = import.meta.env.DEV ? '/dev/research' : `${import.meta.env.VITE_ST_API_BASE_URL || 'https://devbt2api.sentimentrader.com'}/research`

export async function fetchOptixHeatmap(group: string | null, window: number, signal?: AbortSignal): Promise<OptixHeatmapData> {
  const params = new URLSearchParams({ window: String(window) })
  if (group) params.set('group', group)
  const response = await fetch(`${researchBase}/optix_heatmap?${params}`, { credentials: 'include', signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Optix heatmap request failed: ${response.status}`)
  const payload = await response.json() as { code: number; msg?: string; data?: OptixHeatmapData }
  if (payload.code !== 200 || !Array.isArray(payload.data?.assets) || !Array.isArray(payload.data?.dates) || !payload.data?.values) throw new Error(payload.msg || 'Unexpected Optix heatmap response')
  return payload.data
}

type RecentRow = { Date?: unknown; close?: unknown }
type RecentItem = { symbol?: unknown; data?: unknown }

function rowsFromPayload(payload: unknown): RecentRow[] {
  const items: RecentItem[] = Array.isArray(payload) ? payload : []
  const selected = items.find(item => Array.isArray(item?.data) && (item.data as RecentRow[]).length) ?? items[0]
  return Array.isArray(selected?.data) ? (selected.data as RecentRow[]) : []
}

/** The indicator Trend request, using the heatmap cell's second item and 63 bars. */
export async function fetchOptixPriceHistory(indicatorUrl: string, signal?: AbortSignal): Promise<OptixPricePoint[]> {
  const name = indicatorUrl.trim()
  if (!name) return []
  const response = await fetch('/dev/st_data/stock_recent_data', {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ indicator_list: [{ name, bars: 63 }] }),
  })
  if (!response.ok) throw new Error(`Optix history request failed: ${response.status}`)
  const payload = await response.json()
  return rowsFromPayload(payload)
    .map(row => ({ date: String(row.Date ?? ''), close: Number(row.close) }))
    .filter(point => point.date && Number.isFinite(point.close))
    .sort((left, right) => left.date.localeCompare(right.date))
}

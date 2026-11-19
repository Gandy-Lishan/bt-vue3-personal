export type RankCategory = 'commodities' | 'countries' | 'bonds' | 'currencies' | 'stocks' | 'sectors'
export type RankMetric = 'optix' | 'flow' | 'breadth'

export interface RankChartsData {
  category: RankCategory
  metric: RankMetric
  label?: string
  metrics?: RankMetric[]
  available?: boolean
  count?: number
  avg?: number | null
  items: Array<{ name: string; url?: string; symbol?: string; value: number | null; last_updated?: string; date?: string }>
}

const base = import.meta.env.DEV ? '/dev/research' : `${import.meta.env.VITE_ST_API_BASE_URL || 'https://devbt2api.sentimentrader.com'}/research`

export async function fetchRankCharts(category: RankCategory, metric: RankMetric, signal?: AbortSignal): Promise<RankChartsData> {
  const params = new URLSearchParams({ category, metric })
  const response = await fetch(`${base}/rank_charts?${params}`, { credentials: 'include', signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Rank charts request failed: ${response.status}`)
  const payload = await response.json() as { code: number; msg?: string; data?: RankChartsData }
  if (payload.code !== 200 || !Array.isArray(payload.data?.items)) throw new Error(payload.msg || 'Unexpected Rank Charts response')
  return payload.data
}

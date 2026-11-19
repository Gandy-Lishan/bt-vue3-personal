import { testStDataEndpoint } from '@/shared/api/tools.api'

export interface SpotlightIndicator {
  chart_id: string
  name: string
  table: string
  chart_type: string
  value: number | null
  last_updated: string | null
  available: boolean
  history: Array<{ date: string; value: number }>
}

interface ApiResponse<T> { code: number; msg: string; data: T }
interface SpotlightData { indicators: Omit<SpotlightIndicator, 'history'>[] }

const base = import.meta.env.DEV ? '/dev/research' : `${import.meta.env.VITE_ST_API_BASE_URL || 'https://devbt2api.sentimentrader.com'}/research`

async function readJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { credentials: 'include', signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Spotlight request failed: ${response.status}`)
  return await response.json() as T
}

export async function fetchSpotlight(key: 'bonds' | 'energy' | 'gold' | 'macro', signal?: AbortSignal): Promise<SpotlightIndicator[]> {
  const payload = await readJson<ApiResponse<SpotlightData>>(`${base}/spotlight?key=${key}`, signal)
  if (payload.code !== 200 || !Array.isArray(payload.data?.indicators)) throw new Error(payload.msg || 'Unexpected Spotlight response')
  return await Promise.all(payload.data.indicators.map(async indicator => {
    if (!indicator.available) return { ...indicator, history: [] }
    const seriesPayload = await readJson<ApiResponse<{ series?: Array<{ date: string; value: number }> }>>(
      `${base}/spotlight/series?key=${key}&chart_id=${encodeURIComponent(indicator.chart_id)}`, signal)
    let history = Array.isArray(seriesPayload.data?.series) ? seriesPayload.data.series : []
    if (!history.length) {
      const rows = await readJson<Array<Record<string, unknown>>>(testStDataEndpoint(`get_data?index=${encodeURIComponent(indicator.chart_id)}`), signal)
      if (!Array.isArray(rows)) throw new Error(`Unexpected history for ${indicator.name}`)
      history = rows
        .filter(row => typeof row.date === 'string' && (!indicator.last_updated || row.date <= indicator.last_updated) && Number.isFinite(Number(row[indicator.chart_id])))
        .slice(-126)
        .map(row => ({ date: String(row.date), value: Number(row[indicator.chart_id]) }))
    }
    if (!history.length) throw new Error(`No history available for ${indicator.name}`)
    return { ...indicator, history: history.slice(-126) }
  }))
}

const base = import.meta.env.DEV
  ? '/tools-st-data/tools'
  : 'https://devbt2api.sentimentrader.com/st_data/tools'

export const testStDataEndpoint = (path: string) => import.meta.env.DEV
  ? `/tools-st-data/${path}`
  : `https://devbt2api.sentimentrader.com/st_data/${path}`

export const toolsEndpoint = (path: string) => `${base}/${path}`

export async function getTools<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(toolsEndpoint(path), { credentials: 'include', signal, headers: { Accept: 'application/json' } })
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { error?: string; msg?: string } | null
    throw new Error(detail?.error || detail?.msg || `Tools API ${response.status}: ${path}`)
  }
  const body = await response.text()
  try { return JSON.parse(body) as T }
  catch {
    // The monthly CSV serializer can emit bare NaN for empty fields.
    if (path.startsWith('monthly_archived_reports')) return JSON.parse(body.replace(/:\s*NaN(?=\s*[,}])/g, ': null')) as T
    throw new Error(`Invalid JSON from Tools API: ${path}`)
  }
}

export type HeatmapCell = [string, string, number, number]
export type RankRecord = Record<string, unknown>

export async function mutateTools<T>(path: string, method: 'POST' | 'DELETE', symbol: string): Promise<T> {
  const response = await fetch(toolsEndpoint(path), { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol, url: symbol }) })
  const payload = await response.json()
  if (!response.ok || (payload?.code && payload.code !== 200)) throw new Error(payload?.error || payload?.msg || `Tools API ${response.status}`)
  return payload as T
}

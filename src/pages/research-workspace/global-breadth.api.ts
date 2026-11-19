export interface GlobalBreadthData {
  regions: string[]
  measures: Array<{ measure: string; values: Record<string, number | null> }>
}

const base = import.meta.env.DEV ? '/dev/research' : `${import.meta.env.VITE_ST_API_BASE_URL || 'https://devbt2api.sentimentrader.com'}/research`

export async function fetchGlobalBreadth(signal?: AbortSignal): Promise<GlobalBreadthData> {
  const response = await fetch(`${base}/global_breadth`, { credentials: 'include', signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Global breadth request failed: ${response.status}`)
  const payload = await response.json() as { code: number; msg?: string; data?: GlobalBreadthData }
  if (payload.code !== 200 || !Array.isArray(payload.data?.regions) || !Array.isArray(payload.data?.measures)) throw new Error(payload.msg || 'Unexpected global breadth response')
  return payload.data
}

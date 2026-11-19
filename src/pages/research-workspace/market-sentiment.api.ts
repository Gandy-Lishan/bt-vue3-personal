export interface MarketSentimentData {
  markets: Array<{ name: string; symbol: string; date: string; optix: number | null; position: number | null; zone: string }>
  distribution: { pessimism: number; neutral: number; optimism: number }
}

const base = import.meta.env.DEV ? '/dev/research' : `${import.meta.env.VITE_ST_API_BASE_URL || 'https://devbt2api.sentimentrader.com'}/research`

export async function fetchMarketSentiment(signal?: AbortSignal): Promise<MarketSentimentData> {
  const response = await fetch(`${base}/market_sentiment`, { credentials: 'include', signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Market sentiment request failed: ${response.status}`)
  const payload = await response.json() as { code: number; msg?: string; data?: MarketSentimentData }
  if (payload.code !== 200 || !Array.isArray(payload.data?.markets) || !payload.data?.distribution) throw new Error(payload.msg || 'Unexpected market sentiment response')
  return payload.data
}

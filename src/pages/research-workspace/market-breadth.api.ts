export const marketBreadthKeys = ['nh', 'nl', 'nh12', 'nl12', 'nh4', 'nl4', '10', '50', '200', 'bbup', 'bbdown', 'rsi30', 'rsi70', 'ad', 'adline', 'ad10', 'mcosc', 'mcsumm', 'panic_composite'] as const

export interface MarketBreadthRow {
  symbol: string
  group: string
  values: (number | null)[]
  colors: Record<string, string>
}

interface MarketBreadthResponse {
  code: number
  msg: string
  data: {
    metrics: Array<{ key: string; label: string }>
    markets: Array<{ symbol: string; name: string; region: string; values: Record<string, number | null> }>
  }
}

export async function fetchMarketBreadth(signal?: AbortSignal): Promise<MarketBreadthRow[]> {
  const endpoint = import.meta.env.DEV
    ? '/dev/research/market_breadth'
    : `${import.meta.env.VITE_ST_API_BASE_URL || 'https://devbt2api.sentimentrader.com'}/research/market_breadth`
  const response = await fetch(endpoint, { credentials: 'include', signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Market Breadth request failed: ${response.status}`)
  const payload = await response.json() as MarketBreadthResponse
  if (payload.code !== 200 || !Array.isArray(payload.data?.markets) || !Array.isArray(payload.data?.metrics)) throw new Error(payload.msg || 'Unexpected Market Breadth response')
  return payload.data.markets.map(market => ({
    symbol: market.name || market.symbol,
    group: market.region,
    values: marketBreadthKeys.map(key => {
      const value = market.values?.[key]
      return value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value)
    }),
    colors: {},
  }))
}

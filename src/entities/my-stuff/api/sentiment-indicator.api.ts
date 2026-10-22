import indicatorListUrl from '@/assets/indicatorsWithSymbolList.json?url'
import stocksData from '@/assets/stocks_list.json'

export interface SignalIndicatorOption {
  value: string
  label: string
  url: string
  description?: string
  meta?: string
}

/** Uses the complete static sentiment-indicator source and filtering rules from the legacy signal builder. */
export async function fetchSentimentIndicatorOptions(signal?: AbortSignal): Promise<SignalIndicatorOption[]> {
  const response = await fetch(indicatorListUrl, { signal })
  if (!response.ok) throw new Error(`Sentiment indicator asset failed to load: ${response.status}`)
  const indicatorsData = await response.json() as Array<Record<string, unknown>>
  const stockSymbols = new Set(
    (stocksData as Array<{ stock?: string; symbol?: string }>).map((item) => String(item.stock ?? item.symbol ?? '').trim()),
  )
  const unique = new Map<string, SignalIndicatorOption>()
  for (const item of indicatorsData) {
    const url = String(item.url ?? '').trim()
    const originalName = String(item.chart_name ?? item.name ?? '').trim()
    // The legacy store renamed stock-backed entries so they were distinguishable
    // from the symbol itself in the indicator search.
    const name = stockSymbols.has(url) ? `${url} Optix` : originalName
    if (!name || /seasonality/i.test(name) || unique.has(name)) continue
    const market = String(item.market_symbol ?? '').trim()
    const updated = String(item.updated ?? item.timeframe ?? '').trim()
    const type = String(item.type ?? '').trim()
    unique.set(name, {
      value: name,
      label: name,
      url,
      description: market ? `Market: ${market}` : undefined,
      meta: updated || type || undefined,
    })
  }
  return [...unique.values()]
}

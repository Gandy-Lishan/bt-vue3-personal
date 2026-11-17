import type { Indicator, IndicatorChartDataRow } from '../model/indicator.types'

export type IntradaySource = 'intraday' | 'intraday-charts' | 'intraday-watchlist'
type Json = Record<string, any>

export function intradayId(source: IntradaySource, symbol: string) {
  return `intraday:${source}:${symbol}`
}

export function parseIntradayId(id: string): { source: IntradaySource; symbol: string } | null {
  const match = /^intraday:(intraday|intraday-charts|intraday-watchlist):(.+)$/.exec(id)
  return match ? { source: match[1] as IntradaySource, symbol: match[2] } : null
}

export async function intradayRequest(path: string, options?: RequestInit): Promise<Json> {
  const response = await fetch(path, { credentials: 'include', ...options })
  if (!response.ok) throw new Error(response.status === 410 ? 'Intraday data requires an eligible subscription.' : `Unable to load intraday data (${response.status}).`)
  const text = await response.text()
  if (!text) return {}
  try { return JSON.parse(text) }
  catch { throw new Error('Invalid intraday response.') }
}

export function intradayRecords(value: unknown): any[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') { try { return intradayRecords(JSON.parse(value)) } catch { return [] } }
  return []
}

/** Keep the clock time supplied by the intraday API; its chart uses the same UTC clock. */
export function formatIntradayTime(value: unknown): string {
  if (value == null || value === '') return '—'
  const raw = String(value).trim().replace(/\s+ET$/i, '')
  const literal = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/)
  if (literal && !/[+-]\d{2}:?\d{2}$/.test(raw)) return `${literal[1]} ${literal[2]}`
  const timestamp = /^\d+$/.test(raw) ? Number(raw) * (Number(raw) < 1e11 ? 1000 : 1) : Date.parse(raw)
  if (!Number.isFinite(timestamp)) return '—'
  const date = new Date(timestamp)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}

export async function fetchIntradayWatchlist() {
  try {
    const payload = await intradayRequest('/dev/watchlist_app/watchlist?category=5m')
    const data = payload.data ?? payload
    const record = (Array.isArray(data) ? data[0] : data) ?? {}
    let rawTickers = record.tickers
    if (typeof rawTickers === 'string') {
      try { rawTickers = JSON.parse(rawTickers) } catch { rawTickers = [] }
    }
    const tickers: string[] = Array.isArray(rawTickers) ? rawTickers : Object.keys(record).filter(key => intradayRecords(record[key]?.records).length)
    return { record, tickers, url: payload.url ?? record.url ?? null }
  } catch (error) {
    if (error instanceof Error && error.message.includes('(404)')) return { record: {}, tickers: [], url: null }
    throw error
  }
}

export async function saveIntradayWatchlist(url: string | null, tickers: string[]) {
  const form = new FormData()
  form.append('category', '5m')
  form.append('tickers', JSON.stringify(tickers))
  form.append('columns', '[]')
  await intradayRequest(url ? `/dev/watchlist_app/watchlist?url=${encodeURIComponent(url)}` : '/dev/watchlist_app/watchlist', { method: url ? 'PUT' : 'POST', body: form })
}

function indicator(source: IntradaySource, symbol: string, name: string, value: unknown, date: unknown, raw: Json): Indicator {
  const numeric = Number(value)
  return {
    id: intradayId(source, symbol), name, group: 'Intraday', groupId: 'intraday', subgroup: source,
    sourceList: source, timeFrame: source === 'intraday-charts' ? '30 min' : '5 min', currentValue: Number.isFinite(numeric) ? numeric : 0,
    change: 0, updatedAt: String(date ?? ''), sentiment: 'neutral', sentimentScore: 4,
    trendLines: [], favorite: Boolean(raw.favorite), type: source, marketSymbol: symbol,
    raw: { ...raw, chart_name: name, symbol, last_value: value, last_update: date },
  }
}

export async function fetchIntradayList(source: IntradaySource, knownWatchlist?: Awaited<ReturnType<typeof fetchIntradayWatchlist>>): Promise<Indicator[]> {
  if (source === 'intraday-charts') {
    const payload = (await intradayRequest('/dev/st_data/intraday_charts')).data
    if (!Array.isArray(payload?.charts)) throw new Error('Invalid intraday charts response.')
    return payload.charts.map((chart: Json) => {
      const row = indicator(source, String(chart.chart_id), String(chart.title), chart.last_value, formatIntradayTime(chart.last_updated), { ...chart, dashboardChart: chart })
      row.trendLines = intradaySparkline(chart, source)
      row.raw.intraday_change = intradayPeriodChange(chart, source)
      return row
    })
  }
  const watchlist = knownWatchlist ?? await fetchIntradayWatchlist()
  if (source === 'intraday-watchlist') {
    return watchlist.tickers.flatMap(symbol => {
      const ticker = watchlist.record[symbol]
      if (!ticker) return []
      const bars = intradayRecords(ticker.records)
      const latest = bars.at(-1)
      const value = Array.isArray(latest) ? latest[6] : latest?.Optix ?? latest?.optix
      const close = Array.isArray(latest) ? latest[4] : latest?.Close ?? latest?.close
      const date = Array.isArray(latest) ? latest[0] : latest?.Date ?? latest?.date ?? latest?.timestamp ?? latest?.time
      const row = indicator(source, symbol, ticker.ticker_name ?? symbol, value, formatIntradayTime(date), { records: bars, close, optix: value, favorite: true })
      row.trendLines = intradaySparkline({ records: bars }, source)
      row.raw.intraday_change = intradayPeriodChange({ records: bars }, source)
      return [row]
    })
  }
  const payload = (await intradayRequest('/dev/st_data/sp_1500_intraday')).data
  if (!Array.isArray(payload?.items)) throw new Error('Invalid intraday response.')
  return payload.items.map((item: Json) => {
    const row = indicator(source, String(item.symbol), item.name ?? item.symbol, item.optix, formatIntradayTime(item.date), { ...item, favorite: watchlist.tickers.includes(item.symbol) })
    if (item.bars || item.records) row.raw.intraday_change = intradayPeriodChange(item, source)
    return row
  })
}

export async function fetchIntradayChart(source: IntradaySource, symbol: string) {
  if (source === 'intraday-charts') {
    const payload = (await intradayRequest('/dev/st_data/intraday_charts')).data
    return payload.charts?.find((chart: Json) => String(chart.chart_id) === symbol) ?? null
  }
  if (source === 'intraday-watchlist') {
    const watchlist = await fetchIntradayWatchlist()
    return { records: intradayRecords(watchlist.record[symbol]?.records) }
  }
  return (await intradayRequest(`/dev/st_data/intraday_chart?symbol=${encodeURIComponent(symbol)}`)).data
}

function intradayTimestamp(value: unknown): number {
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    const number = Number(value)
    return number < 1e11 ? number * 1000 : number
  }
  return Date.parse(String(value))
}

/** Adapt the old intraday bar formats to the Indicator chart's row-based input. */
export function intradayChartRows(data: Json, source: IntradaySource): IndicatorChartDataRow[] {
  if (source === 'intraday-charts') {
    return intradayRecords(data.data).flatMap((point) => {
      const date = Array.isArray(point) ? point[0] : point.Date ?? point.date ?? point.timestamp ?? point.time
      const value = Array.isArray(point) ? point[1] : point.value ?? point.Value
      const timestamp = intradayTimestamp(date)
      const numeric = Number(value)
      return Number.isFinite(timestamp) && Number.isFinite(numeric) ? [{ date: timestamp, value: numeric }] : []
    }).sort((a, b) => Number(a.date) - Number(b.date))
  }

  const bars = intradayRecords(data.bars).length ? intradayRecords(data.bars) : intradayRecords(data.records)
  const byTime = new Map<number, IndicatorChartDataRow>()
  for (const bar of bars) {
    const date = Array.isArray(bar) ? bar[0] : bar.Date ?? bar.date ?? bar.timestamp ?? bar.time
    const timestamp = intradayTimestamp(date)
    if (!Number.isFinite(timestamp)) continue
    const close = Array.isArray(bar) ? bar[4] : bar.Close ?? bar.close
    const optix = Array.isArray(bar) ? bar[6] : bar.Optix ?? bar.optix
    const row: IndicatorChartDataRow = { date: timestamp }
    if (close != null && close !== '' && Number.isFinite(Number(close))) row.price = Number(close)
    if (optix != null && optix !== '' && Number.isFinite(Number(optix))) row.optix = Number(optix)
    byTime.set(timestamp, row)
  }
  if (Array.isArray(data.optix)) {
    for (const point of data.optix) {
      const date = Array.isArray(point) ? point[0] : point.Date ?? point.date ?? point.timestamp ?? point.time
      const timestamp = intradayTimestamp(date)
      const value = Array.isArray(point) ? point[1] : point.Optix ?? point.optix
      if (!Number.isFinite(timestamp) || value == null || value === '' || !Number.isFinite(Number(value))) continue
      byTime.set(timestamp, { ...(byTime.get(timestamp) ?? { date: timestamp }), optix: Number(value) })
    }
  }
  return [...byTime.values()].filter((row) => row.price != null).sort((a, b) => Number(a.date) - Number(b.date))
}

export function intradaySparkline(data: Json, source: IntradaySource): number[][] {
  const rows = intradayChartRows(data, source)
  const latest = Number(rows.at(-1)?.date)
  if (!Number.isFinite(latest)) return []
  const values = rows
    .filter((row) => Number(row.date) >= latest - 24 * 60 * 60 * 1000)
    .map((row) => Number(source === 'intraday-charts' ? row.value : row.optix))
    .filter(Number.isFinite)
  return values.length >= 2 ? [values] : []
}

export function intradayPeriodChange(data: Json, source: IntradaySource): number | null {
  const rows = intradayChartRows(data, source)
  if (rows.length < 2) return null
  const latest = rows.at(-1)!
  const previous = rows.at(-2)!
  const interval = source === 'intraday-charts' ? 30 * 60_000 : 5 * 60_000
  const elapsed = Number(latest.date) - Number(previous.date)
  if (elapsed <= 0 || elapsed > interval) return null
  const currentValue = Number(source === 'intraday-charts' ? latest.value : latest.optix)
  const priorValue = Number(source === 'intraday-charts' ? previous.value : previous.optix)
  return Number.isFinite(currentValue) && Number.isFinite(priorValue) ? Number((currentValue - priorValue).toFixed(2)) : null
}

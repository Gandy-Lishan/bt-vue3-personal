import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatIntradayTime, intradayChartRows, intradayPeriodChange, intradaySparkline, parseIntradayId } from '@/entities/indicator/api/intraday.api'
import { useIndicatorStore } from '@/entities/indicator/model/indicator.store'
import { intradayMarketElapsedMs, isIntradayMarketOpen } from '@/entities/indicator/model/intraday.market-time'

function json(body: unknown) { return new Response(JSON.stringify(body), { status: 200 }) }

describe('Intraday indicator lists', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.unstubAllGlobals())

  it('loads S&P 1500 rows into the shared list and preserves a detail route identity', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => String(input).includes('watchlist')
      ? json({ data: { tickers: '["AAPL"]' } })
      : json({ data: { items: [{ symbol: 'AAPL', name: 'Apple', close: 215.5, optix: 62, date: '2026-11-13 10:05 ET' }] } }))
    vi.stubGlobal('fetch', fetchMock)
    const store = useIndicatorStore()
    store.setGroup('intraday')
    await store.ensureCurrentList()
    expect(store.pagedItems).toHaveLength(1)
    expect(store.pagedItems[0].favorite).toBe(true)
    store.favoriteIndicators = []
    store.applyFavoriteFlags()
    expect(store.pagedItems[0].favorite).toBe(true)
    expect(parseIntradayId(store.pagedItems[0].id)).toEqual({ source: 'intraday', symbol: 'AAPL' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('loads predefined charts as a separate shared list', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ data: { charts: [{ chart_id: 'flow', title: 'Intraday Flow', last_value: 37.25, last_updated: '2026-11-13 10:05 ET', data: [[1000, 42]] }] } })))
    const store = useIndicatorStore()
    store.setGroup('intraday')
    store.setSubgroup('intraday-charts')
    await store.ensureCurrentList()
    expect(store.pagedItems[0].name).toBe('Intraday Flow')
    expect(store.pagedItems[0].currentValue).toBe(37.25)
    expect(store.pagedItems[0].updatedAt).toBe('2026-11-13 10:05')
    expect(store.pagedItems[0].timeFrame).toBe('30 min')
    expect(parseIntradayId(store.pagedItems[0].id)).toEqual({ source: 'intraday-charts', symbol: 'flow' })
  })

  it('shows the latest watchlist record time in the Time (ET) column', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ data: {
      tickers: ['ASO'],
      ASO: { ticker_name: 'ASO', records: [{ time: '2026-11-13 10:05 ET', close: 100, optix: 62 }] },
    } })))
    const store = useIndicatorStore()
    await store.ensureList('intraday-watchlist')
    expect(store.itemsBySource['intraday-watchlist'][0].updatedAt).toBe('2026-11-13 10:05')
  })

  it('formats intraday timestamps without shifting the API clock time', () => {
    expect(formatIntradayTime('2026-11-13 10:05 ET')).toBe('2026-11-13 10:05')
    expect(formatIntradayTime('2026-11-13T10:05:30Z')).toBe('2026-11-13 10:05')
    expect(formatIntradayTime(1794564300)).toMatch(/^2026-11-13 \d{2}:\d{2}$/)
  })

  it('adapts stock bars and separate Optix readings for the shared chart', () => {
    expect(intradayChartRows({
      bars: [[1794564300, 0, 0, 0, 215.5]],
      optix: [[1794564300, 62]],
    }, 'intraday')).toEqual([{ date: 1794564300000, price: 215.5, optix: 62 }])
  })

  it('adapts predefined chart values for the shared chart', () => {
    expect(intradayChartRows({ data: [[1794564300, 37.25]] }, 'intraday-charts'))
      .toEqual([{ date: 1794564300000, value: 37.25 }])
  })

  it('uses only the latest day of intraday values for list previews', () => {
    const latest = 1794564600
    expect(intradaySparkline({ data: [[latest - 90000, 1], [latest - 300, 42], [latest, 45]] }, 'intraday-charts')).toEqual([[42, 45]])
    expect(intradaySparkline({ records: [[latest - 90000, 0, 0, 0, 100, 0, 10], [latest - 300, 0, 0, 0, 101, 0, 62], [latest, 0, 0, 0, 102, 0, 65]] }, 'intraday-watchlist')).toEqual([[62, 65]])
  })

  it('calculates the change over one source interval only', () => {
    expect(intradayPeriodChange({ bars: [[1794564300, 0, 0, 0, 100, 0, 60], [1794564600, 0, 0, 0, 101, 0, 64]] }, 'intraday')).toBe(4)
    expect(intradayPeriodChange({ data: [[1794562800, 40], [1794564600, 43]] }, 'intraday-charts')).toBe(3)
    expect(intradayPeriodChange({ bars: [[1794564300, 0, 0, 0, 100, 0, 60], [1794564900, 0, 0, 0, 101, 0, 64]] }, 'intraday')).toBeNull()
  })

  it('fetches missing S&P 1500 previews for the current rows', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input)
      if (path.includes('watchlist')) return json({ data: { tickers: [] } })
      if (path.includes('intraday_chart?')) return json({ data: { bars: [[1794564300, 0, 0, 0, 100, 0, 60], [1794564600, 0, 0, 0, 101, 0, 64]] } })
      return json({ data: { items: [{ symbol: 'ASO', name: 'ASO', optix: 64 }] } })
    })
    vi.stubGlobal('fetch', fetchMock)
    const store = useIndicatorStore()
    store.setGroup('intraday')
    await store.ensureCurrentList()
    await store.ensureTrendsForIndicators(store.pagedItems)
    expect(store.pagedItems[0].trendLines).toEqual([[60, 64]])
    expect(store.pagedItems[0].raw.intraday_change).toBe(4)
    await store.ensureTrendsForIndicators(store.pagedItems)
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('intraday_chart?'))).toHaveLength(1)
  })

  it('refreshes 5-minute lists only when due and keeps a local favorite', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => String(input).includes('watchlist')
      ? json({ data: { tickers: [] } })
      : json({ data: { items: [{ symbol: 'ASO', name: 'ASO', optix: 62 }] } }))
    vi.stubGlobal('fetch', fetchMock)
    const store = useIndicatorStore()
    await store.ensureList('intraday')
    store.intradayWatchOverrides.ASO = true
    const fetchedAt = Date.UTC(2026, 10, 13, 14, 30)
    store.intradayFetchedAt.intraday = fetchedAt
    expect(await store.refreshIntradayList('intraday', fetchedAt + 4 * 60_000)).toBe(false)
    expect(await store.refreshIntradayList('intraday', Date.UTC(2026, 10, 13, 21, 5))).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(await store.refreshIntradayList('intraday', fetchedAt + 5 * 60_000)).toBe(true)
    expect(store.itemsBySource.intraday[0].favorite).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(store.isCurrentSourceLoading).toBe(false)
  })

  it('refreshes Intraday Charts every 30 minutes', async () => {
    const fetchMock = vi.fn(async () => json({ data: { charts: [{ chart_id: 'flow', title: 'Flow', data: [[1794564300, 40], [1794564600, 42]] }] } }))
    vi.stubGlobal('fetch', fetchMock)
    const store = useIndicatorStore()
    await store.ensureList('intraday-charts')
    const fetchedAt = Date.UTC(2026, 10, 13, 14, 30)
    store.intradayFetchedAt['intraday-charts'] = fetchedAt
    expect(await store.refreshIntradayList('intraday-charts', fetchedAt + 29 * 60_000)).toBe(false)
    expect(await store.refreshIntradayList('intraday-charts', fetchedAt + 30 * 60_000)).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('counts only Eastern market time across nights, weekends, and daylight saving', () => {
    const fridayClose = Date.UTC(2026, 10, 13, 20, 58)
    const mondayOpen = Date.UTC(2026, 10, 16, 14, 33)
    expect(intradayMarketElapsedMs(fridayClose, mondayOpen)).toBe(5 * 60_000)
    expect(isIntradayMarketOpen(Date.UTC(2026, 10, 13, 21, 1))).toBe(false)
    expect(isIntradayMarketOpen(mondayOpen)).toBe(true)
    expect(intradayMarketElapsedMs(Date.UTC(2026, 2, 6, 20, 58), Date.UTC(2026, 2, 9, 13, 33))).toBe(5 * 60_000)
  })

  it('saves Intraday stars without invalidating or reloading the shared list', async () => {
    let tickers: string[] = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (path.includes('watchlist') && init?.method === 'POST') {
        tickers = JSON.parse(String((init.body as FormData).get('tickers')))
        return json({})
      }
      if (path.includes('watchlist')) return json({ data: { tickers } })
      return json({ data: { items: [{ symbol: 'ASO', name: 'ASO', optix: 62, date: '2026-11-13 10:05 ET' }] } })
    })
    vi.stubGlobal('fetch', fetchMock)
    const store = useIndicatorStore()
    store.setGroup('intraday')
    await store.ensureCurrentList()
    expect(store.pagedItems[0].favorite).toBe(false)
    await store.toggleIntradayWatch('ASO')
    expect(tickers).toEqual(['ASO'])
    expect(store.pagedItems[0].favorite).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('/dev/watchlist_app/watchlist', expect.objectContaining({ method: 'POST' }))
    expect(fetchMock.mock.calls.filter(([url, init]) => String(url).includes('watchlist') && init?.method !== 'POST')).toHaveLength(1)
    expect(store.loadedBySource.intraday).toBe(true)
    await store.ensureCurrentList()
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('sp_1500_intraday'))).toHaveLength(1)
  })

  it('keeps a detail star filled when the watchlist GET is briefly stale after saving', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') return json({})
      if (String(input).includes('watchlist')) return json({ data: { tickers: [] } })
      return json({ data: { items: [{ symbol: 'ASO', name: 'ASO', optix: 62 }] } })
    })
    vi.stubGlobal('fetch', fetchMock)
    const store = useIndicatorStore()
    store.setGroup('intraday')
    await store.ensureCurrentList()
    await store.toggleIntradayWatch('ASO')
    expect(store.pagedItems[0].favorite).toBe(true)
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('sp_1500_intraday'))).toHaveLength(1)
  })

  it('updates an already loaded watchlist locally when a star changes', async () => {
    let tickers: string[] = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        tickers = JSON.parse(String((init.body as FormData).get('tickers')))
        return json({})
      }
      if (String(input).includes('watchlist')) return json({ data: { tickers } })
      return json({ data: { items: [{ symbol: 'ASO', name: 'ASO', optix: 62 }] } })
    })
    vi.stubGlobal('fetch', fetchMock)
    const store = useIndicatorStore()
    store.setGroup('intraday')
    await store.ensureCurrentList()
    await store.ensureList('intraday-watchlist')

    await store.toggleIntradayWatch('ASO')
    expect(store.itemsBySource['intraday-watchlist'].map((item) => item.marketSymbol)).toEqual(['ASO'])
    await store.toggleIntradayWatch('ASO', 'detail')
    expect(store.itemsBySource['intraday-watchlist']).toEqual([])
    expect(store.loadedBySource['intraday-watchlist']).toBe(true)
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('sp_1500_intraday'))).toHaveLength(1)
  })

  it('preserves saved symbols outside the S&P 1500 list when toggling another star', async () => {
    let saved: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        saved = JSON.parse(String((init.body as FormData).get('tickers')))
        return json({})
      }
      if (String(input).includes('watchlist')) return json({ data: { tickers: ['OTHER'] } })
      return json({ data: { items: [{ symbol: 'ASO', name: 'ASO', optix: 62 }] } })
    }))
    const store = useIndicatorStore()
    store.setGroup('intraday')
    await store.ensureCurrentList()
    await store.toggleIntradayWatch('ASO', 'detail')
    expect(saved).toEqual(['OTHER', 'ASO'])
  })
})

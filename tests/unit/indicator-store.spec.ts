import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useIndicatorStore } from '@/entities/indicator/model/indicator.store'
import { getSeededIndicatorDetail, getSeededRawIndicators } from '@/entities/indicator/model/indicator.fixtures'

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  })
}

function mockIndicatorList(body: unknown = getSeededRawIndicators('stock_complete_list')) {
  const fetchMock = vi.fn(async () => jsonResponse(body))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function mockIndicatorListAndTrends(listBody: unknown, trendBody: unknown) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('stock_recent_data')) return jsonResponse(trendBody)
    return jsonResponse(listBody)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function mockIndicatorListAndDynamicTrends(listBody: Array<Record<string, unknown>>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes('stock_recent_data')) {
      const body = JSON.parse(String(init?.body ?? '{}')) as { indicator_list?: string[] }
      return jsonResponse(
        (body.indicator_list ?? []).map((symbol) => ({
          symbol,
          data: [
            { close: 1 },
            { close: 2 },
          ],
        })),
      )
    }

    return jsonResponse(listBody)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('indicator store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockIndicatorList()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the current list through the cached data layer', async () => {
    const store = useIndicatorStore()

    await store.ensureCurrentList()

    expect(store.sourceItems.length).toBeGreaterThan(0)
    expect(store.pagedItems[0].name).toContain('S&P 500')
  })

  it('caches an empty list without falling back to fixture data', async () => {
    const fetchMock = mockIndicatorList([])
    const store = useIndicatorStore()

    await store.ensureCurrentList()
    await store.ensureCurrentList()

    expect(store.sourceItems).toEqual([])
    expect(store.totalIndicators).toBe(0)
    expect(store.resultStart).toBe(0)
    expect(store.resultEnd).toBe(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('switches between table and card page sizes', async () => {
    const store = useIndicatorStore()

    await store.ensureCurrentList()
    expect(store.pageSize).toBe(12)

    store.setViewMode('cards')
    expect(store.pageSize).toBe(12)
  })

  it('indexes loaded indicators by lowercased id across every source', async () => {
    mockIndicatorList([
      { url: 'Alpha', chart_name: 'Alpha' },
      { url: 'bravo', chart_name: 'Bravo' },
    ])
    const store = useIndicatorStore()

    await store.ensureCurrentList()

    expect(store.indicatorsById.get('alpha')?.name).toBe('Alpha')
    expect(store.indicatorsById.get('bravo')?.name).toBe('Bravo')
    expect(store.indicatorsById.get('missing')).toBeUndefined()
  })

  it('round-trips each list through its route key', () => {
    const store = useIndicatorStore()

    for (const key of ['popular', 'favorites', 'nasdaq100', 'cot', 'stock']) {
      expect(store.setListKey(key)).toBe(true)
      // The key that comes back must be the one that went in, or returning to the list
      // from a detail page would land somewhere else.
      expect(store.listKey).toBe(key)
    }
  })

  it('restores a standalone section without dropping it into a subgroup list', () => {
    const store = useIndicatorStore()

    store.setListKey('popular')

    expect(store.activeSection).toBe('popular')
    expect(store.isStandaloneList).toBe(true)
    expect(store.listLabel).toBe('Most Popular')

    store.setListKey('favorites')

    expect(store.activeSection).toBe('favorites')
    expect(store.listLabel).toBe('My Favorites')
  })

  it('restores a subgroup, resolving the group it belongs to', () => {
    const store = useIndicatorStore()

    store.setListKey('nasdaq100')

    expect(store.activeSection).toBe('indicators')
    expect(store.activeGroupId).toBe('stock-sentiment')
    expect(store.activeSubgroupId).toBe('nasdaq100')
    expect(store.isStandaloneList).toBe(false)
    expect(store.listLabel).toBe('NASDAQ 100 Stock Sentiment')
  })

  it('reports an unknown list key rather than silently changing lists', () => {
    const store = useIndicatorStore()
    store.setListKey('nasdaq100')

    expect(store.setListKey('not-a-real-list')).toBe(false)
    expect(store.activeSubgroupId).toBe('nasdaq100')
  })

  it('switches the active group and subgroup from a resolved source', () => {
    const store = useIndicatorStore()

    expect(store.setActiveSource('sp_1500_complete_list')).toBe(true)

    expect(store.activeGroupId).toBe('stock-sentiment')
    expect(store.activeSubgroupId).toBe('sp1500')
    expect(store.activeSource).toBe('sp_1500_complete_list')
  })

  it('prefers a clicked-list source hint over inferred detail metadata', () => {
    const store = useIndicatorStore()
    const detail = {
      ...getSeededIndicatorDetail('xlv_reltrend_above8_spx_ratio'),
      raw: {
        sub_type: 'stock_sent',
      },
    }

    store.rememberIndicatorSource('xlv_reltrend_above8_spx_ratio', 'stock_complete_list')

    expect(store.sourceForDetail('xlv_reltrend_above8_spx_ratio', detail)).toBe('stock_complete_list')
  })

  it('resets filters and sorting together', async () => {
    mockIndicatorList([
      { url: 'bravo', chart_name: 'Bravo' },
      { url: 'alpha', chart_name: 'Alpha' },
    ])
    const store = useIndicatorStore()

    await store.ensureCurrentList()
    store.setSort({ key: 'chart_name', kind: 'name' })
    store.searchQuery = 'x'
    store.timeFrameFilter = 'Short'

    store.resetFilters()

    expect(store.sortKey).toBe('')
    expect(store.sortDirection).toBe('asc')
    expect(store.searchQuery).toBe('')
    expect(store.timeFrameFilter).toBe('')
    expect(store.pagedItems.map((item) => item.name)).toEqual(['Bravo', 'Alpha'])
  })

  it('sorts the current list by text columns and toggles direction', async () => {
    mockIndicatorList([
      { url: 'bravo', chart_name: 'Bravo' },
      { url: 'alpha', chart_name: 'Alpha' },
      { url: 'charlie', chart_name: 'Charlie' },
    ])
    const store = useIndicatorStore()

    await store.ensureCurrentList()
    store.setSort({ key: 'chart_name', kind: 'name' })

    expect(store.pagedItems.map((item) => item.name)).toEqual(['Alpha', 'Bravo', 'Charlie'])

    store.setSort({ key: 'chart_name', kind: 'name' })

    expect(store.pagedItems.map((item) => item.name)).toEqual(['Charlie', 'Bravo', 'Alpha'])
  })

  it('sorts the current list by numeric columns', async () => {
    mockIndicatorList([
      { url: 'middle', chart_name: 'Middle', last_change: '1.4' },
      { url: 'low', chart_name: 'Low', last_change: '-2.1' },
      { url: 'high', chart_name: 'High', last_change: '7.8' },
    ])
    const store = useIndicatorStore()

    await store.ensureCurrentList()
    store.setSort({ key: 'last_change', kind: 'change' }, 'desc')

    expect(store.pagedItems.map((item) => item.name)).toEqual(['High', 'Middle', 'Low'])
  })

  it('writes trends onto the loaded favorite lists as well as the source lists', async () => {
    // Regression: favorites render from their own lists once loaded, so trends written
    // only to itemsBySource left My Favorites without a sparkline.
    mockIndicatorListAndTrends([], { data: {} })
    const store = useIndicatorStore()

    store.activeSection = 'favorites'
    store.favoriteListLoaded = true
    store.favoriteAccountItems = [{ id: 'alpha', name: 'Alpha', trendLines: [] } as never]
    store.favoriteLegacyItems = [{ id: 'Bravo', name: 'Bravo', trendLines: [] } as never]

    store.setIndicatorTrend('alpha', [[1, 2, 3]])
    // Legacy rows keep the server's casing, so the match cannot be case sensitive.
    store.setIndicatorTrend('bravo', [[4, 5, 6]])

    expect(store.favoriteItems.map((item) => item.trendLines)).toEqual([
      [[1, 2, 3]],
      [[4, 5, 6]],
    ])
  })

  it('loads and caches real trends for current page indicators', async () => {
    const fetchMock = mockIndicatorListAndTrends(
      [
        { url: 'alpha', chart_name: 'Alpha' },
        { url: 'bravo', chart_name: 'Bravo' },
      ],
      {
        data: {
          alpha: [
            { value: 1 },
            { value: 2 },
            { value: 3 },
          ],
          bravo: [{ value: 10 }],
        },
      },
    )
    const store = useIndicatorStore()

    await store.ensureCurrentList()
    expect(store.pagedItems.map((item) => item.trendLines)).toEqual([[], []])

    await store.ensureTrendsForIndicators(store.pagedItems)

    expect(store.itemsBySource.stock_complete_list[0].trendLines).toEqual([[1, 2, 3]])
    expect(store.itemsBySource.stock_complete_list[1].trendLines).toEqual([])

    const trendRequests = fetchMock.mock.calls.filter(([input]) => String(input).includes('stock_recent_data'))
    expect(trendRequests).toHaveLength(1)
    expect(trendRequests[0][1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
    })
    expect(JSON.parse(String((trendRequests[0][1] as RequestInit).body))).toEqual({
      indicator_list: ['alpha', 'bravo'],
    })

    await store.ensureTrendsForIndicators(store.pagedItems)
    expect(fetchMock.mock.calls.filter(([input]) => String(input).includes('stock_recent_data'))).toHaveLength(1)
  })

  it('requests the complete current page trend batch after sorting changes visible rows', async () => {
    const rows = Array.from({ length: 20 }, (_, index) => {
      const suffix = String(index).padStart(2, '0')
      return {
        url: `indicator-${suffix}`,
        chart_name: `Indicator ${suffix}`,
      }
    })
    const fetchMock = mockIndicatorListAndDynamicTrends(rows)
    const store = useIndicatorStore()

    await store.ensureCurrentList()
    const firstPageIds = store.pagedItems.map((item) => item.id)
    await store.ensureTrendsForIndicators(store.pagedItems)

    store.setSort({ key: 'chart_name', kind: 'name' }, 'desc')
    const sortedPageIds = store.pagedItems.map((item) => item.id)
    await store.ensureTrendsForIndicators(store.pagedItems)

    const trendRequestBodies = fetchMock.mock.calls
      .filter(([input]) => String(input).includes('stock_recent_data'))
      .map(([, init]) => JSON.parse(String((init as RequestInit).body)).indicator_list as string[])

    expect(firstPageIds).toHaveLength(12)
    expect(sortedPageIds).toHaveLength(12)
    expect(sortedPageIds.some((id) => firstPageIds.includes(id))).toBe(true)
    expect(trendRequestBodies).toEqual([firstPageIds, sortedPageIds])
  })
})

import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useIndicatorStore } from '@/entities/indicator/model/indicator.store'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function emptyResponse(status = 200) {
  return new Response(null, { status })
}

interface MockOptions {
  favorites?: unknown
  details?: Record<string, Record<string, unknown>>
  legacyFavorites?: unknown
  getFails?: boolean
  putFails?: boolean
}

function mockApi(options: MockOptions = {}) {
  const calls: Array<{ method: string; url: string; body: string | null; contentType: string | null }> = []

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = (init?.method ?? 'GET').toUpperCase()

    if (url.includes('favorites')) {
      calls.push({
        method,
        url,
        body: typeof init?.body === 'string' ? init.body : null,
        contentType: new Headers(init?.headers).get('Content-Type'),
      })

      if (method === 'GET') {
        if (options.getFails) return new Response(null, { status: 500 })
        return jsonResponse(options.favorites ?? { favorite_indicator: '[]', favorite_symbol: '[]' })
      }

      // A successful PUT answers with no body, which the shared JSON helper would reject.
      return options.putFails ? emptyResponse(500) : emptyResponse()
    }

    if (url.includes('search_url_info')) {
      const id = new URL(url, 'https://example.test').searchParams.get('url') ?? ''
      return jsonResponse(options.details?.[id] ?? {})
    }

    if (url.includes('btv1_user_favorite_indicator')) {
      return jsonResponse(options.legacyFavorites ?? [])
    }

    return jsonResponse([])
  })

  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, calls }
}

function seedList(store: ReturnType<typeof useIndicatorStore>, rows: unknown) {
  store.itemsBySource.stock_complete_list = rows as never
}

function deferredResponse() {
  let resolve!: (value: Response) => void
  const promise = new Promise<Response>((innerResolve) => {
    resolve = innerResolve
  })
  return { promise, resolve }
}

describe('favorites store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the favorites list and overlays the star flags onto loaded rows', async () => {
    mockApi({
      favorites: { favorite_indicator: '[{"url":"alpha","name":"Alpha"}]', favorite_symbol: '["SPX"]' },
    })
    const store = useIndicatorStore()
    seedList(store, [
      { id: 'alpha', name: 'Alpha', favorite: false },
      { id: 'bravo', name: 'Bravo', favorite: true },
    ])

    await store.ensureFavorites()

    // Server list is authoritative: "alpha" gains a star, "bravo" loses one.
    expect(store.itemsBySource.stock_complete_list[0].favorite).toBe(true)
    expect(store.itemsBySource.stock_complete_list[1].favorite).toBe(false)
  })

  it('applies the overlay to a list that loads after the favorites fetch', async () => {
    // Real startup order: AppShell fetches favorites on mount, before any list exists,
    // so the overlay has to be re-applied when each list arrives.
    const { fetchMock } = mockApi({
      favorites: { favorite_indicator: '[{"url":"alpha","name":"Alpha"}]', favorite_symbol: '[]' },
    })
    const store = useIndicatorStore()

    await store.ensureFavorites()
    expect(store.itemsBySource).toEqual({})

    fetchMock.mockImplementation(async () => jsonResponse([{ url: 'alpha', chart_name: 'Alpha' }]))

    await store.ensureList('stock_complete_list')

    expect(store.itemsBySource.stock_complete_list[0].favorite).toBe(true)
  })

  it('leaves row flags untouched when the GET fails', async () => {
    mockApi({ getFails: true })
    const store = useIndicatorStore()
    seedList(store, [
      { id: 'alpha', name: 'Alpha', favorite: true },
      { id: 'bravo', name: 'Bravo', favorite: false },
    ])

    await store.ensureFavorites()

    expect(store.favoritesLoaded).toBe(false)
    expect(store.itemsBySource.stock_complete_list[0].favorite).toBe(true)
    expect(store.itemsBySource.stock_complete_list[1].favorite).toBe(false)
  })

  it('builds My Favorites from the server list, matching loaded rows', async () => {
    mockApi({
      favorites: {
        favorite_indicator: '[{"url":"alpha","name":"Alpha"},{"url":"not_loaded","name":"Not Loaded"}]',
        favorite_symbol: '[]',
      },
    })
    const store = useIndicatorStore()
    seedList(store, [{ id: 'alpha', name: 'Alpha From Row', favorite: false }])

    await store.ensureFavorites()
    store.setSection('favorites')

    // Matched rows use real data; unmatched ones fall back to a name-only stub.
    expect(store.sourceItems.map((item) => item.name)).toEqual(['Alpha From Row', 'Not Loaded'])
    expect(store.sourceItems[1].currentValue).toBeNaN()
  })

  it('loads My Favorites from account detail rows and legacy favorites', async () => {
    const { calls, fetchMock } = mockApi({
      favorites: {
        favorite_indicator: '[{"url":"alpha","name":"Alpha"}]',
        favorite_symbol: '[]',
      },
      details: {
        alpha: {
          url: 'alpha',
          chart_name: 'Alpha Detail',
          groups: 'Macro',
          sub_type: 'model',
          timeframe: 'Short-Term',
          last_value: 42,
          last_change: 1.5,
          last_update: '2026-09-16',
          sentiment: 6,
          type: 'Indicator',
        },
      },
      legacyFavorites: [
        {
          url: 'legacy',
          chart_name: 'Legacy Favorite',
          groups: 'Breadth',
          sub_type: 'etf_breadth',
          timeframe: 'Long-Term',
          last_value: 12,
          last_change: -0.5,
          last_update: '2026-09-15',
          sentiment: 3,
          type: 'Indicator',
        },
      ],
    })
    const store = useIndicatorStore()

    store.setSection('favorites')
    await store.ensureCurrentList()

    expect(store.sourceItems.map((item) => item.name)).toEqual(['Alpha Detail', 'Legacy Favorite'])
    expect(store.sourceItems[0]).toMatchObject({
      group: 'Macro',
      subgroup: 'Model',
      timeFrame: 'Short',
      favorite: true,
      favoriteSource: 'account',
      favoriteLocked: false,
    })
    expect(store.sourceItems[1]).toMatchObject({
      group: 'Breadth',
      subgroup: 'Sector Breadth',
      timeFrame: 'Long',
      favorite: true,
      favoriteSource: 'legacy',
      favoriteLocked: true,
    })
    expect(store.legacyFavoriteCount).toBe(1)
    expect(calls.filter((call) => call.method === 'GET' && call.url.includes('favorites'))).toHaveLength(1)
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/dev/st_data/search_url_info?url=alpha'))).toBe(true)
  })

  it('keeps the removable account favorite when a legacy favorite has the same id', async () => {
    mockApi({
      favorites: {
        favorite_indicator: '[{"url":"alpha","name":"Alpha"}]',
        favorite_symbol: '[]',
      },
      details: {
        alpha: { url: 'alpha', chart_name: 'Alpha Account', groups: 'Macro', sub_type: 'model' },
      },
      legacyFavorites: [{ url: 'alpha', chart_name: 'Alpha Legacy', groups: 'Breadth', sub_type: 'etf_breadth' }],
    })
    const store = useIndicatorStore()

    store.setSection('favorites')
    await store.ensureCurrentList()

    expect(store.favoriteItems).toHaveLength(1)
    expect(store.favoriteItems[0]).toMatchObject({
      id: 'alpha',
      name: 'Alpha Account',
      favoriteSource: 'account',
      favoriteLocked: false,
    })
  })

  it('shows an empty table when the last favorite is removed', async () => {
    // Regression: the list used to fall back to filtering rows by their favorite flag,
    // so the removed indicator's star came back and the table was never empty.
    mockApi({ favorites: { favorite_indicator: '[{"url":"alpha","name":"Alpha"}]', favorite_symbol: '[]' } })
    const store = useIndicatorStore()
    seedList(store, [{ id: 'alpha', name: 'Alpha', favorite: false }])

    await store.ensureFavorites()
    store.setSection('favorites')
    expect(store.sourceItems).toHaveLength(1)

    await store.toggleFavorite('alpha')

    expect(store.sourceItems).toEqual([])
    expect(store.favoriteItems).toEqual([])
    expect(store.totalIndicators).toBe(0)
  })

  it('persists the whole list and echoes favorite_symbol verbatim', async () => {
    const symbolsRaw = '[ "SPX" ,  "NDX" ]'
    const { calls } = mockApi({
      favorites: { favorite_indicator: '[{"url":"alpha","name":"Alpha"}]', favorite_symbol: symbolsRaw },
    })
    const store = useIndicatorStore()
    seedList(store, [{ id: 'bravo', name: 'Bravo', favorite: false }])

    await store.ensureFavorites()
    await store.toggleFavorite('bravo')

    const put = calls.find((call) => call.method === 'PUT')
    if (!put) throw new Error('no PUT issued')

    expect(put.contentType).toContain('application/x-www-form-urlencoded')

    const body = new URLSearchParams(put.body ?? '')
    expect(JSON.parse(body.get('favorite_indicator') ?? '')).toEqual([
      { url: 'alpha', name: 'Alpha' },
      { url: 'bravo', name: 'Bravo' },
    ])
    expect(body.get('favorite_symbol')).toBe(symbolsRaw)
  })

  it('accepts a PUT that answers with no body', async () => {
    mockApi({ favorites: { favorite_indicator: '[]', favorite_symbol: '[]' } })
    const store = useIndicatorStore()
    seedList(store, [{ id: 'alpha', name: 'Alpha', favorite: false }])

    await store.ensureFavorites()
    await store.toggleFavorite('alpha')

    expect(store.favoriteItems.map((row) => row.id)).toEqual(['alpha'])
    expect(store.toasts).toEqual([])
  })

  it('waits for an in-flight favorites load before writing a toggle', async () => {
    const pendingFavorites = deferredResponse()
    const calls: Array<{ method: string; body: string | null }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (!String(input).includes('favorites')) return jsonResponse([])

        const method = (init?.method ?? 'GET').toUpperCase()
        calls.push({ method, body: typeof init?.body === 'string' ? init.body : null })

        if (method === 'GET') return pendingFavorites.promise
        return emptyResponse()
      }),
    )

    const store = useIndicatorStore()
    seedList(store, [
      { id: 'alpha', name: 'Alpha', favorite: false },
      { id: 'bravo', name: 'Bravo', favorite: false },
    ])

    const loadPromise = store.ensureFavorites()
    const togglePromise = store.toggleFavorite('bravo')

    expect(calls.map((call) => call.method)).toEqual(['GET'])

    pendingFavorites.resolve(
      jsonResponse({
        favorite_indicator: '[{"url":"alpha","name":"Alpha"}]',
        favorite_symbol: '["SPX"]',
      }),
    )

    await Promise.all([loadPromise, togglePromise])

    const put = calls.find((call) => call.method === 'PUT')
    if (!put) throw new Error('no PUT issued')

    const body = new URLSearchParams(put.body ?? '')
    expect(JSON.parse(body.get('favorite_indicator') ?? '')).toEqual([
      { url: 'alpha', name: 'Alpha' },
      { url: 'bravo', name: 'Bravo' },
    ])
    expect(body.get('favorite_symbol')).toBe('["SPX"]')
    expect(store.favoriteItems.map((item) => item.id)).toEqual(['alpha', 'bravo'])
  })

  it('rolls the star back and raises a toast when the PUT fails', async () => {
    mockApi({ favorites: { favorite_indicator: '[]', favorite_symbol: '[]' }, putFails: true })
    const store = useIndicatorStore()
    seedList(store, [{ id: 'alpha', name: 'Alpha', favorite: false }])

    await store.ensureFavorites()
    await store.toggleFavorite('alpha')

    expect(store.favoriteItems).toEqual([])
    expect(store.itemsBySource.stock_complete_list[0].favorite).toBe(false)
    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0].message).toContain('reverted')
  })

  it('rolls back a failed removal by restoring the favorite', async () => {
    mockApi({
      favorites: { favorite_indicator: '[{"url":"alpha","name":"Alpha"}]', favorite_symbol: '[]' },
      putFails: true,
    })
    const store = useIndicatorStore()
    seedList(store, [{ id: 'alpha', name: 'Alpha', favorite: false }])

    await store.ensureFavorites()
    await store.toggleFavorite('alpha')

    expect(store.favoriteItems.map((row) => row.id)).toEqual(['alpha'])
    expect(store.itemsBySource.stock_complete_list[0].favorite).toBe(true)
  })

  it('sends rapid toggles to the server in order without clobbering each other', async () => {
    const { calls } = mockApi({ favorites: { favorite_indicator: '[]', favorite_symbol: '[]' } })
    const store = useIndicatorStore()
    seedList(store, [
      { id: 'alpha', name: 'Alpha', favorite: false },
      { id: 'bravo', name: 'Bravo', favorite: false },
    ])

    await store.ensureFavorites()
    // Fired without awaiting, the way a fast double-click arrives.
    await Promise.all([store.toggleFavorite('alpha'), store.toggleFavorite('bravo')])

    const puts = calls.filter((call) => call.method === 'PUT')
    expect(puts).toHaveLength(2)

    const bodies = puts.map((put) => JSON.parse(new URLSearchParams(put.body ?? '').get('favorite_indicator') ?? ''))
    expect(bodies[0]).toEqual([{ url: 'alpha', name: 'Alpha' }])
    expect(bodies[1]).toEqual([
      { url: 'alpha', name: 'Alpha' },
      { url: 'bravo', name: 'Bravo' },
    ])
    expect(store.favoriteItems.map((row) => row.id)).toEqual(['alpha', 'bravo'])
  })

  it('does not wipe a later toggle when an earlier write fails', async () => {
    // Rolling back a whole-list snapshot would discard the second toggle along with
    // the first, so the rollback is scoped to the indicator that failed.
    let putCount = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (!String(input).includes('favorites')) return jsonResponse([])

        if ((init?.method ?? 'GET').toUpperCase() === 'GET') {
          return jsonResponse({ favorite_indicator: '[]', favorite_symbol: '[]' })
        }

        putCount += 1
        return emptyResponse(putCount === 1 ? 500 : 200)
      }),
    )

    const store = useIndicatorStore()
    seedList(store, [
      { id: 'alpha', name: 'Alpha', favorite: false },
      { id: 'bravo', name: 'Bravo', favorite: false },
    ])

    await store.ensureFavorites()
    await Promise.all([store.toggleFavorite('alpha'), store.toggleFavorite('bravo')])

    // alpha rolled back, bravo kept.
    expect(store.favoriteItems.map((row) => row.id)).toEqual(['bravo'])
    expect(store.toasts).toHaveLength(1)
  })

  it('dismisses a toast by id', async () => {
    mockApi({ favorites: { favorite_indicator: '[]', favorite_symbol: '[]' }, putFails: true })
    const store = useIndicatorStore()
    seedList(store, [{ id: 'alpha', name: 'Alpha', favorite: false }])

    await store.ensureFavorites()
    await store.toggleFavorite('alpha')

    store.dismissToast(store.toasts[0].id)
    expect(store.toasts).toEqual([])
  })
})

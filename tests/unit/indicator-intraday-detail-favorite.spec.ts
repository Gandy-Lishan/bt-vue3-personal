import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import IndicatorDetailPage from '@/pages/indicators/IndicatorDetailPage.vue'

function json(body: unknown) { return new Response(JSON.stringify(body), { status: 200 }) }

describe('Intraday detail favorites', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fills both detail and sidebar stars without navigating after a save', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (path.includes('watchlist') && init?.method === 'POST') return json({})
      if (path.includes('watchlist')) return json({ data: { tickers: [] } })
      if (path.includes('sp_1500_intraday')) return json({ data: { items: [{ symbol: 'ASO', name: 'ASO', optix: 62, close: 10 }] } })
      if (path.includes('intraday_chart')) return json({ data: { bars: [[1794564300, 0, 0, 0, 10, 0, 62]] } })
      return json({})
    })
    vi.stubGlobal('fetch', fetchMock)
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/indicators', name: 'indicators', component: { template: '<div />' } },
      { path: '/indicators/:id', name: 'indicator-detail', component: IndicatorDetailPage },
    ] })
    await router.push('/indicators/intraday:intraday:ASO?list=intraday')
    await router.isReady()
    const wrapper = mount(IndicatorDetailPage, { global: { plugins: [pinia, router], stubs: { IndicatorTrendChart: true } } })
    await flushPromises()
    const star = wrapper.find('.indicator-summary__favorite')
    expect(star.exists()).toBe(true)
    await star.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('indicator-detail')
    expect(star.attributes('class')).toContain('indicator-summary__favorite--active')
    const sidebarStar = wrapper.find('aside button[aria-label="Remove from favorite indicators"]')
    expect(sidebarStar.exists()).toBe(true)
    await sidebarStar.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('indicator-detail')
    expect(star.attributes('class')).not.toContain('indicator-summary__favorite--active')
    wrapper.unmount()
  })

  it('stays on a Watchlist detail when its current symbol is unstarred', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (path.includes('watchlist') && init?.method === 'PUT') return json({})
      if (path.includes('watchlist')) return json({ data: { url: 'watch-1', tickers: ['ASO'], ASO: { ticker_name: 'ASO', records: [[1794564300, 0, 0, 0, 10, 0, 62]] } } })
      return json({})
    })
    vi.stubGlobal('fetch', fetchMock)
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/indicators', name: 'indicators', component: { template: '<div />' } },
      { path: '/indicators/:id', name: 'indicator-detail', component: IndicatorDetailPage },
    ] })
    await router.push('/indicators/intraday:intraday-watchlist:ASO?list=intraday-watchlist')
    await router.isReady()
    const wrapper = mount(IndicatorDetailPage, { global: { plugins: [pinia, router], stubs: { IndicatorTrendChart: true } } })
    await flushPromises()
    const star = wrapper.find('.indicator-summary__favorite')
    expect(star.attributes('class')).toContain('indicator-summary__favorite--active')
    await star.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('indicator-detail')
    expect(wrapper.find('.indicator-summary__title').text()).toBe('ASO')
    expect(star.attributes('class')).not.toContain('indicator-summary__favorite--active')
    wrapper.unmount()
  })

  it('does not follow the mobile sidebar link when its star is clicked', async () => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({ matches: query === '(max-width: 1279px)', addEventListener: vi.fn(), removeEventListener: vi.fn() })))
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') return json({})
      if (String(input).includes('watchlist')) return json({ data: { tickers: [] } })
      if (String(input).includes('sp_1500_intraday')) return json({ data: { items: [{ symbol: 'ASO', name: 'ASO', optix: 62 }] } })
      return json({ data: { bars: [[1794564300, 0, 0, 0, 10, 0, 62]] } })
    }))
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/indicators', name: 'indicators', component: { template: '<div />' } },
      { path: '/indicators/:id', name: 'indicator-detail', component: IndicatorDetailPage },
    ] })
    await router.push('/indicators/intraday:intraday:ASO?list=intraday')
    await router.isReady()
    const wrapper = mount(IndicatorDetailPage, { attachTo: document.body, global: { plugins: [pinia, router], stubs: { IndicatorTrendChart: true } } })
    await flushPromises()
    const openSidebar = wrapper.findAll('button').find(button => button.classes().includes('mb-3') && button.classes().includes('w-full'))
    expect(openSidebar).toBeDefined()
    await openSidebar!.trigger('click')
    await flushPromises()
    const mobileStar = document.body.querySelector('.fixed.inset-0 button[title="Add to favorite indicators"]') as HTMLButtonElement | null
    expect(mobileStar).not.toBeNull()
    expect(mobileStar?.closest('a')).toBeNull()
    mobileStar?.click()
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('indicator-detail')
    wrapper.unmount()
  })
})

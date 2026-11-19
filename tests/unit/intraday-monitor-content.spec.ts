import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import IntradayMonitorContent from '@/pages/research-workspace/IntradayMonitorContent.vue'

const response = (data: unknown) => new Response(JSON.stringify(data), { status: 200 })
afterEach(() => vi.unstubAllGlobals())

describe('Intraday Monitor legacy endpoints', () => {
  it('loads the legacy chart list and S&P 1500 list without requesting research/intraday', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _options?: RequestInit) => {
      const url = String(input)
      if (url.includes('/research-intraday-st-data/intraday_charts')) return response({ data: { charts: [
        { chart_id: 'spx_intraday', title: 'S&P 500', last_value: 6800, last_updated: '2026-11-18 10:30', data: [['2026-11-18 10:00', 6790], ['2026-11-18 10:30', 6800]] },
        { chart_id: 'ndx_intraday', title: 'Nasdaq 100', last_value: 25000, last_updated: '2026-11-18 10:30', data: [['2026-11-18 10:00', 24900], ['2026-11-18 10:30', 25000]] },
        { chart_id: 'flow', title: 'Intraday Flow', last_value: 43, last_updated: '2026-11-18 10:30', pess_extreme: 25, opt_extreme: 75, data: [['2026-11-18 10:00', 40], ['2026-11-18 10:30', 43]] },
      ] } })
      if (url.includes('/research-intraday-st-data/sp_1500_intraday')) return response({ data: { items: [
        { symbol: 'AAPL', name: 'Apple', optix: 62, date: '2026-11-18 10:30' },
      ] } })
      if (url.includes('/research-intraday-st-data/intraday_chart?')) return response({ data: { bars: [] } })
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mount(IntradayMonitorContent, { global: { stubs: { IntradayChart: true, Teleport: true } } })
    await flushPromises()
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/research-intraday-st-data/intraday_charts'))).toBe(true)
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/research-intraday-st-data/sp_1500_intraday'))).toBe(true)
    for (const endpoint of ['/research-intraday-st-data/intraday_charts', '/research-intraday-st-data/sp_1500_intraday']) {
      const request = fetchMock.mock.calls.find(([url]) => String(url).includes(endpoint))
      expect(request?.[1]).toMatchObject({ credentials: 'include', headers: { Accept: 'application/json', 'Content-Type': 'application/json' } })
    }
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/research/intraday'))).toBe(false)
    expect(wrapper.text()).toContain('Intraday Flow')
    expect(wrapper.text()).toContain('25 / 75 reference lines')
    await wrapper.findAll('[role="tab"]')[1]!.trigger('click')
    expect(wrapper.text()).toContain('Apple')
    wrapper.unmount()
  })
})

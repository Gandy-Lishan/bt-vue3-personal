import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'
import OptixHeatmapContent from '@/pages/research-workspace/OptixHeatmapContent.vue'

afterEach(() => vi.unstubAllGlobals())

it('loads the research heatmap for the selected group and moving-average window', async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ code: 200, msg: 'ok', data: {
    window: 0, windows: [0, 3, 5, 10, 20, 50, 100, 200],
    dates: ['2026-11-17', '2026-11-18'],
    assets: [
      { name: 'SPY', group: 'Major ETFs', symbol: 'etf_spy', available: true, latest: 72, change: null },
      { name: 'A very long asset name for the heatmap tile', group: 'Major ETFs', symbol: 'long_asset', available: true, latest: 53, change: null },
      { name: 'Missing', group: 'Major ETFs', symbol: 'missing', available: false, latest: null, change: null },
    ],
    values: { etf_spy: [68, 72], long_asset: [51, 53], missing: [null, null] },
  } }), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  const wrapper = mount(OptixHeatmapContent, { global: { stubs: { OptixHistoryChart: true } } })
  await flushPromises()
  expect(fetchMock.mock.calls[0]?.[0]).toBe('/dev/research/optix_heatmap?window=0')
  expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: 'include' })
  expect(wrapper.find('.hm-summary').text()).toContain('2 of 2 assets')
  expect(wrapper.find('.hm-tile span[title="A very long asset name for the heatmap tile"]').exists()).toBe(true)
  expect(wrapper.get('.hm-history-title').text()).toContain('2 sessions')
  await wrapper.find('input[type="search"]').setValue('long asset')
  expect(wrapper.find('.hm-summary').text()).toContain('1 of 2 assets')
  await wrapper.find('input[type="search"]').setValue('')
  await wrapper.findAll('.hm-group-tabs button')[2]!.trigger('click')
  await flushPromises()
  expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('/dev/research/optix_heatmap?window=0&group=Major+ETFs')
  await wrapper.findAll('.hm-window-buttons button')[2]!.trigger('click')
  await flushPromises()
  expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('/dev/research/optix_heatmap?window=5&group=Major+ETFs')
  wrapper.unmount()
})

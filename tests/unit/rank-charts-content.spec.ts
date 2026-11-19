import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import RankChartsContent from '@/pages/research-workspace/RankChartsContent.vue'

afterEach(() => vi.unstubAllGlobals())

describe('Rank Charts research API', () => {
  it('requests the selected category and metric and preserves missing readings', async () => {
    const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify({ code: 200, msg: 'ok', data: {
      category: String(url).includes('category=bonds') ? 'bonds' : 'commodities',
      metric: String(url).includes('metric=flow') ? 'flow' : 'optix',
      metrics: ['optix', 'flow'],
      items: [
        { name: 'Gold', value: 62 },
        { name: 'Bonds', value: null },
      ],
    } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mount(RankChartsContent)
    await flushPromises()
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/dev/research/rank_charts?category=commodities&metric=optix')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: 'include' })
    await wrapper.findAll('.rank-category')[2]!.trigger('click')
    await flushPromises()
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('/dev/research/rank_charts?category=bonds&metric=optix')
    expect(wrapper.findAll('#rank-metric option')).toHaveLength(2)
    await wrapper.get('#rank-metric').setValue('flow')
    await flushPromises()
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('/dev/research/rank_charts?category=bonds&metric=flow')
    expect(wrapper.get('.rank-results').text()).toContain('—')
    wrapper.unmount()
  })
})

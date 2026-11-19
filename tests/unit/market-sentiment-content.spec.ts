import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MarketSentimentContent from '@/pages/research-workspace/MarketSentimentContent.vue'

afterEach(() => vi.unstubAllGlobals())

describe('Market Sentiment research API', () => {
  it('renders market readings and the returned distribution', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ code: 200, msg: 'ok', data: {
      markets: [
        { name: 'Bonds', symbol: 'model_score_bonds', date: '2026-11-18', optix: 25, position: 1, zone: 'pessimism' },
        { name: 'Gold', symbol: 'po_gold', date: '2026-11-19', optix: 62, position: 5, zone: 'optimism' },
      ],
      distribution: { pessimism: 1, neutral: 0, optimism: 1 },
    } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mount(MarketSentimentContent)
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledWith('/dev/research/market_sentiment', expect.objectContaining({ credentials: 'include' }))
    expect(wrapper.text()).toContain('Bonds')
    expect(wrapper.text()).toContain('Gold')
    expect(wrapper.findAll('.ms-stat').map(item => item.find('strong').text())).toEqual(['2', '1', '0', '1'])
    expect(wrapper.get('.ms-spotlight').text()).toContain('25')
    expect(wrapper.get('.ms-spotlight').text()).toContain('Earlier update')
    wrapper.unmount()
  })
})

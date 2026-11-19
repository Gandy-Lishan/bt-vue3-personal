import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import GlobalBreadthContent from '@/pages/research-workspace/GlobalBreadthContent.vue'

afterEach(() => vi.unstubAllGlobals())

describe('Global Breadth research API', () => {
  it('renders the returned regions and measures without converting missing values to zero', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ code: 200, msg: 'ok', data: {
      regions: ['All Countries', 'Europe'],
      measures: [
        { measure: '% Above 50-Day Moving Average', values: { 'All Countries': 61.2, Europe: null } },
        { measure: '% Closing At A 21-Day High', values: { 'All Countries': 20, Europe: 35 } },
      ],
    } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mount(GlobalBreadthContent)
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledWith('/dev/research/global_breadth', expect.objectContaining({ credentials: 'include' }))
    expect(wrapper.text()).toContain('2 of 2 measures')
    expect(wrapper.get('table').text()).toContain('Europe')
    expect(wrapper.get('table').text()).toContain('61.2')
    expect(wrapper.get('table').text()).toContain('—')
    expect(wrapper.get('table').text()).toContain('% Closing At A 21-Day High')
    wrapper.unmount()
  })
})

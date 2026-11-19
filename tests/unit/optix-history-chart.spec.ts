import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import OptixHistoryChart from '@/pages/research-workspace/OptixHistoryChart.vue'

describe('Optix history chart', () => {
  it('labels the last API value and shows the hovered date and value', async () => {
    const wrapper = mount(OptixHistoryChart, {
      props: { name: 'EWW', points: [
        { date: '2026-11-16', close: 42.1 },
        { date: '2026-11-17', close: 48.7 },
      ] },
    })
    expect(wrapper.find('.hm-last-label').text()).toBe('Last 48.7')
    const svg = wrapper.find('svg')
    Object.defineProperty(svg.element, 'getBoundingClientRect', { value: () => ({ left: 0, width: 260 }) })
    await svg.trigger('mousemove', { clientX: 0 })
    expect(wrapper.find('.hm-tooltip').text()).toContain('2026-11-16')
    expect(wrapper.find('.hm-tooltip').text()).toContain('42.1')
    await svg.trigger('mousemove', { clientX: 260 })
    expect(wrapper.find('.hm-tooltip').text()).toContain('2026-11-17')
    expect(wrapper.find('.hm-tooltip').text()).toContain('48.7')
    await svg.trigger('mouseleave')
    expect(wrapper.find('.hm-tooltip').exists()).toBe(false)
  })
})

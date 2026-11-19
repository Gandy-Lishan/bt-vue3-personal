import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SeasonalityCalendarContent from '@/pages/research-workspace/SeasonalityCalendarContent.vue'
import readings from '@/pages/research-workspace/seasonality.fixture.json'

afterEach(() => vi.unstubAllGlobals())

describe('Seasonality Calendar static data', () => {
  it('keeps the calendar, history and data table without an API request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mount(SeasonalityCalendarContent)
    expect(wrapper.get('[data-testid="seasonality-calendar-content"]').text()).toContain('2026 seasonality calendar')
    await wrapper.findAll('[role="tab"]')[1]!.trigger('click')
    expect(wrapper.text()).toContain(`${Object.keys(readings).length} daily readings`)
    const bar = wrapper.get('svg[aria-label="2026 daily Seasonality Index chart"] rect')
    await bar.trigger('mouseenter', { clientX: 120, clientY: 80 })
    expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('Seasonality Index')
    await wrapper.findAll('[role="tab"]')[2]!.trigger('click')
    expect(wrapper.text()).toContain(`of ${Object.keys(readings).length} readings`)
    expect(fetchMock).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('keeps the original static charts in Historical charts', async () => {
    const wrapper = mount(SeasonalityCalendarContent)
    await wrapper.findAll('[role="tab"]')[4]!.trigger('click')
    expect(wrapper.findAll('[data-testid="seasonality-static-charts"] nav button')).toHaveLength(12)
    expect(wrapper.get('[data-testid="seasonality-static-charts"] img').attributes('src')).toBe('/seasonality-static/holiday_new_years.gif')
    wrapper.unmount()
  })
})

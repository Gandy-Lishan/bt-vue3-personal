import { mount, flushPromises } from '@vue/test-utils'
import Highcharts from 'highcharts/highstock'
import { afterEach, describe, expect, it, vi } from 'vitest'
import IndicatorTrendChart from '@/pages/indicators/ui/IndicatorTrendChart.vue'
import { getSeededIndicatorDetail } from '@/entities/indicator/model/indicator.fixtures'

describe('Indicator chart extreme scale', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('keeps an in-range extreme visible without expanding to the other extreme', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
    const detail = { ...getSeededIndicatorDetail('example'), id: 'example', title: 'Example', opt: 80, pess: 20 }
    const wrapper = mount(IndicatorTrendChart, { props: { detail, rows: [{ Date: '2026-11-12', value: 18 }, { Date: '2026-11-13', value: 30 }] } })
    await flushPromises()
    const axis = Highcharts.charts.filter(Boolean).at(-1)!.yAxis[0]
    const range = axis.getExtremes()
    expect(range.min).toBeLessThan(20)
    expect(range.max).toBeGreaterThan(20)
    expect(range.max).toBeLessThan(80)
    expect(axis.options.plotLines?.map(line => line.value)).toEqual(expect.arrayContaining([20, 80]))
    wrapper.unmount()
  })

  it.each(['regular', 'intraday'])('keeps %s data scale until Show Extremes and restores it', async (kind) => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
    const intraday = kind === 'intraday'
    const detail = {
      ...getSeededIndicatorDetail('example'), id: intraday ? 'intraday:intraday:ASO' : 'example',
      title: intraday ? 'ASO' : 'Example', marketSymbol: intraday ? 'ASO' : undefined,
      sourceList: intraday ? 'intraday' : 'stock_complete_list', type: intraday ? 'intraday' : 'Indicator',
      opt: 80, pess: 20,
    }
    const rows = intraday
      ? [{ date: 1794564300000, price: 100, optix: 45 }, { date: 1794564600000, price: 101, optix: 55 }]
      : [{ Date: '2026-11-12', value: 45 }, { Date: '2026-11-13', value: 55 }]
    const wrapper = mount(IndicatorTrendChart, { props: { detail, rows } })
    await flushPromises()
    const chart = Highcharts.charts.filter(Boolean).at(-1)!
    const axis = chart.yAxis[intraday ? 1 : 0]
    const natural = axis.getExtremes()
    expect(natural.min).toBeGreaterThan(20)
    expect(natural.max).toBeLessThan(80)
    await wrapper.findAll('button').find(button => button.text() === 'Show Extremes')!.trigger('click')
    await flushPromises()
    const expanded = axis.getExtremes()
    expect(expanded.min).toBeLessThanOrEqual(20)
    expect(expanded.max).toBeGreaterThanOrEqual(80)
    await wrapper.findAll('button').find(button => button.text() === 'Hide Extremes')!.trigger('click')
    await flushPromises()
    const restored = axis.getExtremes()
    expect(restored.min).toBeCloseTo(natural.min)
    expect(restored.max).toBeCloseTo(natural.max)
    wrapper.unmount()
  })
})

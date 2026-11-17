import { flushPromises, mount } from '@vue/test-utils'
import Highcharts from 'highcharts/highstock'
import { afterEach, describe, expect, it, vi } from 'vitest'
import IndicatorTrendChart from '@/pages/indicators/ui/IndicatorTrendChart.vue'
import { getSeededIndicatorDetail } from '@/entities/indicator/model/indicator.fixtures'

describe('Intraday chart toolbar', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses the shared chart toolbar with View Daily before Hide Extremes', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
    const detail = {
      ...getSeededIndicatorDetail('example'), id: 'intraday:intraday:ASO', title: 'ASO',
      marketSymbol: 'ASO', sourceList: 'intraday', type: 'intraday',
    }
    const wrapper = mount(IndicatorTrendChart, { props: { detail, rows: [], loading: true } })
    const actions = wrapper.findAll('button').map(button => button.text())
    expect(actions.indexOf('View Daily ASO Optix')).toBeGreaterThan(-1)
    expect(actions.indexOf('View Daily ASO Optix')).toBeLessThan(actions.indexOf('Show Extremes'))
    expect(actions).toContain('1D')
    expect(actions).toContain('5D')
    expect(actions).not.toContain('Legacy Indicator Chart')
    expect(actions).not.toContain('Backtest')
    wrapper.unmount()
  })

  it('applies a selected date range to the intraday x-axis', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
    const detail = {
      ...getSeededIndicatorDetail('example'), id: 'intraday:intraday:ASO', title: 'ASO',
      marketSymbol: 'ASO', sourceList: 'intraday', type: 'intraday',
    }
    const base = Date.UTC(2026, 10, 13, 10)
    const rows = [0, 1, 2, 3].map((hour) => ({ date: base + hour * 3600000, price: 100 + hour, optix: 45 + hour }))
    const wrapper = mount(IndicatorTrendChart, { props: { detail, rows } })
    await flushPromises()
    await wrapper.find('[aria-label="Select chart date range"]').trigger('click')
    const inputs = wrapper.findAll('input[type="datetime-local"]')
    await inputs[0].setValue('2026-11-13T11:00')
    await inputs[1].setValue('2026-11-13T12:00')
    await wrapper.find('form.chart-date-picker').trigger('submit')
    const axis = Highcharts.charts.filter(Boolean).at(-1)!.xAxis[0]
    expect(axis.getExtremes().min).toBe(base + 3600000)
    expect(axis.getExtremes().max).toBe(base + 7200000)
    await wrapper.setProps({ rows: [...rows, { date: base + 4 * 3600000, price: 104, optix: 49 }] })
    await flushPromises()
    const refreshedAxis = Highcharts.charts.filter(Boolean).at(-1)!.xAxis[0]
    expect(refreshedAxis.getExtremes().min).toBe(base + 3600000)
    expect(refreshedAxis.getExtremes().max).toBe(base + 7200000)
    wrapper.unmount()
  })
})

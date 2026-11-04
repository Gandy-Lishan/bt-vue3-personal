import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { fetchResearchPage } from '@/pages/research-workspace/research.api'
import { pagesForGroup, researchPages } from '@/pages/research-workspace/research.catalog'
import RiskOnOffContent from '@/pages/research-workspace/RiskOnOffContent.vue'

describe('research workspace', () => {
  it('defines the requested 14 pages in the three navigation groups', () => {
    expect(researchPages).toHaveLength(14)
    expect(pagesForGroup('spotlights')).toHaveLength(8)
    expect(pagesForGroup('intraday')).toHaveLength(1)
    expect(pagesForGroup('market-analytics')).toHaveLength(5)
  })

  it('gives every page an independent loadable data contract', async () => {
    for (const page of researchPages) {
      const data = await fetchResearchPage(page.slug)
      expect(data.metrics.length).toBeGreaterThan(0)
      expect(data.series.length).toBeGreaterThan(0)
      expect(data.tables[0]?.rows.length).toBeGreaterThan(0)
    }
  })

  it('preserves the complete Risk On/Off composite contract', async () => {
    const data = await fetchResearchPage('risk-on-off')
    expect(data.series).toHaveLength(21)
    expect(data.metrics.map((metric) => metric.label)).toEqual([
      'Current regime',
      'Risk Measure',
      'Change in Risk Measure',
      'Hold range',
    ])
    expect(data.tables[0]?.columns).toEqual([
      'Component',
      'Current state',
      'Daily state history',
      'Sessions in Current State',
    ])
    expect(data.riskChart?.dates.at(-1)).toBe('2026-10-27')
    expect(data.riskChart?.price.at(-1)).toBe(7667)
    expect(data.riskChart?.measure.at(-1)).toBeCloseTo(66.6667, 3)
    expect(data.riskChart?.price).toHaveLength(126)
  })

  it('sorts the Risk On/Off component table', async () => {
    const data = await fetchResearchPage('risk-on-off')
    const wrapper = mount(RiskOnOffContent, { props: { data } })
    const componentSort = wrapper.findAll('thead button').find((button) => button.text().includes('Component'))
    expect(componentSort).toBeDefined()
    await componentSort!.trigger('click')
    expect(wrapper.find('tbody tr td').text()).toContain('VIX Term Structure')
  })
})

import { describe, expect, it } from 'vitest'
import { normalizeIndicatorRows } from '@/entities/indicator/model/indicator.adapter'
import { displayIndicatorGroup, displayIndicatorValue } from '@/entities/indicator/model/indicator.values'

describe('indicator display values', () => {
  it('title-cases normalized group columns for display', () => {
    const [indicator] = normalizeIndicatorRows(
      [
        {
          url: 'sample_indicator',
          chart_name: 'Sample Indicator',
          sub_type: 'Stock Market',
        },
      ],
      'stock_complete_list',
    )

    expect(displayIndicatorValue(indicator, { key: 'sub_type', label: 'Group', kind: 'text' })).toBe(
      'Stock Market',
    )
    expect(indicator.raw?.sub_type).toBe('Stock Market')
  })

  it('adds a percent suffix to last change values marked as percentages', () => {
    const [indicator] = normalizeIndicatorRows(
      [
        {
          url: 'sample_indicator',
          chart_name: 'Sample Indicator',
          last_change: '-0.4',
          last_change_type: 'percent',
        },
      ],
      'stock_complete_list',
    )

    expect(displayIndicatorValue(indicator, { key: 'last_change', label: 'Change', kind: 'change' })).toBe('-0.40%')
  })

  it('keeps non-percent last change values unitless', () => {
    const [indicator] = normalizeIndicatorRows(
      [
        {
          url: 'sample_indicator',
          chart_name: 'Sample Indicator',
          last_change: '-0.4',
        },
      ],
      'stock_complete_list',
    )

    expect(displayIndicatorValue(indicator, { key: 'last_change', label: 'Change', kind: 'change' })).toBe('-0.40')
  })

  it('displays time frames without a trailing term suffix', () => {
    const [indicator] = normalizeIndicatorRows(
      [
        {
          url: 'sample_indicator',
          chart_name: 'Sample Indicator',
          timeframe: 'Medium-Term',
        },
      ],
      'stock_complete_list',
    )

    expect(displayIndicatorValue(indicator, { key: 'timeframe', label: 'Time Frame', kind: 'text' })).toBe('Medium')
  })

  it('uses the active group column when displaying card group text', () => {
    const [indicator] = normalizeIndicatorRows(
      [
        {
          url: 'sample_indicator',
          chart_name: 'Sample Indicator',
          groups: 'Stock Market',
          sub_type: 'model',
        },
      ],
      'stock_complete_list',
    )

    expect(displayIndicatorGroup(indicator, [{ key: 'sub_type', label: 'Group', kind: 'text' }])).toBe('Model')
  })

  it('uses groups instead of sub type when that is the active group column', () => {
    const [indicator] = normalizeIndicatorRows(
      [
        {
          url: 'sample_indicator',
          chart_name: 'Sample Indicator',
          groups: 'ETF sector',
          sub_type: 'ignored',
        },
      ],
      'etf_seasonality',
    )

    expect(displayIndicatorGroup(indicator, [{ key: 'groups', label: 'Groups', kind: 'text' }])).toBe('ETF Sector')
  })

  it('falls back to title-cased type when a list has no group column', () => {
    const [indicator] = normalizeIndicatorRows(
      [
        {
          url: 'sample_indicator',
          chart_name: 'Sample Indicator',
          type: 'stocks',
          groups: 'Stock Market',
        },
      ],
      'ndx_100_complete_list',
    )

    expect(displayIndicatorGroup(indicator, [{ key: 'url', label: 'Symbol', kind: 'text' }])).toBe('Stocks')
  })
})

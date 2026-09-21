import { describe, expect, it } from 'vitest'
import { normalizeIndicatorRows } from '@/entities/indicator/model/indicator.adapter'
import { historicalVolatilityColumns } from '@/entities/indicator/model/indicator.historical-volatility'
import { getIndicatorTableMeta } from '@/entities/indicator/model/indicator.table'
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

  it('formats percent numeric columns without trailing zero decimals for integers', () => {
    const [indicator] = normalizeIndicatorRows(
      [
        {
          url: 'sample_indicator',
          chart_name: 'Sample Indicator',
          volatility_20d: '12',
        },
      ],
      'historical_spx',
    )

    expect(
      displayIndicatorValue(indicator, {
        key: 'volatility_20d',
        label: 'Volatility 20d',
        kind: 'number',
        valueSuffix: '%',
      }),
    ).toBe('12%')
  })

  it('trims historical volatility trailing zeroes without rounding to integers', () => {
    const [indicator] = normalizeIndicatorRows(
      [
        {
          url: 'sample_indicator',
          chart_name: 'Sample Indicator',
          volatility_20d: '12.60',
        },
      ],
      'historical_spx',
    )
    const volatility20dColumn = historicalVolatilityColumns({
      id: 'HistoricalSP500Score',
      label: 'S&P 500',
      source: 'historical_spx',
      includeSector: true,
    }).find((column) => column.key === 'volatility_20d')

    expect(displayIndicatorValue(indicator, volatility20dColumn!)).toBe('12.6%')
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

  it('shows date-only values for Most Popular ISO timestamps', () => {
    const [indicator] = normalizeIndicatorRows(
      [
        {
          url: 'sample_indicator',
          chart_name: 'Sample Indicator',
          last_update: '2026-09-17T00:00:00.000',
        },
      ],
      'most_popular',
    )
    const dateColumn = getIndicatorTableMeta('most_popular').columns.find((column) => column.key === 'last_update')

    expect(displayIndicatorValue(indicator, dateColumn!)).toBe('2026-09-17')
  })

  it('keeps raw dates verbatim unless the column asks for date-only display', () => {
    const [indicator] = normalizeIndicatorRows(
      [
        {
          url: 'sample_indicator',
          chart_name: 'Sample Indicator',
          last_update: '2026-09-17T00:00:00.000',
        },
      ],
      'stock_complete_list',
    )
    const dateColumn = getIndicatorTableMeta('stock_complete_list').columns.find((column) => column.key === 'last_update')

    expect(displayIndicatorValue(indicator, dateColumn!)).toBe('2026-09-17T00:00:00.000')
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

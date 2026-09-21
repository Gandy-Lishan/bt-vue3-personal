import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { normalizeIndicatorRows } from '@/entities/indicator/model/indicator.adapter'
import { getIndicatorTableMeta } from '@/entities/indicator/model/indicator.table'
import IndicatorCardGrid from '@/pages/indicators/ui/IndicatorCardGrid.vue'

describe('IndicatorCardGrid', () => {
  it('uses Most Popular date-only formatting in card view', () => {
    const [indicator] = normalizeIndicatorRows(
      [
        {
          url: 'sample_indicator',
          chart_name: 'Sample Indicator',
          groups: 'Stock Market',
          sub_type: 'Stock Market',
          timeframe: 'Daily',
          last_value: 10,
          last_change: 1,
          last_update: '2026-09-17T00:00:00.000',
          sentiment: 4,
        },
      ],
      'most_popular',
    )

    const wrapper = mount(IndicatorCardGrid, {
      props: {
        indicators: [indicator],
        columns: getIndicatorTableMeta('most_popular').columns,
      },
    })

    expect(wrapper.text()).toContain('Updated 2026-09-17')
    expect(wrapper.text()).not.toContain('2026-09-17T00:00:00.000')
  })

  it('does not render the card more-actions button', () => {
    const [indicator] = normalizeIndicatorRows(
      [
        {
          url: 'sample_indicator',
          chart_name: 'Sample Indicator',
          groups: 'Stock Market',
          sub_type: 'Stock Market',
          timeframe: 'Daily',
          last_value: 10,
          last_change: 1,
          last_update: '2026-09-17',
          sentiment: 4,
        },
      ],
      'stock_complete_list',
    )

    const wrapper = mount(IndicatorCardGrid, {
      props: {
        indicators: [indicator],
        columns: getIndicatorTableMeta('stock_complete_list').columns,
      },
    })

    expect(wrapper.find('[aria-label="More indicator actions"]').exists()).toBe(false)
  })

  it('renders asset cards with ticker, name-sector subtitle, and integer metrics', () => {
    const [indicator] = normalizeIndicatorRows(
      [
        {
          url: 'AAPL_trend_reltrend',
          chart_name: 'Apple Inc.',
          market_symbol: 'AAPL',
          sector_name: 'Technology',
          trend_last_value: '8.0',
          reltrend_last_value: '6.4',
          last_update: '2026-09-17',
          sentiment: 4,
        },
      ],
      'spx',
    )

    const wrapper = mount(IndicatorCardGrid, {
      props: {
        indicators: [indicator],
        columns: [
          { key: 'market_symbol', label: 'Ticker', kind: 'name', uppercase: true },
          { key: 'chart_name', label: 'Name', kind: 'text' },
          { key: 'sector_name', label: 'Sector', kind: 'text' },
        ],
        showFavorite: false,
        primaryMetricColumn: { key: 'trend_last_value', label: 'Trend Score', kind: 'number', decimals: 0 },
        primaryMetricLabel: 'Trend Score',
        secondaryMetricColumn: { key: 'reltrend_last_value', label: 'Relative Score', kind: 'number', decimals: 0 },
        secondaryMetricLabel: 'Relative Score',
        titleColumn: { key: 'market_symbol', label: 'Ticker', kind: 'name', uppercase: true },
        subtitleColumns: [
          { key: 'chart_name', label: 'Name', kind: 'text' },
          { key: 'sector_name', label: 'Sector', kind: 'text' },
        ],
        showSentiment: false,
        showUpdated: false,
      },
    })

    expect(wrapper.text()).toContain('AAPL')
    expect(wrapper.text()).toMatch(/Apple Inc\.\s*\|\s*Technology/)
    expect(wrapper.text()).toMatch(/Trend Score\s*8/)
    expect(wrapper.text()).toMatch(/Relative Score\s*6/)
    expect(wrapper.text()).not.toContain('8.00')
    expect(wrapper.text()).not.toContain('6.40')
    expect(wrapper.text()).not.toContain('Neutral')
    expect(wrapper.text()).not.toContain('Updated')
  })

  it('renders a footer metric instead of sentiment and updated metadata', () => {
    const [indicator] = normalizeIndicatorRows(
      [
        {
          url: 'AAPL_volatility',
          chart_name: 'Apple Inc.',
          market_symbol: 'AAPL',
          sector_name: 'Technology',
          volatility_20d: '12.60',
          volatility_60d: '18.00',
          volatility_diff: '-5.40',
          last_update: '2026-09-18',
          sentiment: 4,
        },
      ],
      'historical_spx',
    )

    const wrapper = mount(IndicatorCardGrid, {
      props: {
        indicators: [indicator],
        columns: [
          { key: 'market_symbol', label: 'Ticker', kind: 'name', uppercase: true },
          { key: 'chart_name', label: 'Name', kind: 'text' },
          { key: 'sector_name', label: 'Sector', kind: 'text' },
        ],
        showFavorite: false,
        primaryMetricColumn: { key: 'volatility_20d', label: 'Volatility 20d', kind: 'number', trimTrailingZeros: true, valueSuffix: '%' },
        primaryMetricLabel: 'Volatility 20d',
        secondaryMetricColumn: { key: 'volatility_60d', label: 'Volatility 60d', kind: 'number', trimTrailingZeros: true, valueSuffix: '%' },
        secondaryMetricLabel: 'Volatility 60d',
        footerMetricColumn: {
          key: 'volatility_diff',
          label: 'Volatility Diff',
          kind: 'change',
          trimTrailingZeros: true,
          valueSuffix: '%',
          showChangeArrow: true,
        },
        showUpdated: false,
      },
    })

    expect(wrapper.text()).toMatch(/Volatility 20d\s*12.6%/)
    expect(wrapper.text()).toMatch(/Volatility 60d\s*18%/)
    expect(wrapper.text()).toMatch(/Volatility Diff\s*5.4%/)
    expect(wrapper.text()).not.toContain('-5.4%')
    expect(wrapper.text()).not.toContain('Neutral')
    expect(wrapper.text()).not.toContain('Updated')
  })
})

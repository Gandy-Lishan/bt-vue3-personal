import { describe, expect, it } from 'vitest'
import { normalizeIndicatorDetail, normalizeIndicatorRows } from '@/entities/indicator/model/indicator.adapter'
import { getSeededIndicatorDetail } from '@/entities/indicator/model/indicator.fixtures'

describe('indicator adapter', () => {
  it('normalizes legacy indicator rows into page models', () => {
    const [indicator] = normalizeIndicatorRows(
      [
        {
          url: 'sample_indicator',
          chart_name: 'Sample Indicator',
          groups: 'Stock Market',
          sub_type: 'Stock Market',
          timeframe: 'Medium-Term',
          last_value: '12.40',
          last_change: '-0.40',
          last_update: '2026-09-08',
          sentiment: 3,
          favorite: true,
        },
      ],
      'stock_complete_list',
    )

    expect(indicator).toMatchObject({
      id: 'sample_indicator',
      name: 'Sample Indicator',
      timeFrame: 'Medium',
      currentValue: 12.4,
      change: -0.4,
      sentiment: 'pessimistic',
      sentimentScore: 3,
      favorite: true,
      sourceList: 'stock_complete_list',
      trend: [],
    })
  })

  it('keeps the 1-7 sentiment scale from the API', () => {
    const [extremePessimistic, neutral, extremeOptimistic] = normalizeIndicatorRows(
      [
        { url: 'score_1', chart_name: 'Score 1', sentiment: 1 },
        { url: 'score_4', chart_name: 'Score 4', sentiment: 4 },
        { url: 'score_7', chart_name: 'Score 7', sentiment: 7 },
      ],
      'stock_complete_list',
    )

    expect(extremePessimistic).toMatchObject({ sentiment: 'pessimistic', sentimentScore: 1 })
    expect(neutral).toMatchObject({ sentiment: 'neutral', sentimentScore: 4 })
    expect(extremeOptimistic).toMatchObject({ sentiment: 'optimistic', sentimentScore: 7 })
  })

  it('normalizes spotlight rows that use chart ids and titles', () => {
    const [indicator] = normalizeIndicatorRows(
      [
        {
          chart_id: 'spotlight_1',
          title: 'Spotlight Indicator',
        },
      ],
      'sector_spotlight',
    )

    expect(indicator).toMatchObject({
      id: 'spotlight_1',
      name: 'Spotlight Indicator',
      sourceList: 'sector_spotlight',
    })
    expect(indicator.raw?.loading).toBe(false)
  })

  it('collapses country breadth overview rows into country columns', () => {
    const [indicator] = normalizeIndicatorRows(
      [
        {
          url: 'all_url',
          type_url: 'chart_type_url',
          chart_name: 'Global Breadth',
          country: 'All Countries',
          last_value: '52.3',
        },
        {
          url: 'developed_url',
          type_url: 'chart_type_url',
          chart_name: 'Global Breadth',
          country: 'Developed Markets',
          last_value: '61.7',
        },
      ],
      'country_breadth_overview',
    )

    expect(indicator).toMatchObject({
      id: 'chart_type_url',
      name: 'Global Breadth',
    })
    expect(indicator.raw?.['All Countries']).toBe('52.3')
    expect(indicator.raw?.['Developed Markets_url']).toBe('developed_url')
  })
})

describe('indicator detail adapter', () => {
  const fallback = getSeededIndicatorDetail('sample_indicator')

  it('carries an array payload through to the detail model', () => {
    const detail = normalizeIndicatorDetail(
      {
        url: 'sample_indicator',
        constituent_conditions: [{ Symbol: 'AAPL', Close: 10.5, Date: '2026-09-15T00:00:00' }],
      },
      fallback,
    )

    expect(detail.constituentConditions).toHaveLength(1)
    expect(detail.constituentConditions[0]).toEqual({ Symbol: 'AAPL', Close: 10.5, Date: '2026-09-15T00:00:00' })
  })

  it('parses a JSON string payload', () => {
    const detail = normalizeIndicatorDetail(
      {
        url: 'sample_indicator',
        constituent_conditions: '[{"Symbol":"MSFT","Close":20,"Date":"2026-09-15T00:00:00"}]',
      },
      fallback,
    )

    expect(detail.constituentConditions).toHaveLength(1)
    expect(detail.constituentConditions[0].Symbol).toBe('MSFT')
  })

  it('resolves to an empty list when the field is missing or unusable', () => {
    expect(normalizeIndicatorDetail({ url: 'sample_indicator' }, fallback).constituentConditions).toEqual([])
    expect(normalizeIndicatorDetail({ url: 'sample_indicator', constituent_conditions: [] }, fallback).constituentConditions).toEqual([])
    expect(normalizeIndicatorDetail({ url: 'sample_indicator', constituent_conditions: '[]' }, fallback).constituentConditions).toEqual([])
    expect(normalizeIndicatorDetail({ url: 'sample_indicator', constituent_conditions: 'oops' }, fallback).constituentConditions).toEqual([])
  })
})

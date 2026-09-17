import { describe, expect, it } from 'vitest'
import {
  indicatorFromRelatedChart,
  isDetailForChart,
  mergeRelatedChartRows,
  unresolvedRelatedChartRow,
} from '@/entities/indicator/model/indicator.related'
import { displayIndicatorValue, formatIndicatorNumber, indicatorSortValue } from '@/entities/indicator/model/indicator.values'
import { getIndicatorTableMeta, relatedChartColumns } from '@/entities/indicator/model/indicator.table'
import type { Indicator, IndicatorDetail, IndicatorRelatedChart } from '@/entities/indicator/model/indicator.types'

function chart(overrides: Partial<IndicatorRelatedChart> = {}): IndicatorRelatedChart {
  return { title: 'Related Breadth Chart', url: 'related_breadth_chart', type: 'Indicator', ...overrides }
}

function detail(overrides: Partial<IndicatorDetail> = {}): IndicatorDetail {
  return {
    id: 'related_breadth_chart',
    title: 'Related Breadth Chart',
    group: 'Breadth',
    timeFrame: 'Short-Term',
    updateSchedule: 'Daily',
    source: 'SentimenTrader',
    currentValue: 62.5,
    change: -1.25,
    updatedAt: '2026-09-01',
    sentiment: 'optimistic',
    sentimentScore: 6,
    description: '',
    interpretation: '',
    construction: '',
    constructionHtml: '',
    currentReading: '',
    related: [],
    relatedCharts: [],
    research: [],
    blogResults: [],
    thresholdRows: [],
    returnSegments: [],
    showReturns: false,
    trend: [],
    benchmarkTrend: [],
    type: 'Indicator',
    ...overrides,
  }
}

function columnRow(indicator: Indicator, key: string) {
  const column = relatedChartColumns.find((item) => item.key === key)
  if (!column) throw new Error(`No related column for ${key}`)
  return displayIndicatorValue(indicator, column)
}

describe('indicator related helpers', () => {
  it('builds a fully populated row from a matching detail', () => {
    const row = indicatorFromRelatedChart(chart(), detail())

    expect(columnRow(row, 'chart_name')).toBe('Related Breadth Chart')
    expect(columnRow(row, 'sub_type')).toBe('Breadth')
    expect(columnRow(row, 'timeframe')).toBe('Short')
    expect(columnRow(row, 'last_value')).toBe('62.50')
    expect(columnRow(row, 'last_change')).toBe('-1.25')
    // Related charts show the backend date verbatim, unlike the list page's Date column.
    expect(columnRow(row, 'last_update')).toBe('2026-09-01')
    expect(row.sentimentScore).toBe(6)
  })

  it('keeps the percent suffix when the detail reports a percent change', () => {
    const row = indicatorFromRelatedChart(chart(), detail({ raw: { last_change_type: 'percent' } }))

    expect(columnRow(row, 'last_change')).toBe('-1.25%')
  })

  it('renders dashes and a neutral meter when the related chart has no data', () => {
    const row = unresolvedRelatedChartRow(chart())

    expect(columnRow(row, 'chart_name')).toBe('Related Breadth Chart')
    expect(columnRow(row, 'last_value')).toBe('—')
    expect(columnRow(row, 'last_change')).toBe('—')
    expect(columnRow(row, 'last_update')).toBe('—')
    // 0 would clamp up to 1 and read as "Extremely Pessimistic".
    expect(row.sentimentScore).toBe(4)
    expect(formatIndicatorNumber(row.currentValue)).toBe('—')
  })

  it('rejects a detail that belongs to a different indicator', () => {
    const target = chart()

    expect(isDetailForChart(target, detail())).toBe(true)
    expect(isDetailForChart(target, detail({ id: 'some_other_chart' }))).toBe(false)
    expect(isDetailForChart(target, detail({ id: '' }))).toBe(false)
    expect(isDetailForChart(target, detail({ id: 'RELATED_BREADTH_CHART' }))).toBe(true)
  })

  it('prefers an indicator the store already holds', () => {
    const held: Indicator = { ...unresolvedRelatedChartRow(chart()), currentValue: 12 }
    const lookup = (id: string) => (id === 'related_breadth_chart' ? held : undefined)

    const { rows, pending } = mergeRelatedChartRows([chart()], lookup)

    expect(rows).toEqual([held])
    expect(pending).toEqual([])
  })

  it('queues charts missing from the store for a detail fetch', () => {
    const { rows, pending } = mergeRelatedChartRows([chart(), chart({ url: 'other', title: 'Other' })], () => undefined)

    expect(rows).toEqual([])
    expect(pending.map((item) => item.url)).toEqual(['related_breadth_chart', 'other'])
  })

  it('drops the current indicator and duplicate urls', () => {
    const charts = [
      chart({ url: 'current_indicator' }),
      chart(),
      chart({ url: 'RELATED_BREADTH_CHART', title: 'Duplicate' }),
    ]

    const { pending } = mergeRelatedChartRows(charts, () => undefined, 'current_indicator')

    expect(pending.map((item) => item.url)).toEqual(['related_breadth_chart'])
  })

  it('shows the backend date verbatim while still sorting chronologically', () => {
    const column = relatedChartColumns.find((item) => item.key === 'last_update')
    expect(column?.rawDate).toBe(true)

    const rows = [
      indicatorFromRelatedChart(chart({ url: 'a' }), detail({ id: 'a', updatedAt: '2026-09-15' })),
      indicatorFromRelatedChart(chart({ url: 'b' }), detail({ id: 'b', updatedAt: '2025-01-02' })),
      indicatorFromRelatedChart(chart({ url: 'c' }), detail({ id: 'c', updatedAt: '2026-10-01' })),
    ]

    // Displayed raw...
    expect(rows.map((row) => displayIndicatorValue(row, column!))).toEqual(['2026-09-15', '2025-01-02', '2026-10-01'])

    // ...but ordered as dates, not as strings.
    const sorted = [...rows].sort(
      (left, right) =>
        Number(indicatorSortValue(left, 'last_update', 'date')) - Number(indicatorSortValue(right, 'last_update', 'date')),
    )

    expect(sorted.map((row) => row.updatedAt)).toEqual(['2025-01-02', '2026-09-15', '2026-10-01'])
  })

  it('keeps the related column set aligned with the default list columns', () => {
    const defaultKeys = getIndicatorTableMeta('stock_complete_list').columns.map((column) => column.key)
    const relatedKeys = relatedChartColumns.map((column) => column.key)

    expect(relatedKeys).toEqual(defaultKeys.filter((key) => key !== 'trend'))
    expect(relatedKeys).toEqual([
      'chart_name',
      'sub_type',
      'timeframe',
      'last_value',
      'last_change',
      'last_update',
      'sentiment',
    ])
  })
})

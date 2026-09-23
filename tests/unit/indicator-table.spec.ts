import { describe, expect, it } from 'vitest'
import { indicatorGroups } from '@/entities/indicator/model/indicator.catalog'
import {
  getIndicatorTableMeta,
  researchPostColumns,
} from '@/entities/indicator/model/indicator.table'

function columnKeys(source: string) {
  return getIndicatorTableMeta(source).columns.map((column) => column.key)
}

function groupColumnKey(source: string) {
  return getIndicatorTableMeta(source).columns.find((column) =>
    ['group', 'groups', 'sub type'].includes(column.label.toLowerCase()),
  )?.key
}

describe('indicator table metadata', () => {
  it('groups stock market sentiment lists separately from stock market and ETF lists', () => {
    const stockSentiment = indicatorGroups.find((group) => group.id === 'stock-sentiment')
    const stockMarket = indicatorGroups.find((group) => group.id === 'stock')
    const etf = indicatorGroups.find((group) => group.id === 'etf')

    expect(stockSentiment?.label).toBe('Stock Market Sentiment Indicators')
    expect(stockSentiment?.subgroups.map((subgroup) => subgroup.label)).toEqual([
      'NASDAQ 100',
      'S&P 1500',
      'Russell 1000',
      'Russell 2000',
      'Russell 3000',
      'Crypto Optix',
      'Most Active ETF Sentiment',
    ])
    expect(stockMarket?.subgroups.map((subgroup) => subgroup.label)).toEqual(['Stock Market'])
    expect(etf?.subgroups.map((subgroup) => subgroup.label)).not.toContain('Most Active ETF Sentiment')
  })

  it('uses legacy breadth group fields by source', () => {
    expect(columnKeys('etf_breadth')).toContain('underlying_name')
    expect(columnKeys('etf_breadth')).not.toContain('sub_type')

    expect(columnKeys('country_breadth')).toContain('sub_type')
    expect(columnKeys('country_breadth')).not.toContain('underlying_name')

    expect(columnKeys('crypto_breadth')).toContain('sub_type')
    expect(columnKeys('crypto_breadth')).not.toContain('underlying_name')
  })

  it('uses legacy seasonality group fields by source', () => {
    expect(groupColumnKey('commod_seasonality')).toBe('sub_type')
    expect(groupColumnKey('bond_seasonality')).toBe('sub_type')
    expect(groupColumnKey('etf_seasonality')).toBe('groups')
  })
})

describe('indicator date columns', () => {
  const catalogSources = indicatorGroups.flatMap((group) => group.subgroups.map((subgroup) => subgroup.source))
  const allSources = Array.from(new Set([...catalogSources, 'most_popular']))

  it('shows the backend value verbatim in every indicator list', () => {
    // Every list on the Indicators page — Stock Market, NASDAQ 100, the seasonality and
    // COT tables alike — shows dates exactly as the API returns them.
    const unformatted = allSources.flatMap((source) =>
      getIndicatorTableMeta(source)
        .columns.filter((column) => column.kind === 'date' && !column.rawDate)
        .map((column) => `${source}/${column.key}`),
    )

    expect(unformatted).toEqual([])
  })

  it('covers every list, not just the default columns', () => {
    const sourcesWithDates = allSources.filter((source) =>
      getIndicatorTableMeta(source).columns.some((column) => column.kind === 'date'),
    )

    // Guards the assertion above from passing vacuously if the sources change.
    expect(sourcesWithDates.length).toBeGreaterThan(8)
  })

  it('keeps Date Published formatted on research posts', () => {
    // The one deliberate exception: it opts into the "July 16, 2026" format.
    const dateColumn = researchPostColumns.find((column) => column.kind === 'date')

    expect(dateColumn?.key).toBe('date')
    expect(dateColumn?.rawDate).toBeUndefined()
  })
})

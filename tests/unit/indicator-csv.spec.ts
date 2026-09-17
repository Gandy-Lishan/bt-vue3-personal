import { describe, expect, it } from 'vitest'
import { indicatorCsvFilename, indicatorCsvTable, indicatorCsvValue } from '@/entities/indicator/model/indicator.csv'
import { getIndicatorTableMeta } from '@/entities/indicator/model/indicator.table'
import { toCsv } from '@/shared/utils/csv'
import type { Indicator } from '@/entities/indicator/model/indicator.types'

const columns = getIndicatorTableMeta('stock_complete_list').columns

function indicator(overrides: Partial<Indicator> = {}): Indicator {
  return {
    id: 'spx_bullish_percent',
    name: 'S&P 500 Bullish Percent Index',
    group: 'Breadth',
    groupId: 'stock',
    subgroup: 'market breadth',
    sourceList: 'stock_complete_list',
    timeFrame: 'Short',
    currentValue: 62.5,
    change: -1.25,
    updatedAt: '2026-09-15',
    sentiment: 'optimistic',
    sentimentScore: 6,
    trend: [1, 2, 3],
    favorite: false,
    type: 'Indicator',
    raw: { last_change_type: 'percent' },
    ...overrides,
  }
}

describe('indicator csv table', () => {
  it('uses the visible column labels as headers', () => {
    const { headers } = indicatorCsvTable([indicator()], columns)

    expect(headers).toEqual(['Indicator Name', 'Group', 'Time Frame', 'Value', 'Change', 'Date', 'Sentiment'])
  })

  it('leaves the sparkline column out of the export', () => {
    const { headers } = indicatorCsvTable([indicator()], columns)

    expect(headers).not.toContain('Trend (30D)')
  })

  it('exports the values the table renders', () => {
    const { rows } = indicatorCsvTable([indicator()], columns)

    expect(rows[0]).toEqual([
      'S&P 500 Bullish Percent Index',
      'Market Breadth',
      'Short',
      '62.50',
      '-1.25%',
      // The list's Date column shows the backend value verbatim, so the CSV matches.
      '2026-09-15',
      6,
    ])
  })

  it('exports the sentiment score rather than a meter', () => {
    expect(indicatorCsvValue(indicator(), columns.find((column) => column.kind === 'sentiment')!)).toBe(6)
  })

  it('produces one row per indicator', () => {
    const { rows } = indicatorCsvTable([indicator(), indicator({ id: 'b', name: 'Bravo' })], columns)

    expect(rows).toHaveLength(2)
    expect(rows[1][0]).toBe('Bravo')
  })

  it('renders an em dash for values the row does not have', () => {
    const { rows } = indicatorCsvTable([indicator({ currentValue: Number.NaN, change: Number.NaN })], columns)

    expect(rows[0][3]).toBe('—')
    expect(rows[0][4]).toBe('—')
  })

  it('writes through toCsv without breaking the column count on a comma in a name', () => {
    const rows = [indicator({ name: 'S&P 500, Total' })]
    const { headers, rows: csvRows } = indicatorCsvTable(rows, columns)
    const csv = toCsv(headers, csvRows)

    expect(csv).toContain('"S&P 500, Total"')
    expect(csv.split('\r\n')[1]).toContain('"S&P 500, Total"')
  })

  it('has no rows for an empty list', () => {
    expect(indicatorCsvTable([], columns).rows).toEqual([])
  })
})

describe('indicator csv filename', () => {
  it('slugs the list name and stamps the date', () => {
    expect(indicatorCsvFilename('Most Popular Indicators', '2026-09-17')).toBe(
      'most-popular-indicators-2026-09-17.csv',
    )
  })

  it('collapses punctuation and separators', () => {
    expect(indicatorCsvFilename('S&P 1500 / Optix', '2026-09-17')).toBe('s-p-1500-optix-2026-09-17.csv')
  })

  it('falls back to a generic name when the label has nothing usable', () => {
    expect(indicatorCsvFilename('   ', '2026-09-17')).toBe('indicators-2026-09-17.csv')
  })
})

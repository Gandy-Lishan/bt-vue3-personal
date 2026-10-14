import { describe, expect, it } from 'vitest'
import { seasonalityCsvFilename, seasonalityCsvTable } from '@/entities/seasonality/model/table-csv'
import { toCsv } from '@/shared/utils/csv'

type Key = 'day' | 'averageReturn' | 'percentPositive'

interface Row {
  day: number
  averageReturn: number | null
  percentPositive: number | null
}

const columns: Array<{ key: Key; label: string }> = [
  { key: 'day', label: 'Day' },
  { key: 'averageReturn', label: 'Average return (%)' },
  { key: 'percentPositive', label: 'Percent positive (%)' },
]

/** Mirrors the page's cell text: an em dash for a missing value. */
function cellText(row: Row, key: Key) {
  if (key === 'day') return String(row.day)
  const value = row[key]
  return value === null ? '—' : String(value)
}

function row(overrides: Partial<Row> = {}): Row {
  return { day: 1, averageReturn: -0.06, percentPositive: 66.67, ...overrides }
}

describe('seasonality csv table', () => {
  it('uses the visible column labels as headers', () => {
    expect(seasonalityCsvTable(columns, [row()], cellText).headers).toEqual([
      'Day',
      'Average return (%)',
      'Percent positive (%)',
    ])
  })

  it('exports the values the table renders, in column order', () => {
    expect(seasonalityCsvTable(columns, [row()], cellText).rows[0]).toEqual(['1', '-0.06', '66.67'])
  })

  it('produces one row per table row', () => {
    const rows = seasonalityCsvTable(columns, [row(), row({ day: 2 })], cellText).rows

    expect(rows).toHaveLength(2)
    expect(rows[1][0]).toBe('2')
  })

  it('keeps the placeholder the table shows for a missing value', () => {
    const rows = seasonalityCsvTable(columns, [row({ averageReturn: null, percentPositive: null })], cellText).rows

    expect(rows[0]).toEqual(['1', '—', '—'])
  })

  it('has no rows for an empty table', () => {
    expect(seasonalityCsvTable(columns, [], cellText).rows).toEqual([])
  })

  it('exports only the columns it is given', () => {
    const { headers, rows } = seasonalityCsvTable(columns.slice(0, 1), [row()], cellText)

    expect(headers).toEqual(['Day'])
    expect(rows[0]).toEqual(['1'])
  })

  it('writes through toCsv without breaking the column count on a comma in a header', () => {
    const withComma: Array<{ key: Key; label: string }> = [
      { key: 'day', label: 'Day' },
      { key: 'averageReturn', label: 'Average return, (%)' },
    ]
    const { headers, rows } = seasonalityCsvTable(withComma, [row()], cellText)
    const csv = toCsv(headers, rows)

    expect(csv.split('\r\n')[0]).toBe('Day,"Average return, (%)"')
  })
})

describe('seasonality csv filename', () => {
  it('slugs the table name and stamps the date', () => {
    expect(seasonalityCsvFilename('Daily Results — October (SPX)', '2026-10-12')).toBe(
      'daily-results-october-spx-2026-10-12.csv',
    )
  })

  it('collapses punctuation and separators', () => {
    expect(seasonalityCsvFilename('Growth of $1 / TDY 10-50', '2026-10-12')).toBe(
      'growth-of-1-tdy-10-50-2026-10-12.csv',
    )
  })

  it('falls back to a generic name when the label has nothing usable', () => {
    expect(seasonalityCsvFilename('   ', '2026-10-12')).toBe('seasonality-2026-10-12.csv')
  })
})

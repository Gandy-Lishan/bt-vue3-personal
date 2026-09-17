import { describe, expect, it } from 'vitest'
import { escapeCsvValue, toCsv } from '@/shared/utils/csv'

describe('csv escaping', () => {
  it('leaves plain values alone', () => {
    expect(escapeCsvValue('Alpha')).toBe('Alpha')
    expect(escapeCsvValue(10)).toBe('10')
    expect(escapeCsvValue(0)).toBe('0')
  })

  it('quotes values containing a comma', () => {
    expect(escapeCsvValue('Alpha, Beta')).toBe('"Alpha, Beta"')
  })

  it('doubles embedded quotes', () => {
    expect(escapeCsvValue('the "big" one')).toBe('"the ""big"" one"')
  })

  it('quotes values containing line breaks', () => {
    expect(escapeCsvValue('line one\nline two')).toBe('"line one\nline two"')
    expect(escapeCsvValue('line one\r\nline two')).toBe('"line one\r\nline two"')
  })

  it('writes empty for null and undefined', () => {
    expect(escapeCsvValue(null)).toBe('')
    expect(escapeCsvValue(undefined)).toBe('')
  })
})

describe('csv writing', () => {
  it('writes a header row followed by the data rows', () => {
    const csv = toCsv(['Name', 'Value'], [
      ['Alpha', '10.00'],
      ['Bravo', '7.50'],
    ])

    expect(csv.split('\r\n')).toEqual(['Name,Value', 'Alpha,10.00', 'Bravo,7.50'])
  })

  it('writes only the header when there are no rows', () => {
    expect(toCsv(['Name', 'Value'], [])).toBe('Name,Value')
  })

  it('keeps a quoted cell intact so the column count stays stable', () => {
    const csv = toCsv(['Name', 'Group'], [['S&P 500, Total', 'Breadth']])
    const [header, row] = csv.split('\r\n')

    expect(header.split(',').length).toBe(2)
    // The naive split over-counts here, which is exactly why the cell is quoted.
    expect(row).toBe('"S&P 500, Total",Breadth')
  })
})

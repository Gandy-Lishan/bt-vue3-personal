import { describe, expect, it } from 'vitest'
import { normalizeConstituentConditions } from '@/entities/indicator/model/indicator.detail'
import {
  constituentCellValue,
  constituentColumns,
  constituentSortValue,
  isConstituentNumber,
} from '@/entities/indicator/model/indicator.constituents'
import type { ConstituentColumn } from '@/entities/indicator/model/indicator.constituents'
import type { IndicatorConstituentRow } from '@/entities/indicator/model/indicator.types'

function cell(row: IndicatorConstituentRow, column: ConstituentColumn) {
  return constituentCellValue(row, column)
}

function columnFor(rows: IndicatorConstituentRow[], key: string) {
  const match = constituentColumns(rows).find((column) => column.key === key)
  if (!match) throw new Error(`No constituent column for ${key}`)
  return match
}

describe('constituent conditions payload', () => {
  it('accepts a plain array', () => {
    const rows = [{ Symbol: 'AAPL', Close: 10 }]

    expect(normalizeConstituentConditions(rows)).toEqual(rows)
  })

  it('parses a JSON string into an array', () => {
    const rows = normalizeConstituentConditions('[{"Symbol":"AAPL","Close":10.5,"Date":"2026-09-15T00:00:00"}]')

    expect(rows).toHaveLength(1)
    expect(rows[0].Symbol).toBe('AAPL')
  })

  it('treats an empty array and an empty JSON string as no data', () => {
    expect(normalizeConstituentConditions([])).toEqual([])
    expect(normalizeConstituentConditions('[]')).toEqual([])
  })

  it('returns no rows for values that are not arrays', () => {
    expect(normalizeConstituentConditions(undefined)).toEqual([])
    expect(normalizeConstituentConditions(null)).toEqual([])
    expect(normalizeConstituentConditions('{}')).toEqual([])
    expect(normalizeConstituentConditions('not json')).toEqual([])
    expect(normalizeConstituentConditions(42)).toEqual([])
  })

  it('drops array entries that are not objects', () => {
    expect(normalizeConstituentConditions('[{"Symbol":"AAPL"},null,"junk",7]')).toEqual([{ Symbol: 'AAPL' }])
  })
})

describe('constituent columns', () => {
  it('derives columns from the first row in payload order', () => {
    const rows = [{ Symbol: 'AAPL', Sector: 'Tech', Close: 10, Date: '2026-09-15' }]

    expect(constituentColumns(rows).map((column) => column.key)).toEqual(['Symbol', 'Sector', 'Close', 'Date'])
  })

  it('forces Symbol first and Date last regardless of payload order', () => {
    const rows = [{ Date: '2026-09-15', Sector: 'Tech', Close: 10, Symbol: 'AAPL' }]

    expect(constituentColumns(rows).map((column) => column.key)).toEqual(['Symbol', 'Sector', 'Close', 'Date'])
  })

  it('keeps the middle fields in their original order', () => {
    const rows = [{ Symbol: 'A', Zebra: 1, Alpha: 2, Date: '2026-09-15' }]

    expect(constituentColumns(rows).map((column) => column.key)).toEqual(['Symbol', 'Zebra', 'Alpha', 'Date'])
  })

  it('hides the internal url field', () => {
    const rows = [{ Symbol: 'AAPL', url: '/users/charts/aapl', Close: 10, Date: '2026-09-15' }]

    expect(constituentColumns(rows).map((column) => column.key)).toEqual(['Symbol', 'Close', 'Date'])
  })

  it('uses the field name verbatim as the header', () => {
    const rows = [{ Symbol: 'AAPL', underlying_name: 'Apple', Date: '2026-09-15' }]

    expect(constituentColumns(rows).map((column) => column.label)).toEqual(['Symbol', 'underlying_name', 'Date'])
  })

  it('falls back to Symbol / Close / Date when no columns can be derived', () => {
    expect(constituentColumns([]).map((column) => column.key)).toEqual(['Symbol', 'Close', 'Date'])
    expect(constituentColumns([{}]).map((column) => column.key)).toEqual(['Symbol', 'Close', 'Date'])
    // Every field hidden leaves nothing to show.
    expect(constituentColumns([{ url: 'x' }]).map((column) => column.key)).toEqual(['Symbol', 'Close', 'Date'])
  })

  it('types Date as a date and numeric fields as numbers', () => {
    const rows = [{ Symbol: 'AAPL', Close: '10.5', Date: '2026-09-15T00:00:00' }]

    expect(columnFor(rows, 'Symbol').kind).toBe('text')
    expect(columnFor(rows, 'Close').kind).toBe('number')
    expect(columnFor(rows, 'Date').kind).toBe('date')
  })
})

describe('constituent cell values', () => {
  it('keeps two decimals on numeric values', () => {
    const rows = [{ Symbol: 'AAPL', Close: 10 }]

    expect(cell({ Close: 10 }, columnFor(rows, 'Close'))).toBe('10.00')
    expect(cell({ Close: 10.456 }, columnFor(rows, 'Close'))).toBe('10.46')
    expect(cell({ Close: '7.5' }, columnFor(rows, 'Close'))).toBe('7.50')
    expect(cell({ Close: 0 }, columnFor(rows, 'Close'))).toBe('0.00')
  })

  it('truncates a date to the day', () => {
    const rows = [{ Symbol: 'A', Date: '2026-09-15T00:00:00' }]

    expect(cell({ Date: '2026-09-15T00:00:00' }, columnFor(rows, 'Date'))).toBe('2026-09-15')
    expect(cell({ Date: '2026-09-15' }, columnFor(rows, 'Date'))).toBe('2026-09-15')
  })

  it('shows a dash when a date is not a string', () => {
    const rows = [{ Symbol: 'A', Date: '2026-09-15' }]

    expect(cell({ Date: 20260915 }, columnFor(rows, 'Date'))).toBe('-')
    expect(cell({ Date: null }, columnFor(rows, 'Date'))).toBe('-')
  })

  it('leaves non-numeric text alone', () => {
    const rows = [{ Symbol: 'AAPL', Close: 1 }]

    expect(cell({ Symbol: 'AAPL' }, columnFor(rows, 'Symbol'))).toBe('AAPL')
  })

  it('shows a dash for missing or blank values', () => {
    const rows = [{ Symbol: 'A', Close: 1 }]

    expect(cell({ Close: null }, columnFor(rows, 'Close'))).toBe('-')
    expect(cell({ Close: '' }, columnFor(rows, 'Close'))).toBe('-')
    expect(cell({}, columnFor(rows, 'Close'))).toBe('-')
  })

  it('does not treat blanks or booleans as numbers', () => {
    expect(isConstituentNumber('')).toBe(false)
    expect(isConstituentNumber('   ')).toBe(false)
    expect(isConstituentNumber(true)).toBe(false)
    expect(isConstituentNumber(null)).toBe(false)
    expect(isConstituentNumber('2026-09-15T00:00:00')).toBe(false)
    expect(isConstituentNumber('10.5')).toBe(true)
    expect(isConstituentNumber(10.5)).toBe(true)
  })
})

describe('constituent sorting', () => {
  it('sorts numbers numerically, not as text', () => {
    const values = [9, 10, 100].map((value) => constituentSortValue({ Close: value }, 'Close', 'number'))

    expect(values).toEqual([9, 10, 100])
    expect([...values].sort((a, b) => Number(a) - Number(b))).toEqual([9, 10, 100])
  })

  it('sorts dates chronologically via the leading day text', () => {
    const a = constituentSortValue({ Date: '2026-09-15T00:00:00' }, 'Date', 'date')
    const b = constituentSortValue({ Date: '2026-10-01T00:00:00' }, 'Date', 'date')

    expect(a).toBe('2026-09-15')
    expect(String(a) < String(b)).toBe(true)
  })

  it('returns null for blank values so they sort last', () => {
    expect(constituentSortValue({ Close: null }, 'Close', 'number')).toBeNull()
    expect(constituentSortValue({ Close: '' }, 'Close', 'number')).toBeNull()
    expect(constituentSortValue({ Date: 42 }, 'Date', 'date')).toBeNull()
    expect(constituentSortValue({ Symbol: '' }, 'Symbol', 'text')).toBeNull()
  })

  it('sorts text case-insensitively', () => {
    expect(constituentSortValue({ Symbol: 'aapl' }, 'Symbol', 'text')).toBe('aapl')
  })
})

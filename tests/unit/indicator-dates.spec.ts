import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  formatIndicatorDate,
  indicatorDateTimestamp,
  parseIndicatorDate,
  rawIndicatorDate,
} from '@/entities/indicator/model/indicator.dates'

describe('indicator dates', () => {
  it('formats an API date with the full month name', () => {
    expect(formatIndicatorDate('2020-04-02')).toBe('April 2, 2020')
    expect(formatIndicatorDate('2026-07-16')).toBe('July 16, 2026')
  })

  it('accepts slash separated dates', () => {
    expect(formatIndicatorDate('2020/04/02')).toBe('April 2, 2020')
  })

  it('uses the date as written when a time or offset is attached', () => {
    // The API's calendar date is authoritative; the clock part is ignored rather than
    // converted, so an evening UTC timestamp does not roll into the next day.
    expect(formatIndicatorDate('2020-04-02T23:30:00Z')).toBe('April 2, 2020')
    expect(formatIndicatorDate('2020-04-02 23:30:00')).toBe('April 2, 2020')
    expect(formatIndicatorDate('2020-04-02T01:00:00+05:00')).toBe('April 2, 2020')
  })

  it('renders an em dash for empty values', () => {
    expect(formatIndicatorDate('')).toBe('—')
    expect(formatIndicatorDate(undefined)).toBe('—')
    expect(formatIndicatorDate(null)).toBe('—')
    expect(formatIndicatorDate('   ')).toBe('—')
  })

  it('passes through text that is not a date instead of dropping it', () => {
    expect(formatIndicatorDate('pending')).toBe('pending')
  })

  it('rejects impossible calendar dates rather than rolling them over', () => {
    expect(parseIndicatorDate('2020-02-31')).toBeNull()
    expect(parseIndicatorDate('2020-13-01')).toBeNull()
    expect(formatIndicatorDate('2020-02-31')).toBe('2020-02-31')
  })

  it('accepts a leap day but not the same day in a common year', () => {
    expect(formatIndicatorDate('2024-02-29')).toBe('February 29, 2024')
    expect(parseIndicatorDate('2023-02-29')).toBeNull()
  })

  it('orders dates chronologically', () => {
    const dates = ['2026-09-08', '2024-01-15', '2025-06-30', '2026-10-01']

    const sorted = [...dates].sort(
      (left, right) => Number(indicatorDateTimestamp(left)) - Number(indicatorDateTimestamp(right)),
    )

    expect(sorted).toEqual(['2024-01-15', '2025-06-30', '2026-09-08', '2026-10-01'])
  })

  it('returns null timestamps for unparseable dates so they sort last', () => {
    expect(indicatorDateTimestamp('')).toBeNull()
    expect(indicatorDateTimestamp('not a date')).toBeNull()
  })

  it('builds timestamps from UTC components', () => {
    expect(indicatorDateTimestamp('2020-04-02')).toBe(Date.UTC(2020, 3, 2))
  })

  it('returns the backend string untouched for raw date columns', () => {
    expect(rawIndicatorDate('2026-09-15')).toBe('2026-09-15')
    expect(rawIndicatorDate('2020-04-02T23:30:00Z')).toBe('2020-04-02T23:30:00Z')
    expect(rawIndicatorDate('  2026-09-15  ')).toBe('2026-09-15')
  })

  it('still renders an em dash for an empty raw date', () => {
    expect(rawIndicatorDate('')).toBe('—')
    expect(rawIndicatorDate(undefined)).toBe('—')
    expect(rawIndicatorDate(null)).toBe('—')
  })
})

describe('indicator dates across timezones', () => {
  const originalTimezone = process.env.TZ

  beforeAll(() => {
    // UTC-7. A date-only string parsed as UTC midnight and then read back with local
    // getters would render as the previous day here.
    process.env.TZ = 'America/Los_Angeles'
  })

  afterAll(() => {
    process.env.TZ = originalTimezone
  })

  it('has a local timezone that would shift a naive implementation', () => {
    // Guards the two assertions below: if the runtime stops honouring TZ, this fails
    // loudly instead of letting them pass without exercising anything.
    expect(new Date('2020-04-02').getTimezoneOffset()).toBe(420)
    expect(new Date('2020-04-02').getDate()).toBe(1)
  })

  it('keeps the API calendar date regardless of the local timezone', () => {
    expect(formatIndicatorDate('2020-04-02')).toBe('April 2, 2020')
    expect(formatIndicatorDate('2026-01-01')).toBe('January 1, 2026')
    expect(formatIndicatorDate('2026-12-31')).toBe('December 31, 2026')
  })

  it('keeps the same sort key regardless of the local timezone', () => {
    expect(indicatorDateTimestamp('2026-01-01')).toBe(Date.UTC(2026, 0, 1))
  })
})

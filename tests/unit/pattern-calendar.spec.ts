import { describe, expect, it } from 'vitest'
import { countPatternBars, legacyPatternStart, patternCalendarRangeValid } from '../../src/entities/cpm/model/pattern-calendar'

const dates = ['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']
describe('Legacy pattern calendar', () => {
  it('counts available sessions inclusively, not calendar days', () => {
    expect(countPatternBars(dates, '2026-10-02', '2026-10-06')).toBe(3)
  })
  it('preserves legacy bar offset and snaps weekend end dates backward', () => {
    expect(legacyPatternStart(dates, '2026-10-11', 5)).toBe('2026-10-02')
    expect(legacyPatternStart(dates, '2026-10-11', 252)).toBe('2026-10-01')
    expect(legacyPatternStart(dates, '2026-09-30', 5)).toBe('')
  })
  it('rejects substantially different calendar spans', () => {
    expect(patternCalendarRangeValid('2024-01-01', '2024-12-31', '2023-01-01', '2023-12-31')).toBe(true)
    expect(patternCalendarRangeValid('2024-01-01', '2024-12-31', '2023-01-01', '2023-06-01')).toBe(false)
  })
})

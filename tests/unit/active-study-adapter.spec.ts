import { describe, expect, it } from 'vitest'
import {
  activeStudySortValue,
  activeStudyTimeframeLabel,
  normalizeActiveStudies,
} from '@/entities/active-study/model/active-study.adapter'

describe('active study adapter', () => {
  it('normalizes, filters and newest-first sorts the legacy payload', () => {
    const result = normalizeActiveStudies({
      active_studies: [
        { date: '2026-01-02', title: 'Second', market: 'spx', forecast: 'Down', timeframe: 'Short-Term', filename: 'second' },
        { date: '2026-04-03', title: 'First', market: 'ndx', forecast: 'Up', timeframe: 'Medium-Term', filename: 'first' },
        { date: '2026-05-01', title: '', market: 'rut', filename: 'invalid' },
      ],
      short_term_bullish: 4,
      short_term_bearish: '2',
      med_term_bullish: 3,
      med_term_bearish: 1,
      long_term_bullish: 5,
      long_term_bearish: 6,
    })

    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toMatchObject({
      title: 'First',
      href: 'https://sentimentrader.com/blog/first',
    })
    expect(result.summary).toEqual({
      shortTermBullish: 4,
      shortTermBearish: 2,
      mediumTermBullish: 3,
      mediumTermBearish: 1,
      longTermBullish: 5,
      longTermBearish: 6,
    })
  })

  it('supports a JSON-encoded data envelope and date sort values', () => {
    const result = normalizeActiveStudies({
      data: JSON.stringify({
        active_studies: JSON.stringify([
          { date: '2026-10-21', title: 'Study', market: 'gold', forecast: 'Flat', time_frame: 'Long-Term', url: 'https://example.com/study' },
        ]),
      }),
    })

    expect(result.items[0]?.timeframe).toBe('Long-Term')
    expect(result.items[0]?.href).toBe('https://example.com/study')
    expect(activeStudySortValue(result.items[0]!, 'date')).toBeTypeOf('number')
  })

  it.each([
    ['Short to Intermediate', 'Medium'],
    ['Intermediate to Long', 'Medium'],
    ['Intermediate', 'Medium'],
    ['Medium-Term', 'Medium'],
    ['Short', 'Short'],
    ['Short-Term', 'Short'],
    ['Long', 'Long'],
    ['Long-Term', 'Long'],
    ['Custom', 'Custom'],
  ])('displays timeframe %s as %s', (timeframe, expected) => {
    expect(activeStudyTimeframeLabel(timeframe)).toBe(expected)
  })
})

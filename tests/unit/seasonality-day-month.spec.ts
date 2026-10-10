import { describe, expect, it } from 'vitest'
import { buildDayMonthChartPoints, resolveDayMonthDomainSize } from '@/entities/seasonality/model/day-month'

describe('seasonality day-of-month chart points', () => {
  it('uses the maximum returned calendar day instead of padding every month to 31 days', () => {
    const points = buildDayMonthChartPoints(
      [
        { day: 1, averageReturn: -0.1, percentPositive: 48 },
        { day: 30, averageReturn: 0.22, percentPositive: 46.67 },
      ],
      31,
    )

    expect(points).toHaveLength(30)
    expect(points.at(-1)).toEqual({
      label: '30',
      averageReturn: 0.22,
      percentPositive: 46.67,
    })
  })

  it('uses the maximum returned trading day instead of padding every month to 23 trading days', () => {
    expect(
      resolveDayMonthDomainSize(
        [
          { day: 1, averageReturn: -0.07, percentPositive: 61.9 },
          { day: 21, averageReturn: 0.25, percentPositive: 41.67 },
        ],
        23,
      ),
    ).toBe(21)
  })

  it('fills missing days inside the returned domain with empty points', () => {
    const points = buildDayMonthChartPoints(
      [
        { day: 1, averageReturn: 0.1, percentPositive: 60 },
        { day: 3, averageReturn: -0.2, percentPositive: 40 },
      ],
      31,
    )

    expect(points).toEqual([
      { label: '01', averageReturn: 0.1, percentPositive: 60 },
      { label: '02', averageReturn: null, percentPositive: null },
      { label: '03', averageReturn: -0.2, percentPositive: 40 },
    ])
  })
})

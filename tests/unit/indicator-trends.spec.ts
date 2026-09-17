import { describe, expect, it } from 'vitest'
import {
  INDICATOR_TREND_POINT_COUNT,
  indicatorTrendTone,
  normalizeIndicatorTrendPayload,
  normalizeTrendSeries,
} from '@/entities/indicator/model/indicator.trends'

describe('indicator trends', () => {
  it('normalizes keyed trend payloads and keeps the most recent 30 points', () => {
    const payload = {
      data: {
        alpha: Array.from({ length: 35 }, (_, index) => ({ date: `2026-09-${index + 1}`, value: index })),
      },
    }

    expect(normalizeIndicatorTrendPayload(payload, ['alpha']).alpha).toEqual(
      Array.from({ length: INDICATOR_TREND_POINT_COUNT }, (_, index) => index + 5),
    )
  })

  it('normalizes row-shaped payloads with tuple points', () => {
    const payload = {
      data: [
        {
          url: 'alpha',
          recent_data: [
            ['2026-09-01', 10],
            ['2026-09-02', 8],
            ['2026-09-03', 12],
          ],
        },
      ],
    }

    expect(normalizeIndicatorTrendPayload(payload, ['alpha']).alpha).toEqual([10, 8, 12])
  })

  it('normalizes stock recent data rows keyed by symbol', () => {
    const payload = [
      {
        symbol: 'xly_reltrend_above8_spx_ratio',
        data: [
          {
            Date: '2026-06-04',
            close: 0.6000000000000001,
            change: 0,
            percent_change: 0,
          },
          {
            Date: '2026-06-05',
            close: 0.8,
            change: 0.2,
            percent_change: 33.33,
          },
        ],
      },
    ]

    expect(normalizeIndicatorTrendPayload(payload, ['xly_reltrend_above8_spx_ratio'])).toEqual({
      xly_reltrend_above8_spx_ratio: [0.6000000000000001, 0.8],
    })
  })

  it('normalizes nested stock recent data rows keyed by symbol', () => {
    const payload = {
      data: [
        {
          symbol: 'xlc_reltrend_above8_spx_ratio',
          data: [
            { Date: '2026-06-04', close: 0.4 },
            { Date: '2026-06-05', close: 0.2 },
          ],
        },
      ],
    }

    expect(normalizeIndicatorTrendPayload(payload, ['xlc_reltrend_above8_spx_ratio'])).toEqual({
      xlc_reltrend_above8_spx_ratio: [0.4, 0.2],
    })
  })

  it('does not create a renderable series from missing or single-point data', () => {
    expect(normalizeTrendSeries(undefined)).toEqual([])
    expect(normalizeTrendSeries([{ value: 10 }])).toEqual([])
  })

  it('uses the real trend direction for sparkline tone', () => {
    expect(indicatorTrendTone({ change: 10, trend: [9, 8, 7] })).toBe('red')
    expect(indicatorTrendTone({ change: -10, trend: [7, 8, 9] })).toBe('green')
  })
})

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

    expect(normalizeIndicatorTrendPayload(payload, ['alpha']).alpha).toEqual([
      Array.from({ length: INDICATOR_TREND_POINT_COUNT }, (_, index) => index + 5),
    ])
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

    expect(normalizeIndicatorTrendPayload(payload, ['alpha']).alpha).toEqual([[10, 8, 12]])
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
      xly_reltrend_above8_spx_ratio: [[0.6000000000000001, 0.8]],
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
      xlc_reltrend_above8_spx_ratio: [[0.4, 0.2]],
    })
  })

  it('does not create a renderable series from missing or single-point data', () => {
    expect(normalizeTrendSeries(undefined)).toEqual([])
    expect(normalizeTrendSeries([{ value: 10 }])).toEqual([])
  })

  it('uses the real trend direction for sparkline tone', () => {
    expect(indicatorTrendTone({ change: 10, trendLines: [[9, 8, 7]] })).toBe('red')
    expect(indicatorTrendTone({ change: -10, trendLines: [[7, 8, 9]] })).toBe('green')
  })

  it('falls back to the change sign when there is no line', () => {
    expect(indicatorTrendTone({ change: -1, trendLines: [] })).toBe('red')
    expect(indicatorTrendTone({ change: 1, trendLines: [] })).toBe('green')
  })
})

describe('two-line trend series', () => {
  it('plots each numeric field of a stacked row as its own line, in payload order', () => {
    // smart_dumb: smart_money is declared first, so it becomes the blue line.
    const payload = [
      {
        symbol: 'smart_dumb',
        data: [
          { Date: '2026-06-08', smart_money: 0.51, dumb_money: 0.63 },
          { Date: '2026-06-09', smart_money: 0.55, dumb_money: 0.6 },
          { Date: '2026-06-10', smart_money: 0.6, dumb_money: 0.58 },
        ],
      },
    ]

    expect(normalizeIndicatorTrendPayload(payload, ['smart_dumb'])).toEqual({
      smart_dumb: [
        [0.51, 0.55, 0.6],
        [0.63, 0.6, 0.58],
      ],
    })
  })

  it('keeps payload order for the trend/reltrend shape', () => {
    const payload = {
      data: [
        {
          url: 'AAPL_trend_reltrend',
          data: [
            { Date: '2026-06-08', trend: 8, reltrend: 3 },
            { Date: '2026-06-09', trend: 9, reltrend: 4 },
          ],
        },
      ],
    }

    expect(normalizeIndicatorTrendPayload(payload, ['AAPL_trend_reltrend'])).toEqual({
      AAPL_trend_reltrend: [
        [8, 9],
        [3, 4],
      ],
    })
  })

  it('supports the 20d/60d volatility shape', () => {
    expect(
      normalizeTrendSeries([
        { Date: '2026-06-08', '20': 12, '60': 30 },
        { Date: '2026-06-09', '20': 14, '60': 31 },
      ]),
    ).toEqual([
      [12, 14],
      [30, 31],
    ])
  })

  it('still prefers `close` as a single line when the row carries change columns', () => {
    const lines = normalizeTrendSeries([
      { Date: '2026-06-08', close: 23, change: 18, percent_change: 360 },
      { Date: '2026-06-09', close: 25, change: 2, percent_change: 8 },
    ])

    // `change` and `percent_change` must not become lines of their own.
    expect(lines).toEqual([[23, 25]])
  })

  it('drops a field that does not cover every point so the lines stay aligned', () => {
    const lines = normalizeTrendSeries([
      { Date: '2026-06-08', smart_money: 0.5, dumb_money: 0.6 },
      { Date: '2026-06-09', smart_money: 0.7 },
      { Date: '2026-06-10', smart_money: 0.8, dumb_money: 0.9 },
    ])

    expect(lines).toEqual([[0.5, 0.7, 0.8]])
  })

  it('drops non-numeric and identifier fields', () => {
    const lines = normalizeTrendSeries([
      { Date: '2026-06-08', label: 'mon', url: '/x', smart_money: 1, dumb_money: 2 },
      { Date: '2026-06-09', label: 'tue', url: '/x', smart_money: 3, dumb_money: 4 },
    ])

    expect(lines).toEqual([
      [1, 3],
      [2, 4],
    ])
  })
})

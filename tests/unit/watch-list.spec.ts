import { describe, expect, it } from 'vitest'
import { buildWatchListPreview } from '@/entities/my-stuff/model/watch-list'

describe('buildWatchListPreview', () => {
  it('derives current values, moving averages and rate of change', () => {
    const preview = buildWatchListPreview({
      SPX: {
        name: 'S&P 500',
        optixUrl: '/spx',
        records: [
          { Close: 100, Optix: 20, Trend: 4, RelTrend: 5 },
          { Close: 110, Optix: 40, Trend: 6, RelTrend: 7 },
          { Close: 121, Optix: 60, Trend: 8, RelTrend: 9 },
        ],
      },
    }, [
      { indicator: 'Trend Score', bar: 1 },
      { indicator: 'Optix MA10', bar: 2 },
      { indicator: 'ROC5', bar: 2 },
    ])

    expect(preview.rows).toHaveLength(1)
    expect(preview.rows[0]).toMatchObject({ Ticker: 'SPX', Name: 'S&P 500', Close: 121 })
    expect(preview.rows[0]?.['Trend Score-1-0']).toBe(8)
    expect(preview.rows[0]?.['Optix MA10-2-1']).toBe(50)
    expect(preview.rows[0]?.['ROC5-2-2']).toBe('21%')
    expect(preview.heatmap.map((group) => group.name)).toEqual(['Trend Score', 'Symbol Optix 10-Day Moving Average'])
  })

  it('omits tickers without price history and preserves missing values', () => {
    const preview = buildWatchListPreview({
      EMPTY: { name: 'Empty', optixUrl: '', records: [] },
      NEW: { name: 'New', optixUrl: '', records: [{ Close: 10 }] },
    }, [{ indicator: 'ROC21', bar: 21 }])

    expect(preview.rows).toHaveLength(1)
    expect(preview.rows[0]?.Ticker).toBe('NEW')
    expect(preview.rows[0]?.['ROC21-21-0']).toBeNull()
  })
})

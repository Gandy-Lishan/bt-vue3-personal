import { describe, expect, it } from 'vitest'
import { normalizeCpmPatternPreviewPayload, normalizeCpmPatternPreviewRows } from '@/entities/cpm/model/cpm.adapter'

describe('CPM pattern preview', () => {
  it('normalizes close prices into percentage returns sorted by date', () => {
    const points = normalizeCpmPatternPreviewRows([
      { Date: '2026-08-03', close: 110 },
      { Date: '2026-08-01', close: 100 },
      { Date: '2026-08-02', close: 105 },
    ])

    expect(points.map((point) => point.date)).toEqual(['2026-08-01', '2026-08-02', '2026-08-03'])
    expect(points[0].normalizedReturn).toBeCloseTo(0)
    expect(points[1].normalizedReturn).toBeCloseTo(5)
    expect(points[2].normalizedReturn).toBeCloseTo(10)
  })

  it('falls back to the first matching stock_recent_data item with rows', () => {
    const result = normalizeCpmPatternPreviewPayload(
      [
        { symbol: 'SPX', data: [] },
        {
          symbol: 'spx',
          data: [
            { Date: '2026-08-01', close: 100 },
            { Date: '2026-08-02', close: 98 },
          ],
        },
      ],
      'SPX',
    )

    expect(result.symbol).toBe('spx')
    expect(result.points).toHaveLength(2)
    expect(result.points[1].normalizedReturn).toBeCloseTo(-2)
  })

  it('does not expose backend SQL errors in the preview message', () => {
    const result = normalizeCpmPatternPreviewPayload(
      [
        {
          symbol: { name: 'SPX' },
          data: [],
          error: 'Execution failed on sql select table_name from url_map',
        },
      ],
      'SPX',
    )

    expect(result.message).toBe('No pattern data found for this symbol and pattern period.')
  })
})

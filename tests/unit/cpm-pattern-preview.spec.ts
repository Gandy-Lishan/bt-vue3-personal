import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchCpmPatternPreview } from '@/entities/cpm/api/cpm.api'
import { normalizeCpmPatternPreviewPayload, normalizeCpmPatternPreviewRows } from '@/entities/cpm/model/cpm.adapter'

describe('CPM pattern preview', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads the creation preview from stock_recent_data with the selected bar count', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ symbol: 'SPX', data: [
        { Date: '2026-08-02', close: 100 },
        { Date: '2026-08-03', close: 105 },
      ] }],
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchCpmPatternPreview({ symbol: 'SPX', startDate: '2026-08-02', endDate: '2026-08-03', bars: 42 })

    expect(fetchMock.mock.calls[0][0]).toBe('/dev/st_data/stock_recent_data')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      indicator_list: [
        { name: 'SPX', start: '2026-08-02', end: '2026-08-03', bars: 42 },
        { name: 'spx', start: '2026-08-02', end: '2026-08-03', bars: 42 },
      ],
    })
    expect(result.points.map((point) => point.date)).toEqual(['2026-08-02', '2026-08-03'])
    expect(result.points[1].normalizedReturn).toBeCloseTo(5)
  })
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

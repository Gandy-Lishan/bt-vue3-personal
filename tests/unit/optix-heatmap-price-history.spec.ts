import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchOptixPriceHistory } from '@/pages/research-workspace/optix-heatmap.api'

describe('Optix heatmap price history', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts the heatmap cell URL to stock_recent_data with 63 bars', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{
        symbol: 'EWA',
        data: [
          { Date: '2026-11-13', close: 21.38, change: -0.02, percent_change: -0.09 },
          { Date: '2026-11-16', close: 21.7, change: 0.32, percent_change: 1.5 },
        ],
      }],
    })
    vi.stubGlobal('fetch', fetchMock)

    const points = await fetchOptixPriceHistory('eww_optix')

    expect(fetchMock.mock.calls[0][0]).toBe('/dev/st_data/stock_recent_data')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      indicator_list: [{ name: 'eww_optix', bars: 63 }],
    })
    expect(points.map(point => point.date)).toEqual(['2026-11-13', '2026-11-16'])
    expect(points[1].close).toBeCloseTo(21.7)
  })

  it('sorts rows by date and drops rows without a date or finite close', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ data: [
        { Date: '2026-11-16', close: 21.7 },
        { Date: '2026-11-13', close: 21.38 },
        { Date: '', close: 20 },
        { Date: '2026-11-17', close: Number.NaN },
      ] }],
    })
    vi.stubGlobal('fetch', fetchMock)

    const points = await fetchOptixPriceHistory('country_ewa')

    expect(points.map(point => point.date)).toEqual(['2026-11-13', '2026-11-16'])
  })

  it('returns no points for an empty symbol', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const points = await fetchOptixPriceHistory('  ')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(points).toEqual([])
  })

  it('throws on a failed response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchOptixPriceHistory('EWA')).rejects.toThrow('Optix history request failed: 500')
  })
})

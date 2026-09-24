import { describe, expect, it } from 'vitest'
import { pruneStandaloneDetailChartData } from '@/entities/indicator/model/indicator.chart'

describe('standalone detail chart data', () => {
  it('keeps only the requested trend line when the backend returns the paired line', () => {
    const rows = pruneStandaloneDetailChartData('AAPL_trend', [
      { Date: '2026-09-01', AAPL_trend: 8, AAPL_reltrend: 3, Color: true, opt: 7, pess: 2 },
      { Date: '2026-09-02', AAPL_trend: 9, AAPL_reltrend: 4, Color: false, opt: 7, pess: 2 },
    ])

    expect(rows).toEqual([
      { Date: '2026-09-01', AAPL_trend: 8, Color: true, opt: 7, pess: 2 },
      { Date: '2026-09-02', AAPL_trend: 9, Color: false, opt: 7, pess: 2 },
    ])
  })

  it('keeps only the requested reltrend line when the backend returns trend too', () => {
    const rows = pruneStandaloneDetailChartData('AAPL_reltrend', [
      { Date: '2026-09-01', AAPL_trend: 8, AAPL_reltrend: 3 },
      { Date: '2026-09-02', AAPL_trend: 9, AAPL_reltrend: 4 },
    ])

    expect(rows).toEqual([
      { Date: '2026-09-01', AAPL_reltrend: 3 },
      { Date: '2026-09-02', AAPL_reltrend: 4 },
    ])
  })

  it('keeps trend and reltrend for the combined trend detail', () => {
    const rows = pruneStandaloneDetailChartData('AAPL_trend_reltrend', [
      { Date: '2026-09-01', AAPL_trend: 8, AAPL_reltrend: 3, MSFT_trend: 6 },
      { Date: '2026-09-02', AAPL_trend: 9, AAPL_reltrend: 4, MSFT_trend: 7 },
    ])

    expect(rows).toEqual([
      { Date: '2026-09-01', AAPL_trend: 8, AAPL_reltrend: 3 },
      { Date: '2026-09-02', AAPL_trend: 9, AAPL_reltrend: 4 },
    ])
  })

  it('keeps only the 20-day historical volatility line for *_volatility', () => {
    const rows = pruneStandaloneDetailChartData('A_volatility', [
      { Date: '2026-09-01', A_volatility: 12, A_volatility_60d: 22 },
      { Date: '2026-09-02', A_volatility: 13, A_volatility_60d: 23 },
    ])

    expect(rows).toEqual([
      { Date: '2026-09-01', A_volatility: 12 },
      { Date: '2026-09-02', A_volatility: 13 },
    ])
  })

  it('keeps only the 60-day historical volatility line for *_volatility_60d', () => {
    const rows = pruneStandaloneDetailChartData('A_volatility_60d', [
      { Date: '2026-09-01', volatility_20d: 12, volatility_60d: 22 },
      { Date: '2026-09-02', volatility_20d: 13, volatility_60d: 23 },
    ])

    expect(rows).toEqual([
      { Date: '2026-09-01', volatility_60d: 22 },
      { Date: '2026-09-02', volatility_60d: 23 },
    ])
  })

  it('leaves data alone when the expected target line is not present', () => {
    const rows = [{ Date: '2026-09-01', close: 12, AAPL_reltrend: 3 }]

    expect(pruneStandaloneDetailChartData('AAPL_trend', rows)).toBe(rows)
  })
})

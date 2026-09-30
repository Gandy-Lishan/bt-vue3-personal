import { describe, expect, it } from 'vitest'
import {
  createSmartScannerDefaultRanges,
  extractSmartScannerCurrentDate,
  matchesSmartScannerRange,
  normalizeSmartScannerBacktestDetail,
  normalizeSmartScannerRows,
  parseSmartScannerDetailRequest,
  smartScannerDetailRequestFromRow,
  smartScannerSearchScore,
  smartScannerSignalDescription,
  smartScannerSignalLabel,
} from '@/entities/scanner/model/smart-scanner.adapter'

describe('smart scanner adapter', () => {
  it('normalizes legacy scanner rows and maps compact signal labels', () => {
    const [row] = normalizeSmartScannerRows([
      {
        Date: '2026-09-28',
        Symbol: 'aapl',
        Close: '231.45',
        PctChange: '1.25',
        Market: 'SPX',
        TrendScore: '8',
        Direction: 'Long',
        _Signal: "Symbol Close > its' MA200 and Optix < 30",
        WinRate: '64.4',
        StopLoss: '4.5',
        ProfitTarget: '8.5',
        TimeInMarket: '21',
        ExpectedReturn: '1.4',
        Z_Score: '-0.5',
      },
    ])

    expect(row).toMatchObject({
      date: '2026-09-28',
      symbol: 'AAPL',
      close: 231.45,
      pctChange: 1.25,
      trend: 'SPX',
      trendScore: 8,
      direction: 'Long',
      signalLabel: 'Optix #2',
      winRate: 64.4,
      stopLoss: 4.5,
      profitTarget: 8.5,
      timeInMarket: 21,
      expectedReturn: 1.4,
      zScore: -0.5,
    })
  })

  it('extracts array payloads nested inside data strings', () => {
    const rows = normalizeSmartScannerRows({
      data: JSON.stringify([{ Date: '2026-09-28', Symbol: 'msft', Direction: 'Short' }]),
    })

    expect(rows).toHaveLength(1)
    expect(rows[0].symbol).toBe('MSFT')
  })

  it('keeps null metric values inside advanced range filters', () => {
    const [row] = normalizeSmartScannerRows([{ Date: '2026-09-28', Symbol: 'TSLA', Direction: 'Long' }])
    const ranges = createSmartScannerDefaultRanges()

    expect(matchesSmartScannerRange(row, 'profitTarget', ranges.profitTarget)).toBe(true)
  })

  it('ranks exact symbol search above substring matches', () => {
    const [exact, substring] = normalizeSmartScannerRows([
      { Date: '2026-09-28', Symbol: 'U', Direction: 'Long' },
      { Date: '2026-09-28', Symbol: 'RUN', Direction: 'Long' },
    ])

    expect(smartScannerSearchScore(exact, 'u')).toBeGreaterThan(smartScannerSearchScore(substring, 'u') ?? 0)
  })

  it('exposes the legacy Optix signal names', () => {
    expect(smartScannerSignalLabel("Symbol Close > its' MA200 and Optix MA5 < 35")).toBe('Optix #1')
  })

  it('exposes the legacy signal help text', () => {
    expect(smartScannerSignalDescription("Symbol Close > its' MA200 and Optix MA5 < 35")).toContain(
      'Optix 5-day moving average less than 35',
    )
  })

  it('builds detail rowData from a scanner list row', () => {
    const [row] = normalizeSmartScannerRows([
      {
        Date: '2026-09-28',
        Symbol: 'ADM',
        Direction: 'Long',
        Category: 'MidTermAI',
        _Signal: "Symbol Close > its' MA200 and Optix MA5 < 35",
        Close: 46.85,
        TrendScore: 10,
        WinRate: 54,
        TimeInMarket: 39,
      },
    ])

    expect(smartScannerDetailRequestFromRow(row)).toMatchObject({
      symbol: 'ADM',
      date: '2026-09-28',
      signalLabel: 'Optix #1',
      trendScore: 10,
      winRate: 54,
      timeInMarket: 39,
    })
  })

  it('parses legacy scanner detail rowData query payloads', () => {
    const request = parseSmartScannerDetailRequest(
      JSON.stringify({
        id: 'test',
        Symbol: 'ADM',
        Date: '2026-09-28',
        _Signal: "Symbol Close > its' MA200 and Optix MA5 < 35",
        Category: 'MidTermAI',
        Direction: 'Long',
      }),
    )

    expect(request).toMatchObject({
      symbol: 'ADM',
      date: '2026-09-28',
      signalLabel: 'Optix #1',
      category: 'MidTermAI',
      direction: 'Long',
    })
  })

  it('normalizes backtest metrics and trade rows from the detail response', () => {
    const request = parseSmartScannerDetailRequest({
      Symbol: 'ADM',
      Date: '2026-09-28',
      _Signal: "Symbol Close > its' MA200 and Optix MA5 < 35",
      Category: 'MidTermAI',
      Direction: 'Long',
      TrendScore: 10,
      WinRate: 54,
      TimeInMarket: 39,
    })

    expect(request).not.toBeNull()

    const detail = normalizeSmartScannerBacktestDetail(
      {
        Symbol: 'ADM',
        WinRate: 54,
        AvgWin: 7.5,
        AvgLoss: 8.5,
        TradeNumber: 75,
        AnnualReturn: -0.8,
        MedianReturn: 2.1,
        AvgReturn: -0.1,
        StdDev: 8.6,
        MaxRisk: 60.4,
        EntryTradeDate: "['2015-01-05','2015-03-04']",
        ExitTradeDate: "['2015-03-03','2015-04-29']",
        ExitReason: "['Time Is Up','Stop Loss']",
        EachReturn: '[5.3,-9.5]',
      },
      request!,
    )

    expect(detail.totalPositive).toBe(41)
    expect(detail.totalNegative).toBe(35)
    expect(detail.trades).toEqual([
      expect.objectContaining({ index: 1, entryDate: '2015-01-05', exitDate: '2015-03-03', eachReturn: 5.3 }),
      expect.objectContaining({ index: 2, exitReason: 'Stop Loss', eachReturn: -9.5 }),
    ])
    expect(detail.signalLabel).toBe('Optix #1')
  })

  it('uses LastUpdatePickDate from the currDate response', () => {
    expect(extractSmartScannerCurrentDate({ LastUpdatePickDate: '2026-09-25' })).toBe('2026-09-25')
  })

  it('uses LastUpdatePickDate when the currDate response is nested in data', () => {
    expect(
      extractSmartScannerCurrentDate({
        data: JSON.stringify({ LastUpdatePickDate: '2026-09-25T00:00:00' }),
      }),
    ).toBe('2026-09-25')
  })
})

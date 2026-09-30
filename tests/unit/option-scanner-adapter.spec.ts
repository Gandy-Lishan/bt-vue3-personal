import { describe, expect, it } from 'vitest'
import {
  createOptionScannerDefaultRanges,
  extractOptionScannerLatestTradeDate,
  matchesOptionScannerRange,
  normalizeOptionScannerRangeBounds,
  normalizeOptionScannerRows,
  optionScannerCsvTable,
  optionScannerSearchScore,
} from '@/entities/scanner/model/option-scanner.adapter'

describe('option scanner adapter', () => {
  it('normalizes legacy option scanner rows with compact API field names', () => {
    const [row] = normalizeOptionScannerRows([
      {
        ticker: 'rr',
        stkpx: '2.98',
        expirDate: '2026-03-20T00:00:00',
        yte: '192',
        credit_per_contract: '0.21',
        Volume: '11',
        OI: '2',
        ContractSymbol: 'RR260320P00001000',
        strike: '1',
        be: '1.21',
        IV: '3.531251171875',
        margin: '91.2',
        return_on_full: '0.2302631579',
        POP_est: '97.16',
        Delta: '-0.028410417',
        Vega: '0.1691621728',
        ev_score: '1.44',
        cagr: '5.5',
        trade_date: '2025-09-08',
      },
    ])

    expect(row).toMatchObject({
      symbol: 'RR',
      lastClose: 2.98,
      expireDate: '2026-03-20',
      dte: 192,
      credit: 0.21,
      volume: 11,
      openInterest: 2,
      contractSymbol: 'RR260320P00001000',
      strike: 1,
      breakEven: 1.21,
      margin: 91.2,
      probabilityOfProfit: 97.16,
      delta: -0.028410417,
      vega: 0.1691621728,
      expectedValueScore: 1.44,
      cagr: 5.5,
      tradeDate: '2025-09-08',
    })
    expect(row.impliedVolatility).toBeCloseTo(353.1251171875)
    expect(row.returnPercent).toBeCloseTo(23.02631579)
  })

  it('extracts array payloads nested inside data strings', () => {
    const rows = normalizeOptionScannerRows({
      data: JSON.stringify([{ ticker: 'adm', expirDate: '2026-03-20', trade_date: '2025-09-08' }]),
    })

    expect(rows).toHaveLength(1)
    expect(rows[0].symbol).toBe('ADM')
  })

  it('uses the latest trade date from legacy payload rows', () => {
    expect(extractOptionScannerLatestTradeDate([{ 'Latest Trade Date': '2025-09-08T00:00:00' }])).toBe('2025-09-08')
  })

  it('keeps null metric values inside advanced range filters', () => {
    const [row] = normalizeOptionScannerRows([{ ticker: 'TSLA', expirDate: '2026-03-20' }])
    const ranges = createOptionScannerDefaultRanges()

    expect(matchesOptionScannerRange(row, 'volume', ranges.volume)).toBe(true)
  })

  it('normalizes reversed range bounds before applying filters', () => {
    const ranges = createOptionScannerDefaultRanges()
    ranges.volume.min = 100
    ranges.volume.max = 10

    normalizeOptionScannerRangeBounds(ranges)

    expect(ranges.volume).toEqual({ min: 10, max: 100 })
  })

  it('ranks exact symbol search above contract substring matches', () => {
    const [exact, substring] = normalizeOptionScannerRows([
      { ticker: 'A', ContractSymbol: 'A260320P00001000', expirDate: '2026-03-20' },
      { ticker: 'ADM', ContractSymbol: 'ADM260320P00001000', expirDate: '2026-03-20' },
    ])

    expect(optionScannerSearchScore(exact, 'a')).toBeGreaterThan(optionScannerSearchScore(substring, 'a') ?? 0)
  })

  it('exports both visible and expanded fields to CSV', () => {
    const [row] = normalizeOptionScannerRows([
      {
        ticker: 'RR',
        expirDate: '2026-03-20',
        ContractSymbol: 'RR260320P00001000',
        Volume: 11,
        OI: 2,
      },
    ])

    const csv = optionScannerCsvTable([row])

    expect(csv.headers).toContain('Contract Symbol')
    expect(csv.rows[0]).toContain('RR260320P00001000')
    expect(csv.rows[0]).toContain(11)
  })
})

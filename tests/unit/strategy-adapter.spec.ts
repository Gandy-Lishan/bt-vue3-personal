import { describe, expect, it } from 'vitest'
import {
  mergeStrategyRows,
  matchesStrategyScope,
  normalizeStrategyDetail,
  normalizeStrategyDescriptionHtml,
  normalizeStrategyPerformanceRows,
  normalizeStrategyPairPriceRows,
  normalizeStrategySignalRows,
  normalizeStrategySummaryRows,
  strategyChartSeriesFromPrices,
  strategyScopeOptions,
  strategySignalCsvTable,
  strategySummaryCsvTable,
} from '@/entities/strategy/model/strategy.adapter'

describe('strategy adapter', () => {
  it('normalizes legacy strategy signal rows', () => {
    const [row] = normalizeStrategySignalRows({
      code: 200,
      data: [
        {
          model_name: 'Dual Trend Model with Fundamentals',
          url: 'dual_trend_model',
          category: 'Legacy',
          type: 'Long-Term',
          current_state: 'Long QQQ (NASDAQ 100 ETF)',
          date: '2026-09-17T00:00:00Z',
          update_frequency: 'Daily',
          YTD_return: '6.52%',
          CAGR: '16.80',
          favorite: 1,
          current_day: true,
        },
      ],
    })

    expect(row).toMatchObject({
      modelName: 'Dual Trend Model with Fundamentals',
      url: 'dual_trend_model',
      category: 'Legacy',
      timeFrame: 'Long-Term',
      currentSignal: 'Long QQQ (NASDAQ 100 ETF)',
      lastSignalDate: '2026-09-17',
      frequency: 'Daily',
      ytdReturn: 6.52,
      cagr: 16.8,
      favorite: true,
      currentDay: true,
    })
  })

  it('joins summary rows to signal metadata by model url', () => {
    const signals = normalizeStrategySignalRows([
      {
        model_name: 'Aggregate Signal Model',
        url: 'aggregate_signal_model',
        category: 'INDEX',
        favorite: 1,
      },
    ])

    const [summary] = normalizeStrategySummaryRows(
      [
        {
          model: 'aggregate_signal_model',
          CAGR: 9.4,
          benchmark_CAGR: 9.29,
          net_profit_pct: 512.54,
          max_drawdown: 34.1,
          sharp_ratio: 0.66,
          profit_loss_ratio: 10.86,
          average_win: 23.16,
          average_loss: -1.4,
          total_trades: 17,
          win_rate_pct: 64.71,
        },
      ],
      signals,
    )

    expect(summary).toMatchObject({
      modelName: 'Aggregate Signal Model',
      category: 'INDEX',
      favorite: true,
      cagr: 9.4,
      benchmarkCagr: 9.29,
      netProfit: 512.54,
      maxDrawdown: 34.1,
      sharpeRatio: 0.66,
      profitLossRatio: 10.86,
      averageWin: 23.16,
      averageLoss: -1.4,
      totalTrades: 17,
      winRate: 64.71,
    })
  })

  it('merges signal and summary rows into one strategy table', () => {
    const signals = normalizeStrategySignalRows([
      {
        model_name: 'Dual Trend Model',
        url: 'dual_trend_model',
        category: 'Legacy',
        current_state: 'Long SPY',
        CAGR: 12.5,
      },
      {
        model_name: 'Missing Summary Model',
        url: 'missing_summary_model',
        category: 'Bond',
        CAGR: 4.2,
      },
    ])
    const summaries = normalizeStrategySummaryRows(
      [
        {
          model: 'dual_trend_model',
          net_profit_pct: 120.5,
          win_rate_pct: 61.2,
        },
      ],
      signals,
    )

    const rows = mergeStrategyRows(signals, summaries)

    expect(rows).toHaveLength(2)
    expect(rows[0].signal.currentSignal).toBe('Long SPY')
    expect(rows[0].summary.netProfit).toBe(120.5)
    expect(rows[1].summary.modelName).toBe('Missing Summary Model')
    expect(rows[1].summary.cagr).toBe(4.2)
  })

  it('builds scope counts and applies favorites scope', () => {
    const rows = normalizeStrategySignalRows([
      { model_name: 'A', url: 'a', category: 'Legacy', favorite: 1 },
      { model_name: 'B', url: 'b', category: 'Bond', favorite: 0 },
    ])

    expect(strategyScopeOptions(rows).find((scope) => scope.key === 'favorites')?.count).toBe(1)
    expect(matchesStrategyScope(rows[0], 'favorites')).toBe(true)
    expect(matchesStrategyScope(rows[1], 'favorites')).toBe(false)
  })

  it('exports current signals and summary tables to CSV row data', () => {
    const [signal] = normalizeStrategySignalRows([
      { model_name: 'Short Term Trading Model', url: 'short_term', type: 'Short-Term', YTD_return: 11.7, CAGR: 6.12 },
    ])
    const [summary] = normalizeStrategySummaryRows([{ model_name: 'Short Term Trading Model', CAGR: 6.12 }])

    expect(strategySignalCsvTable([signal], 'Aug 31, 2026').headers[5]).toContain('Aug 31, 2026')
    expect(strategySignalCsvTable([signal], 'Aug 31, 2026').rows[0]).toContain('Short Term Trading Model')
    expect(strategySummaryCsvTable([summary]).rows[0]).toContain(6.12)
  })

  it('normalizes strategy detail performance rows and keeps linked list metadata', () => {
    const signals = normalizeStrategySignalRows([
      {
        model_name: 'Alternating Between Stocks and Gold Model',
        url: 'alternate_stocks_gold_model',
        category: 'Legacy',
        current_state: '100% Cash',
        favorite: 1,
      },
    ])
    const summaries = normalizeStrategySummaryRows(
      [
        {
          model: 'alternate_stocks_gold_model',
          benchmark_CAGR: 9.25,
        },
      ],
      signals,
    )
    const payload = {
      code: 200,
      data: [
        {
          model: 'alternate_stocks_gold_model',
          symbol_not_long: 'CASH',
          start_date: '2006-07-01T00:00:00.000',
          end_date: '2026-09-30T00:00:00.000',
          CAGR: 8.78,
          benchmark_CAGR: 9.25,
          profit_loss_ratio: -1,
          trades_per_year: 5.03,
          returns_outfile: 'https://example.com/returns.png',
          description: '<p>Rules</p><script>alert(1)</script>',
          symbol1: 'GLD',
          symbol2: 'SPY',
          buy_signal_1: "['2026-01-05']",
          sell_signal_1: "['2026-02-10']",
        },
      ],
    }

    const [performance] = normalizeStrategyPerformanceRows(payload, signals)
    const detail = normalizeStrategyDetail(payload, {
      url: 'alternate_stocks_gold_model',
      signals,
      summaries,
    })

    expect(performance).toMatchObject({
      modelName: 'Alternating Between Stocks and Gold Model',
      symbolNotLong: 'CASH',
      startDate: '2006-07-01',
      endDate: '2026-09-30',
      cagr: 8.78,
      profitLossRatio: 'Low risk',
      tradesPerYear: 5.03,
      returnsUrl: 'https://example.com/returns.png',
      symbol1: 'GLD',
      symbol2: 'SPY',
      buySignal1: ['2026-01-05'],
      sellSignal1: ['2026-02-10'],
    })
    expect(performance.descriptionHtml).toBe('<p>Rules</p>')
    expect(detail.signal?.favorite).toBe(true)
    expect(detail.summary?.benchmarkCagr).toBe(9.25)
  })

  it('routes strategy description model links through the legacy description page', () => {
    const html = normalizeStrategyDescriptionHtml(
      '<p>The model is based on <a href="http://localhost:5173/dual_trend_model/"><strong>Dual Trend Model</strong></a> and <a href="/large_cap_growth_value_relative_ratio_rank_system/">Growth Value</a>.</p>',
    )

    expect(html).toContain('href="/strategy/descriptions?url=dual_trend_model"')
    expect(html).toContain('href="/strategy/descriptions?url=large_cap_growth_value_relative_ratio_rank_system"')
  })

  it('builds strategy chart series from pair prices and signal dates', () => {
    const prices = normalizeStrategyPairPriceRows([
      { DT: '2026-01-05T00:00:00.000Z', Close: 100.25 },
      { DT: '2026-01-06T00:00:00.000Z', Close: 101.5 },
      { DT: '2026-02-10T00:00:00.000Z', Close: 96.75 },
    ])

    const series = strategyChartSeriesFromPrices('GLD', prices, ['2026-01-05'], ['2026-02-10'])

    expect(series?.symbol).toBe('GLD')
    expect(series?.points).toEqual([
      [expect.any(Number), 100.25, 1, null],
      [expect.any(Number), 101.5, null, null],
      [expect.any(Number), 96.75, null, -1],
    ])
  })
})

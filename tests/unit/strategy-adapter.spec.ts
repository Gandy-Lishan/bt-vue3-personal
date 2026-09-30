import { describe, expect, it } from 'vitest'
import {
  matchesStrategyScope,
  normalizeStrategySignalRows,
  normalizeStrategySummaryRows,
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
})

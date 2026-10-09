import { describe, expect, it } from 'vitest'
import {
  normalizeStrategyBasketAutoCandidates,
  normalizeStrategyBasketList,
  normalizeStrategyBasketRunResult,
  strategyBasketSubmitPayload,
} from '@/entities/strategy/model/strategy.basket'
import type { StrategySignalRow } from '@/entities/strategy/model/strategy.types'

const signals: StrategySignalRow[] = [
  {
    id: 'dual_trend_model',
    modelName: 'Dual Trend Model',
    url: 'dual_trend_model',
    category: 'Legacy',
    timeFrame: 'Daily',
    currentSignal: 'Long SPY',
    lastSignalDate: '2026-09-17',
    lastSignalTimestamp: 1,
    frequency: 'Daily',
    ytdReturn: 1,
    cagr: 2,
    favorite: false,
    currentDay: false,
    updated: '',
    raw: {},
  },
  {
    id: 'multi_index_trading_model',
    modelName: 'Multi-Index Trading Model',
    url: 'multi_index_trading_model',
    category: 'Legacy',
    timeFrame: 'Daily',
    currentSignal: 'Long SPY',
    lastSignalDate: '2026-09-17',
    lastSignalTimestamp: 1,
    frequency: 'Daily',
    ytdReturn: 1,
    cagr: 2,
    favorite: false,
    currentDay: false,
    updated: '',
    raw: {},
  },
]

describe('strategy basket model', () => {
  it('normalizes saved basket records and enriches allocations from strategy signals', () => {
    const result = normalizeStrategyBasketList(
      {
        count: 1,
        results: [
          {
            url: 'basket-1',
            name: 'My Basket',
            status: 'finish',
            cash: '1000000',
            total_return: '12.34',
            std_dev: '8.9',
            max_risk: '20.5',
            avg_win: '2.1',
            avg_loss: '-1.3',
            median_return: '0.7',
            total_trades: '42',
            total_positive: '27',
            total_negative: '15',
            strategy_combination: JSON.stringify([{ strategy: 'Dual Trend Model', percent: '40' }]),
          },
        ],
      },
      signals,
    )

    expect(result.count).toBe(1)
    expect(result.records[0]).toMatchObject({
      name: 'My Basket',
      status: 'Finish',
      totalReturn: 12.34,
      stdDev: 8.9,
      maxRisk: 20.5,
      avgWin: 2.1,
      avgLoss: -1.3,
      medianReturn: 0.7,
      totalTrades: 42,
      totalPositive: 27,
      totalNegative: 15,
    })
    expect(result.records[0].strategyCombination[0]).toMatchObject({
      modelName: 'Dual Trend Model',
      url: 'dual_trend_model',
      category: 'Legacy',
      percent: 40,
    })
  })

  it('normalizes auto basket candidates from legacy JSON strings', () => {
    const candidates = normalizeStrategyBasketAutoCandidates(
      {
        code: 200,
        data: [JSON.stringify([{ model_name: 'Dual Trend Model', model: 'dual_trend_model', percent: 50 }])],
      },
      signals,
    )

    expect(candidates).toHaveLength(1)
    expect(candidates[0].allocations[0]).toMatchObject({
      modelName: 'Dual Trend Model',
      url: 'dual_trend_model',
      percent: 50,
    })
  })

  it('ignores legacy empty allocation placeholders and matches hyphenated strategy names', () => {
    const result = normalizeStrategyBasketList(
      {
        count: 1,
        results: [
          {
            url: 'basket-legacy',
            name: 'Legacy Basket',
            strategy_combination: JSON.stringify([
              {},
              { strategy: 'Multi Index Trading Model', percent: '50' },
            ]),
          },
        ],
      },
      signals,
    )

    expect(result.records[0].strategyCombination).toHaveLength(1)
    expect(result.records[0].strategyCombination[0]).toMatchObject({
      modelName: 'Multi-Index Trading Model',
      url: 'multi_index_trading_model',
      percent: 50,
    })
  })

  it('builds the legacy portfolio submit payload', () => {
    const payload = strategyBasketSubmitPayload({
      name: 'My Basket',
      startDate: '2006-07-01',
      endDate: '2026-10-08',
      cash: '1000000',
      auto: true,
      allocations: [
        {
          id: 'row-1',
          strategy: 'Dual Trend Model',
          modelName: 'Dual Trend Model',
          url: 'dual_trend_model',
          model: 'CASH',
          category: 'Legacy',
          percent: 40,
        },
      ],
    })

    expect(payload).toMatchObject({
      name: 'My Basket',
      start_date: '2006-07-01',
      end_date: '2026-10-08',
      cash: '1000000',
      auto_portfolio: 'True',
    })
    expect(JSON.parse(payload.strategy_combination)).toEqual([
      { strategy: 'Dual Trend Model', model: 'CASH', percent: 40 },
    ])
  })

  it('normalizes run results with summary holdings and historical strategy details', () => {
    const result = normalizeStrategyBasketRunResult(
      {
        code: 200,
        data: {
          row: { url: 'basket-1', name: 'My Basket', status: 'finish' },
          portfolio_details: {
            CAGR: '12.5',
            portfolio_details: JSON.stringify([
              {
                Symbol: 'SPY',
                'Entry Price': '500',
                Strategy: ['Dual Trend Model'],
              },
            ]),
          },
          strategy_details: JSON.stringify([
            {
              model: 'dual_trend_model',
              model_name: 'Dual Trend Model',
              symbol_not_long: 'SPY',
              CAGR: '12.5',
              benchmark_CAGR: '9.1',
              max_drawdown: '-15.2',
              net_profit_pct: '120',
              profit_loss_ratio: '-1',
              trade_table_outfile: 'https://example.com/trades.png',
              returns_outfile: 'https://example.com/returns.png',
              drawdown_outfile: 'https://example.com/drawdown.png',
              heatmap_outfile: 'https://example.com/heatmap.png',
              annual_returns_outfile: 'https://example.com/annual.png',
            },
          ]),
        },
      },
      signals,
    )

    expect(result.metrics.CAGR).toBe('12.5')
    expect(result.holdings[0].Symbol).toBe('SPY')
    expect(result.strategyDetails[0]).toMatchObject({
      model: 'dual_trend_model',
      modelName: 'Dual Trend Model',
      symbolNotLong: 'SPY',
      cagr: 12.5,
      benchmarkCagr: 9.1,
      maxDrawdown: -15.2,
      netProfit: 120,
      profitLossRatio: 'Low risk',
      tradeTableUrl: 'https://example.com/trades.png',
      returnsUrl: 'https://example.com/returns.png',
      drawdownUrl: 'https://example.com/drawdown.png',
      heatmapUrl: 'https://example.com/heatmap.png',
      annualReturnsUrl: 'https://example.com/annual.png',
    })
  })
})

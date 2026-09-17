import type { BacktestRun } from './backtest.types'

export const seededBacktestRuns: BacktestRun[] = [
  {
    id: 'bt-1048',
    name: 'Momentum Rotation',
    market: 'US Equities',
    status: 'completed',
    annualReturn: 18.6,
    maxDrawdown: -7.4,
  },
  {
    id: 'bt-1049',
    name: 'Volatility Breakout',
    market: 'Futures',
    status: 'running',
    annualReturn: 12.1,
    maxDrawdown: -4.9,
  },
  {
    id: 'bt-1050',
    name: 'Mean Reversion Basket',
    market: 'ETF',
    status: 'queued',
    annualReturn: 9.3,
    maxDrawdown: -3.6,
  },
]

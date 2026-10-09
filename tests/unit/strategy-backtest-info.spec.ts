import { describe, expect, it } from 'vitest'
import { findStrategyBacktestInfoByName } from '@/entities/strategy/model/strategy.backtest-info'

describe('strategy backtest info', () => {
  it('finds static backtest payloads by strategy name and extracts entry/exit descriptions', () => {
    const info = findStrategyBacktestInfoByName('Alternating Between Stocks and Gold Model')

    expect(info).toMatchObject({
      name: 'Alternating Between Stocks and Gold Model',
      strategy: 'Dual',
      symbols: 'GLD / SPY',
      benchmark: 'SPY',
      frequency: 'Daily',
    })
    expect(info?.groups).toHaveLength(2)
    expect(info?.groups[0].entries[0]).toContain('Alternate Stocks Gold Model')
    expect(info?.groups[0].exits.join(' ')).toContain('Alternate Stocks Gold Model')
    expect(info?.groups[1].entries[0]).toContain('Alternate Stocks Gold Model')
  })
})

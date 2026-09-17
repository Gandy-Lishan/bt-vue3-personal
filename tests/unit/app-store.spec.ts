import { setActivePinia, createPinia } from 'pinia'
import { describe, expect, it, beforeEach } from 'vitest'
import { useBacktestStore } from '@/entities/backtest/model/backtest.store'

describe('backtest store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('calculates the average annual return for seeded runs', () => {
    const store = useBacktestStore()

    expect(store.averageAnnualReturn).toBe(13.3)
  })

  it('filters running backtests', () => {
    const store = useBacktestStore()

    expect(store.runningRuns).toHaveLength(1)
    expect(store.runningRuns[0].name).toBe('Volatility Breakout')
  })
})

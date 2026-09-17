import { defineStore } from 'pinia'
import { seededBacktestRuns } from './backtest.fixtures'

export const useBacktestStore = defineStore('backtest', {
  state: () => ({
    activeWorkspace: 'BacktestEdge',
    runs: seededBacktestRuns,
  }),
  getters: {
    completedRuns: (state) => state.runs.filter((run) => run.status === 'completed'),
    runningRuns: (state) => state.runs.filter((run) => run.status === 'running'),
    averageAnnualReturn: (state) => {
      const total = state.runs.reduce((sum, run) => sum + run.annualReturn, 0)
      return Number((total / state.runs.length).toFixed(1))
    },
  },
})

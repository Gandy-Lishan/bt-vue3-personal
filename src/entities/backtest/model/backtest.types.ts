export type BacktestStatus = 'queued' | 'running' | 'completed'

export interface BacktestRun {
  id: string
  name: string
  market: string
  status: BacktestStatus
  annualReturn: number
  maxDrawdown: number
}

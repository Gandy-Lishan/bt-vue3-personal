export type MyScreenDirection = 'Long' | 'Short'
export type MyScreenMode = 'criteria' | 'pattern'

export interface MyScreenCondition {
  signal: string
  condition: number
  value: string
  date: number
}

export interface MyScreenRow {
  id: string
  url: string
  name: string
  category: string
  direction: MyScreenDirection
  description: string[]
  conditions: MyScreenCondition[]
  relation: number
  dates: number[]
  tickers: string[]
  systemPattern: string
  lastSignalDate: string
  favorite: boolean
  raw: Record<string, unknown>
}

export interface MyScreenRunResult {
  code: number
  message: string
  url: string
  rows: Record<string, unknown>[]
  entryTemplate: Record<string, unknown>
  raw: Record<string, unknown>
}

export interface MyScreenSubmitPayload {
  name: string
  category: string
  direction: MyScreenDirection
  relation: number
  score: number
  start_date: string
  end_date: string
  signals: string
  description: string
  dates: string
  sector_lists?: string
  system_pattern?: string
}

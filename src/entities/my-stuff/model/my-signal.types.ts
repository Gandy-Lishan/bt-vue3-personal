export type MySignalListKind = 'mine' | 'library'

export interface MySignalRow {
  id: string
  url: string
  name: string
  symbol: string
  timeframe: string
  description: string
  lastSignalDate: string
  barsSinceSignal: number | null
  currentReturn: number | null
  category: string
  raw: Record<string, unknown>
}


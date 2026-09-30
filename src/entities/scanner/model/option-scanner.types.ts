export const OPTION_SCANNER_PAGE_SIZE = 10

export type OptionScannerSortDirection = 'asc' | 'desc'

export type OptionScannerSortKey =
  | 'symbol'
  | 'lastClose'
  | 'expireDate'
  | 'dte'
  | 'strike'
  | 'breakEven'
  | 'probabilityOfProfit'
  | 'credit'
  | 'margin'
  | 'returnPercent'
  | 'expectedValueScore'
  | 'cagr'

export type OptionScannerRangeKey = 'volume' | 'openInterest' | 'impliedVolatility' | 'delta' | 'vega'

export interface OptionScannerRange {
  min: number | null
  max: number | null
}

export interface OptionScannerRangeDefinition {
  key: OptionScannerRangeKey
  label: string
  suffix?: string
  step?: string
}

export interface OptionScannerRow {
  id: string
  symbol: string
  lastClose: number | null
  expireDate: string
  expireTimestamp: number | null
  dte: number | null
  strike: number | null
  breakEven: number | null
  probabilityOfProfit: number | null
  credit: number | null
  margin: number | null
  returnPercent: number | null
  expectedValueScore: number | null
  cagr: number | null
  volume: number | null
  openInterest: number | null
  impliedVolatility: number | null
  delta: number | null
  vega: number | null
  contractSymbol: string
  tradeDate: string
  scanDate: string
  earningsDate: string
  raw: Record<string, unknown>
}

import type { IndicatorSortDirection } from '@/entities/indicator/model/indicator.types'

export type CpmSectionKey = 'list' | 'results' | 'symbol' | 'asset' | 'pattern' | 'transmission'

export type CpmStatus = 'Finish' | 'Running' | 'Fail' | 'Unknown'

export interface CpmBacktestRawRow extends Record<string, unknown> {
  url?: string
  name?: string
  symbol?: string
  timeframe?: string
  start_date?: string
  end_date?: string
  status?: string
  bars_num?: unknown
  total_trades?: unknown
  total_return?: unknown
  create_date?: string
}

export interface CpmBacktestRow {
  id: string
  url: string
  name: string
  symbol: string
  timeframe: string
  startDate: string
  endDate: string
  period: string
  status: CpmStatus
  barsNumber: number | null
  totalTrades: number | null
  totalReturn: number | null
  createdAt: string
  raw: CpmBacktestRawRow
}

export interface CpmListResult {
  count: number
  rows: CpmBacktestRow[]
}

export interface CpmSortOption {
  key: CpmSortKey
  label: string
  kind: 'text' | 'number' | 'date'
}

export type CpmSortKey =
  | 'name'
  | 'symbol'
  | 'timeframe'
  | 'status'
  | 'barsNumber'
  | 'totalTrades'
  | 'totalReturn'
  | 'createdAt'

export type CpmSortDirection = IndicatorSortDirection

export interface CpmListRequest {
  page?: number
  ordering?: string
  name?: string
  signal?: AbortSignal
}

export interface CpmCorrelationPayload extends Record<string, string | number | boolean | null | undefined> {}

export interface CpmCorrelationResult {
  code: number | null
  message: string
  data: Record<string, unknown>
  matrixRows: Array<Record<string, unknown>>
  seriesRows: Array<Record<string, unknown>>
}

export interface CpmPatternPreviewRequest {
  symbol: string
  startDate: string
  endDate: string
}

export interface CpmRecentDataRow extends Record<string, unknown> {
  Date?: string
  close?: unknown
  percent_change?: unknown
}

export interface CpmPatternPreviewPoint {
  date: string
  timestamp: number
  close: number | null
  normalizedReturn: number
}

export interface CpmPatternPreviewResult {
  symbol: string
  points: CpmPatternPreviewPoint[]
  message: string
}

/**
 * ScannerQuoteFeed — simplified quote feed for Smart Scanner
 *
 * Unlike STStockDataFeed (which calls the API), this one consumes chartRows
 * data directly from the SmartScannerBacktestDetail. No API calls needed
 * because the data is already loaded in the parent component.
 */

import type { SmartScannerBacktestDetail, SmartScannerChartPoint } from '@/entities/scanner/model/smart-scanner.types'

export interface ScannerQuote {
  DT: string | number
  Open?: number
  High?: number
  Low?: number
  Close?: number
  Volume?: number
  [key: string]: unknown
}

/**
 * Convert chartRows from SmartScannerBacktestDetail to ChartIQ quote format.
 *
 * chartRows have: { date, price, indicator }
 * ChartIQ quotes need: { DT, Open, High, Low, Close, Volume? }
 */
export function chartRowsToQuotes(
  rows: SmartScannerChartPoint[],
): ScannerQuote[] {
  const numeric = rows.filter(
    (row): row is SmartScannerChartPoint & { price: number } => row.price !== null,
  )

  if (!numeric.length) return []

  // For Smart Scanner we have price-only data (line chart)
  // Set Open/High/Low = Close to render as a line
  return rows.map((row) => {
    const quote: ScannerQuote = {
      DT: row.date ?? '',
      Open: row.price ?? undefined,
      High: row.price ?? undefined,
      Low: row.price ?? undefined,
      Close: row.price ?? undefined,
    }

    if (row.indicator !== null && row.indicator !== undefined) {
      // Attach indicator value as a custom field
      quote._scannerIndicator = row.indicator
    }

    if (row.volume) {
      quote.Volume = row.volume
    }

    return quote
  })
}

/**
 * Create a quote feed object that ChartIQ can consume.
 *
 * Usage:
 *   const feed = createScannerQuoteFeed(detail)
 *   config.quoteFeed = feed
 */
export function createScannerQuoteFeed(detail: SmartScannerBacktestDetail | null) {
  const quotes = chartRowsToQuotes(detail?.chartRows ?? [])

  return {
    /**
     * Initial data fetch — return all quotes at once.
     * ChartIQ will call this when the chart is created.
     */
    fetchInitialData(
      _symbol: string,
      startDate: Date,
      endDate: Date,
      _params: Record<string, unknown>,
      cb: (data: { quotes: ScannerQuote[]; moreAvailable: boolean; upToDate: boolean }) => void,
    ) {
      // Filter quotes within date range
      const filtered = quotes.filter((q) => {
        const dt = typeof q.DT === 'string' ? new Date(q.DT) : new Date(q.DT as number)
        return dt >= startDate && dt <= endDate
      })

      cb({
        quotes: filtered,
        moreAvailable: false,
        upToDate: true,
      })
    },

    /**
     * Update fetch — not needed for static backtest data.
     */
    fetchUpdateData(
      _symbol: string,
      _lastDate: Date,
      _params: Record<string, unknown>,
      cb: (data: { quotes: ScannerQuote[] }) => void,
    ) {
      cb({ quotes: [] })
    },

    /**
     * Pagination fetch — not needed for static backtest data.
     */
    fetchPaginationData(
      _symbol: string,
      _suggestedStart: Date,
      _endDate: Date,
      _params: Record<string, unknown>,
      cb: (data: { quotes: ScannerQuote[]; moreAvailable: boolean; upToDate: boolean }) => void,
    ) {
      cb({
        quotes: [],
        moreAvailable: false,
        upToDate: true,
      })
    },
  }
}

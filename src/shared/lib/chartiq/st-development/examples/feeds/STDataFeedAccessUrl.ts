/**
 * STDataFeedAccessUrl stub
 *
 * Original Vue2 project held API endpoint configuration here.
 * These endpoints are used by myIndicatorChartControl.js and loadIndicator.js.
 * Replace with real API URLs when migrating MyIndicator pages.
 */

const apiBase = import.meta.env.VITE_API_BASE_URL || ''

export const config = {
  indicatorMetadata: `${apiBase}/indicator-metadata`,
  pairData: `${apiBase}/pair-data`,
  symbolCsv: `${apiBase}/symbol-csv`,

  /**
   * Convert a timestamp (ms) to YYYY-MM-DD string.
   */
  timestampToTime(timestamp: number | string | Date): string {
    const date = new Date(timestamp)
    const Y = date.getFullYear()
    const M = String(date.getMonth() + 1).padStart(2, '0')
    const D = String(date.getDate()).padStart(2, '0')
    return `${Y}-${M}-${D}`
  },
}

/**
 * Marker utilities for ChartIQ backtest markers.
 *
 * Adapted from st-development/examples/markers/markersSample.js (Vue2 project).
 * Used to draw buy/sell markers on the chart from backtest trade data.
 */

// Inline type to avoid dependency on deleted types.ts
type CIQChartEngine = Record<string, unknown> & {
  layout?: Record<string, unknown>
  draw?: () => void
}

export interface BacktestTrade {
  entryDate: string
  exitDate: string
  entryPrice?: number
  exitPrice?: number
  exitReason?: string
  [key: string]: unknown
}

/**
 * Color scheme for backtest markers.
 */
const MARKER_COLORS = {
  buy: '#1afa29',       // green triangle pointing up
  sell_profit: '#1afa29', // green diamond (profitable exit)
  sell_loss: '#d81e06',   // red diamond (loss exit)
  // Dual symbol markers
  buy_2: '#92d2cc',
  sell_2_profit: '#92d2cc',
  sell_2_loss: '#ff5290',
}

/**
 * Add backtest trade markers to the chart.
 *
 * @param stx - ChartIQ chart engine instance
 * @param trades - Array of backtest trades with entryDate/exitDate
 * @param symbolIndex - 1 or 2 for dual-symbol mode
 */
export function addBacktestMarkers(
  stx: CIQChartEngine,
  trades: BacktestTrade[],
  symbolIndex: 1 | 2 = 1,
) {
  if (!stx || !trades.length) return

  const suffix = symbolIndex === 2 ? '_2' : ''

  for (const trade of trades) {
    // Entry marker (buy)
    if (trade.entryDate) {
      const entryMarker = {
        type: 'triangle',
        DT: trade.entryDate,
        name: `BUY${suffix ? ' 2' : ''}`,
        color: MARKER_COLORS[`buy${suffix}` as keyof typeof MARKER_COLORS],
        orientation: 'up',
        label: 'B',
      }
      stx.layout.markerSet = stx.layout.markerSet || {}
      stx.layout.markerSet[`entry_${trade.entryDate}_${symbolIndex}`] = entryMarker
    }

    // Exit marker (sell — color depends on profit/loss if prices available)
    if (trade.exitDate) {
      const hasPrices = trade.exitPrice !== undefined && trade.entryPrice !== undefined
      const isProfit = hasPrices ? trade.exitPrice >= trade.entryPrice : true // default green if no price data
      const exitColor = isProfit
        ? MARKER_COLORS[`sell_profit${suffix}` as keyof typeof MARKER_COLORS] ?? MARKER_COLORS.sell_profit
        : MARKER_COLORS[`sell_loss${suffix}` as keyof typeof MARKER_COLORS] ?? MARKER_COLORS.sell_loss

      const exitMarker = {
        type: 'diamond',
        DT: trade.exitDate,
        name: `SELL${suffix ? ' 2' : ''}`,
        color: exitColor,
        label: 'S',
      }
      stx.layout.markerSet = stx.layout.markerSet || {}
      stx.layout.markerSet[`exit_${trade.exitDate}_${symbolIndex}`] = exitMarker
    }
  }

  // Redraw chart to show markers
  stx.draw()
}

/**
 * Remove all backtest markers from the chart.
 */
export function removeBacktestMarkers(
  stx: CIQChartEngine,
  symbolIndex: 1 | 2 = 1,
) {
  if (!stx?.layout?.markerSet) return

  const keysToRemove = Object.keys(stx.layout.markerSet).filter(
    (key) => key.endsWith(`_${symbolIndex}`),
  )

  for (const key of keysToRemove) {
    delete stx.layout.markerSet[key]
  }

  stx.draw()
}

/**
 * Set marker visibility by type (buy/sell/buy_2/sell_2).
 *
 * This is the Vue3 adaptation of the original CIQ.setMarkerVisibility function.
 * It toggles CSS display property on marker DOM elements.
 */
export function setMarkerVisibility(type: string) {
  const markers = document.querySelectorAll(`.stx-marker, .trade-${type.toLowerCase().replace('_', '-')}`)
  const firstMarker = markers[0] as HTMLElement | undefined
  if (!firstMarker) return

  const currentDisplay = firstMarker.style.display
  const newDisplay = currentDisplay === 'none' ? 'block' : 'none'

  markers.forEach((marker) => {
    ;(marker as HTMLElement).style.display = newDisplay
  })
}

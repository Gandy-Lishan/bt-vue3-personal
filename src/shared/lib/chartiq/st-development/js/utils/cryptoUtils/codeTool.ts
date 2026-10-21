/**
 * SignalCode stub
 *
 * Original Vue2 project encoded/decoded technical indicator strings here.
 * Used by myIndicatorChartControl.js for Technical category MyIndicators.
 * Replace with real codec when migrating MyIndicator pages.
 */

export default class SignalCode {
  encode(input: Record<string, unknown>): string {
    console.warn('[ChartIQ stub] SignalCode.encode called:', input)
    return ''
  }

  decode(code: string): Record<string, unknown> {
    console.warn('[ChartIQ stub] SignalCode.decode called:', code)
    return { indicator: '' }
  }
}

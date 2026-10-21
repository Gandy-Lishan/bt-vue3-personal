/**
 * SignalCode stub
 *
 * Original Vue2 project had @/utils/cryptoUtils/codeTool.js.
 * Used by myIndicatorChartControl.js for Technical category MyIndicators.
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

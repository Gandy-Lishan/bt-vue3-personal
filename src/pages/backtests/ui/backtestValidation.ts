export type NumericField = 'capital' | 'commission' | 'slippage' | 'excludeOO' | 'takeProfit' | 'stopLoss' | 'timeInMarket'

export function trimTwoDecimals(value: string): string {
  return /^\d+\.\d{3,}$/.test(value) ? value.replace(/(\.\d{2})\d+$/, '$1') : value
}

export function validateNumeric(field: NumericField, value: string): string {
  if (!value && ['takeProfit', 'stopLoss', 'timeInMarket'].includes(field)) return ''
  if (!value) return field === 'capital' ? 'Please input starting capital' : `Please input ${field}`
  if (field === 'excludeOO' || field === 'timeInMarket') {
    if (!/^\d+$/.test(value) || Number(value) < (field === 'excludeOO' ? 0 : 1)) return field === 'excludeOO' ? 'Enter a non-negative integer.' : 'Enter positive integers only.'
    return ''
  }
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return 'Enter a positive number with up to two decimals'
  const amount = Number(value)
  if (field === 'capital' && amount < 1000) return 'Enter a positive number over 1000, with up to two decimals'
  if (field === 'commission' && amount > 5) return 'Enter a positive number under 5, with up to two decimals'
  if ((field === 'takeProfit' || field === 'stopLoss') && amount <= 0) return 'Only positive numbers are allowed'
  return ''
}

import { formValueText } from '@/shared/utils/form-value'

export interface SymbolConditionFields {
  symbolField: string
  symbolCalculation: number
  symbolPeriod: string | number
  symbolOperator: number
  symbolValue: string | number
}

export interface SerializedSymbolCondition {
  analysis: 'Symbol'
  ticker: string
  indicator: string
  comparison: 'SV'
  condition: number
  newCondition: number
  conditionPeriod: string
  value: number
}

export const symbolConditions = [
  { value: 0, obj: { label: 'Symbol Open', field: 'Open' }, description: 'Opening price' },
  { value: 1, obj: { label: 'Symbol High', field: 'High' }, description: 'Highest price' },
  { value: 2, obj: { label: 'Symbol Low', field: 'Low' }, description: 'Lowest price' },
  { value: 3, obj: { label: 'Symbol Close', field: 'Close' }, description: 'Closing price' },
  { value: 4, obj: { label: 'Symbol Volume', field: 'Volume' }, description: 'Trading volume' },
  { value: 5, obj: { label: 'Symbol Ratio', field: 'Ratio' }, description: 'Symbol price ratio' },
] as const

export const symbolCalculationOptions = [
  { value: 0, label: 'Above (>)', short: 'is above' },
  { value: 1, label: 'Equals (=)', short: 'equals' },
  { value: 2, label: 'Below (<)', short: 'is below' },
  { value: 3, label: 'Crosses above', short: 'crosses above' },
  { value: 4, label: 'Crosses below', short: 'crosses below' },
  { value: 5, label: 'Rate of Change', short: 'ROC' },
  { value: 6, label: '% of Previous Range', short: 'OPR' },
  { value: 7, label: 'MA Ratio', short: 'MAR' },
  { value: 8, label: 'Range Rank', short: 'RR' },
  { value: 9, label: 'DrawDown %', short: 'DD' },
  { value: 10, label: 'DrawUp %', short: 'DU' },
  { value: 11, label: 'Net Change', short: 'NC' },
  { value: 12, label: 'All-time High', short: 'ATH' },
  { value: 13, label: 'All-time Low', short: 'ATL' },
  { value: 14, label: 'Consecutive Bars Above', short: 'CNDA' },
  { value: 15, label: 'Consecutive Bars Below', short: 'CNDB' },
  { value: 16, label: 'N-Bars High', short: 'NH' },
  { value: 17, label: 'N-Bars Low', short: 'NL' },
  { value: 18, label: 'N-Bars Ago', short: 'NA' },
] as const

export const symbolOperatorOptions = symbolCalculationOptions.slice(0, 5)

export function resetSymbolFields(target: SymbolConditionFields) {
  Object.assign(target, { symbolField: 'Symbol Close', symbolCalculation: 3, symbolPeriod: '21', symbolOperator: 3, symbolValue: '' })
}

export function symbolConditionComplete(condition: SymbolConditionFields) {
  if (!condition.symbolField) return false
  if (!/^-?(?:\d+|\d*\.\d{1,4})$/.test(formValueText(condition.symbolValue))) return false
  if (condition.symbolCalculation < 5 || condition.symbolCalculation === 12 || condition.symbolCalculation === 13) return true
  const period = Number(condition.symbolPeriod)
  if (!(period > 0)) return false
  return [14, 15].includes(condition.symbolCalculation) || Number.isInteger(period)
}

export function symbolConditionSentence(ticker: string, condition: SymbolConditionFields) {
  const calculation = symbolCalculationOptions.find((item) => item.value === condition.symbolCalculation)
  const operator = symbolOperatorOptions.find((item) => item.value === condition.symbolOperator)?.short ?? 'compares with'
  const name = `${ticker || 'Choose a symbol'} ${condition.symbolField || 'OHLCV field'}`
  if (condition.symbolCalculation <= 4) return `${name} ${calculation?.short ?? ''} ${condition.symbolValue || 'a value'}.`
  const period = [12, 13].includes(condition.symbolCalculation) ? '' : `(${condition.symbolPeriod || '—'})`
  return `${name} ${calculation?.short ?? ''}${period} ${operator} ${condition.symbolValue || 'a value'}.`
}

export function serializeSymbolCondition(ticker: string, condition: SymbolConditionFields): SerializedSymbolCondition {
  return {
    analysis: 'Symbol', ticker, indicator: condition.symbolField, comparison: 'SV',
    condition: condition.symbolCalculation <= 4 ? condition.symbolCalculation : condition.symbolOperator,
    newCondition: condition.symbolCalculation,
    conditionPeriod: String(condition.symbolPeriod),
    value: Number(condition.symbolValue),
  }
}

import { describe, expect, it } from 'vitest'
import {
  serializeSymbolCondition,
  symbolConditionComplete,
  symbolConditionSentence,
  symbolConditions,
  type SymbolConditionFields,
} from '@/entities/my-stuff/model/symbol-condition'

function condition(overrides: Partial<SymbolConditionFields> = {}): SymbolConditionFields {
  return { symbolField: 'Symbol Close', symbolCalculation: 3, symbolPeriod: '21', symbolOperator: 3, symbolValue: '100', ...overrides }
}

describe('Symbol OHLCV conditions', () => {
  it('provides all six legacy Symbol fields', () => {
    expect(symbolConditions.map((item) => item.obj)).toEqual([
      { label: 'Symbol Open', field: 'Open' },
      { label: 'Symbol High', field: 'High' },
      { label: 'Symbol Low', field: 'Low' },
      { label: 'Symbol Close', field: 'Close' },
      { label: 'Symbol Volume', field: 'Volume' },
      { label: 'Symbol Ratio', field: 'Ratio' },
    ])
  })

  it('keeps the direct comparison as both condition values', () => {
    expect(serializeSymbolCondition('SPY', condition())).toMatchObject({
      analysis: 'Symbol', ticker: 'SPY', indicator: 'Symbol Close', comparison: 'SV', condition: 3, newCondition: 3, value: 100,
    })
  })

  it('serializes a derived calculation with its own final comparison', () => {
    expect(serializeSymbolCondition('QQQ', condition({ symbolField: 'Symbol Volume', symbolCalculation: 5, symbolPeriod: '10', symbolOperator: 0, symbolValue: '2.5' }))).toMatchObject({
      ticker: 'QQQ', indicator: 'Symbol Volume', condition: 0, newCondition: 5, conditionPeriod: '10', value: 2.5,
    })
  })

  it('validates periods and threshold precision using the legacy rules', () => {
    expect(symbolConditionComplete(condition({ symbolCalculation: 5, symbolPeriod: '2.5' }))).toBe(false)
    expect(symbolConditionComplete(condition({ symbolCalculation: 14, symbolPeriod: '2.5' }))).toBe(true)
    expect(symbolConditionComplete(condition({ symbolValue: '1.23456' }))).toBe(false)
  })

  it('builds a readable derived-condition preview', () => {
    expect(symbolConditionSentence('SPY', condition({ symbolCalculation: 5, symbolPeriod: '10', symbolOperator: 3 }))).toBe('SPY Symbol Close ROC(10) crosses above 100.')
  })
})

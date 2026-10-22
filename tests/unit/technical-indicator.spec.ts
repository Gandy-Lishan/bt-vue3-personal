import { describe, expect, it } from 'vitest'
import {
  findTechnicalIndicator,
  resetTechnicalFields,
  serializeTechnicalCondition,
  technicalConditionComplete,
  technicalConditionSentence,
  type TechnicalConditionFields,
} from '@/entities/my-stuff/model/technical-indicator'

function condition(): TechnicalConditionFields {
  return {
    technicalClass: '', technicalMode: '', technicalOperator: 3, technicalValue: '',
    technicalLeft: 'SC', technicalRight: '', technicalMaType: 'SMA',
    technicalFastPeriod: '5', technicalSlowPeriod: '21',
  }
}

describe('technical indicator conditions', () => {
  it('maps catalog entries to their legacy form class', () => {
    expect(findTechnicalIndicator('macd')?.class).toBe('MACD_like')
    expect(findTechnicalIndicator('Bollinger Bands')?.class).toBe('BollingerBands_like')
    expect(findTechnicalIndicator('rsi')?.class).toBe('CCI_like')
  })

  it('resets class-specific defaults when the selected indicator family changes', () => {
    const value = condition()
    resetTechnicalFields(value, 'Stochastics_like')
    expect(value).toMatchObject({ technicalClass: 'Stochastics_like', technicalMode: 'k-value', technicalOperator: 3 })
  })

  it('serializes special MACD modes to the legacy backend contract', () => {
    const value = condition()
    resetTechnicalFields(value, 'MACD_like')
    value.technicalMode = 'signal'
    value.technicalOperator = 4

    expect(serializeTechnicalCondition('macd', value)).toMatchObject({
      analysis: 'Technical', indicator: 'macd', ids: 'MACD', comparison: 'MACD', condition: 4, value: 'SL',
    })
    expect(technicalConditionSentence('macd', value)).toContain('signal line')
  })

  it('requires both moving-average periods for an MA-to-MA condition', () => {
    const value = condition()
    resetTechnicalFields(value, 'MovingAverage_like')
    value.technicalMode = 'ma-ma'
    value.technicalSlowPeriod = ''
    expect(technicalConditionComplete(value)).toBe(false)
    value.technicalSlowPeriod = '50'
    expect(technicalConditionComplete(value)).toBe(true)
  })

  it('uses the selected trailing-stop identity instead of the legacy LRF typo', () => {
    const value = condition()
    resetTechnicalFields(value, 'Trailingstop_like')
    expect(serializeTechnicalCondition('PSAR', value)).toMatchObject({ ids: 'PSAR', value: 'PSAR' })
  })
})

import { describe, expect, it } from 'vitest'
import { serializeUserIndicatorCondition, userIndicatorConditionComplete, type UserIndicatorFields } from '@/entities/my-stuff/model/user-indicator'

function condition(overrides: Partial<UserIndicatorFields> = {}): UserIndicatorFields {
  return {
    indicator: 'Breadth Composite', userSource: 'my-indicator', userSourceRef: 'Breadth CompositeCREATE/api/indicator/1', userTimeframe: 'Daily',
    sentimentBasis: 'value', maType: 'S', maPeriod: 21, calculation: 3, calculationPeriod: 21, comparison: 'CrossAbove', value: 50,
    ...overrides,
  }
}

describe('user indicator conditions', () => {
  it('requires the selected or uploaded source reference', () => {
    expect(userIndicatorConditionComplete(condition())).toBe(true)
    expect(userIndicatorConditionComplete(condition({ userSourceRef: '' }))).toBe(false)
  })

  it('serializes a saved My Indicator using the legacy CREATE reference', () => {
    expect(serializeUserIndicatorCondition(condition())).toMatchObject({
      analysis: 'User', formIndicator: 'Breadth CompositeCREATE/api/indicator/1', comparison: 'CrossAbove', period: 1, value: 50,
    })
  })

  it('serializes value versus moving average with the legacy SVMA operand', () => {
    expect(serializeUserIndicatorCondition(condition({
      userSource: 'upload', userSourceRef: 'breadthHASHabc', sentimentBasis: 'valueVsMovingAverage', maType: 'E', maPeriod: 10,
    }))).toMatchObject({ source: 'upload', formIndicator: 'breadthHASHabc', value: 'SVMA', period: 10, maType: 'E' })
  })
})

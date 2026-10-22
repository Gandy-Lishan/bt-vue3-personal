import { hasFormValue } from '@/shared/utils/form-value'

export type UserIndicatorSource = 'my-indicator' | 'upload' | 'defined-dates'

export interface UserIndicatorFields {
  indicator: string
  userSource: UserIndicatorSource
  userSourceRef: string
  userTimeframe: string
  sentimentBasis: 'value' | 'movingAverage' | 'valueVsMovingAverage'
  maType: 'S' | 'E'
  maPeriod: string | number
  calculation: number
  calculationPeriod: string | number
  comparison: string
  value: string | number
}

export function userIndicatorConditionComplete(condition: UserIndicatorFields) {
  if (!condition.indicator.trim() || !condition.userSourceRef.trim()) return false
  if (condition.sentimentBasis !== 'value' && !hasFormValue(condition.maPeriod)) return false
  if (condition.sentimentBasis === 'valueVsMovingAverage') return Boolean(condition.comparison)
  if (condition.calculation > 4 && ![12, 13].includes(condition.calculation) && !hasFormValue(condition.calculationPeriod)) return false
  return Boolean(hasFormValue(condition.value) && (condition.calculation <= 4 || condition.comparison))
}

export function serializeUserIndicatorCondition(condition: UserIndicatorFields) {
  const period = condition.sentimentBasis === 'value' ? 1 : Number(condition.maPeriod)
  const comparison = condition.sentimentBasis === 'movingAverage' ? 'SVMA' : condition.comparison
  const value = condition.sentimentBasis === 'valueVsMovingAverage'
    ? 'SVMA'
    : condition.value
  return {
    analysis: 'User',
    indicator: condition.indicator,
    formIndicator: condition.userSourceRef,
    source: condition.userSource,
    timeframe: condition.userTimeframe,
    comparison,
    value,
    period,
    maType: condition.maType,
    calculation: condition.calculation,
    calculationPeriod: condition.calculationPeriod,
  }
}

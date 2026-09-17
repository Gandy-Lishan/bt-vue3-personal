import type { IndicatorSentiment } from './indicator.types'

export type SentimentTone = 'green' | 'red' | 'neutral'

export interface SentimentMeterCell {
  id: number
  active: boolean
  tone: SentimentTone
  startsOptimisticSide: boolean
}

const sentimentLabels: Record<number, string> = {
  1: 'Extremely Pessimistic',
  2: 'Very Pessimistic',
  3: 'Pessimistic',
  4: 'Neutral',
  5: 'Optimistic',
  6: 'Very Optimistic',
  7: 'Extremely Optimistic',
}

export function normalizeSentimentScore(score: number) {
  if (!Number.isFinite(score)) return 4
  return Math.max(1, Math.min(7, Math.round(score)))
}

export function sentimentFromScore(score: number): IndicatorSentiment {
  const normalized = normalizeSentimentScore(score)
  if (normalized <= 3) return 'pessimistic'
  if (normalized >= 5) return 'optimistic'
  return 'neutral'
}

export function sentimentLabelFromScore(score: number) {
  return sentimentLabels[normalizeSentimentScore(score)]
}

export function sentimentToneFromScore(score: number): SentimentTone {
  const normalized = normalizeSentimentScore(score)
  if (normalized <= 3) return 'green'
  if (normalized >= 5) return 'red'
  return 'neutral'
}

export function sentimentTextClass(score: number) {
  const tone = sentimentToneFromScore(score)
  if (tone === 'green') return 'text-[var(--app-positive)]'
  if (tone === 'red') return 'text-[var(--app-negative)]'
  return 'text-[var(--app-text-secondary)]'
}

export function sentimentMeterCells(score: number): SentimentMeterCell[] {
  const normalized = normalizeSentimentScore(score)

  return Array.from({ length: 6 }, (_, index) => {
    const isLeftSide = index < 3
    const leftSideActive = normalized <= 3 && index >= normalized - 1
    const rightSideActive = normalized >= 5 && index >= 3 && index <= normalized - 2

    return {
      id: index,
      active: isLeftSide ? leftSideActive : rightSideActive,
      tone: normalized <= 3 ? 'green' : normalized >= 5 ? 'red' : 'neutral',
      startsOptimisticSide: index === 3,
    }
  })
}

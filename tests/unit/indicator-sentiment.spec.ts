import { describe, expect, it } from 'vitest'
import {
  sentimentFromScore,
  sentimentLabelFromScore,
  sentimentMeterCells,
} from '@/entities/indicator/model/indicator.sentiment'

function activeCellIndexes(score: number) {
  return sentimentMeterCells(score)
    .filter((cell) => cell.active)
    .map((cell) => cell.id)
}

describe('indicator sentiment scale', () => {
  it('uses six cells with green pessimism, empty neutral, and red optimism', () => {
    expect(activeCellIndexes(1)).toEqual([0, 1, 2])
    expect(activeCellIndexes(2)).toEqual([1, 2])
    expect(activeCellIndexes(3)).toEqual([2])
    expect(activeCellIndexes(4)).toEqual([])
    expect(activeCellIndexes(5)).toEqual([3])
    expect(activeCellIndexes(6)).toEqual([3, 4])
    expect(activeCellIndexes(7)).toEqual([3, 4, 5])
  })

  it('labels and groups the 1-7 sentiment scale', () => {
    expect(sentimentLabelFromScore(1)).toBe('Extremely Pessimistic')
    expect(sentimentLabelFromScore(4)).toBe('Neutral')
    expect(sentimentLabelFromScore(7)).toBe('Extremely Optimistic')
    expect(sentimentFromScore(1)).toBe('pessimistic')
    expect(sentimentFromScore(4)).toBe('neutral')
    expect(sentimentFromScore(7)).toBe('optimistic')
  })
})

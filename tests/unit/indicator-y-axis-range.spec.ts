import { describe, expect, it } from 'vitest'
import { indicatorYAxisRange } from '@/pages/indicators/ui/indicatorYAxisRange'

describe('Indicator detail Y-axis extremes', () => {
  it('starts with the same data scale whether extremes exist or not', () => {
    expect(indicatorYAxisRange([45, 55], [20, 80], false)).toEqual({ min: 44.2, max: 55.8 })
  })

  it('allows an extreme line already inside the data scale without widening it', () => {
    const natural = indicatorYAxisRange([18, 30], [20, 80], false)
    expect(natural).not.toBeNull()
    expect(natural!.min).toBeLessThan(20)
    expect(natural!.max).toBeGreaterThan(20)
    expect(natural!.max).toBeLessThan(80)
  })

  it('widens to both extremes on demand and restores the original scale', () => {
    const natural = indicatorYAxisRange([45, 55], [20, 80], false)
    const expanded = indicatorYAxisRange([45, 55], [20, 80], true)
    expect(expanded!.min).toBeLessThan(20)
    expect(expanded!.max).toBeGreaterThan(80)
    expect(indicatorYAxisRange([45, 55], [20, 80], false)).toEqual(natural)
  })
})

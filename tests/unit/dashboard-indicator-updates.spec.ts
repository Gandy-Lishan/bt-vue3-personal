import { describe, expect, it } from 'vitest'
import { hasMeaningfulIndicatorChange } from '@/pages/dashboard/dashboard-indicator-updates'

describe('dashboard saved indicator updates', () => {
  it.each([
    null,
    undefined,
    '',
    '   ',
    0,
    -0,
    '0',
    '0.00',
    '0.00%',
    '-0.00',
    '-0.00%',
    0.004,
    -0.004,
    '0.004',
    '-0.004%',
  ])('does not count a missing or two-decimal zero change: %j', (value) => {
    expect(hasMeaningfulIndicatorChange(value)).toBe(false)
  })

  it.each([1, -1, '0.01', '-0.01%', '1,234.50'])('counts a visible non-zero change: %j', (value) => {
    expect(hasMeaningfulIndicatorChange(value)).toBe(true)
  })
})

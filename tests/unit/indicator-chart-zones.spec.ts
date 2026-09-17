import { describe, expect, it } from 'vitest'
import { colorZonesFromFlags } from '@/pages/indicators/ui/indicatorChartZones'

const colors = { flagged: '#ff0000', unflagged: '#000000' }

function zones(flags: boolean[], startX = 1) {
  return colorZonesFromFlags(
    flags.map((flagged, index) => ({ x: startX + index, flagged })),
    colors,
  )
}

describe('chart flag zones', () => {
  it('opens one zone at the start for a run that never changes', () => {
    expect(zones([true, true, true])).toEqual([{ value: 1, color: '#ff0000' }])
  })

  it('opens a zone wherever the flag flips', () => {
    // false false | true | false
    expect(zones([false, false, true, false])).toEqual([
      { value: 1, color: '#000000' },
      { value: 3, color: '#ff0000' },
      { value: 4, color: '#000000' },
    ])
  })

  it('does not open a new zone while the flag stays the same', () => {
    // A zone per point would be wasteful — three red points are one red run.
    expect(zones([true, true, true, false])).toHaveLength(2)
  })

  it('alternates on every point when the flag flips every time', () => {
    expect(zones([true, false, true], 10)).toEqual([
      { value: 10, color: '#ff0000' },
      { value: 11, color: '#000000' },
      { value: 12, color: '#ff0000' },
    ])
  })

  it('returns no zones for no points', () => {
    expect(colorZonesFromFlags([], colors)).toEqual([])
  })

  it('starts with an unflagged zone when the first point is false', () => {
    const result = zones([false, true])

    // Highcharts picks the last zone whose value <= x, so an opening unflagged zone is
    // what makes the first point black rather than inheriting the series colour.
    expect(result[0]).toEqual({ value: 1, color: '#000000' })
  })
})

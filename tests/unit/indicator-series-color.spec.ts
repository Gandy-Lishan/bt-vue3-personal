import { describe, expect, it } from 'vitest'
import {
  indicatorLineIndexes,
  seriesColorFallback,
  seriesColorVar,
} from '@/pages/indicators/ui/indicatorSeriesColor'

const noBenchmark = () => false

describe('indicator line indexes', () => {
  it('numbers indicator lines from zero in order', () => {
    const indexes = indicatorLineIndexes(['model_dumb_money', 'model_smart_money'], noBenchmark)

    expect(indexes.get('model_dumb_money')).toBe(0)
    expect(indexes.get('model_smart_money')).toBe(1)
  })

  it('skips benchmark overlays so they do not consume a colour slot', () => {
    const indexes = indicatorLineIndexes(['spx', 'close'], (key) => key === 'spx')

    // Without the skip, `close` would land in the red slot as if it were a second line.
    expect(indexes.has('spx')).toBe(false)
    expect(indexes.get('close')).toBe(0)
  })
})

describe('series colours', () => {
  it('draws the first indicator line blue', () => {
    expect(seriesColorVar(false, 0)).toBe('--app-primary')
  })

  it('draws the second indicator line dark red', () => {
    expect(seriesColorVar(false, 1)).toBe('--app-negative')
  })

  it('never returns the neutral colour for an indicator line', () => {
    // The regression this guards: the first indicator line used to be given the
    // benchmark's neutral colour, so a chart without an overlay lost its colour.
    const colors = [0, 1, 2, 3, 4, 5].map((index) => seriesColorVar(false, index))

    expect(colors).not.toContain('--chart-primary')
  })

  it('keeps benchmark lines neutral wherever they sit', () => {
    expect(seriesColorVar(true, 0)).toBe('--chart-primary')
    expect(seriesColorVar(true, 3)).toBe('--chart-primary')
  })

  it('cycles a fixed palette for third and later lines', () => {
    expect(seriesColorVar(false, 2)).toBe('--app-accent')
    expect(seriesColorVar(false, 3)).toBe('--app-positive')
    expect(seriesColorVar(false, 4)).toBe('--app-primary')
  })

  it('is deterministic, so a redraw never reshuffles the colours', () => {
    const first = [0, 1, 2, 3, 4].map((index) => seriesColorVar(false, index))
    const second = [0, 1, 2, 3, 4].map((index) => seriesColorVar(false, index))

    expect(second).toEqual(first)
  })

  it('gives every colour a hex fallback for when the CSS variable is missing', () => {
    for (const variable of ['--chart-primary', '--app-negative', '--app-accent', '--app-positive']) {
      expect(seriesColorFallback(variable)).toMatch(/^#[0-9a-f]{6}$/i)
    }

    expect(seriesColorFallback('--not-a-real-var')).toBe(seriesColorFallback('--chart-primary'))
  })
})

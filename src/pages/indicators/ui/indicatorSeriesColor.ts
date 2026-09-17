/**
 * Line colours for the detail chart.
 *
 * The first indicator line keeps the neutral chart colour, the second is dark red, and
 * any further lines cycle a fixed palette. Deliberately fixed rather than random: a
 * random colour would re-roll on every redraw — theme switch, date-range change, resize
 * — so the same chart would appear to change colour underneath the user.
 *
 * Benchmark overlays (the market index line) are excluded from the numbering and stay
 * neutral, so an overlay never pushes an indicator line into the red slot.
 */

const neutralLineVar = '--chart-primary'

/** Indicator lines, in order: first blue, second dark red, then a fixed palette. */
const indicatorLineVars = ['--app-primary', '--app-negative', '--app-accent', '--app-positive']

const lineFallbacks: Record<string, string> = {
  [neutralLineVar]: '#111827',
  '--app-primary': '#006cff',
  '--app-negative': '#be123c',
  '--app-accent': '#7c3aed',
  '--app-positive': '#047857',
}

/** Position of each key among the indicator lines, ignoring benchmark overlays. */
export function indicatorLineIndexes(keys: string[], isBenchmark: (key: string) => boolean) {
  const indexes = new Map<string, number>()
  let next = 0

  for (const key of keys) {
    if (isBenchmark(key)) continue
    indexes.set(key, next)
    next += 1
  }

  return indexes
}

export function seriesColorVar(isBenchmark: boolean, indicatorIndex: number) {
  // The neutral colour belongs to the benchmark overlay alone. Returning it for the
  // first indicator line would leave a chart with no overlay looking uncoloured.
  if (isBenchmark) return neutralLineVar

  return indicatorLineVars[indicatorIndex % indicatorLineVars.length]
}

export function seriesColorFallback(variable: string) {
  return lineFallbacks[variable] ?? lineFallbacks[neutralLineVar]
}

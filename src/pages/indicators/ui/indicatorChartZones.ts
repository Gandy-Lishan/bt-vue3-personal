export interface ChartZone {
  /** Zone applies from this x value until the next zone begins. */
  value: number
  color: string
}

/**
 * Turns a per-row flag into Highcharts x-axis zones, which is how a single line gets
 * segment colours: `colorByPoint` cannot do it (Highcharts forces the line stroke to a
 * neutral colour for that option), but zones split the path at each boundary.
 *
 * Each unbroken run of the same flag becomes one zone, starting where the run starts.
 * The final zone needs no end bound — Highcharts extends the last zone indefinitely.
 */
export function colorZonesFromFlags(
  points: Array<{ x: number; flagged: boolean }>,
  colors: { flagged: string; unflagged: string },
): ChartZone[] {
  const zones: ChartZone[] = []
  let current: boolean | null = null

  for (const point of points) {
    if (point.flagged === current) continue

    current = point.flagged
    zones.push({ value: point.x, color: point.flagged ? colors.flagged : colors.unflagged })
  }

  return zones
}

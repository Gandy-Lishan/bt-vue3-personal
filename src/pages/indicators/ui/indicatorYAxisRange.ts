export interface YAxisRange { min: number; max: number }

/** Data owns the initial scale; extremes only widen it when explicitly requested. */
export function indicatorYAxisRange(dataValues: number[], extremes: Array<number | null>, expandToExtremes: boolean): YAxisRange | null {
  const values = dataValues.filter(Number.isFinite)
  if (expandToExtremes) values.push(...extremes.filter((value): value is number => value !== null && Number.isFinite(value)))
  if (!values.length) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = min === max ? Math.max(Math.abs(min) * 0.08, 0.01) : (max - min) * 0.08
  return { min: min - padding, max: max + padding }
}

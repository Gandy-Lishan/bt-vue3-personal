export interface DayMonthResultRow {
  day: number
  averageReturn: number | null
  percentPositive: number | null
}

export interface DayMonthChartPoint {
  label: string
  averageReturn: number | null
  percentPositive: number | null
}

export function resolveDayMonthDomainSize(rows: DayMonthResultRow[], fallbackDomainSize: number) {
  const maxReturnedDay = rows.reduce((maxDay, row) => {
    if (!Number.isInteger(row.day) || row.day <= 0) return maxDay
    return Math.max(maxDay, row.day)
  }, 0)

  if (maxReturnedDay > 0) return maxReturnedDay
  if (!Number.isFinite(fallbackDomainSize) || fallbackDomainSize <= 0) return 0
  return Math.floor(fallbackDomainSize)
}

export function buildDayMonthChartPoints(rows: DayMonthResultRow[], fallbackDomainSize: number): DayMonthChartPoint[] {
  const domainSize = resolveDayMonthDomainSize(rows, fallbackDomainSize)
  const byDay = new Map(
    rows
      .filter((row) => Number.isInteger(row.day) && row.day > 0)
      .map((row) => [row.day, row]),
  )

  return Array.from({ length: domainSize }, (_, index) => {
    const day = index + 1
    const row = byDay.get(day)
    return {
      label: String(day).padStart(2, '0'),
      averageReturn: row?.averageReturn ?? null,
      percentPositive: row?.percentPositive ?? null,
    }
  })
}

export function countPatternBars(dates: string[], start: string, end: string) {
  return dates.filter(date => date >= start && date <= end).length
}

export function legacyPatternStart(dates: string[], end: string, bars: number) {
  let index = dates.length - 1
  while (index >= 0 && dates[index]! > end) index--
  if (index < 0) return ''
  // Preserve the legacy form's end-index minus bar-count convention.
  return dates[Math.max(0, index - bars)] ?? ''
}

export function patternCalendarRangeValid(startA: string, endA: string, startB: string, endB: string) {
  const a = (Date.parse(endA) - Date.parse(startA)) / 86400000
  const b = (Date.parse(endB) - Date.parse(startB)) / 86400000
  const longer = Math.max(a, b)
  const shorter = Math.min(a, b)
  return Number.isFinite(longer) && shorter >= Math.floor(longer * .9) && shorter <= Math.floor(longer * 1.1)
}

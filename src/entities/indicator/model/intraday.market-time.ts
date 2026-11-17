const easternClock = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
const easternOffset = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', timeZoneName: 'shortOffset',
})

/** Regular US equity hours, in Eastern time. */
export function isIntradayMarketOpen(timestamp: number): boolean {
  const parts = Object.fromEntries(easternClock.formatToParts(timestamp).map((part) => [part.type, part.value]))
  if (parts.weekday === 'Sat' || parts.weekday === 'Sun') return false
  const minutes = Number(parts.hour) * 60 + Number(parts.minute)
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60
}

function easternOffsetMinutes(timestamp: number): number {
  const zone = easternOffset.formatToParts(timestamp).find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(zone)
  if (!match) return 0
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0)
  return match[1] === '-' ? -minutes : minutes
}

/** Counts only weekday minutes between 09:30 and 16:00 ET, including DST changes. */
export function intradayMarketElapsedMs(start: number, end: number): number {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  let elapsed = 0
  const firstDay = Math.floor(start / 86_400_000) * 86_400_000 - 86_400_000
  for (let day = firstDay; day <= end + 86_400_000; day += 86_400_000) {
    const weekday = new Date(day).getUTCDay()
    if (weekday === 0 || weekday === 6) continue
    const offset = easternOffsetMinutes(day + 16 * 60 * 60_000)
    const open = day + (9 * 60 + 30 - offset) * 60_000
    const close = day + (16 * 60 - offset) * 60_000
    elapsed += Math.max(0, Math.min(end, close) - Math.max(start, open))
  }
  return elapsed
}

import type { Indicator, IndicatorChartData, IndicatorChartDataRow } from './indicator.types'
import { INDICATOR_PAGE_SIZE } from './indicator.table'

const featuredKey = 'guest-featured-indicators-v1'
const featuredCount = 5

function storedFeaturedIds(): string[] {
  if (typeof sessionStorage === 'undefined') return []
  try {
    const value = JSON.parse(sessionStorage.getItem(featuredKey) || '[]')
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
  } catch { return [] }
}

export function ensureGuestFeaturedIndicators(items: Indicator[]) {
  if (storedFeaturedIds().length || !items.length || items[0]?.sourceList !== 'intraday') return
  const candidates = [...new Set(items.slice(0, INDICATOR_PAGE_SIZE).map((item) => item.id))]
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!]
  }
  sessionStorage.setItem(featuredKey, JSON.stringify(candidates.slice(0, featuredCount)))
}

export function isGuestFeaturedIndicator(id: string) {
  return storedFeaturedIds().includes(id)
}

export function isGuestLockedIndicator(id: string) {
  return !isGuestFeaturedIndicator(id)
}

function rowTimestamp(row: IndicatorChartDataRow) {
  const raw = row.date ?? row.Date ?? row.ds ?? row.timestamp
  if (raw === undefined || raw === null) return null
  const stamp = typeof raw === 'number' ? raw * (raw < 1e11 ? 1000 : 1) : Date.parse(String(raw))
  return Number.isFinite(stamp) ? stamp : null
}

export function guestChartPreview(data: IndicatorChartData, now = new Date()): IndicatorChartData {
  if (!Array.isArray(data)) return []
  const start = new Date(now)
  start.setFullYear(start.getFullYear() - 3)
  const end = new Date(now)
  end.setMonth(end.getMonth() - 3)
  return data.filter((row) => {
    const timestamp = rowTimestamp(row)
    return timestamp !== null && timestamp >= start.getTime() && timestamp < end.getTime()
  })
}

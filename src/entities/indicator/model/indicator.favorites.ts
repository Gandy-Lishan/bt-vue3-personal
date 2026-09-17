import type { Indicator } from './indicator.types'

/**
 * Favorites are stored server-side as two JSON strings inside one object:
 *
 *   { "favorite_indicator": "[{\"url\":\"...\",\"name\":\"...\"}]",
 *     "favorite_symbol":    "[\"SPX\", ...]" }
 *
 * `favorite_symbol` is read-only for this app — nothing here mutates it, so it is kept
 * as the original string and echoed back verbatim on every write.
 */

export interface FavoriteIndicator {
  url: string
  name: string
}

export interface FavoritesPayload {
  indicators: FavoriteIndicator[]
  /** The server's `favorite_symbol` string, byte-for-byte. */
  symbolsRaw: string
}

const emptySymbolsRaw = '[]'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/** The endpoint stringifies each field, but tolerate a real array too. */
function parseJsonString(value: unknown): unknown {
  if (typeof value !== 'string') return value

  const text = value.trim()
  if (!text) return undefined

  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export function parseFavoriteIndicators(value: unknown): FavoriteIndicator[] {
  const parsed = parseJsonString(value)
  if (!Array.isArray(parsed)) return []

  return parsed
    .map((item): FavoriteIndicator | null => {
      if (typeof item === 'string') return { url: item, name: item }
      if (!isRecord(item)) return null

      const url = String(item.url ?? item.chart_url ?? '').trim()
      if (!url) return null

      return { url, name: String(item.name ?? item.chart_name ?? url).trim() || url }
    })
    .filter((item): item is FavoriteIndicator => item !== null)
}

export function parseFavoritesPayload(payload: unknown): FavoritesPayload {
  const record = isRecord(payload) ? payload : {}
  const rawSymbols = record.favorite_symbol

  return {
    indicators: parseFavoriteIndicators(record.favorite_indicator),
    // Keep the exact string when there is one; only synthesize when the field is absent.
    symbolsRaw: typeof rawSymbols === 'string' && rawSymbols.trim() ? rawSymbols : emptySymbolsRaw,
  }
}

export function favoriteIds(indicators: FavoriteIndicator[]): Set<string> {
  return new Set(indicators.map((item) => item.url.toLowerCase()))
}

/**
 * Hover hint and accessible name for a star toggle. Shared so the list and card views
 * cannot drift apart.
 */
export function favoriteActionLabel(isFavorite: boolean) {
  return isFavorite ? 'Remove from favorite indicators' : 'Add to favorite indicators'
}

/**
 * A favorite whose indicator list was never loaded has only a url and a name. Values
 * render as "—" via the non-finite numbers, and the neutral score keeps the sentiment
 * meter from reading as "Extremely Pessimistic".
 */
export function favoriteStubRow(favorite: FavoriteIndicator): Indicator {
  return {
    id: favorite.url,
    name: favorite.name || favorite.url,
    group: '',
    groupId: '',
    subgroup: '',
    sourceList: '',
    timeFrame: '',
    currentValue: Number.NaN,
    change: Number.NaN,
    updatedAt: '',
    sentiment: 'neutral',
    sentimentScore: 4,
    trend: [],
    favorite: true,
    type: 'Indicator',
    raw: { chart_name: favorite.name || favorite.url, url: favorite.url },
  }
}

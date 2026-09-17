import type { FavoriteIndicator } from '../model/indicator.favorites'

/**
 * Ported from the legacy `getFavorite` / `updateFavorite` helpers.
 *
 * The endpoint exchanges two JSON *strings* (not arrays) inside a JSON object, and the
 * write is form-encoded because the legacy client stringified its payload with `mqs`.
 */
const favoritesPath = '/dev/dev/favorites/'

export class FavoriteRequestError extends Error {
  status: number
  path: string

  constructor(status: number, path: string) {
    super(`Favorite request failed: ${status} ${path}`)
    this.name = 'FavoriteRequestError'
    this.status = status
    this.path = path
  }
}

export async function fetchFavorites(signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(favoritesPath, {
    cache: 'no-store',
    credentials: 'include',
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) throw new FavoriteRequestError(response.status, favoritesPath)

  return response.json()
}

/**
 * `symbolsRaw` is the read-only `favorite_symbol` string, echoed back exactly as the
 * server sent it. Re-serializing it here could change key order or escaping.
 */
export async function updateFavorite(
  indicators: FavoriteIndicator[],
  symbolsRaw: string,
  signal?: AbortSignal,
): Promise<void> {
  const body = new URLSearchParams()
  body.set('favorite_indicator', JSON.stringify(indicators))
  body.set('favorite_symbol', symbolsRaw)

  const response = await fetch(favoritesPath, {
    method: 'PUT',
    cache: 'no-store',
    credentials: 'include',
    signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: body.toString(),
  })

  // Checked on `ok` alone: the endpoint may answer with an empty body, which the
  // shared `fetchJson` helper would reject for not being application/json.
  if (!response.ok) throw new FavoriteRequestError(response.status, favoritesPath)
}

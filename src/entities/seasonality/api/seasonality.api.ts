function safeJsonParse(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value.replace(/\bNaN\b/g, 'null'))
  } catch {
    return value
  }
}

export async function fetchSeasonalityPayload(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, {
    credentials: 'include',
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (response.status === 404) return { data: [] }
  if (!response.ok) throw new Error(`Seasonality request failed: ${response.status}`)

  const text = await response.text()
  if (!text) return {}
  return safeJsonParse(text)
}

export function extractSeasonalityRows(payload: unknown): unknown[] {
  const parsed = safeJsonParse(payload)
  if (Array.isArray(parsed)) return parsed
  if (!parsed || typeof parsed !== 'object') return []

  const record = parsed as Record<string, unknown>
  const data = safeJsonParse(record.data)
  if (Array.isArray(data)) return data

  const upperData = safeJsonParse(record.Data)
  if (Array.isArray(upperData)) return upperData

  return []
}

export function seasonalityRecord(payload: unknown): Record<string, unknown> {
  const parsed = safeJsonParse(payload)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  return parsed as Record<string, unknown>
}

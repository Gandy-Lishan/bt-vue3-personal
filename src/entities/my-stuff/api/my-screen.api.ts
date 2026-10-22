import type { MyScreenCondition, MyScreenRow, MyScreenRunResult, MyScreenSubmitPayload } from '../model/my-screen.types'

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { return value }
}

function objectValue(value: unknown): Record<string, unknown> {
  const parsed = parseJson(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
}

function arrayValue(value: unknown): unknown[] {
  const parsed = parseJson(value)
  if (Array.isArray(parsed)) return parsed
  const object = objectValue(parsed)
  for (const key of ['results', 'data', 'content']) {
    const candidate = parseJson(object[key])
    if (Array.isArray(candidate)) return candidate
  }
  return []
}

function textArray(value: unknown): string[] {
  const parsed = parseJson(value)
  if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
  return parsed ? [String(parsed)] : []
}

function tickerArray(value: unknown): string[] {
  const parsed = parseJson(value)
  if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
  return String(parsed ?? '').split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean)
}

function normalizeConditions(value: unknown): MyScreenCondition[] {
  return arrayValue(value).map((item) => {
    const row = objectValue(item)
    return {
      signal: String(row.signal ?? ''),
      condition: Number(row.condition ?? 0),
      value: String(row.value ?? ''),
      date: 0,
    }
  })
}

function normalizeRow(value: unknown, index: number, favorites = new Set<string>()): MyScreenRow {
  const row = objectValue(value)
  const url = String(row.url ?? '')
  const dates = arrayValue(row.dates).map(Number)
  const conditions = normalizeConditions(row.signals).map((condition, conditionIndex) => ({
    ...condition,
    date: Number(dates[conditionIndex] ?? 0),
  }))
  const lastSignalDate = String(row.last_signal_date ?? row.lastdate ?? '')
  return {
    id: url || `${String(row.name ?? 'screen')}-${index}`,
    url,
    name: String(row.name ?? 'Untitled screen'),
    category: String(row.category ?? 'S&P 500'),
    direction: row.direction === 'Short' ? 'Short' : 'Long',
    description: textArray(row.description),
    conditions,
    relation: Number(row.relation ?? (conditions.length > 1 ? 1 : 0)),
    dates,
    tickers: tickerArray(row.sector_lists),
    systemPattern: String(row.system_pattern ?? ''),
    lastSignalDate: ['2099-01-01', '2099-12-31'].includes(lastSignalDate) ? '' : lastSignalDate,
    favorite: favorites.has(url),
    raw: row,
  }
}

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: { Accept: 'application/json, text/plain;q=0.9, */*;q=0.8', ...init.headers },
  })
  if (!response.ok) throw new Error(`My Screen request failed: ${response.status}`)
  return parseJson(await response.text())
}

export async function fetchMyScreens(signal?: AbortSignal) {
  const [payload, favoritePayload] = await Promise.all([
    request('/dev/myscreen_app/get_myscreen_records', { signal }),
    request('/dev/myscreen_app/get_myscreen_records?favorite=1', { signal }).catch(() => []),
  ])
  const favoriteUrls = new Set(arrayValue(favoritePayload).map((item) => String(objectValue(item).url ?? '')))
  return arrayValue(payload).map((item, index) => normalizeRow(item, index, favoriteUrls))
}

export async function fetchMyScreenResult(url: string, fallback?: MyScreenRow, signal?: AbortSignal): Promise<MyScreenRunResult> {
  const raw = objectValue(await request(`/dev/myscreen_app/myscreen?url=${encodeURIComponent(url)}`, { signal }))
  const envelope = objectValue(raw.data)
  const data = objectValue(envelope.data).data === undefined ? envelope.data : objectValue(envelope.data).data
  return {
    code: Number(raw.code ?? 0),
    message: String(raw.message ?? ''),
    url: String(envelope.url ?? fallback?.url ?? url),
    rows: arrayValue(data).filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)),
    entryTemplate: objectValue(envelope.entry_template),
    raw,
  }
}

function formBody(payload: MyScreenSubmitPayload) {
  const body = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined) body.append(key, String(value))
  })
  return body
}

function normalizeRunResponse(value: unknown): MyScreenRunResult {
  const raw = objectValue(value)
  const envelope = objectValue(raw.data)
  return {
    code: Number(raw.code ?? 0),
    message: String(raw.message ?? ''),
    url: String(envelope.url ?? ''),
    rows: arrayValue(envelope.data).filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)),
    entryTemplate: objectValue(envelope.entry_template),
    raw,
  }
}

export async function saveMyScreen(payload: MyScreenSubmitPayload, url = '', signal?: AbortSignal) {
  return normalizeRunResponse(await request(`/dev/myscreen_app/myscreen${url ? `?url=${encodeURIComponent(url)}` : ''}`, {
    method: url ? 'PUT' : 'POST', body: formBody(payload), signal,
  }))
}

export async function deleteMyScreen(url: string, signal?: AbortSignal) {
  await request(`/dev/myscreen_app/myscreen?url=${encodeURIComponent(url)}`, { method: 'DELETE', signal })
}

export async function updateMyScreenFavorite(url: string, favorite: boolean, signal?: AbortSignal) {
  await request(`/dev/myscreen_app/myscreen_favorite?url=${encodeURIComponent(url)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ favorite: favorite ? 1 : 0 }),
    signal,
  })
}

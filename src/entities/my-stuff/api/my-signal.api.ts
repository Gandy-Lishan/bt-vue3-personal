import type { MySignalListKind, MySignalRow } from '../model/my-signal.types'

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function record(value: unknown): Record<string, unknown> {
  const parsed = parseJson(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : {}
}

function rows(value: unknown): Record<string, unknown>[] {
  const parsed = parseJson(value)
  if (Array.isArray(parsed)) return parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
  const payload = record(parsed)
  for (const key of ['results', 'data', 'content']) {
    const candidate = parseJson(payload[key])
    if (Array.isArray(candidate)) return candidate.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
  }
  return []
}

function numberOrNull(value: unknown) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(String(value).replace('%', ''))
  return Number.isFinite(parsed) ? parsed : null
}

function descriptionText(value: unknown) {
  const parsed = parseJson(value)
  if (Array.isArray(parsed)) {
    return parsed.map((item) => {
      if (typeof item === 'string') return item
      const entry = record(item)
      return String(entry.commentDes ?? entry.description ?? '')
    }).filter(Boolean).join(' · ')
  }
  return String(parsed ?? '')
}

function normalizeRow(raw: Record<string, unknown>, index: number): MySignalRow {
  const signalInfo = record(String(raw.signal_info ?? '').replace(/^"+|"+$/g, '').replaceAll("'", '"'))
  const lastSignalDate = String(raw.last_signal_date ?? raw.lastdate ?? '')
  return {
    id: String(raw.url ?? raw.id ?? `${raw.name ?? 'signal'}-${index}`),
    url: String(raw.url ?? ''),
    name: String(raw.name ?? 'Untitled signal'),
    symbol: String(raw.symbol ?? '-'),
    timeframe: String(raw.timeframe ?? '-'),
    description: descriptionText(raw.description) || 'No trigger description',
    createDate: String(raw.create_date ?? ''),
    lastSignalDate: lastSignalDate === '2099-12-31' ? '' : lastSignalDate,
    barsSinceSignal: numberOrNull(raw.bars_since_signal),
    currentReturn: numberOrNull(raw.current_return),
    category: String(raw.category ?? signalInfo.category ?? ''),
    raw,
  }
}

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: { Accept: 'application/json, text/plain;q=0.9, */*;q=0.8', ...init.headers },
  })
  if (!response.ok) throw new Error(`My Signal request failed: ${response.status}`)
  const text = await response.text()
  return parseJson(text)
}

export async function fetchMySignals(kind: MySignalListKind, signal?: AbortSignal) {
  const suffix = kind === 'library' ? '?sample=2' : ''
  const payload = await request(`/dev/mysignal_app/get_mysignal_records${suffix}`, { signal })
  return rows(payload).map(normalizeRow)
}

export async function fetchMySignalSubscription(signal?: AbortSignal) {
  const payload = record(await request('/dev/mysignal_app/subscribe', { signal }))
  const data = record(payload.data)
  return Boolean(Number(data.my_signal ?? payload.my_signal ?? 0))
}

export async function updateMySignalSubscription(enabled: boolean, signal?: AbortSignal) {
  const body = new FormData()
  body.append('my_signal', enabled ? '1' : '0')
  await request('/dev/mysignal_app/subscribe', { method: 'POST', body, signal })
}

export async function runAllMySignals(signal?: AbortSignal) {
  await request('/dev/mysignal_app/run_all_mysignal', { signal })
}

export async function deleteMySignal(rowUrl: string, signal?: AbortSignal) {
  await request(`/dev/mysignal_app/mysignal?url=${encodeURIComponent(rowUrl)}`, { method: 'DELETE', signal })
}

export async function copyMySignal(row: MySignalRow, signal?: AbortSignal) {
  const body = new FormData()
  const source = row.raw
  const keys = ['symbol', 'timeframe', 'signals', 'score', 'signals_in_market', 'relation', 'start_date', 'end_date', 'delay_bars', 'subscribe', 'cond', 'description', 'system_pattern']
  body.append('name', `${row.name}(copy)`)
  keys.forEach((key) => {
    const value = source[key]
    if (value === undefined || value === null) return
    body.append(key, typeof value === 'string' ? value : JSON.stringify(value))
  })
  await request('/dev/mysignal_app/mysignal', { method: 'POST', body, signal })
}


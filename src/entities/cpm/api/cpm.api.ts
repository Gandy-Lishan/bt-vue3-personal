import { normalizeCpmBacktestRow, normalizeCpmCorrelationResult, normalizeCpmPatternPreviewPayload } from '../model/cpm.adapter'
import type {
  CpmBacktestRawRow,
  CpmCorrelationPayload,
  CpmCorrelationResult,
  CpmJobResponse,
  CpmListRequest,
  CpmListResult,
  CpmPatternPreviewBatchRequest,
  CpmPatternPreviewRequest,
  CpmPatternPreviewResult,
} from '../model/cpm.types'

class CpmRequestError extends Error {
  constructor(status: number, path: string) {
    super(`CPM request failed: ${status} ${path}`)
    this.name = 'CpmRequestError'
  }
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value.replace(/\bNaN\b/g, 'null'))
  } catch {
    return value
  }
}

async function fetchPayload(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
      ...init.headers,
    },
  })

  if (!response.ok) throw new CpmRequestError(response.status, path)
  return safeJsonParse(await response.text())
}

function formDataFromPayload(payload: CpmCorrelationPayload) {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    formData.append(key, String(value))
  })
  return formData
}

function countFromPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return 0
  const count = Number((payload as Record<string, unknown>).count)
  return Number.isFinite(count) ? count : 0
}

function rowsFromPayload(payload: unknown): CpmBacktestRawRow[] {
  if (Array.isArray(payload)) return payload as CpmBacktestRawRow[]
  if (!payload || typeof payload !== 'object') return []
  const results = (payload as Record<string, unknown>).results
  return Array.isArray(results) ? (results as CpmBacktestRawRow[]) : []
}

function recordFromPayload(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {}
}

function normalizeCpmJobResponse(payload: unknown): CpmJobResponse {
  const record = recordFromPayload(payload)
  const data = recordFromPayload(record.data)
  const code = Number(record.code ?? data.code)
  const url = String(record.url ?? data.url ?? '')
  const status = String(record.status ?? data.status ?? '')
  const message = String(record.message ?? record.detail ?? data.message ?? data.detail ?? '')

  return {
    code: Number.isFinite(code) ? code : null,
    url,
    status,
    message,
    data,
    raw: payload,
  }
}

async function postCpmJob(path: string, payload: CpmCorrelationPayload, signal?: AbortSignal): Promise<CpmJobResponse> {
  try {
    return normalizeCpmJobResponse(await fetchPayload(path, {
      method: 'POST',
      body: formDataFromPayload(payload),
      signal,
    }))
  } catch {
    return normalizeCpmJobResponse({})
  }
}

async function fetchCpmJob(path: string, url: string, signal?: AbortSignal): Promise<CpmJobResponse> {
  if (!url) return normalizeCpmJobResponse({})

  try {
    return normalizeCpmJobResponse(await fetchPayload(`${path}?url=${encodeURIComponent(url)}`, { signal }))
  } catch {
    return normalizeCpmJobResponse({})
  }
}

export async function fetchCpmList(request: CpmListRequest = {}): Promise<CpmListResult> {
  const query = new URLSearchParams()
  query.set('ordering', request.ordering || '-create_date')
  if (request.name?.trim()) query.set('name', request.name.trim())
  if (request.page) query.set('page', String(request.page))

  try {
    const payload = await fetchPayload(`/dev/cpm/get_cpm_bts/?${query.toString()}`, {
      signal: request.signal,
    })
    return {
      count: countFromPayload(payload),
      rows: rowsFromPayload(payload).map(normalizeCpmBacktestRow),
    }
  } catch {
    return { count: 0, rows: [] }
  }
}

export async function deleteCpmBacktest(url: string, signal?: AbortSignal) {
  if (!url) return false

  try {
    await fetchPayload(`/dev/cpm/remove_cpm_bt/?url=${encodeURIComponent(url)}`, {
      method: 'DELETE',
      signal,
    })
    return true
  } catch {
    return false
  }
}

export async function fetchCpmResult(url: string, signal?: AbortSignal): Promise<CpmCorrelationResult | null> {
  if (!url) return null

  try {
    const payload = await fetchPayload(`/dev/cpm/run_cpm_bt/?url=${encodeURIComponent(url)}`, { signal })
    return normalizeCpmCorrelationResult(payload)
  } catch {
    return null
  }
}

export function startCpmPatternMatchPreview(payload: CpmCorrelationPayload, signal?: AbortSignal) {
  return postCpmJob('/dev/cpm/preview_pattern/', payload, signal)
}

export function fetchCpmPatternMatchPreview(url: string, signal?: AbortSignal) {
  return fetchCpmJob('/dev/cpm/preview_pattern/', url, signal)
}

export function startCpmPatternBacktest(payload: CpmCorrelationPayload, signal?: AbortSignal) {
  return postCpmJob('/dev/cpm/run_cpm_bt', payload, signal)
}

export function fetchCpmPatternBacktestJob(url: string, signal?: AbortSignal) {
  return fetchCpmJob('/dev/cpm/run_cpm_bt/', url, signal)
}

export async function updateCpmPatternBacktest(url: string, payload: CpmCorrelationPayload, signal?: AbortSignal): Promise<CpmJobResponse> {
  if (!url) return normalizeCpmJobResponse({})

  try {
    return normalizeCpmJobResponse(await fetchPayload(`/dev/cpm/update_cpm_bt?url=${encodeURIComponent(url)}`, {
      method: 'PUT',
      body: formDataFromPayload(payload),
      signal,
    }))
  } catch {
    return normalizeCpmJobResponse({})
  }
}

async function postCorrelation(path: string, payload: CpmCorrelationPayload, signal?: AbortSignal) {
  try {
    const result = await fetchPayload(path, {
      method: 'POST',
      body: formDataFromPayload(payload),
      signal,
    })
    return normalizeCpmCorrelationResult(result)
  } catch {
    return normalizeCpmCorrelationResult({})
  }
}

export function runSymbolCorrelation(payload: CpmCorrelationPayload, signal?: AbortSignal) {
  return postCorrelation('/dev/symbol_corr_app/symbol_corr/', payload, signal)
}

export function runBetaAnalyzer(payload: CpmCorrelationPayload, signal?: AbortSignal) {
  return postCorrelation('/dev/symbol_corr_app/symbol_beta/', payload, signal)
}

export function runPatternCorrelation(payload: CpmCorrelationPayload, signal?: AbortSignal) {
  return postCorrelation('/dev/symbol_corr_app/pattern_corr/', payload, signal)
}

export async function fetchPatternPrices(symbol: string, signal?: AbortSignal): Promise<Array<{ Date: string; Close: number }>> {
  const query = new URLSearchParams({ symbol, start: '1800-10-01', end: new Date().toISOString().slice(0, 10), freq: 'daily' })
  const payload = await fetchPayload(`/dev/st_data/pair_data?${query}`, { signal })
  const rows = Array.isArray(payload) ? payload : (payload as { data?: unknown })?.data
  if (!Array.isArray(rows)) throw new Error('Price history is unavailable.')
  return rows.map(row => ({ Date: String(row.DT ?? row.Date ?? '').slice(0, 10), Close: Number(row.Close ?? row.close) }))
    .filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.Date) && Number.isFinite(row.Close))
    .sort((a, b) => a.Date.localeCompare(b.Date))
}

export async function fetchCpmPatternPreview(request: CpmPatternPreviewRequest, signal?: AbortSignal): Promise<CpmPatternPreviewResult> {
  const symbol = request.symbol.trim()
  if (!symbol || !request.startDate || !request.endDate) {
    return normalizeCpmPatternPreviewPayload([], symbol)
  }

  try {
    const indicatorNames = Array.from(new Set([symbol, symbol.toLowerCase()].filter(Boolean)))
    const response = await fetch('/dev/st_data/stock_recent_data', {
      method: 'POST',
      credentials: 'include',
      signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        indicator_list: indicatorNames.map((name) => ({
          name,
          start: request.startDate,
          end: request.endDate,
        })),
      }),
    })

    if (!response.ok) throw new CpmRequestError(response.status, '/dev/st_data/stock_recent_data')
    return normalizeCpmPatternPreviewPayload(await response.json(), symbol)
  } catch {
    return normalizeCpmPatternPreviewPayload([], symbol)
  }
}

function stockRecentItemsFromPayload(payload: unknown) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []

  const record = payload as Record<string, unknown>
  return Array.isArray(record.data) ? record.data : []
}

export async function fetchCpmPatternPreviews(requests: CpmPatternPreviewBatchRequest[], signal?: AbortSignal): Promise<Record<string, CpmPatternPreviewResult>> {
  const validRequests = requests.filter((request) => request.id && request.symbol.trim() && request.startDate && request.endDate)
  if (!validRequests.length) return {}

  try {
    const response = await fetch('/dev/st_data/stock_recent_data', {
      method: 'POST',
      credentials: 'include',
      signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        indicator_list: validRequests.map((request) => ({
          name: request.symbol.trim(),
          start: request.startDate,
          end: request.endDate,
        })),
      }),
    })

    if (!response.ok) throw new CpmRequestError(response.status, '/dev/st_data/stock_recent_data')

    const payload = await response.json()
    const items = stockRecentItemsFromPayload(payload)

    return validRequests.reduce<Record<string, CpmPatternPreviewResult>>((acc, request, index) => {
      const item = items[index]
      acc[request.id] = normalizeCpmPatternPreviewPayload(item === undefined ? payload : [item], request.symbol)
      return acc
    }, {})
  } catch {
    return validRequests.reduce<Record<string, CpmPatternPreviewResult>>((acc, request) => {
      acc[request.id] = normalizeCpmPatternPreviewPayload([], request.symbol)
      return acc
    }, {})
  }
}

export async function fetchAssetCorrelation(signal?: AbortSignal): Promise<CpmCorrelationResult> {
  try {
    const payload = await fetchPayload('/dev/st_data/widgets?chart_name=AssetCorr', { signal })
    const matrixRows = Array.isArray(payload) ? payload : []
    return {
      ...normalizeCpmCorrelationResult({ data: matrixRows }),
      matrixRows: matrixRows as Array<Record<string, unknown>>,
    }
  } catch {
    return normalizeCpmCorrelationResult({})
  }
}

export function runAssetCorrelation(payload: CpmCorrelationPayload, signal?: AbortSignal) {
  return postCorrelation('/dev/symbol_corr_app/asset_corr', payload, signal)
}

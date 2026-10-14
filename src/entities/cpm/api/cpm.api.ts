import { normalizeCpmBacktestRow, normalizeCpmCorrelationResult, normalizeCpmPatternPreviewPayload } from '../model/cpm.adapter'
import type {
  CpmBacktestRawRow,
  CpmCorrelationPayload,
  CpmCorrelationResult,
  CpmListRequest,
  CpmListResult,
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

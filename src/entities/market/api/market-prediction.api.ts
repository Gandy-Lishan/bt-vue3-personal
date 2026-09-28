import { normalizeMarketPredictionRows } from '../model/market-prediction.adapter'
import type { MarketPredictionRow } from '../model/market-prediction.types'

class MarketPredictionRequestError extends Error {
  constructor(status: number, path: string) {
    super(`Market prediction request failed: ${status} ${path}`)
    this.name = 'MarketPredictionRequestError'
  }
}

function safeJsonParse(value: unknown) {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value.replace(/\bNaN\b/g, 'null'))
  } catch {
    return value
  }
}

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok || !contentType.includes('application/json')) {
    throw new MarketPredictionRequestError(response.status, path)
  }

  return response.json() as Promise<T>
}

function timeoutSignal(parentSignal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  const timeoutId = window.setTimeout(abort, timeoutMs)

  if (parentSignal?.aborted) {
    abort()
  } else {
    parentSignal?.addEventListener('abort', abort, { once: true })
  }

  return {
    signal: controller.signal,
    cleanup() {
      window.clearTimeout(timeoutId)
      parentSignal?.removeEventListener('abort', abort)
    },
  }
}

function extractPredictionPayload(payload: unknown): unknown {
  const parsed = safeJsonParse(payload)
  if (Array.isArray(parsed)) return parsed
  if (!parsed || typeof parsed !== 'object') return []

  const record = parsed as Record<string, unknown>
  const data = safeJsonParse(record.data)
  if (Array.isArray(data)) return data

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const dataRecord = data as Record<string, unknown>
    return safeJsonParse(dataRecord.all_pred_data ?? dataRecord.PredictData ?? dataRecord.prediction_data)
  }

  return safeJsonParse(record.all_pred_data ?? record.PredictData ?? record.prediction_data)
}

export async function fetchMarketPredictions(signal?: AbortSignal): Promise<MarketPredictionRow[]> {
  const requestSignal = timeoutSignal(signal, 12000)
  try {
    const payload = await fetchJson<unknown>('/dev/company_detail_app/get_pred', requestSignal.signal)
    return normalizeMarketPredictionRows(extractPredictionPayload(payload))
  } catch {
    return []
  } finally {
    requestSignal.cleanup()
  }
}

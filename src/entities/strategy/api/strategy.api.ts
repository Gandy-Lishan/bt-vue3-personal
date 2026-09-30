import {
  normalizeStrategySignalRows,
  normalizeStrategySummaryRows,
} from '../model/strategy.adapter'
import type { StrategySignalRow, StrategySummaryRow } from '../model/strategy.types'

class StrategyRequestError extends Error {
  constructor(status: number, path: string) {
    super(`Strategy request failed: ${status} ${path}`)
    this.name = 'StrategyRequestError'
  }
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value.replace(/\bNaN\b/g, 'null'))
  } catch {
    return value
  }
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

async function fetchPayload(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, {
    credentials: 'include',
    signal,
    headers: {
      Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
    },
  })

  if (!response.ok) throw new StrategyRequestError(response.status, path)
  return safeJsonParse(await response.text())
}

export async function fetchStrategySignals(signal?: AbortSignal): Promise<StrategySignalRow[]> {
  const requestSignal = timeoutSignal(signal, 12000)
  try {
    return normalizeStrategySignalRows(await fetchPayload('/dev/portfolio/get_strategies/', requestSignal.signal))
  } catch {
    return []
  } finally {
    requestSignal.cleanup()
  }
}

export async function fetchStrategySummaries(
  signals: StrategySignalRow[],
  signal?: AbortSignal,
): Promise<StrategySummaryRow[]> {
  const requestSignal = timeoutSignal(signal, 12000)
  try {
    return normalizeStrategySummaryRows(await fetchPayload('/dev/portfolio/strategy_statistic/', requestSignal.signal), signals)
  } catch {
    return []
  } finally {
    requestSignal.cleanup()
  }
}

export async function addStrategyFavorite(url: string, signal?: AbortSignal) {
  const requestSignal = timeoutSignal(signal, 12000)
  const formData = new FormData()
  formData.append('model_url', url)

  try {
    const response = await fetch('/dev/portfolio/favorite_strategy', {
      method: 'POST',
      credentials: 'include',
      signal: requestSignal.signal,
      body: formData,
    })
    return response.ok
  } catch {
    return false
  } finally {
    requestSignal.cleanup()
  }
}

export async function removeStrategyFavorite(url: string, signal?: AbortSignal) {
  const requestSignal = timeoutSignal(signal, 12000)
  try {
    const response = await fetch(`/dev/portfolio/favorite_strategy?model_url=${encodeURIComponent(url)}`, {
      method: 'DELETE',
      credentials: 'include',
      signal: requestSignal.signal,
    })
    return response.ok
  } catch {
    return false
  } finally {
    requestSignal.cleanup()
  }
}

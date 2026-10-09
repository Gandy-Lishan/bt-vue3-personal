import {
  normalizeStrategyDetail,
  normalizeStrategyPairPriceRows,
  normalizeStrategySignalRows,
  normalizeStrategySummaryRows,
} from '../model/strategy.adapter'
import {
  normalizeStrategyBasketApiResult,
  normalizeStrategyBasketAutoCandidates,
  normalizeStrategyBasketList,
  normalizeStrategyBasketRunResult,
} from '../model/strategy.basket'
import type {
  StrategyBasketApiResult,
  StrategyBasketAutoCandidate,
  StrategyBasketList,
  StrategyBasketRecord,
  StrategyBasketRunResult,
  StrategyBasketSubmitPayload,
} from '../model/strategy.basket'
import type { StrategyDetail, StrategyPairPriceRow, StrategySignalRow, StrategySummaryRow } from '../model/strategy.types'

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

async function submitFormPayload(
  path: string,
  method: 'POST' | 'PUT',
  data: Record<string, string> | StrategyBasketSubmitPayload,
  signal?: AbortSignal,
): Promise<unknown> {
  const formData = new FormData()
  for (const [key, value] of Object.entries(data)) {
    formData.append(key, value)
  }

  const response = await fetch(path, {
    method,
    credentials: 'include',
    signal,
    body: formData,
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

export async function fetchStrategyDetail(
  url: string,
  options: {
    name?: string
    signals?: StrategySignalRow[]
    summaries?: StrategySummaryRow[]
  } = {},
  signal?: AbortSignal,
): Promise<StrategyDetail> {
  const requestSignal = timeoutSignal(signal, 12000)
  try {
    const payload = await fetchPayload(
      `/dev/portfolio/strategy_performance?model_url=${encodeURIComponent(url)}`,
      requestSignal.signal,
    )
    return normalizeStrategyDetail(payload, { url, ...options })
  } catch {
    return normalizeStrategyDetail([], { url, ...options })
  } finally {
    requestSignal.cleanup()
  }
}

export async function fetchStrategyPairPrices(
  symbol: string,
  startDate: string,
  endDate: string,
  frequency: string,
  signal?: AbortSignal,
): Promise<StrategyPairPriceRow[]> {
  if (!symbol || !startDate || !endDate) return []

  const requestSignal = timeoutSignal(signal, 12000)
  const query = new URLSearchParams({
    symbol,
    start: startDate,
    end: endDate,
    freq: frequency || 'Daily',
  })

  try {
    return normalizeStrategyPairPriceRows(await fetchPayload(`/dev/st_data/pair_data?${query.toString()}`, requestSignal.signal))
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

export async function fetchStrategyBasketRecords(
  options: {
    page?: number
    ordering?: string
    name?: string
    signals?: StrategySignalRow[]
  } = {},
  signal?: AbortSignal,
): Promise<StrategyBasketList> {
  const requestSignal = timeoutSignal(signal, 12000)
  const query = new URLSearchParams()
  query.set('ordering', options.ordering || '-create_date')
  if (options.name?.trim()) query.set('name', options.name.trim())
  if (options.page) query.set('page', String(options.page))

  try {
    const payload = await fetchPayload(`/dev/portfolio/get_portfolio_records/?${query.toString()}`, requestSignal.signal)
    return normalizeStrategyBasketList(payload, options.signals ?? [])
  } catch {
    return { count: 0, records: [] }
  } finally {
    requestSignal.cleanup()
  }
}

export async function runStrategyBasket(
  payload: StrategyBasketSubmitPayload,
  signal?: AbortSignal,
): Promise<StrategyBasketApiResult> {
  const requestSignal = timeoutSignal(signal, 16000)
  try {
    return normalizeStrategyBasketApiResult(
      await submitFormPayload('/dev/portfolio/run_portfolio', 'POST', payload, requestSignal.signal),
    )
  } catch (error) {
    return { code: null, data: null, message: error instanceof Error ? error.message : 'Run failed', raw: null }
  } finally {
    requestSignal.cleanup()
  }
}

export async function updateStrategyBasket(
  url: string,
  payload: StrategyBasketSubmitPayload,
  signal?: AbortSignal,
): Promise<StrategyBasketApiResult> {
  const requestSignal = timeoutSignal(signal, 16000)
  try {
    return normalizeStrategyBasketApiResult(
      await submitFormPayload(`/dev/portfolio/update_portfolio?url=${encodeURIComponent(url)}`, 'PUT', payload, requestSignal.signal),
    )
  } catch (error) {
    return { code: null, data: null, message: error instanceof Error ? error.message : 'Update failed', raw: null }
  } finally {
    requestSignal.cleanup()
  }
}

export async function fetchStrategyBasketRunResult(
  url: string,
  options: {
    signals?: StrategySignalRow[]
    fallbackRecord?: StrategyBasketRecord | null
  } = {},
  signal?: AbortSignal,
): Promise<StrategyBasketRunResult> {
  const requestSignal = timeoutSignal(signal, 16000)
  try {
    const payload = await fetchPayload(`/dev/portfolio/run_portfolio?url=${encodeURIComponent(url)}`, requestSignal.signal)
    return normalizeStrategyBasketRunResult(payload, options.signals ?? [], options.fallbackRecord)
  } catch {
    return {
      code: null,
      status: 'Unknown',
      record: options.fallbackRecord ?? null,
      metrics: {},
      holdings: [],
      strategyDetails: [],
      raw: null,
    }
  } finally {
    requestSignal.cleanup()
  }
}

export async function deleteStrategyBasket(url: string, signal?: AbortSignal): Promise<StrategyBasketApiResult> {
  const requestSignal = timeoutSignal(signal, 12000)
  try {
    const response = await fetch(`/dev/portfolio/delete_portfolio/?url=${encodeURIComponent(url)}`, {
      method: 'DELETE',
      credentials: 'include',
      signal: requestSignal.signal,
      headers: {
        Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
      },
    })
    if (!response.ok) throw new StrategyRequestError(response.status, '/dev/portfolio/delete_portfolio/')
    return normalizeStrategyBasketApiResult(safeJsonParse(await response.text()))
  } catch (error) {
    return { code: null, data: null, message: error instanceof Error ? error.message : 'Delete failed', raw: null }
  } finally {
    requestSignal.cleanup()
  }
}

export async function fetchAutoStrategyBaskets(
  options: {
    returnRange?: string
    mddRange?: string
    winRateRange?: string
    cagrRange?: string
    signals?: StrategySignalRow[]
  },
  signal?: AbortSignal,
): Promise<StrategyBasketAutoCandidate[]> {
  const requestSignal = timeoutSignal(signal, 16000)
  const payload = {
    return_range: options.returnRange ?? '',
    mdd_range: options.mddRange ?? '',
    win_rate_range: options.winRateRange ?? '',
    cagr_range: options.cagrRange ?? '',
  }

  try {
    return normalizeStrategyBasketAutoCandidates(
      await submitFormPayload('/dev/portfolio/auto_portfolio', 'POST', payload, requestSignal.signal),
      options.signals ?? [],
    )
  } catch {
    return []
  } finally {
    requestSignal.cleanup()
  }
}

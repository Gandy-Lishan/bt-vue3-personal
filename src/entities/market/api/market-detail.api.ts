import { normalizeMarketPredictionDetail } from '../model/market-detail.adapter'
import type { MarketPredictionDetail, MarketDetailTab } from '../model/market-detail.types'
import type { MarketPredictionRow } from '../model/market-prediction.types'

class MarketDetailRequestError extends Error {
  constructor(status: number, path: string) {
    super(`Market detail request failed: ${status} ${path}`)
    this.name = 'MarketDetailRequestError'
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

async function fetchJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, {
    credentials: 'include',
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok || !contentType.includes('application/json')) {
    throw new MarketDetailRequestError(response.status, path)
  }

  return response.json()
}

async function optionalJson(path: string, signal?: AbortSignal) {
  try {
    return await fetchJson(path, signal)
  } catch {
    return undefined
  }
}

function symbolPath(path: string, ticker: string) {
  return `${path}${encodeURIComponent(ticker)}`
}

export async function fetchMarketPredictionDetail(
  ticker: string,
  prediction: MarketPredictionRow | null,
  signal?: AbortSignal,
): Promise<MarketPredictionDetail> {
  const symbol = ticker.trim().toUpperCase()
  const requestSignal = timeoutSignal(signal, 14000)

  try {
    const [profile, analyst, earnings, income, balance, cash, ownership, news, sec] = await Promise.all([
      optionalJson(symbolPath('/dev/company_detail_app/get_profile?symbol=', symbol), requestSignal.signal),
      optionalJson(symbolPath('/dev/company_detail_app/get_analysis?symbol=', symbol), requestSignal.signal),
      optionalJson(symbolPath('/dev/company_detail_app/get_earning?symbol=', symbol), requestSignal.signal),
      optionalJson(`/dev/company_detail_app/get_income?symbol=${encodeURIComponent(symbol)}&period=annual`, requestSignal.signal),
      optionalJson(`/dev/company_detail_app/get_balance?symbol=${encodeURIComponent(symbol)}&period=annual`, requestSignal.signal),
      optionalJson(`/dev/company_detail_app/get_cash?symbol=${encodeURIComponent(symbol)}&period=annual`, requestSignal.signal),
      optionalJson(symbolPath('/dev/company_detail_app/get_holder?symbol=', symbol), requestSignal.signal),
      optionalJson(symbolPath('/dev/company_detail_app/get_news?symbol=', symbol), requestSignal.signal),
      optionalJson(symbolPath('/dev/company_detail_app/get_sec?symbol=', symbol), requestSignal.signal),
    ])

    return normalizeMarketPredictionDetail(
      symbol,
      {
        profile,
        analyst,
        earnings,
        income,
        balance,
        cash,
        ownership,
        news,
        sec,
      },
      prediction,
    )
  } finally {
    requestSignal.cleanup()
  }
}

export function normalizeMarketDetailTab(value: unknown): MarketDetailTab {
  const text = String(value ?? '').trim()
  if (
    text === 'chart'
    || text === 'analysts'
    || text === 'earnings'
    || text === 'financials'
    || text === 'balanceSheet'
    || text === 'cashFlow'
    || text === 'ownership'
    || text === 'news'
    || text === 'sec'
  ) {
    return text
  }
  return 'overview'
}

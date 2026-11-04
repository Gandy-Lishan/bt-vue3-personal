import { normalizeMarketPredictionDetail } from '../model/market-detail.adapter'
import type { MarketDetailRawParts } from '../model/market-detail.adapter'
import type { MarketPredictionDetail, MarketDetailTab, MarketPriceRow } from '../model/market-detail.types'
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

export type MarketDetailPartKey = keyof MarketDetailRawParts

// One endpoint per detail section, matching the Vue2 tab components: the page
// only requests the sections needed by the active tab (plus the company
// profile for the header) instead of every section up front.
const MARKET_DETAIL_PART_PATHS: Record<MarketDetailPartKey, (symbol: string) => string> = {
  profile: (symbol) => symbolPath('/dev/company_detail_app/get_profile?symbol=', symbol),
  analyst: (symbol) => symbolPath('/dev/company_detail_app/get_analysis?symbol=', symbol),
  earnings: (symbol) => symbolPath('/dev/company_detail_app/get_earning?symbol=', symbol),
  income: (symbol) => `/dev/company_detail_app/get_income?symbol=${encodeURIComponent(symbol)}&period=annual`,
  balance: (symbol) => `/dev/company_detail_app/get_balance?symbol=${encodeURIComponent(symbol)}&period=annual`,
  cash: (symbol) => `/dev/company_detail_app/get_cash?symbol=${encodeURIComponent(symbol)}&period=annual`,
  ownership: (symbol) => symbolPath('/dev/company_detail_app/get_holder?symbol=', symbol),
  news: (symbol) => symbolPath('/dev/company_detail_app/get_news?symbol=', symbol),
  sec: (symbol) => symbolPath('/dev/company_detail_app/get_sec?symbol=', symbol),
}

export function fetchMarketDetailPart(
  key: MarketDetailPartKey,
  ticker: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const symbol = ticker.trim().toUpperCase()
  return optionalJson(MARKET_DETAIL_PART_PATHS[key](symbol), signal)
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
      optionalJson(MARKET_DETAIL_PART_PATHS.profile(symbol), requestSignal.signal),
      optionalJson(MARKET_DETAIL_PART_PATHS.analyst(symbol), requestSignal.signal),
      optionalJson(MARKET_DETAIL_PART_PATHS.earnings(symbol), requestSignal.signal),
      optionalJson(MARKET_DETAIL_PART_PATHS.income(symbol), requestSignal.signal),
      optionalJson(MARKET_DETAIL_PART_PATHS.balance(symbol), requestSignal.signal),
      optionalJson(MARKET_DETAIL_PART_PATHS.cash(symbol), requestSignal.signal),
      optionalJson(MARKET_DETAIL_PART_PATHS.ownership(symbol), requestSignal.signal),
      optionalJson(MARKET_DETAIL_PART_PATHS.news(symbol), requestSignal.signal),
      optionalJson(MARKET_DETAIL_PART_PATHS.sec(symbol), requestSignal.signal),
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

// --- Quarterly statement fetchers ---

import type { MarketCashFlowRow, MarketBalanceSheetRow, MarketFinancialRow } from '../model/market-detail.types'
import { normalizeCash, normalizeBalance, normalizeIncome } from '../model/market-detail.adapter'

async function fetchStatementJson<T>(
  endpoint: string,
  ticker: string,
  period: string,
  normalize: (payload: unknown) => T[],
  signal?: AbortSignal,
): Promise<T[]> {
  const path = `/dev/company_detail_app/${endpoint}?symbol=${encodeURIComponent(ticker)}&period=${period}`
  const payload = await optionalJson(path, signal)
  if (!payload) return []
  return normalize(payload)
}

export function fetchMarketCashFlow(
  ticker: string,
  period: 'annual' | 'quarterly',
  signal?: AbortSignal,
): Promise<MarketCashFlowRow[]> {
  return fetchStatementJson('get_cash', ticker, period, normalizeCash, signal)
}

export function fetchMarketBalanceSheet(
  ticker: string,
  period: 'annual' | 'quarterly',
  signal?: AbortSignal,
): Promise<MarketBalanceSheetRow[]> {
  return fetchStatementJson('get_balance', ticker, period, normalizeBalance, signal)
}

export async function fetchMarketFinancials(
  ticker: string,
  period: 'annual' | 'quarterly',
  signal?: AbortSignal,
): Promise<MarketFinancialRow[]> {
  const incomePath = `/dev/company_detail_app/get_income?symbol=${encodeURIComponent(ticker)}&period=${period}`
  const balancePath = `/dev/company_detail_app/get_balance?symbol=${encodeURIComponent(ticker)}&period=${period}`
  const [incomePayload, balancePayload] = await Promise.all([
    optionalJson(incomePath, signal),
    optionalJson(balancePath, signal),
  ])
  if (!incomePayload || !balancePayload) return []
  return normalizeIncome(incomePayload, balancePayload)
}

// --- Chart price history ---

// Mirrors Vue2 `components/Market/sec/Chart.vue`: daily pair data from
// 2020-01-01 to today, fetched through the same `/dev/st_data/pair_data` proxy
// used by the CPM and strategy pages.
const MARKET_CHART_START_DATE = '2020-01-01'

function toFiniteNumber(value: unknown): number | null {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export async function fetchMarketPriceHistory(
  ticker: string,
  signal?: AbortSignal,
): Promise<MarketPriceRow[]> {
  const query = new URLSearchParams({
    symbol: ticker,
    start: MARKET_CHART_START_DATE,
    end: new Date().toISOString().slice(0, 10),
    freq: 'daily',
  })
  const requestSignal = timeoutSignal(signal, 14000)

  try {
    const payload = await fetchJson(`/dev/st_data/pair_data?${query.toString()}`, requestSignal.signal)
    const rows = Array.isArray(payload) ? payload : (payload as { data?: unknown })?.data
    if (!Array.isArray(rows)) return []

    return rows.map((row) => {
      const item = row as Record<string, unknown>
      return {
        date: String(item.DT ?? ''),
        open: toFiniteNumber(item.Open),
        high: toFiniteNumber(item.High),
        low: toFiniteNumber(item.Low),
        close: toFiniteNumber(item.Close),
      }
    })
  } finally {
    requestSignal.cleanup()
  }
}

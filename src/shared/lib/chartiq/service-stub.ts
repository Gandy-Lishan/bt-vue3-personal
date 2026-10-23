/**
 * Service functions for ChartIQ extensions.
 *
 * Mirrors the Vue2 project's @/service/service.js endpoints.
 * Uses Vite dev proxy: /dev/* and /bt/* → stApiTarget.
 */

import axios from 'axios'

const api = axios.create({
  withCredentials: true,
})

// ── Favorites ──────────────────────────────────────────────────────

export async function getFavorite() {
  const { data } = await api.get('/dev/dev/favorites/', {
    cache: false,
    withCredentials: true,
  })
  return data
}

export async function updateFavorite(indicator: string, symbol: string) {
  const { data } = await api.put(
    '/dev/dev/favorites/',
    new URLSearchParams({
      favorite_indicator: indicator,
      favorite_symbol: symbol,
    }),
    {
      cache: false,
      withCredentials: true,
    },
  )
  return data
}

// ── My Symbols ─────────────────────────────────────────────────────

export async function getAllMySymbolsList() {
  const { data } = await api.get('/dev/user_upload/get_upload_files_list/', {
    params: { ordering: '-create_date', all: true },
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    withCredentials: true,
  })
  return data
}

export async function getSymbolCsv(fileID: string, timeframe: string) {
  const { data } = await api.get('/dev/user_upload/symbolcsvread/', {
    params: { url: fileID, timeframe },
    withCredentials: true,
  })
  return data
}

// ── My Indicators ──────────────────────────────────────────────────

export async function getAllMyIndicatorsList() {
  const { data } = await api.get('/dev/my_indicator/get_records/', {
    params: { ordering: '-create_date', all: true },
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    withCredentials: true,
  })
  return data
}

export async function getBTV1FavIndicator() {
  const { data } = await api.get('/bt/my_indicator/get_btv1_favorite_indicators/', {
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    withCredentials: true,
  })
  return data
}

export async function obtainBTV1IndicatorsList() {
  const { data } = await api.get('/dev/my_indicator/get_btv1_indicators/', {
    withCredentials: true,
  })
  return data
}

// ── OHLCV / Pair Data ──────────────────────────────────────────────

/**
 * Fetch OHLCV pair data from external API.
 * In production this hits bt2api.sentimentrader.com directly.
 * In dev, this goes through the Vite proxy if configured,
 * otherwise direct to the external API.
 */
export async function getPairData(
  startDate: string,
  endDate: string,
  frequency: string,
  symbol: string,
) {
  const url = `https://bt2api.sentimentrader.com/st_data/pair_data`
  // 【照搬原版】旧 service.js 返回完整 axios response，st-development JS 读 `res.data`
  const response = await api.get(url, {
    params: { symbol, start: startDate, end: endDate, freq: frequency },
    timeout: 10000,
    auth: {
      username: 'sentimentrader_backtest_api',
      password: 'TAZcbpTmQVAJW4GW3ZMQA1su0ynjqJJsYo6vfkapx',
    },
  })
  return response
}

// ── Forecast ───────────────────────────────────────────────────────

export async function getForecastList(symbol: string) {
  const { data } = await api.get('/dev/dev/forecastreport/', {
    params: { symbol },
    withCredentials: true,
  })
  return data
}

export async function getSymbollistForecast() {
  const { data } = await api.get('/dev/dev/forecastsymbollist/', {
    withCredentials: true,
  })
  return data.data
}

// ── Indicators Page ────────────────────────────────────────────────

export async function obtainIndicatorsList(type: string, page?: number) {
  const { data } = await api.get(`/dev/st_data/${type}/`, {
    params: page ? { page } : {},
    withCredentials: true,
  })
  return data
}

// ── Search / Misc ──────────────────────────────────────────────────

export async function searchIndicator(name: string) {
  const { data } = await api.get('/dev/st_data/commodity_complete_list/', {
    params: { name },
    withCredentials: true,
  })
  return data
}

export async function symbolCsvFileDelete(url: string) {
  const { data } = await api.delete(`/dev/user_upload/symbolcsvread/`, {
    params: { url },
    withCredentials: true,
  })
  return data
}

/**
 * Fetch AI supline data for chart markers.
 */
export async function fetchAISuplineData(
  vm: unknown,
  symbol: string,
  date: string,
  freq: string,
) {
  const { data } = await api.get('/ai/chart-ai/drawing-instructions', {
    params: { symbol, date, freq },
    timeout: 30000,
    withCredentials: true,
  })
  return data || { drawing_instructions: { trend_channel: [], horizontal_levels: [] } }
}

export function stopAllPolling(): void {
  // Intentionally no-op — polling is managed by ChartIQ internally.
}

/**
 * Stub for nprogress — ChartIQ calls CIQ.nprogress.start() / .done()
 * but nprogress is not installed in this project.
 */
export function setupNProgressStub(ciq: Record<string, unknown>): void {
  if (ciq && !ciq.nprogress) {
    ciq.nprogress = {
      start: () => {},
      done: () => {},
      set: () => {},
      remove: () => {},
    }
  }
  ;(window as Record<string, unknown>).CIQ = ciq
}

// ── Backtest Management ────────────────────────────────────────────

export async function deleteBacktest(id: string) {
  const { data } = await api.delete(`/dev/dev/backtest/${id}/`, {
    withCredentials: true,
  })
  return data
}

export async function getRelatedBacktest(url: string) {
  const { data } = await api.get(`/dev/my_indicator/relate_backtests/`, {
    params: { url },
    withCredentials: true,
  })
  return data
}

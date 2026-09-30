import {
  extractSmartScannerCurrentDate,
  normalizeSmartScannerBacktestDetail,
  normalizeSmartScannerRows,
  todayScannerDate,
} from '../model/smart-scanner.adapter'
import type { SmartScannerBacktestDetail, SmartScannerDetailRequest, SmartScannerRow } from '../model/smart-scanner.types'

class SmartScannerRequestError extends Error {
  constructor(status: number, path: string) {
    super(`Smart scanner request failed: ${status} ${path}`)
    this.name = 'SmartScannerRequestError'
  }
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value.replace(/\bNaN\b/g, 'null'))
  } catch {
    return value
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

  if (!response.ok) {
    throw new SmartScannerRequestError(response.status, path)
  }

  return safeJsonParse(await response.text())
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

export async function fetchSmartScannerCurrentDate(signal?: AbortSignal): Promise<string> {
  const requestSignal = timeoutSignal(signal, 12000)
  try {
    const payload = await fetchPayload('/dev/ai_scanner/currDate', requestSignal.signal)
    return extractSmartScannerCurrentDate(payload) ?? todayScannerDate()
  } catch {
    return todayScannerDate()
  } finally {
    requestSignal.cleanup()
  }
}

export async function fetchSmartScannerRows(
  startDate: string,
  endDate: string,
  signal?: AbortSignal,
): Promise<SmartScannerRow[]> {
  if (!startDate || !endDate) return []

  const params = new URLSearchParams({ start_date: startDate, end_date: endDate })
  const requestSignal = timeoutSignal(signal, 12000)
  try {
    const payload = await fetchPayload(`/dev/ai_scanner/aiPick?${params.toString()}`, requestSignal.signal)
    return normalizeSmartScannerRows(payload)
  } catch {
    return []
  } finally {
    requestSignal.cleanup()
  }
}

export async function fetchSmartScannerBacktestDetail(
  request: SmartScannerDetailRequest,
  signal?: AbortSignal,
): Promise<SmartScannerBacktestDetail> {
  const requestSignal = timeoutSignal(signal, 12000)
  const body = new URLSearchParams({
    symbol: request.symbol,
    date: request.date,
    signal: request.signal,
    category: request.category,
  })

  try {
    const response = await fetch('/dev/ai_scanner/bt', {
      method: 'POST',
      credentials: 'include',
      signal: requestSignal.signal,
      headers: {
        Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body,
    })

    if (!response.ok) {
      throw new SmartScannerRequestError(response.status, '/dev/ai_scanner/bt')
    }

    const payload = safeJsonParse(await response.text())
    return normalizeSmartScannerBacktestDetail(payload, request)
  } catch {
    return normalizeSmartScannerBacktestDetail({}, request)
  } finally {
    requestSignal.cleanup()
  }
}

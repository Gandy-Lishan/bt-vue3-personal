import {
  extractOptionScannerLatestTradeDate,
  normalizeOptionScannerRows,
  todayOptionScannerDate,
} from '../model/option-scanner.adapter'
import type { OptionScannerRow } from '../model/option-scanner.types'

class OptionScannerRequestError extends Error {
  constructor(status: number, path: string) {
    super(`Option scanner request failed: ${status} ${path}`)
    this.name = 'OptionScannerRequestError'
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

  if (!response.ok) throw new OptionScannerRequestError(response.status, path)
  return safeJsonParse(await response.text())
}

export async function fetchOptionScannerRows(date = '', signal?: AbortSignal): Promise<OptionScannerRow[]> {
  const params = new URLSearchParams({ type: 'put' })
  if (date) params.set('date', date)

  const requestSignal = timeoutSignal(signal, 12000)
  try {
    const payload = await fetchPayload(`/dev/option_scanner_app/option_scanner_data?${params.toString()}`, requestSignal.signal)
    return normalizeOptionScannerRows(payload)
  } catch {
    return []
  } finally {
    requestSignal.cleanup()
  }
}

export async function fetchOptionScannerInitialDate(signal?: AbortSignal): Promise<string> {
  const requestSignal = timeoutSignal(signal, 12000)
  try {
    const payload = await fetchPayload('/dev/option_scanner_app/option_scanner_data?type=put', requestSignal.signal)
    return extractOptionScannerLatestTradeDate(payload) ?? todayOptionScannerDate()
  } catch {
    return todayOptionScannerDate()
  } finally {
    requestSignal.cleanup()
  }
}

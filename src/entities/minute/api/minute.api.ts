import { normalizeIntradayMinutes } from '../model/minute.adapter'
import type { IntradayMinute } from '../model/minute.types'

export class IntradayMinutesRequestError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Intraday minutes request failed with status ${status}`)
    this.name = 'IntradayMinutesRequestError'
    this.status = status
  }
}

export async function fetchIntradayMinutes(signal?: AbortSignal): Promise<IntradayMinute[]> {
  const response = await fetch('/dev/st_data/intraday_minutes', {
    credentials: 'include',
    signal,
    headers: { Accept: 'application/json, text/plain' },
  })
  if (!response.ok) throw new IntradayMinutesRequestError(response.status)
  return normalizeIntradayMinutes(await response.text())
}


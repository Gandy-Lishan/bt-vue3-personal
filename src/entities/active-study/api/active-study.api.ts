import { normalizeActiveStudies } from '../model/active-study.adapter'
import type { ActiveStudiesResponse } from '../model/active-study.types'

export class ActiveStudiesRequestError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Active studies request failed with status ${status}`)
    this.name = 'ActiveStudiesRequestError'
    this.status = status
  }
}

export async function fetchActiveStudies(signal?: AbortSignal): Promise<ActiveStudiesResponse> {
  const response = await fetch('/dev/st_data/active_studies', {
    credentials: 'include',
    signal,
    headers: { Accept: 'application/json, text/plain' },
  })
  if (!response.ok) throw new ActiveStudiesRequestError(response.status)

  const body = await response.text()
  let payload: unknown = body
  try {
    payload = JSON.parse(body)
  } catch {
    // The adapter handles non-JSON values as an empty response.
  }
  return normalizeActiveStudies(payload)
}


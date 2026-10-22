import { normalizeArchivedStudies } from '../model/archived-study.adapter'
import type { ArchivedStudyRow } from '../model/archived-study.types'

export class ArchivedStudiesRequestError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Archived studies request failed with status ${status}`)
    this.name = 'ArchivedStudiesRequestError'
    this.status = status
  }
}

export async function fetchArchivedStudies(signal?: AbortSignal): Promise<ArchivedStudyRow[]> {
  const response = await fetch('/dev/st_data/archived_studies', {
    credentials: 'include',
    signal,
    headers: { Accept: 'application/json, text/plain' },
  })
  if (!response.ok) throw new ArchivedStudiesRequestError(response.status)
  return normalizeArchivedStudies(await response.text())
}


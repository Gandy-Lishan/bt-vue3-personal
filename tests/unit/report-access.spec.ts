import { describe, expect, it } from 'vitest'
import { canAccessReport, isReportPublic } from '@/entities/report/model/report.access'

const now = new Date('2026-10-20T12:00:00Z')

describe('report access', () => {
  it('makes public and lite reports available to everyone', () => {
    expect(isReportPublic('public', '2026-10-19T18:32:05Z', now)).toBe(true)
    expect(isReportPublic('lite', '2026-10-19T18:32:05Z', now)).toBe(true)
  })

  it('makes reports older than three months public', () => {
    expect(isReportPublic('modeledge', '2026-07-19T12:00:00Z', now)).toBe(true)
    expect(isReportPublic('modeledge', '2026-10-19T12:00:00Z', now)).toBe(false)
  })

  it('allows active members except datalite users', () => {
    expect(canAccessReport(['premium'], 'modeledge', '2026-10-19T12:00:00Z', now)).toBe(true)
    expect(canAccessReport(['datalite'], 'modeledge', '2026-10-19T12:00:00Z', now)).toBe(false)
    expect(canAccessReport([], 'modeledge', '2026-10-19T12:00:00Z', now)).toBe(false)
  })
})

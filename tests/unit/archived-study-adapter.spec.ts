import { describe, expect, it } from 'vitest'
import { archivedStudySortValue, normalizeArchivedStudies } from '@/entities/archived-study/model/archived-study.adapter'

describe('archived study adapter', () => {
  it('normalizes, filters and newest-first sorts archived studies', () => {
    const result = normalizeArchivedStudies({ data: JSON.stringify([
      { date: '2025-01-01', title: 'Older', market: 'spx', forecast: 'Up', outcome: 'Down', rating: 8, timeframe: 'Long-Term', filename: 'older' },
      { date: '2026-01-01', title: 'Newer', market: 'ndx', forecast: 'Down', outcome: 'Down', rating: 4, timeframe: 'Short-Term', filename: 'newer' },
      { date: '2026-02-01', title: 'Invalid', market: 'None' },
      { date: '2026-03-01', title: 'Invalid', market: 'Null' },
    ]) })

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ title: 'Newer', rating: 4, href: 'https://sentimentrader.com/blog/newer' })
    expect(result[1]?.rating).toBe(5)
    expect(archivedStudySortValue(result[0]!, 'rating')).toBe(4)
  })

  it('unwraps repeatedly encoded archived_studies envelopes', () => {
    const rows = [{ date: '2026-01-01', title: 'Nested', market: 'gold', rating: null }]
    const result = normalizeArchivedStudies(JSON.stringify(JSON.stringify({ archived_studies: JSON.stringify(rows) })))
    expect(result[0]).toMatchObject({ title: 'Nested', market: 'gold', rating: 0 })
  })
})


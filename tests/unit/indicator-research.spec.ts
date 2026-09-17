import { describe, expect, it } from 'vitest'
import { researchPostRow, researchPostRows } from '@/entities/indicator/model/indicator.research'
import { researchPostColumns } from '@/entities/indicator/model/indicator.table'
import { displayIndicatorValue, indicatorSortValue } from '@/entities/indicator/model/indicator.values'

function column(key: string) {
  const match = researchPostColumns.find((item) => item.key === key)
  if (!match) throw new Error(`No research column for ${key}`)
  return match
}

describe('indicator research helpers', () => {
  it('exposes only the date published and title columns', () => {
    expect(researchPostColumns.map((item) => item.key)).toEqual(['date', 'title'])
    expect(researchPostColumns.map((item) => item.label)).toEqual(['Date Published', 'Title'])
  })

  it('maps a post onto a row the shared table can render', () => {
    const row = researchPostRow({
      title: 'Research note for breadth',
      url: '/users/blog/research-note',
      date: '2026-09-01',
      summary: 'A short research summary.',
    })

    expect(displayIndicatorValue(row, column('title'))).toBe('Research note for breadth')
    expect(displayIndicatorValue(row, column('date'))).toBe('September 1, 2026')
    expect(row.raw?.url).toBe('/users/blog/research-note')
  })

  it('renders an em dash for a post with no date rather than a blank cell', () => {
    const row = researchPostRow({ title: 'Undated note' })

    expect(displayIndicatorValue(row, column('date'))).toBe('—')
    expect(row.raw?.url).toBeUndefined()
  })

  it('sorts posts by published date, oldest first', () => {
    const rows = researchPostRows([
      { title: 'Newest', date: '2026-09-01' },
      { title: 'Oldest', date: '2024-01-15' },
      { title: 'Middle', date: '2025-06-30' },
    ])

    const sorted = [...rows].sort(
      (left, right) =>
        Number(indicatorSortValue(left, 'date', 'date')) - Number(indicatorSortValue(right, 'date', 'date')),
    )

    expect(sorted.map((row) => row.name)).toEqual(['Oldest', 'Middle', 'Newest'])
  })

  it('sorts posts by title case-insensitively', () => {
    const rows = researchPostRows([{ title: 'banana' }, { title: 'Apple' }, { title: 'cherry' }])

    const sorted = [...rows].sort((left, right) =>
      String(indicatorSortValue(left, 'title', 'link')).localeCompare(String(indicatorSortValue(right, 'title', 'link'))),
    )

    expect(sorted.map((row) => row.name)).toEqual(['Apple', 'banana', 'cherry'])
  })

  it('falls back to the url when a post has no title', () => {
    const row = researchPostRow({ title: '', url: '/users/blog/untitled' })

    expect(row.name).toBe('/users/blog/untitled')
    expect(row.id).toBe('/users/blog/untitled')
  })
})

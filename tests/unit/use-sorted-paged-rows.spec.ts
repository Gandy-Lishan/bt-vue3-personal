import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useSortedPagedRows } from '@/pages/indicators/composables/useSortedPagedRows'
import { indicatorSortValue } from '@/entities/indicator/model/indicator.values'
import type { Indicator } from '@/entities/indicator/model/indicator.types'

function row(name: string, value: number): Indicator {
  return {
    id: name.toLowerCase(),
    name,
    group: '',
    groupId: '',
    subgroup: '',
    sourceList: '',
    timeFrame: '',
    currentValue: value,
    change: 0,
    updatedAt: '',
    sentiment: 'neutral',
    sentimentScore: 4,
    trend: [],
    favorite: false,
    type: 'Indicator',
    raw: { chart_name: name, last_value: value },
  }
}

function rowsFrom(names: string[]) {
  return names.map((name, index) => row(name, index))
}

describe('useSortedPagedRows', () => {
  it('keeps payload order until a sort column is chosen', () => {
    const rows = ref(rowsFrom(['Charlie', 'Alpha', 'Bravo']))
    const table = useSortedPagedRows(rows, indicatorSortValue)

    expect(table.pagedRows.value.map((item) => item.name)).toEqual(['Charlie', 'Alpha', 'Bravo'])
  })

  it('sorts ascending then toggles to descending on a repeat click', () => {
    const rows = ref(rowsFrom(['Charlie', 'Alpha', 'Bravo']))
    const table = useSortedPagedRows(rows, indicatorSortValue)
    const column = { key: 'chart_name', label: 'Name', kind: 'name' as const }

    table.sort(column)
    expect(table.pagedRows.value.map((item) => item.name)).toEqual(['Alpha', 'Bravo', 'Charlie'])

    table.sort(column)
    expect(table.pagedRows.value.map((item) => item.name)).toEqual(['Charlie', 'Bravo', 'Alpha'])
    expect(table.sortDirection.value).toBe('desc')
  })

  it('resets to ascending when switching to a different column', () => {
    const rows = ref(rowsFrom(['Charlie', 'Alpha', 'Bravo']))
    const table = useSortedPagedRows(rows, indicatorSortValue)

    table.sort({ key: 'chart_name', label: 'Name', kind: 'name' })
    table.sort({ key: 'chart_name', label: 'Name', kind: 'name' })
    expect(table.sortDirection.value).toBe('desc')

    table.sort({ key: 'last_value', label: 'Value', kind: 'number' })

    expect(table.sortDirection.value).toBe('asc')
    expect(table.page.value).toBe(1)
  })

  it('paginates at the shared page size and reports result bounds', () => {
    const rows = ref(rowsFrom(Array.from({ length: 30 }, (_, index) => `Indicator ${index}`)))
    const table = useSortedPagedRows(rows, indicatorSortValue)

    expect(table.pageCount.value).toBe(3)
    expect(table.pagedRows.value).toHaveLength(12)
    expect(table.resultStart.value).toBe(1)
    expect(table.resultEnd.value).toBe(12)

    table.setPage(3)

    expect(table.pagedRows.value).toHaveLength(6)
    expect(table.resultStart.value).toBe(25)
    expect(table.resultEnd.value).toBe(30)
  })

  it('clamps page requests to the available range', () => {
    const rows = ref(rowsFrom(['Alpha']))
    const table = useSortedPagedRows(rows, indicatorSortValue)

    table.setPage(9)
    expect(table.page.value).toBe(1)

    table.setPage(-4)
    expect(table.page.value).toBe(1)
  })

  it('reports empty bounds when there are no rows', () => {
    const table = useSortedPagedRows(ref<Indicator[]>([]), indicatorSortValue)

    expect(table.pageCount.value).toBe(1)
    expect(table.resultStart.value).toBe(0)
    expect(table.resultEnd.value).toBe(0)
  })

  it('returns to the first page when sorting changes the visible rows', () => {
    const rows = ref(rowsFrom(Array.from({ length: 30 }, (_, index) => `Indicator ${index}`)))
    const table = useSortedPagedRows(rows, indicatorSortValue)

    table.setPage(3)
    table.sort({ key: 'chart_name', label: 'Name', kind: 'name' })

    expect(table.page.value).toBe(1)
  })

  it('clears paging and sorting on reset', () => {
    const rows = ref(rowsFrom(['Charlie', 'Alpha']))
    const table = useSortedPagedRows(rows, indicatorSortValue)

    table.sort({ key: 'chart_name', label: 'Name', kind: 'name' })
    table.reset()

    expect(table.sortKey.value).toBe('')
    expect(table.sortDirection.value).toBe('asc')
    expect(table.page.value).toBe(1)
    expect(table.pagedRows.value.map((item) => item.name)).toEqual(['Charlie', 'Alpha'])
  })
})

import { computed, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { INDICATOR_PAGE_SIZE } from '@/entities/indicator/model/indicator.table'
import { compareSortValues } from '@/entities/indicator/model/indicator.values'
import type { IndicatorTableColumnKind } from '@/entities/indicator/model/indicator.table'
import type { IndicatorSortDirection } from '@/entities/indicator/model/indicator.types'

export type SortableValue = string | number | null

/** Extracts the value a column sorts on. Row shape is up to the caller. */
export type RowSortValue<T> = (row: T, key: string, kind: IndicatorTableColumnKind) => SortableValue

/** The only part of a column the sorting cares about. */
export interface SortableColumn {
  key: string
  kind?: IndicatorTableColumnKind
}

/**
 * Per-table sorting and pagination for tables inside the Indicator Detail page.
 *
 * The Indicator List page keeps this state in the Pinia store because it owns the
 * page-level filters. Detail-page tables are independent of that state, so each one
 * gets its own instance here rather than a slice of the shared store.
 *
 * `sortValue` is supplied by the caller so the same paging and sort-toggling behaviour
 * serves indicator rows and constituent rows alike.
 */
export function useSortedPagedRows<T>(
  rows: Ref<T[]>,
  sortValue: RowSortValue<T>,
  pageSize: number = INDICATOR_PAGE_SIZE,
) {
  const page = ref(1)
  const sortKey = ref('')
  const sortKind = ref<IndicatorTableColumnKind | null>(null)
  const sortDirection = ref<IndicatorSortDirection>('asc')

  const sortedRows = computed<T[]>(() => {
    if (!sortKey.value) return rows.value

    return rows.value
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        const kind = sortKind.value ?? 'text'
        const leftValue = sortValue(left.row, sortKey.value, kind)
        const rightValue = sortValue(right.row, sortKey.value, kind)
        // Ties keep payload order, so the list stays stable across re-sorts.
        return compareSortValues(leftValue, rightValue, sortDirection.value) || left.index - right.index
      })
      .map(({ row }) => row)
  })

  const pageCount = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / pageSize)))

  const pagedRows = computed<T[]>(() => {
    const start = (page.value - 1) * pageSize
    return sortedRows.value.slice(start, start + pageSize)
  })

  const resultStart = computed(() => (sortedRows.value.length ? (page.value - 1) * pageSize + 1 : 0))
  const resultEnd = computed(() => Math.min(page.value * pageSize, sortedRows.value.length))

  function sort(column: SortableColumn) {
    if (sortKey.value === column.key) {
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortKey.value = column.key
      sortKind.value = column.kind ?? 'text'
      sortDirection.value = 'asc'
    }

    page.value = 1
  }

  function setSort(column: SortableColumn, direction: IndicatorSortDirection) {
    sortKey.value = column.key
    sortKind.value = column.kind ?? 'text'
    sortDirection.value = direction
    page.value = 1
  }

  function setPage(next: number) {
    page.value = Math.max(1, Math.min(next, pageCount.value))
  }

  function reset() {
    page.value = 1
    sortKey.value = ''
    sortKind.value = null
    sortDirection.value = 'asc'
  }

  watch(
    () => sortedRows.value.length,
    () => {
      page.value = Math.max(1, Math.min(page.value, pageCount.value))
    },
  )

  return {
    page,
    sortKey,
    sortDirection,
    sortedRows,
    pagedRows,
    pageCount,
    resultStart,
    resultEnd,
    sort,
    setSort,
    setPage,
    reset,
  }
}

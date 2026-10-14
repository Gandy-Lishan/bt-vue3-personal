<script setup lang="ts" generic="Row, Key extends string">
import { ArrowDown, ArrowUp, ArrowUpDown } from '@lucide/vue'

export interface SeasonalityTableColumn<K extends string> {
  key: K
  label: string
  align?: 'left' | 'right' | 'center'
  minWidth?: number
}

const props = withDefaults(
  defineProps<{
    columns: Array<SeasonalityTableColumn<Key>>
    rows: Row[]
    loading?: boolean
    emptyMessage?: string
    sortKey: Key
    sortDirection: 'asc' | 'desc'
    rowKey: (row: Row) => string | number
    cellText: (row: Row, key: Key) => string
    cellClass?: (row: Row, key: Key) => string
    rowClass?: (row: Row) => string
    /** Caps the table height and pins the header, for long tables. */
    maxHeight?: number
  }>(),
  {
    loading: false,
    emptyMessage: 'No rows',
    cellClass: undefined,
    rowClass: undefined,
    maxHeight: undefined,
  },
)

defineEmits<{
  sort: [key: Key]
}>()

function alignClass(column: SeasonalityTableColumn<Key>) {
  if (column.align === 'right') return 'text-right'
  if (column.align === 'center') return 'text-center'
  return 'text-left'
}

function justifyClass(column: SeasonalityTableColumn<Key>) {
  if (column.align === 'right') return 'justify-end'
  if (column.align === 'center') return 'justify-center'
  return 'justify-start'
}

function columnMinWidth(column: SeasonalityTableColumn<Key>) {
  return column.minWidth ?? 120
}

function isSorted(column: SeasonalityTableColumn<Key>) {
  return props.sortKey === column.key
}

function sortAria(column: SeasonalityTableColumn<Key>) {
  if (!isSorted(column)) return 'none'
  return props.sortDirection === 'asc' ? 'ascending' : 'descending'
}

function sortButtonLabel(column: SeasonalityTableColumn<Key>) {
  const nextDirection = isSorted(column) && props.sortDirection === 'asc' ? 'descending' : 'ascending'
  return `Sort by ${column.label} ${nextDirection}`
}

function sortIcon(column: SeasonalityTableColumn<Key>) {
  if (!isSorted(column)) return ArrowUpDown
  return props.sortDirection === 'asc' ? ArrowUp : ArrowDown
}

function cellClass(column: SeasonalityTableColumn<Key>, row: Row) {
  return props.cellClass?.(row, column.key) ?? ''
}
</script>

<template>
  <div class="overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)]">
    <div class="overflow-x-auto" :style="props.maxHeight ? { maxHeight: `${props.maxHeight}px`, overflow: 'auto' } : undefined">
      <table class="min-w-full border-collapse text-left text-[0.8125rem] text-[var(--app-text)]">
        <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold">
          <tr class="border-b border-[var(--app-border)]">
            <th
              v-for="column in props.columns"
              :key="column.key"
              scope="col"
              class="box-border px-3 py-2.5"
              :class="[alignClass(column), props.maxHeight ? 'sticky top-0 z-[1] bg-[var(--app-surface-muted)]' : '']"
              :style="{ minWidth: `calc(${columnMinWidth(column)}px * var(--fixed-ui-scale, 1))` }"
              :aria-sort="sortAria(column)"
            >
              <button
                class="inline-flex w-full items-center gap-1 text-[0.6875rem] font-semibold transition hover:text-[var(--app-primary)]"
                :class="[justifyClass(column), isSorted(column) ? 'text-[var(--app-primary)]' : 'text-[var(--app-text)]']"
                type="button"
                :aria-label="sortButtonLabel(column)"
                @click="$emit('sort', column.key)"
              >
                <span>{{ column.label }}</span>
                <component :is="sortIcon(column)" :size="13" aria-hidden="true" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="props.loading">
            <td :colspan="props.columns.length" class="h-44 px-4 py-10 text-center text-sm text-[var(--app-text-muted)]">
              Loading...
            </td>
          </tr>
          <tr v-else-if="!props.rows.length">
            <td :colspan="props.columns.length" class="h-44 px-4 py-10 text-center text-sm text-[var(--app-text-muted)]">
              {{ props.emptyMessage }}
            </td>
          </tr>
          <template v-else>
            <tr
              v-for="row in props.rows"
              :key="props.rowKey(row)"
              class="border-b border-[var(--app-border-muted)] odd:bg-[var(--app-surface)] even:bg-[var(--app-row-even)] last:border-b-0 hover:bg-[var(--app-surface-hover)]"
              :class="props.rowClass?.(row) ?? ''"
            >
              <td
                v-for="column in props.columns"
                :key="column.key"
                class="box-border px-3 py-2.5 font-semibold"
                :class="[alignClass(column), cellClass(column, row)]"
              >
                {{ props.cellText(row, column.key) }}
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

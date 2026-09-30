<script setup lang="ts">
import { computed } from 'vue'
import type { AppDataTableColumn } from './app-data-table.types'

const props = withDefaults(
  defineProps<{
    columns: AppDataTableColumn[]
    rows: Array<Record<string, unknown>>
    loading?: boolean
    emptyMessage?: string
  }>(),
  {
    loading: false,
    emptyMessage: 'No rows found',
  },
)

const tableColspan = computed(() => Math.max(1, props.columns.length))

function alignClass(column: AppDataTableColumn) {
  if (column.align === 'right') return 'text-right'
  if (column.align === 'center') return 'text-center'
  return 'text-left'
}

function displayValue(column: AppDataTableColumn, row: Record<string, unknown>) {
  const value = row[column.key]
  if (column.format) return column.format(value, row)
  if (value === undefined || value === null || value === '') return '—'
  return String(value)
}

function cellClass(column: AppDataTableColumn, row: Record<string, unknown>) {
  return column.cellClass?.(row[column.key], row) ?? ''
}

function badgeClass(column: AppDataTableColumn, row: Record<string, unknown>) {
  return column.badgeClass?.(row[column.key], row) ?? ''
}
</script>

<template>
  <div class="overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)]">
    <div class="overflow-x-auto">
      <table class="min-w-full border-collapse text-[0.8125rem] text-[var(--app-text)]">
        <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold">
          <tr class="border-b border-[var(--app-border)]">
            <th
              v-for="column in props.columns"
              :key="column.key"
              scope="col"
              class="box-border px-3 py-2.5"
              :class="alignClass(column)"
              :style="{ minWidth: column.minWidth ? `calc(${column.minWidth}px * var(--fixed-ui-scale, 1))` : undefined }"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="props.loading">
            <td :colspan="tableColspan" class="h-44 px-4 py-10 text-center text-sm text-[var(--app-text-muted)]">
              Loading...
            </td>
          </tr>
          <tr v-else-if="!props.rows.length">
            <td :colspan="tableColspan" class="h-44 px-4 py-10 text-center text-sm text-[var(--app-text-muted)]">
              {{ props.emptyMessage }}
            </td>
          </tr>
          <template v-else>
            <tr
              v-for="(row, index) in props.rows"
              :key="String(row.id ?? index)"
              class="border-b border-[var(--app-border-muted)] odd:bg-[var(--app-surface)] even:bg-[var(--app-row-even)] last:border-b-0 hover:bg-[var(--app-surface-hover)]"
            >
              <td
                v-for="column in props.columns"
                :key="column.key"
                class="box-border px-3 py-2.5 font-semibold"
                :class="[alignClass(column), cellClass(column, row)]"
              >
                <span v-if="column.badgeClass" class="inline-flex rounded-md px-2.5 py-1 text-xs font-extrabold" :class="badgeClass(column, row)">
                  {{ displayValue(column, row) }}
                </span>
                <span v-else>{{ displayValue(column, row) }}</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

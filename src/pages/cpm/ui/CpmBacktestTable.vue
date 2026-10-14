<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, Eye, Settings2, Trash2 } from '@lucide/vue'
import { formatCpmNumber, formatCpmPercent } from '@/entities/cpm/model/cpm.adapter'
import type { CpmBacktestRow, CpmSortDirection, CpmSortKey } from '@/entities/cpm/model/cpm.types'

const props = withDefaults(
  defineProps<{
    rows: CpmBacktestRow[]
    loading?: boolean
    sortKey?: CpmSortKey | ''
    sortDirection?: CpmSortDirection
  }>(),
  {
    loading: false,
    sortKey: '',
    sortDirection: 'asc',
  },
)

defineEmits<{
  sort: [key: CpmSortKey]
  preview: [row: CpmBacktestRow]
  open: [row: CpmBacktestRow]
  delete: [row: CpmBacktestRow]
}>()

const columns: Array<{ key: CpmSortKey | 'period' | 'actions'; label: string; minWidth: number; align?: 'left' | 'center' | 'right'; sortable?: boolean }> = [
  { key: 'name', label: 'Name', minWidth: 150, sortable: true },
  { key: 'symbol', label: 'Symbol', minWidth: 80, sortable: true },
  { key: 'timeframe', label: 'Timeframe', minWidth: 80, sortable: true },
  { key: 'period', label: 'Pattern Period', minWidth: 190 },
  { key: 'status', label: 'Status', minWidth: 90, align: 'center', sortable: true },
  { key: 'barsNumber', label: 'Pattern Bars', minWidth: 95, align: 'right', sortable: true },
  { key: 'totalTrades', label: 'Total Trades', minWidth: 95, align: 'right', sortable: true },
  { key: 'totalReturn', label: 'Total Return', minWidth: 100, align: 'right', sortable: true },
  { key: 'actions', label: 'Actions', minWidth: 128, align: 'right' },
]

const tableColspan = computed(() => columns.length)

function isSortable(key: string): key is CpmSortKey {
  return columns.some((column) => column.key === key && column.sortable)
}

function isSorted(key: string) {
  return props.sortKey === key
}

function sortIcon(key: string) {
  if (!isSorted(key)) return ArrowUpDown
  return props.sortDirection === 'asc' ? ArrowUp : ArrowDown
}

function alignClass(align?: string) {
  if (align === 'right') return 'text-right'
  if (align === 'center') return 'text-center'
  return 'text-left'
}

function statusClass(row: CpmBacktestRow) {
  if (row.status === 'Finish') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (row.status === 'Running') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (row.status === 'Fail') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--app-text-muted)]'
}

function returnClass(row: CpmBacktestRow) {
  if ((row.totalReturn ?? 0) > 0) return 'text-[var(--app-positive)]'
  if ((row.totalReturn ?? 0) < 0) return 'text-[var(--app-negative)]'
  return 'text-[var(--app-text-secondary)]'
}
</script>

<template>
  <div class="overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)]">
    <div class="overflow-x-auto">
      <table class="w-full table-fixed border-collapse text-left text-[0.8125rem] text-[var(--app-text)]">
        <colgroup>
          <col
            v-for="column in columns"
            :key="column.key"
            :style="{ width: `calc(${column.minWidth}px * var(--fixed-ui-scale, 1))` }"
          />
        </colgroup>
        <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold">
          <tr class="border-b border-[var(--app-border)]">
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              class="box-border px-3 py-2.5"
              :class="alignClass(column.align)"
              :title="column.label"
              :aria-sort="isSorted(column.key) ? (props.sortDirection === 'asc' ? 'ascending' : 'descending') : undefined"
            >
              <button
                v-if="isSortable(column.key)"
                class="inline-flex w-full min-w-0 items-center gap-1 text-[0.6875rem] font-semibold transition hover:text-[var(--app-primary)]"
                :class="[isSorted(column.key) ? 'text-[var(--app-primary)]' : 'text-[var(--app-text)]', alignClass(column.align), column.align === 'right' ? 'justify-end' : column.align === 'center' ? 'justify-center' : 'justify-start']"
                type="button"
                @click="$emit('sort', column.key)"
              >
                <span class="min-w-0">{{ column.label }}</span>
                <component :is="sortIcon(column.key)" :size="13" class="shrink-0" aria-hidden="true" />
              </button>
              <span v-else>{{ column.label }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="props.loading">
            <td :colspan="tableColspan" class="h-64 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
              Loading CPM backtests...
            </td>
          </tr>
          <tr v-else-if="!props.rows.length">
            <td :colspan="tableColspan" class="h-64 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
              No CPM backtests found
            </td>
          </tr>
          <template v-else>
            <tr
              v-for="row in props.rows"
              :key="row.id"
              class="border-b border-[var(--app-border-muted)] odd:bg-[var(--app-surface)] even:bg-[var(--app-row-even)] last:border-b-0 hover:bg-[var(--app-surface-hover)]"
            >
              <td class="box-border px-3 py-2.5">
                <button class="block w-full truncate text-left font-extrabold text-[var(--app-primary)] transition hover:underline" type="button" title="View results" @click="$emit('open', row)">
                  {{ row.name || '-' }}
                </button>
              </td>
              <td class="box-border px-3 py-2.5 font-semibold">{{ row.symbol || '-' }}</td>
              <td class="box-border px-3 py-2.5 font-semibold">{{ row.timeframe || '-' }}</td>
              <td class="box-border whitespace-nowrap px-3 py-2.5 font-semibold text-[var(--app-text-secondary)]">
                <template v-if="row.startDate && row.endDate">
                  <span>{{ row.startDate }}</span>
                  <ArrowRight class="mx-1.5 inline-block h-3.5 w-3.5 align-middle text-[var(--app-text-muted)]" :size="14" />
                  <span>{{ row.endDate }}</span>
                </template>
                <span v-else>{{ row.period }}</span>
              </td>
              <td class="box-border px-3 py-2.5 text-center">
                <span class="inline-flex rounded-md border px-2.5 py-1 text-xs font-extrabold" :class="statusClass(row)">
                  {{ row.status }}
                </span>
              </td>
              <td class="box-border px-3 py-2.5 text-right font-semibold">{{ formatCpmNumber(row.barsNumber, 0, true) }}</td>
              <td class="box-border px-3 py-2.5 text-right font-semibold">{{ formatCpmNumber(row.totalTrades, 0, true) }}</td>
              <td class="box-border px-3 py-2.5 text-right font-extrabold" :class="returnClass(row)">
                {{ formatCpmPercent(row.totalReturn) }}
              </td>
              <td class="box-border px-3 py-2.5 text-right">
                <div class="inline-flex items-center gap-1">
                  <button
                    class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--app-text-muted)] transition hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]"
                    type="button"
                    title="Preview setup"
                    aria-label="Preview setup"
                    @click="$emit('preview', row)"
                  >
                    <Settings2 :size="16" />
                  </button>
                  <button
                    class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--app-text-muted)] transition hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]"
                    type="button"
                    title="View results"
                    aria-label="View results"
                    @click="$emit('open', row)"
                  >
                    <Eye :size="16" />
                  </button>
                  <button
                    class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--app-text-muted)] transition hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]"
                    type="button"
                    title="Delete"
                    aria-label="Delete"
                    @click="$emit('delete', row)"
                  >
                    <Trash2 :size="16" />
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

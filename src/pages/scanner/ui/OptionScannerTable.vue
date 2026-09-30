<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, CircleHelp } from '@lucide/vue'
import {
  formatOptionNumber,
  formatOptionPercent,
  formatOptionPrice,
  OPTION_SCANNER_COLUMN_HINTS,
} from '@/entities/scanner/model/option-scanner.adapter'
import type {
  OptionScannerRow,
  OptionScannerSortDirection,
  OptionScannerSortKey,
} from '@/entities/scanner/model/option-scanner.types'

const props = withDefaults(
  defineProps<{
    rows: OptionScannerRow[]
    loading?: boolean
    sortKey?: OptionScannerSortKey | ''
    sortDirection?: OptionScannerSortDirection
  }>(),
  {
    loading: false,
    sortKey: '',
    sortDirection: 'asc',
  },
)

defineEmits<{
  sort: [key: OptionScannerSortKey]
}>()

type OptionScannerColumn = {
  key: OptionScannerSortKey
  label: string
  minWidth: number
  align?: 'left' | 'right' | 'center'
  format: (row: OptionScannerRow) => string
}

const columns: OptionScannerColumn[] = [
  { key: 'symbol', label: 'Symbol', minWidth: 76, format: (row) => row.symbol },
  { key: 'lastClose', label: 'Last Close', minWidth: 80, align: 'right', format: (row) => formatOptionPrice(row.lastClose) },
  { key: 'expireDate', label: 'Expire Date', minWidth: 100, format: (row) => row.expireDate || '—' },
  { key: 'dte', label: 'DTE', minWidth: 54, align: 'right', format: (row) => formatOptionNumber(row.dte, 0, false) },
  { key: 'strike', label: 'Strike', minWidth: 64, align: 'right', format: (row) => formatOptionNumber(row.strike, 0) },
  { key: 'breakEven', label: 'Break Even', minWidth: 88, align: 'right', format: (row) => formatOptionPrice(row.breakEven) },
  {
    key: 'probabilityOfProfit',
    label: 'Prob. of Profit',
    minWidth: 116,
    align: 'right',
    format: (row) => formatOptionPercent(row.probabilityOfProfit),
  },
  { key: 'credit', label: 'Credit', minWidth: 64, align: 'right', format: (row) => formatOptionPrice(row.credit) },
  { key: 'margin', label: 'Margin', minWidth: 80, align: 'right', format: (row) => formatOptionNumber(row.margin, 0, false) },
  {
    key: 'returnPercent',
    label: 'Return %',
    minWidth: 80,
    align: 'right',
    format: (row) => formatOptionPercent(row.returnPercent),
  },
  {
    key: 'expectedValueScore',
    label: 'Expected Value Score',
    minWidth: 128,
    align: 'right',
    format: (row) => formatOptionNumber(row.expectedValueScore, 2, false),
  },
  { key: 'cagr', label: 'CAGR %', minWidth: 74, align: 'right', format: (row) => formatOptionPercent(row.cagr) },
]

const expandedIds = ref(new Set<string>())
const tableColspan = computed(() => columns.length + 1)

function alignClass(column: OptionScannerColumn) {
  if (column.align === 'right') return 'text-right'
  if (column.align === 'center') return 'text-center'
  return 'text-left'
}

function isSorted(key: OptionScannerSortKey) {
  return props.sortKey === key
}

function sortIcon(key: OptionScannerSortKey) {
  if (!isSorted(key)) return ArrowUpDown
  return props.sortDirection === 'asc' ? ArrowUp : ArrowDown
}

function toggleExpanded(row: OptionScannerRow) {
  const next = new Set(expandedIds.value)
  if (next.has(row.id)) next.delete(row.id)
  else next.add(row.id)
  expandedIds.value = next
}

function isExpanded(row: OptionScannerRow) {
  return expandedIds.value.has(row.id)
}

function columnHint(key: OptionScannerSortKey) {
  return OPTION_SCANNER_COLUMN_HINTS[key] ?? ''
}

function expandedMetrics(row: OptionScannerRow) {
  return [
    { label: 'Volume', value: formatOptionNumber(row.volume, 0, false) },
    { label: 'Open Interest', value: formatOptionNumber(row.openInterest, 0, false) },
    { label: 'Implied Volatility', value: formatOptionPercent(row.impliedVolatility) },
    { label: 'Delta', value: formatOptionNumber(row.delta, 4, false) },
    { label: 'Vega', value: formatOptionNumber(row.vega, 4, false) },
    { label: 'Contract Symbol', value: row.contractSymbol || '—' },
  ]
}

function cellTitle(row: OptionScannerRow, column: OptionScannerColumn) {
  return column.format(row)
}
</script>

<template>
  <div class="overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)]">
    <div class="overflow-x-auto">
      <table class="w-full table-fixed border-collapse text-left text-[0.75rem] text-[var(--app-text)]">
        <colgroup>
          <col class="w-8" />
          <col
            v-for="column in columns"
            :key="column.key"
            :style="{ width: `calc(${column.minWidth}px * var(--fixed-ui-scale, 1))` }"
          />
        </colgroup>
        <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold">
          <tr class="border-b border-[var(--app-border)]">
            <th scope="col" class="box-border w-8 px-1.5 py-2.5" />
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              class="box-border px-1.5 py-2.5"
              :class="alignClass(column)"
              :aria-sort="isSorted(column.key) ? (props.sortDirection === 'asc' ? 'ascending' : 'descending') : undefined"
            >
              <button
                class="inline-flex w-full min-w-0 items-center gap-0.5 text-[0.6875rem] font-semibold transition hover:text-[var(--app-primary)]"
                :class="[isSorted(column.key) ? 'text-[var(--app-primary)]' : 'text-[var(--app-text)]', column.align === 'right' ? 'justify-end' : 'justify-start']"
                type="button"
                @click="$emit('sort', column.key)"
              >
                <span class="min-w-0 truncate">{{ column.label }}</span>
                <span v-if="columnHint(column.key)" class="option-help shrink-0" @click.stop>
                  <CircleHelp :size="11" aria-hidden="true" />
                  <span class="option-help__hint" role="tooltip">{{ columnHint(column.key) }}</span>
                </span>
                <component :is="sortIcon(column.key)" :size="13" class="shrink-0" aria-hidden="true" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="props.loading">
            <td :colspan="tableColspan" class="h-64 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
              Loading smart option scanner contracts...
            </td>
          </tr>
          <tr v-else-if="!props.rows.length">
            <td :colspan="tableColspan" class="h-64 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
              No option scanner contracts found
            </td>
          </tr>
          <template v-else>
            <template v-for="row in props.rows" :key="row.id">
              <tr class="border-b border-[var(--app-border-muted)] odd:bg-[var(--app-surface)] even:bg-[var(--app-row-even)] hover:bg-[var(--app-surface-hover)]">
                <td class="box-border px-1.5 py-2.5">
                  <button
                    class="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--app-text-muted)] transition hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]"
                    type="button"
                    :aria-expanded="isExpanded(row)"
                    :aria-label="isExpanded(row) ? 'Hide option details' : 'Show option details'"
                    @click="toggleExpanded(row)"
                  >
                    <ChevronRight :size="17" class="transition" :class="{ 'rotate-90': isExpanded(row) }" />
                  </button>
                </td>
                <td
                  v-for="column in columns"
                  :key="column.key"
                  class="box-border min-w-0 px-1.5 py-2.5 font-semibold"
                  :class="alignClass(column)"
                  :title="cellTitle(row, column)"
                >
                  <span v-if="column.key === 'symbol'" class="block truncate font-extrabold text-[var(--app-primary)]">{{ column.format(row) }}</span>
                  <span v-else class="block truncate">{{ column.format(row) }}</span>
                </td>
              </tr>
              <tr v-if="isExpanded(row)" class="border-b border-[var(--app-border-muted)] bg-[var(--app-surface-soft)]">
                <td :colspan="tableColspan" class="px-4 py-3">
                  <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                    <div
                      v-for="metric in expandedMetrics(row)"
                      :key="metric.label"
                      class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] px-3 py-2"
                    >
                      <div class="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--app-text-muted)]">{{ metric.label }}</div>
                      <div class="mt-1 truncate text-sm font-extrabold text-[var(--app-text)]" :title="metric.value">{{ metric.value }}</div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.option-help {
  position: relative;
  display: inline-flex;
  align-items: center;
  color: var(--app-text-faint);
  cursor: help;
}

.option-help__hint {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  z-index: 30;
  width: max-content;
  max-width: 280px;
  padding: 7px 10px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-surface);
  box-shadow: 0 12px 30px rgba(5, 16, 31, 0.18);
  color: var(--app-text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.45;
  text-align: left;
  white-space: normal;
  display: none;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%) translateY(-2px);
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.option-help:hover .option-help__hint,
.option-help:focus-within .option-help__hint {
  display: block;
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, CircleHelp } from '@lucide/vue'
import {
  formatScannerNumber,
  formatScannerPercent,
  formatScannerPrice,
  smartScannerSignalDescription,
} from '@/entities/scanner/model/smart-scanner.adapter'
import type {
  SmartScannerRow,
  SmartScannerSortDirection,
  SmartScannerSortKey,
} from '@/entities/scanner/model/smart-scanner.types'

const props = withDefaults(
  defineProps<{
    rows: SmartScannerRow[]
    loading?: boolean
    sortKey?: SmartScannerSortKey | ''
    sortDirection?: SmartScannerSortDirection
  }>(),
  {
    loading: false,
    sortKey: '',
    sortDirection: 'asc',
  },
)

defineEmits<{
  sort: [key: SmartScannerSortKey]
  open: [row: SmartScannerRow]
}>()

const columns: Array<{ key: SmartScannerSortKey; label: string; minWidth: number; kind: 'text' | 'number' | 'date' }> = [
  { key: 'date', label: 'Date', minWidth: 110, kind: 'date' },
  { key: 'symbol', label: 'Symbol', minWidth: 100, kind: 'text' },
  { key: 'close', label: 'Close', minWidth: 100, kind: 'number' },
  { key: 'pctChange', label: 'Change', minWidth: 105, kind: 'number' },
  { key: 'trend', label: 'Trend', minWidth: 100, kind: 'text' },
  { key: 'trendScore', label: 'Trend Score', minWidth: 116, kind: 'number' },
  { key: 'direction', label: 'Direction', minWidth: 106, kind: 'text' },
  { key: 'signal', label: 'Signal', minWidth: 160, kind: 'text' },
  { key: 'winRate', label: 'Win Rate', minWidth: 110, kind: 'number' },
  { key: 'stopLoss', label: 'Stop Loss', minWidth: 110, kind: 'number' },
  { key: 'profitTarget', label: 'Profit Target', minWidth: 126, kind: 'number' },
  { key: 'timeInMarket', label: 'Time In Market', minWidth: 138, kind: 'number' },
  { key: 'expectedReturn', label: 'Expected Return', minWidth: 142, kind: 'number' },
  { key: 'zScore', label: 'Z-Score', minWidth: 100, kind: 'number' },
]

const expandedIds = ref(new Set<string>())
const tableColspan = computed(() => columns.length + 1)
const columnHints: Partial<Record<SmartScannerSortKey, string>> = {
  trend:
    'Closing price above the 252-day moving average is considered as Uptrend. Closing price below the 252-day moving average is considered as Downtrend. The whole backtest period is considered as ALL.',
  expectedReturn: 'ExpectedReturn = (WinRate * ProfitTarget - (100.0 - WinRate) * StopLoss) / 100.0',
}

function isSorted(key: SmartScannerSortKey) {
  return props.sortKey === key
}

function sortIcon(key: SmartScannerSortKey) {
  if (!isSorted(key)) return ArrowUpDown
  return props.sortDirection === 'asc' ? ArrowUp : ArrowDown
}

function toggleExpanded(row: SmartScannerRow) {
  const next = new Set(expandedIds.value)
  if (next.has(row.id)) next.delete(row.id)
  else next.add(row.id)
  expandedIds.value = next
}

function isExpanded(row: SmartScannerRow) {
  return expandedIds.value.has(row.id)
}

function changeClass(value: number | null) {
  if ((value ?? 0) > 0) return 'text-[var(--app-positive)]'
  if ((value ?? 0) < 0) return 'text-[var(--app-negative)]'
  return 'text-[var(--app-text-secondary)]'
}

function directionClass(direction: string) {
  return direction.toLowerCase() === 'short'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

function columnHint(key: SmartScannerSortKey) {
  return columnHints[key] ?? ''
}

function signalHelpText(row: SmartScannerRow) {
  return smartScannerSignalDescription(row.signal)
}

function totalPositive(row: SmartScannerRow) {
  if (row.tradeNumber === null || row.winRate === null) return '—'
  return String(Math.round((row.tradeNumber * row.winRate) / 100))
}

function totalNegative(row: SmartScannerRow) {
  if (row.tradeNumber === null || row.winRate === null) return '—'
  return String(Math.round(row.tradeNumber - (row.tradeNumber * row.winRate) / 100))
}

function expandedMetrics(row: SmartScannerRow) {
  return [
    { label: 'Average Win', value: formatScannerPercent(row.avgWin) },
    { label: 'Max Risk', value: formatScannerPercent(row.maxRisk) },
    { label: 'Average Loss', value: formatScannerPercent(row.avgLoss) },
    { label: 'Median Return', value: formatScannerPercent(row.medianReturn) },
    { label: 'Total Trades', value: formatScannerNumber(row.tradeNumber, 0, false) },
    { label: 'Annual Return', value: formatScannerPercent(row.annualReturn) },
    { label: 'Total Positive', value: totalPositive(row) },
    { label: 'Average Return', value: formatScannerPercent(row.avgReturn) },
    { label: 'Total Negative', value: totalNegative(row) },
    { label: 'Std. Dev', value: formatScannerNumber(row.stdDev) },
    { label: 'Sharpe Ratio', value: formatScannerNumber(row.sharpeRatio) },
    { label: 'RelTrend Score', value: formatScannerNumber(row.relTrendScore, 0, false) },
    { label: 'Optix', value: formatScannerNumber(row.optix, 0, false) },
    { label: 'Allocation', value: formatScannerPercent(row.alloc) },
  ]
}
</script>

<template>
  <div class="overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)]">
    <div class="overflow-x-auto">
      <table class="min-w-full border-collapse text-left text-[0.8125rem] text-[var(--app-text)]">
        <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold">
          <tr class="border-b border-[var(--app-border)]">
            <th scope="col" class="box-border w-10 px-2 py-2.5" />
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              class="box-border px-2 py-2.5 text-left"
              :style="{ minWidth: `calc(${column.minWidth}px * var(--fixed-ui-scale, 1))` }"
              :aria-sort="isSorted(column.key) ? (props.sortDirection === 'asc' ? 'ascending' : 'descending') : undefined"
            >
              <button
                class="inline-flex w-full items-center justify-start gap-1 text-[0.6875rem] font-semibold transition hover:text-[var(--app-primary)]"
                :class="isSorted(column.key) ? 'text-[var(--app-primary)]' : 'text-[var(--app-text)]'"
                type="button"
                @click="$emit('sort', column.key)"
              >
                <span>{{ column.label }}</span>
                <span v-if="columnHint(column.key)" class="scanner-help" @click.stop>
                  <CircleHelp :size="11" aria-hidden="true" />
                  <span class="scanner-help__hint" role="tooltip">{{ columnHint(column.key) }}</span>
                </span>
                <component :is="sortIcon(column.key)" :size="13" aria-hidden="true" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="props.loading">
            <td :colspan="tableColspan" class="h-64 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
              Loading smart scanner picks...
            </td>
          </tr>
          <tr v-else-if="!props.rows.length">
            <td :colspan="tableColspan" class="h-64 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
              No scanner picks found
            </td>
          </tr>
          <template v-else>
            <template v-for="row in props.rows" :key="row.id">
              <tr
                class="border-b border-[var(--app-border-muted)] odd:bg-[var(--app-surface)] even:bg-[var(--app-row-even)] hover:bg-[var(--app-surface-hover)]"
              >
                <td class="box-border px-2 py-2.5">
                  <button
                    class="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--app-text-muted)] transition hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]"
                    type="button"
                    :aria-expanded="isExpanded(row)"
                    :aria-label="isExpanded(row) ? 'Hide scanner metrics' : 'Show scanner metrics'"
                    @click="toggleExpanded(row)"
                  >
                    <ChevronRight :size="17" class="transition" :class="{ 'rotate-90': isExpanded(row) }" />
                  </button>
                </td>
                <td class="box-border px-2 py-2.5 font-semibold">{{ row.date || '—' }}</td>
                <td class="box-border px-2 py-2.5">
                  <button
                    class="font-extrabold text-[var(--app-primary)] transition hover:underline"
                    type="button"
                    @click="$emit('open', row)"
                  >
                    {{ row.symbol }}
                  </button>
                </td>
                <td class="box-border px-2 py-2.5 font-semibold">{{ formatScannerPrice(row.close) }}</td>
                <td class="box-border px-2 py-2.5 font-extrabold" :class="changeClass(row.pctChange)">
                  {{ formatScannerPercent(row.pctChange, true, 2) }}
                </td>
                <td class="box-border px-2 py-2.5 font-semibold">{{ row.trend }}</td>
                <td class="box-border px-2 py-2.5 font-semibold">{{ formatScannerNumber(row.trendScore, 0, false) }}</td>
                <td class="box-border px-2 py-2.5">
                  <span class="inline-flex rounded-md border px-2 py-1 text-xs font-extrabold" :class="directionClass(row.direction)">
                    {{ row.direction }}
                  </span>
                </td>
                <td class="box-border max-w-[220px] px-2 py-2.5 font-semibold">
                  <span class="flex min-w-0 items-center gap-1.5">
                    <span class="block min-w-0 truncate" :title="row.signalLabel">{{ row.signalLabel || '—' }}</span>
                    <span v-if="signalHelpText(row)" class="scanner-help scanner-help--cell">
                      <CircleHelp :size="12" aria-hidden="true" />
                      <span class="scanner-help__hint scanner-help__hint--cell" role="tooltip">{{ signalHelpText(row) }}</span>
                    </span>
                  </span>
                </td>
                <td class="box-border px-2 py-2.5 font-semibold">{{ formatScannerPercent(row.winRate) }}</td>
                <td class="box-border px-2 py-2.5 font-semibold">{{ formatScannerPercent(row.stopLoss) }}</td>
                <td class="box-border px-2 py-2.5 font-semibold">{{ formatScannerPercent(row.profitTarget) }}</td>
                <td class="box-border px-2 py-2.5 font-semibold">{{ formatScannerNumber(row.timeInMarket, 0, false) }}</td>
                <td class="box-border px-2 py-2.5 font-semibold">{{ formatScannerPercent(row.expectedReturn) }}</td>
                <td class="box-border px-2 py-2.5 font-semibold">{{ formatScannerNumber(row.zScore) }}</td>
              </tr>
              <tr v-if="isExpanded(row)" class="border-b border-[var(--app-border-muted)] bg-[var(--app-surface-soft)]">
                <td :colspan="tableColspan" class="px-4 py-3">
                  <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
                    <div
                      v-for="metric in expandedMetrics(row)"
                      :key="metric.label"
                      class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] px-3 py-2"
                    >
                      <div class="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
                        {{ metric.label }}
                      </div>
                      <div class="mt-1 text-sm font-extrabold text-[var(--app-text)]">{{ metric.value }}</div>
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
.scanner-help {
  position: relative;
  display: inline-flex;
  align-items: center;
  color: var(--app-text-faint);
  cursor: help;
}

.scanner-help--cell {
  flex: 0 0 auto;
  color: var(--app-text-muted);
}

.scanner-help__hint {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  z-index: 30;
  width: max-content;
  max-width: 260px;
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
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%) translateY(-2px);
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.scanner-help__hint--cell {
  top: 50%;
  left: calc(100% + 8px);
  max-width: 320px;
  transform: translateY(-50%) translateX(-2px);
}

.scanner-help:hover .scanner-help__hint,
.scanner-help:focus-within .scanner-help__hint {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.scanner-help--cell:hover .scanner-help__hint--cell,
.scanner-help--cell:focus-within .scanner-help__hint--cell {
  transform: translateY(-50%) translateX(0);
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, ArrowUp, ArrowUpDown, CircleHelp, MoveRight, Star } from '@lucide/vue'
import {
  formatStrategyInteger,
  formatStrategyNumber,
  formatStrategyPercent,
} from '@/entities/strategy/model/strategy.adapter'
import type {
  StrategySignalRow,
  StrategySignalSortKey,
  StrategySortDirection,
  StrategySortKey,
  StrategySummaryRow,
  StrategySummarySortKey,
  StrategyTab,
} from '@/entities/strategy/model/strategy.types'

const props = withDefaults(
  defineProps<{
    tab: StrategyTab
    signals: StrategySignalRow[]
    summaries: StrategySummaryRow[]
    loading?: boolean
    sortKey?: StrategySortKey | ''
    sortDirection?: StrategySortDirection
    ytdLabel: string
  }>(),
  {
    loading: false,
    sortKey: '',
    sortDirection: 'asc',
  },
)

defineEmits<{
  sort: [key: StrategySortKey]
  open: [row: StrategySignalRow | StrategySummaryRow]
  favorite: [row: StrategySignalRow]
}>()

type StrategyColumn<T extends StrategySortKey = StrategySortKey> = {
  key: T
  label: string
  minWidth: number
  width?: number
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
  tooltip?: string
}

type StrategySignalTableColumn = Omit<StrategyColumn<StrategySignalSortKey>, 'key'> & {
  key: StrategySignalSortKey | 'favorite' | 'backtest'
}

const signalColumns: StrategySignalTableColumn[] = [
  { key: 'favorite', label: '', minWidth: 44, width: 5, align: 'center' },
  { key: 'modelName', label: 'Model Name', minWidth: 190, width: 20, sortable: true },
  { key: 'timeFrame', label: 'Time Frame', minWidth: 88, width: 9, sortable: true },
  { key: 'currentSignal', label: 'Current Signal', minWidth: 180, width: 21, sortable: true, tooltip: 'Current Signal:  (e.g., Long, Sell, etc)' },
  { key: 'lastSignalDate', label: 'Last Signal Date', minWidth: 108, width: 12, sortable: true, tooltip: 'last change in Signal' },
  { key: 'frequency', label: 'Frequency', minWidth: 82, width: 9, sortable: true, tooltip: 'Model Update  Frequency' },
  { key: 'ytdReturn', label: 'YTD Return (%)', minWidth: 108, width: 10, align: 'right', sortable: true, tooltip: 'YTD until  08/31/26  Return(%)' },
  { key: 'cagr', label: 'CAGR (%)', minWidth: 94, width: 8, align: 'right', sortable: true, tooltip: 'Compound Annual Growth Return (%)    Since 07/01/06' },
  { key: 'backtest', label: 'Actions', minWidth: 54, width: 6, align: 'center' },
]

const summaryColumns: Array<StrategyColumn<StrategySummarySortKey>> = [
  { key: 'modelName', label: 'Model Name', minWidth: 240, sortable: true },
  { key: 'cagr', label: 'Strategy CAGR (%)', minWidth: 125, align: 'right', sortable: true },
  { key: 'benchmarkCagr', label: 'Benchmark CAGR (%)', minWidth: 140, align: 'right', sortable: true },
  { key: 'netProfit', label: 'Net Profit (%)', minWidth: 120, align: 'right', sortable: true },
  { key: 'maxDrawdown', label: 'Max Drawdown (%)', minWidth: 140, align: 'right', sortable: true },
  { key: 'sharpeRatio', label: 'Sharpe Ratio', minWidth: 110, align: 'right', sortable: true },
  { key: 'profitLossRatio', label: 'P/L Ratio', minWidth: 100, align: 'right', sortable: true },
  { key: 'averageWin', label: 'Avg Win (%)', minWidth: 110, align: 'right', sortable: true },
  { key: 'averageLoss', label: 'Avg Loss (%)', minWidth: 110, align: 'right', sortable: true },
  { key: 'totalTrades', label: 'Trades', minWidth: 90, align: 'right', sortable: true },
  { key: 'winRate', label: 'Win Rate (%)', minWidth: 120, align: 'right', sortable: true },
]

const visibleRows = computed(() => (props.tab === 'signals' ? props.signals : props.summaries))
const tableColspan = computed(() => (props.tab === 'signals' ? signalColumns.length : summaryColumns.length))

function alignClass(column: { align?: 'left' | 'right' | 'center' }) {
  if (column.align === 'right') return 'text-right'
  if (column.align === 'center') return 'text-center'
  return 'text-left'
}

function headerContentClass(column: { align?: 'left' | 'right' | 'center' }) {
  if (column.align === 'right') return 'justify-end'
  if (column.align === 'center') return 'justify-center'
  return 'justify-start'
}

function isSorted(key: StrategySortKey | 'favorite' | 'backtest') {
  return props.sortKey === key
}

function sortIcon(key: StrategySortKey | 'favorite' | 'backtest') {
  if (!isSorted(key)) return ArrowUpDown
  return props.sortDirection === 'asc' ? ArrowUp : ArrowDown
}

function percentClass(value: number | null) {
  if (value === null) return ''
  return value < 0 ? 'text-[var(--app-negative)]' : 'text-[var(--app-positive)]'
}
</script>

<template>
  <div class="overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)]">
    <div class="overflow-x-auto">
      <table
        class="border-collapse text-left text-[0.8125rem] text-[var(--app-text)]"
        :class="props.tab === 'signals' ? 'w-full table-fixed' : 'min-w-full'"
      >
        <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold">
          <template v-if="props.tab === 'signals'">
            <tr class="border-b border-[var(--app-border)]">
              <th
                v-for="column in signalColumns"
                :key="column.key"
                scope="col"
                class="box-border px-2 py-2.5"
                :class="alignClass(column)"
                :style="{ width: column.width ? `${column.width}%` : undefined }"
                :aria-sort="column.sortable && isSorted(column.key) ? (props.sortDirection === 'asc' ? 'ascending' : 'descending') : undefined"
              >
                <div class="flex w-full items-center gap-1" :class="headerContentClass(column)">
                  <button
                  v-if="column.sortable"
                    class="inline-flex min-w-0 items-center gap-1 text-[0.6875rem] font-semibold transition hover:text-[var(--app-primary)]"
                    :class="isSorted(column.key) ? 'text-[var(--app-primary)]' : 'text-[var(--app-text)]'"
                    type="button"
                    @click="$emit('sort', column.key as StrategySortKey)"
                  >
                    <span class="min-w-0">{{ column.label }}</span>
                    <span v-if="column.tooltip" class="strategy-help" @click.stop>
                      <CircleHelp :size="11" aria-hidden="true" />
                      <span class="strategy-help__hint" role="tooltip">{{ column.tooltip }}</span>
                    </span>
                    <component :is="sortIcon(column.key)" :size="13" aria-hidden="true" />
                  </button>
                  <span v-else>{{ column.label }}</span>
                </div>
                <span v-if="column.key === 'ytdReturn'" class="mt-0.5 block text-[0.64rem] font-medium text-[var(--app-text-muted)]">
                  as of {{ props.ytdLabel }}
                </span>
                <span v-if="column.key === 'cagr'" class="mt-0.5 block text-[0.64rem] font-medium text-[var(--app-text-muted)]">
                  since Jul 1, 2006
                </span>
              </th>
            </tr>
          </template>

          <template v-else>
            <tr class="border-b border-[var(--app-border)]">
              <th class="box-border px-2 py-2.5" rowspan="2" :style="{ minWidth: 'calc(240px * var(--fixed-ui-scale, 1))' }">
                <button
                  class="inline-flex w-full items-center gap-1 text-[0.6875rem] font-semibold transition hover:text-[var(--app-primary)]"
                  :class="isSorted('modelName') ? 'text-[var(--app-primary)]' : 'text-[var(--app-text)]'"
                  type="button"
                  @click="$emit('sort', 'modelName')"
                >
                  <span>Model Name</span>
                  <component :is="sortIcon('modelName')" :size="13" aria-hidden="true" />
                </button>
              </th>
              <th class="box-border border-l border-[var(--app-border)] px-2 py-2 text-center" colspan="2">Returns</th>
              <th class="box-border border-l border-[var(--app-border)] px-2 py-2 text-center" colspan="4">Risk</th>
              <th class="box-border border-l border-[var(--app-border)] px-2 py-2 text-center" colspan="4">Trade Statistics</th>
            </tr>
            <tr class="border-b border-[var(--app-border)]">
              <th
                v-for="column in summaryColumns.slice(1)"
                :key="column.key"
                scope="col"
                class="box-border px-2 py-2.5"
                :class="alignClass(column)"
                :style="{ minWidth: `calc(${column.minWidth}px * var(--fixed-ui-scale, 1))` }"
                :aria-sort="isSorted(column.key) ? (props.sortDirection === 'asc' ? 'ascending' : 'descending') : undefined"
              >
                <button
                  class="inline-flex w-full items-center gap-1 text-[0.6875rem] font-semibold transition hover:text-[var(--app-primary)]"
                  :class="[isSorted(column.key) ? 'text-[var(--app-primary)]' : 'text-[var(--app-text)]', column.align === 'right' ? 'justify-end' : 'justify-start']"
                  type="button"
                  @click="$emit('sort', column.key)"
                >
                  <span>{{ column.label }}</span>
                  <component :is="sortIcon(column.key)" :size="13" aria-hidden="true" />
                </button>
              </th>
            </tr>
          </template>
        </thead>

        <tbody>
          <tr v-if="props.loading">
            <td :colspan="tableColspan" class="h-56 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
              Loading strategies...
            </td>
          </tr>
          <tr v-else-if="!visibleRows.length">
            <td :colspan="tableColspan" class="h-56 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
              No strategies found
            </td>
          </tr>

          <template v-else-if="props.tab === 'signals'">
            <tr
              v-for="row in props.signals"
              :key="row.id"
              class="border-b border-[var(--app-border-muted)] odd:bg-[var(--app-surface)] even:bg-[var(--app-row-even)] last:border-b-0 hover:bg-[var(--app-surface-hover)]"
              :class="{ 'bg-amber-50/80': row.currentDay }"
            >
              <td class="box-border px-2 py-2.5 text-center">
                <button
                  class="inline-flex h-8 w-8 items-center justify-center rounded-md transition"
                  :class="row.favorite ? 'text-amber-500' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]'"
                  type="button"
                  :aria-label="row.favorite ? 'Remove favorite strategy' : 'Add favorite strategy'"
                  @click="$emit('favorite', row)"
                >
                  <Star :size="18" :fill="row.favorite ? 'currentColor' : 'none'" />
                </button>
              </td>
              <td class="box-border px-2 py-2.5">
                <button class="min-w-0 break-words text-left font-extrabold leading-snug text-[var(--app-primary)] transition hover:underline" type="button" @click="$emit('open', row)">
                  {{ row.modelName }}
                </button>
              </td>
              <td class="box-border px-2 py-2.5 font-semibold">{{ row.timeFrame }}</td>
              <td class="box-border break-words px-2 py-2.5 font-semibold leading-snug">{{ row.currentSignal }}</td>
              <td class="box-border px-2 py-2.5 font-semibold">{{ row.lastSignalDate }}</td>
              <td class="box-border px-2 py-2.5 font-semibold">{{ row.frequency }}</td>
              <td class="box-border px-2 py-2.5 text-right font-semibold" :class="percentClass(row.ytdReturn)">
                {{ formatStrategyPercent(row.ytdReturn) }}
              </td>
              <td class="box-border px-2 py-2.5 text-right font-semibold" :class="percentClass(row.cagr)">
                {{ formatStrategyPercent(row.cagr) }}
              </td>
              <td class="box-border px-2 py-2.5 text-center">
                <button
                  class="strategy-action inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--app-primary)] transition hover:text-[var(--app-primary-hover)]"
                  type="button"
                  aria-label="Backtest this strategy"
                  @click="$emit('open', row)"
                >
                  <MoveRight :size="24" :stroke-width="2" class="preview-icon" />
                  <span class="strategy-help__hint strategy-help__hint--action" role="tooltip">Backtest This Strategy</span>
                </button>
              </td>
            </tr>
          </template>

          <template v-else>
            <tr
              v-for="row in props.summaries"
              :key="row.id"
              class="border-b border-[var(--app-border-muted)] odd:bg-[var(--app-surface)] even:bg-[var(--app-row-even)] last:border-b-0 hover:bg-[var(--app-surface-hover)]"
            >
              <td class="box-border px-2 py-2.5">
                <button class="text-left font-extrabold text-[var(--app-primary)] transition hover:underline" type="button" @click="$emit('open', row)">
                  {{ row.modelName }}
                </button>
              </td>
              <td class="box-border px-2 py-2.5 text-right font-semibold" :class="percentClass(row.cagr)">{{ formatStrategyPercent(row.cagr) }}</td>
              <td class="box-border px-2 py-2.5 text-right font-semibold">{{ formatStrategyPercent(row.benchmarkCagr) }}</td>
              <td class="box-border px-2 py-2.5 text-right font-semibold" :class="percentClass(row.netProfit)">{{ formatStrategyPercent(row.netProfit) }}</td>
              <td class="box-border px-2 py-2.5 text-right font-semibold text-[var(--app-negative)]">{{ formatStrategyPercent(row.maxDrawdown) }}</td>
              <td class="box-border px-2 py-2.5 text-right font-semibold">{{ formatStrategyNumber(row.sharpeRatio, 2) }}</td>
              <td class="box-border px-2 py-2.5 text-right font-semibold">{{ formatStrategyNumber(row.profitLossRatio, 2) }}</td>
              <td class="box-border px-2 py-2.5 text-right font-semibold" :class="percentClass(row.averageWin)">{{ formatStrategyPercent(row.averageWin) }}</td>
              <td class="box-border px-2 py-2.5 text-right font-semibold" :class="percentClass(row.averageLoss)">{{ formatStrategyPercent(row.averageLoss) }}</td>
              <td class="box-border px-2 py-2.5 text-right font-semibold">{{ formatStrategyInteger(row.totalTrades) }}</td>
              <td class="box-border px-2 py-2.5 text-right font-semibold">{{ formatStrategyPercent(row.winRate) }}</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.strategy-help {
  position: relative;
  display: inline-flex;
  align-items: center;
  color: var(--app-text-faint);
  cursor: help;
}

.strategy-help__hint {
  display: none;
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

.strategy-help:hover .strategy-help__hint,
.strategy-help:focus-within .strategy-help__hint {
  display: block;
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.strategy-action {
  position: relative;
}

.strategy-help__hint--action {
  top: 50%;
  left: auto;
  right: calc(100% + 8px);
  transform: translateY(-50%) translateX(2px);
}

.strategy-action:hover .strategy-help__hint--action,
.strategy-action:focus-visible .strategy-help__hint--action {
  display: block;
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}
</style>

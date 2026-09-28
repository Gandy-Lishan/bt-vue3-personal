<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, CircleHelp } from '@lucide/vue'
import {
  formatMarketCurrency,
  formatMarketNumber,
  formatMarketPercent,
} from '@/entities/market/model/market-prediction.adapter'
import type {
  MarketPredictionRow,
  MarketPredictionSortDirection,
  MarketPredictionSortKey,
} from '@/entities/market/model/market-prediction.types'
import MarketPredictionRatingBadge from './MarketPredictionRatingBadge.vue'

const props = withDefaults(
  defineProps<{
    rows: MarketPredictionRow[]
    loading?: boolean
    sortKey?: MarketPredictionSortKey | ''
    sortDirection?: MarketPredictionSortDirection
  }>(),
  {
    loading: false,
    sortKey: '',
    sortDirection: 'asc',
  },
)

defineEmits<{
  sort: [key: MarketPredictionSortKey]
  open: [row: MarketPredictionRow]
}>()

const columnHints: Partial<Record<MarketPredictionSortKey, string>> = {
  lastPrice: 'The latest price of the stock',
  predictionEndDate: 'The future date to which the forecast applies',
  target: 'The future price to which this forecast applies',
  analystCoverage:
    'The total count of price target estimates made by financial analysts across all historical periods',
  meanAccuracy: 'The average forecast accuracy across all historical periods',
  rating: 'A rating based on recent performance',
}

const columns: Array<{ key: MarketPredictionSortKey | 'actions'; label: string; minWidth: number; sortable?: boolean }> = [
  { key: 'ticker', label: 'Ticker', minWidth: 110, sortable: true },
  { key: 'lastPrice', label: 'Last Price', minWidth: 130, sortable: true },
  { key: 'target', label: 'Target & Potential Upside', minWidth: 210, sortable: true },
  { key: 'predictionEndDate', label: 'Prediction End Date', minWidth: 180, sortable: true },
  { key: 'analystCoverage', label: 'Total Analyst Predictions', minWidth: 160, sortable: true },
  { key: 'meanAccuracy', label: 'Mean Accuracy', minWidth: 220, sortable: true },
  { key: 'rating', label: 'Latest Rating', minWidth: 150, sortable: true },
  { key: 'actions', label: 'Actions', minWidth: 96 },
]

const tableColspan = computed(() => columns.length)

function columnHint(key: MarketPredictionSortKey | 'actions') {
  return columnHints[key as MarketPredictionSortKey] ?? undefined
}

function isSorted(key: MarketPredictionSortKey | 'actions') {
  return props.sortKey === key
}

function sortIcon(key: MarketPredictionSortKey | 'actions') {
  if (!isSorted(key)) return ArrowUpDown
  return props.sortDirection === 'asc' ? ArrowUp : ArrowDown
}

function accuracyWidth(row: MarketPredictionRow) {
  const value = row.meanAccuracy ?? 0
  return `${Math.max(0, Math.min(100, value))}%`
}

function upsideClass(row: MarketPredictionRow) {
  if ((row.potentialUpside ?? 0) < 0) return 'text-[var(--app-negative)]'
  return 'text-[var(--app-positive)]'
}
</script>

<template>
  <div class="overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)]">
    <div class="overflow-x-auto">
      <table class="min-w-full border-collapse text-left text-[0.8125rem] text-[var(--app-text)]">
        <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold">
          <tr class="border-b border-[var(--app-border)]">
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              class="box-border px-2 py-2.5 text-left"
              :style="{ minWidth: `calc(${column.minWidth}px * var(--fixed-ui-scale, 1))` }"
              :aria-sort="column.sortable && isSorted(column.key) ? (props.sortDirection === 'asc' ? 'ascending' : 'descending') : undefined"
            >
              <button
                v-if="column.sortable"
                class="inline-flex w-full items-center justify-start gap-1 text-[0.6875rem] font-semibold transition hover:text-[var(--app-primary)]"
                :class="isSorted(column.key) ? 'text-[var(--app-primary)]' : 'text-[var(--app-text)]'"
                type="button"
                @click="$emit('sort', column.key as MarketPredictionSortKey)"
              >
                <span>{{ column.label }}</span>
                <span v-if="columnHint(column.key)" class="mp-th-help">
                  <CircleHelp :size="11" aria-hidden="true" />
                  <span class="mp-th-help__hint" role="tooltip">{{ columnHint(column.key) }}</span>
                </span>
                <component :is="sortIcon(column.key)" :size="13" aria-hidden="true" />
              </button>
              <span v-else>{{ column.label }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="props.loading">
            <td :colspan="tableColspan" class="h-64 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
              Loading market predictions...
            </td>
          </tr>
          <tr v-else-if="!props.rows.length">
            <td :colspan="tableColspan" class="h-64 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
              No market predictions found
            </td>
          </tr>
          <template v-else>
            <tr
              v-for="row in props.rows"
              :key="row.id"
              class="border-b border-[var(--app-border-muted)] odd:bg-[var(--app-surface)] even:bg-[var(--app-row-even)] last:border-b-0 hover:bg-[var(--app-surface-hover)]"
            >
              <td class="box-border px-2 py-2.5">
                <button
                  class="text-left font-extrabold text-[var(--app-primary)] transition hover:underline"
                  type="button"
                  @click="$emit('open', row)"
                >
                  {{ row.ticker }}
                </button>
              </td>
              <td class="box-border px-2 py-2.5 font-semibold">{{ formatMarketCurrency(row.lastPrice) }}</td>
              <td class="box-border px-2 py-2.5">
                <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span class="font-semibold">{{ formatMarketCurrency(row.target) }}</span>
                  <span class="font-extrabold" :class="upsideClass(row)">
                    {{ formatMarketPercent(row.potentialUpside, true) }}
                  </span>
                </div>
              </td>
              <td class="box-border px-2 py-2.5 font-semibold">{{ row.predictionEndDate }}</td>
              <td class="box-border px-2 py-2.5 font-semibold">{{ formatMarketNumber(row.analystCoverage) }}</td>
              <td class="box-border px-2 py-2.5">
                <div class="flex min-w-40 items-center gap-3">
                  <div class="h-2 flex-1 overflow-hidden rounded-full bg-[var(--app-border-muted)]">
                    <div class="h-full rounded-full bg-[var(--app-primary)]" :style="{ width: accuracyWidth(row) }" />
                  </div>
                  <span class="w-12 shrink-0 text-right font-semibold">{{ formatMarketPercent(row.meanAccuracy) }}</span>
                </div>
              </td>
              <td class="box-border px-2 py-2.5">
                <MarketPredictionRatingBadge :rating="row.rating" :category="row.ratingCategory" />
              </td>
              <td class="box-border px-2 py-2.5">
                <button
                  class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--app-text-muted)] transition hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]"
                  type="button"
                  aria-label="Open prediction"
                  @click="$emit('open', row)"
                >
                  <ChevronRight :size="18" />
                </button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.mp-th-help {
  position: relative;
  display: inline-flex;
  align-items: center;
  color: var(--app-text-faint);
  cursor: help;
}

.mp-th-help__hint {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  z-index: 30;
  width: max-content;
  max-width: 220px;
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

.mp-th-help:hover .mp-th-help__hint,
.mp-th-help:focus-within .mp-th-help__hint {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
</style>

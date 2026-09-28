<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Download, Info, RotateCcw, Search, X } from '@lucide/vue'
import { fetchMarketPredictions } from '@/entities/market/api/market-prediction.api'
import {
  marketPredictionCsvTable,
  marketPredictionSortValue,
} from '@/entities/market/model/market-prediction.adapter'
import {
  MARKET_PREDICTION_PAGE_SIZE,
  type MarketPredictionRow,
  type MarketPredictionSortDirection,
  type MarketPredictionSortKey,
  type MarketPredictionViewMode,
} from '@/entities/market/model/market-prediction.types'
import { downloadCsv, toCsv } from '@/shared/utils/csv'
import ListPagePanel from '@/shared/ui/ListPagePanel.vue'
import IndicatorPageHeader from '@/pages/indicators/ui/IndicatorPageHeader.vue'
import IndicatorPagination from '@/pages/indicators/ui/IndicatorPagination.vue'
import { useSortedPagedRows } from '@/pages/indicators/composables/useSortedPagedRows'
import MarketPredictionCardGrid from './ui/MarketPredictionCardGrid.vue'
import MarketPredictionTable from './ui/MarketPredictionTable.vue'

const router = useRouter()
const viewMode = ref<MarketPredictionViewMode>('table')
const rows = ref<MarketPredictionRow[]>([])
const loading = ref(false)
const descriptionOpen = ref(false)
const searchQuery = ref('')
const ratingFilter = ref('')
const endDateFilter = ref('')
const minAccuracyFilter = ref('')

const sortOptions: Array<{
  key: MarketPredictionSortKey
  label: string
  kind: 'text' | 'number' | 'date'
}> = [
  { key: 'ticker', label: 'Ticker', kind: 'text' },
  { key: 'lastPrice', label: 'Last Price', kind: 'number' },
  { key: 'target', label: 'Target', kind: 'number' },
  { key: 'potentialUpside', label: 'Potential Upside', kind: 'number' },
  { key: 'predictionEndDate', label: 'Prediction End Date', kind: 'date' },
  { key: 'analystCoverage', label: 'Total Analyst Predictions', kind: 'number' },
  { key: 'meanAccuracy', label: 'Mean Accuracy', kind: 'number' },
  { key: 'rating', label: 'Latest Rating', kind: 'text' },
]

const abortController = new AbortController()

const filteredRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const minAccuracy = minAccuracyFilter.value ? Number(minAccuracyFilter.value) : null

  return rows.value.filter((row) => {
    const searchable = [row.ticker, row.rating, row.predictionEndDate]
      .map((value) => String(value).toLowerCase())
      .join(' ')

    return (
      (!query || searchable.includes(query)) &&
      (!ratingFilter.value || row.ratingCategory === ratingFilter.value) &&
      (!endDateFilter.value || row.predictionEndDate === endDateFilter.value) &&
      (minAccuracy === null || (row.meanAccuracy ?? -Infinity) >= minAccuracy)
    )
  })
})

const table = useSortedPagedRows(
  filteredRows,
  (row, key) => marketPredictionSortValue(row, key as MarketPredictionSortKey),
  MARKET_PREDICTION_PAGE_SIZE,
)

const activeSortValue = computed(() => {
  if (!table.sortKey.value) return ''
  return `${table.sortKey.value}:${table.sortDirection.value}`
})

const dateOptions = computed(() => {
  const options = new Map<string, number>()
  for (const row of rows.value) {
    if (row.predictionEndDate !== '—') {
      options.set(row.predictionEndDate, row.predictionEndTimestamp ?? 0)
    }
  }
  return Array.from(options.entries())
    .sort((left, right) => left[1] - right[1])
    .map(([label]) => label)
})

const buyCount = computed(() => filteredRows.value.filter((row) => row.ratingCategory === 'buy').length)
const holdCount = computed(() => filteredRows.value.filter((row) => row.ratingCategory === 'hold').length)
const sellCount = computed(() => filteredRows.value.filter((row) => row.ratingCategory === 'sell').length)

function setViewMode(mode: MarketPredictionViewMode) {
  viewMode.value = mode
}

function resetFilters() {
  searchQuery.value = ''
  ratingFilter.value = ''
  endDateFilter.value = ''
  minAccuracyFilter.value = ''
  table.reset()
}

function sortDirectionLabel(kind: string, direction: MarketPredictionSortDirection) {
  if (kind === 'number') return direction === 'asc' ? 'Low to High' : 'High to Low'
  if (kind === 'date') return direction === 'asc' ? 'Oldest First' : 'Newest First'
  return direction === 'asc' ? 'A to Z' : 'Z to A'
}

function handleSortSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (!value) {
    table.reset()
    return
  }

  const [key, direction] = value.split(':') as [MarketPredictionSortKey, MarketPredictionSortDirection]
  const option = sortOptions.find((item) => item.key === key)
  if (!option || (direction !== 'asc' && direction !== 'desc')) return

  table.setSort({ key: option.key, kind: option.kind }, direction)
}

function handleTableSort(key: MarketPredictionSortKey) {
  const option = sortOptions.find((item) => item.key === key)
  table.sort({ key, kind: option?.kind ?? 'text' })
}

function downloadPredictionsCsv() {
  const { headers, rows: csvRows } = marketPredictionCsvTable(table.sortedRows.value)
  if (!csvRows.length) return

  const isoDate = new Date().toISOString().slice(0, 10)
  downloadCsv(`market-prediction-${isoDate}.csv`, toCsv(headers, csvRows))
}

function openPrediction(row: MarketPredictionRow) {
  void router.push({ name: 'market-prediction-detail', params: { ticker: row.ticker } })
}

async function loadMarketPredictions() {
  loading.value = true
  try {
    rows.value = await fetchMarketPredictions(abortController.signal)
  } finally {
    loading.value = false
  }
}

watch(
  () => [searchQuery.value, ratingFilter.value, endDateFilter.value, minAccuracyFilter.value],
  () => {
    table.setPage(1)
  },
)

onMounted(() => {
  void loadMarketPredictions()
})

onBeforeUnmount(() => {
  abortController.abort()
})
</script>

<template>
  <div class="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
    <main class="px-[var(--page-gutter)] pb-8 pt-8">
      <IndicatorPageHeader
        title="Market Prediction"
        description="Three-month price targets compiled from leading analysts, with historical mean accuracy."
        :view-mode="viewMode"
        @update:view-mode="setViewMode"
      />

      <ListPagePanel
        title="Market Prediction Summary"
        description="Browse and analyze analyst price target predictions for the U.S. stock market."
      >
        <template #title-actions>
          <button
            class="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--app-border-strong)] bg-[var(--app-surface-muted)] px-2.5 text-xs font-semibold text-[var(--app-text-secondary)] hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]"
            type="button"
            @click="descriptionOpen = true"
          >
            <Info :size="15" />
            Description & Legend
          </button>
        </template>

        <template #summary>
          <span class="indicator-summary-pill">
            <span class="indicator-summary-pill__dot bg-rose-500" />
            <span class="indicator-summary-pill__text">
              <span class="indicator-summary-pill__value">{{ sellCount }}</span>
              <span class="indicator-summary-pill__label"> Sell</span>
            </span>
          </span>
          <span class="indicator-summary-pill">
            <span class="indicator-summary-pill__dot bg-emerald-500" />
            <span class="indicator-summary-pill__text">
              <span class="indicator-summary-pill__value">{{ buyCount }}</span>
              <span class="indicator-summary-pill__label"> Buy</span>
            </span>
          </span>
          <span class="indicator-summary-pill">
            <span class="indicator-summary-pill__dot bg-slate-400" />
            <span class="indicator-summary-pill__text">
              <span class="indicator-summary-pill__value">{{ holdCount }}</span>
              <span class="indicator-summary-pill__label"> Hold</span>
            </span>
          </span>
          <span class="indicator-summary-pill">
            <span class="indicator-summary-pill__text">
              <span class="indicator-summary-pill__value">{{ filteredRows.length }}</span>
              <span class="indicator-summary-pill__label"> Ticker</span>
            </span>
          </span>
        </template>

        <template #filters>
          <div class="grid gap-2 px-4 py-3 xl:grid-cols-[minmax(260px,1.7fr)_minmax(150px,0.72fr)_minmax(190px,0.9fr)_minmax(180px,0.82fr)_minmax(220px,0.95fr)_auto_auto]">
            <label class="flex h-9 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5">
              <Search :size="16" class="mr-2 shrink-0 text-[var(--app-text-muted)]" />
              <input v-model="searchQuery" class="w-full bg-transparent text-[0.8125rem] outline-none" placeholder="Search ticker or rating..." />
            </label>
            <select v-model="ratingFilter" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]">
              <option value="">Latest Rating</option>
              <option value="buy">Buy</option>
              <option value="hold">Hold</option>
              <option value="sell">Sell</option>
            </select>
            <select v-model="endDateFilter" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]">
              <option value="">Prediction End Date</option>
              <option v-for="date in dateOptions" :key="date" :value="date">{{ date }}</option>
            </select>
            <select v-model="minAccuracyFilter" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]">
              <option value="">Minimum Accuracy</option>
              <option value="50">50%+</option>
              <option value="60">60%+</option>
              <option value="70">70%+</option>
              <option value="80">80%+</option>
              <option value="90">90%+</option>
            </select>
            <select
              class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]"
              :value="activeSortValue"
              @change="handleSortSelect"
            >
              <option value="">Sort by: Default</option>
              <template v-for="option in sortOptions" :key="option.key">
                <option :value="`${option.key}:asc`">{{ option.label }}: {{ sortDirectionLabel(option.kind, 'asc') }}</option>
                <option :value="`${option.key}:desc`">{{ option.label }}: {{ sortDirectionLabel(option.kind, 'desc') }}</option>
              </template>
            </select>
            <button
              class="flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[0.8125rem] text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)]"
              type="button"
              @click="resetFilters"
            >
              <RotateCcw :size="16" />
              Reset
            </button>
            <button
              class="flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[0.8125rem] text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[var(--app-border)] disabled:hover:text-[var(--app-text-secondary)]"
              type="button"
              :disabled="!table.sortedRows.value.length"
              title="Download this list as CSV"
              @click="downloadPredictionsCsv"
            >
              <Download :size="16" />
              CSV
            </button>
          </div>
        </template>

        <div class="px-4 pb-4">
          <MarketPredictionTable
            v-if="viewMode === 'table'"
            :rows="table.pagedRows.value"
            :loading="loading"
            :sort-key="table.sortKey.value as MarketPredictionSortKey | ''"
            :sort-direction="table.sortDirection.value"
            @sort="handleTableSort"
            @open="openPrediction"
          />
          <MarketPredictionCardGrid
            v-else
            :rows="table.pagedRows.value"
            :loading="loading"
            @open="openPrediction"
          />
        </div>

        <template #footer>
          <IndicatorPagination
            :page="table.page.value"
            :page-count="table.pageCount.value"
            :total="table.sortedRows.value.length"
            item-label="tickers"
            @change="table.setPage"
          />
        </template>
      </ListPagePanel>

      <Teleport to="body">
        <div
          v-if="descriptionOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-overlay)] px-4 py-6"
          @click.self="descriptionOpen = false"
        >
          <section
            class="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-lg bg-[var(--app-surface)] text-[var(--app-text)] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="market-prediction-description-title"
          >
            <header class="flex items-start justify-between gap-4 border-b border-[var(--app-border)] px-5 py-4">
              <div>
                <p class="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">Market Prediction</p>
                <h2 id="market-prediction-description-title" class="mt-1 text-xl text-[var(--app-text)]">
                  Description & Legend
                </h2>
              </div>
              <button
                class="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--app-border)] text-[var(--app-text-subtle)] hover:bg-[var(--app-surface-muted)]"
                type="button"
                aria-label="Close description"
                @click="descriptionOpen = false"
              >
                <X :size="18" />
              </button>
            </header>

            <div class="max-h-[calc(86vh-92px)] overflow-y-auto px-5 py-4 text-sm leading-6 text-[var(--app-text-secondary)]">
              <div class="space-y-3">
                <p>
                  Market Prediction summarizes analyst price targets for individual tickers over an upcoming three-month window.
                  The table combines the latest price, target price, prediction end date, coverage count, historical mean accuracy,
                  and the latest rating.
                </p>
                <p>
                  Buy and sell summary pills group Strong Buy with Buy, and Strong Sell with Sell. Mean Accuracy is displayed as a
                  percentage and can be filtered to focus on predictions with stronger historical records.
                </p>
                <div class="rounded-md border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2 text-[var(--app-text-subtle)]">
                  Click a column heading or use the Sort by control to rank the current filtered list. CSV exports include the
                  current filtered and sorted rows.
                </div>
              </div>
            </div>
          </section>
        </div>
      </Teleport>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Download, Filter, Info, RotateCcw, Search, X } from '@lucide/vue'
import { fetchSmartScannerCurrentDate, fetchSmartScannerRows } from '@/entities/scanner/api/smart-scanner.api'
import {
  copySmartScannerRanges,
  createSmartScannerDefaultRanges,
  matchesSmartScannerRange,
  matchesSmartScannerSignal,
  normalizeSmartScannerRangeBounds,
  resetSmartScannerRanges,
  SMART_SCANNER_RANGE_DEFINITIONS,
  smartScannerCsvTable,
  smartScannerDetailRequestFromRow,
  smartScannerSearchScore,
  smartScannerSignalOptions,
  smartScannerSortValue,
} from '@/entities/scanner/model/smart-scanner.adapter'
import {
  SMART_SCANNER_PAGE_SIZE,
  type SmartScannerDirection,
  type SmartScannerRange,
  type SmartScannerRangeKey,
  type SmartScannerRow,
  type SmartScannerSortDirection,
  type SmartScannerSortKey,
} from '@/entities/scanner/model/smart-scanner.types'
import type { IndicatorTableColumnKind } from '@/entities/indicator/model/indicator.table'
import { downloadCsv, toCsv } from '@/shared/utils/csv'
import ListExplorerPage from '@/shared/ui/ListExplorerPage.vue'
import { useSortedPagedRows } from '@/pages/indicators/composables/useSortedPagedRows'
import IndicatorPagination from '@/pages/indicators/ui/IndicatorPagination.vue'
import SmartScannerTable from './ui/SmartScannerTable.vue'

type ScannerSortOption = {
  key: SmartScannerSortKey
  label: string
  kind: IndicatorTableColumnKind
}

const rows = ref<SmartScannerRow[]>([])
const router = useRouter()
const loading = ref(false)
const descriptionOpen = ref(false)
const filterOpen = ref(false)
const startDate = ref('')
const endDate = ref('')
const searchQuery = ref('')
const directionFilter = ref<SmartScannerDirection>('Long')
const profitExceedsStop = ref(false)
const advancedFiltersEnabled = ref(false)
const appliedSignals = ref<string[]>(['All'])
const draftSignals = ref<string[]>(['All'])
const appliedRanges = reactive(createSmartScannerDefaultRanges())
const draftRanges = reactive(createSmartScannerDefaultRanges())
const abortController = new AbortController()

const sortOptions: ScannerSortOption[] = [
  { key: 'date', label: 'Date', kind: 'date' },
  { key: 'symbol', label: 'Symbol', kind: 'text' },
  { key: 'close', label: 'Close', kind: 'number' },
  { key: 'pctChange', label: 'Change', kind: 'number' },
  { key: 'trendScore', label: 'Trend Score', kind: 'number' },
  { key: 'direction', label: 'Direction', kind: 'text' },
  { key: 'signal', label: 'Signal', kind: 'text' },
  { key: 'winRate', label: 'Win Rate', kind: 'number' },
  { key: 'stopLoss', label: 'Stop Loss', kind: 'number' },
  { key: 'profitTarget', label: 'Profit Target', kind: 'number' },
  { key: 'timeInMarket', label: 'Time In Market', kind: 'number' },
  { key: 'expectedReturn', label: 'Expected Return', kind: 'number' },
  { key: 'zScore', label: 'Z-Score', kind: 'number' },
]

const signalOptions = computed(() => ['All', ...smartScannerSignalOptions(rows.value)])

const filteredRows = computed(() => {
  const query = searchQuery.value.trim()

  return rows.value
    .map((row, index) => ({ row, index, score: smartScannerSearchScore(row, query) }))
    .filter(({ row, score }) => {
      if (score === null) return false
      if (directionFilter.value && row.direction !== directionFilter.value) return false
      if (
        profitExceedsStop.value &&
        !(row.profitTarget !== null && row.stopLoss !== null && row.profitTarget > row.stopLoss)
      ) {
        return false
      }
      if (advancedFiltersEnabled.value && !matchesSmartScannerSignal(row, appliedSignals.value)) return false
      if (
        advancedFiltersEnabled.value &&
        !SMART_SCANNER_RANGE_DEFINITIONS.every((definition) =>
          matchesSmartScannerRange(row, definition.key, appliedRanges[definition.key]),
        )
      ) {
        return false
      }
      return true
    })
    .sort((left, right) => {
      if (!query) return left.index - right.index
      return (right.score ?? -Infinity) - (left.score ?? -Infinity) || left.index - right.index
    })
    .map(({ row }) => row)
})

const table = useSortedPagedRows(
  filteredRows,
  (row, key) => smartScannerSortValue(row, key as SmartScannerSortKey),
  SMART_SCANNER_PAGE_SIZE,
)

const activeSortValue = computed(() => {
  if (!table.sortKey.value) return ''
  return `${table.sortKey.value}:${table.sortDirection.value}`
})

const longCount = computed(() => filteredRows.value.filter((row) => row.direction === 'Long').length)
const shortCount = computed(() => filteredRows.value.filter((row) => row.direction === 'Short').length)
const activeSignalCount = computed(() =>
  advancedFiltersEnabled.value ? appliedSignals.value.filter((signal) => signal !== 'All').length : 0,
)

function sortDirectionLabel(kind: IndicatorTableColumnKind, direction: SmartScannerSortDirection) {
  if (kind === 'number' || kind === 'change' || kind === 'sentiment') {
    return direction === 'asc' ? 'Low to High' : 'High to Low'
  }
  if (kind === 'date') return direction === 'asc' ? 'Oldest First' : 'Newest First'
  return direction === 'asc' ? 'A to Z' : 'Z to A'
}

function handleSortSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (!value) {
    table.reset()
    return
  }

  const [key, direction] = value.split(':') as [SmartScannerSortKey, SmartScannerSortDirection]
  const option = sortOptions.find((item) => item.key === key)
  if (!option || (direction !== 'asc' && direction !== 'desc')) return

  table.setSort({ key: option.key, kind: option.kind }, direction)
}

function handleTableSort(key: SmartScannerSortKey) {
  const option = sortOptions.find((item) => item.key === key)
  table.sort({ key, kind: option?.kind ?? 'text' })
}

function orderedDates() {
  if (!startDate.value || !endDate.value) return null
  if (new Date(startDate.value) <= new Date(endDate.value)) {
    return [startDate.value, endDate.value] as const
  }

  const previousStart = startDate.value
  startDate.value = endDate.value
  endDate.value = previousStart
  return [startDate.value, endDate.value] as const
}

async function loadRows() {
  const dates = orderedDates()
  if (!dates) return

  loading.value = true
  try {
    rows.value = await fetchSmartScannerRows(dates[0], dates[1], abortController.signal)
    table.reset()
  } finally {
    loading.value = false
  }
}

async function initialize() {
  const currentDate = await fetchSmartScannerCurrentDate(abortController.signal)
  startDate.value = currentDate
  endDate.value = currentDate
  await loadRows()
}

function resetAllFilters() {
  searchQuery.value = ''
  directionFilter.value = 'Long'
  profitExceedsStop.value = false
  advancedFiltersEnabled.value = false
  appliedSignals.value = ['All']
  draftSignals.value = ['All']
  resetSmartScannerRanges(appliedRanges)
  resetSmartScannerRanges(draftRanges)
  table.reset()
}

function openFilters() {
  copySmartScannerRanges(appliedRanges, draftRanges)
  draftSignals.value = [...appliedSignals.value]
  filterOpen.value = true
}

function applyAdvancedFilters() {
  normalizeSmartScannerRangeBounds(draftRanges)
  copySmartScannerRanges(draftRanges, appliedRanges)
  appliedSignals.value = draftSignals.value.length ? [...draftSignals.value] : ['All']
  advancedFiltersEnabled.value = true
  filterOpen.value = false
  table.setPage(1)
}

function resetAdvancedFilters() {
  resetSmartScannerRanges(appliedRanges)
  resetSmartScannerRanges(draftRanges)
  appliedSignals.value = ['All']
  draftSignals.value = ['All']
  advancedFiltersEnabled.value = true
  table.setPage(1)
}

function disableAdvancedFilters() {
  advancedFiltersEnabled.value = false
  appliedSignals.value = ['All']
  draftSignals.value = ['All']
  filterOpen.value = false
  table.setPage(1)
}

function setDraftRangeValue(key: SmartScannerRangeKey, side: keyof SmartScannerRange, event: Event) {
  const value = (event.target as HTMLInputElement).value.trim()
  draftRanges[key][side] = value ? Number(value) : null
}

function isDraftSignalChecked(signal: string) {
  if (draftSignals.value.includes('All')) return signal === 'All'
  return draftSignals.value.includes(signal)
}

function toggleDraftSignal(signal: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  if (signal === 'All') {
    draftSignals.value = checked ? ['All'] : []
    return
  }

  const next = new Set(draftSignals.value.filter((item) => item !== 'All'))
  if (checked) next.add(signal)
  else next.delete(signal)

  draftSignals.value = next.size ? Array.from(next) : ['All']
}

function downloadScannerCsv() {
  const { headers, rows: csvRows } = smartScannerCsvTable(table.sortedRows.value)
  if (!csvRows.length) return

  const isoDate = new Date().toISOString().slice(0, 10)
  downloadCsv(`smart-stock-scanner-${isoDate}.csv`, toCsv(headers, csvRows))
}

function openScannerDetail(row: SmartScannerRow) {
  void router.push({
    name: 'smart-stock-scanner-detail',
    query: {
      rowData: JSON.stringify(smartScannerDetailRequestFromRow(row)),
    },
  })
}

watch(
  () => [searchQuery.value, directionFilter.value, profitExceedsStop.value, advancedFiltersEnabled.value],
  () => {
    table.setPage(1)
  },
)

watch(
  () => rows.value.map((row) => row.id).join('|'),
  () => {
    appliedSignals.value = ['All']
    draftSignals.value = ['All']
    advancedFiltersEnabled.value = false
    table.reset()
  },
)

onMounted(() => {
  void initialize()
})

onBeforeUnmount(() => {
  abortController.abort()
})
</script>

<template>
  <ListExplorerPage
    title="Smart Stock Scanner"
    description="Nightly signal-for-action stock picks with backtested risk and return metrics."
    panel-title="Smart Stock Scanner Summary"
    panel-description="Browse daily scanner picks for U.S. stocks, filter by signal quality, and export the current list."
    :show-view-mode-toggle="false"
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
        <span class="indicator-summary-pill__dot bg-emerald-500" />
        <span class="indicator-summary-pill__text">
          <span class="indicator-summary-pill__value">{{ longCount }}</span>
          <span class="indicator-summary-pill__label"> Long</span>
        </span>
      </span>
      <span class="indicator-summary-pill">
        <span class="indicator-summary-pill__dot bg-rose-500" />
        <span class="indicator-summary-pill__text">
          <span class="indicator-summary-pill__value">{{ shortCount }}</span>
          <span class="indicator-summary-pill__label"> Short</span>
        </span>
      </span>
      <span class="indicator-summary-pill">
        <span class="indicator-summary-pill__text">
          <span class="indicator-summary-pill__value">{{ activeSignalCount || signalOptions.length - 1 }}</span>
          <span class="indicator-summary-pill__label"> Signals</span>
        </span>
      </span>
      <span class="indicator-summary-pill">
        <span class="indicator-summary-pill__text">
          <span class="indicator-summary-pill__value">{{ table.sortedRows.value.length }}</span>
          <span class="indicator-summary-pill__label"> Rows</span>
        </span>
      </span>
    </template>

    <template #filters>
      <div class="grid gap-2 px-4 py-3 md:grid-cols-2 xl:grid-cols-[140px_140px_minmax(220px,1.3fr)_120px_minmax(210px,0.8fr)_minmax(210px,0.9fr)_auto_auto_auto]">
        <input
          v-model="startDate"
          class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)] outline-none"
          type="date"
          aria-label="Start date"
          @change="loadRows"
        />
        <input
          v-model="endDate"
          class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)] outline-none"
          type="date"
          aria-label="End date"
          @change="loadRows"
        />
        <label class="flex h-9 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5">
          <Search :size="16" class="mr-2 shrink-0 text-[var(--app-text-muted)]" />
          <input v-model="searchQuery" class="w-full bg-transparent text-[0.8125rem] outline-none" placeholder="Search symbol or signal..." />
        </label>
        <select
          v-model="directionFilter"
          class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]"
        >
          <option value="Long">Long</option>
          <option value="Short">Short</option>
        </select>
        <label class="flex h-9 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] font-semibold text-[var(--app-text-secondary)]">
          <input v-model="profitExceedsStop" class="h-4 w-4 accent-[var(--app-primary)]" type="checkbox" />
          TP &gt; SL
        </label>
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
          class="flex h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-[0.8125rem] font-semibold transition"
          :class="advancedFiltersEnabled ? 'border-[var(--app-primary)] bg-[var(--app-primary-soft)] text-[var(--app-primary)]' : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-secondary)] hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)]'"
          type="button"
          @click="openFilters"
        >
          <Filter :size="16" />
          Filter
        </button>
        <button
          class="flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[0.8125rem] text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)]"
          type="button"
          @click="resetAllFilters"
        >
          <RotateCcw :size="16" />
          Reset
        </button>
        <button
          class="flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[0.8125rem] text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[var(--app-border)] disabled:hover:text-[var(--app-text-secondary)]"
          type="button"
          :disabled="!table.sortedRows.value.length"
          title="Download this list as CSV"
          @click="downloadScannerCsv"
        >
          <Download :size="16" />
          CSV
        </button>
      </div>
    </template>

    <div class="px-4 pb-4">
      <SmartScannerTable
        :rows="table.pagedRows.value"
        :loading="loading"
        :sort-key="table.sortKey.value as SmartScannerSortKey | ''"
        :sort-direction="table.sortDirection.value"
        @sort="handleTableSort"
        @open="openScannerDetail"
      />
    </div>

    <template #footer>
      <IndicatorPagination
        :page="table.page.value"
        :page-count="table.pageCount.value"
        :total="table.sortedRows.value.length"
        item-label="scanner picks"
        @change="table.setPage"
      />
    </template>

    <template #overlays>
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
            aria-labelledby="smart-scanner-description-title"
          >
            <header class="flex items-start justify-between gap-4 border-b border-[var(--app-border)] px-5 py-4">
              <div>
                <p class="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">Smart Stock Scanner</p>
                <h2 id="smart-scanner-description-title" class="mt-1 text-xl text-[var(--app-text)]">
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
                  Smart Stock Scanner lists stocks that triggered a signal-for-action for the selected date range.
                  The default view mirrors the legacy scanner: current daily picks, Long direction, and a compact table
                  with expandable backtest metrics.
                </p>
                <p>
                  Profit target, stop loss, win rate, expected return, trend score, and risk metrics come from the
                  scanner payload. The Filter dialog applies the same range defaults used by the old page.
                </p>
                <div class="rounded-md border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2 text-[var(--app-text-subtle)]">
                  CSV exports include the current filtered and sorted rows, including the metrics shown in expanded rows.
                </div>
              </div>
            </div>
          </section>
        </div>
      </Teleport>

      <Teleport to="body">
        <div
          v-if="filterOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-overlay)] px-4 py-6"
          @click.self="filterOpen = false"
        >
          <section
            class="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-lg bg-[var(--app-surface)] text-[var(--app-text)] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="smart-scanner-filter-title"
          >
            <header class="flex items-start justify-between gap-4 border-b border-[var(--app-border)] px-5 py-4">
              <div>
                <p class="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">Filter Criteria</p>
                <h2 id="smart-scanner-filter-title" class="mt-1 text-xl text-[var(--app-text)]">Smart Scanner Filters</h2>
              </div>
              <button
                class="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--app-border)] text-[var(--app-text-subtle)] hover:bg-[var(--app-surface-muted)]"
                type="button"
                aria-label="Close filters"
                @click="filterOpen = false"
              >
                <X :size="18" />
              </button>
            </header>

            <div class="max-h-[calc(90vh-148px)] overflow-y-auto px-5 py-4">
              <div class="mb-4 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] p-3">
                <div class="text-sm font-extrabold text-[var(--app-text)]">Signals</div>
                <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <label
                    v-for="signal in signalOptions"
                    :key="signal"
                    class="flex min-h-9 items-center gap-2 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] px-3 py-2 text-sm font-semibold text-[var(--app-text-secondary)]"
                  >
                    <input
                      class="h-4 w-4 accent-[var(--app-primary)]"
                      type="checkbox"
                      :checked="isDraftSignalChecked(signal)"
                      @change="toggleDraftSignal(signal, $event)"
                    />
                    <span class="min-w-0 truncate" :title="signal">{{ signal }}</span>
                  </label>
                </div>
              </div>

              <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <label
                  v-for="definition in SMART_SCANNER_RANGE_DEFINITIONS"
                  :key="definition.key"
                  class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] p-3"
                >
                  <span class="block text-sm font-extrabold text-[var(--app-text)]">{{ definition.label }}</span>
                  <span v-if="definition.suffix" class="mt-0.5 block text-xs font-semibold text-[var(--app-text-muted)]">
                    {{ definition.suffix }}
                  </span>
                  <span class="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <input
                      class="h-9 min-w-0 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2 text-sm outline-none"
                      type="number"
                      :step="definition.step ?? '0.1'"
                      :value="draftRanges[definition.key].min ?? ''"
                      aria-label="Minimum value"
                      @input="setDraftRangeValue(definition.key, 'min', $event)"
                    />
                    <span class="text-[var(--app-text-muted)]">-</span>
                    <input
                      class="h-9 min-w-0 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2 text-sm outline-none"
                      type="number"
                      :step="definition.step ?? '0.1'"
                      :value="draftRanges[definition.key].max ?? ''"
                      aria-label="Maximum value"
                      @input="setDraftRangeValue(definition.key, 'max', $event)"
                    />
                  </span>
                </label>
              </div>
            </div>

            <footer class="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--app-border)] px-5 py-4">
              <button
                class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-4 text-sm font-semibold text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-muted)]"
                type="button"
                @click="disableAdvancedFilters"
              >
                No Filter
              </button>
              <button
                class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-4 text-sm font-semibold text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-muted)]"
                type="button"
                @click="resetAdvancedFilters"
              >
                Reset Filter
              </button>
              <button
                class="h-9 rounded-md bg-[var(--app-primary)] px-4 text-sm font-extrabold text-white hover:bg-[var(--app-primary-hover)]"
                type="button"
                @click="applyAdvancedFilters"
              >
                Apply Filter
              </button>
            </footer>
          </section>
        </div>
      </Teleport>
    </template>
  </ListExplorerPage>
</template>

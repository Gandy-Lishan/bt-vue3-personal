<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Download, ExternalLink, Filter, Info, RotateCcw, Search, X } from '@lucide/vue'
import { fetchOptionScannerRows } from '@/entities/scanner/api/option-scanner.api'
import {
  copyOptionScannerRanges,
  createOptionScannerDefaultRanges,
  formatOptionPercent,
  matchesOptionScannerRange,
  normalizeOptionScannerRangeBounds,
  OPTION_SCANNER_RANGE_DEFINITIONS,
  optionScannerCsvTable,
  optionScannerSearchScore,
  optionScannerSortValue,
  resetOptionScannerRanges,
} from '@/entities/scanner/model/option-scanner.adapter'
import {
  OPTION_SCANNER_PAGE_SIZE,
  type OptionScannerRange,
  type OptionScannerRangeKey,
  type OptionScannerRow,
  type OptionScannerSortDirection,
  type OptionScannerSortKey,
} from '@/entities/scanner/model/option-scanner.types'
import type { IndicatorTableColumnKind } from '@/entities/indicator/model/indicator.table'
import { downloadCsv, toCsv } from '@/shared/utils/csv'
import ListExplorerPage from '@/shared/ui/ListExplorerPage.vue'
import { useSortedPagedRows } from '@/pages/indicators/composables/useSortedPagedRows'
import IndicatorPagination from '@/pages/indicators/ui/IndicatorPagination.vue'
import OptionScannerTable from './ui/OptionScannerTable.vue'

type OptionSortOption = {
  key: OptionScannerSortKey
  label: string
  kind: IndicatorTableColumnKind
}

const rows = ref<OptionScannerRow[]>([])
const loading = ref(false)
const descriptionOpen = ref(false)
const filterOpen = ref(false)
const selectedDate = ref('')
const searchQuery = ref('')
const advancedFiltersEnabled = ref(false)
const appliedRanges = reactive(createOptionScannerDefaultRanges())
const draftRanges = reactive(createOptionScannerDefaultRanges())
const abortController = new AbortController()

const sortOptions: OptionSortOption[] = [
  { key: 'symbol', label: 'Symbol', kind: 'text' },
  { key: 'lastClose', label: 'Last Close', kind: 'number' },
  { key: 'expireDate', label: 'Expire Date', kind: 'date' },
  { key: 'dte', label: 'DTE', kind: 'number' },
  { key: 'strike', label: 'Strike', kind: 'number' },
  { key: 'breakEven', label: 'Break Even', kind: 'number' },
  { key: 'probabilityOfProfit', label: 'Prob. of Profit', kind: 'number' },
  { key: 'credit', label: 'Credit', kind: 'number' },
  { key: 'margin', label: 'Margin', kind: 'number' },
  { key: 'returnPercent', label: 'Return %', kind: 'number' },
  { key: 'expectedValueScore', label: 'Expected Value Score', kind: 'number' },
  { key: 'cagr', label: 'CAGR %', kind: 'number' },
]

const filteredRows = computed(() => {
  const query = searchQuery.value.trim()

  return rows.value
    .map((row, index) => ({ row, index, score: optionScannerSearchScore(row, query) }))
    .filter(({ row, score }) => {
      if (score === null) return false
      if (
        advancedFiltersEnabled.value &&
        !OPTION_SCANNER_RANGE_DEFINITIONS.every((definition) =>
          matchesOptionScannerRange(row, definition.key, appliedRanges[definition.key]),
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
  (row, key) => optionScannerSortValue(row, key as OptionScannerSortKey),
  OPTION_SCANNER_PAGE_SIZE,
)

const activeSortValue = computed(() => {
  if (!table.sortKey.value) return ''
  return `${table.sortKey.value}:${table.sortDirection.value}`
})

const averagePop = computed(() => average(filteredRows.value.map((row) => row.probabilityOfProfit)))
const averageReturn = computed(() => average(filteredRows.value.map((row) => row.returnPercent)))
const activeRangeCount = computed(() => (advancedFiltersEnabled.value ? OPTION_SCANNER_RANGE_DEFINITIONS.length : 0))
const maxDate = computed(() => new Date().toISOString().slice(0, 10))

function average(values: Array<number | null>) {
  const numeric = values.filter((value): value is number => value !== null)
  if (!numeric.length) return null
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length
}

function sortDirectionLabel(kind: IndicatorTableColumnKind, direction: OptionScannerSortDirection) {
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

  const [key, direction] = value.split(':') as [OptionScannerSortKey, OptionScannerSortDirection]
  const option = sortOptions.find((item) => item.key === key)
  if (!option || (direction !== 'asc' && direction !== 'desc')) return

  table.setSort({ key: option.key, kind: option.kind }, direction)
}

function handleTableSort(key: OptionScannerSortKey) {
  const option = sortOptions.find((item) => item.key === key)
  table.sort({ key, kind: option?.kind ?? 'text' })
}

function dateIsWeekend(date: string) {
  if (!date) return false
  const value = new Date(`${date}T00:00:00`)
  const day = value.getDay()
  return day === 0 || day === 6
}

async function loadRows(date = selectedDate.value) {
  if (date && (date > maxDate.value || dateIsWeekend(date))) return

  loading.value = true
  try {
    const nextRows = await fetchOptionScannerRows(date, abortController.signal)
    rows.value = nextRows
    if (!selectedDate.value && nextRows[0]?.tradeDate) selectedDate.value = nextRows[0].tradeDate
    table.reset()
  } finally {
    loading.value = false
  }
}

function resetAllFilters() {
  searchQuery.value = ''
  advancedFiltersEnabled.value = false
  resetOptionScannerRanges(appliedRanges)
  resetOptionScannerRanges(draftRanges)
  table.reset()
}

function openFilters() {
  copyOptionScannerRanges(appliedRanges, draftRanges)
  filterOpen.value = true
}

function applyAdvancedFilters() {
  normalizeOptionScannerRangeBounds(draftRanges)
  copyOptionScannerRanges(draftRanges, appliedRanges)
  advancedFiltersEnabled.value = true
  filterOpen.value = false
  table.setPage(1)
}

function disableAdvancedFilters() {
  advancedFiltersEnabled.value = false
  filterOpen.value = false
  table.setPage(1)
}

function setDraftRangeValue(key: OptionScannerRangeKey, side: keyof OptionScannerRange, event: Event) {
  const value = (event.target as HTMLInputElement).value.trim()
  draftRanges[key][side] = value ? Number(value) : null
}

function rangeSuffix(definition: { suffix?: string }) {
  return definition.suffix ? ` (${definition.suffix})` : ''
}

function downloadOptionCsv() {
  const { headers, rows: csvRows } = optionScannerCsvTable(table.sortedRows.value)
  if (!csvRows.length) return

  const isoDate = selectedDate.value || new Date().toISOString().slice(0, 10)
  downloadCsv(`smart-option-scanner-${isoDate}.csv`, toCsv(headers, csvRows))
}

function openOptionQa() {
  window.open('https://btv2.sentimentrader.com/doc/QA/2', '_blank', 'noopener,noreferrer')
}

watch(
  () => [searchQuery.value, advancedFiltersEnabled.value],
  () => {
    table.setPage(1)
  },
)

onMounted(() => {
  void loadRows('')
})

onBeforeUnmount(() => {
  abortController.abort()
})
</script>

<template>
  <ListExplorerPage
    title="Smart Option Scanner"
    description="Premium short-put candidates for option sellers, filtered by probability, yield, and risk metrics."
    panel-title="Smart Option Scanner Summary"
    panel-description="Browse option contracts, inspect secondary Greeks and liquidity, and export the current list."
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
        <span class="indicator-summary-pill__text">
          <span class="indicator-summary-pill__value">{{ table.sortedRows.value.length }}</span>
          <span class="indicator-summary-pill__label"> Contracts</span>
        </span>
      </span>
      <span class="indicator-summary-pill">
        <span class="indicator-summary-pill__dot bg-emerald-500" />
        <span class="indicator-summary-pill__text">
          <span class="indicator-summary-pill__value">{{ formatOptionPercent(averagePop) }}</span>
          <span class="indicator-summary-pill__label"> Avg POP</span>
        </span>
      </span>
      <span class="indicator-summary-pill">
        <span class="indicator-summary-pill__dot bg-sky-500" />
        <span class="indicator-summary-pill__text">
          <span class="indicator-summary-pill__value">{{ formatOptionPercent(averageReturn) }}</span>
          <span class="indicator-summary-pill__label"> Avg Return</span>
        </span>
      </span>
      <span class="indicator-summary-pill">
        <span class="indicator-summary-pill__text">
          <span class="indicator-summary-pill__value">{{ activeRangeCount || OPTION_SCANNER_RANGE_DEFINITIONS.length }}</span>
          <span class="indicator-summary-pill__label"> Filters</span>
        </span>
      </span>
    </template>

    <template #filters>
      <div class="grid gap-2 px-4 py-3 md:grid-cols-2 xl:grid-cols-[150px_minmax(230px,1.2fr)_minmax(230px,0.8fr)_auto_auto_auto]">
        <input
          v-model="selectedDate"
          class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)] outline-none"
          type="date"
          :max="maxDate"
          aria-label="Trade date"
          @change="loadRows()"
        />
        <label class="flex h-9 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5">
          <Search :size="16" class="mr-2 shrink-0 text-[var(--app-text-muted)]" />
          <input v-model="searchQuery" class="w-full bg-transparent text-[0.8125rem] outline-none" placeholder="Search symbol or contract..." />
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
          @click="downloadOptionCsv"
        >
          <Download :size="16" />
          CSV
        </button>
      </div>
    </template>

    <div class="px-4 pb-4">
      <OptionScannerTable
        :rows="table.pagedRows.value"
        :loading="loading"
        :sort-key="table.sortKey.value as OptionScannerSortKey | ''"
        :sort-direction="table.sortDirection.value"
        @sort="handleTableSort"
      />
    </div>

    <template #footer>
      <IndicatorPagination
        :page="table.page.value"
        :page-count="table.pageCount.value"
        :total="table.sortedRows.value.length"
        item-label="option contracts"
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
            class="max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-lg bg-[var(--app-surface)] text-[var(--app-text)] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="option-scanner-description-title"
          >
            <header class="flex items-start justify-between gap-4 border-b border-[var(--app-border)] px-5 py-4">
              <div>
                <p class="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">Smart Option Scanner</p>
                <h2 id="option-scanner-description-title" class="mt-1 text-xl text-[var(--app-text)]">Description & Legend</h2>
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
                  Designed for option sellers, this tool scans a broad universe of assets to identify premium short-put
                  opportunities with high probability of profit and positive expected value.
                </p>
                <p>
                  The default view emphasizes POP, return, DTE, margin, EV Score, and CAGR. Expand a row to inspect
                  liquidity, implied volatility, Greeks, and the contract symbol.
                </p>
                <p>
                  Filters follow the legacy scanner defaults: Volume at least 10, Open Interest at least 100, IV from
                  10% to 150%, Delta from 0 to 0.08, and Vega from 0 to 1. They are applied only after you choose
                  <b>Apply Filter</b>.
                </p>
                <button
                  class="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--app-border)] px-3 text-sm font-semibold text-[var(--app-primary)] hover:bg-[var(--app-primary-soft)]"
                  type="button"
                  @click="openOptionQa"
                >
                  Smart Option Scanner Q&A
                  <ExternalLink :size="15" />
                </button>
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
            class="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-[var(--app-surface)] text-[var(--app-text)] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="option-scanner-filter-title"
          >
            <header class="flex items-start justify-between gap-4 border-b border-[var(--app-border)] px-5 py-4">
              <div>
                <p class="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">Filter Criteria</p>
                <h2 id="option-scanner-filter-title" class="mt-1 text-xl text-[var(--app-text)]">Smart Option Scanner Filters</h2>
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
              <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <label
                  v-for="definition in OPTION_SCANNER_RANGE_DEFINITIONS"
                  :key="definition.key"
                  class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] p-3"
                >
                  <span class="block text-sm font-extrabold text-[var(--app-text)]">
                    {{ definition.label }}{{ rangeSuffix(definition) }}
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

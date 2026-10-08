<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Download, RotateCcw, Search } from '@lucide/vue'
import {
  addStrategyFavorite,
  fetchStrategySignals,
  fetchStrategySummaries,
  removeStrategyFavorite,
} from '@/entities/strategy/api/strategy.api'
import {
  mergeStrategyRows,
  matchesStrategyScope,
  strategyLastMonthEndLabel,
  strategyRowSortValue,
  strategyScopeDescription,
  strategyScopeOptions,
  strategyScopeTitle,
  strategySearchScore,
  strategySignalCsvTable,
  strategySummaryCsvTable,
} from '@/entities/strategy/model/strategy.adapter'
import {
  STRATEGY_PAGE_SIZE,
  type StrategyRow,
  type StrategyScopeKey,
  type StrategySignalRow,
  type StrategySignalSortKey,
  type StrategySortDirection,
  type StrategySortKey,
  type StrategySummaryRow,
  type StrategySummarySortKey,
  type StrategyTab,
  type StrategyViewMode,
} from '@/entities/strategy/model/strategy.types'
import type { IndicatorTableColumnKind } from '@/entities/indicator/model/indicator.table'
import { downloadCsv, toCsv } from '@/shared/utils/csv'
import ListExplorerPage from '@/shared/ui/ListExplorerPage.vue'
import IndicatorPagination from '@/pages/indicators/ui/IndicatorPagination.vue'
import { useSortedPagedRows } from '@/pages/indicators/composables/useSortedPagedRows'
import StrategyCardGrid from './ui/StrategyCardGrid.vue'
import StrategyScopeSidebar from './ui/StrategyScopeSidebar.vue'
import StrategyTable from './ui/StrategyTable.vue'

type StrategySortOption<T extends StrategySortKey = StrategySortKey> = {
  key: T
  label: string
  kind: IndicatorTableColumnKind
}

const STORAGE_KEY = 'strategy_page_state'

const router = useRouter()
const viewMode = ref<StrategyViewMode>('table')
const activeTab = ref<StrategyTab>('signals')
const activeScope = ref<StrategyScopeKey>('all')
const searchQuery = ref('')
const timeFrameFilter = ref('')
const frequencyFilter = ref('')
const currentSignalFilter = ref('')
const signalRows = shallowRef<StrategySignalRow[]>([])
const summaryRows = shallowRef<StrategySummaryRow[]>([])
const loading = ref(false)
const favoriteLoadingUrls = ref(new Set<string>())
const abortController = new AbortController()
const ytdLabel = strategyLastMonthEndLabel()
let persistStateHandle: number | null = null
let persistStateHandleIsIdle = false

const signalSortOptions: Array<StrategySortOption<StrategySignalSortKey>> = [
  { key: 'modelName', label: 'Model Name', kind: 'text' },
  { key: 'timeFrame', label: 'Time Frame', kind: 'text' },
  { key: 'currentSignal', label: 'Current Signal', kind: 'text' },
  { key: 'lastSignalDate', label: 'Last Signal Date', kind: 'date' },
  { key: 'frequency', label: 'Frequency', kind: 'text' },
  { key: 'ytdReturn', label: 'YTD Return', kind: 'number' },
  { key: 'cagr', label: 'CAGR', kind: 'number' },
]

const summarySortOptions: Array<StrategySortOption<StrategySummarySortKey>> = [
  { key: 'modelName', label: 'Model Name', kind: 'text' },
  { key: 'cagr', label: 'Strategy CAGR', kind: 'number' },
  { key: 'benchmarkCagr', label: 'Benchmark CAGR', kind: 'number' },
  { key: 'netProfit', label: 'Net Profit', kind: 'number' },
  { key: 'maxDrawdown', label: 'Max Drawdown', kind: 'number' },
  { key: 'sharpeRatio', label: 'Sharpe Ratio', kind: 'number' },
  { key: 'profitLossRatio', label: 'P/L Ratio', kind: 'number' },
  { key: 'averageWin', label: 'Avg Win', kind: 'number' },
  { key: 'averageLoss', label: 'Avg Loss', kind: 'number' },
  { key: 'totalTrades', label: 'Trades', kind: 'number' },
  { key: 'winRate', label: 'Win Rate', kind: 'number' },
]

const sortOptions = computed(() => (activeTab.value === 'signals' ? signalSortOptions : summarySortOptions))

const scopes = computed(() => strategyScopeOptions(signalRows.value))
const activeScopeCount = computed(() => scopes.value.find((scope) => scope.key === activeScope.value)?.count ?? 0)
const favoriteCount = computed(() => signalRows.value.filter((row) => row.favorite).length)
const currentChangeCount = computed(() => signalRows.value.filter((row) => row.currentDay).length)
const panelTitle = computed(() => strategyScopeTitle(activeScope.value))
const tabDescription = computed(() =>
  activeTab.value === 'signals'
    ? 'Latest model signals and update frequency for each strategy.'
    : 'Historical performance statistics for the same strategies.',
)
const panelDescription = computed(() => {
  const scopeDescription = strategyScopeDescription(activeScope.value, activeScopeCount.value)
  if (activeScope.value === 'basket') return scopeDescription
  return `${scopeDescription} · ${tabDescription.value}`
})
const timeFrameOptions = computed(() => uniqueSorted(signalRows.value.map((row) => row.timeFrame)))
const frequencyOptions = computed(() => uniqueSorted(signalRows.value.map((row) => row.frequency)))
const currentSignalOptions = computed(() => uniqueSorted(signalRows.value.map((row) => row.currentSignal)))
const strategyRows = computed(() => mergeStrategyRows(signalRows.value, summaryRows.value))

const filteredStrategies = computed(() => {
  const query = searchQuery.value.trim()
  const scopedRows = strategyRows.value.filter((row) => matchesStrategyScope(row, activeScope.value) && matchesQuickFilters(row.signal))
  if (!query) return scopedRows

  return scopedRows
    .map((row, index) => ({ row, index, score: strategySearchScore(row, query) }))
    .filter(({ score }) => score !== null)
    .sort((left, right) => {
      if (!query) return left.index - right.index
      return (right.score ?? -Infinity) - (left.score ?? -Infinity) || left.index - right.index
    })
    .map(({ row }) => row)
})

const strategyTable = useSortedPagedRows<StrategyRow>(
  filteredStrategies,
  (row, key) => strategyRowSortValue(row, key as StrategySortKey),
  STRATEGY_PAGE_SIZE,
)

const sortedSignalRows = computed(() => strategyTable.sortedRows.value.map((row) => row.signal))
const sortedSummaryRows = computed(() => strategyTable.sortedRows.value.map((row) => row.summary))
const pagedSignalRows = computed(() => strategyTable.pagedRows.value.map((row) => row.signal))
const pagedSummaryRows = computed(() => strategyTable.pagedRows.value.map((row) => row.summary))

const activeSortValue = computed(() => {
  if (!strategyTable.sortKey.value) return ''
  const option = sortOptions.value.find((item) => item.key === strategyTable.sortKey.value)
  if (!option) return ''
  return `${strategyTable.sortKey.value}:${strategyTable.sortDirection.value}`
})

const activeRowsTotal = computed(() => strategyTable.sortedRows.value.length)

const activePage = computed(() => strategyTable.page.value)
const activePageCount = computed(() => strategyTable.pageCount.value)

function sortDirectionLabel(kind: IndicatorTableColumnKind, direction: StrategySortDirection) {
  if (kind === 'number' || kind === 'change' || kind === 'sentiment') {
    return direction === 'asc' ? 'Low to High' : 'High to Low'
  }
  if (kind === 'date') return direction === 'asc' ? 'Oldest First' : 'Newest First'
  return direction === 'asc' ? 'A to Z' : 'Z to A'
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter((value) => value && value !== '—'))).sort((left, right) =>
    left.localeCompare(right),
  )
}

function matchesQuickFilters(row: Pick<StrategySignalRow, 'timeFrame' | 'frequency' | 'currentSignal'>) {
  return (
    (!timeFrameFilter.value || row.timeFrame === timeFrameFilter.value) &&
    (!frequencyFilter.value || row.frequency === frequencyFilter.value) &&
    (!currentSignalFilter.value || row.currentSignal === currentSignalFilter.value)
  )
}

function setViewMode(mode: StrategyViewMode) {
  viewMode.value = mode
}

function setScope(scope: StrategyScopeKey) {
  if (activeScope.value === scope) return
  activeScope.value = scope
  strategyTable.setPage(1)
}

function setTab(tab: StrategyTab) {
  activeTab.value = tab
}

function setActivePage(page: number) {
  strategyTable.setPage(page)
}

function handleSortSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value

  if (!value) {
    strategyTable.reset()
    return
  }

  const [key, direction] = value.split(':') as [StrategySortKey, StrategySortDirection]
  const option = sortOptions.value.find((item) => item.key === key)
  if (!option || (direction !== 'asc' && direction !== 'desc')) return

  strategyTable.setSort({ key: option.key, kind: option.kind }, direction)
}

function handleTableSort(key: StrategySortKey) {
  const option = sortOptions.value.find((item) => item.key === key)
  strategyTable.sort({ key, kind: option?.kind ?? 'text' })
}

function resetFilters() {
  searchQuery.value = ''
  activeScope.value = 'all'
  timeFrameFilter.value = ''
  frequencyFilter.value = ''
  currentSignalFilter.value = ''
  strategyTable.reset()
}

function downloadStrategyCsv() {
  const table =
    activeTab.value === 'signals'
      ? strategySignalCsvTable(sortedSignalRows.value, ytdLabel)
      : strategySummaryCsvTable(sortedSummaryRows.value)
  if (!table.rows.length) return

  const suffix = activeTab.value === 'signals' ? 'current-signals' : 'summary-statistics'
  downloadCsv(`strategies-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(table.headers, table.rows))
}

function openStrategy(row: StrategySignalRow | StrategySummaryRow) {
  const linkedSignal = signalRows.value.find((item) => item.url === row.url)
  void router.push({
    name: 'strategy-detail-legacy',
    query: {
      url: row.url,
      name: row.modelName,
      frequency: linkedSignal?.frequency || undefined,
    },
  })
}

function setFavoriteForUrl(url: string, favorite: boolean) {
  signalRows.value = signalRows.value.map((row) => (row.url === url ? { ...row, favorite } : row))
  summaryRows.value = summaryRows.value.map((row) => (row.url === url ? { ...row, favorite } : row))
}

async function toggleFavorite(row: StrategySignalRow) {
  if (favoriteLoadingUrls.value.has(row.url)) return

  favoriteLoadingUrls.value = new Set(favoriteLoadingUrls.value).add(row.url)
  const ok = row.favorite
    ? await removeStrategyFavorite(row.url, abortController.signal)
    : await addStrategyFavorite(row.url, abortController.signal)

  if (ok) setFavoriteForUrl(row.url, !row.favorite)
  const next = new Set(favoriteLoadingUrls.value)
  next.delete(row.url)
  favoriteLoadingUrls.value = next
}

async function loadStrategies() {
  loading.value = true
  try {
    const signals = await fetchStrategySignals(abortController.signal)
    signalRows.value = signals
    summaryRows.value = await fetchStrategySummaries(signals, abortController.signal)
  } finally {
    loading.value = false
  }
}

function restoreState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const state = JSON.parse(raw) as Partial<{
      activeScope: StrategyScopeKey
      activeTab: StrategyTab
      viewMode: StrategyViewMode
    }>
    if (state.activeScope) activeScope.value = state.activeScope
    if (state.activeTab) activeTab.value = state.activeTab
    if (state.viewMode) viewMode.value = state.viewMode
  } catch {
    // Ignore stale local storage from older page shapes.
  }
}

function schedulePersistState() {
  if (typeof window === 'undefined') return

  const scheduler = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
    cancelIdleCallback?: (handle: number) => void
  }

  if (persistStateHandle !== null) {
    if (persistStateHandleIsIdle) scheduler.cancelIdleCallback?.(persistStateHandle)
    else window.clearTimeout(persistStateHandle)
  }

  const persist = () => {
    persistStateHandle = null
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeScope: activeScope.value,
        activeTab: activeTab.value,
        viewMode: viewMode.value,
      }),
    )
  }

  if (scheduler.requestIdleCallback) {
    persistStateHandleIsIdle = true
    persistStateHandle = scheduler.requestIdleCallback(persist, { timeout: 500 })
  } else {
    persistStateHandleIsIdle = false
    persistStateHandle = window.setTimeout(persist, 0)
  }
}

function cancelScheduledPersistState() {
  if (persistStateHandle === null || typeof window === 'undefined') return

  const scheduler = window as Window & { cancelIdleCallback?: (handle: number) => void }
  if (persistStateHandleIsIdle) scheduler.cancelIdleCallback?.(persistStateHandle)
  else window.clearTimeout(persistStateHandle)
  persistStateHandle = null
}

watch(
  () => [searchQuery.value, timeFrameFilter.value, frequencyFilter.value, currentSignalFilter.value],
  () => {
    strategyTable.setPage(1)
  },
)

watch(
  () => [activeScope.value, activeTab.value, viewMode.value],
  () => {
    schedulePersistState()
  },
)

onMounted(() => {
  restoreState()
  void loadStrategies()
})

onBeforeUnmount(() => {
  cancelScheduledPersistState()
  abortController.abort()
})
</script>

<template>
  <ListExplorerPage
    title="Strategies"
    description="Browse systematic trading models, current signals, and historical summary statistics."
    :panel-title="panelTitle"
    :panel-description="panelDescription"
    :view-mode="viewMode"
    sidebar-width="220px"
    @update:view-mode="setViewMode"
  >
    <template #sidebar>
      <StrategyScopeSidebar :scopes="scopes" :active-scope="activeScope" @select="setScope" />
    </template>

    <template #summary>
      <span class="indicator-summary-pill">
        <span class="indicator-summary-pill__text">
          <span class="indicator-summary-pill__value">{{ activeRowsTotal }}</span>
          <span class="indicator-summary-pill__label"> Showing</span>
        </span>
      </span>
      <span class="indicator-summary-pill">
        <span class="indicator-summary-pill__dot bg-amber-500" />
        <span class="indicator-summary-pill__text">
          <span class="indicator-summary-pill__value">{{ favoriteCount }}</span>
          <span class="indicator-summary-pill__label"> Favorites</span>
        </span>
      </span>
      <span class="indicator-summary-pill">
        <span class="indicator-summary-pill__dot bg-sky-500" />
        <span class="indicator-summary-pill__text">
          <span class="indicator-summary-pill__value">{{ currentChangeCount }}</span>
          <span class="indicator-summary-pill__label"> Signal Changes</span>
        </span>
      </span>
    </template>

    <template #tabs>
      <div class="flex flex-wrap gap-5 border-b border-[var(--app-border)] px-4 pt-2">
        <button
          class="border-b-2 px-1 pb-2 text-sm font-extrabold transition"
          :class="activeTab === 'signals' ? 'border-[var(--app-primary)] text-[var(--app-primary)]' : 'border-transparent text-[var(--app-text-secondary)] hover:text-[var(--app-primary)]'"
          type="button"
          @click="setTab('signals')"
        >
          Current Signals
        </button>
        <button
          class="border-b-2 px-1 pb-2 text-sm font-extrabold transition"
          :class="activeTab === 'summary' ? 'border-[var(--app-primary)] text-[var(--app-primary)]' : 'border-transparent text-[var(--app-text-secondary)] hover:text-[var(--app-primary)]'"
          type="button"
          @click="setTab('summary')"
        >
          Summary Statistics
        </button>
      </div>
    </template>

    <template #filters>
      <div class="grid gap-2 px-4 py-3 md:grid-cols-2 xl:grid-cols-[minmax(160px,1fr)_minmax(106px,0.42fr)_minmax(106px,0.42fr)_minmax(145px,0.6fr)_minmax(155px,0.65fr)_auto_auto]">
        <label class="flex h-9 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5">
          <Search :size="16" class="mr-2 shrink-0 text-[var(--app-text-muted)]" />
          <input v-model="searchQuery" class="w-full bg-transparent text-[0.8125rem] outline-none" placeholder="Search strategies..." />
        </label>
        <select
          v-model="timeFrameFilter"
          class="h-9 min-w-0 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]"
        >
          <option value="">Time Frame</option>
          <option v-for="option in timeFrameOptions" :key="option" :value="option">{{ option }}</option>
        </select>
        <select
          v-model="frequencyFilter"
          class="h-9 min-w-0 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]"
        >
          <option value="">Frequency</option>
          <option v-for="option in frequencyOptions" :key="option" :value="option">{{ option }}</option>
        </select>
        <select
          v-model="currentSignalFilter"
          class="h-9 min-w-0 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]"
        >
          <option value="">Current Signal</option>
          <option v-for="option in currentSignalOptions" :key="option" :value="option">{{ option }}</option>
        </select>
        <select
          class="h-9 min-w-0 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]"
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
          :disabled="!activeRowsTotal"
          title="Download this list as CSV"
          @click="downloadStrategyCsv"
        >
          <Download :size="16" />
          CSV
        </button>
      </div>
    </template>

    <div class="px-4 pb-4">
      <StrategyTable
        v-if="viewMode === 'table'"
        :tab="activeTab"
        :signals="pagedSignalRows"
        :summaries="pagedSummaryRows"
        :loading="loading"
        :sort-key="strategyTable.sortKey.value as StrategySortKey | ''"
        :sort-direction="strategyTable.sortDirection.value"
        :ytd-label="ytdLabel"
        @sort="handleTableSort"
        @open="openStrategy"
        @favorite="toggleFavorite"
      />
      <StrategyCardGrid
        v-else
        :tab="activeTab"
        :signals="pagedSignalRows"
        :summaries="pagedSummaryRows"
        :loading="loading"
        :ytd-label="ytdLabel"
        @open="openStrategy"
        @favorite="toggleFavorite"
      />
    </div>

    <template #footer>
      <IndicatorPagination
        :page="activePage"
        :page-count="activePageCount"
        :total="activeRowsTotal"
        item-label="strategies"
        @change="setActivePage"
      />
    </template>
  </ListExplorerPage>
</template>

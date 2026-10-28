<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  Bitcoin,
  Boxes,
  ChartNoAxesCombined,
  Cpu,
  Layers3,
  LayoutGrid,
  ListPlus,
  ListFilter,
  RefreshCw,
  Save,
  Search,
  X,
} from '@lucide/vue'
import ListPageHeader from '@/shared/ui/ListPageHeader.vue'
import ListPagePanel from '@/shared/ui/ListPagePanel.vue'
import AppDataTable from '@/shared/ui/AppDataTable.vue'
import type { AppDataTableColumn } from '@/shared/ui/app-data-table.types'
import IndicatorPagination from '@/pages/indicators/ui/IndicatorPagination.vue'
import { saveWatchList } from '@/entities/my-stuff/api/watch-list.api'
import { WATCH_LIST_INDICATORS, type WatchListColumn } from '@/entities/my-stuff/model/watch-list'
import {
  fetchMarketMetrics,
  fetchMetricWatchlistConfig,
  parseConfigValue,
  saveMetricWatchlistConfig,
  type MarketMetricRow,
  type MarketRange,
  type MarketScreenConfig,
} from './market-screen.api'

type ViewMode = 'table' | 'cards'
type SortDirection = 'asc' | 'desc'
type FilterKey = 'optix' | 'trend' | 'reltrend' | 'volatility_20d' | 'volatility_60d'

const route = useRoute()
const pageSize = 10
const defaultColumns = ['symbol', 'data_date', 'close', 'optix', 'trend', 'reltrend', 'volatility_20d', 'volatility_60d']
const groups = [
  { id: 'sp1500', label: 'S&P 1500', description: 'Broad U.S. market', icon: Layers3 },
  { id: 'sp500', label: 'S&P 500', description: 'Large-cap U.S. stocks', icon: ChartNoAxesCombined },
  { id: 'ndx', label: 'NDX', description: 'Nasdaq 100', icon: Cpu },
  { id: 'russell', label: 'Russell', description: 'Small-cap U.S. stocks', icon: Boxes },
  { id: 'etf', label: 'ETF', description: 'Exchange-traded funds', icon: LayoutGrid },
  { id: 'crp', label: 'Crypto', description: 'Digital assets', icon: Bitcoin },
] as const
const columns = [
  { key: 'symbol', label: 'Ticker' },
  { key: 'data_date', label: 'Date' },
  { key: 'close', label: 'Close' },
  { key: 'optix', label: 'Optix' },
  { key: 'trend', label: 'Trend Score' },
  { key: 'reltrend', label: 'RelTrend Score' },
  { key: 'volatility_20d', label: 'HV20' },
  { key: 'volatility_60d', label: 'HV60' },
] as const
const tableColumns: AppDataTableColumn[] = [
  { key: 'select', label: '', minWidth: 48, align: 'center' },
  ...columns.map((column) => ({
    key: column.key,
    label: column.label,
    minWidth: column.key === 'symbol' ? 100 : 92,
    sortable: true,
    format: (_raw: unknown, row: Record<string, unknown>) => value(row, column.key),
    cellClass: () => column.key === 'symbol' ? 'text-[var(--app-text)]' : '',
  })),
]
const filterDefinitions: Array<{ key: FilterKey; label: string; options: string[] }> = [
  { key: 'optix', label: 'Optix', options: ['Any', '>= 70', '>= 80', '<= 30', '<= 20'] },
  { key: 'trend', label: 'Trend', options: ['Any', '>= 6', '>= 8', '<= 2'] },
  { key: 'reltrend', label: 'Rel. Trend', options: ['Any', '>= 6', '>= 8', '<= 2'] },
  { key: 'volatility_20d', label: 'HV20', options: ['Any', '>= 30', '<= 15'] },
  { key: 'volatility_60d', label: 'HV60', options: ['Any', '>= 30', '<= 15'] },
]

const requestedGroup = typeof route.query.group === 'string' ? route.query.group.toLowerCase() : ''
const sortableMarketFields = new Set(columns.map((column) => column.key))
const requestedSort = typeof route.query.sort === 'string' && sortableMarketFields.has(route.query.sort)
  ? route.query.sort
  : 'symbol'
const requestedDirection: SortDirection = route.query.direction === 'desc' ? 'desc' : 'asc'
const activeGroup = ref(groups.some((group) => group.id === requestedGroup) ? requestedGroup : 'sp1500')
const viewMode = ref<ViewMode>('table')
const rows = ref<MarketMetricRow[]>([])
const total = ref(0)
const page = ref(1)
const search = ref('')
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const sortKey = ref(requestedSort)
const sortDirection = ref<SortDirection>(requestedDirection)
const filters = ref<Record<FilterKey, string>>({
  optix: 'Any', trend: 'Any', reltrend: 'Any', volatility_20d: 'Any', volatility_60d: 'Any',
})
const savedConfig = ref<Record<string, unknown>>({})
const marketConfigs = ref<MarketScreenConfig[]>([])
const selectedSymbols = ref<Set<string>>(new Set())
const createWatchlistOpen = ref(false)
const watchlistName = ref('')
const watchlistColumns = ref<string[]>(['Trend Score', 'RelTrend Score', 'Optix', 'ROC'])
const watchlistError = ref('')
let controller: AbortController | null = null
let searchTimer: ReturnType<typeof setTimeout> | null = null

const activeGroupMeta = computed(() => groups.find((group) => group.id === activeGroup.value) ?? groups[0])
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const rangeFilters = computed(() => Object.entries(filters.value).reduce<Record<string, MarketRange>>((ranges, [key, option]) => {
  const match = option.match(/^(>=|<=)\s*(-?\d+(?:\.\d+)?)$/)
  if (!match) return ranges
  const value = Number(match[2])
  ranges[key] = match[1] === '>=' ? { min: value, max: null } : { min: null, max: value }
  return ranges
}, {}))
const ordering = computed(() => `${sortDirection.value === 'desc' ? '-' : ''}${sortKey.value}`)
const visibleSymbols = computed(() => rows.value.map(rowSymbol).filter(Boolean))
const allVisibleSelected = computed(() => visibleSymbols.value.length > 0 && visibleSymbols.value.every((symbol) => selectedSymbols.value.has(symbol)))

function configFor(group: string) {
  return marketConfigs.value.find((config) => config.groups?.[0] === group)
}

function formatRange(range: MarketRange | undefined) {
  if (!range) return 'Any'
  if (range.min !== null && range.min !== undefined) return `>= ${range.min}`
  if (range.max !== null && range.max !== undefined) return `<= ${range.max}`
  return 'Any'
}

function applySavedGroup(group: string) {
  const config = configFor(group)
  for (const definition of filterDefinitions) filters.value[definition.key] = formatRange(config?.ranges?.[definition.key])
}

async function loadRows(resetPage = false) {
  if (resetPage) page.value = 1
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  try {
    const result = await fetchMarketMetrics({
      group: activeGroup.value,
      page: page.value,
      pageSize,
      symbol: search.value,
      ordering: ordering.value,
      ranges: rangeFilters.value,
      signal: controller.signal,
    })
    rows.value = result.rows
    total.value = result.total
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      rows.value = []
      total.value = 0
      message.value = 'Unable to load market results.'
    }
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}

async function selectGroup(group: string) {
  activeGroup.value = group
  search.value = ''
  applySavedGroup(group)
  await loadRows(true)
}

function changeSort(key: string) {
  if (sortKey.value === key) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = key
    sortDirection.value = 'asc'
  }
  void loadRows(true)
}

function resetFilters() {
  for (const definition of filterDefinitions) filters.value[definition.key] = 'Any'
  search.value = ''
  void loadRows(true)
}

function setPage(nextPage: number) {
  const normalizedPage = Math.max(1, Math.min(nextPage, pageCount.value))
  if (normalizedPage === page.value) return
  page.value = normalizedPage
  void loadRows()
}

function currentConfig(): MarketScreenConfig {
  return {
    name: activeGroupMeta.value.label,
    groups: [activeGroup.value],
    ranges: rangeFilters.value,
    columns: defaultColumns,
  }
}

async function saveFilters() {
  saving.value = true
  message.value = ''
  try {
    const nextConfigs = groups.map((group) => group.id === activeGroup.value
      ? currentConfig()
      : configFor(group.id) ?? { name: group.label, groups: [group.id], ranges: {}, columns: defaultColumns })
    const payload = { ...savedConfig.value, name: String(savedConfig.value.name ?? 'default'), config_table2: nextConfigs }
    await saveMetricWatchlistConfig(payload)
    savedConfig.value = payload
    marketConfigs.value = nextConfigs
    message.value = 'Filter logic saved.'
  } catch {
    message.value = 'Unable to save filter logic.'
  } finally {
    saving.value = false
  }
}

function rowSymbol(row: MarketMetricRow) {
  const raw = String(row.symbol ?? row.ticker ?? row.market_symbol ?? '').trim()
  if (!raw) return ''
  return raw.includes('_') ? raw.toLowerCase() : raw.toUpperCase()
}

function displayTicker(row: MarketMetricRow) {
  const raw = String(row.symbol ?? row.ticker ?? row.market_symbol ?? '').trim()
  if (!raw) return '—'
  return (raw.includes('_') ? raw.slice(raw.indexOf('_') + 1) : raw).toUpperCase()
}

function displayStoredTicker(symbol: string) {
  return (symbol.includes('_') ? symbol.slice(symbol.indexOf('_') + 1) : symbol).toUpperCase()
}

function toggleSymbol(row: MarketMetricRow) {
  const symbol = rowSymbol(row)
  if (!symbol) return
  const next = new Set(selectedSymbols.value)
  if (next.has(symbol)) next.delete(symbol)
  else if (next.size < 10) next.add(symbol)
  else message.value = 'A watch list can contain up to 10 symbols.'
  selectedSymbols.value = next
}

function toggleVisibleSymbols() {
  const next = new Set(selectedSymbols.value)
  if (allVisibleSelected.value) visibleSymbols.value.forEach((symbol) => next.delete(symbol))
  else {
    for (const symbol of visibleSymbols.value) {
      if (next.size >= 10) break
      next.add(symbol)
    }
  }
  selectedSymbols.value = next
}

function defaultWatchlistName() {
  const date = new Date().toISOString().slice(0, 10)
  return `${activeGroupMeta.value.label} Watchlist ${date}`
}

function openCreateWatchlist() {
  if (!selectedSymbols.value.size) return
  watchlistName.value = defaultWatchlistName()
  watchlistColumns.value = ['Trend Score', 'RelTrend Score', 'Optix', 'ROC']
  watchlistError.value = ''
  createWatchlistOpen.value = true
}

function toggleWatchlistColumn(indicator: string) {
  watchlistColumns.value = watchlistColumns.value.includes(indicator)
    ? watchlistColumns.value.filter((item) => item !== indicator)
    : watchlistColumns.value.length < 10 ? [...watchlistColumns.value, indicator] : watchlistColumns.value
}

async function createWatchlist() {
  watchlistError.value = ''
  if (!watchlistName.value.trim()) { watchlistError.value = 'Enter a watch list name.'; return }
  if (!selectedSymbols.value.size) { watchlistError.value = 'Select at least one symbol.'; return }
  if (!watchlistColumns.value.length) { watchlistError.value = 'Select at least one column.'; return }
  saving.value = true
  try {
    const columns: WatchListColumn[] = watchlistColumns.value.map((indicator) => {
      const option = WATCH_LIST_INDICATORS.find((item) => item.value === indicator)
      return { indicator, bar: option?.bar ?? 1 }
    })
    await saveWatchList(watchlistName.value.trim(), [...selectedSymbols.value], columns)
    message.value = `Watchlist “${watchlistName.value.trim()}” created.`
    selectedSymbols.value = new Set()
    createWatchlistOpen.value = false
  } catch (error) {
    watchlistError.value = error instanceof Error ? error.message : 'Unable to create watch list.'
  } finally {
    saving.value = false
  }
}

function value(row: MarketMetricRow, key: string) {
  if (key === 'symbol') return displayTicker(row)
  const raw = row[key]
  if (raw === null || raw === undefined || raw === '') return '—'
  if (key === 'data_date') return String(raw).slice(0, 10)
  if (typeof raw === 'number') return raw.toLocaleString(undefined, { maximumFractionDigits: 2 })
  return String(raw)
}

function queueSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => void loadRows(true), 350)
}

onMounted(async () => {
  try {
    savedConfig.value = await fetchMetricWatchlistConfig('default')
    marketConfigs.value = parseConfigValue<MarketScreenConfig[]>(savedConfig.value.config_table2, [])
    applySavedGroup(activeGroup.value)
  } catch {
    savedConfig.value = { name: 'default' }
  }
  await loadRows(true)
})

onBeforeUnmount(() => {
  controller?.abort()
  if (searchTimer) clearTimeout(searchTimer)
})

watch(filters, () => void loadRows(true), { deep: true })
</script>

<template>
  <div class="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
    <main class="px-[var(--page-gutter)] pb-8 pt-8">
      <ListPageHeader
        title="Market Screen"
        description="Screen markets by sentiment, trend and volatility."
        :view-mode="viewMode"
        @update:view-mode="viewMode = $event"
      />

      <div class="market-screen-layout grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <ListPagePanel
          class="market-results"
          :title="activeGroupMeta.label"
          description="Filtered market metrics for the selected asset group."
        >
          <template #summary>
            <span class="indicator-summary-pill">
              <span class="indicator-summary-pill__text">
                <span class="indicator-summary-pill__value">{{ total.toLocaleString() }}</span>
                <span class="indicator-summary-pill__label"> matching assets</span>
              </span>
            </span>
          </template>

          <template #filters>
            <div class="grid gap-2 border-b border-[var(--app-border)] px-4 py-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_repeat(5,minmax(105px,0.72fr))_auto_auto]">
              <label class="flex h-9 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5">
                <Search :size="16" class="mr-2 shrink-0 text-[var(--app-text-muted)]" />
                <input v-model="search" class="w-full bg-transparent text-[0.8125rem] outline-none" placeholder="Search ticker..." @input="queueSearch" @keyup.enter="loadRows(true)" />
              </label>
              <select
                v-for="filter in filterDefinitions"
                :key="filter.key"
                v-model="filters[filter.key]"
                class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] font-normal text-[var(--app-text-secondary)]"
              >
                <option v-for="option in filter.options" :key="option" :value="option">{{ filter.label }}: {{ option }}</option>
              </select>
              <button class="flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[0.8125rem] font-normal text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)]" type="button" @click="resetFilters">
                <RefreshCw :size="16" /> Reset
              </button>
              <button class="flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[0.8125rem] font-normal text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)] disabled:cursor-not-allowed disabled:opacity-50" type="button" :disabled="saving" @click="saveFilters">
                <Save :size="16" /> Save Filter Logic
              </button>
            </div>
          </template>

          <template #notice>
            <div v-if="message" class="border-b border-[var(--app-border)] px-4 py-2 text-sm text-[var(--app-primary)]">{{ message }}</div>
          </template>

          <Transition name="selection-toolbar">
            <div v-if="selectedSymbols.size" class="selection-toolbar">
              <div class="selection-toolbar__summary">
                <span class="selection-toolbar__check">✓</span>
                <strong>{{ selectedSymbols.size }} ticker{{ selectedSymbols.size === 1 ? '' : 's' }} selected</strong>
                <button type="button" @click="selectedSymbols = new Set()">Clear selection</button>
              </div>
              <button class="create-watchlist-button" type="button" :disabled="saving" @click="openCreateWatchlist">
                <ListPlus :size="17" /> Create Watchlist ({{ selectedSymbols.size }})
              </button>
            </div>
          </Transition>

          <div v-if="viewMode === 'table'" class="px-4 pb-4">
            <AppDataTable
              :columns="tableColumns"
              :rows="rows"
              :loading="loading"
              :sort-key="sortKey"
              :sort-direction="sortDirection"
              empty-message="No matching assets."
              @sort="changeSort"
            >
              <template #header-select>
                <input class="selection-checkbox" type="checkbox" :checked="allVisibleSelected" aria-label="Select all visible symbols" @change="toggleVisibleSymbols" />
              </template>
              <template #cell-select="{ row }">
                <input class="selection-checkbox" type="checkbox" :checked="selectedSymbols.has(rowSymbol(row))" :aria-label="`Select ${displayTicker(row)}`" @change="toggleSymbol(row)" />
              </template>
            </AppDataTable>
          </div>

          <div v-else class="grid gap-3 p-4 md:grid-cols-2 2xl:grid-cols-3">
            <article v-for="row in rows" :key="String(row.symbol ?? row.ticker)" class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
              <div class="flex items-start justify-between gap-3">
                <div><h3 class="text-lg font-semibold text-[var(--app-text)]">{{ value(row, 'symbol') }}</h3><p class="text-xs text-[var(--app-text-muted)]">{{ value(row, 'data_date') }}</p></div>
                <input class="selection-checkbox" type="checkbox" :checked="selectedSymbols.has(rowSymbol(row))" :aria-label="`Select ${displayTicker(row)}`" @change="toggleSymbol(row)" />
              </div>
              <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div v-for="column in columns.slice(2)" :key="column.key" class="rounded-md bg-[var(--app-surface-soft)] p-3">
                  <dt class="text-xs text-[var(--app-text-muted)]">{{ column.label }}</dt><dd class="mt-1 font-semibold">{{ value(row, column.key) }}</dd>
                </div>
              </dl>
            </article>
            <p v-if="!loading && !rows.length" class="col-span-full py-12 text-center text-sm text-[var(--app-text-muted)]">No matching assets.</p>
          </div>

          <template #footer>
            <IndicatorPagination :page="page" :page-count="pageCount" :total="total" item-label="assets" @change="setPage" />
          </template>
        </ListPagePanel>

        <aside class="market-navigation rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
          <div class="mb-2 flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--app-text-muted)]"><ListFilter :size="16" /> Markets</div>
          <button
            v-for="group in groups"
            :key="group.id"
            class="mb-1 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition"
            :class="activeGroup === group.id ? 'bg-[var(--app-primary-soft)] text-[var(--app-primary)]' : 'hover:bg-[var(--app-surface-soft)]'"
            type="button"
            @click="selectGroup(group.id)"
          >
            <span class="flex h-8 w-8 shrink-0 items-center justify-center"><component :is="group.icon" :size="19" /></span>
            <span><span class="block text-sm font-semibold">{{ group.label }}</span><span class="block text-xs text-[var(--app-text-muted)]">{{ group.description }}</span></span>
          </button>
        </aside>
      </div>
    </main>

    <Teleport to="body">
      <Transition name="watchlist-modal">
        <div v-if="createWatchlistOpen" class="watchlist-modal-backdrop" @click.self="createWatchlistOpen = false">
          <section class="watchlist-modal" role="dialog" aria-modal="true" aria-labelledby="create-watchlist-title">
          <header>
            <div>
              <h2 id="create-watchlist-title">Create Watchlist</h2>
              <p>{{ selectedSymbols.size }} selected symbol{{ selectedSymbols.size === 1 ? '' : 's' }}</p>
            </div>
            <button class="modal-close" type="button" aria-label="Close" @click="createWatchlistOpen = false"><X :size="19" /></button>
          </header>

          <label class="modal-field">
            <span>Watchlist name</span>
            <input v-model="watchlistName" class="modal-input" maxlength="120" placeholder="Enter a watchlist name" />
          </label>

          <div class="modal-field">
            <span>Symbols</span>
            <div class="symbol-chips"><span v-for="symbol in selectedSymbols" :key="symbol">{{ displayStoredTicker(symbol) }}</span></div>
          </div>

          <fieldset class="modal-field">
            <legend>Columns <small>{{ watchlistColumns.length }}/10 selected</small></legend>
            <div class="column-options">
              <label v-for="option in WATCH_LIST_INDICATORS" :key="option.value" :class="{ selected: watchlistColumns.includes(option.value) }">
                <input type="checkbox" :checked="watchlistColumns.includes(option.value)" :disabled="!watchlistColumns.includes(option.value) && watchlistColumns.length >= 10" @change="toggleWatchlistColumn(option.value)" />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </fieldset>

          <p v-if="watchlistError" class="modal-error">{{ watchlistError }}</p>
          <footer>
            <button class="action-button" type="button" :disabled="saving" @click="createWatchlistOpen = false">Cancel</button>
            <button class="create-watchlist-button" type="button" :disabled="saving" @click="createWatchlist">{{ saving ? 'Creating…' : 'Create Watchlist' }}</button>
          </footer>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.action-button, .pagination-button { display: inline-flex; height: 2.25rem; align-items: center; gap: 0.4rem; border: 1px solid var(--app-border); border-radius: 6px; background: var(--app-surface); padding: 0 0.75rem; color: var(--app-text); font-size: 0.8rem; font-weight: 500; }
.action-button:hover, .pagination-button:hover { border-color: var(--app-primary); color: var(--app-primary); }
.action-button:disabled, .pagination-button:disabled { cursor: not-allowed; opacity: 0.5; }
.create-watchlist-button { display:inline-flex; height:2.25rem; align-items:center; justify-content:center; border-radius:6px; background:var(--app-primary); padding:0 .85rem; color:#fff; font-size:.8rem; font-weight:400; }
.create-watchlist-button:hover:not(:disabled) { background:var(--app-primary-hover); }
.create-watchlist-button:disabled { cursor:not-allowed; opacity:.5; }
.selection-checkbox { width:1rem; height:1rem; cursor:pointer; accent-color:var(--app-primary); }
.selection-toolbar { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin:0 1rem .75rem; border:1px solid color-mix(in srgb,var(--app-primary) 22%,var(--app-border)); border-radius:8px; background:var(--app-primary-soft); padding:.7rem .8rem; }
.selection-toolbar__summary { display:flex; align-items:center; gap:.8rem; min-width:0; font-size:.85rem; }
.selection-toolbar__summary strong { white-space:nowrap; }
.selection-toolbar__summary button { color:var(--app-primary); font-weight:400; }
.selection-toolbar__summary button:hover { text-decoration:underline; }
.selection-toolbar__check { display:flex; width:1.35rem; height:1.35rem; flex:none; align-items:center; justify-content:center; border-radius:4px; background:var(--app-primary); color:#fff; font-size:.75rem; font-weight:700; }
.selection-toolbar-enter-active, .selection-toolbar-leave-active { transition:opacity .2s ease, transform .2s ease; }
.selection-toolbar-enter-from, .selection-toolbar-leave-to { opacity:0; transform:translateY(-7px); }
.watchlist-modal-backdrop { position:fixed; inset:0; z-index:100; display:flex; align-items:center; justify-content:center; background:color-mix(in srgb,var(--app-text) 38%,transparent); padding:1.25rem; }
.watchlist-modal { width:min(680px,100%); max-height:calc(100vh - 2.5rem); overflow:auto; border:1px solid var(--app-border); border-radius:10px; background:var(--app-surface); padding:1.15rem; box-shadow:0 20px 60px color-mix(in srgb,var(--app-text) 24%,transparent); }
.watchlist-modal>header { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; border-bottom:1px solid var(--app-border-muted); padding-bottom:.9rem; }
.watchlist-modal h2 { font-size:1.15rem; font-weight:800; }
.watchlist-modal header p { margin-top:.2rem; color:var(--app-text-muted); font-size:.8rem; }
.modal-close { display:flex; width:2rem; height:2rem; align-items:center; justify-content:center; border-radius:6px; color:var(--app-text-secondary); }
.modal-close:hover { background:var(--app-surface-soft); }
.modal-field { display:block; margin-top:1rem; }
.modal-field>span, .modal-field legend { display:block; margin-bottom:.45rem; color:var(--app-text-secondary); font-size:.82rem; font-weight:700; }
.modal-field legend small { margin-left:.4rem; color:var(--app-text-muted); font-weight:500; }
.modal-input { width:100%; height:2.5rem; border:1px solid var(--app-border); border-radius:7px; background:var(--app-surface); padding:0 .75rem; color:var(--app-text); outline:none; }
.modal-input:focus { border-color:var(--app-primary); box-shadow:0 0 0 2px var(--app-primary-soft); }
.symbol-chips { display:flex; flex-wrap:wrap; gap:.4rem; }
.symbol-chips span { border-radius:5px; background:var(--app-primary-soft); padding:.35rem .55rem; color:var(--app-primary); font-size:.76rem; font-weight:700; }
.column-options { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.45rem; max-height:280px; overflow:auto; border:1px solid var(--app-border); border-radius:8px; padding:.6rem; }
.column-options label { display:flex; min-width:0; align-items:center; gap:.55rem; border-radius:6px; padding:.55rem .6rem; color:var(--app-text-secondary); font-size:.8rem; cursor:pointer; }
.column-options label:hover, .column-options label.selected { background:var(--app-primary-soft); color:var(--app-text); }
.column-options input { flex:none; accent-color:var(--app-primary); }
.modal-error { margin-top:.8rem; border:1px solid color-mix(in srgb,var(--app-negative) 35%,var(--app-border)); border-radius:6px; padding:.6rem .7rem; color:var(--app-negative); font-size:.8rem; }
.watchlist-modal>footer { display:flex; justify-content:flex-end; gap:.6rem; border-top:1px solid var(--app-border-muted); margin-top:1rem; padding-top:.9rem; }
.watchlist-modal-enter-active, .watchlist-modal-leave-active { transition:opacity .2s ease; }
.watchlist-modal-enter-active .watchlist-modal, .watchlist-modal-leave-active .watchlist-modal { transition:transform .22s ease, opacity .2s ease; }
.watchlist-modal-enter-from, .watchlist-modal-leave-to { opacity:0; }
.watchlist-modal-enter-from .watchlist-modal, .watchlist-modal-leave-to .watchlist-modal { opacity:0; transform:translateY(8px) scale(.975); }
.market-navigation { grid-row: 1; height: 100%; }
.market-results :deep(tbody td) { font-weight: 400; }
@media (min-width: 1280px) {
  .market-navigation { grid-column: 1; }
  .market-results { grid-column: 2; grid-row: 1; }
}
@media (max-width: 640px) {
  .column-options { grid-template-columns:1fr; }
  .selection-toolbar { align-items:stretch; flex-direction:column; }
  .selection-toolbar .create-watchlist-button { width:100%; }
}
</style>

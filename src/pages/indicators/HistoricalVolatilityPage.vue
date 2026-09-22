<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Cpu,
  Download,
  Globe,
  Grid3X3,
  Info,
  Landmark,
  Layers,
  RotateCcw,
  Search,
  Shapes,
  TrendingUp,
  X,
} from '@lucide/vue'
import { indicatorCsvFilename, indicatorCsvTable } from '@/entities/indicator/model/indicator.csv'
import {
  historicalVolatilityColumns,
  historicalVolatilityOptions,
  type HistoricalVolatilityOption,
  type HistoricalVolatilityOptionId,
} from '@/entities/indicator/model/indicator.historical-volatility'
import { useIndicatorStore } from '@/entities/indicator/model/indicator.store'
import type { Indicator } from '@/entities/indicator/model/indicator.types'
import type { IndicatorTableColumn } from '@/entities/indicator/model/indicator.table'
import { formatIndicatorNumber, indicatorRawValue, indicatorSortValue, parseIndicatorNumber } from '@/entities/indicator/model/indicator.values'
import { downloadCsv, toCsv } from '@/shared/utils/csv'
import { useSortedPagedRows } from './composables/useSortedPagedRows'
import IndicatorCardGrid from './ui/IndicatorCardGrid.vue'
import IndicatorPageHeader from './ui/IndicatorPageHeader.vue'
import IndicatorListTable from './ui/IndicatorListTable.vue'
import IndicatorPagination from './ui/IndicatorPagination.vue'

const route = useRoute()
const router = useRouter()
const store = useIndicatorStore()

type VolatilityTrendFilter = 'all' | 'rising' | 'falling'

const activeOptionId = ref<HistoricalVolatilityOptionId>('HistoricalSP500Score')
const searchQuery = ref('')
const sectorFilter = ref('')
const volatilityTrendFilter = ref<VolatilityTrendFilter>('all')
const descriptionOpen = ref(false)

const historicalCardPrimaryColumn: IndicatorTableColumn = {
  key: 'volatility_20d',
  label: 'Volatility 20d',
  kind: 'number',
  trimTrailingZeros: true,
  valueSuffix: '%',
}

const historicalCardSecondaryColumn: IndicatorTableColumn = {
  key: 'volatility_60d',
  label: 'Volatility 60d',
  kind: 'number',
  trimTrailingZeros: true,
  valueSuffix: '%',
}

const historicalCardFooterColumn: IndicatorTableColumn = {
  key: 'volatility_diff',
  label: 'Volatility Diff',
  kind: 'change',
  trimTrailingZeros: true,
  valueSuffix: '%',
  showChangeArrow: true,
}

const assetCardTitleColumn: IndicatorTableColumn = {
  key: 'market_symbol',
  label: 'Ticker',
  kind: 'name',
  uppercase: true,
}

const assetCardSubtitleColumns: IndicatorTableColumn[] = [
  { key: 'chart_name', label: 'Name', kind: 'text' },
  { key: 'sector_name', label: 'Sector', kind: 'text' },
]

const activeOption = computed(() => {
  return historicalVolatilityOptions.find((item) => item.id === activeOptionId.value) ?? historicalVolatilityOptions[0]
})

const requestSource = computed(() => activeOption.value.source)
const columns = computed(() => historicalVolatilityColumns(activeOption.value))
const isLoading = computed(() => Boolean(store.loadingBySource[requestSource.value]))

const sourceRows = computed(() => {
  return (store.itemsBySource[requestSource.value] ?? []).map(withVolatilityDiff)
})

const sectorOptions = computed(() => {
  const sectors = new Set<string>()
  for (const row of sourceRows.value) {
    const sector = String(indicatorRawValue(row, 'sector_name') ?? '').trim()
    if (sector && sector !== '-') sectors.add(sector)
  }
  return Array.from(sectors).sort((left, right) => left.localeCompare(right))
})

const filteredRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return sourceRows.value.filter((row) => {
    const searchable = [
      row.id,
      row.name,
      row.marketSymbol,
      indicatorRawValue(row, 'market_symbol'),
      indicatorRawValue(row, 'sector_name'),
      indicatorRawValue(row, 'chart_name'),
    ]
      .map((value) => String(value ?? '').toLowerCase())
      .join(' ')

    const rowSector = String(indicatorRawValue(row, 'sector_name') ?? '')
    const diff = parseIndicatorNumber(indicatorRawValue(row, 'volatility_diff'))
    const matchesVolatilityTrend =
      volatilityTrendFilter.value === 'all'
      || (volatilityTrendFilter.value === 'rising' && diff !== null && diff > 0)
      || (volatilityTrendFilter.value === 'falling' && diff !== null && diff < 0)

    return (
      (!query || searchable.includes(query))
      && (!sectorFilter.value || rowSector === sectorFilter.value)
      && matchesVolatilityTrend
    )
  })
})

const table = useSortedPagedRows(filteredRows, indicatorSortValue)

const latestUpdateDate = computed(() => {
  const dated = sourceRows.value
    .map((row) => String(indicatorRawValue(row, 'last_update') ?? '').slice(0, 10))
    .filter(Boolean)
    .sort()
  return dated.at(-1) ?? ''
})

const currentTitle = computed(() => {
  const date = latestUpdateDate.value
  return date ? `${activeOption.value.label} (${date})` : activeOption.value.label
})

const currentDescription = computed(() => {
  return 'Browse 20-day and 60-day historical volatility with the same table, sorting, filtering, and export behaviour as the Indicators page.'
})

const average20Day = computed(() => averageRawValue(filteredRows.value, 'volatility_20d'))
const average60Day = computed(() => averageRawValue(filteredRows.value, 'volatility_60d'))

function formatHistoricalPercent(value: unknown) {
  const formatted = formatIndicatorNumber(value)
  return formatted === '—' ? formatted : `${formatted}%`
}

function averageRawValue(rows: Indicator[], key: string) {
  const values = rows
    .map((row) => parseIndicatorNumber(indicatorRawValue(row, key)))
    .filter((value): value is number => value !== null)
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function volatilityDiff(row: Indicator) {
  const volatility20d = parseIndicatorNumber(indicatorRawValue(row, 'volatility_20d'))
  const volatility60d = parseIndicatorNumber(indicatorRawValue(row, 'volatility_60d'))
  return volatility20d === null || volatility60d === null ? null : volatility20d - volatility60d
}

function withVolatilityDiff(row: Indicator): Indicator {
  return {
    ...row,
    raw: {
      ...row.raw,
      volatility_diff: volatilityDiff(row),
    },
  }
}

function optionIcon(option: HistoricalVolatilityOption) {
  if (option.id === 'HistoricalSP500Score') return TrendingUp
  if (option.id === 'HistoricalSP1500Score') return Layers
  if (option.id === 'HistoricalNDX100Score') return Cpu
  if (option.id === 'HistoricalRussellScore') return Grid3X3
  if (option.id === 'HistoricalDomesticETFScore') return Landmark
  if (option.id === 'HistoricalForeignETFScore') return Globe
  return Shapes
}

function optionFromQuery(value: unknown) {
  if (typeof value !== 'string') return null
  return historicalVolatilityOptions.find((item) => item.id === value || item.source === value) ?? null
}

function syncRouteState() {
  const queried = optionFromQuery(route.query.source ?? route.query.list)
  if (queried) activeOptionId.value = queried.id
}

function selectOption(option: HistoricalVolatilityOption) {
  activeOptionId.value = option.id
  void router.replace({ path: '/historical', query: { source: option.id } })
}

function resetFilters() {
  searchQuery.value = ''
  sectorFilter.value = ''
  volatilityTrendFilter.value = 'all'
  table.reset()
}

function openIndicator(indicator: Indicator) {
  void router.push({
    name: 'historical-volatility-detail',
    params: { id: indicator.id },
    state: {
      historicalBackQuery: { ...route.query },
      historicalListLabel: activeOption.value.label,
      historicalSource: requestSource.value,
    },
  })
}

function handleSort(column: IndicatorTableColumn) {
  table.sort(column)
}

function downloadListCsv() {
  const { headers, rows } = indicatorCsvTable(table.sortedRows.value, columns.value)
  if (!rows.length) return

  const isoDate = new Date().toISOString().slice(0, 10)
  downloadCsv(indicatorCsvFilename(`Historical Volatility ${activeOption.value.label}`, isoDate), toCsv(headers, rows))
}

watch(
  () => [route.query.source, route.query.list],
  syncRouteState,
  { immediate: true },
)

watch(
  () => route.query.indicator,
  (indicator) => {
    if (typeof indicator === 'string' && indicator) {
      void router.replace({ name: 'historical-volatility-detail', params: { id: indicator } })
    }
  },
  { immediate: true },
)

watch(
  () => activeOptionId.value,
  () => {
    searchQuery.value = ''
    sectorFilter.value = ''
    volatilityTrendFilter.value = 'all'
    table.reset()
  },
)

watch(
  () => [searchQuery.value, sectorFilter.value, volatilityTrendFilter.value],
  () => {
    table.setPage(1)
  },
)

watch(
  requestSource,
  (source) => {
    if (!source) return
    void store.ensureList(source)
  },
  { immediate: true },
)

watch(
  () => table.pagedRows.value.map((indicator) => indicator.id).join('|'),
  () => {
    void store.ensureTrendsForIndicators(table.pagedRows.value)
  },
  { immediate: true },
)
</script>

<template>
  <div class="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
    <main class="px-[var(--page-gutter)] pb-8 pt-8">
      <IndicatorPageHeader
        title="Historical Volatility"
        description="Rank stocks and ETFs by 20-day and 60-day realized volatility."
        :view-mode="store.viewMode"
        @update:view-mode="store.setViewMode"
      />

      <div class="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
          <button
            v-for="option in historicalVolatilityOptions"
            :key="option.id"
            class="mb-1 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition"
            :class="activeOption.id === option.id ? 'bg-[var(--app-primary-soft)] text-[var(--app-text)]' : 'text-[var(--app-text)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-primary)]'"
            type="button"
            @click="selectOption(option)"
          >
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
              :class="activeOption.id === option.id ? 'text-[var(--app-primary)]' : 'text-[var(--app-text-secondary)]'"
            >
              <component :is="optionIcon(option)" :size="21" />
            </span>
            <span class="min-w-0">
              <span class="block text-sm font-semibold leading-5">{{ option.label }}</span>
            </span>
          </button>
        </aside>

        <section class="min-w-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]">
          <header class="flex flex-col gap-3 border-b border-[var(--app-border)] px-4 py-4 xl:flex-row xl:items-start xl:justify-between">
            <div class="min-w-0">
              <div class="flex min-w-0 flex-wrap items-center gap-2">
                <h2 class="text-3xl font-semibold leading-tight text-[var(--app-text)]">{{ currentTitle }}</h2>
                <button
                  class="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--app-border-strong)] bg-[var(--app-surface-muted)] px-2.5 text-xs font-semibold text-[var(--app-text-secondary)] hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]"
                  type="button"
                  @click="descriptionOpen = true"
                >
                  <Info :size="15" />
                  Description
                </button>
              </div>
              <p class="mt-1 text-sm text-[var(--app-text-muted)]">{{ currentDescription }}</p>
            </div>

            <div class="flex shrink-0 flex-wrap items-center gap-2 text-xs font-semibold">
              <span class="indicator-summary-pill">
                <span class="indicator-summary-pill__text">
                  <span class="indicator-summary-pill__value">{{ table.sortedRows.value.length }}</span>
                  <span class="indicator-summary-pill__label"> Assets</span>
                </span>
              </span>
              <span class="indicator-summary-pill">
                <span class="indicator-summary-pill__text">
                  <span class="indicator-summary-pill__value">{{ formatHistoricalPercent(average20Day) }}</span>
                  <span class="indicator-summary-pill__label"> Avg 20d</span>
                </span>
              </span>
              <span class="indicator-summary-pill">
                <span class="indicator-summary-pill__text">
                  <span class="indicator-summary-pill__value">{{ formatHistoricalPercent(average60Day) }}</span>
                  <span class="indicator-summary-pill__label"> Avg 60d</span>
                </span>
              </span>
            </div>
          </header>

          <div class="grid gap-2 px-4 py-3 xl:grid-cols-[minmax(220px,1.5fr)_minmax(150px,0.65fr)_minmax(170px,0.75fr)_auto_auto]">
            <label class="flex h-9 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5">
              <Search :size="16" class="mr-2 shrink-0 text-[var(--app-text-muted)]" />
              <input v-model="searchQuery" class="w-full bg-transparent text-[0.8125rem] outline-none" placeholder="Search symbol, name or sector..." />
            </label>
            <select
              v-model="sectorFilter"
              class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]"
              :disabled="!sectorOptions.length"
            >
              <option value="">All Sectors</option>
              <option v-for="sector in sectorOptions" :key="sector" :value="sector">{{ sector }}</option>
            </select>
            <select
              v-model="volatilityTrendFilter"
              class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]"
              aria-label="Filter by volatility direction"
            >
              <option value="all">All Volatility</option>
              <option value="rising">Rising Volatility</option>
              <option value="falling">Falling Volatility</option>
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
              @click="downloadListCsv"
            >
              <Download :size="16" />
              CSV
            </button>
          </div>

          <div class="px-4 pb-4 pt-4">
            <IndicatorListTable
              v-if="store.viewMode === 'table'"
              :indicators="table.pagedRows.value"
              :loading="isLoading"
              :columns="columns"
              :show-favorite="false"
              :sort-key="table.sortKey.value"
              :sort-direction="table.sortDirection.value"
              compact
              @open="openIndicator"
              @sort="handleSort"
            />
            <IndicatorCardGrid
              v-else
              :indicators="table.pagedRows.value"
              :loading="isLoading"
              :columns="columns"
              :show-favorite="false"
              :primary-metric-column="historicalCardPrimaryColumn"
              primary-metric-label="Volatility 20d"
              :secondary-metric-column="historicalCardSecondaryColumn"
              secondary-metric-label="Volatility 60d"
              :title-column="assetCardTitleColumn"
              :subtitle-columns="assetCardSubtitleColumns"
              :show-updated="false"
              :footer-metric-column="historicalCardFooterColumn"
              @open="openIndicator"
            />
          </div>

          <div class="border-t border-[var(--app-border)] px-4 py-3">
            <IndicatorPagination
              :page="table.page.value"
              :page-count="table.pageCount.value"
              :total="table.sortedRows.value.length"
              item-label="assets"
              @change="table.setPage"
            />
          </div>
        </section>
      </div>

      <Teleport to="body">
        <div
          v-if="descriptionOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-overlay)] px-4 py-6"
          @click.self="descriptionOpen = false"
        >
          <section
            class="max-h-[86vh] w-full max-w-2xl overflow-hidden rounded-lg bg-[var(--app-surface)] text-[var(--app-text)] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="historical-description-title"
          >
            <header class="flex items-start justify-between gap-4 border-b border-[var(--app-border)] px-5 py-4">
              <div>
                <p class="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">{{ activeOption.label }}</p>
                <h2 id="historical-description-title" class="mt-1 text-xl text-[var(--app-text)]">
                  Historical Volatility Description
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
              <div class="historical-description space-y-3">
                <p><b>20-Day and 60-Day Historical Volatility</b> measures price dispersion over a 20-Day and 60-Day window.</p>
                <p><b>What High/Low Volatility Means:</b></p>
                <ul>
                  <li><b>High Volatility:</b> Indicates large price swings, reflecting uncertainty or intense market emotion.</li>
                  <li><b>Low Volatility:</b> Indicates stable price action and market complacency.</li>
                </ul>
                <p><b>Calculation:</b> StdDev(ln(Pt/Pt-1), window) &times; &radic;252 &times; 100.</p>
                <p>
                  <b>Use Case:</b> Compare this value to the S&amp;P 500 (SPX) volatility. If the ratio (Relative Volatility) is &gt; 2.0, the stock is experiencing abnormal risk levels compared to the broad market.
                </p>
              </div>
            </div>
          </section>
        </div>
      </Teleport>
    </main>
  </div>
</template>

<style scoped>
.selected-fill-button {
  color: #ffffff !important;
}

.historical-description ul {
  list-style: disc;
  padding-left: 1.25rem;
}

.historical-description li {
  margin-top: 0.25rem;
}
</style>

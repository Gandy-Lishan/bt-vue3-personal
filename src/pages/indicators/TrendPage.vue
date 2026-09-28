<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BarChart3,
  ChartPie,
  Coins,
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
  Star,
  TrendingUp,
  X,
} from '@lucide/vue'
import { indicatorCsvFilename, indicatorCsvTable } from '@/entities/indicator/model/indicator.csv'
import { useIndicatorStore } from '@/entities/indicator/model/indicator.store'
import {
  requestSourceForTrendScore,
  trendScoreColumns,
  trendScoreOptions,
  type TrendScoreCondition,
  type TrendScoreOption,
  type TrendScoreOptionId,
} from '@/entities/indicator/model/indicator.trend-table'
import { indicatorRawValue, indicatorSortValue } from '@/entities/indicator/model/indicator.values'
import type { Indicator } from '@/entities/indicator/model/indicator.types'
import type { IndicatorTableColumn } from '@/entities/indicator/model/indicator.table'
import { downloadCsv, toCsv } from '@/shared/utils/csv'
import ListPagePanel from '@/shared/ui/ListPagePanel.vue'
import { useSortedPagedRows } from './composables/useSortedPagedRows'
import IndicatorCardGrid from './ui/IndicatorCardGrid.vue'
import IndicatorPageHeader from './ui/IndicatorPageHeader.vue'
import IndicatorListTable from './ui/IndicatorListTable.vue'
import IndicatorPagination from './ui/IndicatorPagination.vue'
import SectorTrendSummaryTable from './ui/SectorTrendSummaryTable.vue'

const route = useRoute()
const router = useRouter()
const store = useIndicatorStore()

const activeOptionId = ref<TrendScoreOptionId>('SP500Score')
const condition = ref<TrendScoreCondition>('')
const searchQuery = ref('')
const sectorFilter = ref('')
const descriptionOpen = ref(false)

const conditionOptions: Array<{ id: Exclude<TrendScoreCondition, ''>; label: string }> = [
  { id: 'trend', label: 'Trend Conditions' },
  { id: 'relative', label: 'Relative Trend Conditions' },
  { id: 'consecutive', label: 'Other Trend Indicators' },
  { id: 'rangeRank', label: 'Relative Strength Ratio Range Rank' },
]

const trendCardPrimaryColumn: IndicatorTableColumn = {
  key: 'trend_last_value',
  label: 'Trend Score',
  kind: 'number',
  decimals: 0,
}

const trendCardSecondaryColumn: IndicatorTableColumn = {
  key: 'reltrend_last_value',
  label: 'Relative Score',
  kind: 'number',
  decimals: 0,
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

const routeIndex = computed(() => (typeof route.query.index === 'string' ? route.query.index : ''))

const dynamicSectorOption = computed<TrendScoreOption | null>(() => {
  if (!routeIndex.value) return null
  return {
    id: 'SectorTrendRelTrend',
    label: `Sector Trend: ${routeIndex.value}`,
    source: `sector_trend_reltrend?index=${encodeURIComponent(routeIndex.value)}`,
    includeSector: true,
    dynamic: true,
  }
})

const options = computed(() => {
  const dynamic = dynamicSectorOption.value
  return dynamic ? [...trendScoreOptions, dynamic] : trendScoreOptions
})

const favoriteOption = computed(() => options.value.find((item) => item.id === 'WatchList') ?? null)
const sidebarOptions = computed(() => options.value.filter((item) => item.id !== 'WatchList'))

const activeOption = computed(() => {
  return options.value.find((item) => item.id === activeOptionId.value) ?? trendScoreOptions[0]
})

const requestSource = computed(() => requestSourceForTrendScore(activeOption.value.source, condition.value))
const isSummary = computed(() => Boolean(activeOption.value.summary))
const showConditionButtons = computed(() => !isSummary.value && activeOption.value.id !== 'WatchList')
const columns = computed(() => trendScoreColumns(activeOption.value, condition.value))
const isLoading = computed(() => Boolean(store.loadingBySource[requestSource.value]))
const currentTitle = computed(() => {
  const date = latestUpdateDate.value
  return date && !isSummary.value ? `${activeOption.value.label} (${date})` : activeOption.value.label
})
const currentDescription = computed(() => {
  if (isSummary.value) {
    return 'S&P 500 sector summary for absolute trend scores, relative trend scores, and relative strength range ranks.'
  }
  if (activeOption.value.id === 'WatchList') return 'Your saved tickers ranked by current trend and relative trend scores.'
  return 'Browse absolute and relative trend scores with the same table, sorting, filtering, and export behaviour as the Indicators page.'
})

const sourceRows = computed(() => {
  if (isSummary.value) return []
  return store.itemsBySource[requestSource.value] ?? []
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
    return (!query || searchable.includes(query)) && (!sectorFilter.value || rowSector === sectorFilter.value)
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

const strongTrendCount = computed(() => {
  return filteredRows.value.filter((row) => Number(indicatorRawValue(row, 'trend_last_value')) >= 8).length
})

const weakTrendCount = computed(() => {
  return filteredRows.value.filter((row) => Number(indicatorRawValue(row, 'trend_last_value')) <= 2).length
})

function optionIcon(option: TrendScoreOption) {
  if (option.id === 'WatchList') return Star
  if (option.id === 'SP500Score') return TrendingUp
  if (option.id === 'SP1500Score') return Layers
  if (option.id === 'NDX100Score') return Cpu
  if (option.id === 'RussellScore') return Grid3X3
  if (option.id === 'DomesticETFScore') return Landmark
  if (option.id === 'ForeignETFScore') return Globe
  if (option.id === 'OtherAssetsETFScore') return Shapes
  if (option.id === 'CRPScore') return Coins
  if (option.summary) return ChartPie
  return BarChart3
}

function optionFromQuery(value: unknown) {
  if (typeof value !== 'string') return null
  return options.value.find((item) => item.id === value || item.source === value) ?? null
}

function syncRouteState() {
  if (route.path === '/sector_trend_score' && dynamicSectorOption.value) {
    activeOptionId.value = 'SectorTrendRelTrend'
    return
  }

  if (route.query.enlarge === 'TrendSector') {
    activeOptionId.value = 'TrendSector'
    return
  }

  const queried = optionFromQuery(route.query.source ?? route.query.list)
  if (queried) activeOptionId.value = queried.id
}

function selectOption(option: TrendScoreOption) {
  activeOptionId.value = option.id
  if (option.dynamic && routeIndex.value) {
    void router.replace({ path: '/sector_trend_score', query: { index: routeIndex.value } })
    return
  }
  const query = option.id === 'TrendSector' ? { enlarge: 'TrendSector' } : { source: option.id }
  void router.replace({ path: '/trend_score', query })
}

function toggleCondition(next: Exclude<TrendScoreCondition, ''>) {
  condition.value = condition.value === next ? '' : next
  table.reset()
}

function resetFilters() {
  searchQuery.value = ''
  sectorFilter.value = ''
  condition.value = ''
  table.reset()
}

function openIndicator(indicator: Indicator) {
  void router.push({
    name: 'trend-score-detail',
    params: { id: indicator.id },
    state: {
      trendBackQuery: { ...route.query },
      trendListLabel: activeOption.value.label,
      trendSource: requestSource.value,
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
  downloadCsv(indicatorCsvFilename(activeOption.value.label, isoDate), toCsv(headers, rows))
}

watch(
  () => [route.path, route.query.enlarge, route.query.source, route.query.list, route.query.index],
  syncRouteState,
  { immediate: true },
)

watch(
  () => route.query.indicator,
  (indicator) => {
    if (typeof indicator === 'string' && indicator) {
      void router.replace({ name: 'trend-score-detail', params: { id: indicator } })
    }
  },
  { immediate: true },
)

watch(
  () => activeOptionId.value,
  () => {
    searchQuery.value = ''
    sectorFilter.value = ''
    condition.value = ''
    table.reset()
  },
)

watch(
  () => [searchQuery.value, sectorFilter.value],
  () => {
    table.setPage(1)
  },
)

watch(
  requestSource,
  (source) => {
    if (!source || isSummary.value) return
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
        title="Trend Score"
        description="Rank stocks, ETFs, crypto and other assets by absolute and relative trend strength."
        :view-mode="store.viewMode"
        :show-view-mode-toggle="!isSummary"
        @update:view-mode="store.setViewMode"
      />

      <div class="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
          <button
            v-if="favoriteOption"
            class="mb-1 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition"
            :class="activeOption.id === favoriteOption.id ? 'bg-[var(--app-primary-soft)] text-[var(--app-text)]' : 'text-[var(--app-text)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-primary)]'"
            type="button"
            @click="selectOption(favoriteOption)"
          >
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--app-favorite)]">
              <component :is="optionIcon(favoriteOption)" :size="21" fill="var(--app-favorite)" />
            </span>
            <span class="min-w-0">
              <span class="block text-sm font-semibold leading-5">{{ favoriteOption.label }}</span>
            </span>
          </button>

          <div class="my-3 border-t border-[var(--app-border-muted)]" />

          <button
            v-for="option in sidebarOptions"
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

        <ListPagePanel :title="currentTitle" :description="currentDescription">
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
              <template v-if="!isSummary">
                <span class="indicator-summary-pill">
                  <span class="indicator-summary-pill__dot bg-emerald-500" />
                  <span class="indicator-summary-pill__text">
                    <span class="indicator-summary-pill__value">{{ strongTrendCount }}</span>
                    <span class="indicator-summary-pill__label"> strong</span>
                  </span>
                </span>
                <span class="indicator-summary-pill">
                  <span class="indicator-summary-pill__dot bg-rose-500" />
                  <span class="indicator-summary-pill__text">
                    <span class="indicator-summary-pill__value">{{ weakTrendCount }}</span>
                    <span class="indicator-summary-pill__label"> weak</span>
                  </span>
                </span>
                <span class="indicator-summary-pill">
                  <span class="indicator-summary-pill__text">
                    <span class="indicator-summary-pill__value">{{ table.sortedRows.value.length }}</span>
                    <span class="indicator-summary-pill__label"> Assets</span>
                  </span>
                </span>
              </template>
              <span v-else class="indicator-summary-pill">
                <span class="indicator-summary-pill__text">
                  <span class="indicator-summary-pill__value">S&P 500</span>
                  <span class="indicator-summary-pill__label"> Sector Summary</span>
                </span>
              </span>
          </template>

          <template v-if="!isSummary" #filters>
            <div class="grid gap-2 px-4 py-3 xl:grid-cols-[minmax(260px,1.7fr)_minmax(160px,0.75fr)_auto_auto]">
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
          </template>

          <template v-if="!isSummary" #notice>
            <div v-if="showConditionButtons" class="flex flex-wrap gap-2 border-b border-[var(--app-border)] px-4 pb-3">
              <button
                v-for="item in conditionOptions"
                :key="item.id"
                class="h-8 rounded-md border px-3 text-xs font-semibold transition"
                :class="condition === item.id ? 'border-[var(--app-primary)] bg-[var(--app-primary)] text-white' : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-secondary)] hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)]'"
                type="button"
                @click="toggleCondition(item.id)"
              >
                {{ item.label }}
              </button>
            </div>
          </template>

          <div v-if="isSummary" class="px-4 py-4">
            <SectorTrendSummaryTable embedded />
          </div>

          <div v-else class="px-4 pb-4 pt-4">
            <IndicatorListTable
              v-if="store.viewMode === 'table'"
              :indicators="table.pagedRows.value"
              :loading="isLoading"
              :columns="columns"
              :sort-key="table.sortKey.value"
              :sort-direction="table.sortDirection.value"
              compact
              @open="openIndicator"
              @favorite="store.toggleFavorite"
              @sort="handleSort"
            />
            <IndicatorCardGrid
              v-else
              :indicators="table.pagedRows.value"
              :loading="isLoading"
              :columns="columns"
              :primary-metric-column="trendCardPrimaryColumn"
              primary-metric-label="Trend Score"
              :secondary-metric-column="trendCardSecondaryColumn"
              secondary-metric-label="Relative Score"
              :title-column="assetCardTitleColumn"
              :subtitle-columns="assetCardSubtitleColumns"
              :show-sentiment="false"
              :show-updated="false"
              @open="openIndicator"
              @favorite="store.toggleFavorite"
            />
          </div>

          <template v-if="!isSummary" #footer>
            <IndicatorPagination
              :page="table.page.value"
              :page-count="table.pageCount.value"
              :total="table.sortedRows.value.length"
              item-label="trend scores"
              @change="table.setPage"
            />
          </template>
        </ListPagePanel>
      </div>

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
            aria-labelledby="trend-description-title"
          >
            <header class="flex items-start justify-between gap-4 border-b border-[var(--app-border)] px-5 py-4">
              <div>
                <p class="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">{{ activeOption.label }}</p>
                <h2 id="trend-description-title" class="mt-1 text-xl text-[var(--app-text)]">
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
              <div class="trend-description page-content-wrapper space-y-3">
                <p>
                  The <b>Absolute</b> and <b>Relative Trend Score Indicators</b> use a weight of the evidence framework by aggregating ten trend-following indicators to deliver a comprehensive composite score for trend evaluation. Scores range from 0 (weakest) to 10 (strongest).
                </p>
                <p>
                  Although the components and duration parameters remain fixed, the indicators provide investors with flexible options for identifying trading or investing opportunities and controlling risk. Additionally, the composites can serve as a secondary filter for your existing technical or fundamental investment approaches, ensuring your strategies align with current market trends.
                </p>
                <ul>
                  <li>The Absolute Trend Score evaluates the strength of an asset’s individual trend</li>
                  <li>The Relative Trend Score gauges the strength of an asset's trend in comparison to the S&P 500, offering a view of its performance against the broader market</li>
                </ul>
                <p>
                  Updated daily by 6 PM EST, this dashboard allows users to search and rank stocks, ETFs, and other assets based on trend scores and week-over-week changes. This powerful feature helps you see which assets are strengthening or weakening, supporting more informed investment choices from a single view.
                </p>
                <p>
                  With the <b>S&P 500 Sector Trend Scores Summary</b>, users get a comprehensive view of absolute and relative trend scores across sectors, highlighting leading and lagging groups. The table reflects the percentage of stocks in each sector with trend scores in key ranges—0 (weakest), over 5 (above average), and 10 (strongest)—on both an absolute and relative basis. This summary effectively monitors sector trends, offering insights into market leadership.
                </p>
                <h3>Composite Trend Model Scoring Methodology</h3>
                <p>0 (Weakest) to 10 (Strongest)</p>
                <table class="threshold-table description-table" style="width: 100%">
                  <tr style="text-align: left">
                    <th style="width: 50%">Trend Score Conditions</th>
                    <th style="width: 50%">Relative Trend Score Conditions</th>
                  </tr>
                  <tbody>
                    <tr class="even">
                      <td>Close &gt; 50-Day Average = +1</td>
                      <td>Ratio &gt; 50-Day Average Ratio = +1</td>
                    </tr>
                    <tr>
                      <td>Close &gt; 100-Day Average = +1</td>
                      <td>Ratio &gt; 100-Day Average Ratio = +1</td>
                    </tr>
                    <tr class="even">
                      <td>Close &gt; 200-Day Average = +1</td>
                      <td>Ratio &gt; 200-Day Average Ratio = +1</td>
                    </tr>
                    <tr>
                      <td>50-Day Average Rising = +1</td>
                      <td>50-Day Average Ratio Rising = +1</td>
                    </tr>
                    <tr class="even">
                      <td>100-Day Average Rising = +1</td>
                      <td>100-Day Average Ratio Rising = +1</td>
                    </tr>
                    <tr>
                      <td>200-Day Average Rising = +1</td>
                      <td>200-Day Average Ratio Rising = +1</td>
                    </tr>
                    <tr class="even">
                      <td>50-Day Average &gt; 100-Day Average = +1</td>
                      <td>50-Day Average Ratio &gt; 100-Day Average Ratio = +1</td>
                    </tr>
                    <tr>
                      <td>50-Day Average &gt; 200-Day Average = +1</td>
                      <td>50-Day Average Ratio &gt; 200-Day Average Ratio = +1</td>
                    </tr>
                    <tr class="even">
                      <td>100-Day Average &gt; 200-Day Average = +1</td>
                      <td>100-Day Average Ratio &gt; 200-Day Average Ratio = +1</td>
                    </tr>
                    <tr>
                      <td>Close above 63-Day High +1 until Close Below 63-Day Low</td>
                      <td>Ratio above 63-Day High Ratio +1 until Ratio Below 63-Day Low Ratio</td>
                    </tr>
                  </tbody>
                </table>
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

.trend-description h3 {
  margin-top: 1rem;
  color: var(--app-text);
  font-size: 1rem;
  font-weight: 700;
}

.trend-description ul {
  list-style: disc;
  padding-left: 1.25rem;
}

.trend-description li {
  margin-top: 0.25rem;
}

.description-table {
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-collapse: collapse;
  border-radius: 6px;
  color: var(--app-text-secondary);
}

.description-table th,
.description-table td {
  border: 1px solid var(--app-border-muted);
  padding: 0.5rem 0.65rem;
  vertical-align: top;
}

.description-table th {
  background: var(--app-surface-muted);
  color: var(--app-text);
  font-weight: 700;
}

.description-table tr.even td {
  background: var(--app-row-even);
}
</style>

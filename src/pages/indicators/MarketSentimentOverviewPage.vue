<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, Grid2X2, List, RotateCcw, Search } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { fetchIndicatorTrends } from '@/entities/indicator/api/indicator.api'
import { normalizeIndicatorRows } from '@/entities/indicator/model/indicator.adapter'
import type { IndicatorTrendMap } from '@/entities/indicator/model/indicator.trends'
import { indicatorSortValue } from '@/entities/indicator/model/indicator.values'
import type { Indicator, IndicatorRawRow, IndicatorSortDirection, IndicatorViewMode } from '@/entities/indicator/model/indicator.types'
import type { IndicatorTableColumn } from '@/entities/indicator/model/indicator.table'
import { fetchClassicDashboard, type MetricRow } from '@/pages/dashboard/dashboard.api'
import IndicatorCardGrid from './ui/IndicatorCardGrid.vue'
import IndicatorListTable from './ui/IndicatorListTable.vue'

const router = useRouter()
const rows = ref<Indicator[]>([])
const loading = ref(false)
const loadError = ref(false)
const searchQuery = ref('')
const viewMode = ref<IndicatorViewMode>('table')
const sortKey = ref('')
const sortDirection = ref<IndicatorSortDirection>('asc')
let controller: AbortController | null = null

const columns: IndicatorTableColumn[] = [
  { key: 'chart_name', label: 'Market', kind: 'name', minWidth: 360 },
  { key: 'last_value', label: 'Close', kind: 'number', minWidth: 130, decimals: 2, trimTrailingZeros: true },
  { key: 'closeSentiment', label: 'Optix Value', kind: 'number', minWidth: 130, decimals: 2, trimTrailingZeros: true },
  { key: 'sentiment', label: 'Sentiment', kind: 'sentiment', minWidth: 180 },
  { key: 'last_update', label: 'Date', kind: 'date', rawDate: true, rawDateOnly: true, minWidth: 140 },
]

function value(row: MetricRow, ...keys: string[]): unknown {
  for (const key of keys) if (row[key] !== null && row[key] !== undefined && row[key] !== '') return row[key]
  return null
}

function scalar(input: unknown): string | number | null {
  if (typeof input === 'number' || typeof input === 'string') return input
  return null
}

function marketRow(row: MetricRow, index: number): IndicatorRawRow {
  const name = String(value(row, 'chart_name', 'name', 'market', 'symbol') ?? `Market ${index + 1}`)
  const optix = value(row, 'closeSentiment', 'optix', 'sentiment', 'value')
  return {
    ...row,
    url: String(value(row, 'url', 'chart_url', 'chart_id', 'symbol') ?? `market-${index + 1}`),
    chart_name: name,
    groups: String(value(row, 'groups', 'group', 'asset_class') ?? 'Cross-Market'),
    sub_type: String(value(row, 'sub_type', 'category', 'asset_class') ?? 'Major Markets'),
    last_value: scalar(value(row, 'close', 'last_value')),
    last_change: scalar(value(row, 'last_change', 'change', 'daily_change')),
    last_update: String(value(row, 'data_date', 'date', 'last_update') ?? ''),
    sentiment: scalar(optix),
    closeSentiment: optix,
    source_list: 'market_overview_data',
  }
}

const filteredRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const filtered = !query ? rows.value : rows.value.filter(row => [
    row.name, row.group, row.subgroup, row.marketSymbol, row.id,
  ].some(item => String(item ?? '').toLowerCase().includes(query)))
  if (!sortKey.value) return filtered
  const column = columns.find(item => item.key === sortKey.value)
  if (!column) return filtered
  return [...filtered].sort((left, right) => {
    const a = indicatorSortValue(left, column.key, column.kind) ?? ''
    const b = indicatorSortValue(right, column.key, column.kind) ?? ''
    const result = a < b ? -1 : a > b ? 1 : 0
    return sortDirection.value === 'asc' ? result : -result
  })
})

function setSort(column: IndicatorTableColumn) {
  if (sortKey.value === column.key) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = column.key; sortDirection.value = 'asc' }
}

function handleSortSelect(event: Event) {
  const [key, direction] = (event.target as HTMLSelectElement).value.split(':')
  sortKey.value = key ?? ''
  sortDirection.value = direction === 'desc' ? 'desc' : 'asc'
}

function resetControls() {
  searchQuery.value = ''
  sortKey.value = ''
  sortDirection.value = 'asc'
}

function openIndicator(indicator: Indicator) {
  void router.push({ name: 'indicator-detail', params: { id: indicator.id }, query: { list: indicator.sourceList } })
}

async function load() {
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  loadError.value = false
  try {
    const dashboard = await fetchClassicDashboard(controller.signal)
    const normalized = normalizeIndicatorRows(dashboard.market_overview_data.map(marketRow), 'stock_complete_list')
    const trendKeys = normalized.map(row => row.id).filter(key => !key.startsWith('market-'))
    const trends: IndicatorTrendMap = trendKeys.length
      ? await fetchIndicatorTrends(trendKeys, controller.signal).catch(() => ({}))
      : {}
    rows.value = normalized.map(row => ({
      ...row,
      trendLines: trends[row.id]?.length ? trends[row.id] : row.trendLines,
    }))
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) loadError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <main class="min-h-screen bg-[var(--app-bg)] px-[var(--page-gutter)] pb-10 pt-8 text-[var(--app-text)]">
    <div class="mx-auto max-w-[1500px]">
      <RouterLink class="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--app-primary)] hover:underline" to="/">
        <ArrowLeft :size="16" /> Back to Classic Dashboard
      </RouterLink>

      <section class="overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]">
        <header class="flex flex-col gap-4 border-b border-[var(--app-border)] px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0 max-w-5xl">
            <h1 class="text-3xl font-semibold leading-tight">Market Sentiment Overview</h1>
            <p class="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">This page provides an overview of our main Optimism Index (Optix) Indicators covering the major markets, commodities, and currencies.</p>
            <p class="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">Each market in the table is accompanied by a "dot". That dot shows the current level of Sentiment for that market relative to its recent range. "Extremely Pessimistic" (the far left, darkest green) means the indicator is showing that investors have likely already sold and that market should rise; "Extremely Optimistic" (the far right, darkest red), on the other hand, means that Sentiment is suggesting investors are too confident and that market may fall going forward. The more extreme the indicator, the stronger the contrary signal.</p>
          </div>
          <div class="inline-flex shrink-0 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-1" aria-label="View mode">
            <button type="button" class="inline-flex h-8 items-center gap-1.5 rounded px-3 text-sm font-semibold" :class="viewMode === 'table' ? 'bg-[var(--app-primary)] text-white' : 'text-[var(--app-text-secondary)]'" @click="viewMode = 'table'"><List :size="16"/> List</button>
            <button type="button" class="inline-flex h-8 items-center gap-1.5 rounded px-3 text-sm font-semibold" :class="viewMode === 'cards' ? 'bg-[var(--app-primary)] text-white' : 'text-[var(--app-text-secondary)]'" @click="viewMode = 'cards'"><Grid2X2 :size="16"/> Cards</button>
          </div>
        </header>

        <div class="grid gap-2 border-b border-[var(--app-border-muted)] px-4 py-3 md:grid-cols-[minmax(260px,1fr)_minmax(220px,auto)_auto]">
          <label class="flex h-10 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3">
            <Search :size="16" class="mr-2 shrink-0 text-[var(--app-text-muted)]" />
            <input v-model="searchQuery" class="w-full bg-transparent text-sm outline-none" placeholder="Search markets..." />
          </label>
          <select class="h-10 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text-secondary)]" :value="sortKey ? `${sortKey}:${sortDirection}` : ''" @change="handleSortSelect">
            <option value="">Sort by: Default</option>
            <option value="chart_name:asc">Market: A to Z</option>
            <option value="chart_name:desc">Market: Z to A</option>
            <option value="last_value:asc">Close: Low to High</option>
            <option value="last_value:desc">Close: High to Low</option>
            <option value="closeSentiment:asc">Optix Value: Low to High</option>
            <option value="closeSentiment:desc">Optix Value: High to Low</option>
            <option value="last_update:desc">Date: Newest First</option>
            <option value="last_update:asc">Date: Oldest First</option>
          </select>
          <button type="button" class="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] px-3 text-sm text-[var(--app-text-secondary)] hover:border-[var(--app-primary)] hover:text-[var(--app-primary)]" @click="resetControls"><RotateCcw :size="16"/> Reset</button>
        </div>

        <p v-if="loadError" class="m-4 rounded-md border border-[var(--app-negative)]/30 bg-[var(--app-negative)]/5 px-4 py-3 text-sm text-[var(--app-negative)]">Unable to load market sentiment. <button class="font-semibold underline" type="button" @click="load">Try again</button></p>
        <div class="p-4">
          <IndicatorListTable v-if="viewMode === 'table'" :indicators="filteredRows" :loading="loading" :columns="columns" :show-favorite="false" :sort-key="sortKey" :sort-direction="sortDirection" compact @open="openIndicator" @sort="setSort" />
          <IndicatorCardGrid v-else :indicators="filteredRows" :loading="loading" :columns="columns" :show-favorite="false" :primary-metric-column="columns[1]" primary-metric-label="Close" :secondary-metric-column="columns[2]" secondary-metric-label="Optix Value" @open="openIndicator" />
        </div>
        <footer class="border-t border-[var(--app-border)] px-4 py-3 text-sm text-[var(--app-text-muted)]">Showing {{ filteredRows.length }} of {{ rows.length }} markets</footer>
      </section>
    </div>
  </main>
</template>

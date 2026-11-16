<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowLeft, Grid2X2, List, RotateCcw, Search } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { normalizeIndicatorRows } from '@/entities/indicator/model/indicator.adapter'
import { fetchIndicatorTrends } from '@/entities/indicator/api/indicator.api'
import { indicatorSortValue } from '@/entities/indicator/model/indicator.values'
import type { IndicatorTrendMap } from '@/entities/indicator/model/indicator.trends'
import type { Indicator, IndicatorRawRow, IndicatorSortDirection, IndicatorViewMode } from '@/entities/indicator/model/indicator.types'
import type { IndicatorTableColumn } from '@/entities/indicator/model/indicator.table'
import { fetchClassicDashboard } from '@/pages/dashboard/dashboard.api'
import IndicatorCardGrid from './ui/IndicatorCardGrid.vue'
import IndicatorListTable from './ui/IndicatorListTable.vue'

const props = defineProps<{ tone: 'pessimism' | 'optimism' }>()
const router = useRouter()
const rows = ref<Indicator[]>([])
const dashboardDate = ref('')
const loading = ref(false)
const loadError = ref(false)
const searchQuery = ref('')
const viewMode = ref<IndicatorViewMode>('table')
const sortKey = ref('')
const sortDirection = ref<IndicatorSortDirection>('asc')
let controller: AbortController | null = null

const columns: IndicatorTableColumn[] = [
  { key: 'chart_name', label: 'Indicator Name', kind: 'name', minWidth: 390 },
  { key: 'sub_type', label: 'Group', kind: 'text', minWidth: 160 },
  { key: 'timeframe', label: 'Time Frame', kind: 'text', minWidth: 120 },
  { key: 'last_value', label: 'Value', kind: 'number', minWidth: 100, decimals: 2, trimTrailingZeros: true },
  { key: 'last_change', label: 'Change', kind: 'change', minWidth: 110, decimals: 2, trimTrailingZeros: true, showChangeArrow: true },
  { key: 'last_update', label: 'Date', kind: 'date', rawDate: true, rawDateOnly: true, minWidth: 120 },
  { key: 'sentiment', label: 'Sentiment', kind: 'sentiment', minWidth: 150 },
  { key: 'trend', label: 'Trend (30D)', kind: 'sparkline', minWidth: 150 },
]

const isPessimism = computed(() => props.tone === 'pessimism')
const title = computed(() => `Indicators Showing Excess ${isPessimism.value ? 'Pessimism' : 'Optimism'}`)
const toneLabel = computed(() => isPessimism.value ? 'pessimism' : 'optimism')
const formattedDate = computed(() => {
  const match = dashboardDate.value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (!match) return dashboardDate.value || 'the latest session'
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).toLocaleDateString('en-US', {
    timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric',
  })
})

const filteredRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const filtered = !query ? rows.value : rows.value.filter((row) => [
    row.name, row.group, row.subgroup, row.timeFrame, row.marketSymbol, row.id,
  ].some(value => String(value ?? '').toLowerCase().includes(query)))
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
  if (column.kind === 'sparkline') return
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
    dashboardDate.value = dashboard.date
    const rawRows = (isPessimism.value ? dashboard.pess_extreme : dashboard.opt_extreme) as IndicatorRawRow[]
    const normalized = normalizeIndicatorRows(rawRows, 'stock_complete_list')
    const trends: IndicatorTrendMap = await fetchIndicatorTrends(normalized.map(row => row.id), controller.signal).catch(() => ({}))
    rows.value = normalized.map(row => ({ ...row, trendLines: trends[row.id]?.length ? trends[row.id] : row.trendLines }))
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) loadError.value = true
  } finally {
    loading.value = false
  }
}

watch(() => props.tone, () => { resetControls(); void load() })
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
          <div class="min-w-0">
            <h1 class="text-3xl font-semibold leading-tight">{{ title }}</h1>
            <p class="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">
              Below is a list of
              <RouterLink class="font-semibold text-[var(--app-primary)] hover:underline" to="/indicators?enlarge=stock">stock indicators</RouterLink>
              showing excess {{ toneLabel }}. For {{ formattedDate }}, there are
              <strong class="text-[var(--app-text)]">{{ rows.length }} indicators</strong> listed.
            </p>
          </div>
          <div class="inline-flex shrink-0 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-1" aria-label="View mode">
            <button type="button" class="inline-flex h-8 items-center gap-1.5 rounded px-3 text-sm font-semibold" :class="viewMode === 'table' ? 'bg-[var(--app-primary)] text-white' : 'text-[var(--app-text-secondary)]'" @click="viewMode = 'table'"><List :size="16"/> List</button>
            <button type="button" class="inline-flex h-8 items-center gap-1.5 rounded px-3 text-sm font-semibold" :class="viewMode === 'cards' ? 'bg-[var(--app-primary)] text-white' : 'text-[var(--app-text-secondary)]'" @click="viewMode = 'cards'"><Grid2X2 :size="16"/> Cards</button>
          </div>
        </header>

        <div class="grid gap-2 border-b border-[var(--app-border-muted)] px-4 py-3 md:grid-cols-[minmax(260px,1fr)_minmax(220px,auto)_auto]">
          <label class="flex h-10 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3">
            <Search :size="16" class="mr-2 shrink-0 text-[var(--app-text-muted)]" />
            <input v-model="searchQuery" class="w-full bg-transparent text-sm outline-none" placeholder="Search indicators..." />
          </label>
          <select class="h-10 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text-secondary)]" :value="sortKey ? `${sortKey}:${sortDirection}` : ''" @change="handleSortSelect">
            <option value="">Sort by: Default</option>
            <option value="chart_name:asc">Indicator Name: A to Z</option>
            <option value="chart_name:desc">Indicator Name: Z to A</option>
            <option value="last_value:asc">Value: Low to High</option>
            <option value="last_value:desc">Value: High to Low</option>
            <option value="last_change:asc">Change: Low to High</option>
            <option value="last_change:desc">Change: High to Low</option>
            <option value="last_update:desc">Date: Newest First</option>
            <option value="last_update:asc">Date: Oldest First</option>
          </select>
          <button type="button" class="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] px-3 text-sm text-[var(--app-text-secondary)] hover:border-[var(--app-primary)] hover:text-[var(--app-primary)]" @click="resetControls"><RotateCcw :size="16"/> Reset</button>
        </div>

        <p v-if="loadError" class="m-4 rounded-md border border-[var(--app-negative)]/30 bg-[var(--app-negative)]/5 px-4 py-3 text-sm text-[var(--app-negative)]">Unable to load indicators. <button class="font-semibold underline" type="button" @click="load">Try again</button></p>
        <div class="p-4">
          <IndicatorListTable v-if="viewMode === 'table'" :indicators="filteredRows" :loading="loading" :columns="columns" :show-favorite="false" :sort-key="sortKey" :sort-direction="sortDirection" compact @open="openIndicator" @sort="setSort" />
          <IndicatorCardGrid v-else :indicators="filteredRows" :loading="loading" :columns="columns" :show-favorite="false" @open="openIndicator" />
        </div>
        <footer class="border-t border-[var(--app-border)] px-4 py-3 text-sm text-[var(--app-text-muted)]">Showing {{ filteredRows.length }} of {{ rows.length }} indicators</footer>
      </section>
    </div>
  </main>
</template>

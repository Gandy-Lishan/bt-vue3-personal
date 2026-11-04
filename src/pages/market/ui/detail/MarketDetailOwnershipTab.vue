<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MarketMetric, MarketPredictionDetail } from '@/entities/market/model/market-detail.types'
import { formatMarketPercent } from '@/entities/market/model/market-prediction.adapter'
import { formatMarketCompact } from '@/entities/market/model/market-detail.adapter'
import { useSortedPagedRows } from '@/pages/indicators/composables/useSortedPagedRows'
import IndicatorPagination from '@/pages/indicators/ui/IndicatorPagination.vue'
import AppDataTable from '@/shared/ui/AppDataTable.vue'
import type { AppDataTableColumn } from '@/shared/ui/app-data-table.types'
import MarketMetricTable from './MarketMetricTable.vue'
import MarketSegmentedControl from './MarketSegmentedControl.vue'
import type { MarketSegmentOption } from './MarketSegmentedControl.vue'

const props = defineProps<{
  detail: MarketPredictionDetail
}>()

const PAGE_SIZE = 10

const OWNERSHIP_TABS: MarketSegmentOption[] = [
  { label: 'Insider Transactions', value: 'insider-transactions', description: 'The number of shares and total value of stock sold by insiders on a specific date at a given price.' },
  { label: 'Total Institutional Holdings', value: 'institutional-holdings', description: 'A specific institution\'s change in holdings (both the number of shares and the corresponding market value) on a given day.' },
  { label: 'Total Mutual Fund Holdings', value: 'mutual-fund-holdings', description: 'A specific mutual fund\'s change in holdings (both the number of shares and the corresponding market value) on a given day.' },
]

const activeTab = ref('insider-transactions')
const searchQuery = ref('')

const insiderRows = computed(() => props.detail.ownershipInsiders)
const institutionRows = computed(() => props.detail.ownershipInstitutions)
const fundRows = computed(() => props.detail.ownershipFunds)

function filtered<T extends Record<string, unknown>>(rows: T[], query: string, keys: (keyof T)[]): T[] {
  if (!query) return rows
  const q = query.toLowerCase()
  return rows.filter((row) =>
    keys.some((k) => {
      const v = row[k]
      return v !== null && v !== undefined && String(v).toLowerCase().includes(q)
    }),
  )
}

const insiderFiltered = computed(() =>
  filtered(insiderRows.value, searchQuery.value, ['date', 'insider', 'type']),
)
const institutionFiltered = computed(() =>
  filtered(institutionRows.value, searchQuery.value, ['name', 'date']),
)
const fundFiltered = computed(() =>
  filtered(fundRows.value, searchQuery.value, ['name', 'dayReported']),
)

const insiderTable = useSortedPagedRows(insiderFiltered, (row, key) => {
  if (key === 'date') return row.timestamp ?? (Date.parse(row.date) || row.date)
  const value = row[key as keyof typeof row]
  if (typeof value === 'number') return value
  return value === null || value === undefined ? null : String(value)
}, PAGE_SIZE)

const institutionTable = useSortedPagedRows(institutionFiltered, (row, key) => {
  if (key === 'date') return row.timestamp ?? (Date.parse(row.date) || row.date)
  const value = row[key as keyof typeof row]
  if (typeof value === 'number') return value
  return value === null || value === undefined ? null : String(value)
}, PAGE_SIZE)

const fundTable = useSortedPagedRows(fundFiltered, (row, key) => {
  if (key === 'dayReported') return row.timestamp ?? (Date.parse(row.dayReported) || row.dayReported)
  const value = row[key as keyof typeof row]
  if (typeof value === 'number') return value
  return value === null || value === undefined ? null : String(value)
}, PAGE_SIZE)

function handleSort(key: string) {
  const table = activeTab.value === 'insider-transactions' ? insiderTable
    : activeTab.value === 'institutional-holdings' ? institutionTable
    : fundTable
  const dateKeys = ['date', 'dayReported']
  table.sort({ key, kind: dateKeys.includes(key) ? 'date' : 'number' })
}

const insiderDisplayRows = computed(() =>
  insiderTable.pagedRows.value.map((row, index) => ({
    id: `insider-${String(row.id ?? index)}`,
    date: row.date,
    insider: row.insider,
    type: row.type,
    shares: formatMarketCompact(row.shares),
    price: formatMarketCompact(row.price, { currency: true }),
    value: formatMarketCompact(row.value, { currency: true }),
  }))
)

const institutionDisplayRows = computed(() =>
  institutionTable.pagedRows.value.map((row, index) => ({
    id: `institution-${String(row.id ?? index)}`,
    name: row.name,
    date: row.date,
    shares: formatMarketCompact(row.shares),
    changesShares: formatMarketCompact(row.changesShares),
    changePercent: formatMarketPercent(row.changePercent, true),
    value: formatMarketCompact(row.value, { currency: true }),
  }))
)

const fundDisplayRows = computed(() =>
  fundTable.pagedRows.value.map((row, index) => ({
    id: `fund-${String(row.id ?? index)}`,
    name: row.name,
    shares: formatMarketCompact(row.shares),
    dayReported: row.dayReported,
    value: formatMarketCompact(row.value, { currency: true }),
  }))
)

const insiderColumns: AppDataTableColumn[] = [
  { key: 'date', label: 'Date', minWidth: 120, sortable: true },
  { key: 'insider', label: 'Insider', minWidth: 150, sortable: true },
  { key: 'type', label: 'Type', minWidth: 90, sortable: true },
  { key: 'shares', label: 'Shares', minWidth: 120, sortable: true },
  { key: 'price', label: 'Price', minWidth: 100, sortable: true },
  { key: 'value', label: 'Value', minWidth: 120, sortable: true },
]

const institutionColumns: AppDataTableColumn[] = [
  { key: 'name', label: 'Owner Name', minWidth: 180, sortable: true },
  { key: 'date', label: 'Date', minWidth: 120, sortable: true },
  { key: 'shares', label: 'Shares Held', minWidth: 120, sortable: true },
  { key: 'changesShares', label: 'Changes (Shares)', minWidth: 130, sortable: true },
  { key: 'changePercent', label: 'Change (%)', minWidth: 110, sortable: true },
  { key: 'value', label: 'Value', minWidth: 120, sortable: true },
]

const fundColumns: AppDataTableColumn[] = [
  { key: 'name', label: 'Fund Name', minWidth: 180, sortable: true },
  { key: 'shares', label: 'Shares Held', minWidth: 120, sortable: true },
  { key: 'dayReported', label: 'Day Reported', minWidth: 130, sortable: true },
  { key: 'value', label: 'Value', minWidth: 120, sortable: true },
]

// Mirrors Vue2 `Ownership.vue` `hasZero`: hide a panel when ANY of its rows is zero.
// `'0.0%'` is included because the Vue3 percent formatter rounds to one decimal
// where Vue2's `formatNumber` produced `'0.00%'`.
function hasZero(rows: MarketMetric[]): boolean {
  if (!Array.isArray(rows)) return false
  return rows.some((row) => ['0.00%', '0.0%', '0.00', '0'].includes(row.value))
}

const visiblePanels = computed(() =>
  props.detail.ownershipPanels.filter((panel) => !hasZero(panel.metrics)),
)

// Reset to page 1 when search query changes
watch(searchQuery, () => {
  insiderTable.setPage(1)
  institutionTable.setPage(1)
  fundTable.setPage(1)
})

// Reset search and sort when switching tabs
watch(activeTab, () => {
  searchQuery.value = ''
  insiderTable.reset()
  institutionTable.reset()
  fundTable.reset()
})
</script>

<template>
  <section class="space-y-3">
    <!-- Summary panels -->
    <div v-if="visiblePanels.length" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <section
        v-for="panel in visiblePanels"
        :key="panel.title"
        class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4"
      >
        <h2 class="mb-3 text-base font-extrabold">{{ panel.title }}</h2>
        <MarketMetricTable :rows="panel.metrics" />
      </section>
    </div>

    <!-- Main table card -->
    <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
      <div class="flex flex-col gap-3">
        <MarketSegmentedControl
          v-model="activeTab"
          :options="OWNERSHIP_TABS"
          aria-label="Ownership type"
        />

        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search..."
          class="h-9 w-full rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] px-3 py-2 text-[0.8125rem] text-[var(--app-text)] placeholder:text-[var(--app-text-muted)] focus:border-[var(--app-primary)] focus:outline-none md:w-56"
        />
      </div>

      <div class="mt-3">
        <template v-if="activeTab === 'insider-transactions'">
          <AppDataTable
            :columns="insiderColumns"
            :rows="insiderDisplayRows"
            :sort-key="insiderTable.sortKey.value"
            :sort-direction="insiderTable.sortDirection.value"
            empty-message="No insider transactions found"
            @sort="handleSort"
          />
          <div v-if="insiderRows.length" class="mt-3 border-t border-[var(--app-border)] pt-3">
            <IndicatorPagination
              :page="insiderTable.page.value"
              :page-count="insiderTable.pageCount.value"
              :total="insiderFiltered.length"
              item-label="transactions"
              @change="insiderTable.setPage"
            />
          </div>
        </template>

        <template v-else-if="activeTab === 'institutional-holdings'">
          <AppDataTable
            :columns="institutionColumns"
            :rows="institutionDisplayRows"
            :sort-key="institutionTable.sortKey.value"
            :sort-direction="institutionTable.sortDirection.value"
            empty-message="No institutional holdings found"
            @sort="handleSort"
          />
          <div v-if="institutionRows.length" class="mt-3 border-t border-[var(--app-border)] pt-3">
            <IndicatorPagination
              :page="institutionTable.page.value"
              :page-count="institutionTable.pageCount.value"
              :total="institutionFiltered.length"
              item-label="institutions"
              @change="institutionTable.setPage"
            />
          </div>
        </template>

        <template v-else>
          <AppDataTable
            :columns="fundColumns"
            :rows="fundDisplayRows"
            :sort-key="fundTable.sortKey.value"
            :sort-direction="fundTable.sortDirection.value"
            empty-message="No mutual fund holdings found"
            @sort="handleSort"
          />
          <div v-if="fundRows.length" class="mt-3 border-t border-[var(--app-border)] pt-3">
            <IndicatorPagination
              :page="fundTable.page.value"
              :page-count="fundTable.pageCount.value"
              :total="fundFiltered.length"
              item-label="funds"
              @change="fundTable.setPage"
            />
          </div>
        </template>
      </div>
    </section>
  </section>
</template>

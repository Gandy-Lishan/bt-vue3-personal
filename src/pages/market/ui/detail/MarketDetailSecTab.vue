<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Search } from '@lucide/vue'
import type { MarketPredictionDetail, MarketSecRow } from '@/entities/market/model/market-detail.types'
import { useSortedPagedRows } from '@/pages/indicators/composables/useSortedPagedRows'
import IndicatorPagination from '@/pages/indicators/ui/IndicatorPagination.vue'
import AppDataTable from '@/shared/ui/AppDataTable.vue'
import type { AppDataTableColumn } from '@/shared/ui/app-data-table.types'

const props = defineProps<{
  detail: MarketPredictionDetail
}>()

const PAGE_SIZE = 10

const searchQuery = ref('')

const columns: AppDataTableColumn[] = [
  { key: 'date', label: 'Date', minWidth: 130, sortable: true },
  { key: 'ticker', label: 'Ticker', minWidth: 130, sortable: true },
  { key: 'description', label: 'Description', sortable: true },
  { key: 'type', label: 'From', minWidth: 130, sortable: true },
]

const filteredRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return props.detail.sec

  return props.detail.sec.filter((row) => (
    [row.date, row.ticker, row.description, row.type].join(' ').toLowerCase().includes(query)
  ))
})

const table = useSortedPagedRows(filteredRows, (row, key) => {
  if (key === 'date') return Date.parse(row.date) || row.date
  return String(row[key as keyof MarketSecRow] ?? '')
}, PAGE_SIZE)

const tableRows = computed<Array<Record<string, unknown>>>(() => (
  table.pagedRows.value.map((row) => ({ ...row }))
))

function handleSort(key: string) {
  table.sort({ key, kind: key === 'date' ? 'date' : 'text' })
}

watch(searchQuery, () => table.reset())
</script>

<template>
  <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-lg font-extrabold">SEC</h2>
      <label class="flex h-9 min-w-[240px] items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5">
        <Search :size="16" class="mr-2 shrink-0 text-[var(--app-text-muted)]" />
        <input v-model="searchQuery" class="w-full bg-transparent text-[0.8125rem] outline-none" placeholder="Search" />
      </label>
    </div>

    <AppDataTable
      :columns="columns"
      :rows="tableRows"
      :sort-key="table.sortKey.value"
      :sort-direction="table.sortDirection.value"
      empty-message="No SEC filings found"
      @sort="handleSort"
    >
      <template #cell-description="{ row }">
        <a
          v-if="row.url"
          :href="String(row.url)"
          class="font-extrabold text-[var(--app-primary)] hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ row.description }}
        </a>
        <span v-else>{{ row.description }}</span>
      </template>
    </AppDataTable>

    <div v-if="filteredRows.length" class="mt-3 border-t border-[var(--app-border)] pt-3">
      <IndicatorPagination
        :page="table.page.value"
        :page-count="table.pageCount.value"
        :total="table.sortedRows.value.length"
        item-label="filings"
        @change="table.setPage"
      />
    </div>
  </section>
</template>

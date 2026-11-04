<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Search } from '@lucide/vue'
import type { MarketNewsRow, MarketPredictionDetail } from '@/entities/market/model/market-detail.types'
import { useSortedPagedRows } from '@/pages/indicators/composables/useSortedPagedRows'
import IndicatorPagination from '@/pages/indicators/ui/IndicatorPagination.vue'
import AppDataTable from '@/shared/ui/AppDataTable.vue'
import type { AppDataTableColumn } from '@/shared/ui/app-data-table.types'

const props = defineProps<{
  detail: MarketPredictionDetail
}>()

const PAGE_SIZE = 10

const searchQuery = ref('')
const failedImages = ref(new Set<string>())

const columns: AppDataTableColumn[] = [
  { key: 'time', label: 'Time', minWidth: 150, sortable: true },
  { key: 'symbol', label: 'Symbol', minWidth: 100, sortable: true },
  { key: 'title', label: 'Title', sortable: true },
  { key: 'source', label: 'Source', minWidth: 120 },
]

const filteredRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return props.detail.news

  return props.detail.news.filter((row) => (
    [row.time, row.symbol, row.title, row.source].join(' ').toLowerCase().includes(query)
  ))
})

const table = useSortedPagedRows(filteredRows, (row, key) => {
  if (key === 'time') return row.publishedAt ? Date.parse(row.publishedAt) || row.time : row.time
  return String(row[key as keyof MarketNewsRow] ?? '')
}, PAGE_SIZE)

const tableRows = computed<Array<Record<string, unknown>>>(() => (
  table.pagedRows.value.map((row) => ({ ...row }))
))

function handleSort(key: string) {
  table.sort({ key, kind: key === 'time' ? 'date' : 'text' })
}

function markImageFailed(id: string) {
  const next = new Set(failedImages.value)
  next.add(id)
  failedImages.value = next
}

watch(searchQuery, () => table.reset())
</script>

<template>
  <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-lg font-extrabold">News</h2>
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
      empty-message="No news found"
      @sort="handleSort"
    >
      <template #cell-title="{ row }">
        <a
          v-if="row.url"
          :href="String(row.url)"
          class="font-extrabold text-[var(--app-primary)] hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ row.title }}
        </a>
        <span v-else class="font-extrabold">{{ row.title }}</span>
      </template>

      <template #cell-source="{ row }">
        <img
          v-if="row.imageUrl && !failedImages.has(String(row.id))"
          :src="String(row.imageUrl)"
          :alt="String(row.source || 'Source')"
          class="h-5 max-w-[100px] object-contain"
          loading="lazy"
          @error="markImageFailed(String(row.id))"
        />
        <span v-else>{{ row.source || '—' }}</span>
      </template>
    </AppDataTable>

    <div v-if="filteredRows.length" class="mt-3 border-t border-[var(--app-border)] pt-3">
      <IndicatorPagination
        :page="table.page.value"
        :page-count="table.pageCount.value"
        :total="table.sortedRows.value.length"
        item-label="news"
        @change="table.setPage"
      />
    </div>
  </section>
</template>

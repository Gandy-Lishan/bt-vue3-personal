<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { AlertCircle, Info, RotateCcw, Search, X } from '@lucide/vue'
import { fetchArchivedStudies } from '@/entities/archived-study/api/archived-study.api'
import { archivedStudySortValue } from '@/entities/archived-study/model/archived-study.adapter'
import type { ArchivedStudyRow, ArchivedStudySortKey } from '@/entities/archived-study/model/archived-study.types'
import { useSortedPagedRows } from '@/pages/indicators/composables/useSortedPagedRows'
import IndicatorPagination from '@/pages/indicators/ui/IndicatorPagination.vue'
import ListExplorerPage from '@/shared/ui/ListExplorerPage.vue'
import ArchivedStudiesTable from './ui/ArchivedStudiesTable.vue'

const rows = ref<ArchivedStudyRow[]>([])
const loading = ref(false)
const loadError = ref('')
const searchQuery = ref('')
const marketFilter = ref('')
const timeframeFilter = ref('')
const descriptionOpen = ref(false)
let requestController: AbortController | null = null

const filteredRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return rows.value.filter((row) => {
    const searchable = [row.date, row.title, row.market, row.forecast, row.outcome, row.rating, row.timeframe].join(' ').toLowerCase()
    return (!query || searchable.includes(query))
      && (!marketFilter.value || row.market === marketFilter.value)
      && (!timeframeFilter.value || row.timeframe === timeframeFilter.value)
  })
})

const marketOptions = computed(() => [...new Set(rows.value.map((row) => row.market))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })))
const timeframeOptions = computed(() => [...new Set(rows.value.map((row) => row.timeframe).filter(Boolean))].sort())
const table = useSortedPagedRows(filteredRows, (row, key) => archivedStudySortValue(row, key), 25)

function resetFilters() {
  searchQuery.value = ''
  marketFilter.value = ''
  timeframeFilter.value = ''
  table.reset()
}

function handleSort(key: ArchivedStudySortKey) {
  table.sort({ key, kind: key === 'date' ? 'date' : key === 'rating' ? 'number' : 'text' })
}

async function loadArchivedStudies() {
  requestController?.abort()
  requestController = new AbortController()
  loading.value = true
  loadError.value = ''
  try {
    rows.value = await fetchArchivedStudies(requestController.signal)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    rows.value = []
    loadError.value = 'We could not load archived studies. Please try again.'
  } finally {
    loading.value = false
  }
}

watch([searchQuery, marketFilter, timeframeFilter], () => table.setPage(1))
onMounted(loadArchivedStudies)
onBeforeUnmount(() => requestController?.abort())
</script>

<template>
  <ListExplorerPage title="Archived Studies" description="Completed Daily Report studies graded by the accuracy of their forecasts." panel-title="Archived Studies" panel-description="Search completed research, compare forecasts with outcomes, and review accuracy ratings." :show-view-mode-toggle="false">
    <template #title-actions>
      <button class="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--app-border-strong)] bg-[var(--app-surface-muted)] px-2.5 text-xs font-semibold text-[var(--app-text-secondary)] hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]" type="button" @click="descriptionOpen = true">
        <Info :size="15" /> Description & Legend
      </button>
    </template>
    <template #summary>
      <span class="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-1.5"><strong class="text-[var(--app-text)]">{{ filteredRows.length }}</strong><span class="text-[var(--app-text-muted)]">studies</span></span>
    </template>
    <template #filters>
      <div class="grid gap-2 border-b border-[var(--app-border)] px-4 py-3 xl:grid-cols-[minmax(260px,1fr)_minmax(170px,0.35fr)_minmax(170px,0.35fr)_auto]">
        <label class="flex h-9 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5"><Search :size="16" class="mr-2 shrink-0 text-[var(--app-text-muted)]" /><input v-model="searchQuery" class="w-full bg-transparent text-[0.8125rem] outline-none" placeholder="Search archived studies..." /></label>
        <select v-model="marketFilter" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]"><option value="">All markets</option><option v-for="market in marketOptions" :key="market" :value="market">{{ market.toUpperCase() }}</option></select>
        <select v-model="timeframeFilter" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]"><option value="">All timeframes</option><option v-for="timeframe in timeframeOptions" :key="timeframe" :value="timeframe">{{ timeframe }}</option></select>
        <button class="flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[0.8125rem] text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)]" type="button" @click="resetFilters"><RotateCcw :size="16" /> Reset</button>
      </div>
    </template>
    <div v-if="loadError" class="flex min-h-72 flex-col items-center justify-center px-6 text-center"><AlertCircle :size="30" class="text-[var(--app-negative)]" /><h2 class="mt-3 text-lg font-extrabold">Unable to load archived studies</h2><p class="mt-1 text-sm text-[var(--app-text-muted)]">{{ loadError }}</p><button class="mt-4 rounded-md bg-[var(--app-primary)] px-4 py-2 text-sm font-bold text-white" type="button" @click="loadArchivedStudies">Try again</button></div>
    <div v-else class="px-4 py-4"><ArchivedStudiesTable :rows="table.pagedRows.value" :loading="loading" :sort-key="table.sortKey.value as ArchivedStudySortKey | ''" :sort-direction="table.sortDirection.value" @sort="handleSort" /></div>
    <template v-if="!loadError && !loading" #footer><IndicatorPagination :page="table.page.value" :page-count="table.pageCount.value" :total="table.sortedRows.value.length" item-label="studies" @change="table.setPage" /></template>
    <template #overlays>
      <Teleport to="body"><div v-if="descriptionOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-overlay)] px-4 py-6" @click.self="descriptionOpen = false"><section class="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-lg bg-[var(--app-surface)] text-[var(--app-text)] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="archived-studies-description-title"><header class="flex items-start justify-between gap-4 border-b border-[var(--app-border)] px-5 py-4"><div><p class="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">Archived Studies</p><h2 id="archived-studies-description-title" class="mt-1 text-xl">Description & Legend</h2></div><button class="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--app-border)] text-[var(--app-text-subtle)] hover:bg-[var(--app-surface-muted)]" type="button" aria-label="Close description" @click="descriptionOpen = false"><X :size="18" /></button></header><div class="max-h-[calc(86vh-92px)] space-y-4 overflow-y-auto px-5 py-4 text-sm leading-6 text-[var(--app-text-secondary)]"><p>These studies appeared in a Daily Report and forecast a market direction over a particular timeframe. Once that timeframe has passed, each completed study is graded from one to five stars.</p><p>A one-star rating means the forecast was not accurate, while a five-star rating means it was very accurate.</p><div class="grid gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3 sm:grid-cols-3"><span class="font-bold text-[var(--app-positive)]">↑ Up — higher prices</span><span class="font-bold text-[var(--app-negative)]">↓ Down — lower prices</span><span class="font-bold text-[var(--app-text-secondary)]">− Flat — neutral</span></div></div></section></div></Teleport>
    </template>
  </ListExplorerPage>
</template>


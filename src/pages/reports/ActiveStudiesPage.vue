<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { AlertCircle, Info, RotateCcw, Search, X } from '@lucide/vue'
import { fetchActiveStudies } from '@/entities/active-study/api/active-study.api'
import { activeStudySortValue } from '@/entities/active-study/model/active-study.adapter'
import type { ActiveStudyRow, ActiveStudySortKey, ActiveStudySummary } from '@/entities/active-study/model/active-study.types'
import { useSortedPagedRows } from '@/pages/indicators/composables/useSortedPagedRows'
import IndicatorPagination from '@/pages/indicators/ui/IndicatorPagination.vue'
import ListExplorerPage from '@/shared/ui/ListExplorerPage.vue'
import ActiveStudiesTable from './ui/ActiveStudiesTable.vue'
import ActiveStudiesChartIQ from './ui/ActiveStudiesChartIQ.vue'

const props = withDefaults(defineProps<{
  /** stacked：现有上下堆叠；chart-left / list-left：两条分栏对比路由 */
  layout?: 'stacked' | 'chart-left' | 'list-left'
}>(), { layout: 'stacked' })

const isStacked = computed(() => props.layout === 'stacked')

const PAGE_SIZE = 25
const emptySummary: ActiveStudySummary = {
  shortTermBullish: 0,
  shortTermBearish: 0,
  mediumTermBullish: 0,
  mediumTermBearish: 0,
  longTermBullish: 0,
  longTermBearish: 0,
}

const rows = ref<ActiveStudyRow[]>([])
const summary = ref<ActiveStudySummary>({ ...emptySummary })
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
    const searchable = [row.date, row.title, row.market, row.forecast, row.timeframe].join(' ').toLowerCase()
    return (!query || searchable.includes(query))
      && (!marketFilter.value || row.market === marketFilter.value)
      && (!timeframeFilter.value || row.timeframe === timeframeFilter.value)
  })
})

const marketOptions = computed(() => [...new Set(rows.value.map((row) => row.market).filter(Boolean))]
  .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' })))
const timeframeOptions = computed(() => {
  const priority = ['Short-Term', 'Medium-Term', 'Long-Term']
  return [...new Set(rows.value.map((row) => row.timeframe).filter(Boolean))]
    .sort((left, right) => {
      const leftIndex = priority.indexOf(left)
      const rightIndex = priority.indexOf(right)
      if (leftIndex !== -1 || rightIndex !== -1) return (leftIndex === -1 ? priority.length : leftIndex) - (rightIndex === -1 ? priority.length : rightIndex)
      return left.localeCompare(right)
    })
})

const table = useSortedPagedRows(filteredRows, (row, key) => activeStudySortValue(row, key), PAGE_SIZE)
const visibleSummary = computed(() => [
  { label: 'Short-Term', bullish: summary.value.shortTermBullish, bearish: summary.value.shortTermBearish },
  { label: 'Medium-Term', bullish: summary.value.mediumTermBullish, bearish: summary.value.mediumTermBearish },
  { label: 'Long-Term', bullish: summary.value.longTermBullish, bearish: summary.value.longTermBearish },
])

function resetFilters() {
  searchQuery.value = ''
  marketFilter.value = ''
  timeframeFilter.value = ''
  table.reset()
}

function handleSort(key: ActiveStudySortKey) {
  table.sort({ key, kind: key === 'date' ? 'date' : 'text' })
}

async function loadActiveStudies() {
  requestController?.abort()
  requestController = new AbortController()
  loading.value = true
  loadError.value = ''
  try {
    const response = await fetchActiveStudies(requestController.signal)
    rows.value = response.items
    summary.value = response.summary
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    rows.value = []
    summary.value = { ...emptySummary }
    loadError.value = 'We could not load active studies. Please try again.'
  } finally {
    loading.value = false
  }
}

watch([searchQuery, marketFilter, timeframeFilter], () => table.setPage(1))
onMounted(loadActiveStudies)
onBeforeUnmount(() => requestController?.abort())
</script>

<template>
  <ListExplorerPage
    title="Active Studies"
    description="Current studies from the Daily Report that still have an active market forecast."
    panel-title="Active Studies"
    panel-description="Filter by market or timeframe, search study titles, and sort any column."
    :show-view-mode-toggle="false"
  >
    <template #title-actions>
      <button
        class="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--app-border-strong)] bg-[var(--app-surface-muted)] px-2.5 text-xs font-semibold text-[var(--app-text-secondary)] hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]"
        type="button"
        @click="descriptionOpen = true"
      >
        <Info :size="15" /> Description & Legend
      </button>
    </template>

    <template #summary>
      <span v-for="item in visibleSummary" :key="item.label" class="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-1.5">
        <span class="text-[var(--app-text-muted)]">{{ item.label }}</span>
        <span class="font-extrabold text-[var(--app-positive)]">↑ {{ item.bullish }}</span>
        <span class="font-extrabold text-[var(--app-negative)]">↓ {{ item.bearish }}</span>
      </span>
    </template>

    <template v-if="isStacked" #hero>
      <div class="border-b border-[var(--app-border)] px-4 py-4">
        <ActiveStudiesChartIQ />
      </div>
    </template>

    <template #filters>
      <div class="grid gap-2 border-b border-[var(--app-border)] px-4 py-3 xl:grid-cols-[minmax(260px,1fr)_minmax(170px,0.35fr)_minmax(170px,0.35fr)_auto]">
        <label class="flex h-9 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5">
          <Search :size="16" class="mr-2 shrink-0 text-[var(--app-text-muted)]" />
          <input v-model="searchQuery" class="w-full bg-transparent text-[0.8125rem] outline-none" placeholder="Search active studies..." />
        </label>
        <select v-model="marketFilter" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]">
          <option value="">All markets</option>
          <option v-for="market in marketOptions" :key="market" :value="market">{{ market.toUpperCase() }}</option>
        </select>
        <select v-model="timeframeFilter" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]">
          <option value="">All timeframes</option>
          <option v-for="timeframe in timeframeOptions" :key="timeframe" :value="timeframe">{{ timeframe }}</option>
        </select>
        <button class="flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[0.8125rem] text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)]" type="button" @click="resetFilters">
          <RotateCcw :size="16" /> Reset
        </button>
      </div>
    </template>

    <div v-if="loadError" class="flex min-h-72 flex-col items-center justify-center px-6 text-center">
      <AlertCircle :size="30" class="text-[var(--app-negative)]" />
      <h2 class="mt-3 text-lg font-extrabold">Unable to load active studies</h2>
      <p class="mt-1 text-sm text-[var(--app-text-muted)]">{{ loadError }}</p>
      <button class="mt-4 rounded-md bg-[var(--app-primary)] px-4 py-2 text-sm font-bold text-white" type="button" @click="loadActiveStudies">Try again</button>
    </div>
    <template v-else-if="isStacked">
      <div class="px-4 py-4">
        <ActiveStudiesTable
          :rows="table.pagedRows.value"
          :loading="loading"
          :sort-key="table.sortKey.value as ActiveStudySortKey | ''"
          :sort-direction="table.sortDirection.value"
          @sort="handleSort"
        />
      </div>
    </template>

    <div v-else class="px-4 py-4">
      <div
        class="grid grid-cols-1 gap-4 xl:items-start"
        :class="layout === 'chart-left'
          ? 'xl:grid-cols-[minmax(650px,55fr)_minmax(0,45fr)]'
          : 'xl:grid-cols-[minmax(0,45fr)_minmax(650px,55fr)]'"
      >
        <!-- DOM 顺序始终是图表在前，list-left 只靠 order 换位，两条分栏路由之间切换不会重挂图表 -->
        <div
          class="active-studies-chart-pane min-w-0"
          :class="layout === 'chart-left'
            ? 'xl:order-1'
            : 'xl:order-2 xl:sticky xl:top-2 xl:self-start'"
        >
          <ActiveStudiesChartIQ />
        </div>

        <div class="min-w-0" :class="layout === 'list-left' ? 'xl:order-1' : 'xl:order-2'">
          <ActiveStudiesTable
            dense
            :rows="table.pagedRows.value"
            :loading="loading"
            :sort-key="table.sortKey.value as ActiveStudySortKey | ''"
            :sort-direction="table.sortDirection.value"
            @sort="handleSort"
          />
          <div v-if="!loading" class="mt-3 border-t border-[var(--app-border)] pt-3">
            <IndicatorPagination
              compact
              :page="table.page.value"
              :page-count="table.pageCount.value"
              :total="table.sortedRows.value.length"
              item-label="studies"
              @change="table.setPage"
            />
          </div>
        </div>
      </div>
    </div>

    <template v-if="isStacked && !loadError && !loading" #footer>
      <IndicatorPagination
        :page="table.page.value"
        :page-count="table.pageCount.value"
        :total="table.sortedRows.value.length"
        item-label="studies"
        @change="table.setPage"
      />
    </template>

    <template #overlays>
      <Teleport to="body">
        <div v-if="descriptionOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-overlay)] px-4 py-6" @click.self="descriptionOpen = false">
          <section class="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-lg bg-[var(--app-surface)] text-[var(--app-text)] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="active-studies-description-title">
            <header class="flex items-start justify-between gap-4 border-b border-[var(--app-border)] px-5 py-4">
              <div>
                <p class="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">Active Studies</p>
                <h2 id="active-studies-description-title" class="mt-1 text-xl">Description & Legend</h2>
              </div>
              <button class="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--app-border)] text-[var(--app-text-subtle)] hover:bg-[var(--app-surface-muted)]" type="button" aria-label="Close description" @click="descriptionOpen = false">
                <X :size="18" />
              </button>
            </header>
            <div class="max-h-[calc(86vh-92px)] space-y-4 overflow-y-auto px-5 py-4 text-sm leading-6 text-[var(--app-text-secondary)]">
              <p><strong class="text-[var(--app-text)]">What is an active study?</strong> When research reaches a solid conclusion, its forecast remains here while it is considered active. Each forecast identifies the expected direction, relevant market, and time horizon.</p>
              <p>This page lists active studies from the Daily Report. Use the controls to filter the list by market and timeframe.</p>
              <div class="grid gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3 sm:grid-cols-3">
                <span class="font-bold text-[var(--app-positive)]">↑ Up — higher prices</span>
                <span class="font-bold text-[var(--app-negative)]">↓ Down — lower prices</span>
                <span class="font-bold text-[var(--app-text-secondary)]">− Flat — neutral</span>
              </div>
              <p><strong class="text-[var(--app-text)]">Timeframes:</strong> Short-Term is less than one month, Medium-Term is one to six months, and Long-Term is more than six months.</p>
              <a class="font-bold text-[var(--app-primary)] hover:underline" href="https://www.sentimentrader.com/users/knowledge_base_article/How%20accurate%20are%20your%20studies%3F" target="_blank" rel="noopener noreferrer">Learn more about study accuracy</a>
            </div>
          </section>
        </div>
      </Teleport>
    </template>
  </ListExplorerPage>
</template>

<style scoped>
/* 分栏后图表列只有 ~650px，ChartIQ 顶部工具栏（三个 193px 的 ReportsFilter + lookup）会溢出，
   在分栏容器内压缩工具栏：缩小下拉、隐藏 Chart Preferences 齿轮和次要的 +N chip。 */
@media (min-width: 1280px) {
  .active-studies-chart-pane :deep(.ciq-menu-section) {
    display: none;
  }

  .active-studies-chart-pane :deep(.reports-filter) {
    padding-left: 6px;
  }

  .active-studies-chart-pane :deep(.reports-filter .reports-filter__select) {
    width: 120px;
  }

  .active-studies-chart-pane :deep(.reports-filter__tags) {
    max-width: 88px;
    overflow: hidden;
  }

  .active-studies-chart-pane :deep(.reports-filter__tag) {
    min-width: 0;
    max-width: 100%;
  }

  /* chip 变窄后关闭按钮会被 flex 压缩成椭圆，固定宽度保持圆形 × */
  .active-studies-chart-pane :deep(.reports-filter__tag-close) {
    flex: none;
  }

  .active-studies-chart-pane :deep(.reports-filter__tag-text) {
    min-width: 0;
  }

  /* 窄列里第二个 chip（+N 计数）会被裁掉一半，直接隐藏 */
  .active-studies-chart-pane :deep(.reports-filter__tag + .reports-filter__tag) {
    display: none;
  }
}
</style>


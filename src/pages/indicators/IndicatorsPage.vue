<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CalendarRange,
  ChartCandlestick,
  ChartSpline,
  CircleDollarSign,
  Download,
  Flame,
  Info,
  LayoutDashboard,
  Network,
  RotateCcw,
  Scale,
  Search,
  Star,
  X,
} from '@lucide/vue'
import { indicatorCsvFilename, indicatorCsvTable } from '@/entities/indicator/model/indicator.csv'
import { useIndicatorStore } from '@/entities/indicator/model/indicator.store'
import { getIndicatorTableMeta } from '@/entities/indicator/model/indicator.table'
import { downloadCsv, toCsv } from '@/shared/utils/csv'
import type { IndicatorTableColumn, IndicatorTableColumnKind } from '@/entities/indicator/model/indicator.table'
import type { Indicator, IndicatorGroup, IndicatorSection, IndicatorSortDirection } from '@/entities/indicator/model/indicator.types'
import IndicatorCardGrid from './ui/IndicatorCardGrid.vue'
import IndicatorPageHeader from './ui/IndicatorPageHeader.vue'
import IndicatorListTable from './ui/IndicatorListTable.vue'
import IndicatorPagination from './ui/IndicatorPagination.vue'
import IndicatorSentimentMeter from './ui/IndicatorSentimentMeter.vue'

const store = useIndicatorStore()
const router = useRouter()
const route = useRoute()
const isDescriptionOpen = ref(false)

const iconMap = {
  candlestick: ChartCandlestick,
  spline: ChartSpline,
  dollar: CircleDollarSign,
  scale: Scale,
  network: Network,
  calendarRange: CalendarRange,
  dashboard: LayoutDashboard,
  chart: ChartCandlestick,
  bar: ChartSpline,
  clock: CircleDollarSign,
  database: Scale,
  sliders: Network,
  calendar: CalendarRange,
  grid: LayoutDashboard,
}

const currentTitle = computed(() => {
  if (store.activeSection === 'popular') return 'Most Popular Indicators'
  if (store.activeSection === 'favorites') return 'My Favorite Indicators'
  return store.activeSubgroup.fullName ?? store.activeSubgroup.label
})

const currentFullTableName = computed(() => {
  if (store.activeSection === 'popular') return 'Most Popular Indicators'
  if (store.activeSection === 'favorites') return 'My Favorite Indicators'
  return store.activeSubgroup.fullName ?? store.activeSubgroup.label
})

const currentDescription = computed(() => {
  if (store.activeSection === 'popular') return 'The indicators members use most often across market groups.'
  if (store.activeSection === 'favorites') return 'Your saved indicators from BacktestEdge and your classic favorites folder.'
  return store.activeGroup.description
})

const visibleGroups = computed(() => store.groups.filter((group) => group.id !== 'all'))
// Only the grouped indicator section has subgroups; the standalone lists do not.
const showSubgroups = computed(() => store.activeSection === 'indicators')
const summaryGroupCount = computed(() => visibleGroups.value.filter((group) => group.id !== 'overview').length)
const tableMeta = computed(() => getIndicatorTableMeta(store.activeSource))
const tableDescriptionParagraphs = computed(() =>
  Array.isArray(tableMeta.value.description) ? tableMeta.value.description : [tableMeta.value.description],
)
const shouldShowLegend = computed(() =>
  tableMeta.value.showLegend !== false && tableMeta.value.columns.some((column) => column.kind === 'sentiment'),
)
const descriptionDialogTitle = computed(() =>
  shouldShowLegend.value ? 'Table Description and Optimism/Pessimism Legend' : 'Table Description',
)
const descriptionButtonLabel = computed(() => (shouldShowLegend.value ? 'Description & Legend' : 'Table Description'))
const sortableColumns = computed(() => tableMeta.value.columns.filter((column) => isSortableColumn(column)))
const activeSortValue = computed(() => {
  if (!store.sortKey || !sortableColumns.value.some((column) => column.key === store.sortKey)) return ''
  return `${store.sortKey}:${store.sortDirection}`
})

const sentimentLegend = [
  { score: 1, label: 'Extremely Pessimistic' },
  { score: 2, label: 'Very Pessimistic' },
  { score: 3, label: 'Pessimistic' },
  { score: 4, label: 'Neutral' },
  { score: 5, label: 'Optimistic' },
  { score: 6, label: 'Very Optimistic' },
  { score: 7, label: 'Extremely Optimistic' },
]

const featuredSections: Array<{ id: Exclude<IndicatorSection, 'indicators'>; label: string; icon: typeof Flame }> = [
  { id: 'favorites', label: 'My Favorites', icon: Star },
  { id: 'popular', label: 'Most Popular', icon: Flame },
]

function selectSection(section: IndicatorSection) {
  store.setSection(section)
}

function selectGroup(group: IndicatorGroup) {
  store.setSection('indicators')
  store.setGroup(group.id)
}

function openIndicator(indicator: Indicator) {
  store.rememberIndicatorSource(indicator.id, indicator.sourceList)
  // Carry the list in the URL so the detail page can restore it, and so returning here
  // lands back on the same list even after a reload.
  router.push({ name: 'indicator-detail', params: { id: indicator.id }, query: { list: store.listKey } })
}

watch(
  () => route.query.list,
  (key) => {
    if (typeof key === 'string' && key) store.setListKey(key)
  },
  { immediate: true },
)

/**
 * Exports the whole list as currently filtered and sorted, not just the visible page.
 */
function downloadListCsv() {
  const { headers, rows } = indicatorCsvTable(store.sortedItems, tableMeta.value.columns)
  if (!rows.length) return

  const isoDate = new Date().toISOString().slice(0, 10)
  downloadCsv(indicatorCsvFilename(currentFullTableName.value, isoDate), toCsv(headers, rows))
}

function setPage(page: number) {
  store.page = Math.max(1, Math.min(page, store.pageCount))
}

function isSortableColumn(column: IndicatorTableColumn) {
  return column.kind !== 'sparkline'
}

function sortDirectionLabel(kind: IndicatorTableColumnKind | undefined, direction: IndicatorSortDirection) {
  if (kind === 'number' || kind === 'change' || kind === 'sentiment') {
    return direction === 'asc' ? 'Low to High' : 'High to Low'
  }

  if (kind === 'date') return direction === 'asc' ? 'Oldest First' : 'Newest First'

  return direction === 'asc' ? 'A to Z' : 'Z to A'
}

function handleSortSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (!value) {
    store.clearSort()
    return
  }

  const [key, direction] = value.split(':') as [string, IndicatorSortDirection]
  const column = sortableColumns.value.find((item) => item.key === key)
  if (!column || (direction !== 'asc' && direction !== 'desc')) return

  store.setSort(column, direction)
}

watch(
  () => [store.activeSection, store.activeGroupId, store.activeSubgroupId],
  () => {
    void store.ensureCurrentList()
  },
  { immediate: true },
)

watch(
  () => [store.searchQuery, store.groupFilter, store.timeFrameFilter, store.sentimentFilter],
  () => {
    store.page = 1
  },
)

watch(
  () => [store.filteredItems.length, store.pageSize],
  () => {
    store.clampPage()
  },
)

watch(
  () => store.pagedItems.map((indicator) => indicator.id).join('|'),
  () => {
    void store.ensureTrendsForIndicators(store.pagedItems)
  },
  { immediate: true },
)
</script>

<template>
  <div class="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
    <main class="px-[var(--page-gutter)] pb-8 pt-8">
      <IndicatorPageHeader
        title="Indicators"
        description="Explore market sentiment, breadth, flow, macro and seasonality."
        :view-mode="store.viewMode"
        @update:view-mode="store.setViewMode"
      />

      <div class="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
          <button
            v-for="section in featuredSections"
            :key="section.id"
            class="mb-1 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition"
            :class="store.activeSection === section.id ? 'bg-[var(--app-primary-soft)] text-[var(--app-text)]' : 'text-[var(--app-text)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-primary)]'"
            type="button"
            @click="selectSection(section.id)"
          >
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
              :class="section.id === 'favorites' ? 'text-[var(--app-favorite)]' : 'text-[var(--app-primary)]'"
            >
              <component :is="section.icon" :size="21" :fill="section.id === 'favorites' ? 'var(--app-favorite)' : 'var(--app-primary)'" />
            </span>
            <span class="min-w-0">
              <span class="block text-sm font-semibold leading-5">{{ section.label }}</span>
            </span>
          </button>
          <div class="my-3 border-t border-[var(--app-border-muted)]" />
          <button
            v-for="group in visibleGroups"
            :key="group.id"
            class="mb-1 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition"
            :class="store.activeSection === 'indicators' && store.activeGroupId === group.id ? 'bg-[var(--app-primary-soft)] text-[var(--app-text)]' : 'text-[var(--app-text)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-primary)]'"
            type="button"
            @click="selectGroup(group)"
          >
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
              :class="store.activeSection === 'indicators' && store.activeGroupId === group.id ? 'text-[var(--app-primary)]' : 'text-[var(--app-text-secondary)]'"
            >
              <component :is="iconMap[group.icon as keyof typeof iconMap]" :size="21" />
            </span>
            <span class="min-w-0">
              <span class="block text-sm font-semibold leading-5">{{ group.label }}</span>
              <span class="block text-xs text-[var(--app-text-muted)]">{{ group.views }} views</span>
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
                  @click="isDescriptionOpen = true"
                >
                  <Info :size="15" />
                  {{ descriptionButtonLabel }}
                </button>
              </div>
              <p class="mt-1 text-sm text-[var(--app-text-muted)]">{{ currentDescription }}</p>
            </div>

            <div class="flex shrink-0 flex-wrap items-center gap-2 text-xs font-semibold">
              <span class="indicator-summary-pill">
                <span class="indicator-summary-pill__dot bg-rose-500" />
                <span class="indicator-summary-pill__text">
                  <span class="indicator-summary-pill__value">{{ store.optimisticCount }}</span>
                  <span class="indicator-summary-pill__label"> optimistic</span>
                </span>
              </span>
              <span class="indicator-summary-pill">
                <span class="indicator-summary-pill__dot bg-emerald-500" />
                <span class="indicator-summary-pill__text">
                  <span class="indicator-summary-pill__value">{{ store.pessimisticCount }}</span>
                  <span class="indicator-summary-pill__label"> pessimistic</span>
                </span>
              </span>
              <span class="indicator-summary-pill">
                <span class="indicator-summary-pill__text">
                  <span class="indicator-summary-pill__value">{{ summaryGroupCount }}</span>
                  <span class="indicator-summary-pill__label"> Groups</span>
                </span>
              </span>
              <span class="indicator-summary-pill">
                <span class="indicator-summary-pill__text">
                  <span class="indicator-summary-pill__value">{{ store.totalIndicators }}</span>
                  <span class="indicator-summary-pill__label"> Indicators</span>
                </span>
              </span>
            </div>
          </header>

          <!-- My Favorites and Most Popular are standalone lists, so they carry no subgroup tabs. -->
          <nav v-if="showSubgroups" class="flex min-w-0 overflow-x-auto border-b border-[var(--app-border)] px-4">
            <button
              v-for="subgroup in store.activeSubgroups"
              :key="subgroup.id"
              class="flex h-14 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold transition"
              :class="store.activeSubgroupId === subgroup.id ? 'border-[var(--app-primary)] text-[var(--app-text)]' : 'border-transparent text-[var(--app-text)] hover:text-[var(--app-primary)]'"
              type="button"
              @click="store.setSubgroup(subgroup.id)"
            >
              <component
                :is="iconMap[subgroup.icon as keyof typeof iconMap]"
                v-if="subgroup.icon && iconMap[subgroup.icon as keyof typeof iconMap]"
                :size="17"
                aria-hidden="true"
              />
              {{ subgroup.label }}
            </button>
          </nav>

          <div class="grid gap-2 px-4 py-3 xl:grid-cols-[minmax(260px,1.7fr)_minmax(160px,0.75fr)_minmax(190px,0.85fr)_minmax(220px,0.95fr)_auto_auto]">
            <label class="flex h-9 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5">
              <Search :size="16" class="mr-2 shrink-0 text-[var(--app-text-muted)]" />
              <input v-model="store.searchQuery" class="w-full bg-transparent text-[0.8125rem] outline-none" placeholder="Search indicators..." />
            </label>
            <select v-model="store.timeFrameFilter" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]">
              <option value="">All Time Frames</option>
              <option>Short</option>
              <option>Medium</option>
              <option>Long</option>
            </select>
            <select v-model="store.sentimentFilter" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]">
              <option value="">All Sentiment Types</option>
              <option value="pessimistic">Pessimistic</option>
              <option value="neutral">Neutral</option>
              <option value="optimistic">Optimistic</option>
            </select>
            <select
              class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]"
              :value="activeSortValue"
              @change="handleSortSelect"
            >
              <option value="">Sort by: Default</option>
              <template v-for="column in sortableColumns" :key="column.key">
                <option :value="`${column.key}:asc`">{{ column.label }}: {{ sortDirectionLabel(column.kind, 'asc') }}</option>
                <option :value="`${column.key}:desc`">{{ column.label }}: {{ sortDirectionLabel(column.kind, 'desc') }}</option>
              </template>
            </select>
            <button
              class="flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[0.8125rem] text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)]"
              type="button"
              @click="store.resetFilters"
            >
              <RotateCcw :size="16" />
              Reset
            </button>
            <button
              class="flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[0.8125rem] text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[var(--app-border)] disabled:hover:text-[var(--app-text-secondary)]"
              type="button"
              :disabled="!store.totalIndicators"
              title="Download this list as CSV"
              @click="downloadListCsv"
            >
              <Download :size="16" />
              CSV
            </button>
          </div>

          <div
            v-if="store.activeSection === 'favorites' && store.legacyFavoriteCount"
            class="mx-4 mb-3 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2 text-sm leading-6 text-[var(--app-text-secondary)]"
          >
            Some favorites come from your classic favorites folder and cannot be removed here.
            Manage those favorites on the
            <a
              class="font-semibold text-[var(--app-primary)] hover:underline"
              href="https://users.sentimentrader.com/users/favorites/"
              target="_blank"
              rel="noopener noreferrer"
            >
              classic favorites page
            </a>.
          </div>

          <div class="px-4 pb-4">
            <IndicatorListTable
              v-if="store.viewMode === 'table'"
              :indicators="store.pagedItems"
              :loading="store.isCurrentSourceLoading"
              :columns="tableMeta.columns"
              compact
              :show-favorite="tableMeta.showFavorite !== false"
              :sort-key="store.sortKey"
              :sort-direction="store.sortDirection"
              @open="openIndicator"
              @favorite="store.toggleFavorite"
              @sort="store.setSort"
            />
            <IndicatorCardGrid
              v-else
              :indicators="store.pagedItems"
              :loading="store.isCurrentSourceLoading"
              :columns="tableMeta.columns"
              @open="openIndicator"
              @favorite="store.toggleFavorite"
            />
          </div>

          <div class="border-t border-[var(--app-border)] px-4 py-3">
            <IndicatorPagination
              :page="store.page"
              :page-count="store.pageCount"
              :total="store.totalIndicators"
              item-label="indicators"
              @change="setPage"
            />
          </div>
        </section>
      </div>
    </main>

    <Teleport to="body">
      <div
        v-if="isDescriptionOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-overlay)] px-4 py-6"
        @click.self="isDescriptionOpen = false"
      >
        <section
          class="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-lg bg-[var(--app-surface)] text-[var(--app-text)] shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="indicator-description-title"
        >
          <header class="flex items-start justify-between gap-4 border-b border-[var(--app-border)] px-5 py-4">
            <div>
              <p class="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">{{ currentFullTableName }}</p>
              <h2 id="indicator-description-title" class="mt-1 text-xl text-[var(--app-text)]">
                {{ descriptionDialogTitle }}
              </h2>
            </div>
            <button
              class="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--app-border)] text-[var(--app-text-subtle)] hover:bg-[var(--app-surface-muted)]"
              type="button"
              aria-label="Close description"
              @click="isDescriptionOpen = false"
            >
              <X :size="18" />
            </button>
          </header>

          <div class="max-h-[calc(86vh-92px)] overflow-y-auto px-5 py-4 text-sm leading-6 text-[var(--app-text-secondary)]">
            <div class="space-y-3">
              <p v-for="paragraph in tableDescriptionParagraphs" :key="paragraph">
                {{ paragraph }}
              </p>
              <p v-if="tableMeta.bulletsIntro">
                {{ tableMeta.bulletsIntro }}
              </p>
              <ul v-if="tableMeta.bullets?.length" class="list-disc space-y-1 pl-5">
                <li v-for="bullet in tableMeta.bullets" :key="bullet">{{ bullet }}</li>
              </ul>
              <p v-for="paragraph in tableMeta.postBullets ?? []" :key="paragraph">
                {{ paragraph }}
              </p>
              <div v-if="tableMeta.showSortNote !== false" class="rounded-md border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2 text-[var(--app-text-subtle)]">
                You can sort the table below by a single column or by multiple columns. To sort by one column, click the column name. To sort by multiple columns, hold Shift and select additional columns.
              </div>
            </div>

            <div v-if="shouldShowLegend" class="mt-5 border-t border-[var(--app-border)] pt-4">
              <h3 class="text-base text-[var(--app-text)]">Optimism/Pessimism Legend</h3>
              <div class="mt-3 grid gap-2 sm:grid-cols-2">
                <div
                  v-for="item in sentimentLegend"
                  :key="item.label"
                  class="flex items-center justify-between gap-3 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                >
                  <span>{{ item.label }}</span>
                  <IndicatorSentimentMeter :score="item.score" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.selected-fill-button {
  color: #ffffff !important;
}

</style>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AlertCircle, LoaderCircle, RotateCcw, Search, Star } from '@lucide/vue'
import { fetchReportFavorites, fetchReportLibrary } from '@/entities/report/api/report.api'
import type { ReportLibraryItem, ReportViewMode } from '@/entities/report/model/report.types'
import IndicatorPagination from '@/pages/indicators/ui/IndicatorPagination.vue'
import ListPageHeader from '@/shared/ui/ListPageHeader.vue'
import ListPagePanel from '@/shared/ui/ListPagePanel.vue'
import ReportCardGrid from './ui/ReportCardGrid.vue'
import ReportListTable from './ui/ReportListTable.vue'

const tagOptions = [
  'All Reports',
  'My Favorites',
  'Daily Report',
  'Bonds',
  'Free for Public',
  'Breadth',
  'SentimentEdge',
  "Kaeppel's Corner",
  'Commodities',
  'Currencies',
  'Macro',
  'Price Patterns',
  'Seasonality',
  'Smart Money',
  'ModelEdge',
  'Models',
  'TradingEdge',
  'Precious Metals',
  'Stocks and Sectors',
] as const

const filterGroups = [
  { title: 'Quick Filters', tags: ['All Reports', 'My Favorites', 'Free for Public'] },
  { title: 'Report Series', tags: ['SentimentEdge', "Kaeppel's Corner", 'ModelEdge', 'TradingEdge', 'Daily Report'] },
  { title: 'Markets & Economy', tags: ['Stocks and Sectors', 'Macro', 'Bonds', 'Commodities', 'Precious Metals', 'Currencies'] },
  { title: 'Research Topics', tags: ['Smart Money', 'Breadth', 'Price Patterns', 'Seasonality', 'Models'] },
] as const

const route = useRoute()
const router = useRouter()
const currentYear = new Date().getFullYear()
const archiveYears = Array.from({ length: currentYear - 2012 + 1 }, (_, index) => currentYear - index)
const reportPlaceholderImage = 'https://cdn.prod.website-files.com/650486dd4239644e595569c1/650486dd4239644e59556a2e_ST%20Placeholder%203.jpg'

const viewMode = ref<ReportViewMode>('table')
const query = ref('')
const submittedQuery = ref('')
const activeTag = ref<string>('All Reports')
const sortDirection = ref<'newest' | 'oldest'>('newest')
const reports = ref<ReportLibraryItem[]>([])
const isLoading = ref(true)
const loadError = ref('')
const page = ref(1)
const archiveYear = ref(currentYear)
const hasMore = ref(false)
const totalReports = ref<number | null>(null)
const pageSize = ref(0)
let requestController: AbortController | null = null
let isApplyingRoute = false
let isInitialized = false

const pageCount = computed(() => {
  if (totalReports.value && pageSize.value) return Math.max(1, Math.ceil(totalReports.value / pageSize.value))
  return hasMore.value ? page.value + 1 : page.value
})

const visibleTagOptions = computed<readonly string[]>(() => (
  tagOptions.some((tag) => tag === activeTag.value) ? tagOptions : [...tagOptions, activeTag.value]
))

const visibleFilterGroups = computed(() => {
  if (tagOptions.some((tag) => tag === activeTag.value)) return filterGroups
  return [...filterGroups, { title: 'Selected Tag', tags: [activeTag.value] }]
})

const filteredReports = computed(() => {
  const direction = sortDirection.value === 'oldest' ? 1 : -1
  return [...reports.value].sort((left, right) => direction * left.publishedAt.localeCompare(right.publishedAt))
})

async function searchReports(targetPage = 1) {
  if (activeTag.value === 'My Favorites') return
  const searchTerm = query.value.trim()
  submittedQuery.value = searchTerm
  page.value = targetPage
  totalReports.value = null
  hasMore.value = false
  if (!searchTerm) {
    await loadReports()
    return
  }
  requestController?.abort()
  requestController = new AbortController()
  isLoading.value = true
  loadError.value = ''
  try {
    const result = await fetchReportLibrary({ search: searchTerm, page: targetPage }, requestController.signal)
    reports.value = result.items.map((item) => ({
      ...item,
      imageUrl: item.imageUrl || reportPlaceholderImage,
      href: `${item.href}?from=${encodeURIComponent(item.category || 'All Reports')}`,
    }))
    totalReports.value = result.count
    if (result.items.length && (targetPage === 1 || !pageSize.value)) pageSize.value = result.items.length
    hasMore.value = result.hasMore
  } catch {
    reports.value = []
    loadError.value = 'We could not search reports. Please try again.'
  } finally {
    isLoading.value = false
  }
}

function requestQuery(targetPage: number) {
  const productCategories: Record<string, string> = {
    'Free for Public': 'public',
    SentimentEdge: 'sentimentedge',
    "Kaeppel's Corner": 'quantedge',
    ModelEdge: 'modeledge',
    TradingEdge: 'tradingedge',
    'Market Impact Analysis': 'impactedge',
  }
  if (activeTag.value === 'Daily Report') return { page: targetPage, archiveYear: archiveYear.value }
  const userLevel = productCategories[activeTag.value]
  if (userLevel) return { page: targetPage, userLevel }
  if (activeTag.value !== 'All Reports') return { page: targetPage, tag: activeTag.value }
  return targetPage > 1 ? { page: targetPage } : {}
}

function routePage() {
  const value = Number(route.params.page ?? route.query.page)
  return Number.isInteger(value) && value > 0 ? value : 1
}

function applyRouteFilters() {
  page.value = routePage()
  if (route.path.toLowerCase().replace(/\/$/, '') === '/mr/favorites') {
    activeTag.value = 'My Favorites'
    return
  }
  const legacyTag = typeof route.query.tag === 'string' ? route.query.tag : ''
  if (tagOptions.some((tag) => tag === legacyTag) || legacyTag === 'Market Impact Analysis') {
    activeTag.value = legacyTag
    return
  }
  if (route.name === 'reports-by-tag') {
    const routeTag = String(route.params.blogTag ?? '')
    activeTag.value = routeTag || 'All Reports'
    return
  }
  if (route.name === 'daily-report-archives' || route.name === 'old-daily-report-archives') {
    const year = Number(route.params.year)
    archiveYear.value = archiveYears.includes(year) ? year : currentYear
    activeTag.value = 'Daily Report'
    return
  }
  if (route.path.toLowerCase().startsWith('/mr/impactedge')) {
    activeTag.value = 'Market Impact Analysis'
    return
  }
  const productRoutes: Record<string, string> = {
    '/mr/sentimentedge': 'All Reports',
    '/mr/public': 'Free for Public',
    '/mr/modeledge': 'ModelEdge',
    '/mr/quantedge': "Kaeppel's Corner",
    '/mr/kaeppelscorner': "Kaeppel's Corner",
    '/mr/tradingedge': 'TradingEdge',
    '/mr/reports': 'All Reports',
  }
  const productTag = productRoutes[route.path.toLowerCase().replace(/\/$/, '')]
  if (productTag) {
    activeTag.value = productTag
    return
  }
}

async function loadReports() {
  requestController?.abort()
  requestController = new AbortController()
  isLoading.value = true
  loadError.value = ''
  try {
    const result = activeTag.value === 'My Favorites'
      ? await fetchReportFavorites(page.value, requestController.signal)
      : await fetchReportLibrary(requestQuery(page.value), requestController.signal)
    const context = new URLSearchParams({ from: activeTag.value })
    if (activeTag.value === 'Daily Report') context.set('year', String(archiveYear.value))
    if (page.value > 1) context.set('page', String(page.value))
    reports.value = result.items.map((item) => ({ ...item, href: `${item.href}?${context.toString()}` }))
    totalReports.value = result.count
    if (result.items.length && (page.value === 1 || !pageSize.value)) pageSize.value = result.items.length
    hasMore.value = result.hasMore
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    loadError.value = 'We could not load the report library. Please try again.'
  } finally {
    isLoading.value = false
  }
}

function changePage(targetPage: number) {
  if (activeTag.value === 'My Favorites') {
    page.value = targetPage
    void loadReports()
    return
  }
  if (submittedQuery.value) {
    void searchReports(targetPage)
    return
  }
  if (activeTag.value === 'Daily Report') {
    const routeName = archiveYear.value <= 2019 ? 'old-daily-report-archives' : 'daily-report-archives'
    void router.push({ name: routeName, params: { year: archiveYear.value, page: targetPage > 1 ? targetPage : undefined } })
    return
  }
  if (route.name === 'reports-by-tag') {
    void router.push({ name: 'reports-by-tag', params: { blogTag: activeTag.value, page: targetPage > 1 ? targetPage : undefined } })
    return
  }
  page.value = targetPage
  void loadReports()
}

onMounted(() => {
  isApplyingRoute = true
  applyRouteFilters()
  isApplyingRoute = false
  isInitialized = true
  void loadReports()
})
onBeforeUnmount(() => requestController?.abort())

watch(activeTag, () => {
  if (!isInitialized || isApplyingRoute) return
  query.value = ''
  submittedQuery.value = ''
  reports.value = []
  page.value = 1
  hasMore.value = false
  if (activeTag.value === 'My Favorites') {
    void router.push('/MR/favorites')
    return
  }
  if (activeTag.value === 'Daily Report') {
    const routeName = archiveYear.value <= 2019 ? 'old-daily-report-archives' : 'daily-report-archives'
    void router.push({ name: routeName, params: { year: archiveYear.value } })
    return
  }
  const productPaths: Record<string, string> = {
    'All Reports': '/MR/reports',
    'Free for Public': '/MR/public',
    SentimentEdge: '/MR/sentimentedge?tag=SentimentEdge',
    "Kaeppel's Corner": `/MR/quantedge?tag=${encodeURIComponent("Kaeppel's Corner")}`,
    ModelEdge: '/MR/modeledge?tag=ModelEdge',
    TradingEdge: '/MR/tradingedge?tag=TradingEdge',
    'Market Impact Analysis': `/MR/impactedge?tag=${encodeURIComponent('Market Impact Analysis')}`,
  }
  const productPath = productPaths[activeTag.value]
  if (productPath) {
    void router.push(productPath)
    return
  }
  void router.push({ name: 'reports-by-tag', params: { blogTag: activeTag.value } })
}, { flush: 'sync' })

watch(archiveYear, () => {
  if (!isInitialized || isApplyingRoute || activeTag.value !== 'Daily Report') return
  const routeName = archiveYear.value <= 2019 ? 'old-daily-report-archives' : 'daily-report-archives'
  void router.push({ name: routeName, params: { year: archiveYear.value } })
}, { flush: 'sync' })

watch(() => route.fullPath, () => {
  if (!isInitialized) return
  isApplyingRoute = true
  applyRouteFilters()
  isApplyingRoute = false
  reports.value = []
  hasMore.value = false
  void loadReports()
}, { flush: 'sync' })

function resetFilters() {
  const needsReload = activeTag.value === 'All Reports'
  query.value = ''
  submittedQuery.value = ''
  activeTag.value = 'All Reports'
  sortDirection.value = 'newest'
  if (needsReload) void loadReports()
}
</script>

<template>
  <div class="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
    <main class="px-[var(--page-gutter)] pb-8 pt-8">
      <ListPageHeader
        title="Search our Library"
        description="Explore our vast report library, a resource packed with data-driven insights and expert market perspectives."
        :view-mode="viewMode"
        table-view-label="List"
        :ads="[]"
        @update:view-mode="viewMode = $event"
      />

      <ListPagePanel title="Report Library" :description="`${filteredReports.length} reports available`" hide-header>
        <template #filters>
          <div class="report-filter-groups" aria-label="Report categories">
            <section v-for="group in visibleFilterGroups" :key="group.title" class="report-filter-group">
              <h3>{{ group.title }}</h3>
              <div>
                <button
                  v-for="tag in group.tags"
                  :key="tag"
                  class="report-filter-pill"
                  :class="{ 'report-filter-pill--active': activeTag === tag }"
                  type="button"
                  :aria-pressed="activeTag === tag"
                  @click="activeTag = tag"
                >
                  {{ tag }}
                </button>
              </div>
            </section>
          </div>
        </template>

        <form class="flex flex-wrap items-center gap-2 border-y border-[var(--app-border)] p-4" role="search" @submit.prevent="searchReports(1)">
          <label v-if="activeTag !== 'My Favorites'" class="flex h-9 min-w-0 flex-1 basis-64 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 transition focus-within:border-[var(--app-primary)]">
            <Search :size="17" class="mr-2 shrink-0 text-[var(--app-text-muted)]" />
            <input
              v-model="query"
              class="w-full bg-transparent text-[0.8125rem] text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-muted)]"
              placeholder="Search Blog Posts and Daily Reports..."
              type="search"
              autocomplete="off"
            />
          </label>
          <button v-if="activeTag !== 'My Favorites'" class="flex h-9 items-center justify-center rounded-md bg-[var(--app-primary)] px-4 text-[0.8125rem] font-semibold text-white transition hover:bg-[var(--app-primary-hover)]" type="submit">
            Search
          </button>
          <template v-if="activeTag === 'Daily Report'">
            <label for="report-archive-year" class="text-[0.8125rem] font-semibold text-[var(--app-text-secondary)]">Archives by year</label>
            <select
              id="report-archive-year"
              v-model.number="archiveYear"
              class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]"
            >
              <option v-for="year in archiveYears" :key="year" :value="year">{{ year }} Archives</option>
            </select>
          </template>
          <select v-model="sortDirection" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]" aria-label="Sort reports">
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
          </select>
          <select v-if="activeTag !== 'My Favorites'" v-model="activeTag" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]" aria-label="Report category">
            <option v-for="(tag, index) in visibleTagOptions" :key="tag" :value="tag">{{ index === 0 ? `Access: ${tag}` : tag }}</option>
          </select>
          <button
            class="flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[0.8125rem] text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)]"
            type="button"
            @click="resetFilters"
          >
            <RotateCcw :size="16" /> Reset
          </button>
        </form>

        <div v-if="isLoading" class="flex min-h-72 flex-col items-center justify-center px-6 text-center text-[var(--app-text-muted)]">
          <LoaderCircle :size="30" class="animate-spin text-[var(--app-primary)]" />
          <p class="mt-3 text-sm font-semibold">Loading reports...</p>
        </div>
        <div v-else-if="loadError" class="flex min-h-72 flex-col items-center justify-center px-6 text-center">
          <AlertCircle :size="30" class="text-[var(--app-negative)]" />
          <h2 class="mt-3 text-lg font-extrabold">Unable to load reports</h2>
          <p class="mt-1 text-sm text-[var(--app-text-muted)]">{{ loadError }}</p>
          <button class="mt-4 rounded-md bg-[var(--app-primary)] px-4 py-2 text-sm font-bold text-white" type="button" @click="loadReports()">Try again</button>
        </div>
        <div v-else-if="!filteredReports.length" class="flex min-h-72 flex-col items-center justify-center px-6 text-center">
          <component :is="activeTag === 'My Favorites' ? Star : Search" :size="30" class="text-[var(--app-text-muted)]" />
          <template v-if="activeTag === 'My Favorites'">
            <h2 class="mt-3 text-lg font-extrabold">No favorites yet</h2>
            <p class="mt-1 text-sm text-[var(--app-text-muted)]">Open a report and tap the star icon to save it here.</p>
            <button class="mt-4 rounded-md bg-[var(--app-primary)] px-4 py-2 text-sm font-bold text-white" type="button" @click="resetFilters">View all reports</button>
          </template>
          <template v-else>
            <h2 class="mt-3 text-lg font-extrabold">No reports found</h2>
            <p class="mt-1 text-sm text-[var(--app-text-muted)]">{{ submittedQuery ? `No Blog Posts or Daily Reports matched “${submittedQuery}”.` : 'Try another report category.' }}</p>
            <button class="mt-4 rounded-md bg-[var(--app-primary)] px-4 py-2 text-sm font-bold text-white" type="button" @click="resetFilters">View all reports</button>
          </template>
        </div>
        <ReportListTable v-else-if="viewMode === 'table'" :reports="filteredReports" />
        <ReportCardGrid v-else :reports="filteredReports" />

        <div v-if="!isLoading && !loadError && filteredReports.length" class="border-t border-[var(--app-border)] px-4 py-4">
          <IndicatorPagination
            :page="page"
            :page-count="pageCount"
            :total="totalReports ?? filteredReports.length"
            item-label="reports"
            @change="changePage"
          />
        </div>
      </ListPagePanel>
    </main>
  </div>
</template>

<style scoped>
.report-filter-groups { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; margin: .75rem 1rem; overflow: hidden; border: 1px solid var(--app-border); border-radius: .8rem; background: var(--app-surface); }
.report-filter-group { min-width: 0; padding: 1rem; border-left: 1px solid var(--app-border-muted); }
.report-filter-group:first-child { grid-column: 1 / -1; border-bottom: 1px solid var(--app-border-muted); border-left: 0; }
.report-filter-group:nth-child(2) { border-left: 0; }
.report-filter-group h3 { margin: 0 0 .7rem; color: var(--app-text-muted); font-size: .72rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.report-filter-group > div { display: flex; flex-wrap: wrap; gap: .55rem; }
.report-filter-pill { min-height: 38px; border: 1px solid var(--app-border-strong); border-radius: 999px; padding: .5rem 1rem; color: var(--app-text-secondary); background: var(--app-surface); font-size: .8rem; font-weight: 700; transition: border-color 150ms ease, color 150ms ease, background 150ms ease; }
.report-filter-pill:hover { border-color: var(--app-primary); color: var(--app-primary); }
.report-filter-pill--active { border-color: var(--app-primary); color: white; background: var(--app-primary); box-shadow: 0 4px 12px color-mix(in srgb, var(--app-primary) 22%, transparent); }
@media (max-width: 900px) { .report-filter-groups { grid-template-columns: minmax(0, 1fr); } .report-filter-group, .report-filter-group:nth-child(2) { grid-column: auto; border-top: 1px solid var(--app-border-muted); border-left: 0; } .report-filter-group:first-child { grid-column: auto; border-top: 0; } }
</style>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  BellRing,
  Filter,
  ListChecks,
  Play,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from '@lucide/vue'
import {
  copyMySignal,
  deleteMySignal,
  fetchMySignals,
  fetchMySignalSubscription,
  runAllMySignals,
  updateMySignalSubscription,
} from '@/entities/my-stuff/api/my-signal.api'
import type { MySignalListKind, MySignalRow } from '@/entities/my-stuff/model/my-signal.types'
import ListExplorerPage from '@/shared/ui/ListExplorerPage.vue'
import IndicatorPagination from '@/pages/indicators/ui/IndicatorPagination.vue'
import { useSortedPagedRows, type SortableValue } from '@/pages/indicators/composables/useSortedPagedRows'
import type { IndicatorTableColumnKind } from '@/entities/indicator/model/indicator.table'
import MySignalTable from './ui/MySignalTable.vue'
import SignalPreviewModal from './ui/SignalPreviewModal.vue'
import MyIndicatorTable from './ui/MyIndicatorTable.vue'
import IndicatorPreviewModal from './ui/IndicatorPreviewModal.vue'
import MyScreenWorkspace from './ui/MyScreenWorkspace.vue'
import WatchListWorkspace from './ui/WatchListWorkspace.vue'
import { deleteMyIndicator, fetchMyIndicators, fetchRelatedMyIndicatorBacktestCount, type MyIndicatorRow } from '@/entities/my-stuff/api/user-indicator.api'

type MyStuffSection = 'signals' | 'indicators' | 'screens' | 'watchlist'

const route = useRoute()
const router = useRouter()
const abortController = new AbortController()
const sections = [
  { key: 'signals' as const, label: 'My Signal', path: '/my-stuff/signals', description: 'Create and monitor custom market signals.', icon: BellRing },
  { key: 'indicators' as const, label: 'My Indicator', path: '/my-stuff/indicators', description: 'Build and manage personal indicators.', icon: SlidersHorizontal },
  { key: 'screens' as const, label: 'My Screen', path: '/my-stuff/screens', description: 'Save and run stock screens.', icon: Filter },
  { key: 'watchlist' as const, label: 'My Watch List', path: '/my-stuff/watchlist', description: 'Keep the symbols you follow together.', icon: ListChecks },
]

const activeSection = computed<MyStuffSection>(() => {
  const value = typeof route.params.section === 'string' ? route.params.section : 'signals'
  return sections.some((item) => item.key === value) ? value as MyStuffSection : 'signals'
})
const activeConfig = computed(() => sections.find((item) => item.key === activeSection.value) ?? sections[0])
const isSignals = computed(() => activeSection.value === 'signals')
const isIndicators = computed(() => activeSection.value === 'indicators')
const isScreens = computed(() => activeSection.value === 'screens')
const isWatchList = computed(() => activeSection.value === 'watchlist')

const listKind = ref<MySignalListKind>('mine')
/** Flips to true after copying a signal, so fresh copies sort to the top by create date. */
const sortCopiesFirst = ref(route.query.copied === '1')
const rows = ref<MySignalRow[]>([])
const loading = ref(false)
const actionLoading = ref(false)
const errorMessage = ref('')
const noticeMessage = ref('')
const query = ref('')
const timeframe = ref('')
const pageSize = 10
const emailAlerts = ref(false)
const subscriptionLoading = ref(false)
const previewRow = ref<MySignalRow | null>(null)
const indicatorRows = ref<MyIndicatorRow[]>([])
const indicatorLoading = ref(false)
const indicatorDeletingId = ref('')
const indicatorError = ref('')
const indicatorQuery = ref('')
const indicatorCategory = ref('')
const indicatorTimeframe = ref('')
const previewIndicator = ref<MyIndicatorRow | null>(null)
const screenCount = ref(0)
const screenView = ref<'saved' | 'build'>('saved')
const screenMode = ref<'create' | 'edit' | 'view'>('create')
const screenWorkspace = ref<InstanceType<typeof MyScreenWorkspace> | null>(null)
const panelTitle = computed(() => {
  if (!isScreens.value || screenView.value === 'saved') return activeConfig.value.label
  if (screenMode.value === 'edit') return 'Edit Screen'
  if (screenMode.value === 'view') return 'Screen Configuration'
  return 'Create New Screen'
})

const timeframeOptions = computed(() => Array.from(new Set(rows.value.map((row) => row.timeframe).filter((value) => value && value !== '-'))).sort())
const filteredRows = computed(() => {
  const term = query.value.trim().toLowerCase()
  return rows.value
    .filter((row) => !term || [row.name, row.symbol, row.description, row.category].some((value) => value.toLowerCase().includes(term)))
    .filter((row) => !timeframe.value || row.timeframe === timeframe.value)
})

const signalSortOptions = [
  { key: 'lastSignalDate', label: 'Last signal', kind: 'date' as IndicatorTableColumnKind },
  { key: 'name', label: 'Name', kind: 'text' as IndicatorTableColumnKind },
  { key: 'symbol', label: 'Symbol', kind: 'text' as IndicatorTableColumnKind },
  { key: 'timeframe', label: 'Timeframe', kind: 'text' as IndicatorTableColumnKind },
  { key: 'barsSinceSignal', label: 'Bars since signal', kind: 'number' as IndicatorTableColumnKind },
  { key: 'currentReturn', label: 'Return since signal', kind: 'number' as IndicatorTableColumnKind },
]

function mySignalSortValue(row: MySignalRow, key: string): SortableValue {
  if (key === 'createDate') return row.createDate ? Date.parse(row.createDate) : null
  if (key === 'lastSignalDate') return row.lastSignalDate ? Date.parse(row.lastSignalDate) : null
  if (key === 'barsSinceSignal') return row.barsSinceSignal
  if (key === 'currentReturn') return row.currentReturn
  if (key === 'name') return row.name
  if (key === 'symbol') return row.symbol
  if (key === 'timeframe') return row.timeframe
  return null
}

const signalTable = useSortedPagedRows<MySignalRow>(filteredRows, mySignalSortValue, pageSize)

const indicatorCategories = computed(() => [...new Set(indicatorRows.value.map((row) => row.category))].sort())
const indicatorTimeframes = computed(() => [...new Set(indicatorRows.value.map((row) => row.timeframe).filter((value) => value !== '-'))].sort())
const filteredIndicators = computed(() => {
  const term = indicatorQuery.value.trim().toLowerCase()
  return indicatorRows.value.filter((row) =>
    (!term || [row.name, row.category, ...row.included.map((item) => item.name)].some((value) => value.toLowerCase().includes(term)))
    && (!indicatorCategory.value || row.category === indicatorCategory.value)
    && (!indicatorTimeframe.value || row.timeframe === indicatorTimeframe.value),
  )
})
const indicatorTable = useSortedPagedRows<MyIndicatorRow>(filteredIndicators, (row, key) => {
  if (key === 'createdAt') return Date.parse(row.createdAt) || null
  if (key === 'name') return row.name
  if (key === 'category') return row.category
  if (key === 'timeframe') return row.timeframe
  return null
}, pageSize)
indicatorTable.setSort({ key: 'createdAt', kind: 'date' }, 'desc')

/** Default listing order: Last signal first, except right after a copy, when the freshest copies lead. */
function applyDefaultSort() {
  signalTable.reset()
  if (listKind.value === 'mine' && sortCopiesFirst.value) {
    signalTable.setSort({ key: 'createDate', kind: 'date' }, 'desc')
  } else {
    signalTable.setSort({ key: 'lastSignalDate', kind: 'date' }, 'desc')
  }
}

applyDefaultSort()

if (route.query.copied === '1') {
  noticeMessage.value = 'Signal duplicated successfully.'
  void router.replace({ path: route.path })
}

const pagedRows = computed(() => signalTable.pagedRows.value)
const pageCount = computed(() => signalTable.pageCount.value)
const activePage = computed(() => signalTable.page.value)
const activeSortValue = computed(() => {
  if (!signalTable.sortKey.value || !signalSortOptions.some((option) => option.key === signalTable.sortKey.value)) return ''
  return `${signalTable.sortKey.value}:${signalTable.sortDirection.value}`
})
const triggeredCount = computed(() => rows.value.filter((row) => row.lastSignalDate).length)
const positiveCount = computed(() => rows.value.filter((row) => (row.currentReturn ?? 0) > 0).length)

function sortDirectionLabel(kind: IndicatorTableColumnKind, direction: 'asc' | 'desc') {
  if (kind === 'number' || kind === 'change' || kind === 'sentiment') {
    return direction === 'asc' ? 'Low to High' : 'High to Low'
  }
  if (kind === 'date') return direction === 'asc' ? 'Oldest First' : 'Newest First'
  return direction === 'asc' ? 'A to Z' : 'Z to A'
}

function handleSortSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value

  if (!value) {
    signalTable.reset()
    return
  }

  const [key, direction] = value.split(':') as [string, 'asc' | 'desc']
  const option = signalSortOptions.find((item) => item.key === key)
  if (!option || (direction !== 'asc' && direction !== 'desc')) return

  signalTable.setSort({ key: option.key, kind: option.kind }, direction)
}

function handleTableSort(key: string) {
  const option = signalSortOptions.find((item) => item.key === key)
  signalTable.sort({ key, kind: option?.kind ?? 'text' })
}

function setActivePage(next: number) {
  signalTable.setPage(next)
}

async function loadRows() {
  if (!isSignals.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    rows.value = await fetchMySignals(listKind.value, abortController.signal)
  } catch (error) {
    rows.value = []
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load signals.'
  } finally {
    loading.value = false
  }
}

async function loadIndicators() {
  if (!isIndicators.value) return
  indicatorLoading.value = true
  indicatorError.value = ''
  try {
    indicatorRows.value = await fetchMyIndicators(abortController.signal)
  } catch (error) {
    indicatorRows.value = []
    indicatorError.value = error instanceof Error ? error.message : 'Unable to load indicators.'
  } finally {
    indicatorLoading.value = false
  }
}

function resetIndicatorFilters() {
  indicatorQuery.value = ''
  indicatorCategory.value = ''
  indicatorTimeframe.value = ''
  indicatorTable.setPage(1)
}
function handleIndicatorSort(key: string) { indicatorTable.sort({ key, kind: 'text' }) }
function openIndicatorBuilder() { void router.push({ name: 'my-indicator-new' }) }
function editIndicator(row: MyIndicatorRow) {
  previewIndicator.value = null
  void router.push({ name: 'my-indicator-edit', query: { url: row.url } })
}
async function handleIndicatorDelete(row: MyIndicatorRow) {
  if (indicatorDeletingId.value) return
  indicatorDeletingId.value = row.id
  try {
    const relatedCount = await fetchRelatedMyIndicatorBacktestCount(row.url, abortController.signal)
    if (relatedCount > 0) {
      showNotice(`“${row.name}” is used by ${relatedCount} related backtest${relatedCount === 1 ? '' : 's'} and cannot be deleted.`)
      return
    }
    if (!window.confirm(`Delete “${row.name}”? This action cannot be undone.`)) return
    await deleteMyIndicator(row.url, abortController.signal)
    if (previewIndicator.value?.id === row.id) previewIndicator.value = null
    showNotice(`Deleted “${row.name}”.`)
    await loadIndicators()
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'Indicator could not be deleted.')
  } finally {
    indicatorDeletingId.value = ''
  }
}

async function loadSubscription() {
  try {
    emailAlerts.value = await fetchMySignalSubscription(abortController.signal)
  } catch {
    emailAlerts.value = false
  }
}

async function toggleSubscription() {
  const next = !emailAlerts.value
  subscriptionLoading.value = true
  try {
    await updateMySignalSubscription(next, abortController.signal)
    emailAlerts.value = next
    showNotice(next ? 'Email alerts enabled.' : 'Email alerts disabled.')
  } catch {
    showNotice('Email alert preference could not be updated.')
  } finally {
    subscriptionLoading.value = false
  }
}

function showNotice(message: string) {
  noticeMessage.value = message
  window.setTimeout(() => { if (noticeMessage.value === message) noticeMessage.value = '' }, 3200)
}

function resetFilters() {
  query.value = ''
  timeframe.value = ''
  sortCopiesFirst.value = false
  applyDefaultSort()
}

function switchList(kind: MySignalListKind) {
  if (listKind.value === kind) return
  // Switching tabs drops the "fresh copies first" ordering with it.
  sortCopiesFirst.value = false
  listKind.value = kind
}

function openEditor(row: MySignalRow | null = null) {
  if (row) {
    void router.push({ name: 'my-signal-edit', params: { id: row.id } })
    return
  }
  void router.push({ name: 'my-signal-new' })
}

function viewFromPreview(row: MySignalRow) {
  previewRow.value = null
  if (listKind.value === 'mine') openEditor(row)
}

async function copyFromPreview(row: MySignalRow) {
  await handleCopy(row)
  previewRow.value = null
}

async function handleCopy(row: MySignalRow) {
  actionLoading.value = true
  try {
    await copyMySignal(row, abortController.signal)
    showNotice(`Copied “${row.name}”.`)
    listKind.value = 'mine'
    // Fresh copies lead the list until the tab or filters reset the ordering.
    sortCopiesFirst.value = true
    applyDefaultSort()
    await loadRows()
  } catch {
    showNotice('Signal could not be copied.')
  } finally {
    actionLoading.value = false
  }
}

async function handleDelete(row: MySignalRow) {
  if (!window.confirm(`Delete “${row.name}”?`)) return
  actionLoading.value = true
  try {
    await deleteMySignal(row.url, abortController.signal)
    showNotice(`Deleted “${row.name}”.`)
    await loadRows()
  } catch {
    showNotice('Signal could not be deleted.')
  } finally {
    actionLoading.value = false
  }
}

async function handleRunAll() {
  actionLoading.value = true
  try {
    await runAllMySignals(abortController.signal)
    showNotice('All signals have been queued to run.')
    await loadRows()
  } catch {
    showNotice('Signals could not be run.')
  } finally {
    actionLoading.value = false
  }
}

watch(listKind, () => {
  // My Signals and Signal Library keep independent sort state; switching tabs restores the default order.
  applyDefaultSort()
  void loadRows()
})
watch([query, timeframe], () => { signalTable.setPage(1) })
watch(() => route.params.section, (value) => {
  if (typeof value === 'string' && !sections.some((item) => item.key === value)) void router.replace('/my-stuff/signals')
  if (value === 'indicators' && !indicatorRows.value.length) void loadIndicators()
})
watch([indicatorQuery, indicatorCategory, indicatorTimeframe], () => indicatorTable.setPage(1))

onMounted(() => { void Promise.all([loadRows(), loadSubscription(), loadIndicators()]) })
onBeforeUnmount(() => abortController.abort())
</script>

<template>
  <ListExplorerPage
    title="My Stuff"
    description="Your personal indicators, signals, screens and watch lists."
    :panel-title="panelTitle"
    :panel-description="activeConfig.description"
    :show-view-mode-toggle="false"
  >
    <template #sidebar>
      <aside class="h-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
        <RouterLink
          v-for="section in sections"
          :key="section.key"
          class="mb-1 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition"
          :class="activeSection === section.key ? 'bg-[var(--app-primary-soft)] text-[var(--app-text)]' : 'text-[var(--app-text)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-primary)]'"
          :to="section.path"
        >
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" :class="activeSection === section.key ? 'text-[var(--app-primary)]' : 'text-[var(--app-text-secondary)]'">
            <component :is="section.icon" :size="21" />
          </span>
          <span class="min-w-0"><span class="block text-sm font-semibold leading-5">{{ section.label }}</span><span class="block truncate text-xs text-[var(--app-text-muted)]">{{ section.description }}</span></span>
        </RouterLink>
      </aside>
    </template>

    <template v-if="isSignals" #title-actions>
      <button class="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-xs font-bold text-[var(--app-text-secondary)] hover:bg-[var(--app-primary-soft)]" type="button" :disabled="subscriptionLoading" @click="toggleSubscription">
        <span class="relative h-4 w-7 rounded-full transition" :class="emailAlerts ? 'bg-[var(--app-primary)]' : 'bg-[var(--app-border-strong)]'"><span class="absolute top-0.5 h-3 w-3 rounded-full bg-white transition" :class="emailAlerts ? 'left-3.5' : 'left-0.5'" /></span>
        Email alerts
      </button>
    </template>
    <template v-else-if="isScreens && screenView === 'build'" #title-actions>
      <button class="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-xs font-bold text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-soft)]" type="button" @click="screenWorkspace?.showSaved()"><ArrowLeft :size="15" />Back to list</button>
    </template>

    <template v-if="isSignals" #summary>
      <span class="indicator-summary-pill"><span class="indicator-summary-pill__dot bg-sky-500" /><span><strong>{{ rows.length }}</strong> signals</span></span>
      <span class="indicator-summary-pill"><span class="indicator-summary-pill__dot bg-emerald-500" /><span><strong>{{ triggeredCount }}</strong> triggered</span></span>
      <span class="indicator-summary-pill"><span class="indicator-summary-pill__dot bg-violet-500" /><span><strong>{{ positiveCount }}</strong> positive</span></span>
    </template>
    <template v-else-if="isIndicators" #summary>
      <span class="indicator-summary-pill"><span class="indicator-summary-pill__dot bg-violet-500" /><span><strong>{{ indicatorRows.length }}</strong> indicators</span></span>
      <span class="indicator-summary-pill"><span class="indicator-summary-pill__dot bg-sky-500" /><span><strong>{{ indicatorCategories.length }}</strong> categories</span></span>
    </template>
    <template v-else-if="isScreens && screenView === 'saved'" #summary>
      <span class="indicator-summary-pill"><span class="indicator-summary-pill__dot bg-violet-500" /><span><strong>{{ screenCount }}</strong> screens</span></span>
    </template>

    <template v-if="isSignals" #tabs>
      <div class="flex items-center justify-between gap-3 border-b border-[var(--app-border)] px-4 pt-1">
        <div class="flex">
          <button v-for="tab in [{ key: 'mine', label: 'My Signals' }, { key: 'library', label: 'Signal Library' }]" :key="tab.key" class="border-b-2 px-4 py-3 text-sm font-extrabold transition" :class="listKind === tab.key ? 'border-[var(--app-primary)] text-[var(--app-primary)]' : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'" type="button" @click="switchList(tab.key as MySignalListKind)">{{ tab.label }}</button>
        </div>
        <button class="mb-1 inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--app-primary)] px-3 text-sm font-extrabold text-white hover:bg-[var(--app-primary-hover)]" type="button" @click="openEditor()"><Plus :size="17" />New Signal</button>
      </div>
    </template>

    <template v-if="isSignals" #filters>
      <div class="grid gap-2 border-b border-[var(--app-border-muted)] px-4 py-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.4fr)_180px_210px_auto_auto]">
        <label class="flex h-9 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5"><Search :size="16" class="mr-2 text-[var(--app-text-muted)]" /><input v-model="query" class="w-full bg-transparent text-sm outline-none" placeholder="Search name, symbol or signal..." /></label>
        <select v-model="timeframe" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm"><option value="">All Timeframes</option><option v-for="option in timeframeOptions" :key="option">{{ option }}</option></select>
        <select class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm" :value="activeSortValue" @change="handleSortSelect"><option value="">Sort by: Default</option><template v-for="option in signalSortOptions" :key="option.key"><option :value="`${option.key}:asc`">{{ option.label }}: {{ sortDirectionLabel(option.kind, 'asc') }}</option><option :value="`${option.key}:desc`">{{ option.label }}: {{ sortDirectionLabel(option.kind, 'desc') }}</option></template></select>
        <button class="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] px-3 text-sm font-bold text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-soft)]" type="button" @click="resetFilters"><RefreshCw :size="15" />Reset</button>
        <button v-if="listKind === 'mine'" class="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] px-3 text-sm font-bold text-[var(--app-primary)] hover:bg-[var(--app-primary-soft)] disabled:opacity-50" type="button" :disabled="actionLoading" @click="handleRunAll"><Play :size="15" />Run All</button>
      </div>
    </template>
    <template v-else-if="isIndicators" #filters>
      <div class="grid gap-2 border-b border-[var(--app-border-muted)] px-4 py-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.4fr)_210px_180px_auto_auto]">
        <label class="flex h-9 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5"><Search :size="16" class="mr-2 text-[var(--app-text-muted)]" /><input v-model="indicatorQuery" class="w-full bg-transparent text-sm outline-none" placeholder="Search indicators..." /></label>
        <select v-model="indicatorCategory" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm"><option value="">All Categories</option><option v-for="option in indicatorCategories" :key="option">{{ option }}</option></select>
        <select v-model="indicatorTimeframe" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm"><option value="">All Timeframes</option><option v-for="option in indicatorTimeframes" :key="option">{{ option }}</option></select>
        <button class="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] px-3 text-sm font-bold text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-soft)]" type="button" @click="resetIndicatorFilters"><RefreshCw :size="15" />Reset</button>
        <button class="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[var(--app-primary)] px-3 text-sm font-extrabold text-white hover:bg-[var(--app-primary-hover)]" type="button" @click="openIndicatorBuilder"><Plus :size="17" />New Indicator</button>
      </div>
    </template>

    <template v-if="isSignals" #notice>
      <div v-if="errorMessage" class="mx-4 mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ errorMessage }} <button class="ml-2 font-extrabold underline" type="button" @click="loadRows">Retry</button></div>
      <div v-if="noticeMessage" class="mx-4 mt-3 rounded-md border border-[var(--app-border)] bg-[var(--app-primary-soft)] px-3 py-2 text-sm font-semibold text-[var(--app-text)]">{{ noticeMessage }}</div>
    </template>

    <div v-if="isSignals" class="pb-1"><MySignalTable :rows="pagedRows" :loading="loading" :library="listKind === 'library'" :sort-key="signalTable.sortKey.value" :sort-direction="signalTable.sortDirection.value" @sort="handleTableSort" @preview="previewRow = $event" @edit="openEditor" @copy="handleCopy" @delete="handleDelete" /></div>
    <div v-else-if="isIndicators" class="pb-1">
      <div v-if="indicatorError" class="mx-4 mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ indicatorError }} <button class="ml-2 font-extrabold underline" type="button" @click="loadIndicators">Retry</button></div>
      <MyIndicatorTable class="m-4" :rows="indicatorTable.pagedRows.value" :loading="indicatorLoading" :sort-key="indicatorTable.sortKey.value" :sort-direction="indicatorTable.sortDirection.value" :deleting-id="indicatorDeletingId" @sort="handleIndicatorSort" @preview="previewIndicator = $event" @edit="editIndicator" @delete="handleIndicatorDelete" />
    </div>
    <MyScreenWorkspace ref="screenWorkspace" v-else-if="isScreens" @count-change="screenCount = $event" @view-change="(view, mode) => { screenView = view; screenMode = mode }" />
    <WatchListWorkspace v-else-if="isWatchList" />
    <div v-else class="flex min-h-[420px] flex-col items-center justify-center px-6 text-center"><component :is="activeConfig.icon" :size="42" class="text-[var(--app-primary)]" /><h3 class="mt-4 text-xl font-extrabold">{{ activeConfig.label }}</h3><p class="mt-2 max-w-md text-sm text-[var(--app-text-muted)]">This workspace is coming soon.</p></div>

    <template v-if="isSignals" #footer><IndicatorPagination :page="activePage" :page-count="pageCount" :total="filteredRows.length" item-label="signals" @change="setActivePage" /></template>
    <template v-else-if="isIndicators" #footer><IndicatorPagination :page="indicatorTable.page.value" :page-count="indicatorTable.pageCount.value" :total="filteredIndicators.length" item-label="indicators" @change="indicatorTable.setPage" /></template>

    <template #overlays>
      <SignalPreviewModal v-if="previewRow" :row="previewRow" :library="listKind === 'library'" :busy="actionLoading" @close="previewRow = null" @view="viewFromPreview" @copy="copyFromPreview" />
      <IndicatorPreviewModal v-if="previewIndicator" :row="previewIndicator" @close="previewIndicator = null" @edit="editIndicator(previewIndicator)" />
    </template>
  </ListExplorerPage>
</template>

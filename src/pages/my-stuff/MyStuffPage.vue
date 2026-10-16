<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BellRing,
  ContactRound,
  Filter,
  ListChecks,
  Play,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
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

type MyStuffSection = 'signals' | 'indicators' | 'screens' | 'watchlist' | 'concierge'

const route = useRoute()
const router = useRouter()
const abortController = new AbortController()
const sections = [
  { key: 'signals' as const, label: 'My Signal', path: '/my-stuff/signals', description: 'Create and monitor custom market signals.', icon: BellRing },
  { key: 'indicators' as const, label: 'My Indicator', path: '/my-stuff/indicators', description: 'Build and manage personal indicators.', icon: SlidersHorizontal },
  { key: 'screens' as const, label: 'My Screen', path: '/my-stuff/screens', description: 'Save and run stock screens.', icon: Filter },
  { key: 'watchlist' as const, label: 'My Watch List', path: '/my-stuff/watchlist', description: 'Keep the symbols you follow together.', icon: ListChecks },
  { key: 'concierge' as const, label: 'Concierge Service', path: '/my-stuff/concierge', description: 'Ask our team to help with setup.', icon: ContactRound },
]

const activeSection = computed<MyStuffSection>(() => {
  const value = typeof route.params.section === 'string' ? route.params.section : 'signals'
  return sections.some((item) => item.key === value) ? value as MyStuffSection : 'signals'
})
const activeConfig = computed(() => sections.find((item) => item.key === activeSection.value) ?? sections[0])
const isSignals = computed(() => activeSection.value === 'signals')

const listKind = ref<MySignalListKind>('mine')
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
const editorOpen = ref(false)
const editorRow = ref<MySignalRow | null>(null)
const previewRow = ref<MySignalRow | null>(null)

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
  if (key === 'lastSignalDate') return row.lastSignalDate ? Date.parse(row.lastSignalDate) : null
  if (key === 'barsSinceSignal') return row.barsSinceSignal
  if (key === 'currentReturn') return row.currentReturn
  if (key === 'name') return row.name
  if (key === 'symbol') return row.symbol
  if (key === 'timeframe') return row.timeframe
  return null
}

const signalTable = useSortedPagedRows<MySignalRow>(filteredRows, mySignalSortValue, pageSize)

/** Default listing order: newest signal first, matching the previous default sort. */
function applyDefaultSort() {
  signalTable.reset()
  signalTable.setSort({ key: 'lastSignalDate', kind: 'date' }, 'desc')
}

applyDefaultSort()

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
  applyDefaultSort()
}

function openEditor(row: MySignalRow | null = null) {
  editorRow.value = row
  editorOpen.value = true
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
})

onMounted(() => { void Promise.all([loadRows(), loadSubscription()]) })
onBeforeUnmount(() => abortController.abort())
</script>

<template>
  <ListExplorerPage
    title="My Stuff"
    description="Your personal indicators, signals, screens and watch lists."
    :panel-title="activeConfig.label"
    :panel-description="activeConfig.description"
    :show-view-mode-toggle="false"
  >
    <template #sidebar>
      <aside class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
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

    <template v-if="isSignals" #summary>
      <span class="indicator-summary-pill"><span class="indicator-summary-pill__dot bg-sky-500" /><span><strong>{{ rows.length }}</strong> signals</span></span>
      <span class="indicator-summary-pill"><span class="indicator-summary-pill__dot bg-emerald-500" /><span><strong>{{ triggeredCount }}</strong> triggered</span></span>
      <span class="indicator-summary-pill"><span class="indicator-summary-pill__dot bg-violet-500" /><span><strong>{{ positiveCount }}</strong> positive</span></span>
    </template>

    <template v-if="isSignals" #tabs>
      <div class="flex items-center justify-between gap-3 border-b border-[var(--app-border)] px-4 pt-1">
        <div class="flex">
          <button v-for="tab in [{ key: 'mine', label: 'My Signals' }, { key: 'library', label: 'Signal Library' }]" :key="tab.key" class="border-b-2 px-4 py-3 text-sm font-extrabold transition" :class="listKind === tab.key ? 'border-[var(--app-primary)] text-[var(--app-primary)]' : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)]'" type="button" @click="listKind = tab.key as MySignalListKind">{{ tab.label }}</button>
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

    <template v-if="isSignals" #notice>
      <div v-if="errorMessage" class="mx-4 mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ errorMessage }} <button class="ml-2 font-extrabold underline" type="button" @click="loadRows">Retry</button></div>
      <div v-if="noticeMessage" class="mx-4 mt-3 rounded-md border border-[var(--app-border)] bg-[var(--app-primary-soft)] px-3 py-2 text-sm font-semibold text-[var(--app-text)]">{{ noticeMessage }}</div>
    </template>

    <div v-if="isSignals" class="pb-1"><MySignalTable :rows="pagedRows" :loading="loading" :library="listKind === 'library'" :sort-key="signalTable.sortKey.value" :sort-direction="signalTable.sortDirection.value" @sort="handleTableSort" @preview="previewRow = $event" @edit="openEditor" @copy="handleCopy" @delete="handleDelete" /></div>
    <div v-else class="flex min-h-[420px] flex-col items-center justify-center px-6 text-center"><component :is="activeConfig.icon" :size="42" class="text-[var(--app-primary)]" /><h3 class="mt-4 text-xl font-extrabold">{{ activeConfig.label }}</h3><p class="mt-2 max-w-md text-sm text-[var(--app-text-muted)]">The My Stuff framework is ready. This workspace will be implemented after My Signal.</p></div>

    <template v-if="isSignals" #footer><IndicatorPagination :page="activePage" :page-count="pageCount" :total="filteredRows.length" item-label="signals" @change="setActivePage" /></template>

    <template #overlays>
      <SignalPreviewModal v-if="previewRow" :row="previewRow" :library="listKind === 'library'" :busy="actionLoading" @close="previewRow = null" @view="viewFromPreview" @copy="copyFromPreview" />
      <Teleport to="body">
        <div v-if="editorOpen" class="fixed inset-0 z-50 flex justify-end bg-[var(--app-overlay)]" @click.self="editorOpen = false">
          <section class="flex h-full w-full max-w-xl flex-col bg-[var(--app-surface)] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="signal-editor-title">
            <header class="flex items-start justify-between border-b border-[var(--app-border)] px-6 py-5"><div><p class="text-xs font-extrabold uppercase tracking-wide text-[var(--app-primary)]">My Signal</p><h2 id="signal-editor-title" class="mt-1 text-2xl font-extrabold">{{ editorRow ? 'Edit Signal' : 'Create New Signal' }}</h2><p class="mt-1 text-sm text-[var(--app-text-muted)]">Set the basics first, then build the trigger conditions.</p></div><button class="flex h-9 w-9 items-center justify-center rounded-md hover:bg-[var(--app-surface-soft)]" type="button" aria-label="Close" @click="editorOpen = false"><X :size="20" /></button></header>
            <div class="flex-1 overflow-y-auto p-6">
              <ol class="space-y-5">
                <li class="rounded-lg border border-[var(--app-primary)] bg-[var(--app-primary-soft)] p-4"><div class="flex items-center gap-3"><span class="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--app-primary)] text-xs font-black text-white">1</span><div><h3 class="font-extrabold">Basics</h3><p class="text-xs text-[var(--app-text-muted)]">Name, symbol and timeframe</p></div></div><div class="mt-4 grid gap-3 sm:grid-cols-2"><label class="text-xs font-bold">Name<input class="mt-1 h-10 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm" :value="editorRow?.name ?? ''" placeholder="e.g. SPY Trend Breakout" /></label><label class="text-xs font-bold">Symbol<input class="mt-1 h-10 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm" :value="editorRow?.symbol ?? 'SPY'" /></label><label class="text-xs font-bold sm:col-span-2">Timeframe<select class="mt-1 h-10 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm"><option>Daily</option><option>Weekly</option><option>Monthly</option></select></label></div></li>
                <li class="rounded-lg border border-[var(--app-border)] p-4"><div class="flex items-center gap-3"><span class="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--app-surface-muted)] text-xs font-black">2</span><div><h3 class="font-extrabold">Trigger Logic</h3><p class="text-xs text-[var(--app-text-muted)]">Choose how multiple conditions work together</p></div></div></li>
                <li class="rounded-lg border border-[var(--app-border)] p-4"><div class="flex items-center gap-3"><span class="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--app-surface-muted)] text-xs font-black">3</span><div><h3 class="font-extrabold">Conditions</h3><p class="text-xs text-[var(--app-text-muted)]">Sentiment, symbol and technical conditions</p></div></div><div v-if="editorRow" class="mt-4 rounded-md bg-[var(--app-surface-soft)] p-3 text-sm text-[var(--app-text-secondary)]">{{ editorRow.description }}</div></li>
              </ol>
            </div>
            <footer class="flex items-center justify-between border-t border-[var(--app-border)] px-6 py-4"><span class="text-xs text-[var(--app-text-muted)]">Condition builder follows in the next implementation step.</span><button class="rounded-md border border-[var(--app-border)] px-4 py-2 text-sm font-bold" type="button" @click="editorOpen = false">Close</button></footer>
          </section>
        </div>
      </Teleport>
    </template>
  </ListExplorerPage>
</template>

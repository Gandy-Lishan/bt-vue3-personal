<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowRight,
  CalendarRange,
  ChartCandlestick,
  ChartSpline,
  Download,
  Info,
  Network,
  Plus,
  RotateCcw,
  Search,
  X,
} from '@lucide/vue'
import { deleteCpmBacktest, fetchCpmList, fetchCpmPatternPreview, fetchCpmPatternPreviews } from '@/entities/cpm/api/cpm.api'
import {
  CPM_PAGE_SIZE,
  cpmCsvFilename,
  cpmSearchScore,
  cpmSortOptions,
  cpmSortValue,
  formatCpmNumber,
  parseCpmNumber,
} from '@/entities/cpm/model/cpm.adapter'
import type {
  CpmBacktestRow,
  CpmPatternPreviewPoint,
  CpmPatternPreviewResult,
  CpmSectionKey,
  CpmSortDirection,
  CpmSortKey,
} from '@/entities/cpm/model/cpm.types'
import type { IndicatorTableColumnKind } from '@/entities/indicator/model/indicator.table'
import { downloadCsv, toCsv } from '@/shared/utils/csv'
import { useTheme } from '@/shared/theme/theme'
import ListExplorerPage from '@/shared/ui/ListExplorerPage.vue'
import type { ListExplorerViewMode } from '@/shared/ui/list-page.types'
import { useSortedPagedRows } from '@/pages/indicators/composables/useSortedPagedRows'
import IndicatorPagination from '@/pages/indicators/ui/IndicatorPagination.vue'
import ascendingChannelImage from '@/assets/patterns/ascending_channel.png'
import ascendingChannelImageDark from '@/assets/patterns/ascending_channel_dark.png'
import descendingChannelImage from '@/assets/patterns/descending_channel.png'
import descendingChannelImageDark from '@/assets/patterns/descending_channel_dark.png'
import doubleBottomImage from '@/assets/patterns/double_bottom.png'
import doubleBottomImageDark from '@/assets/patterns/double_bottom_dark.png'
import doubleTopImage from '@/assets/patterns/double_top.png'
import doubleTopImageDark from '@/assets/patterns/double_top_dark.png'
import headAndShoulderBottomImage from '@/assets/patterns/head_and_shoulder_bottom.png'
import headAndShoulderBottomImageDark from '@/assets/patterns/head_and_shoulder_bottom_dark.png'
import headAndShoulderTopImage from '@/assets/patterns/head_and_shoulder_top.png'
import headAndShoulderTopImageDark from '@/assets/patterns/head_and_shoulder_top_dark.png'
import roundingBottomImage from '@/assets/patterns/rounding_bottom.png'
import roundingBottomImageDark from '@/assets/patterns/rounding_bottom_dark.png'
import tripleTapImage from '@/assets/patterns/triple_tap.png'
import tripleTapImageDark from '@/assets/patterns/triple_tap_dark.png'
import CpmBacktestCardGrid from './ui/CpmBacktestCardGrid.vue'
import CpmBacktestTable from './ui/CpmBacktestTable.vue'
import CpmPatternWorkspace from './ui/CpmPatternWorkspace.vue'
import CpmPatternPreviewChart from './ui/CpmPatternPreviewChart.vue'
import CpmToolWorkspace from './ui/CpmToolWorkspace.vue'

type SectionConfig = {
  key: CpmSectionKey
  label: string
  path: string
  description: string
  icon: typeof ChartCandlestick
}

type SystemPatternOption = {
  value: string
  label: string
  image: string
  imageDark: string
}

const route = useRoute()
const router = useRouter()
const { isDarkTheme } = useTheme()
const rows = ref<CpmBacktestRow[]>([])
const apiTotal = ref(0)
const loading = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const timeframeFilter = ref('')
const viewMode = ref<ListExplorerViewMode>('table')
const descriptionOpen = ref(false)
const previewOpen = ref(false)
const previewLoading = ref(false)
const previewRow = ref<CpmBacktestRow | null>(null)
const previewResult = ref<CpmPatternPreviewResult | null>(null)
const abortController = new AbortController()
const cardPreviewPointsById = ref<Record<string, CpmPatternPreviewPoint[]>>({})
const cardPreviewLoadingById = ref<Record<string, boolean>>({})
const cardPreviewLoadedKeys = new Set<string>()
const cardPreviewInFlightKeys = new Set<string>()
let previewRequestId = 0

const sections: SectionConfig[] = [
  {
    key: 'list',
    label: 'Correlation Pattern Match',
    path: '/cpm/list',
    description: 'Saved pattern backtests, previews and result history.',
    icon: ChartCandlestick,
  },
  {
    key: 'symbol',
    label: 'Symbol Correlation',
    path: '/cpm/symbol',
    description: 'Compare one designated ticker with multiple symbols and track how their relationships change over time.',
    icon: ChartSpline,
  },
  {
    key: 'asset',
    label: 'Asset Correlation',
    path: '/cpm/asset',
    description: 'Cross-asset monthly return correlation matrix.',
    icon: Network,
  },
  {
    key: 'pattern',
    label: 'Date Range Correlation',
    path: '/cpm/pattern',
    description: 'Similarity scoring between two historical ranges.',
    icon: CalendarRange,
  },
  {
    key: 'transmission',
    label: 'Beta Analyzer',
    path: '/cpm/transmission',
    description: 'Rolling beta between a symbol and benchmark.',
    icon: Network,
  },
]

const resultsConfig: SectionConfig = {
  key: 'results',
  label: 'Correlation Pattern Match',
  path: '/cpm/results',
  description: 'Create, preview and review Correlation Pattern Match backtests.',
  icon: ChartCandlestick,
}

const systemPatternOptions: SystemPatternOption[] = [
  { value: 'triple_tap', label: 'Triple Tap', image: tripleTapImage, imageDark: tripleTapImageDark },
  { value: 'rounding_bottom', label: 'Rounding Bottom', image: roundingBottomImage, imageDark: roundingBottomImageDark },
  { value: 'descending_channel', label: 'Descending Channel', image: descendingChannelImage, imageDark: descendingChannelImageDark },
  { value: 'ascending_channel', label: 'Ascending Channel', image: ascendingChannelImage, imageDark: ascendingChannelImageDark },
  { value: 'head_and_shoulder_bottom', label: 'Head and Shoulders Bottom', image: headAndShoulderBottomImage, imageDark: headAndShoulderBottomImageDark },
  { value: 'head_and_shoulder_top', label: 'Head and Shoulders Top', image: headAndShoulderTopImage, imageDark: headAndShoulderTopImageDark },
  { value: 'double_bottom', label: 'Double Bottom', image: doubleBottomImage, imageDark: doubleBottomImageDark },
  { value: 'double_top', label: 'Double Top', image: doubleTopImage, imageDark: doubleTopImageDark },
]

const activeSection = computed<CpmSectionKey>(() => {
  const section = route.params.section
  const value = typeof section === 'string' ? section : 'list'
  if (value === 'results') return 'results'
  return sections.some((item) => item.key === value) ? (value as CpmSectionKey) : 'list'
})

const activeConfig = computed(() => activeSection.value === 'results' ? resultsConfig : sections.find((section) => section.key === activeSection.value) ?? sections[0])
const isListSection = computed(() => activeSection.value === 'list')
const isPatternWorkspace = computed(() => activeSection.value === 'results')
const sidebarActiveKey = computed<CpmSectionKey>(() => isPatternWorkspace.value ? 'list' : activeSection.value)

const filteredRows = computed(() => {
  const query = searchQuery.value.trim()
  return rows.value
    .map((row, index) => ({ row, index, score: cpmSearchScore(row, query) }))
    .filter(({ row, score }) => {
      if (score === null) return false
      if (statusFilter.value && row.status !== statusFilter.value) return false
      if (timeframeFilter.value && row.timeframe !== timeframeFilter.value) return false
      return true
    })
    .sort((left, right) => {
      if (!query) return left.index - right.index
      return (right.score ?? -Infinity) - (left.score ?? -Infinity) || left.index - right.index
    })
    .map(({ row }) => row)
})

const table = useSortedPagedRows(
  filteredRows,
  (row, key) => cpmSortValue(row, key),
  CPM_PAGE_SIZE,
)

const finishedCount = computed(() => filteredRows.value.filter((row) => row.status === 'Finish').length)
const runningCount = computed(() => filteredRows.value.filter((row) => row.status === 'Running').length)
const failedCount = computed(() => filteredRows.value.filter((row) => row.status === 'Fail').length)
const timeframeOptions = computed(() => Array.from(new Set(rows.value.map((row) => row.timeframe).filter(Boolean))).sort())

const activeSortValue = computed(() => {
  if (!table.sortKey.value) return ''
  return `${table.sortKey.value}:${table.sortDirection.value}`
})

const previewPoints = computed(() => previewResult.value?.points ?? [])
const previewPointCount = computed(() => previewPoints.value.length)
const previewLatestDate = computed(() => previewPoints.value.at(-1)?.date ?? '')
const previewSystemPatternOption = computed(() => systemPatternOption(previewRow.value?.systemPattern))
const previewIsCommonPattern = computed(() => Boolean(previewSystemPatternOption.value))
const previewPatternImage = computed(() => {
  const option = previewSystemPatternOption.value
  if (!option) return ''
  return isDarkTheme.value ? option.imageDark : option.image
})
const cardPatternImages = computed(() =>
  Object.fromEntries(systemPatternOptions.map((option) => [option.value, isDarkTheme.value ? option.imageDark : option.image])),
)
const cardPatternLabels = computed(() =>
  Object.fromEntries(systemPatternOptions.map((option) => [option.value, option.label])),
)
const previewPatternTypeLabel = computed(() => previewSystemPatternOption.value?.label ?? 'Customize Pattern')
const previewPatternPeriodLabel = computed(() => {
  const row = previewRow.value
  if (!row) return '-'
  return formatDateRange(row.startDate, row.endDate) || row.period
})
const previewPatternPeriodParts = computed(() => {
  const row = previewRow.value
  if (!row || !row.startDate || !row.endDate) return null
  const startYear = row.startDate.slice(0, 4)
  const endYear = row.endDate.slice(0, 4)
  return {
    start: formatPreviewDate(row.startDate, startYear !== endYear),
    end: formatPreviewDate(row.endDate),
  }
})
const previewPatternStatus = computed(() => {
  if (previewIsCommonPattern.value) return 'Common Pattern'
  if (previewLoading.value) return 'Loading data...'
  return previewLatestDate.value ? `Last data: ${previewLatestDate.value}` : 'No latest data'
})
const previewSetupColumns = computed(() => {
  const row = previewRow.value
  if (!row) return [[], []]
  const condition = formatConditionLabel(rawPreviewValue(row, ['ma_condition', 'condition', 'Condition', 'trade_condition', 'entry_condition'], 'None'))
  const direction = rawPreviewValue(row, ['direction', 'Direction', 'position', 'side'], '-')

  return [
    [
      { label: 'Pattern Type', value: previewPatternTypeLabel.value },
      { label: 'Pattern Period', value: previewPatternPeriodLabel.value },
      { label: 'Search Period', value: formatBarsLabel(rawPreviewValue(row, ['ma', 'search_period', 'searchPeriod', 'search_bars', 'search_bars_num', 'searchBars'])) },
      { label: 'Minimum Correlation', value: formatPercentField(rawPreviewValue(row, ['corr_per', 'minimum_correlation', 'min_correlation', 'min_corr', 'corr_threshold'])) },
    ],
    [
      { label: 'Condition', value: condition },
      { label: 'Direction', value: direction },
      { label: 'Time in Market', value: formatBarsLabel(rawPreviewValue(row, ['tim', 'time_in_market_bars', 'hold_bars', 'holding_bars', 'forward_bars_num', 'forward_bars', 'forward_period'], '-', { skipZero: true })) },
      { label: 'Lookback', value: formatLookbackLabel(rawPreviewValue(row, ['lookback', 'lookback_period', 'lookbackPeriod', 'all_history'], 'All History')) },
    ],
  ]
})
async function loadRows() {
  loading.value = true
  try {
    const firstPage = await fetchCpmList({ signal: abortController.signal })
    const pageCount = Math.min(25, Math.ceil(firstPage.count / CPM_PAGE_SIZE))
    const extraPages = pageCount > 1
      ? await Promise.all(
          Array.from({ length: pageCount - 1 }, (_, index) =>
            fetchCpmList({ page: index + 2, signal: abortController.signal }),
          ),
        )
      : []

    const merged = [firstPage, ...extraPages].flatMap((page) => page.rows)
    const seen = new Set<string>()
    rows.value = merged.filter((row) => {
      const id = row.id.toLowerCase()
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
    apiTotal.value = firstPage.count || rows.value.length
    table.reset()
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  searchQuery.value = ''
  statusFilter.value = ''
  timeframeFilter.value = ''
  table.reset()
}

function sortDirectionLabel(kind: IndicatorTableColumnKind | undefined, direction: CpmSortDirection) {
  if (kind === 'number' || kind === 'change' || kind === 'sentiment') {
    return direction === 'asc' ? 'Low to High' : 'High to Low'
  }
  if (kind === 'date') return direction === 'asc' ? 'Oldest First' : 'Newest First'
  return direction === 'asc' ? 'A to Z' : 'Z to A'
}

function handleSortSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (!value) {
    table.reset()
    return
  }

  const [key, direction] = value.split(':') as [CpmSortKey, CpmSortDirection]
  const option = cpmSortOptions.find((item) => item.key === key)
  if (!option || (direction !== 'asc' && direction !== 'desc')) return
  table.setSort({ key, kind: option.kind }, direction)
}

function handleTableSort(key: CpmSortKey) {
  const option = cpmSortOptions.find((item) => item.key === key)
  table.sort({ key, kind: option?.kind ?? 'text' })
}

function downloadListCsv() {
  const headers = ['Name', 'Symbol', 'Timeframe', 'Period', 'Status', 'Bars', 'Trades', 'Total Return']
  const csvRows = table.sortedRows.value.map((row) => [
    row.name,
    row.symbol,
    row.timeframe,
    row.period,
    row.status,
    row.barsNumber ?? '',
    row.totalTrades ?? '',
    row.totalReturn ?? '',
  ])
  if (!csvRows.length) return
  const isoDate = new Date().toISOString().slice(0, 10)
  downloadCsv(cpmCsvFilename('Correlation Pattern Match', isoDate), toCsv(headers, csvRows))
}

function systemPatternOption(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return null
  return systemPatternOptions.find((option) => option.value === normalized) ?? null
}

function cardPreviewKey(row: CpmBacktestRow) {
  return `${row.id}|${row.symbol}|${row.startDate}|${row.endDate}`
}

function setCardPreviewLoading(rowIds: string[], value: boolean) {
  const next = { ...cardPreviewLoadingById.value }
  rowIds.forEach((rowId) => {
    if (value) next[rowId] = true
    else delete next[rowId]
  })
  cardPreviewLoadingById.value = next
}

async function ensureCardPatternPreviews(candidateRows: CpmBacktestRow[]) {
  const pendingRows = candidateRows.filter((row) => {
    if (systemPatternOption(row.systemPattern)) return false
    if (!row.symbol || !row.startDate || !row.endDate) return false

    const key = cardPreviewKey(row)
    return !cardPreviewLoadedKeys.has(key) && !cardPreviewInFlightKeys.has(key)
  })
  if (!pendingRows.length) return

  pendingRows.forEach((row) => cardPreviewInFlightKeys.add(cardPreviewKey(row)))
  setCardPreviewLoading(pendingRows.map((row) => row.id), true)

  try {
    const results = await fetchCpmPatternPreviews(
      pendingRows.map((row) => ({
        id: row.id,
        symbol: row.symbol,
        startDate: row.startDate,
        endDate: row.endDate,
      })),
      abortController.signal,
    )
    const nextPoints = { ...cardPreviewPointsById.value }
    pendingRows.forEach((row) => {
      nextPoints[row.id] = results[row.id]?.points ?? []
      cardPreviewLoadedKeys.add(cardPreviewKey(row))
    })
    cardPreviewPointsById.value = {
      ...nextPoints,
    }
  } finally {
    pendingRows.forEach((row) => cardPreviewInFlightKeys.delete(cardPreviewKey(row)))
    setCardPreviewLoading(pendingRows.map((row) => row.id), false)
  }
}

function ensureVisibleCardPatternPreviews() {
  if (!isListSection.value || viewMode.value !== 'cards') return
  void ensureCardPatternPreviews(table.pagedRows.value)
}

function rawPreviewValue(row: CpmBacktestRow, keys: string[], fallback = '-', options: { skipZero?: boolean } = {}) {
  for (const key of keys) {
    const value = row.raw[key]
    if (value === undefined || value === null || value === '') continue
    if (options.skipZero && isZeroishValue(value)) continue
    return String(value)
  }
  return fallback
}

function isZeroishValue(value: unknown) {
  const parsed = parseCpmNumber(value)
  if (parsed === 0) return true
  const leadingNumber = String(value ?? '').trim().match(/^-?\d+(?:\.\d+)?/)
  return leadingNumber ? Number(leadingNumber[0]) === 0 : false
}

function formatBarsLabel(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text || text === '-') return '-'
  if (/bar|day|history/i.test(text)) return text
  const parsed = parseCpmNumber(text)
  return parsed === null ? text : `${formatCpmNumber(parsed, 0, true)} bars`
}

function formatPercentField(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text || text === '-') return '-'
  if (text.includes('%')) return text
  const parsed = parseCpmNumber(text)
  if (parsed === null) return text
  const normalized = Math.abs(parsed) <= 1 ? parsed * 100 : parsed
  return `${formatCpmNumber(normalized, 1, true)}%`
}

function formatConditionLabel(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text || ['0', 'no', 'none', 'false'].includes(text.toLowerCase())) return 'None'
  return text
}

function formatLookbackLabel(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text) return '-'
  return text.toLowerCase() === 'all' ? 'All History' : text
}

function formatPreviewDate(value: string, includeYear = true) {
  const timestamp = Date.parse(`${value}T00:00:00`)
  if (!Number.isFinite(timestamp)) return value
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' as const } : {}),
  })
  return formatter.format(new Date(timestamp))
}

function formatDateRange(startDate: string, endDate: string) {
  if (!startDate || !endDate) return ''
  const startYear = startDate.slice(0, 4)
  const endYear = endDate.slice(0, 4)
  return `${formatPreviewDate(startDate, startYear !== endYear)} - ${formatPreviewDate(endDate)}`
}

function previewSetupValueClass(label: string, value: string) {
  if (label !== 'Direction') return 'text-[var(--app-text)]'
  const normalized = value.trim().toLowerCase()
  if (['long', 'buy', 'bullish'].includes(normalized)) return 'text-[var(--app-positive)]'
  if (['short', 'sell', 'bearish'].includes(normalized)) return 'text-[var(--app-negative)]'
  return 'text-[var(--app-text)]'
}

function previewStatusClass(row: CpmBacktestRow | null) {
  if (row?.status === 'Finish') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (row?.status === 'Running') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (row?.status === 'Fail') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--app-text-muted)]'
}

async function openPreview(row: CpmBacktestRow) {
  const requestId = ++previewRequestId
  previewRow.value = row
  previewResult.value = null
  previewOpen.value = true

  if (systemPatternOption(row.systemPattern)) {
    previewLoading.value = false
    return
  }

  previewLoading.value = true

  try {
    const result = await fetchCpmPatternPreview(
      {
        symbol: row.symbol,
        startDate: row.startDate,
        endDate: row.endDate,
      },
      abortController.signal,
    )
    if (requestId === previewRequestId) previewResult.value = result
  } finally {
    if (requestId === previewRequestId) previewLoading.value = false
  }
}

function openRow(row: CpmBacktestRow) {
  void router.push({ path: '/cpm/results', query: row.url ? { url: row.url } : undefined })
}

async function deleteRow(row: CpmBacktestRow) {
  if (!window.confirm(`Delete "${row.name}"?`)) return
  const deleted = await deleteCpmBacktest(row.url, abortController.signal)
  if (deleted) await loadRows()
}

watch(
  () => [searchQuery.value, statusFilter.value, timeframeFilter.value],
  () => {
    table.setPage(1)
  },
)

watch(
  () => [
    isListSection.value,
    viewMode.value,
    table.pagedRows.value.map((row) => `${row.id}:${row.systemPattern}:${row.symbol}:${row.startDate}:${row.endDate}`).join('|'),
  ],
  () => {
    ensureVisibleCardPatternPreviews()
  },
  { immediate: true },
)

watch(
  () => route.params.section,
  (section) => {
    const value = typeof section === 'string' ? section : 'list'
    if (value === 'results') return
    if (!sections.some((item) => item.key === value)) void router.replace('/cpm/list')
  },
  { immediate: true },
)

onMounted(() => {
  void loadRows()
})

onBeforeUnmount(() => {
  abortController.abort()
})
</script>

<template>
  <ListExplorerPage
    title="Correlation"
    description="Pattern matching, cross-symbol relationships, asset matrices and beta analysis."
    :panel-title="activeConfig.label"
    :panel-description="activeConfig.description"
    :view-mode="viewMode"
    :show-view-mode-toggle="isListSection"
    :hide-panel-header="isPatternWorkspace"
    @update:view-mode="viewMode = $event"
  >
    <template #sidebar>
      <aside class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
        <RouterLink
          v-for="section in sections"
          :key="section.key"
          class="mb-1 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition"
          :class="sidebarActiveKey === section.key ? 'bg-[var(--app-primary-soft)] text-[var(--app-text)]' : 'text-[var(--app-text)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-primary)]'"
          :to="section.path"
        >
          <span
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
            :class="sidebarActiveKey === section.key ? 'text-[var(--app-primary)]' : 'text-[var(--app-text-secondary)]'"
          >
            <component :is="section.icon" :size="21" />
          </span>
          <span class="min-w-0">
            <span class="block text-sm font-semibold leading-5">{{ section.label }}</span>
            <span class="block truncate text-xs text-[var(--app-text-muted)]">{{ section.description }}</span>
          </span>
        </RouterLink>
      </aside>
    </template>

    <template #title-actions>
      <button
        class="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--app-border-strong)] bg-[var(--app-surface-muted)] px-2.5 text-xs font-semibold text-[var(--app-text-secondary)] hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]"
        type="button"
        @click="descriptionOpen = true"
      >
        <Info :size="15" />
        {{ activeSection === 'symbol' ? 'Help & Methodology' : 'Description' }}
      </button>
    </template>

    <template #summary>
      <span v-if="isListSection" class="indicator-summary-pill">
        <span class="indicator-summary-pill__dot bg-emerald-500" />
        <span class="indicator-summary-pill__text">
          <span class="indicator-summary-pill__value">{{ finishedCount }}</span>
          <span class="indicator-summary-pill__label"> finished</span>
        </span>
      </span>
      <span v-if="isListSection" class="indicator-summary-pill">
        <span class="indicator-summary-pill__dot bg-sky-500" />
        <span class="indicator-summary-pill__text">
          <span class="indicator-summary-pill__value">{{ runningCount }}</span>
          <span class="indicator-summary-pill__label"> running</span>
        </span>
      </span>
      <span v-if="isListSection" class="indicator-summary-pill">
        <span class="indicator-summary-pill__dot bg-rose-500" />
        <span class="indicator-summary-pill__text">
          <span class="indicator-summary-pill__value">{{ failedCount }}</span>
          <span class="indicator-summary-pill__label"> failed</span>
        </span>
      </span>
      <span v-if="isPatternWorkspace" class="indicator-summary-pill">
        <span class="indicator-summary-pill__text">
          <span class="indicator-summary-pill__value">Create</span>
          <span class="indicator-summary-pill__label"> CPM workspace</span>
        </span>
      </span>
      <span v-else-if="activeSection !== 'symbol'" class="indicator-summary-pill">
        <span class="indicator-summary-pill__text">
          <span class="indicator-summary-pill__value">{{ isListSection ? apiTotal || rows.length : activeSection === 'asset' ? 18 : sections.length }}</span>
          <span class="indicator-summary-pill__label">{{ isListSection ? ' CPM runs' : activeSection === 'asset' ? ' assets' : ' tools' }}</span>
        </span>
      </span>
    </template>

    <template v-if="isListSection" #filters>
      <div class="grid gap-2 px-4 py-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.3fr)_minmax(150px,0.7fr)_minmax(150px,0.7fr)_minmax(210px,0.9fr)_auto_auto_auto]">
        <label class="flex h-9 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5">
          <Search :size="16" class="mr-2 shrink-0 text-[var(--app-text-muted)]" />
          <input v-model="searchQuery" class="w-full bg-transparent text-[0.8125rem] outline-none" placeholder="Search CPM runs..." />
        </label>
        <select v-model="statusFilter" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]">
          <option value="">All Statuses</option>
          <option value="Finish">Finish</option>
          <option value="Running">Running</option>
          <option value="Fail">Fail</option>
          <option value="Unknown">Unknown</option>
        </select>
        <select v-model="timeframeFilter" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]">
          <option value="">All Timeframes</option>
          <option v-for="timeframe in timeframeOptions" :key="timeframe" :value="timeframe">{{ timeframe }}</option>
        </select>
        <select
          class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-[0.8125rem] text-[var(--app-text-secondary)]"
          :value="activeSortValue"
          @change="handleSortSelect"
        >
          <option value="">Sort by: Default</option>
          <template v-for="option in cpmSortOptions" :key="option.key">
            <option :value="`${option.key}:asc`">{{ option.label }}: {{ sortDirectionLabel(option.kind, 'asc') }}</option>
            <option :value="`${option.key}:desc`">{{ option.label }}: {{ sortDirectionLabel(option.kind, 'desc') }}</option>
          </template>
        </select>
        <button
          class="flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[0.8125rem] text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)]"
          type="button"
          @click="resetFilters"
        >
          <RotateCcw :size="16" />
          Reset
        </button>
        <button
          class="flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[0.8125rem] text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          :disabled="!table.sortedRows.value.length"
          title="Download this list as CSV"
          @click="downloadListCsv"
        >
          <Download :size="16" />
          CSV
        </button>
        <RouterLink
          class="flex h-9 items-center justify-center gap-1.5 rounded-md bg-[var(--app-primary)] px-3 text-[0.8125rem] font-extrabold text-white transition hover:bg-[var(--app-primary-hover)]"
          to="/cpm/results"
        >
          <Plus :size="16" />
          New
        </RouterLink>
      </div>
    </template>

    <div v-if="isListSection" class="px-4 pb-4">
      <CpmBacktestTable
        v-if="viewMode === 'table'"
        :rows="table.pagedRows.value"
        :loading="loading"
        :sort-key="table.sortKey.value as CpmSortKey | ''"
        :sort-direction="table.sortDirection.value"
        @sort="handleTableSort"
        @preview="openPreview"
        @open="openRow"
        @delete="deleteRow"
      />
      <CpmBacktestCardGrid
        v-else
        :rows="table.pagedRows.value"
        :loading="loading"
        :common-pattern-images="cardPatternImages"
        :common-pattern-labels="cardPatternLabels"
        :preview-points-by-id="cardPreviewPointsById"
        :preview-loading-by-id="cardPreviewLoadingById"
        @preview="openPreview"
        @open="openRow"
        @delete="deleteRow"
      />
    </div>
    <CpmPatternWorkspace v-else-if="isPatternWorkspace" />
    <CpmToolWorkspace v-else :section="activeSection" />

    <template v-if="isListSection" #footer>
      <IndicatorPagination
        :page="table.page.value"
        :page-count="table.pageCount.value"
        :total="table.sortedRows.value.length"
        item-label="CPM runs"
        @change="table.setPage"
      />
    </template>

    <template #overlays>
      <Teleport to="body">
        <div
          v-if="descriptionOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-overlay)] px-4 py-6"
          @click.self="descriptionOpen = false"
        >
          <section
            class="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-lg bg-[var(--app-surface)] text-[var(--app-text)] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cpm-description-title"
          >
            <header class="flex items-start justify-between gap-4 border-b border-[var(--app-border)] px-5 py-4">
              <div>
                <p class="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">Correlation</p>
                <h2 id="cpm-description-title" class="mt-1 text-xl text-[var(--app-text)]">{{ activeConfig.label }}</h2>
              </div>
              <button
                class="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--app-border)] text-[var(--app-text-subtle)] hover:bg-[var(--app-surface-muted)]"
                type="button"
                aria-label="Close description"
                @click="descriptionOpen = false"
              >
                <X :size="18" />
              </button>
            </header>
            <div class="max-h-[calc(86vh-92px)] overflow-y-auto px-5 py-4 text-sm leading-6 text-[var(--app-text-secondary)]">
              <p>{{ activeConfig.description }}</p>
            </div>
          </section>
        </div>
      </Teleport>

      <Teleport to="body">
        <div
          v-if="previewOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-overlay)] px-4 py-6"
          @click.self="previewOpen = false"
        >
          <section
            class="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-lg bg-[var(--app-surface)] text-[var(--app-text)] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cpm-pattern-preview-title"
          >
            <header class="flex items-start justify-between gap-4 border-b border-[var(--app-border)] px-5 py-4">
              <div class="min-w-0">
                <p class="text-xs uppercase tracking-wide text-[var(--app-text-muted)]">Study Preview</p>
                <h2 id="cpm-pattern-preview-title" class="mt-1 truncate text-xl text-[var(--app-text)]">
                  {{ previewRow?.name || 'CPM Pattern' }}
                </h2>
                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <span class="rounded-full bg-[var(--app-primary-soft)] px-3 py-1 text-[0.7rem] font-extrabold text-[var(--app-primary)]">
                    {{ previewRow?.symbol || '-' }}
                  </span>
                  <span class="rounded-full bg-[var(--app-surface-soft)] px-3 py-1 text-[0.7rem] font-extrabold text-[var(--app-text-secondary)]">
                    {{ previewRow?.timeframe || '-' }}
                  </span>
                  <span class="rounded-full border px-3 py-1 text-[0.7rem] font-extrabold" :class="previewStatusClass(previewRow)">
                    {{ previewRow?.status || '-' }}
                  </span>
                </div>
              </div>
              <button
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--app-border)] text-[var(--app-text-subtle)] hover:bg-[var(--app-surface-muted)]"
                type="button"
                aria-label="Close pattern preview"
                @click="previewOpen = false"
              >
                <X :size="18" />
              </button>
            </header>
            <div class="max-h-[calc(92vh-116px)] overflow-y-auto px-5 py-4">
              <section class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-3">
                <div v-if="previewIsCommonPattern" class="grid gap-4 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] p-4 lg:grid-cols-[minmax(280px,1fr)_minmax(0,1fr)]">
                  <div class="flex min-h-[190px] items-center justify-center rounded-md bg-[var(--app-surface)] px-5 py-5">
                    <img
                      :src="previewPatternImage"
                      :alt="`${previewPatternTypeLabel} pattern`"
                      class="max-h-[185px] w-full max-w-md object-contain"
                    />
                  </div>
                  <div class="relative flex min-w-0 flex-col justify-center border-[var(--app-border-muted)] lg:border-l lg:pl-10">
                    <div class="min-w-0 pr-36">
                      <div>
                        <div class="text-xs font-extrabold uppercase tracking-wide text-[var(--app-text-muted)]">Pattern Preview</div>
                        <h3 class="mt-2 text-3xl font-black leading-tight text-[var(--app-text)]">{{ previewPatternTypeLabel }}</h3>
                      </div>
                    </div>
                    <span class="absolute right-0 top-0 rounded-full bg-[var(--app-primary-soft)] px-3 py-1.5 text-xs font-extrabold text-[var(--app-text-secondary)]">Common Pattern</span>
                    <div class="mt-6 text-lg font-semibold text-[var(--app-text-muted)]">Pattern Period</div>
                    <div class="mt-2 text-2xl font-extrabold text-[var(--app-text)]">{{ previewPatternPeriodLabel }}</div>
                  </div>
                </div>
                <div v-else>
                  <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 class="text-sm font-extrabold text-[var(--app-text)]">
                        Price Trend ({{ previewPointCount || formatCpmNumber(previewRow?.barsNumber, 0, true) }} bars)
                      </h3>
                      <p class="text-xs text-[var(--app-text-muted)]">
                        {{ previewPatternPeriodLabel }}
                      </p>
                    </div>
                    <span class="text-xs font-semibold text-[var(--app-text-muted)]">
                      {{ previewPatternStatus }}
                    </span>
                  </div>
                  <CpmPatternPreviewChart :points="previewPoints" value-mode="price" :loading="previewLoading" :height="200" />
                  <p v-if="!previewLoading && previewResult?.message" class="mt-2 text-xs text-[var(--app-text-muted)]">
                    {{ previewResult.message }}
                  </p>
                </div>
              </section>

              <section class="mt-4 overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)]">
                <div class="border-b border-[var(--app-border-muted)] px-4 py-3">
                  <h3 class="text-xl font-extrabold text-[var(--app-text)]">Setup Parameters</h3>
                </div>
                <div class="grid gap-0 p-4 lg:grid-cols-2 lg:gap-8">
                  <dl
                    v-for="(column, columnIndex) in previewSetupColumns"
                    :key="columnIndex"
                    class="divide-y divide-[var(--app-border-muted)]"
                    :class="columnIndex === 1 ? 'mt-0 border-[var(--app-border-muted)] lg:border-l lg:pl-8' : ''"
                  >
                    <div
                      v-for="item in column"
                      :key="`${columnIndex}-${item.label}`"
                      class="grid grid-cols-[minmax(130px,0.9fr)_minmax(0,1.1fr)] items-center gap-4 py-2.5 text-sm"
                    >
                      <dt class="text-[var(--app-text-secondary)]">{{ item.label }}</dt>
                      <dd v-if="item.label === 'Pattern Period' && previewPatternPeriodParts" class="flex min-w-0 items-center gap-1.5 truncate font-extrabold text-[var(--app-text)]" :title="item.value">
                        <span class="min-w-0 truncate">{{ previewPatternPeriodParts.start }}</span>
                        <ArrowRight class="h-3.5 w-3.5 shrink-0 text-[var(--app-text-muted)]" :size="14" />
                        <span class="min-w-0 truncate">{{ previewPatternPeriodParts.end }}</span>
                      </dd>
                      <dd v-else class="min-w-0 truncate font-extrabold" :class="previewSetupValueClass(item.label, item.value)" :title="item.value">{{ item.value }}</dd>
                    </div>
                  </dl>
                </div>
              </section>
            </div>
          </section>
        </div>
      </Teleport>

    </template>
  </ListExplorerPage>
</template>

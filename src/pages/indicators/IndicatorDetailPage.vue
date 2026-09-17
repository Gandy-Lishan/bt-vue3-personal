<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, Search, Star } from '@lucide/vue'
import { fetchIndicatorChartData, fetchIndicatorDownloadData } from '@/entities/indicator/api/indicator.api'
import { isSeasonalityIndicatorType } from '@/entities/indicator/model/indicator.chart'
import { useIndicatorStore } from '@/entities/indicator/model/indicator.store'
import {
  indicatorFromRelatedChart,
  isDetailForChart,
  mergeRelatedChartRows,
  unresolvedRelatedChartRow,
} from '@/entities/indicator/model/indicator.related'
import { isUnavailableIndicatorId, unableToFindIndicatorMessage } from '@/entities/indicator/model/indicator.source'
import { constituentColumns, constituentSortValue } from '@/entities/indicator/model/indicator.constituents'
import { favoriteActionLabel } from '@/entities/indicator/model/indicator.favorites'
import { formatIndicatorDate } from '@/entities/indicator/model/indicator.dates'
import { hasCftcDataNotice } from '@/entities/indicator/model/indicator.notices'
import { researchPostRows } from '@/entities/indicator/model/indicator.research'
import { sentimentLabelFromScore, sentimentTextClass } from '@/entities/indicator/model/indicator.sentiment'
import { formatIndicatorNumber, indicatorSortValue, parseIndicatorNumber } from '@/entities/indicator/model/indicator.values'
import { relatedChartColumns, researchPostColumns } from '@/entities/indicator/model/indicator.table'
import type {
  Indicator,
  IndicatorChartData,
  IndicatorChartDataRow,
  IndicatorDetail,
  IndicatorDetailTab,
} from '@/entities/indicator/model/indicator.types'
// Aliased: this page already has a local `downloadCsv` that fetches and prepares rows.
import { downloadCsv as downloadCsvFile, toCsv } from '@/shared/utils/csv'
import { useSortedPagedRows } from './composables/useSortedPagedRows'
import CftcDataNotice from './ui/CftcDataNotice.vue'
import ConstituentConditionsTable from './ui/ConstituentConditionsTable.vue'
import IndicatorListTable from './ui/IndicatorListTable.vue'
import IndicatorPagination from './ui/IndicatorPagination.vue'
import IndicatorSentimentMeter from './ui/IndicatorSentimentMeter.vue'
import IndicatorTrendChart from './ui/IndicatorTrendChart.vue'

const route = useRoute()
const router = useRouter()
const store = useIndicatorStore()

const indicatorId = computed(() => String(route.params.id ?? ''))
const detail = computed(() => store.detailsById[indicatorId.value])

const listSearchQuery = ref('')
const activeTab = ref<IndicatorDetailTab>('detail')
const showReturnSegments = ref(false)
const chartRows = ref<IndicatorChartData>([])
const isChartLoading = ref(false)
const chartError = ref('')
const detailMessage = ref('')
const csvMessage = ref('')
const isDownloadingCsv = ref(false)
const detailContentElement = ref<HTMLElement | null>(null)
/** Matches the `xl:` breakpoint where the sidebar and detail sit side by side. */
const sidebarBreakpoint = '(min-width: 1280px)'
const sidebarHeight = ref('')

const relatedRows = ref<Indicator[]>([])
const isRelatedLoading = ref(false)
let relatedRequestId = 0
let relatedLoadedForId = ''

const {
  page: relatedPage,
  sortKey: relatedSortKey,
  sortDirection: relatedSortDirection,
  sortedRows: sortedRelatedRows,
  pagedRows: pagedRelatedRows,
  pageCount: relatedPageCount,
  resultStart: relatedResultStart,
  resultEnd: relatedResultEnd,
  sort: handleRelatedSort,
  setPage: setRelatedPage,
  reset: resetRelatedRows,
} = useSortedPagedRows(relatedRows, indicatorSortValue)

const researchRows = computed(() => researchPostRows(detail.value?.blogResults ?? []))

const {
  page: researchPage,
  sortKey: researchSortKey,
  sortDirection: researchSortDirection,
  sortedRows: sortedResearchRows,
  pagedRows: pagedResearchRows,
  pageCount: researchPageCount,
  resultStart: researchResultStart,
  resultEnd: researchResultEnd,
  sort: handleResearchSort,
  setPage: setResearchPage,
  reset: resetResearchRows,
} = useSortedPagedRows(researchRows, indicatorSortValue)

const constituentRows = computed(() => detail.value?.constituentConditions ?? [])
// Columns are derived from the payload, so they follow the rows rather than a schema.
const constituentTableColumns = computed(() => constituentColumns(constituentRows.value))

const {
  page: constituentPage,
  sortKey: constituentSortKey,
  sortDirection: constituentSortDirection,
  sortedRows: sortedConstituentRows,
  pagedRows: pagedConstituentRows,
  pageCount: constituentPageCount,
  resultStart: constituentResultStart,
  resultEnd: constituentResultEnd,
  sort: handleConstituentSort,
  setPage: setConstituentPage,
  reset: resetConstituentRows,
} = useSortedPagedRows(constituentRows, constituentSortValue)

let chartRequestId = 0
let detailResizeObserver: ResizeObserver | null = null
let observedDetailContent: HTMLElement | null = null

const summaryGroupCount = computed(() => store.groups.filter((group) => !['all', 'overview'].includes(group.id)).length)

const detailTabs = computed(() => {
  const tabs: Array<{ id: IndicatorDetailTab; label: string }> = [
    { id: 'detail', label: 'Indicator Detail' },
  ]
  if (detail.value?.blogResults.length) {
    tabs.push({ id: 'research', label: 'Research & Blog Posts' })
  }
  if (detail.value?.relatedCharts.length) {
    tabs.push({ id: 'related', label: 'Related Charts' })
  }
  if (detail.value?.constituentConditions.length) {
    tabs.push({ id: 'constituents', label: 'Constituent Conditions' })
  }
  return tabs
})

const sidebarItems = computed(() => {
  const query = listSearchQuery.value.trim().toLowerCase()
  return store.sourceItems.filter((item) => {
    if (!query) return true
    return (
      item.name.toLowerCase().includes(query) ||
      item.group.toLowerCase().includes(query) ||
      item.subgroup.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query)
    )
  })
})

const activeIndicator = computed(() => store.sourceItems.find((item) => item.id === indicatorId.value))

const showCftcNotice = computed(() => hasCftcDataNotice(indicatorId.value))

// Read the star from the favorites list rather than the row flag: arriving from My
// Favorites or a related chart means no row for this indicator is loaded at all.
const isFavorite = computed(() =>
  store.favoriteIndicators.some((favorite) => favorite.url.toLowerCase() === indicatorId.value.toLowerCase()),
)
const breadcrumbGroupLabel = computed(() => {
  if (store.activeGroup.id === 'stock' && store.activeSubgroup.id !== 'stock') {
    return store.activeSubgroup.label
  }
  return store.activeGroup.label
})
const listLabel = computed(() => store.listLabel)
// Every route back to the list carries the list it came from.
const backToList = computed(() => ({ name: 'indicators' as const, query: { list: store.listKey } }))

const detailMeta = computed(() => {
  const item = detail.value
  if (!item) return []

  return [
    { label: 'Time Frame', value: detailTimeFrame(item) },
    { label: 'Update Schedule', value: detailUpdateSchedule(item) },
    { label: 'Source', value: detailSource(item) },
    { label: 'Last Updated', value: detailLastUpdated(item) },
  ]
})

const latestStandardChartRow = computed(() => {
  if (!Array.isArray(chartRows.value) || !chartRows.value.length) return null

  const datedRows = chartRows.value
    .map((row) => ({ row, timestamp: rowDateTimestamp(row) }))
    .filter((item): item is { row: IndicatorChartDataRow; timestamp: number } => item.timestamp !== null)
    .sort((left, right) => left.timestamp - right.timestamp)

  return datedRows.at(-1)?.row ?? chartRows.value.at(-1) ?? null
})

const lastCloseValue = computed(() => {
  const item = detail.value
  const row = latestStandardChartRow.value
  if (!item || !row) return null

  return indicatorChartValue(item, row)
})

const extremeLevels = computed(() => {
  const item = detail.value
  if (!item) return []

  const rowOpt = latestChartNumber('opt')
  const rowPess = latestChartNumber('pess')

  return [
    {
      label: 'Excessive Optimism',
      value: formatExtremeValue(rowOpt ?? item.opt),
      tone: 'optimism',
    },
    {
      label: 'Excessive Pessimism',
      value: formatExtremeValue(rowPess ?? item.pess),
      tone: 'pessimism',
    },
  ]
})

const returnSegmentColumns = computed(() => {
  const columns = new Set<string>()
  for (const row of detail.value?.returnSegments ?? []) {
    Object.keys(row).forEach((key) => columns.add(key))
  }
  return Array.from(columns)
})

function changeText(item: IndicatorDetail) {
  const formatted = formatIndicatorNumber(item.change)
  const rawType = String(item.raw?.last_change_type ?? '').toLowerCase()
  if (formatted !== '—' && rawType === 'percent' && !formatted.endsWith('%')) return `${formatted}%`
  return formatted
}

function changeClass(value: number) {
  if (value < 0) return 'indicator-stat-card__value--negative'
  if (value > 0) return 'indicator-stat-card__value--positive'
  return ''
}

function rowValueForKey(row: IndicatorChartDataRow, key: string) {
  if (!key) return undefined
  if (Object.prototype.hasOwnProperty.call(row, key)) return row[key]

  const matchedKey = Object.keys(row).find((rowKey) => rowKey.toLowerCase() === key.toLowerCase())
  return matchedKey ? row[matchedKey] : undefined
}

function rowNumberForKey(row: IndicatorChartDataRow, key: string) {
  return parseIndicatorNumber(rowValueForKey(row, key))
}

function latestChartNumber(key: string) {
  const row = latestStandardChartRow.value
  return row ? rowNumberForKey(row, key) : null
}

function formatExtremeValue(value: unknown) {
  return parseIndicatorNumber(value) === null ? 'None' : formatIndicatorNumber(value)
}

function isChartSummaryExcludedKey(key: string) {
  return ['date', 'dumb', 'color', 'change', 'percent_change', 'opt', 'pess'].includes(key.toLowerCase())
}

function rawDetailString(item: IndicatorDetail, key: string) {
  const value = item.raw?.[key]
  return value === undefined || value === null ? '' : String(value).trim()
}

function detailTickerKeys(item: IndicatorDetail) {
  return [
    rawDetailString(item, 'ticker'),
    rawDetailString(item, 'Ticker'),
    rawDetailString(item, 'symbol'),
    rawDetailString(item, 'Symbol'),
    rawDetailString(item, 'chart_symbol'),
    String(item.marketSymbol ?? '').trim(),
    rawDetailString(item, 'market_symbol'),
  ].filter(Boolean)
}

function indicatorChartValue(item: IndicatorDetail, row: IndicatorChartDataRow) {
  const candidateKeys = [
    ...detailTickerKeys(item),
    'last_close',
    'lastClose',
    'close',
    'Close',
    item.id,
    String(item.raw?.url ?? ''),
    String(item.raw?.chart_url ?? ''),
    'last_value',
    'last',
    'value',
    'reading',
  ].filter(Boolean)

  for (const key of Array.from(new Set(candidateKeys))) {
    const value = rowNumberForKey(row, key)
    if (value !== null) return value
  }

  const marketSymbol = String(item.marketSymbol ?? item.raw?.market_symbol ?? '').trim().toLowerCase()
  const numericEntries = Object.entries(row).filter(
    ([key, value]) => !isChartSummaryExcludedKey(key) && parseIndicatorNumber(value) !== null,
  )
  const nonMarketEntry = numericEntries.find(([key]) => !marketSymbol || key.toLowerCase() !== marketSymbol)
  const fallbackValue = nonMarketEntry?.[1] ?? numericEntries[0]?.[1]

  return parseIndicatorNumber(fallbackValue)
}

function detailTimeFrame(item: IndicatorDetail) {
  const raw = String(item.raw?.timeframe ?? item.timeFrame ?? '').trim()
  const text = raw.replace(/\s+/g, ' ').replace(/\s*-\s*/g, '-')
  const lower = text.toLowerCase()

  if (['short', 'short-term'].includes(lower)) return 'Short-Term'
  if (['medium', 'medium-term', 'intermediate', 'short to intermediate', 'intermediate to long'].includes(lower)) {
    return 'Medium-Term'
  }
  if (['long', 'long-term'].includes(lower)) return 'Long-Term'

  return text || '—'
}

function detailUpdateSchedule(item: IndicatorDetail) {
  const raw = String(item.raw?.updated ?? item.updateSchedule ?? '').trim()
  return raw.split(/\s+/)[0] || 'Daily'
}

function detailSource(item: IndicatorDetail) {
  return String(item.raw?.source ?? item.source ?? '').trim() || 'Sentimentrader'
}

function detailLastUpdated(item: IndicatorDetail) {
  return formatIndicatorDate(item.raw?.last_update ?? item.raw?.updated_at ?? item.updatedAt)
}

function segmentValue(row: Record<string, string | number | null>, column: string) {
  const value = row[column]
  if (value === undefined || value === null || value === '') return '—'
  const text = String(value)
  if (/^(return|time)$/i.test(column) && !text.endsWith('%')) return `${text}%`
  return text
}

function openIndicator(indicator: Indicator | { url: string }) {
  const id = 'id' in indicator ? indicator.id : indicator.url
  if (!id || id === indicatorId.value) return
  if ('sourceList' in indicator) {
    store.rememberIndicatorSource(indicator.id, indicator.sourceList)
  }
  void router.push({ name: 'indicator-detail', params: { id } })
}

function toggleFavorite() {
  const id = activeIndicator.value?.id ?? detail.value?.id
  if (id) {
    void store.toggleFavorite(id)
  }
}

function toggleSidebarFavorite(id: string) {
  void store.toggleFavorite(id)
}

/** Chart rows carry no fixed schema, so columns are the union of their keys. */
function rowsToCsv(rows: IndicatorChartDataRow[]) {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  return toCsv(columns, rows.map((row) => columns.map((column) => row[column])))
}

function rowDateTimestamp(row: IndicatorChartDataRow) {
  const value = row.date ?? row.Date
  if (typeof value === 'number') return value > 1_000_000_000_000 ? value : value * 1000

  const text = String(value ?? '').trim()
  const dateParts = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (dateParts) {
    const [, year, month, day] = dateParts
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime()
  }

  const timestamp = Date.parse(text)
  return Number.isFinite(timestamp) ? timestamp : null
}

function filterRecentThreeMonths(rows: IndicatorChartDataRow[], currentDate: Date) {
  const threeMonthsAgo = new Date(currentDate)
  threeMonthsAgo.setHours(0, 0, 0, 0)
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  return rows.filter((row) => {
    const timestamp = rowDateTimestamp(row)
    return timestamp !== null && timestamp >= threeMonthsAgo.getTime()
  })
}

function csvFilename(item: IndicatorDetail) {
  const name = (item.title || item.id).replace(/[\\/:*?"<>|]+/g, ' ').trim().replace(/\s+/g, '-')
  return `${name || 'indicator'}.csv`
}

function isSeasonalityIndicator(item: IndicatorDetail) {
  return isSeasonalityIndicatorType(item.raw?.type ?? item.type)
}

function chartRowsLength(data: IndicatorChartData) {
  if (Array.isArray(data)) return data.length
  return data.day_of_year.length + data.current_day_of_year.length + data.month.length
}

async function downloadCsv() {
  if (!detail.value || isDownloadingCsv.value) return

  if (isSeasonalityIndicator(detail.value)) {
    csvMessage.value = 'No data available for download'
    return
  }

  isDownloadingCsv.value = true
  csvMessage.value = ''
  try {
    let rows = Array.isArray(chartRows.value) ? chartRows.value : []
    try {
      rows = await fetchIndicatorDownloadData(detail.value.id)
    } catch (error) {
      console.log('用户无 indicator api 权限', error)
      rows = filterRecentThreeMonths(Array.isArray(chartRows.value) ? chartRows.value : [], new Date())
    }

    if (!rows.length) {
      csvMessage.value = 'No data available for download'
      return
    }

    downloadCsvFile(csvFilename(detail.value), rowsToCsv(rows))
    csvMessage.value = 'CSV downloaded'
  } finally {
    isDownloadingCsv.value = false
  }
}

async function loadChartRows(id: string, requestId: number) {
  isChartLoading.value = true
  chartError.value = ''
  chartRows.value = []

  try {
    const rows = await fetchIndicatorChartData(id)
    if (requestId === chartRequestId) {
      chartRows.value = rows
    }
  } catch {
    if (requestId === chartRequestId) {
      chartError.value = 'Unable to load chart data'
    }
  } finally {
    if (requestId === chartRequestId) {
      isChartLoading.value = false
    }
  }
}

async function loadRelatedRows(id: string, charts: IndicatorDetail['relatedCharts'], requestId: number) {
  const { rows: resolved, pending } = mergeRelatedChartRows(charts, (url) => store.indicatorsById.get(url.toLowerCase()), id)

  relatedRows.value = resolved
  relatedPage.value = 1

  if (!pending.length) {
    isRelatedLoading.value = false
    return
  }

  isRelatedLoading.value = true

  try {
    const fetched = await Promise.all(
      pending.map(async (chart) => {
        try {
          const detail = await store.ensureDetail(chart.url)
          // fetchIndicatorDetail can resolve to a seeded detail for unrelated ids, so a
          // mismatched id means the chart has no data rather than that it failed.
          return isDetailForChart(chart, detail) ? indicatorFromRelatedChart(chart, detail) : unresolvedRelatedChartRow(chart)
        } catch {
          return unresolvedRelatedChartRow(chart)
        }
      }),
    )

    if (requestId !== relatedRequestId) return

    relatedRows.value = [...resolved, ...fetched]
  } finally {
    if (requestId === relatedRequestId) {
      isRelatedLoading.value = false
    }
  }
}

function ensureRelatedRows() {
  const id = indicatorId.value
  const charts = detail.value?.relatedCharts ?? []
  if (!id || !charts.length || relatedLoadedForId === id) return

  relatedLoadedForId = id
  const requestId = ++relatedRequestId
  void loadRelatedRows(id, charts, requestId)
}

function updateSidebarHeight() {
  const element = detailContentElement.value
  // Only in the two-column layout: stacked, a sidebar forced to the detail's height
  // would just leave a large gap under a short list.
  const sideBySide = typeof window !== 'undefined' && window.matchMedia(sidebarBreakpoint).matches

  if (!element || !sideBySide) {
    sidebarHeight.value = ''
    return
  }

  const height = Math.ceil(element.getBoundingClientRect().height)
  sidebarHeight.value = height > 0 ? `${height}px` : ''
}

function observeDetailContent() {
  const element = detailContentElement.value
  if (element === observedDetailContent) {
    updateSidebarHeight()
    return
  }

  detailResizeObserver?.disconnect()
  observedDetailContent = element

  if (element && typeof ResizeObserver !== 'undefined') {
    detailResizeObserver = new ResizeObserver(updateSidebarHeight)
    detailResizeObserver.observe(element)
  }

  updateSidebarHeight()
}

onMounted(() => {
  window.addEventListener('resize', updateSidebarHeight)
  void nextTick(observeDetailContent)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateSidebarHeight)
  detailResizeObserver?.disconnect()
})

watch(
  indicatorId,
  async (id) => {
    if (!id) return

    const requestId = ++chartRequestId
    activeTab.value = 'detail'
    showReturnSegments.value = false
    detailMessage.value = ''
    csvMessage.value = ''

    relatedRequestId++
    relatedLoadedForId = ''
    relatedRows.value = []
    isRelatedLoading.value = false
    resetRelatedRows()
    resetResearchRows()
    resetConstituentRows()

    if (isUnavailableIndicatorId(id)) {
      detailMessage.value = unableToFindIndicatorMessage
      chartRows.value = []
      chartError.value = ''
      isChartLoading.value = false
      return
    }

    try {
      const loadedDetail = await store.ensureDetail(id)

      // A list carried in the URL wins: arriving from Most Popular or My Favorites must
      // keep that list, whereas `setActiveSource` would force the grouped section and
      // drop the user into a subgroup list instead.
      const originKey = route.query.list
      if (typeof originKey === 'string' && originKey && store.setListKey(originKey)) {
        await store.ensureCurrentList()
        if (requestId === chartRequestId) await loadChartRows(id, requestId)
        return
      }

      const source = store.sourceForDetail(id, loadedDetail)
      if (source) store.setActiveSource(source)
      await store.ensureList(source ?? store.activeSource)
    } catch {
      if (requestId === chartRequestId) {
        detailMessage.value = unableToFindIndicatorMessage
        chartRows.value = []
        chartError.value = ''
        isChartLoading.value = false
      }
      return
    }

    if (requestId === chartRequestId) {
      await loadChartRows(id, requestId)
    }
  },
  { immediate: true },
)

watch(
  () => [detail.value?.id, activeTab.value, showReturnSegments.value, chartRowsLength(chartRows.value)],
  () => {
    void nextTick(observeDetailContent)
  },
)

// Related charts are only resolved once the tab is actually opened.
watch(activeTab, (tab) => {
  if (tab === 'related') ensureRelatedRows()
})
</script>

<template>
  <div class="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
    <main class="px-[var(--page-gutter)] pb-8 pt-6">
      <section class="mb-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-4">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 class="text-3xl font-semibold leading-tight text-[var(--app-text)]">Indicators</h1>
            <p class="mt-1 text-sm text-[var(--app-text-muted)]">
              Explore market sentiment, breadth, flow, macro and seasonality.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3 text-sm font-semibold text-[var(--app-text)]">
            <span class="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] px-3.5">
              <span class="h-2.5 w-2.5 rounded-full bg-rose-500" />
              {{ store.optimisticCount }} optimistic
            </span>
            <span class="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] px-3.5">
              <span class="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              {{ store.pessimisticCount }} pessimistic
            </span>
            <span class="inline-flex h-10 items-center rounded-md bg-[var(--app-primary-soft-alt)] px-3.5">
              {{ summaryGroupCount }} Groups
            </span>
            <span class="inline-flex h-10 items-center rounded-md bg-[var(--app-primary-soft-alt)] px-3.5">
              {{ store.totalIndicators }} Indicators
            </span>
          </div>
        </div>
      </section>

      <nav class="mb-3 flex min-h-14 flex-wrap items-center gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 text-sm font-semibold">
        <RouterLink class="inline-flex items-center gap-2 text-[var(--app-primary)] hover:underline" :to="backToList">
          <ChevronLeft :size="18" />
          Back to Indicators
        </RouterLink>
        <span class="h-6 w-px bg-[var(--app-border)]" />
        <!-- Standalone lists have no group, so only the list name is shown. -->
        <template v-if="!store.isStandaloneList">
          <span class="text-[var(--app-text-secondary)]">{{ breadcrumbGroupLabel }}</span>
          <span class="text-[var(--app-text-faint)]">/</span>
        </template>
        <RouterLink class="text-[var(--app-primary)] hover:underline" :to="backToList">
          {{ listLabel }}
        </RouterLink>
      </nav>

      <section
        v-if="detailMessage"
        class="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900"
      >
        {{ detailMessage }}
      </section>

      <section v-else-if="detail" class="grid items-start gap-3 xl:grid-cols-[400px_minmax(0,1fr)]">
        <aside
          class="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4"
          :style="sidebarHeight ? { height: sidebarHeight } : undefined"
        >
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-2xl font-semibold">Indicators</h2>
            <RouterLink
              class="flex h-8 w-8 items-center justify-center rounded-md text-[var(--app-primary)] transition hover:bg-[var(--app-primary-soft)]"
              :to="backToList"
              aria-label="Back to indicators list"
            >
              <ChevronLeft :size="20" />
            </RouterLink>
          </div>

          <label class="mb-10 flex h-10 shrink-0 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3">
            <input v-model="listSearchQuery" class="w-full bg-transparent text-sm outline-none" placeholder="Search indicators..." />
            <Search :size="18" class="ml-2 shrink-0 text-[var(--app-text-secondary)]" />
          </label>

          <h3 class="mb-2 shrink-0 text-sm font-semibold">{{ listLabel }}</h3>
          <div class="min-h-0 flex-1 overflow-y-auto pr-1">
            <!-- Split so the star can be its own control: a button nested in a link
                 would be invalid, and clicking the star must not navigate. -->
            <div
              v-for="item in sidebarItems"
              :key="item.id"
              class="flex items-start gap-2 border-b border-[var(--app-border-muted)] px-2 py-2 text-sm leading-5"
              :class="{ 'border-l-4 border-l-[var(--app-primary)] bg-[var(--app-primary-soft)] pl-2 font-semibold': item.id === indicatorId }"
            >
              <RouterLink
                class="line-clamp-2 min-w-0 flex-1 hover:text-[var(--app-primary)]"
                :class="item.id === indicatorId ? 'text-[var(--app-primary)]' : 'text-[var(--app-text-secondary)]'"
                :to="{ name: 'indicator-detail', params: { id: item.id }, query: { list: store.listKey } }"
                @click="store.rememberIndicatorSource(item.id, item.sourceList)"
              >
                {{ item.name }}
              </RouterLink>

              <span v-if="item.favoriteLocked" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <button
                v-else
                class="mt-0.5 shrink-0 transition"
                :class="item.favorite ? 'text-[var(--app-favorite)]' : 'text-[var(--app-text-faint)] hover:text-[var(--app-favorite)]'"
                type="button"
                :title="favoriteActionLabel(item.favorite)"
                :aria-label="favoriteActionLabel(item.favorite)"
                @click="toggleSidebarFavorite(item.id)"
              >
                <Star :size="16" :fill="item.favorite ? 'var(--app-favorite)' : 'transparent'" />
              </button>
            </div>
            <p v-if="!sidebarItems.length" class="py-8 text-center text-sm text-[var(--app-text-muted)]">No indicators found</p>
          </div>
        </aside>

        <section ref="detailContentElement" class="min-w-0 space-y-3">
          <section class="indicator-summary">
            <div class="indicator-summary__header">
              <h3 class="indicator-summary__title">{{ detail.title }}</h3>
              <button
                class="indicator-summary__favorite"
                :class="{ 'indicator-summary__favorite--active': isFavorite }"
                type="button"
                :aria-label="favoriteActionLabel(isFavorite)"
                :title="favoriteActionLabel(isFavorite)"
                @click="toggleFavorite"
              >
                <Star :size="32" :fill="isFavorite ? 'var(--app-favorite)' : 'transparent'" />
              </button>
            </div>

            <div class="indicator-summary__meta-row">
              <span v-for="meta in detailMeta" :key="meta.label" class="indicator-meta-pill">
                <span class="indicator-meta-pill__label">{{ meta.label }}:</span>
                <span class="indicator-meta-pill__value">{{ meta.value }}</span>
              </span>
              <span class="indicator-sentiment-pill">
                <IndicatorSentimentMeter :score="detail.sentimentScore" />
                <span class="indicator-sentiment-pill__text" :class="sentimentTextClass(detail.sentimentScore)">
                  {{ sentimentLabelFromScore(detail.sentimentScore) }}
                </span>
              </span>
            </div>

            <div class="indicator-summary__stats">
              <div class="indicator-stat-card">
                <p class="indicator-stat-card__label">Current</p>
                <p class="indicator-stat-card__value">{{ formatIndicatorNumber(detail.currentValue) }}</p>
              </div>
              <div class="indicator-stat-card">
                <p class="indicator-stat-card__label">Change</p>
                <p class="indicator-stat-card__value" :class="changeClass(detail.change)">
                  {{ changeText(detail) }}
                </p>
              </div>
              <div class="indicator-stat-card">
                <p class="indicator-stat-card__label">Updated</p>
                <p class="indicator-stat-card__value indicator-stat-card__value--date">{{ detailLastUpdated(detail) }}</p>
              </div>
              <div class="indicator-stat-card">
                <p class="indicator-stat-card__label">LAST CLOSE</p>
                <p class="indicator-stat-card__value">{{ formatIndicatorNumber(lastCloseValue) }}</p>
              </div>
              <div class="indicator-stat-card indicator-stat-card--extremes">
                <p class="indicator-stat-card__label">EXTREME LEVELS</p>
                <div class="indicator-extreme-list">
                  <div v-for="level in extremeLevels" :key="level.label" class="indicator-extreme-row">
                    <span class="indicator-extreme-dot" :class="`indicator-extreme-dot--${level.tone}`" />
                    <span class="indicator-extreme-label">{{ level.label }}</span>
                    <span class="indicator-extreme-value">{{ level.value }}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <IndicatorTrendChart
            :detail="detail"
            :rows="chartRows"
            :loading="isChartLoading"
            :error="chartError"
            @download="downloadCsv"
          />
          <p v-if="csvMessage" class="text-right text-sm font-medium text-[var(--app-text-muted)]">{{ csvMessage }}</p>

          <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]">
            <CftcDataNotice v-if="showCftcNotice" />

            <div class="flex min-w-0 overflow-x-auto border-b border-[var(--app-border)] px-4">
              <button
                v-for="tab in detailTabs"
                :key="tab.id"
                class="h-12 shrink-0 border-b-2 px-3 text-base font-semibold"
                :class="activeTab === tab.id ? 'border-[var(--app-primary)] text-[var(--app-primary)]' : 'border-transparent text-[var(--app-text-secondary)] hover:text-[var(--app-primary)]'"
                type="button"
                @click="activeTab = tab.id"
              >
                {{ tab.label }}
              </button>
            </div>

            <div v-if="activeTab === 'detail'" class="p-5">
              <section>
                <h3 class="mb-2 text-base font-semibold text-[var(--app-text)]">Construction</h3>
                <div class="indicator-rich-text text-sm leading-6 text-[var(--app-text-secondary)]" v-html="detail.constructionHtml || detail.construction" />
              </section>

              <section v-if="detail.showReturns && detail.thresholdRows.length" class="mt-6 border-t border-[var(--app-border)] pt-5">
                <h3 class="mb-3 text-base font-semibold text-[var(--app-text)]">Threshold Return Analysis</h3>
                <div class="overflow-hidden rounded-md border border-[var(--app-border)]">
                  <table class="min-w-full text-left text-sm">
                    <thead class="bg-[var(--app-surface-muted)] text-[var(--app-text)]">
                      <tr>
                        <th class="px-3 py-2">Location</th>
                        <th class="px-3 py-2">Annualized Return</th>
                        <th class="px-3 py-2">Percent Time</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[var(--app-border-muted)] text-[var(--app-text-secondary)]">
                      <tr v-for="row in detail.thresholdRows" :key="row.location">
                        <td class="px-3 py-2 font-semibold text-[var(--app-text)]">{{ row.location }}</td>
                        <td class="px-3 py-2">{{ row.annualizedReturn }}</td>
                        <td class="px-3 py-2">{{ row.percentTime }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <button
                  v-if="detail.returnSegments.length"
                  class="mt-3 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm font-semibold text-[var(--app-primary)] hover:bg-[var(--app-primary-soft)]"
                  type="button"
                  @click="showReturnSegments = !showReturnSegments"
                >
                  {{ showReturnSegments ? 'Hide' : 'Show' }} Return Segments
                </button>

                <div v-if="showReturnSegments && detail.returnSegments.length" class="mt-3 max-h-72 overflow-auto rounded-md border border-[var(--app-border)]">
                  <table class="min-w-full text-left text-xs">
                    <thead class="bg-[var(--app-surface-muted)] text-[var(--app-text)]">
                      <tr>
                        <th v-for="column in returnSegmentColumns" :key="column" class="px-3 py-2">{{ column }}</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[var(--app-border-muted)] text-[var(--app-text-secondary)]">
                      <tr v-for="(row, rowIndex) in detail.returnSegments" :key="rowIndex">
                        <td v-for="column in returnSegmentColumns" :key="column" class="px-3 py-2">
                          {{ segmentValue(row, column) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <div v-else-if="activeTab === 'research'" class="p-5">
              <IndicatorListTable
                :indicators="pagedResearchRows"
                :loading="false"
                :columns="researchPostColumns"
                :show-favorite="false"
                :sort-key="researchSortKey"
                :sort-direction="researchSortDirection"
                @sort="handleResearchSort"
              />

              <div class="mt-4 flex flex-col gap-3 text-sm font-semibold text-[var(--app-text-secondary)] lg:flex-row lg:items-center lg:justify-between">
                <span>Showing {{ researchResultStart }}–{{ researchResultEnd }} of {{ sortedResearchRows.length }} posts</span>
                <IndicatorPagination :page="researchPage" :page-count="researchPageCount" @change="setResearchPage" />
              </div>
            </div>

            <div v-else-if="activeTab === 'related'" class="p-5">
              <IndicatorListTable
                :indicators="pagedRelatedRows"
                :loading="isRelatedLoading"
                :columns="relatedChartColumns"
                :show-favorite="false"
                :sort-key="relatedSortKey"
                :sort-direction="relatedSortDirection"
                @open="openIndicator"
                @sort="handleRelatedSort"
              />

              <div class="mt-4 flex flex-col gap-3 text-sm font-semibold text-[var(--app-text-secondary)] lg:flex-row lg:items-center lg:justify-between">
                <span>Showing {{ relatedResultStart }}–{{ relatedResultEnd }} of {{ sortedRelatedRows.length }} related charts</span>
                <IndicatorPagination :page="relatedPage" :page-count="relatedPageCount" @change="setRelatedPage" />
              </div>
            </div>

            <div v-else class="p-5">
              <ConstituentConditionsTable
                :rows="pagedConstituentRows"
                :columns="constituentTableColumns"
                :sort-key="constituentSortKey"
                :sort-direction="constituentSortDirection"
                @sort="handleConstituentSort"
              />

              <div class="mt-4 flex flex-col gap-3 text-sm font-semibold text-[var(--app-text-secondary)] lg:flex-row lg:items-center lg:justify-between">
                <span>Showing {{ constituentResultStart }}–{{ constituentResultEnd }} of {{ sortedConstituentRows.length }} constituents</span>
                <IndicatorPagination :page="constituentPage" :page-count="constituentPageCount" @change="setConstituentPage" />
              </div>
            </div>
          </section>
        </section>
      </section>
    </main>
  </div>
</template>

<style scoped>
.indicator-summary {
  color: var(--app-text);
}

.indicator-summary__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.indicator-summary__title {
  min-width: 0;
  color: var(--app-text);
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.indicator-summary__favorite {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  color: var(--app-text-secondary);
  transition:
    background-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.indicator-summary__favorite:hover,
.indicator-summary__favorite:focus-visible {
  background: var(--app-primary-soft);
  color: var(--app-favorite);
  box-shadow: 0 0 0 3px var(--app-primary-shadow);
  outline: none;
}

/* Held yellow while saved, so hovering a starred indicator never looks like removal. */
.indicator-summary__favorite--active,
.indicator-summary__favorite--active:hover,
.indicator-summary__favorite--active:focus-visible {
  color: var(--app-favorite);
}

.indicator-summary__meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  margin-bottom: 16px;
}

.indicator-meta-pill,
.indicator-sentiment-pill {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--app-border-muted);
  border-radius: 999px;
  background: var(--app-primary-soft-alt);
  color: var(--app-text-secondary);
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1;
  padding: 0 14px;
}

.indicator-meta-pill__label {
  color: var(--app-text-muted);
}

.indicator-meta-pill__value {
  color: var(--app-text);
}

.indicator-sentiment-pill {
  gap: 12px;
  padding-right: 16px;
}

.indicator-sentiment-pill__text {
  white-space: nowrap;
}

.indicator-summary__stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(148px, 1fr));
  gap: 14px;
}

.indicator-stat-card {
  display: flex;
  min-height: 104px;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-surface);
  padding: 18px 22px;
  box-shadow: 0 1px 0 var(--app-border-muted);
}

.indicator-stat-card__label {
  color: var(--app-text-muted);
  font-size: 0.875rem;
  font-weight: 800;
  line-height: 1.2;
}

.indicator-stat-card__value {
  min-width: 0;
  margin-top: 10px;
  color: var(--app-text);
  font-size: 1.875rem;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.05;
  overflow-wrap: anywhere;
}

.indicator-stat-card__value--date {
  font-size: 1.35rem;
  line-height: 1.18;
}

.indicator-stat-card__value--positive {
  color: var(--app-positive);
}

.indicator-stat-card__value--negative {
  color: var(--app-negative);
}

.indicator-stat-card--extremes {
  justify-content: flex-start;
}

.indicator-extreme-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.indicator-extreme-row {
  display: grid;
  min-width: 0;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  color: var(--app-text-secondary);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
}

.indicator-extreme-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.indicator-extreme-dot--optimism {
  background: var(--app-negative);
}

.indicator-extreme-dot--pessimism {
  background: var(--app-positive);
}

.indicator-extreme-label {
  min-width: 0;
  overflow-wrap: anywhere;
}

.indicator-extreme-value {
  color: var(--app-text);
  font-weight: 800;
}

@media (max-width: 1536px) {
  .indicator-summary__stats {
    grid-template-columns: repeat(3, minmax(148px, 1fr));
  }
}

@media (max-width: 920px) {
  .indicator-summary__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .indicator-summary__header {
    gap: 12px;
  }

  .indicator-summary__title {
    font-size: 1.5rem;
  }

  .indicator-summary__stats {
    grid-template-columns: minmax(0, 1fr);
  }

  .indicator-stat-card {
    min-height: 96px;
    padding: 16px;
  }
}

:deep(.indicator-rich-text a) {
  color: var(--app-primary);
  font-weight: 600;
  text-decoration: underline;
}

:deep(.indicator-rich-text p) {
  margin-bottom: 0.75rem;
}

:deep(.indicator-rich-text br) {
  content: '';
  display: block;
  margin-top: 0.35rem;
}
</style>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw, type RouteLocationRaw } from 'vue-router'
import { ArrowDown, ArrowUp, ChevronLeft, Menu, Search, Star, X } from '@lucide/vue'
import { fetchIndicatorChartData, fetchIndicatorDownloadData } from '@/entities/indicator/api/indicator.api'
import { isSeasonalityIndicatorType, pruneStandaloneDetailChartData } from '@/entities/indicator/model/indicator.chart'
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
import DetailSearchSidebar from '@/shared/ui/DetailSearchSidebar.vue'
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
const isTrendScoreDetail = computed(() => route.name === 'trend-score-detail')
const isHistoricalVolatilityDetail = computed(() => route.name === 'historical-volatility-detail')
const isStandaloneDetail = computed(() => isTrendScoreDetail.value || isHistoricalVolatilityDetail.value)

const historyState = computed(() => {
  // Tie the browser history state read to route changes. Vue Router keeps custom
  // state outside the route object, but the Trend detail needs it for a clean URL.
  route.fullPath
  if (typeof window === 'undefined') return {}
  return window.history.state ?? {}
})

const trendDetailSource = computed(() => {
  const source = historyState.value.trendSource
  return typeof source === 'string' && source ? source : 'spx'
})

const trendBackQuery = computed<LocationQueryRaw>(() => queryFromState(historyState.value.trendBackQuery))
const trendListLabel = computed(() => {
  const label = historyState.value.trendListLabel
  return typeof label === 'string' && label ? label : 'Trend Score'
})

const historicalDetailSource = computed(() => {
  const source = historyState.value.historicalSource
  return typeof source === 'string' && source ? source : 'historical_spx'
})

const historicalBackQuery = computed<LocationQueryRaw>(() => queryFromState(historyState.value.historicalBackQuery))
const historicalListLabel = computed(() => {
  const label = historyState.value.historicalListLabel
  return typeof label === 'string' && label ? label : 'Historical Volatility'
})

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

// Mobile detection for sidebar sheet pattern
const isMobile = ref(false)
let mobileQuery: MediaQueryList | null = null
const isSidebarSheetOpen = ref(false)

function updateMobileState() {
  isMobile.value = mobileQuery?.matches ?? false
}

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
  sort: handleConstituentSort,
  setPage: setConstituentPage,
  reset: resetConstituentRows,
} = useSortedPagedRows(constituentRows, constituentSortValue)

let chartRequestId = 0
let detailResizeObserver: ResizeObserver | null = null
let observedDetailContent: HTMLElement | null = null

interface IndicatorSummaryStat {
  label: string
  value: string
  valueClass?: string
  direction?: 'up' | 'down'
  directionValue?: string
}

interface ChartLineCandidate {
  key: string
  label: string
}

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

function queryFromState(value: unknown): LocationQueryRaw {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const query: LocationQueryRaw = {}
  for (const [key, raw] of Object.entries(value)) {
    if (Array.isArray(raw)) {
      query[key] = raw.map((item) => (item === null || item === undefined ? null : String(item)))
    } else if (raw === null || raw === undefined) {
      query[key] = raw as null | undefined
    } else {
      query[key] = String(raw)
    }
  }
  return query
}

const detailListItems = computed(() => {
  if (isTrendScoreDetail.value) return store.itemsBySource[trendDetailSource.value] ?? []
  if (isHistoricalVolatilityDetail.value) return store.itemsBySource[historicalDetailSource.value] ?? []
  return store.sourceItems
})

const currentIndicatorLabel = computed(() => detail.value?.title ?? '')

const sidebarItems = computed(() => {
  const query = listSearchQuery.value.trim().toLowerCase()
  return detailListItems.value.filter((item) => {
    if (!query) return true
    return (
      item.name.toLowerCase().includes(query) ||
      item.group.toLowerCase().includes(query) ||
      item.subgroup.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query)
    )
  })
})

const sidebarNavItems = computed(() =>
  sidebarItems.value.map((item) => ({
    ...item,
    label: item.name,
    to: detailRouteFor(item.id),
    active: item.id === indicatorId.value,
  })),
)

const activeIndicator = computed(() => detailListItems.value.find((item) => item.id === indicatorId.value))

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
const listLabel = computed(() => {
  if (isTrendScoreDetail.value) return trendListLabel.value
  if (isHistoricalVolatilityDetail.value) return historicalListLabel.value
  return store.listLabel
})
const backText = computed(() => {
  if (isTrendScoreDetail.value) return 'Back to Trend Score'
  if (isHistoricalVolatilityDetail.value) return 'Back to Historical Volatility'
  return 'Back to Indicators'
})
const showGroupBreadcrumb = computed(() => !isStandaloneDetail.value && !store.isStandaloneList)
const sidebarSearchPlaceholder = computed(() => {
  if (isTrendScoreDetail.value) return 'Search trend scores...'
  if (isHistoricalVolatilityDetail.value) return 'Search volatility...'
  return 'Search indicators...'
})
const emptySidebarMessage = computed(() => {
  if (isTrendScoreDetail.value) return 'No trend scores found'
  if (isHistoricalVolatilityDetail.value) return 'No volatility rows found'
  return 'No indicators found'
})
// Every route back to the list carries the list it came from.
const backToList = computed<RouteLocationRaw>(() =>
  isTrendScoreDetail.value
    ? { name: 'trend-score' as const, query: trendBackQuery.value }
    : isHistoricalVolatilityDetail.value
      ? { name: 'historical-volatility' as const, query: historicalBackQuery.value }
      : { name: 'indicators' as const, query: { list: store.listKey } },
)

const detailMeta = computed(() => {
  const item = detail.value
  if (!item) return []

  return [
    { label: 'Time Frame', value: detailTimeFrame(item) },
    { label: 'Update Schedule', value: detailUpdateSchedule(item) },
    { label: 'Source', value: detailSource(item) },
    // Chart date wins; search info is the fallback for indicators with no rows.
    { label: 'Last Updated', value: latestChartDate.value ? formatIndicatorDate(latestChartDate.value) : detailLastUpdated(item) },
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

/** Date from the latest chart row, so "Last Updated" follows the chart when available. */
const latestChartDate = computed(() => {
  const row = latestStandardChartRow.value
  if (!row) return ''

  const value = rowValueForKey(row, 'date') ?? rowValueForKey(row, 'Date')
  return String(value ?? '').trim()
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

const primarySummaryStats = computed<IndicatorSummaryStat[]>(() => {
  const item = detail.value
  if (!item) return []

  const lineStats = doubleLineSummaryStats(item)
  if (lineStats.length === 2) return lineStats

  // Chart data is authoritative when present; search info is the fallback.
  return [
    { label: 'Current', value: formatIndicatorNumber(chartSummaryValue(item)) },
    {
      label: 'Change',
      value: chartSummaryChangeText(item),
      valueClass: changeClass(chartSummaryChange(item)),
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

function sortedStandardChartRows() {
  if (!Array.isArray(chartRows.value) || !chartRows.value.length) return []

  const datedRows = chartRows.value
    .map((row) => ({ row, timestamp: rowDateTimestamp(row) }))
    .filter((item): item is { row: IndicatorChartDataRow; timestamp: number } => item.timestamp !== null)
    .sort((left, right) => left.timestamp - right.timestamp)

  return datedRows.length ? datedRows.map((item) => item.row) : chartRows.value
}

function latestChartNumberForKey(key: string) {
  const rows = sortedStandardChartRows()
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const value = rowNumberForKey(rows[index], key)
    if (value !== null) return value
  }
  return null
}

/**
 * The indicator's own value from a chart row. Unlike `indicatorChartValue` (which puts
 * the market symbol first for the LAST CLOSE card), this keeps the ticker column as the
 * last resort so Current never shows the Symbol's value instead of the indicator's.
 */
function chartIndicatorValue(item: IndicatorDetail, row: IndicatorChartDataRow) {
  const candidateKeys = [
    item.id,
    String(item.raw?.url ?? ''),
    String(item.raw?.chart_url ?? ''),
    'last_value',
    'last',
    'value',
    'reading',
    'close',
    'Close',
    'last_close',
    'lastClose',
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

/** Current value from the latest chart row; falls back to the search-info value. */
function chartSummaryValue(item: IndicatorDetail) {
  const row = latestStandardChartRow.value
  if (row) {
    const value = chartIndicatorValue(item, row)
    if (value !== null) return value
  }
  return item.currentValue
}

/**
 * Change from chart data first: an explicit change column on the latest row, otherwise
 * the delta between the last two rows of the charted value. Falls back to search info.
 */
function chartSummaryChange(item: IndicatorDetail): number {
  const row = latestStandardChartRow.value
  if (row) {
    for (const key of ['change', 'last_change', 'Change']) {
      const value = rowNumberForKey(row, key)
      if (value !== null) return value
    }

    const rows = sortedStandardChartRows()
    if (rows.length >= 2) {
      const prev = chartIndicatorValue(item, rows[rows.length - 2])
      const latest = chartIndicatorValue(item, rows[rows.length - 1])
      if (prev !== null && latest !== null) return latest - prev
    }
  }
  return item.change
}

function chartSummaryChangeText(item: IndicatorDetail) {
  const row = latestStandardChartRow.value
  if (row) {
    for (const key of ['percent_change', 'pct_change', 'PercentChange']) {
      const value = rowNumberForKey(row, key)
      if (value !== null) return `${formatIndicatorNumber(value)}%`
    }

    for (const key of ['change', 'last_change', 'Change']) {
      const value = rowNumberForKey(row, key)
      if (value !== null) return formatIndicatorNumber(value)
    }

    const rows = sortedStandardChartRows()
    if (rows.length >= 2) {
      const prev = chartIndicatorValue(item, rows[rows.length - 2])
      const latest = chartIndicatorValue(item, rows[rows.length - 1])
      if (prev !== null && latest !== null) return formatIndicatorNumber(latest - prev)
    }
  }
  return changeText(item)
}

function latestChartChangeForKey(key: string): Pick<IndicatorSummaryStat, 'direction' | 'directionValue'> {
  const rows = sortedStandardChartRows()
  let latest: number | null = null

  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const value = rowNumberForKey(rows[index], key)
    if (value === null) continue

    if (latest === null) {
      latest = value
      continue
    }

    const delta = latest - value
    if (delta > 0) return { direction: 'up', directionValue: `+${formatIndicatorNumber(delta, undefined, true)}` }
    if (delta < 0) return { direction: 'down', directionValue: formatIndicatorNumber(delta, undefined, true) }
    return {}
  }

  return {}
}

function availableChartNumericKeys() {
  if (!Array.isArray(chartRows.value)) return []

  const keys = new Set<string>()
  for (const row of chartRows.value) {
    for (const [key, value] of Object.entries(row)) {
      if (isChartSummaryExcludedKey(key)) continue
      if (parseIndicatorNumber(value) !== null) keys.add(key)
    }
  }

  return Array.from(keys)
}

function findChartKey(expectedKey: string) {
  const normalized = expectedKey.toLowerCase()
  return availableChartNumericKeys().find((key) => key.toLowerCase() === normalized)
}

function findChartKeyBySuffix(suffix: string, rejectSuffix = '') {
  const normalizedSuffix = suffix.toLowerCase()
  const normalizedRejectSuffix = rejectSuffix.toLowerCase()
  return availableChartNumericKeys().find((key) => {
    const lower = key.toLowerCase()
    return lower.endsWith(normalizedSuffix) && (!normalizedRejectSuffix || !lower.endsWith(normalizedRejectSuffix))
  })
}

function isTrendReltrendDetail(item: IndicatorDetail) {
  const values = [
    rawDetailString(item, 'type'),
    rawDetailString(item, 'sub_type'),
    rawDetailString(item, 'groups'),
    item.type,
  ]

  return isTrendScoreDetail.value || values.some((value) => value.toLowerCase().includes('trend_reltrend'))
}

function trendLineCandidates(item: IndicatorDetail): ChartLineCandidate[] {
  if (!isTrendReltrendDetail(item)) return []

  const rawPrefix = item.id.match(/^(.*?)_trend_reltrend$/)?.[1] ?? String(item.marketSymbol ?? '').trim()
  const trendKey = rawPrefix
    ? findChartKey(`${rawPrefix}_trend`) ?? findChartKeyBySuffix('_trend', '_reltrend')
    : findChartKeyBySuffix('_trend', '_reltrend')
  const relativeKey = rawPrefix
    ? findChartKey(`${rawPrefix}_reltrend`) ?? findChartKeyBySuffix('_reltrend')
    : findChartKeyBySuffix('_reltrend')
  if (!trendKey || !relativeKey) return []

  return [
    { key: trendKey, label: trendSeriesLabel(trendKey, 'trend') },
    { key: relativeKey, label: trendSeriesLabel(relativeKey, 'relative') },
  ]
}

function trendSeriesLabel(key: string, kind: 'trend' | 'relative') {
  const suffix = kind === 'trend' ? /_trend$/i : /_reltrend$/i
  const prefix = key.replace(suffix, '').trim()
  const symbol = prefix || String(detail.value?.marketSymbol ?? '').trim()
  return `${symbol.toUpperCase()} ${kind === 'trend' ? 'Trend Score' : 'Relative Trend Score'}`
}

function historicalVolatilityLineCandidates(item: IndicatorDetail): ChartLineCandidate[] {
  const groups = rawDetailString(item, 'groups')
  if (!isHistoricalVolatilityDetail.value && groups.toLowerCase() !== 'volatility_relvolatility') return []

  const symbol = String(item.marketSymbol ?? rawDetailString(item, 'market_symbol')).trim()
  const lowerSymbol = symbol.toLowerCase()
  const key20 =
    (lowerSymbol ? findChartKey(`${lowerSymbol}_volatility`) : undefined)
    ?? findChartKey('volatility_20d')
    ?? findChartKeyBySuffix('_volatility', '_volatility_60d')
  const key60 =
    (lowerSymbol ? findChartKey(`${lowerSymbol}_volatility_60d`) : undefined)
    ?? findChartKey('volatility_60d')
    ?? findChartKeyBySuffix('_volatility_60d')
  if (!key20 || !key60) return []

  return [
    { key: key20, label: 'Volatility (20-Day)' },
    { key: key60, label: 'Volatility (60-Day)' },
  ]
}

function doubleLineSummaryCandidates(item: IndicatorDetail): ChartLineCandidate[] {
  if (item.id === 'smart_dumb') {
    return [
      { key: 'model_smart_money', label: 'Smart Money' },
      { key: 'model_dumb_money', label: 'Dumb Money' },
    ]
  }

  if (item.id === 'risk_levels') {
    return [
      { key: 'model_risk_stocks_medium', label: 'Intermediate Term Risk Levels' },
      { key: 'model_risk_stocks_short', label: 'Short Term Risk Levels' },
    ]
  }

  const trendCandidates = trendLineCandidates(item)
  if (trendCandidates.length === 2) return trendCandidates

  return historicalVolatilityLineCandidates(item)
}

function doubleLineSummaryStats(item: IndicatorDetail): IndicatorSummaryStat[] {
  const stats = doubleLineSummaryCandidates(item)
    .map((candidate): IndicatorSummaryStat | null => {
      const value = latestChartNumberForKey(candidate.key)
      return value === null
        ? null
        : {
            label: candidate.label,
            value: formatIndicatorNumber(value, undefined, true),
            ...latestChartChangeForKey(candidate.key),
          }
    })
    .filter((stat): stat is IndicatorSummaryStat => stat !== null)

  return stats.length === 2 ? stats : []
}

function statDirectionIcon(direction: IndicatorSummaryStat['direction']) {
  if (direction === 'up') return ArrowUp
  if (direction === 'down') return ArrowDown
  return null
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

function detailRouteFor(id: string): RouteLocationRaw {
  if (isTrendScoreDetail.value) {
    return {
      name: 'trend-score-detail',
      params: { id },
      state: {
        trendBackQuery: trendBackQuery.value,
        trendListLabel: trendListLabel.value,
        trendSource: trendDetailSource.value,
      },
    }
  }

  if (isHistoricalVolatilityDetail.value) {
    return {
      name: 'historical-volatility-detail',
      params: { id },
      state: {
        historicalBackQuery: historicalBackQuery.value,
        historicalListLabel: historicalListLabel.value,
        historicalSource: historicalDetailSource.value,
      },
    }
  }

  return { name: 'indicator-detail', params: { id }, query: { list: store.listKey } }
}

function openIndicator(indicator: Indicator | { url: string }) {
  const id = 'id' in indicator ? indicator.id : indicator.url
  if (!id || id === indicatorId.value) return
  if ('sourceList' in indicator) {
    store.rememberIndicatorSource(indicator.id, indicator.sourceList)
  }
  void router.push(detailRouteFor(id))
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
      chartRows.value = pruneStandaloneDetailChartData(id, rows)
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
  // Mobile detection
  mobileQuery = window.matchMedia('(max-width: 1279px)')
  updateMobileState()
  mobileQuery.addEventListener('change', updateMobileState)

  window.addEventListener('resize', updateSidebarHeight)
  void nextTick(observeDetailContent)
})

onBeforeUnmount(() => {
  mobileQuery?.removeEventListener('change', updateMobileState)
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

      if (isTrendScoreDetail.value) {
        await store.ensureList(trendDetailSource.value)
        if (requestId === chartRequestId) await loadChartRows(id, requestId)
        return
      }

      if (isHistoricalVolatilityDetail.value) {
        await store.ensureList(historicalDetailSource.value)
        if (requestId === chartRequestId) await loadChartRows(id, requestId)
        return
      }

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

      <nav
        v-if="detailMessage"
        class="mb-3 flex min-h-14 flex-wrap items-center gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 text-sm font-semibold"
      >
        <RouterLink class="inline-flex items-center gap-2 text-[var(--app-primary)] hover:underline" :to="backToList">
          <ChevronLeft :size="18" />
          {{ backText }}
        </RouterLink>
        <span class="h-6 w-px bg-[var(--app-border)]" />
        <!-- Standalone lists have no group, so only the list name is shown. -->
        <template v-if="showGroupBreadcrumb">
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

      <section v-else-if="detail" class="grid items-start gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
        <!-- Desktop sidebar (xl+) -->
        <DetailSearchSidebar
          v-if="!isMobile"
          v-model="listSearchQuery"
          :title="listLabel"
          :placeholder="sidebarSearchPlaceholder"
          :empty-message="emptySidebarMessage"
          :items="sidebarNavItems"
          :height="sidebarHeight"
          @item-click="(item) => store.rememberIndicatorSource(item.id, String(item.sourceList ?? ''))"
        >
          <template #action="{ item }">
            <span v-if="item.favoriteLocked" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <button
              v-else
              class="mt-0.5 shrink-0 transition"
              :class="item.favorite ? 'text-[var(--app-favorite)]' : 'text-[var(--app-text-faint)] hover:text-[var(--app-favorite)]'"
              type="button"
              :title="favoriteActionLabel(Boolean(item.favorite))"
              :aria-label="favoriteActionLabel(Boolean(item.favorite))"
              @click="toggleSidebarFavorite(item.id)"
            >
              <Star :size="16" :fill="item.favorite ? 'var(--app-favorite)' : 'transparent'" />
            </button>
          </template>
        </DetailSearchSidebar>

        <!-- Mobile: Select Indicator button (replaces sidebar) -->
        <button
          v-if="isMobile"
          class="mb-3 flex w-full items-center gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-left transition hover:border-[var(--app-primary)]"
          type="button"
          @click="isSidebarSheetOpen = true"
        >
          <Menu :size="20" class="text-[var(--app-text-secondary)]" />
          <span class="flex-1 text-sm font-medium text-[var(--app-text)] truncate">{{ currentIndicatorLabel || 'Select Indicator' }}</span>
        </button>

        <section ref="detailContentElement" class="min-w-0 space-y-3">
          <section class="indicator-summary">
            <nav class="indicator-detail-breadcrumb" aria-label="Indicator breadcrumb">
              <RouterLink class="indicator-detail-breadcrumb__back" :to="backToList">
                <ChevronLeft :size="16" />
                {{ backText }}
              </RouterLink>
              <span class="indicator-detail-breadcrumb__divider" />
              <!-- Standalone lists have no group, so only the list name is shown. -->
              <template v-if="showGroupBreadcrumb">
                <span class="indicator-detail-breadcrumb__item">{{ breadcrumbGroupLabel }}</span>
                <span class="indicator-detail-breadcrumb__separator">/</span>
              </template>
              <RouterLink class="indicator-detail-breadcrumb__link" :to="backToList">
                {{ listLabel }}
              </RouterLink>
            </nav>

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
                <Star :size="24" :fill="isFavorite ? 'var(--app-favorite)' : 'transparent'" />
              </button>
            </div>

            <div class="indicator-summary__meta-row">
              <!-- Same pill as the Indicators list header, so the two read as one system. -->
              <span v-for="meta in detailMeta" :key="meta.label" class="indicator-summary-pill">
                <span class="indicator-summary-pill__label">{{ meta.label }}:</span>
                <span class="indicator-summary-pill__value">{{ meta.value }}</span>
              </span>
              <span class="indicator-summary-pill">
                <IndicatorSentimentMeter :score="detail.sentimentScore" />
                <span class="indicator-summary-pill__text" :class="sentimentTextClass(detail.sentimentScore)">
                  {{ sentimentLabelFromScore(detail.sentimentScore) }}
                </span>
              </span>
            </div>

            <div class="indicator-summary__stats">
              <div v-for="stat in primarySummaryStats" :key="stat.label" class="indicator-stat-card">
                <p class="indicator-stat-card__label">{{ stat.label }}</p>
                <p class="indicator-stat-card__value" :class="stat.valueClass">
                  {{ stat.value }}
                  <span
                    v-if="stat.direction"
                    class="indicator-stat-card__direction"
                    :class="`indicator-stat-card__direction--${stat.direction}`"
                  >
                    <component :is="statDirectionIcon(stat.direction)" :size="12" aria-hidden="true" />
                    {{ stat.directionValue }}
                  </span>
                </p>
              </div>
              <div class="indicator-stat-card">
                <p class="indicator-stat-card__label">LAST CLOSE</p>
                <p class="indicator-stat-card__value">{{ formatIndicatorNumber(lastCloseValue) }}</p>
              </div>
              <div class="indicator-stat-card indicator-stat-card--extremes">
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
            :is-mobile="isMobile"
            @download="downloadCsv"
          />
          <p v-if="csvMessage" class="text-right text-sm font-medium text-[var(--app-text-muted)]">{{ csvMessage }}</p>

          <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]">
            <CftcDataNotice v-if="showCftcNotice" />

            <div class="flex min-w-0 overflow-x-auto border-b border-[var(--app-border)] px-4">
              <button
                v-for="tab in detailTabs"
                :key="tab.id"
                class="shrink-0 border-b-2 px-3 font-semibold"
                :class="[
                  isMobile ? 'h-10 text-xs' : 'h-12 text-base',
                  activeTab === tab.id ? 'border-[var(--app-primary)] text-[var(--app-primary)]' : 'border-transparent text-[var(--app-text-secondary)] hover:text-[var(--app-primary)]'
                ]"
                type="button"
                @click="activeTab = tab.id"
              >
                {{ tab.label }}
              </button>
            </div>

            <div v-if="activeTab === 'detail'" class="p-3 md:p-5">
              <section>
                <h3 class="mb-2 text-base font-semibold text-[var(--app-text)]">Construction</h3>
                <div class="indicator-rich-text text-sm leading-6 text-[var(--app-text-secondary)]" v-html="detail.constructionHtml || detail.construction" />
              </section>

              <section v-if="detail.showReturns && detail.thresholdRows.length" class="mt-6 border-t border-[var(--app-border)] pt-5">
                <h3 class="mb-3 text-base font-semibold text-[var(--app-text)]">Threshold Return Analysis</h3>

                <!-- Desktop: table -->
                <div v-if="!isMobile" class="overflow-hidden rounded-md border border-[var(--app-border)]">
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

                <!-- Mobile: cards -->
                <div v-else class="space-y-2">
                  <article
                    v-for="row in detail.thresholdRows"
                    :key="row.location"
                    class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4"
                  >
                    <div class="flex justify-between text-sm">
                      <span class="font-semibold text-[var(--app-text)]">{{ row.location }}</span>
                    </div>
                    <div class="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span class="text-[var(--app-text-muted)]">Annualized Return</span>
                        <p class="font-semibold text-[var(--app-text)]">{{ row.annualizedReturn }}</p>
                      </div>
                      <div>
                        <span class="text-[var(--app-text-muted)]">Percent Time</span>
                        <p class="font-semibold text-[var(--app-text)]">{{ row.percentTime }}</p>
                      </div>
                    </div>
                  </article>
                </div>

                <button
                  v-if="detail.returnSegments.length"
                  class="mt-3 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm font-semibold text-[var(--app-primary)] hover:bg-[var(--app-primary-soft)]"
                  type="button"
                  @click="showReturnSegments = !showReturnSegments"
                >
                  {{ showReturnSegments ? 'Hide' : 'Show' }} Return Segments
                </button>

                <!-- Return Segments: Desktop table -->
                <div v-if="showReturnSegments && detail.returnSegments.length">
                  <div v-if="!isMobile" class="mt-3 max-h-72 overflow-auto rounded-md border border-[var(--app-border)]">
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

                  <!-- Return Segments: Mobile cards -->
                  <div v-else class="mt-3 space-y-2 max-h-96 overflow-y-auto">
                    <article
                      v-for="(row, rowIndex) in detail.returnSegments"
                      :key="rowIndex"
                      class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4"
                    >
                      <div class="space-y-1.5">
                        <div v-for="column in returnSegmentColumns" :key="column" class="flex justify-between text-xs">
                          <span class="text-[var(--app-text-muted)]">{{ column }}</span>
                          <span class="font-medium text-[var(--app-text)]">{{ segmentValue(row, column) }}</span>
                        </div>
                      </div>
                    </article>
                  </div>
                </div>
              </section>
            </div>

            <div v-else-if="activeTab === 'research'" class="p-3 md:p-5">
              <IndicatorListTable
                :indicators="pagedResearchRows"
                :loading="false"
                :columns="researchPostColumns"
                :show-favorite="false"
                :sort-key="researchSortKey"
                :sort-direction="researchSortDirection"
                @sort="handleResearchSort"
              />

              <IndicatorPagination
                class="mt-4"
                :page="researchPage"
                :page-count="researchPageCount"
                :total="sortedResearchRows.length"
                item-label="posts"
                @change="setResearchPage"
              />
            </div>

            <div v-else-if="activeTab === 'related'" class="p-3 md:p-5">
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

              <IndicatorPagination
                class="mt-4"
                :page="relatedPage"
                :page-count="relatedPageCount"
                :total="sortedRelatedRows.length"
                item-label="related charts"
                @change="setRelatedPage"
              />
            </div>

            <div v-else class="p-3 md:p-5">
              <ConstituentConditionsTable
                :rows="pagedConstituentRows"
                :columns="constituentTableColumns"
                :sort-key="constituentSortKey"
                :sort-direction="constituentSortDirection"
                @sort="handleConstituentSort"
              />

              <IndicatorPagination
                class="mt-4"
                :page="constituentPage"
                :page-count="constituentPageCount"
                :total="sortedConstituentRows.length"
                item-label="constituents"
                @change="setConstituentPage"
              />
            </div>
          </section>
        </section>
      </section>

      <!-- Mobile sidebar drawer (left slide-in, matches ListExplorerPage pattern) -->
      <Teleport to="body">
        <Transition
          enter-active-class="transition duration-300"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition duration-200"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="isMobile && isSidebarSheetOpen"
            class="fixed inset-0 z-50"
          >
            <!-- Backdrop -->
            <div
              class="absolute inset-0 bg-black/50 backdrop-blur-sm"
              @click="isSidebarSheetOpen = false"
            />

            <!-- Drawer content (left slide-in) -->
            <Transition
              enter-active-class="transition duration-300 transform"
              enter-from-class="-translate-x-full"
              enter-to-class="translate-x-0"
              leave-active-class="transition duration-200 transform"
              leave-from-class="translate-x-0"
              leave-to-class="-translate-x-full"
            >
              <div class="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-[var(--app-surface)] shadow-xl overflow-y-auto">
                <!-- Drawer header -->
                <div class="sticky top-0 z-10 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 flex items-center justify-between">
                  <h2 class="text-base font-semibold text-[var(--app-text)]">{{ listLabel }}</h2>
                  <button
                    @click="isSidebarSheetOpen = false"
                    class="p-2 rounded-md text-[var(--app-text)] hover:bg-[var(--app-surface-soft)]"
                    aria-label="Close filters"
                  >
                    <X :size="20" />
                  </button>
                </div>

                <!-- Search + list -->
                <div class="p-2">
                  <!-- Search input -->
                  <label class="mb-4 flex h-10 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-3">
                    <Search :size="18" class="shrink-0 text-[var(--app-text-muted)]" />
                    <input
                      v-model="listSearchQuery"
                      class="ml-2 min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-muted)]"
                      :placeholder="sidebarSearchPlaceholder"
                      autocomplete="off"
                      spellcheck="false"
                    />
                  </label>

                  <!-- Item list -->
                  <div class="space-y-0">
                    <RouterLink
                      v-for="item in sidebarNavItems"
                      :key="item.id"
                      :to="item.to"
                      class="flex items-center gap-2 border-b border-[var(--app-border-muted)] px-3 py-2.5 text-sm leading-5"
                      :class="item.active ? 'border-l-4 border-l-[var(--app-primary)] bg-[var(--app-primary-soft)] pl-2 font-semibold' : 'text-[var(--app-text)] hover:bg-[var(--app-surface-soft)]'"
                      @click="isSidebarSheetOpen = false"
                    >
                      <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
                      <!-- Favorite star -->
                      <span v-if="item.favoriteLocked" class="h-4 w-4 shrink-0" aria-hidden="true" />
                      <button
                        v-else
                        class="shrink-0 transition"
                        :class="item.favorite ? 'text-[var(--app-favorite)]' : 'text-[var(--app-text-faint)] hover:text-[var(--app-favorite)]'"
                        type="button"
                        :title="favoriteActionLabel(Boolean(item.favorite))"
                        @click.prevent="toggleSidebarFavorite(item.id)"
                      >
                        <Star :size="16" :fill="item.favorite ? 'var(--app-favorite)' : 'transparent'" />
                      </button>
                    </RouterLink>
                    <p v-if="!sidebarNavItems.length" class="py-4 text-center text-sm text-[var(--app-text-muted)]">
                      {{ emptySidebarMessage }}
                    </p>
                  </div>
                </div>

                <!-- App Download CTA -->
                <div class="sticky bottom-0 border-t border-[var(--app-border)] bg-[var(--app-surface)] p-4">
                  <div class="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 p-3 text-white">
                    <p class="text-sm font-semibold">Get the full experience in our app</p>
                    <p class="mt-1 text-xs opacity-90">Real-time signals · Strategy management</p>
                    <button class="mt-3 w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-600">
                      Download Now
                    </button>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </Transition>
      </Teleport>
    </main>
  </div>
</template>

<style scoped>
.indicator-summary {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  color: var(--app-text);
  padding: 10px 12px 12px;
}

.indicator-detail-breadcrumb {
  display: flex;
  min-height: 24px;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  color: var(--app-text-secondary);
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.2;
}

.indicator-detail-breadcrumb__back,
.indicator-detail-breadcrumb__link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--app-primary);
}

.indicator-detail-breadcrumb__back:hover,
.indicator-detail-breadcrumb__link:hover {
  text-decoration: underline;
}

.indicator-detail-breadcrumb__divider {
  width: 1px;
  height: 14px;
  background: var(--app-border);
}

.indicator-detail-breadcrumb__separator {
  color: var(--app-text-faint);
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
  font-size: 1.75rem;
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
  width: 34px;
  height: 34px;
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
  gap: 8px;
  margin-top: 14px;
  margin-bottom: 14px;
}

/* The meta and sentiment pills use the shared .indicator-summary-pill from the global
   stylesheet, so they stay identical to the Indicators list header. */

.indicator-summary__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  box-shadow: 0 1px 0 var(--app-border-muted);
}

.indicator-stat-card {
  display: flex;
  min-height: 58px;
  min-width: 0;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  border-left: 1px solid var(--app-border);
  padding: 10px 18px;
  text-align: left;
}

.indicator-stat-card:first-child {
  border-left: 0;
}

.indicator-stat-card__label {
  min-width: 0;
  color: var(--app-text-muted);
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.indicator-stat-card__value {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  color: var(--app-text);
  font-size: 1.0625rem;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.indicator-stat-card__direction {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.6875rem;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}

.indicator-stat-card__direction--up {
  color: var(--app-positive);
}

.indicator-stat-card__direction--down {
  color: var(--app-negative);
}

.indicator-stat-card__value--positive {
  color: var(--app-positive);
}

.indicator-stat-card__value--negative {
  color: var(--app-negative);
}

/*
 * Column direction flips both axes relative to the row-direction cards, so the base
 * card's values cannot be inherited: `justify-content` is the vertical axis here, and
 * the base rule's `flex-start` would pin the rows to the top.
 */
.indicator-stat-card--extremes {
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 6px;
}

.indicator-extreme-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 6px 12px;
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

@media (max-width: 1024px) {
  .indicator-summary__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .indicator-stat-card {
    border-top: 1px solid var(--app-border);
    border-left: 0;
  }

  .indicator-stat-card:nth-child(-n + 2) {
    border-top: 0;
  }

  .indicator-stat-card:nth-child(2n) {
    border-left: 1px solid var(--app-border);
  }
}

@media (max-width: 640px) {
  .indicator-summary__header {
    gap: 12px;
  }

  .indicator-summary__title {
    font-size: 1.375rem;
  }

  .indicator-summary__stats {
    grid-template-columns: minmax(0, 1fr);
  }

  .indicator-stat-card,
  .indicator-stat-card:nth-child(2n) {
    border-left: 0;
  }

  .indicator-stat-card:nth-child(-n + 2) {
    border-top: 1px solid var(--app-border);
  }

  .indicator-stat-card:first-child {
    border-top: 0;
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

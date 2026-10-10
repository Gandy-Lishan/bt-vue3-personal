<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  CalendarDays,
  ChartColumn,
  CircleDollarSign,
  Clock3,
  Info,
  Percent,
  RotateCcw,
  Table2,
  TriangleAlert,
} from '@lucide/vue'
import indexesData from '@/assets/indexes_list.json'
import stocksData from '@/assets/stocks_list.json'
import { extractSeasonalityRows, fetchSeasonalityPayload, seasonalityRecord } from '@/entities/seasonality/api/seasonality.api'
import { buildDayMonthChartPoints } from '@/entities/seasonality/model/day-month'
import ListPageHeader from '@/shared/ui/ListPageHeader.vue'
import ListPagePanel from '@/shared/ui/ListPagePanel.vue'
import SearchSelect from '@/shared/ui/SearchSelect.vue'
import SeasonalityGrowthChart from './ui/SeasonalityGrowthChart.vue'
import SeasonalityReturnChart from './ui/SeasonalityReturnChart.vue'

type SeasonalityView = 'dayOfMonth' | 'specificDays' | 'otherCharts' | 'growthDollar'
type DayCategory = 'calendar_day' | 'trading_day'
type OtherCategory = 'weekday' | 'month' | 'dayOfMonth' | 'dayOfYear'
type TableColumnKey = 'month' | 'day' | 'averageReturn' | 'percentPositive' | 'max' | 'min'
type DayResultColumnKey = 'day' | 'averageReturn' | 'percentPositive'
type SortDirection = 'asc' | 'desc'
type NoticeKind = 'info' | 'error'

interface MarketEntry {
  symbol: string
  name: string
  category: string
}

interface StockEntry {
  stock?: string
  symbol?: string
  name?: string
  category?: string
}

interface IndexEntry {
  symbol?: string
  name?: string
  category?: string
}

interface SidebarItem {
  id: SeasonalityView
  label: string
  title: string
  description: string
  icon: typeof CalendarDays
}

interface HolidayOption {
  label: string
  month?: number
  day?: number
}

interface ReturnPoint {
  label: string | number
  averageReturn: number | null
  percentPositive: number | null
}

/** A point that survived normalisation, so both values are guaranteed present. */
interface ResolvedReturnPoint extends ReturnPoint {
  averageReturn: number
  percentPositive: number
}

interface DayResultRow {
  day: number
  averageReturn: number | null
  percentPositive: number | null
}

interface SeasonalityTableRow {
  month: string | number | null
  day: string | number | null
  averageReturn: number | null
  percentPositive: number | null
  max: number | null
  min: number | null
}

interface GrowthPoint {
  timestamp: number
  value: number
  rawDate: string
}

const defaultSymbol = 'SPX'
const earliestYear = 1928
const currentDate = new Date()
const currentYear = currentDate.getFullYear()
const currentMonth = currentDate.getMonth() + 1
const currentDay = currentDate.getDate()

const monthOptions = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
]

const baseHolidayOptions: HolidayOption[] = [
  { label: "New Year's Day", month: 1, day: 1 },
  { label: 'Independence Day', month: 7, day: 4 },
  { label: 'MLK Jr. Day', month: 1, day: 20 },
  { label: 'Labor Day', month: 9, day: 1 },
  { label: "President's Day", month: 2, day: 17 },
  { label: 'Thanksgiving Day', month: 11, day: 27 },
  { label: 'Good Friday', month: 4, day: 18 },
  { label: 'Christmas Day', month: 12, day: 25 },
  { label: 'Memorial Day', month: 5, day: 26 },
  { label: 'FOMC Decision Day', month: 1, day: 29 },
  { label: 'Monthly Option Expiration', month: 1, day: 17 },
  { label: 'March Quad Option Expiration', month: 3, day: 21 },
  { label: 'June Quad Option Expiration', month: 6, day: 20 },
  { label: 'September Quad Option Expiration', month: 9, day: 19 },
  { label: 'December Quad Option Expiration', month: 12, day: 19 },
  { label: 'Election Day(US)', month: 11, day: 3 },
  { label: 'Custom Date' },
]

const holidayOptions = [...baseHolidayOptions].sort((left, right) => {
  if (!left.month || !left.day) return 1
  if (!right.month || !right.day) return -1
  return left.month === right.month ? left.day - right.day : left.month - right.month
})

const sidebarItems: SidebarItem[] = [
  {
    id: 'dayOfMonth',
    label: 'Day of Month',
    title: 'Performance by Day of Month',
    description: 'Compare average returns and positive-rate by calendar or trading day inside a selected month.',
    icon: CalendarDays,
  },
  {
    id: 'specificDays',
    label: 'Specific Days',
    title: 'Performance Around Specific Days',
    description: 'Measure how a market typically behaves around holidays, option expirations and custom dates.',
    icon: Clock3,
  },
  {
    id: 'otherCharts',
    label: 'Other Charts & Data',
    title: 'Other Charts & Data',
    description: 'Review weekday, monthly, day-of-month and day-of-year seasonal tendencies.',
    icon: ChartColumn,
  },
  {
    id: 'growthDollar',
    label: 'Growth of $1',
    title: 'The growth of one U.S. dollar',
    description: 'Track the equity curve for entering and exiting a recurring seasonal trading-day window.',
    icon: CircleDollarSign,
  },
]

const marketEntries: MarketEntry[] = [
  ...(stocksData as StockEntry[]).map((entry) => ({
    symbol: String(entry.stock ?? entry.symbol ?? '').trim().toUpperCase(),
    name: String(entry.name ?? '').trim(),
    category: String(entry.category ?? 'Stock'),
  })),
  ...(indexesData as IndexEntry[]).map((entry) => ({
    symbol: String(entry.symbol ?? '').trim().toUpperCase(),
    name: String(entry.name ?? '').trim(),
    category: String(entry.category ?? 'Index'),
  })),
].filter((entry) => entry.symbol && entry.name)

const fallbackSymbols: MarketEntry[] = [
  { symbol: 'SPX', name: 'S&P 500', category: 'Index' },
  { symbol: 'NDX', name: 'Nasdaq 100', category: 'Index' },
  { symbol: 'AAPL', name: 'Apple Inc', category: 'Stock' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', category: 'ETF' },
  { symbol: 'MSFT', name: 'Microsoft Corp', category: 'Stock' },
]

const symbolEntries = marketEntries.length ? marketEntries : fallbackSymbols
const tooltipText = {
  symbol: 'Choose a stock/index/ETF as symbol. Default: SPX.',
  dateRange:
    'Select the start and end years for the selected symbol data. For example, 2020 to 2022 covers January 1, 2020 through December 31, 2022.',
  dayCategory:
    'Calendar day refers to a natural date on the calendar. Trading day refers to a day when the stock market is open for regular trading.',
  specificDay:
    'Choose a specific day. Day 0 represents the selected day when it is a trading day. Use Custom Date to define your own date.',
  otherCategory: 'Choose whether to group seasonality by weekday, month, day of month, or day of year.',
  startTdy: 'Select the trading day number to enter the seasonal window.',
  endTdy: 'Select the trading day number to exit the seasonal window.',
}
const activeView = ref<SeasonalityView>('dayOfMonth')
const loading = ref(false)
const message = ref('')
const messageKind = ref<NoticeKind>('info')
const returnPoints = ref<ReturnPoint[]>([])
const dayResultRows = ref<DayResultRow[]>([])
const tableRows = ref<SeasonalityTableRow[]>([])
const growthPoints = ref<GrowthPoint[]>([])
const currentTradingIndex = ref<number | null>(null)
const newestDay = ref<number | null>(null)
const newestMonth = ref<number | null>(null)
const tableSort = reactive<{ key: TableColumnKey; direction: SortDirection }>({
  key: 'day',
  direction: 'asc',
})
const dayResultSort = reactive<{ key: DayResultColumnKey; direction: SortDirection }>({
  key: 'day',
  direction: 'asc',
})

const filters = reactive({
  symbol: defaultSymbol,
  startYear: String(currentYear - 20),
  endYear: String(currentYear),
  dayCategory: 'calendar_day' as DayCategory,
  month: monthOptions[currentMonth - 1]?.label ?? 'January',
  otherCategory: 'weekday' as OtherCategory,
  holiday: holidayOptions[0]?.label ?? "New Year's Day",
  customMonth: currentMonth,
  customDay: currentDay,
  shift: '5',
  entryDay: '10',
  exitDay: '50',
})

const route = useRoute()
const router = useRouter()

let requestId = 0
let activeController: AbortController | null = null
let routeSyncReady = false

const otherCategoryOptions: OtherCategory[] = ['weekday', 'month', 'dayOfMonth', 'dayOfYear']

function queryString(value: unknown) {
  return typeof value === 'string' && value ? value : undefined
}

// Restore state from the URL so the page is shareable and back/forward work.
function hydrateFromQuery() {
  const query = route.query

  const view = queryString(query.view)
  if (view && sidebarItems.some((item) => item.id === view)) activeView.value = view as SeasonalityView

  const symbol = queryString(query.symbol)
  if (symbol) filters.symbol = symbol
  const startYear = queryString(query.start)
  if (startYear) filters.startYear = startYear
  const endYear = queryString(query.end)
  if (endYear) filters.endYear = endYear

  const category = queryString(query.category)
  if (category === 'calendar_day' || category === 'trading_day') filters.dayCategory = category

  const month = queryString(query.month)
  if (month && monthOptions.some((option) => option.label === month)) filters.month = month

  const other = queryString(query.other)
  if (other && otherCategoryOptions.includes(other as OtherCategory)) filters.otherCategory = other as OtherCategory

  const holiday = queryString(query.holiday)
  if (holiday && holidayOptions.some((option) => option.label === holiday)) filters.holiday = holiday

  const customMonth = Number(queryString(query.customMonth))
  if (Number.isInteger(customMonth) && customMonth >= 1 && customMonth <= 12) filters.customMonth = customMonth
  const customDay = Number(queryString(query.customDay))
  if (Number.isInteger(customDay) && customDay >= 1 && customDay <= 31) filters.customDay = customDay

  const shift = queryString(query.shift)
  if (shift) filters.shift = shift
  const entryDay = queryString(query.entryDay)
  if (entryDay) filters.entryDay = entryDay
  const exitDay = queryString(query.exitDay)
  if (exitDay) filters.exitDay = exitDay
}

function syncQuery() {
  if (!routeSyncReady) return

  const next: Record<string, string> = {
    view: activeView.value,
    symbol: normalizedSymbol.value,
    start: filters.startYear,
    end: filters.endYear,
    category: filters.dayCategory,
    month: filters.month,
    other: filters.otherCategory,
    holiday: filters.holiday,
    customMonth: String(filters.customMonth),
    customDay: String(filters.customDay),
    shift: filters.shift,
    entryDay: filters.entryDay,
    exitDay: filters.exitDay,
  }

  const current: Record<string, string> = {}
  for (const [key, value] of Object.entries(route.query)) {
    if (typeof value === 'string') current[key] = value
  }

  const sameShape =
    Object.keys(current).length === Object.keys(next).length &&
    Object.keys(next).every((key) => current[key] === next[key])
  if (sameShape) return

  void router.replace({ query: next })
}

const activeItem = computed(() => sidebarItems.find((item) => item.id === activeView.value) ?? sidebarItems[0])
const normalizedSymbol = computed(() => filters.symbol.trim().toUpperCase() || defaultSymbol)
const yearRangeLabel = computed(() => `${filters.startYear} - ${filters.endYear}`)
const isCurrentYearOnly = computed(() => Number(filters.startYear) === currentYear && Number(filters.endYear) === currentYear)
const activeOtherCategory = computed(() => filters.otherCategory)
const isOtherTable = computed(() => activeView.value === 'otherCharts' && ['dayOfMonth', 'dayOfYear'].includes(activeOtherCategory.value))
const activeReturnTitle = computed(() => {
  if (activeView.value === 'dayOfMonth') return `Seasonality in the ${normalizedSymbol.value}`
  if (activeView.value === 'specificDays') return `Performance Surrounding ${specificDayTitle.value}`
  return `${normalizedSymbol.value} Avg Return By ${otherCategoryAxis.value}`
})
const activeReturnSubtitle = computed(() => {
  if (activeView.value === 'dayOfMonth') return `Month of ${filters.month}`
  if (activeView.value === 'specificDays') return `${normalizedSymbol.value} ${yearRangeLabel.value}`
  return yearRangeLabel.value
})
const dayCategoryPhrase = computed(() => (filters.dayCategory === 'calendar_day' ? 'calendar-day' : 'trading-day'))
const dayOfMonthSampleSize = computed(() => {
  const startYear = Number(filters.startYear)
  const endYear = Number(filters.endYear)
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || endYear < startYear) return 0
  return endYear - startYear + 1
})
const dayChartFallbackDomainSize = computed(() => (filters.dayCategory === 'trading_day' ? 23 : 31))
const dayOfMonthStatusText = computed(
  () => `Showing ${normalizedSymbol.value} ${dayCategoryPhrase.value} seasonality for ${filters.month}, ${filters.startYear}-${filters.endYear}.`,
)
const dayResultsDescription = computed(() => {
  const category = filters.dayCategory === 'calendar_day' ? 'calendar day' : 'trading day'
  return `Average return and percentage of positive days by ${category} for ${filters.month}, ${filters.startYear} - ${filters.endYear}.`
})
const activeXAxisTitle = computed(() => {
  if (activeView.value === 'dayOfMonth') return 'Day of the Month'
  if (activeView.value === 'specificDays') return 'Days Surrounding the Selected Day'
  return otherCategoryAxis.value
})
const activeXPointLabel = computed(() => {
  if (activeView.value === 'dayOfMonth') return 'Day'
  if (activeView.value === 'specificDays') return 'Day'
  return otherCategoryAxis.value
})
const specificDayTitle = computed(() => (filters.holiday === 'Custom Date' ? customDateLabel.value : filters.holiday))
const customDateLabel = computed(() => `${monthOptions[filters.customMonth - 1]?.label ?? 'Month'} ${filters.customDay}`)
const otherCategoryAxis = computed(() => (filters.otherCategory === 'month' ? 'Month' : 'Weekday'))

const symbolSearchOptions = computed(() => {
  const defaults = ['SPX', 'NDX', 'AAPL', 'QQQ', 'MSFT']
  const entries = new Map<string, MarketEntry>()

  for (const symbol of defaults) {
    const entry = symbolEntries.find((item) => item.symbol === symbol) ?? fallbackSymbols.find((item) => item.symbol === symbol)
    if (entry) entries.set(entry.symbol, entry)
  }

  for (const entry of symbolEntries) {
    if (!entries.has(entry.symbol)) entries.set(entry.symbol, entry)
  }

  return [...entries.values()].map((entry) => ({
    value: entry.symbol,
    label: entry.symbol,
    description: entry.name,
    meta: entry.category,
  }))
})

const selectableHolidayOptions = computed(() =>
  holidayOptions.map((holiday) => ({
    ...holiday,
    disabled: isCurrentYearOnly.value && isFutureHoliday(holiday),
  })),
)

const requestKey = computed(() =>
  JSON.stringify({
    activeView: activeView.value,
    symbol: normalizedSymbol.value,
    startYear: filters.startYear,
    endYear: filters.endYear,
    dayCategory: filters.dayCategory,
    month: filters.month,
    otherCategory: filters.otherCategory,
    holiday: filters.holiday,
    customMonth: filters.customMonth,
    customDay: filters.customDay,
    shift: filters.shift,
    entryDay: filters.entryDay,
    exitDay: filters.exitDay,
  }),
)

const tableColumns = computed<Array<{ key: TableColumnKey; label: string }>>(() => {
  const dayColumn = activeOtherCategory.value === 'dayOfYear' ? [{ key: 'day' as const, label: 'Day' }] : [
    { key: 'month' as const, label: 'Month' },
    { key: 'day' as const, label: 'Day' },
  ]

  return [
    ...dayColumn,
    { key: 'averageReturn', label: 'AVG RET' },
    { key: 'percentPositive', label: '% POS' },
    { key: 'max', label: 'MAX' },
    { key: 'min', label: 'MIN' },
  ]
})

const sortedTableRows = computed(() => {
  return [...tableRows.value].sort((left, right) => {
    const result = compareTableValue(tableSortValue(left, tableSort.key), tableSortValue(right, tableSort.key))
    return tableSort.direction === 'asc' ? result : -result
  })
})

const dayChartPoints = computed<ReturnPoint[]>(() => {
  return buildDayMonthChartPoints(dayResultRows.value, dayChartFallbackDomainSize.value)
})

const dayTableColumns = computed<Array<{ key: DayResultColumnKey; label: string }>>(() => {
  return [
    { key: 'day', label: 'Day' },
    { key: 'averageReturn', label: 'Average return (%)' },
    { key: 'percentPositive', label: 'Percent positive (%)' },
  ]
})

const sortedDayResultRows = computed(() =>
  [...dayResultRows.value].sort((left, right) => {
    const result = compareTableValue(dayResultSortValue(left, dayResultSort.key), dayResultSortValue(right, dayResultSort.key))
    return dayResultSort.direction === 'asc' ? result : -result
  }),
)

const dayObservationStats = computed(() => {
  const rows = dayResultRows.value.filter(
    (row): row is DayResultRow & { averageReturn: number; percentPositive: number } =>
      row.averageReturn !== null && row.percentPositive !== null,
  )
  if (!rows.length) return null

  const strongest = maxBy(rows, (row) => row.averageReturn)
  const weakest = minBy(rows, (row) => row.averageReturn)
  const highestPositive = maxBy(rows, (row) => row.percentPositive)
  const lowestPositive = minBy(rows, (row) => row.percentPositive)

  if (!strongest || !weakest || !highestPositive || !lowestPositive) return null

  return {
    strongest,
    weakest,
    highestPositive,
    lowestPositive,
  }
})

const tableDescription = computed(() => {
  if (activeOtherCategory.value === 'dayOfMonth') {
    return {
      title: 'Seasonality by Day of Month',
      text: 'This table outlines the historical performance of each day of the month for the selected symbol and date range.',
      highlight: 'Highlighted rows represent the latest calendar day returned by the seasonality service.',
    }
  }

  return {
    title: 'Seasonality by Day of Year',
    text: 'This table outlines historical performance by trading day of the year for the selected symbol and date range.',
    highlight: 'Highlighted rows represent the latest trading day of the year.',
  }
})

hydrateFromQuery()

watch(
  () => selectableHolidayOptions.value.map((holiday) => `${holiday.label}:${holiday.disabled}`).join('|'),
  () => {
    const selected = selectableHolidayOptions.value.find((holiday) => holiday.label === filters.holiday)
    if (selected?.disabled) {
      const firstAllowed = selectableHolidayOptions.value.find((holiday) => !holiday.disabled)
      if (firstAllowed) filters.holiday = firstAllowed.label
    }
  },
  { immediate: true },
)

watch(
  requestKey,
  () => {
    void loadSeasonality()
  },
  { immediate: true },
)

watch(requestKey, syncQuery, { immediate: true })

onMounted(() => {
  routeSyncReady = true
  syncQuery()
})

function selectView(view: SeasonalityView) {
  activeView.value = view
}

function resetFilters() {
  Object.assign(filters, {
    symbol: defaultSymbol,
    startYear: String(currentYear - 20),
    endYear: String(currentYear - 1),
    dayCategory: 'calendar_day',
    month: monthOptions[currentMonth - 1]?.label ?? 'January',
    otherCategory: 'weekday',
    holiday: holidayOptions[0]?.label ?? "New Year's Day",
    customMonth: currentMonth,
    customDay: currentDay,
    shift: '5',
    entryDay: '10',
    exitDay: '50',
  })
  dayResultSort.key = 'day'
  dayResultSort.direction = 'asc'
}

async function loadSeasonality() {
  const validationMessage = validateFilters()
  if (validationMessage) {
    clearData()
    messageKind.value = 'error'
    message.value = validationMessage
    return
  }

  const nextRequestId = requestId + 1
  requestId = nextRequestId
  activeController?.abort()
  const controller = new AbortController()
  activeController = controller
  loading.value = true
  messageKind.value = 'info'
  message.value = ''

  try {
    if (activeView.value === 'dayOfMonth') await loadDayOfMonth(controller.signal)
    if (activeView.value === 'specificDays') await loadSpecificDays(controller.signal)
    if (activeView.value === 'otherCharts') await loadOtherCharts(controller.signal)
    if (activeView.value === 'growthDollar') await loadGrowthDollar(controller.signal)

    if (nextRequestId !== requestId) return
    if (!returnPoints.value.length && !tableRows.value.length && !growthPoints.value.length) {
      message.value = 'No data found. Adjust the symbol or date range and try again.'
    }
  } catch (error) {
    if (isAbortError(error) || nextRequestId !== requestId) return
    clearData()
    messageKind.value = 'error'
    message.value = 'Seasonality data is temporarily unavailable.'
  } finally {
    if (nextRequestId === requestId) loading.value = false
  }
}

async function loadDayOfMonth(signal: AbortSignal) {
  const payload = await fetchSeasonalityPayload(
    seasonalityPath('get_month_data', {
      name: normalizedSymbol.value,
      start: filters.startYear,
      end: filters.endYear,
      category: filters.dayCategory,
      month: filters.month,
    }),
    signal,
  )
  const rows = normalizeReturnRows(extractSeasonalityRows(payload), ['Day']).map((point) => ({
    day: Number(point.label),
    averageReturn: point.averageReturn,
    percentPositive: point.percentPositive,
  }))

  dayResultRows.value = rows.filter((row) => Number.isInteger(row.day) && row.day > 0)
  returnPoints.value = dayResultRows.value.map((row) => ({
    label: String(row.day).padStart(2, '0'),
    averageReturn: row.averageReturn,
    percentPositive: row.percentPositive,
  }))
  tableRows.value = []
  growthPoints.value = []
  dayResultSort.key = 'day'
  dayResultSort.direction = 'asc'
}

async function loadSpecificDays(signal: AbortSignal) {
  const shift = String(Number(filters.shift))
  const path =
    filters.holiday === 'Custom Date'
      ? seasonalityPath('get_custom_day_data', {
          name: normalizedSymbol.value,
          start: filters.startYear,
          end: filters.endYear,
          month: String(filters.customMonth),
          day: String(filters.customDay),
          shift,
        })
      : seasonalityPath('get_holiday_data', {
          name: normalizedSymbol.value,
          start: filters.startYear,
          end: filters.endYear,
          holiday: filters.holiday,
          shift,
        })

  const payload = await fetchSeasonalityPayload(path, signal)
  returnPoints.value = normalizeReturnRows(extractSeasonalityRows(payload), ['period'])
  tableRows.value = []
  growthPoints.value = []
}

async function loadOtherCharts(signal: AbortSignal) {
  const category = filters.otherCategory
  const path =
    category === 'weekday' || category === 'month'
      ? seasonalityPath('get_weekday_or_month_data', {
          name: normalizedSymbol.value,
          start: filters.startYear,
          end: filters.endYear,
          option: category === 'month' ? 'Month' : 'Weekday',
        })
      : seasonalityPath(category === 'dayOfMonth' ? 'get_day_of_month_data' : 'get_day_of_year_data', {
          name: normalizedSymbol.value,
          start: filters.startYear,
          end: filters.endYear,
        })

  const payload = await fetchSeasonalityPayload(path, signal)
  const rows = extractSeasonalityRows(payload)
  const record = seasonalityRecord(payload)

  if (category === 'weekday' || category === 'month') {
    returnPoints.value = normalizeReturnRows(rows, category === 'month' ? ['Month', 'Date'] : ['Date', 'Weekday'])
    tableRows.value = []
  } else {
    returnPoints.value = []
    tableRows.value = normalizeTableRows(rows)
    currentTradingIndex.value = numberValue(record.current_trading_index)
    newestDay.value = numberValue(record.newest_day)
    newestMonth.value = numberValue(record.newest_month)
    tableSort.key = category === 'dayOfMonth' ? 'month' : 'day'
    tableSort.direction = 'asc'
  }

  growthPoints.value = []
}

async function loadGrowthDollar(signal: AbortSignal) {
  const payload = await fetchSeasonalityPayload(
    seasonalityPath('one_dollar_curve', {
      start_date: `${filters.startYear}-01-01`,
      end_date: `${filters.endYear}-12-31`,
      ticker: normalizedSymbol.value,
      entry_day: filters.entryDay,
      exit_day: filters.exitDay,
    }),
    signal,
  )
  growthPoints.value = normalizeGrowthPoints(payload)
  returnPoints.value = []
  tableRows.value = []
}

function clearData() {
  returnPoints.value = []
  dayResultRows.value = []
  tableRows.value = []
  growthPoints.value = []
}

function validateFilters() {
  const startYear = Number(filters.startYear)
  const endYear = Number(filters.endYear)
  if (!normalizedSymbol.value) return 'Please enter a symbol.'
  if (!Number.isInteger(startYear) || !Number.isInteger(endYear)) return 'Start year and end year must be valid years.'
  if (startYear < earliestYear || endYear < earliestYear || endYear > currentYear) {
    return `Years must be between ${earliestYear} and ${currentYear}.`
  }
  if (startYear > endYear) return 'Start year must be less than or equal to end year.'

  if (activeView.value === 'specificDays') {
    if (!isPositiveInteger(filters.shift)) return 'Days surrounding the selected day must be a positive integer.'
    if (filters.holiday === 'Custom Date' && isCurrentYearOnly.value && isFutureDate(filters.customMonth, filters.customDay)) {
      return `This year's selected custom date has not occurred yet. Choose a date on or before today.`
    }
  }

  if (activeView.value === 'growthDollar') {
    if (!isPositiveInteger(filters.entryDay) || !isPositiveInteger(filters.exitDay)) {
      return 'Start TDY and End TDY must be positive integers.'
    }
    if (Number(filters.exitDay) < Number(filters.entryDay)) return 'End TDY must be after Start TDY.'
  }

  return ''
}

function seasonalityPath(endpoint: string, params: Record<string, string>) {
  return `/dev/seasonality/${endpoint}?${new URLSearchParams(params).toString()}`
}

function normalizeReturnRows(rows: unknown[], labelKeys: string[]): ResolvedReturnPoint[] {
  return rows
    .map((row) => {
      const record = asRecord(row)
      if (!record) return null

      const label = firstPresentValue(record, labelKeys)
      const averageReturn = firstNumberValue(record, ['Return', 'AvgReturn', 'avg_return', 'AVG RET', 'Avg Ret'])
      const percentPositive = firstNumberValue(record, ['Positive', '% POS', 'percent_positive', 'Percent Positive'])
      if (label === null || averageReturn === null || percentPositive === null) return null

      return {
        label: typeof label === 'number' ? label : String(label),
        averageReturn: roundNumber(averageReturn),
        percentPositive: roundNumber(percentPositive),
      }
    })
    .filter((point): point is ResolvedReturnPoint => point !== null)
}

function normalizeTableRows(rows: unknown[]): SeasonalityTableRow[] {
  return rows
    .map((row) => {
      const record = asRecord(row)
      if (!record) return null

      return {
        month: firstPresentValue(record, ['Month', 'month']),
        day: firstPresentValue(record, ['Day', 'day']),
        averageReturn: nullableRounded(firstNumberValue(record, ['AVG RET', 'Avg Ret', 'avg_ret', 'avg_return', 'Return'])),
        percentPositive: nullableRounded(firstNumberValue(record, ['% POS', 'Positive', 'percent_positive'])),
        max: nullableRounded(firstNumberValue(record, ['MAX', 'Max', 'max'])),
        min: nullableRounded(firstNumberValue(record, ['MIN', 'Min', 'min'])),
      }
    })
    .filter((row): row is SeasonalityTableRow => row !== null && (row.day !== null || row.month !== null))
}

function normalizeGrowthPoints(payload: unknown): GrowthPoint[] {
  return extractGrowthRows(extractGrowthPayload(payload))
    .map((row) => normalizeGrowthRow(row))
    .filter((point): point is GrowthPoint => point !== null)
    .sort((left, right) => left.timestamp - right.timestamp)
}

function extractGrowthPayload(payload: unknown): unknown {
  const parsed = parseMaybeJson(payload)
  if (Array.isArray(parsed)) return parsed
  const record = asRecord(parsed)
  if (!record) return []

  if (record.data !== undefined) {
    const data = parseMaybeJson(record.data)
    const dataRecord = asRecord(data)
    if (dataRecord?.data !== undefined) return parseMaybeJson(dataRecord.data)
    if (dataRecord?.Data !== undefined) return parseMaybeJson(dataRecord.Data)
    return data
  }

  if (record.Data !== undefined) return parseMaybeJson(record.Data)
  return parsed
}

function extractGrowthRows(payload: unknown): unknown[] {
  const parsed = parseMaybeJson(payload)
  if (Array.isArray(parsed)) return parsed
  const record = asRecord(parsed)
  if (!record) return []
  if (isGrowthDataRow(record)) return [record]

  const columnRows = extractColumnRows(record)
  if (columnRows.length) return columnRows

  const preferredKeys = ['data', 'Data', 'curve', 'series', 'result', 'results', 'one_dollar_curve', 'oneDollarCurve']
  for (const key of preferredKeys) {
    if (record[key] !== undefined) {
      const rows = extractGrowthRows(record[key])
      if (rows.length) return rows
    }
  }

  const keyedRows = Object.keys(record)
    .map((key) => [key, record[key]])
    .filter(([date, value]) => toTimestamp(date) !== null && isNumericValue(value))
  if (keyedRows.length) return keyedRows

  return Object.values(record).find((value): value is unknown[] => Array.isArray(value)) ?? []
}

function extractColumnRows(record: Record<string, unknown>) {
  const dateColumn = getObjectValue(record, growthDateKeys())
  const valueColumn = getObjectValue(record, growthValueKeys())
  if (!Array.isArray(dateColumn) || !Array.isArray(valueColumn)) {
    return dateColumn !== undefined && valueColumn !== undefined ? [[dateColumn, valueColumn]] : []
  }

  return dateColumn.map((date, index) => [date, valueColumn[index]])
}

function normalizeGrowthRow(row: unknown): GrowthPoint | null {
  let dateValue: unknown
  let pointValue: unknown

  if (Array.isArray(row)) {
    dateValue = row[0]
    pointValue = row[1]
  } else {
    const record = asRecord(row)
    if (!record) return null
    dateValue = getObjectValue(record, growthDateKeys())
    pointValue = getObjectValue(record, growthValueKeys())

    if (!isNumericValue(pointValue)) {
      const dateKeys = growthDateKeys().map((key) => key.toLowerCase())
      const numericKey = Object.keys(record).find((key) => !dateKeys.includes(key.toLowerCase()) && isNumericValue(record[key]))
      pointValue = numericKey ? record[numericKey] : pointValue
    }
  }

  const timestamp = toTimestamp(dateValue)
  const value = numberValue(pointValue)
  if (timestamp === null || value === null) return null

  return {
    timestamp,
    value: roundNumber(value),
    rawDate: typeof dateValue === 'string' ? dateValue.trim() : new Date(timestamp).toISOString().slice(0, 10),
  }
}

function isGrowthDataRow(row: Record<string, unknown>) {
  return toTimestamp(getObjectValue(row, growthDateKeys())) !== null && isNumericValue(getObjectValue(row, growthValueKeys()))
}

function growthDateKeys() {
  return ['date', 'Date', 'dates', 'Dates', 'DT', 'dt', 'time', 'timestamp', 'trading_date', 'tradingDate', 'x']
}

function growthValueKeys() {
  return [
    'value',
    'Value',
    'values',
    'Values',
    'growth',
    'Growth',
    'The growth of one U.S. dollar',
    'growth_of_one_dollar',
    'growth_of_1_dollar',
    'one_dollar',
    'oneDollar',
    'oneDollarValue',
    'one_dollar_value',
    'dollar',
    'dollar_value',
    'equity',
    'Equity',
    'equity_curve',
    'balance',
    'amount',
    'cumulative',
    'cumulative_return',
    'Cumulative Return',
    'curve',
    'y',
  ]
}

function asRecord(value: unknown): Record<string, unknown> | null {
  const parsed = parseMaybeJson(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value.replace(/\bNaN\b/g, 'null'))
  } catch {
    return value
  }
}

function getObjectValue(record: Record<string, unknown>, keys: string[]) {
  const exactKey = keys.find((key) => Object.prototype.hasOwnProperty.call(record, key))
  if (exactKey) return record[exactKey]

  const lowerKey = Object.keys(record).find((recordKey) => keys.some((key) => recordKey.toLowerCase() === key.toLowerCase()))
  return lowerKey ? record[lowerKey] : undefined
}

function firstPresentValue(record: Record<string, unknown>, keys: string[]) {
  const value = getObjectValue(record, keys)
  return value === undefined || value === null || value === '' ? null : value
}

function firstNumberValue(record: Record<string, unknown>, keys: string[]) {
  return numberValue(getObjectValue(record, keys))
}

function numberValue(value: unknown) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null
  const numeric = Number(String(value).replace('%', ''))
  return Number.isFinite(numeric) ? numeric : null
}

function nullableRounded(value: number | null) {
  return value === null ? null : roundNumber(value)
}

function roundNumber(value: number) {
  return Number(value.toFixed(2))
}

function isNumericValue(value: unknown) {
  return numberValue(value) !== null
}

function toTimestamp(value: unknown): number | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
  }

  if (typeof value === 'number') return numberToTimestamp(value)

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d{4}$/.test(trimmed)) return Date.UTC(Number(trimmed), 0, 1)
    if (/^\d+(\.\d+)?$/.test(trimmed)) return numberToTimestamp(Number(trimmed))
    const parsed = Date.parse(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function numberToTimestamp(value: number) {
  if (!Number.isFinite(value)) return null
  if (value >= 1900 && value <= 3000) return Date.UTC(value, 0, 1)
  if (value > 100000000000) return value
  if (value > 1000000000) return value * 1000
  return null
}

function isPositiveInteger(value: string) {
  return /^[1-9]\d*$/.test(String(value))
}

function isFutureHoliday(holiday: HolidayOption) {
  if (!holiday.month || !holiday.day) return false
  return isFutureDate(holiday.month, holiday.day)
}

function isFutureDate(month: number, day: number) {
  const selected = new Date(currentYear, month - 1, day).getTime()
  const today = new Date(currentYear, currentMonth - 1, currentDay).getTime()
  return selected > today
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function setTableSort(key: TableColumnKey) {
  if (tableSort.key === key) {
    tableSort.direction = tableSort.direction === 'asc' ? 'desc' : 'asc'
    return
  }

  tableSort.key = key
  tableSort.direction = key === 'averageReturn' || key === 'percentPositive' ? 'desc' : 'asc'
}

function setDayResultSort(key: DayResultColumnKey) {
  if (dayResultSort.key === key) {
    dayResultSort.direction = dayResultSort.direction === 'asc' ? 'desc' : 'asc'
    return
  }

  dayResultSort.key = key
  dayResultSort.direction = key === 'day' ? 'asc' : 'desc'
}

function dayCellText(row: DayResultRow, key: DayResultColumnKey) {
  if (key === 'day') return String(row.day)
  const value = row[key]
  return value === null ? '—' : trimTrailingZeros(formatNumber(value))
}

function dayCellClass(row: DayResultRow, key: DayResultColumnKey) {
  if (key !== 'averageReturn') return ''
  if (row.averageReturn === null) return 'day-month-results-table__missing'
  return row.averageReturn < 0 ? 'day-month-results-table__negative' : 'day-month-results-table__positive'
}

function ariaSortFor(key: DayResultColumnKey) {
  if (dayResultSort.key !== key) return 'none'
  return dayResultSort.direction === 'asc' ? 'ascending' : 'descending'
}

function tableSortValue(row: SeasonalityTableRow, key: TableColumnKey) {
  return row[key]
}

function dayResultSortValue(row: DayResultRow, key: DayResultColumnKey) {
  return row[key]
}

function compareTableValue(left: string | number | null, right: string | number | null) {
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1

  const leftNumber = Number(left)
  const rightNumber = Number(right)
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber
  return String(left).localeCompare(String(right))
}

function cellText(row: SeasonalityTableRow, key: TableColumnKey) {
  const value = row[key]
  if (value === null || value === undefined) return ''
  if (key === 'month' || key === 'day') return String(value)
  return `${formatNumber(value)}%`
}

function formatNumber(value: string | number) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  // Fixed decimals: trailing-zero stripping made decimal points drift out of
  // alignment inside numeric columns.
  return numeric.toFixed(2)
}

// Readouts such as "60.00%" or "1.20" carry no extra information, so drop the
// trailing zeros and the orphaned decimal point.
function trimTrailingZeros(text: string) {
  if (!text.includes('.')) return text
  return text.replace(/0+$/, '').replace(/\.$/, '')
}

function isNegativeCell(row: SeasonalityTableRow, key: TableColumnKey) {
  if (key === 'month' || key === 'day') return false
  const value = row[key]
  return typeof value === 'number' && value < 0
}

function isHighlightedRow(row: SeasonalityTableRow) {
  if (activeOtherCategory.value === 'dayOfYear') return currentTradingIndex.value !== null && Number(row.day) === currentTradingIndex.value
  return newestDay.value !== null && newestMonth.value !== null && Number(row.day) === newestDay.value && Number(row.month) === newestMonth.value
}

function maxBy<T>(rows: T[], getter: (row: T) => number) {
  return rows.reduce<T | null>((best, row) => (best === null || getter(row) > getter(best) ? row : best), null)
}

function minBy<T>(rows: T[], getter: (row: T) => number) {
  return rows.reduce<T | null>((best, row) => (best === null || getter(row) < getter(best) ? row : best), null)
}

function signedPercent(value: number) {
  const formatted = `${trimTrailingZeros(Math.abs(value).toFixed(2))}%`
  if (value > 0) return `+${formatted}`
  if (value < 0) return `-${formatted}`
  return formatted
}

function fixedPercent(value: number) {
  return `${trimTrailingZeros(value.toFixed(2))}%`
}

// Colour by the sign of the value, not by the role it plays in the panel: the
// "strongest" day of a month can still be negative.
function signedValueClass(value: number | null) {
  if (value === null || value === 0) return ''
  return value > 0 ? 'day-month-value--positive' : 'day-month-value--negative'
}
</script>

<template>
  <div class="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
    <main class="px-[var(--page-gutter)] pb-8 pt-8">
      <ListPageHeader
        title="Seasonality"
        description="Explore recurring market tendencies by month, weekday, holiday, trading day and seasonal holding window."
        :show-view-mode-toggle="false"
      />

      <div class="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
        <aside class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
          <button
            v-for="item in sidebarItems"
            :key="item.id"
            class="mb-1 flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition"
            :class="activeView === item.id ? 'bg-[var(--app-primary-soft)] text-[var(--app-text)]' : 'text-[var(--app-text)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-primary)]'"
            type="button"
            @click="selectView(item.id)"
          >
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
              :class="activeView === item.id ? 'text-[var(--app-primary)]' : 'text-[var(--app-text-secondary)]'"
            >
              <component :is="item.icon" :size="21" />
            </span>
            <span class="min-w-0">
              <span class="block text-sm font-semibold leading-5">{{ item.label }}</span>
              <span class="mt-0.5 block text-xs leading-4 text-[var(--app-text-muted)]">{{ item.description }}</span>
            </span>
          </button>
        </aside>

        <ListPagePanel :title="activeItem.title" :description="activeItem.description">
          <template #summary>
            <span class="indicator-summary-pill">
              <span class="indicator-summary-pill__text">
                <span class="indicator-summary-pill__value">{{ normalizedSymbol }}</span>
                <span class="indicator-summary-pill__label"> symbol</span>
              </span>
            </span>
            <span class="indicator-summary-pill">
              <span class="indicator-summary-pill__text">
                <span class="indicator-summary-pill__value">{{ yearRangeLabel }}</span>
                <span class="indicator-summary-pill__label"> years</span>
              </span>
            </span>
          </template>

          <template #filters>
            <template v-if="activeView === 'dayOfMonth'">
              <div class="day-month-filter-card">
                <div class="day-month-control day-month-control--symbol">
                  <span class="day-month-label">
                    Symbol
                    <span class="seasonality-tooltip" :data-tooltip="tooltipText.symbol" tabindex="0" :aria-label="tooltipText.symbol">
                      <Info :size="13" />
                    </span>
                  </span>
                  <SearchSelect
                    v-model="filters.symbol"
                    :options="symbolSearchOptions"
                    placeholder="Search symbol"
                    aria-label="Search seasonality symbol"
                  />
                </div>

                <label class="day-month-control day-month-control--range">
                  <span class="day-month-label">
                    Date Range
                    <span class="seasonality-tooltip" :data-tooltip="tooltipText.dateRange" tabindex="0" :aria-label="tooltipText.dateRange">
                      <Info :size="13" />
                    </span>
                  </span>
                  <span class="day-month-range">
                    <span class="day-month-field">
                      <Calendar :size="16" class="shrink-0 text-[var(--app-primary)]" />
                      <input v-model="filters.startYear" class="day-month-input day-month-input--bare" type="number" :min="earliestYear" :max="currentYear" />
                    </span>
                    <span class="day-month-range__to">to</span>
                    <span class="day-month-field">
                      <Calendar :size="16" class="shrink-0 text-[var(--app-primary)]" />
                      <input v-model="filters.endYear" class="day-month-input day-month-input--bare" type="number" :min="earliestYear" :max="currentYear" />
                    </span>
                  </span>
                </label>

                <div class="day-month-divider" />

                <label class="day-month-control">
                  <span class="day-month-label">
                    Category
                    <span class="seasonality-tooltip" :data-tooltip="tooltipText.dayCategory" tabindex="0" :aria-label="tooltipText.dayCategory">
                      <Info :size="13" />
                    </span>
                  </span>
                  <select v-model="filters.dayCategory" class="day-month-input">
                    <option value="calendar_day">Calendar Day</option>
                    <option value="trading_day">Trading Day</option>
                  </select>
                </label>

                <label class="day-month-control">
                  <span class="day-month-label">Month</span>
                  <select v-model="filters.month" class="day-month-input">
                    <option v-for="month in monthOptions" :key="month.value" :value="month.label">{{ month.label }}</option>
                  </select>
                </label>
              </div>

              <div class="day-month-status">
                <Info :size="16" />
                <span>{{ dayOfMonthStatusText }}</span>
              </div>
            </template>

            <div v-else class="seasonality-filters">
              <div class="seasonality-control seasonality-control--symbol">
                <span class="seasonality-label">
                  Symbol
                  <span class="seasonality-tooltip" :data-tooltip="tooltipText.symbol" tabindex="0" :aria-label="tooltipText.symbol">
                    <Info :size="13" />
                  </span>
                </span>
                <SearchSelect
                  v-model="filters.symbol"
                  :options="symbolSearchOptions"
                  placeholder="Search symbol"
                  aria-label="Search seasonality symbol"
                />
              </div>

              <label class="seasonality-control">
                <span class="seasonality-label">
                  Start Year
                  <span class="seasonality-tooltip" :data-tooltip="tooltipText.dateRange" tabindex="0" :aria-label="tooltipText.dateRange">
                    <Info :size="13" />
                  </span>
                </span>
                <input v-model="filters.startYear" class="seasonality-input" type="number" :min="earliestYear" :max="currentYear" />
              </label>

              <label class="seasonality-control">
                <span class="seasonality-label">
                  End Year
                  <span class="seasonality-tooltip" :data-tooltip="tooltipText.dateRange" tabindex="0" :aria-label="tooltipText.dateRange">
                    <Info :size="13" />
                  </span>
                </span>
                <input v-model="filters.endYear" class="seasonality-input" type="number" :min="earliestYear" :max="currentYear" />
              </label>

              <template v-if="activeView === 'specificDays'">
                <label class="seasonality-control seasonality-control--wide">
                  <span class="seasonality-label">
                    Specific Day
                    <span class="seasonality-tooltip" :data-tooltip="tooltipText.specificDay" tabindex="0" :aria-label="tooltipText.specificDay">
                      <Info :size="13" />
                    </span>
                  </span>
                  <select v-model="filters.holiday" class="seasonality-input">
                    <option
                      v-for="holiday in selectableHolidayOptions"
                      :key="holiday.label"
                      :value="holiday.label"
                      :disabled="holiday.disabled"
                    >
                      {{ holiday.label }}
                    </option>
                  </select>
                </label>
                <label v-if="filters.holiday === 'Custom Date'" class="seasonality-control">
                  <span class="seasonality-label">Month</span>
                  <select v-model.number="filters.customMonth" class="seasonality-input">
                    <option v-for="month in monthOptions" :key="month.value" :value="month.value">{{ month.label }}</option>
                  </select>
                </label>
                <label v-if="filters.holiday === 'Custom Date'" class="seasonality-control">
                  <span class="seasonality-label">Day</span>
                  <input v-model.number="filters.customDay" class="seasonality-input" type="number" min="1" max="31" />
                </label>
                <label class="seasonality-control">
                  <span class="seasonality-label">Window</span>
                  <input v-model="filters.shift" class="seasonality-input" type="number" min="1" />
                </label>
              </template>

              <template v-else-if="activeView === 'otherCharts'">
                <label class="seasonality-control seasonality-control--wide">
                  <span class="seasonality-label">
                    Category
                    <span class="seasonality-tooltip" :data-tooltip="tooltipText.otherCategory" tabindex="0" :aria-label="tooltipText.otherCategory">
                      <Info :size="13" />
                    </span>
                  </span>
                  <select v-model="filters.otherCategory" class="seasonality-input">
                    <option value="weekday">Return by Day of Week</option>
                    <option value="month">Return by Month</option>
                    <option value="dayOfMonth">Performance by Day of Month</option>
                    <option value="dayOfYear">Performance by Day of Year</option>
                  </select>
                </label>
              </template>

              <template v-else>
                <label class="seasonality-control">
                  <span class="seasonality-label">
                    Start TDY
                    <span class="seasonality-tooltip" :data-tooltip="tooltipText.startTdy" tabindex="0" :aria-label="tooltipText.startTdy">
                      <Info :size="13" />
                    </span>
                  </span>
                  <input v-model="filters.entryDay" class="seasonality-input" type="number" min="1" />
                </label>
                <label class="seasonality-control">
                  <span class="seasonality-label">
                    End TDY
                    <span class="seasonality-tooltip" :data-tooltip="tooltipText.endTdy" tabindex="0" :aria-label="tooltipText.endTdy">
                      <Info :size="13" />
                    </span>
                  </span>
                  <input v-model="filters.exitDay" class="seasonality-input" type="number" min="1" />
                </label>
              </template>

              <button
                class="seasonality-reset"
                type="button"
                title="Reset filters"
                @click="resetFilters"
              >
                <RotateCcw :size="16" />
                Reset
              </button>
            </div>
          </template>

          <template #notice>
            <div
              v-if="message"
              class="seasonality-notice"
              :class="messageKind === 'error' ? 'seasonality-notice--error' : 'seasonality-notice--info'"
              role="status"
            >
              <TriangleAlert v-if="messageKind === 'error'" :size="16" class="mt-1 shrink-0" />
              <Info v-else :size="16" class="mt-1 shrink-0" />
              <span>{{ message }}</span>
            </div>
          </template>

          <div class="seasonality-content">
            <div v-if="activeView === 'dayOfMonth'" class="day-month-workspace">
              <div class="day-month-main-grid">
                <section class="day-month-chart-card">
                  <header class="day-month-card-header">
                    <div>
                      <h3>{{ normalizedSymbol }} Seasonality — {{ filters.month }}</h3>
                      <p>Number of years: {{ dayOfMonthSampleSize }} | {{ filters.startYear }} - {{ filters.endYear }}</p>
                    </div>
                  </header>
                  <SeasonalityReturnChart
                    :title="activeReturnTitle"
                    :subtitle="activeReturnSubtitle"
                    :x-axis-title="activeXAxisTitle"
                    :x-point-label="activeXPointLabel"
                    :points="dayChartPoints"
                    :loading="loading"
                    :height="360"
                    :show-chart-title="false"
                    :show-x-grid-lines="false"
                    show-every-category-label
                    transparent-background
                  />
                </section>

                <section class="day-month-observations">
                  <header class="day-month-observations__header">
                    <ChartColumn :size="20" />
                    <div>
                      <h3>Key observations</h3>
                      <p>{{ filters.month }}</p>
                    </div>
                  </header>

                  <template v-if="dayObservationStats">
                    <div class="day-month-observation-row">
                      <ArrowUp :size="22" class="day-month-observation-icon" :class="signedValueClass(dayObservationStats.strongest.averageReturn)" />
                      <span>Strongest average day</span>
                      <strong>Day {{ dayObservationStats.strongest.day }}</strong>
                      <b class="day-month-value" :class="signedValueClass(dayObservationStats.strongest.averageReturn)">{{ signedPercent(dayObservationStats.strongest.averageReturn) }}</b>
                    </div>
                    <div class="day-month-observation-row">
                      <ArrowDown :size="22" class="day-month-observation-icon" :class="signedValueClass(dayObservationStats.weakest.averageReturn)" />
                      <span>Weakest average day</span>
                      <strong>Day {{ dayObservationStats.weakest.day }}</strong>
                      <b class="day-month-value" :class="signedValueClass(dayObservationStats.weakest.averageReturn)">{{ signedPercent(dayObservationStats.weakest.averageReturn) }}</b>
                    </div>
                    <div class="day-month-observation-row">
                      <Percent :size="22" class="day-month-observation-icon day-month-observation-icon--primary" />
                      <span>Highest positive frequency</span>
                      <strong>Day {{ dayObservationStats.highestPositive.day }}</strong>
                      <b class="day-month-value day-month-value--primary">{{ fixedPercent(dayObservationStats.highestPositive.percentPositive) }}</b>
                    </div>
                    <div class="day-month-observation-row">
                      <CalendarDays :size="22" class="day-month-observation-icon day-month-observation-icon--primary" />
                      <span>Lowest positive frequency</span>
                      <strong>Day {{ dayObservationStats.lowestPositive.day }}</strong>
                      <b class="day-month-value day-month-value--primary">{{ fixedPercent(dayObservationStats.lowestPositive.percentPositive) }}</b>
                    </div>
                  </template>
                  <div v-else class="day-month-observations__empty">
                    {{ loading ? 'Loading observations...' : 'No observations available.' }}
                  </div>

                  <div class="day-month-observation-note">
                    <Info :size="18" class="shrink-0" />
                    <span>These statistics are calculated from {{ filters.startYear }}-{{ filters.endYear }} and are for informational purposes only.</span>
                  </div>
                </section>
              </div>

              <section class="day-month-results">
                <header class="day-month-results__header">
                  <div>
                    <h3>Daily Results — {{ filters.month }} ({{ normalizedSymbol }})</h3>
                    <p>{{ dayResultsDescription }}</p>
                  </div>
                </header>
                <div class="day-month-results__table-wrap">
                  <table class="day-month-results-table">
                    <thead>
                      <tr>
                        <th
                          v-for="column in dayTableColumns"
                          :key="column.key"
                          scope="col"
                          :aria-sort="ariaSortFor(column.key)"
                        >
                          <button type="button" @click="setDayResultSort(column.key)">
                            {{ column.label }}
                            <span v-if="dayResultSort.key === column.key">{{ dayResultSort.direction === 'asc' ? '↑' : '↓' }}</span>
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="loading">
                        <td :colspan="dayTableColumns.length" class="day-month-results__empty">Loading daily results...</td>
                      </tr>
                      <tr v-else-if="!sortedDayResultRows.length">
                        <td :colspan="dayTableColumns.length" class="day-month-results__empty">No daily results</td>
                      </tr>
                      <template v-else>
                        <tr v-for="row in sortedDayResultRows" :key="row.day">
                          <td v-for="column in dayTableColumns" :key="column.key" :class="dayCellClass(row, column.key)">
                            {{ dayCellText(row, column.key) }}
                          </td>
                        </tr>
                      </template>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <div v-else-if="isOtherTable" class="seasonality-table-layout">
              <section class="seasonality-table-note">
                <Table2 :size="19" class="text-[var(--app-primary)]" />
                <div>
                  <h3>{{ tableDescription.title }}</h3>
                  <p>{{ tableDescription.text }}</p>
                  <p>{{ tableDescription.highlight }}</p>
                </div>
              </section>

              <div class="seasonality-table-wrap">
                <table class="seasonality-table">
                  <thead>
                    <tr>
                      <th v-for="column in tableColumns" :key="column.key">
                        <button type="button" @click="setTableSort(column.key)">
                          {{ column.label }}
                          <span v-if="tableSort.key === column.key">{{ tableSort.direction === 'asc' ? '↑' : '↓' }}</span>
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="loading">
                      <td :colspan="tableColumns.length" class="seasonality-empty">Loading table...</td>
                    </tr>
                    <tr v-else-if="!sortedTableRows.length">
                      <td :colspan="tableColumns.length" class="seasonality-empty">No table data</td>
                    </tr>
                    <tr
                      v-for="row in sortedTableRows"
                      v-else
                      :key="`${row.month ?? ''}-${row.day ?? ''}`"
                      :class="{ 'seasonality-table__row--highlighted': isHighlightedRow(row) }"
                    >
                      <td
                        v-for="column in tableColumns"
                        :key="column.key"
                        :class="{ 'seasonality-table__cell--negative': isNegativeCell(row, column.key) }"
                      >
                        {{ cellText(row, column.key) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <SeasonalityGrowthChart
              v-else-if="activeView === 'growthDollar'"
              :points="growthPoints"
              :loading="loading"
            />

            <SeasonalityReturnChart
              v-else
              :title="activeReturnTitle"
              :subtitle="activeReturnSubtitle"
              :x-axis-title="activeXAxisTitle"
              :x-point-label="activeXPointLabel"
              :points="returnPoints"
              :loading="loading"
            />
          </div>
        </ListPagePanel>
      </div>
    </main>
  </div>
</template>

<style scoped>
.day-month-filter-card {
  display: grid;
  grid-template-columns: minmax(170px, 0.95fr) minmax(278px, 1.25fr) 1px minmax(155px, 0.8fr) minmax(155px, 0.8fr);
  gap: 10px;
  align-items: end;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-surface);
  padding: 12px 16px;
}

.day-month-control {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.day-month-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--app-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
}

.day-month-label svg {
  color: var(--app-text-muted);
}

.seasonality-tooltip {
  position: relative;
  display: inline-flex;
  align-items: center;
  color: var(--app-text-muted);
  cursor: help;
  outline: none;
}

.seasonality-tooltip::before,
.seasonality-tooltip::after {
  position: absolute;
  left: 50%;
  z-index: 90;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 4px);
  transition:
    opacity 140ms ease,
    transform 140ms ease;
}

.seasonality-tooltip::before {
  content: '';
  bottom: calc(100% + 4px);
  border: 5px solid transparent;
  border-top-color: #0f172a;
}

.seasonality-tooltip::after {
  content: attr(data-tooltip);
  bottom: calc(100% + 14px);
  width: max-content;
  max-width: 300px;
  border-radius: 6px;
  background: #0f172a;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.26);
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 650;
  line-height: 1.42;
  padding: 8px 10px;
  text-align: left;
  text-transform: none;
  white-space: normal;
}

.seasonality-tooltip:hover::before,
.seasonality-tooltip:hover::after,
.seasonality-tooltip:focus-visible::before,
.seasonality-tooltip:focus-visible::after {
  opacity: 1;
  transform: translate(-50%, 0);
}

.day-month-field,
.day-month-input {
  height: 36px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-surface);
  color: var(--app-text);
  font-size: 0.8125rem;
  font-weight: 700;
  outline: none;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.day-month-field {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
}

.day-month-field:focus-within,
.day-month-input:focus {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px var(--app-primary-shadow);
}

.day-month-input {
  width: 100%;
  padding: 0 10px;
}

.day-month-input--bare {
  height: auto;
  min-width: 0;
  border: 0;
  background: transparent;
  padding: 0;
  box-shadow: none;
}

.day-month-input--bare:focus {
  border: 0;
  box-shadow: none;
}

.day-month-range {
  display: grid;
  grid-template-columns: minmax(104px, 1fr) auto minmax(104px, 1fr);
  gap: 8px;
  align-items: center;
}

.day-month-range__to {
  color: var(--app-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.day-month-divider {
  align-self: stretch;
  background: var(--app-border-muted);
}

.day-month-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0 0;
  border: 1px solid var(--app-border-muted);
  background: var(--app-surface-soft);
  padding: 8px 14px;
  color: var(--app-text-secondary);
  font-size: 0.9rem;
  font-weight: 400;
}

.seasonality-notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0 16px 12px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-surface-soft);
  padding: 8px 12px;
  font-size: 0.875rem;
  font-weight: 650;
  line-height: 1.6;
}

.seasonality-notice--info {
  color: var(--app-text-secondary);
}

.seasonality-notice--info svg {
  color: var(--app-primary);
}

.seasonality-notice--error {
  border-color: var(--app-negative);
  background: var(--app-negative-soft, var(--app-surface-soft));
  color: var(--app-negative);
}

.day-month-workspace {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.day-month-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 0.4fr);
  gap: 16px;
  /* Stretched so both cards share the chart card's height. The slack lands in
     `.day-month-observation-spacer` above the note rather than as dead space
     in the middle of the list. */
  align-items: stretch;
}

.day-month-chart-card,
.day-month-observations,
.day-month-results {
  border: 1px solid var(--app-border-muted);
  border-radius: 8px;
  background: var(--app-surface);
  box-shadow: 0 10px 26px rgba(9, 33, 76, 0.045);
}

.day-month-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 17px 18px 0;
}

.day-month-card-header h3,
.day-month-observations__header h3,
.day-month-results__header h3 {
  margin: 0;
  color: var(--app-text);
  font-size: 1.15rem;
  font-weight: 850;
  line-height: 1.2;
}

.day-month-card-header p {
  margin: 4px 0 0;
  color: var(--app-text-muted);
  font-size: 0.78rem;
  font-weight: 600;
}

.day-month-observations {
  display: flex;
  flex-direction: column;
  padding: 17px 18px 14px;
}

.day-month-observations__header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--app-primary);
  margin-bottom: 14px;
}

.day-month-observations__header h3 {
  font-size: 1.1rem;
  line-height: 1.15;
}

.day-month-observations__header p {
  margin: 3px 0 0;
  color: var(--app-text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
}

.day-month-observation-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto auto;
  gap: 11px;
  align-items: center;
  border-bottom: 1px solid var(--app-border-muted);
  /* Grow to share the slack when the card is stretched to the chart card's
     height, so the four rows fill the column instead of leaving a gap. */
  flex: 1 1 auto;
  padding: 13px 0;
  color: var(--app-text-secondary);
  font-size: 0.8rem;
  font-weight: 400;
}

.day-month-observation-row strong,
.day-month-observation-row b {
  color: var(--app-text);
  font-size: 0.84rem;
  font-weight: 850;
  white-space: nowrap;
}

.day-month-observation-icon {
  justify-self: center;
}

.day-month-observation-icon--positive,
.day-month-value--positive {
  color: #10b981 !important;
}

.day-month-observation-icon--negative,
.day-month-value--negative {
  color: #ef4444 !important;
}

.day-month-observation-icon--primary {
  color: var(--app-primary);
}

.day-month-value--primary {
  color: var(--app-primary) !important;
}

.day-month-observations__empty {
  display: flex;
  /* Takes the space the rows would have filled while data is loading. */
  flex: 1;
  min-height: 180px;
  align-items: center;
  justify-content: center;
  color: var(--app-text-muted);
  font-size: 0.9rem;
}

.day-month-observation-note {
  display: flex;
  gap: 10px;
  margin-top: 13px;
  border-radius: 6px;
  background: var(--app-surface-soft);
  padding: 10px;
  color: var(--app-text-secondary);
  font-size: 0.76rem;
  font-weight: 400;
  line-height: 1.45;
}

.day-month-results {
  overflow: hidden;
}

.day-month-results__header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 16px;
  padding: 17px 18px 12px;
}

.day-month-results__header p {
  margin: 4px 0 0;
  color: var(--app-text-secondary);
  font-size: 0.76rem;
  font-weight: 500;
}

.day-month-results__table-wrap {
  overflow-x: auto;
  padding: 0 18px 14px;
}

.day-month-results-table {
  width: 100%;
  min-width: 620px;
  border-collapse: collapse;
  background: var(--app-surface);
  color: var(--app-text);
  font-size: 0.78rem;
  text-align: left;
}

.day-month-results-table th,
.day-month-results-table td {
  border-bottom: 0;
  padding: 7px 14px;
  text-align: right;
  white-space: nowrap;
}

.day-month-results-table th:first-child,
.day-month-results-table td:first-child {
  width: 86px;
  text-align: left;
  padding-left: 18px;
}

.day-month-results-table th {
  background: var(--app-surface);
  color: var(--app-text-secondary);
  font-size: 0.76rem;
  font-weight: 650;
  text-transform: none;
}

.day-month-results-table th button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: inherit;
  font-weight: 650;
}

.day-month-results-table tbody tr {
  transition: background-color 160ms ease;
}

.day-month-results-table tbody tr:nth-child(odd) {
  background: var(--app-surface);
}

.day-month-results-table tbody tr:nth-child(even) {
  background: var(--app-row-even);
}

.day-month-results-table tbody tr:hover {
  background: var(--app-surface-hover);
}

.day-month-results-table td {
  color: var(--app-text-secondary);
  font-weight: 650;
}

.day-month-results-table__negative {
  color: var(--app-negative) !important;
}

.day-month-results-table__positive {
  color: var(--app-positive) !important;
}

.day-month-results-table__missing {
  color: var(--app-text-muted) !important;
  font-weight: 600;
}

.day-month-results__empty {
  height: 160px;
  color: var(--app-text-muted) !important;
}

.seasonality-filters {
  display: grid;
  grid-template-columns: minmax(220px, 1.5fr) repeat(4, minmax(120px, 1fr)) auto;
  gap: 10px;
  align-items: end;
  border-bottom: 1px solid var(--app-border);
  padding: 12px 16px;
}

.seasonality-control {
  display: grid;
  min-width: 0;
  gap: 6px;
}

.seasonality-control--wide {
  grid-column: span 2;
}

.seasonality-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--app-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
}

.seasonality-input {
  height: 36px;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-surface);
  padding: 0 10px;
  color: var(--app-text);
  font-size: 0.8125rem;
  font-weight: 700;
  outline: none;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.seasonality-input:focus {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px var(--app-primary-shadow);
}

.seasonality-reset {
  display: inline-flex;
  height: 38px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-surface);
  padding: 0 14px;
  color: var(--app-primary);
  font-size: 0.875rem;
  font-weight: 800;
  transition:
    border-color 160ms ease,
    color 160ms ease,
    background-color 160ms ease;
}

.seasonality-reset:hover,
.seasonality-reset:focus-visible {
  border-color: var(--app-primary);
  background: var(--app-primary-soft);
  color: var(--app-primary);
  outline: none;
}

.seasonality-content {
  padding: 16px;
}

.seasonality-table-layout {
  display: grid;
  grid-template-columns: minmax(220px, 0.34fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.seasonality-table-note {
  display: flex;
  gap: 10px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-surface-soft);
  padding: 12px;
  color: var(--app-text-secondary);
}

.seasonality-table-note h3 {
  margin: 0 0 6px;
  color: var(--app-text);
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.2;
}

.seasonality-table-note p {
  margin: 0 0 8px;
  font-size: 0.8125rem;
  line-height: 1.55;
}

.seasonality-table-note p:last-child {
  margin-bottom: 0;
}

.seasonality-table-wrap {
  max-height: 590px;
  min-width: 0;
  overflow: auto;
  border: 1px solid var(--app-border-muted);
  border-radius: 6px;
  background: var(--app-surface);
}

.seasonality-table {
  width: 100%;
  min-width: 620px;
  border-collapse: collapse;
  background: var(--app-surface);
  font-size: 0.8125rem;
  text-align: left;
}

.seasonality-table th,
.seasonality-table td {
  border-bottom: 1px solid var(--app-border-muted);
  padding: 9px 10px;
  text-align: right;
  white-space: nowrap;
}

.seasonality-table th:first-child,
.seasonality-table td:first-child {
  text-align: left;
}

.seasonality-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--app-surface-muted);
  color: var(--app-text-muted);
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
}

.seasonality-table th button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: inherit;
  font-weight: 700;
}

.seasonality-table td {
  color: var(--app-text-secondary);
  font-weight: 650;
}

.seasonality-table tbody tr {
  transition: background-color 160ms ease;
}

.seasonality-table tbody tr:nth-child(odd) {
  background: var(--app-surface);
}

.seasonality-table tbody tr:nth-child(even) {
  background: var(--app-row-even);
}

.seasonality-table tbody tr:hover {
  background: var(--app-surface-hover);
}

.seasonality-table__cell--negative {
  color: var(--app-negative) !important;
}

.seasonality-table__row--highlighted td {
  background: var(--app-primary-soft);
}

.seasonality-empty {
  height: 240px;
  color: var(--app-text-muted) !important;
}

@media (max-width: 1279px) {
  .day-month-filter-card {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .day-month-divider {
    display: none;
  }

  /* Without this the 300px observations column wins and the chart card
     collapses to a sliver (8px wide at a 390px viewport). */
  .day-month-main-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .seasonality-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .seasonality-control--symbol,
  .seasonality-control--wide {
    grid-column: span 2;
  }

  .seasonality-table-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .day-month-filter-card {
    grid-template-columns: minmax(0, 1fr);
  }

  .seasonality-filters {
    grid-template-columns: minmax(0, 1fr);
  }

  .seasonality-control--symbol,
  .seasonality-control--wide {
    grid-column: auto;
  }
}
</style>

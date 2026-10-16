<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowRight,
  BarChart3,
  Camera,
  CircleHelp,
  Copy,
  Download,
  Info,
  Loader2,
  Play,
  Save,
  Search,
  Target,
  ZoomIn,
} from '@lucide/vue'
import {
  fetchCpmPatternBacktestJob,
  fetchCpmPatternMatchPreview,
  fetchCpmPatternPreview,
  fetchCpmResult,
  startCpmPatternBacktest,
  startCpmPatternMatchPreview,
  updateCpmPatternBacktest,
} from '@/entities/cpm/api/cpm.api'
import {
  cpmCsvFilename,
  formatCpmNumber,
  formatCpmPercent,
  normalizeCpmCorrelationResult,
  parseCpmNumber,
} from '@/entities/cpm/model/cpm.adapter'
import type {
  CpmCorrelationPayload,
  CpmCorrelationResult,
  CpmJobResponse,
  CpmPatternPreviewPoint,
  CpmPatternPreviewResult,
} from '@/entities/cpm/model/cpm.types'
import { downloadCsv, toCsv } from '@/shared/utils/csv'
import AppDataTable from '@/shared/ui/AppDataTable.vue'
import type { AppDataTableColumn } from '@/shared/ui/app-data-table.types'
import SearchSelect from '@/shared/ui/SearchSelect.vue'
import indexesData from '@/assets/indexes_list.json'
import stocksData from '@/assets/stocks_list.json'
import CpmPatternPreviewChart from './CpmPatternPreviewChart.vue'

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

type ActiveStep = 1 | 2 | 3
type ResultTab = 'statistics' | 'longTerm' | 'shortTerm' | 'maxGainLoss' | 'correlation'

interface PatternForm {
  name: string
  symbol: string
  condition: string
  period: number
  patternSource: 'Historical Pattern' | 'Common Pattern'
  selectPattern: string
  timeframe: string
  corrPer: number
  direction: string
  tim: number
  lookbackPeriod: string
  lookbackYears: number
  startDate: string
  endDate: string
  barsNum: number
  excludeOverlap: boolean
}

interface MetricCard {
  label: string
  value: string
  detail: string
  tone: 'positive' | 'negative' | 'neutral'
}

const route = useRoute()
const router = useRouter()
const abortController = new AbortController()
const activeStep = ref<ActiveStep>(1)
const activeResultTab = ref<ResultTab>('statistics')
const selectPatternElement = ref<HTMLElement | null>(null)
const settingsElement = ref<HTMLElement | null>(null)
const resultsElement = ref<HTMLElement | null>(null)
const patternPreview = ref<CpmPatternPreviewResult | null>(null)
const patternPreviewLoading = ref(false)
const previewLoading = ref(false)
const backtestLoading = ref(false)
const detailLoading = ref(false)
const formError = ref('')
const actionMessage = ref('')
const previewJob = ref<CpmJobResponse | null>(null)
const previewMatchResult = ref<CpmCorrelationResult | null>(null)
const backtestResult = ref<CpmCorrelationResult | null>(null)
const currentUrl = ref('')
let patternPreviewRequestId = 0

const defaultEndDate = offsetIsoDate(-62)
const defaultStartDate = offsetIsoDate(-153)

const form = reactive<PatternForm>({
  name: `SPX ${defaultEndDate}`,
  symbol: 'SPX',
  condition: '0',
  period: 200,
  patternSource: 'Historical Pattern',
  selectPattern: 'customize_pattern',
  timeframe: 'Daily',
  corrPer: 90,
  direction: 'Long',
  tim: 21,
  lookbackPeriod: '10',
  lookbackYears: 10,
  startDate: defaultStartDate,
  endDate: defaultEndDate,
  barsNum: businessDaysBetween(defaultStartDate, defaultEndDate),
  excludeOverlap: true,
})

const conditionOptions = [
  { value: '0', label: 'None' },
  { value: '1', label: 'Price Above Moving Average' },
  { value: '-1', label: 'Price Below Moving Average' },
]

const patternOptions = [
  { value: 'customize_pattern', label: 'Customize Pattern' },
  { value: 'triple_tap', label: 'Triple Tap' },
  { value: 'rounding_bottom', label: 'Rounding Bottom' },
  { value: 'descending_channel', label: 'Descending Channel' },
  { value: 'ascending_channel', label: 'Ascending Channel' },
  { value: 'head_and_shoulder_bottom', label: 'Head and Shoulders Bottom' },
  { value: 'head_and_shoulder_top', label: 'Head and Shoulders Top' },
  { value: 'double_bottom', label: 'Double Bottom' },
  { value: 'double_top', label: 'Double Top' },
]

const timeframeOptions = ['Daily', 'Weekly', 'Monthly']
const directionOptions = ['Long', 'Short']
const lookbackOptions = [
  { value: '1', label: '1 Year' },
  { value: '3', label: '3 Years' },
  { value: '5', label: '5 Years' },
  { value: '10', label: '10 Years' },
  { value: '15', label: '15 Years' },
  { value: '20', label: '20 Years' },
  { value: 'Years', label: 'Specific Years' },
]

watch(
  () => form.lookbackPeriod,
  (value) => {
    if (value === 'All' || value === 'Years') return
    const years = Number(value)
    if (Number.isFinite(years) && years > 0) form.lookbackYears = years
  },
)

const resultTabs: Array<{ id: ResultTab; label: string }> = [
  { id: 'statistics', label: 'Backtest Statistics' },
  { id: 'longTerm', label: 'Multi-Timeframe Results (Long Term)' },
  { id: 'shortTerm', label: 'Multi-Timeframe Results (Short Term)' },
  { id: 'maxGainLoss', label: 'Max Gain and Loss' },
  { id: 'correlation', label: 'Correlation Info' },
]
const workflowTabs: Array<{ id: ActiveStep; label: string }> = [
  { id: 1, label: 'Select Pattern' },
  { id: 2, label: 'Match Settings' },
  { id: 3, label: 'Backtest Results' },
]

const commonPatternOptions = computed(() => patternOptions.filter((item) => item.value !== 'customize_pattern'))

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

const summaryPatternLabel = computed(() => {
  if (form.patternSource === 'Historical Pattern') return 'Historical Pattern'
  return commonPatternOptions.value.find((item) => item.value === form.selectPattern)?.label ?? 'Common Pattern'
})
const selectionSummaryBars = computed(() => businessDaysBetween(form.startDate, form.endDate) || form.barsNum)

function formatSummaryDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
const selectedPayloadPattern = computed(() => form.patternSource === 'Historical Pattern' ? 'customize_pattern' : form.selectPattern)
const chartPoints = computed(() => patternPreview.value?.points.length ? patternPreview.value.points : fallbackPatternPoints.value)
const normalizedPreviewPoints = computed(() => chartPoints.value.slice(-Math.max(6, Math.min(chartPoints.value.length, form.barsNum || 63))))
const fallbackPatternPoints = computed(() => buildFallbackPatternPoints(form.startDate, form.endDate, form.barsNum || 63))
const resultData = computed(() => backtestResult.value?.data ?? {})
const previewMatchRows = computed(() => {
  const result = previewMatchResult.value
  if (!result) return []
  return result.matrixRows.length ? result.matrixRows : result.seriesRows.slice(0, 50)
})
const previewMatchColumns = computed(() => tableColumns(previewMatchRows.value))
const previewMatchOverlays = computed(() => {
  const rows = previewMatchResult.value?.matrixRows ?? []
  const sorted = [...chartPoints.value].sort((left, right) => left.date.localeCompare(right.date))
  const overlays: Array<{ start: number; end: number; label?: string }> = []
  for (const row of rows) {
    const start = valueFrom(row, ['Start Date', 'start_date', 'startDate', 'Start'])
    const end = valueFrom(row, ['End Date', 'end_date', 'endDate', 'End'])
    if (typeof start !== 'string' || typeof end !== 'string') continue
    const startTs = sorted.find((point) => point.date >= start)?.timestamp
    const endTs = [...sorted].reverse().find((point) => point.date <= end)?.timestamp
    if (startTs === undefined || endTs === undefined || endTs < startTs) continue
    const corrText = String(valueFrom(row, ['Correlation Percentage', 'correlation_percentage', 'Correlation', 'corr']) ?? '').replace('%', '').trim()
    const corrValue = Number(corrText)
    const label = corrText && Number.isFinite(corrValue) ? `${Math.round(corrValue <= 1 ? corrValue * 100 : corrValue)}%` : undefined
    overlays.push({ start: startTs, end: endTs, label })
    if (overlays.length >= 24) break
  }
  return overlays
})
const tradeRows = computed(() => buildTradeRows(resultData.value))
const correlationRows = computed(() => buildCorrelationRows(resultData.value))
const maxGainLossRows = computed(() => [...tradeRows.value].sort((left, right) => (parseCpmNumber(right['Max Gain']) ?? -Infinity) - (parseCpmNumber(left['Max Gain']) ?? -Infinity)))
const longTermRows = computed(() => rowsFromUnknown(firstPresent(resultData.value, ['long_term', 'longTerm', 'multi_timeframe_long', 'long_term_results'])))
const shortTermRows = computed(() => rowsFromUnknown(firstPresent(resultData.value, ['short_term', 'shortTerm', 'multi_timeframe_short', 'short_term_results'])))
const activeResultRows = computed(() => {
  if (activeResultTab.value === 'statistics') return tradeRows.value
  if (activeResultTab.value === 'longTerm') return longTermRows.value
  if (activeResultTab.value === 'shortTerm') return shortTermRows.value
  if (activeResultTab.value === 'maxGainLoss') return maxGainLossRows.value
  return correlationRows.value
})
const activeResultColumns = computed(() => {
  if (activeResultTab.value === 'statistics') return tradeColumns
  if (activeResultTab.value === 'maxGainLoss') return tradeColumns
  return tableColumns(activeResultRows.value)
})

const primaryResultCards = computed(() => [
  {
    label: 'Total Return',
    value: metricValue('total_return', 'totalReturn'),
    icon: BarChart3,
    tone: toneFromValue(valueFrom(resultData.value, ['total_return', 'totalReturn'])),
  },
  {
    label: 'Win Rate',
    value: metricValue('win_rate', 'winRate'),
    icon: Target,
    tone: toneFromValue(valueFrom(resultData.value, ['win_rate', 'winRate'])),
  },
  {
    label: 'Total Trades',
    value: formatCpmNumber(valueFrom(resultData.value, ['total_trades', 'totalTrades']), 0, true),
    icon: BarChart3,
    tone: 'neutral' as const,
  },
])
const secondaryResultStats = computed(() => [
  { label: 'Median Return', value: metricValue('median_return', 'medianReturn'), tone: toneFromValue(valueFrom(resultData.value, ['median_return', 'medianReturn'])) },
  { label: 'Average Return', value: metricValue('avg_return', 'average_return', 'avgReturn'), tone: toneFromValue(valueFrom(resultData.value, ['avg_return', 'average_return', 'avgReturn'])) },
  { label: 'Average Win', value: metricValue('avg_win', 'average_win', 'avgWin'), tone: toneFromValue(valueFrom(resultData.value, ['avg_win', 'average_win', 'avgWin'])) },
  { label: 'Average Loss', value: metricValue('avg_loss', 'average_loss', 'avgLoss'), tone: toneFromValue(valueFrom(resultData.value, ['avg_loss', 'average_loss', 'avgLoss'])) },
  { label: 'Positive Trades', value: formatCpmNumber(valueFrom(resultData.value, ['total_positive', 'totalPositive']), 0, true), tone: 'positive' as const },
  { label: 'Negative Trades', value: formatCpmNumber(valueFrom(resultData.value, ['total_negative', 'totalNegative']), 0, true), tone: 'neutral' as const },
])
const resultSubtitle = computed(() => [
  form.symbol || '-',
  form.timeframe,
  form.direction,
  `${form.barsNum || '-'}-bar pattern`,
  `${form.corrPer || '-'}% minimum correlation`,
  `${form.lookbackYears || '-'}-year lookback`,
  `${form.tim || '-'}-bar holding period`,
].join(' · '))

const tradeColumns: AppDataTableColumn[] = [
  { key: 'Trade Date', label: 'Trade Date', minWidth: 110 },
  { key: 'Entry Price', label: 'Entry Price', minWidth: 110, align: 'right', format: formatTableNumber },
  { key: 'Exit Date', label: 'Exit Date', minWidth: 110 },
  { key: 'Exit Price', label: 'Exit Price', minWidth: 110, align: 'right', format: formatTableNumber },
  { key: 'Max Gain', label: 'Max Gain', minWidth: 100, align: 'right', format: formatTablePercent, cellClass: toneClass },
  { key: 'Max Loss', label: 'Max Loss', minWidth: 100, align: 'right', format: formatTablePercent, cellClass: toneClass },
  { key: 'Return', label: 'Return', minWidth: 100, align: 'right', format: formatTablePercent, cellClass: toneClass },
  { key: 'Market Condition', label: 'Market Condition', minWidth: 150 },
  { key: 'Correlation Percentage', label: 'Correlation Percentage', minWidth: 150, align: 'right', format: formatTablePercent },
]

function offsetIsoDate(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function businessDaysBetween(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00`)
  const end = Date.parse(`${endDate}T00:00:00`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0

  let count = 0
  const cursor = new Date(start)
  while (cursor.getTime() <= end) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

function buildFallbackPatternPoints(startDate: string, endDate: string, bars: number): CpmPatternPreviewPoint[] {
  const count = Math.max(8, Math.min(160, bars || 63))
  const start = Date.parse(`${startDate || defaultStartDate}T00:00:00`)
  const end = Date.parse(`${endDate || defaultEndDate}T00:00:00`)
  const startTs = Number.isFinite(start) ? start : Date.now() - count * 86_400_000
  const endTs = Number.isFinite(end) && end > startTs ? end : startTs + count * 86_400_000
  const step = count > 1 ? (endTs - startTs) / (count - 1) : 86_400_000
  const firstValue = 100

  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin(index / 5) * 2.6 + Math.cos(index / 11) * 3.2 + index * 0.18
    const value = firstValue + wave
    return {
      date: new Date(startTs + step * index).toISOString().slice(0, 10),
      timestamp: startTs + step * index,
      close: Number((value * 72).toFixed(2)),
      normalizedReturn: ((value / firstValue) - 1) * 100,
    }
  })
}

function updateBarsFromDates() {
  const bars = businessDaysBetween(form.startDate, form.endDate)
  form.barsNum = bars || form.barsNum
}

function fitSelection() {
  form.startDate = defaultStartDate
  form.endDate = defaultEndDate
  form.barsNum = businessDaysBetween(defaultStartDate, defaultEndDate)
  activeStep.value = 1
  void refreshPatternPreview()
}

function useThisPattern() {
  activeStep.value = 2
  void nextTick(() => settingsElement.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

function goToStep(step: ActiveStep) {
  activeStep.value = step
  const target = step === 1 ? selectPatternElement.value : step === 2 ? settingsElement.value : resultsElement.value
  void nextTick(() => target?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

function setPatternSource(source: PatternForm['patternSource']) {
  form.patternSource = source
  if (source === 'Historical Pattern') {
    form.selectPattern = 'customize_pattern'
  } else if (form.selectPattern === 'customize_pattern') {
    form.selectPattern = 'head_and_shoulder_top'
  }
}

function duplicateSetup() {
  currentUrl.value = ''
  backtestResult.value = null
  activeStep.value = 1
  form.name = `${form.symbol || 'CPM'} ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`
  actionMessage.value = 'Setup duplicated. Save it to create a new run.'
  void router.replace('/cpm/results')
}

function printWorkspace() {
  window.print()
}

function normalizeSymbol() {
  form.symbol = form.symbol.trim().toUpperCase()
}

async function refreshPatternPreview() {
  const symbol = form.symbol.trim()
  if (!symbol || !form.startDate || !form.endDate) return

  const requestId = ++patternPreviewRequestId
  patternPreviewLoading.value = true
  try {
    const result = await fetchCpmPatternPreview(
      {
        symbol,
        startDate: form.startDate,
        endDate: form.endDate,
      },
      abortController.signal,
    )
    if (requestId === patternPreviewRequestId) patternPreview.value = result
  } finally {
    if (requestId === patternPreviewRequestId) patternPreviewLoading.value = false
  }
}

function validateForm() {
  formError.value = ''
  normalizeSymbol()

  if (!form.name.trim()) formError.value = 'Please enter a CPM name.'
  else if (!form.symbol.trim()) formError.value = 'Please enter a symbol.'
  else if (!form.startDate || !form.endDate) formError.value = 'Please select a pattern start and end date.'
  else if (Date.parse(`${form.endDate}T00:00:00`) < Date.parse(`${form.startDate}T00:00:00`)) formError.value = 'Pattern end date must be after the start date.'
  else if ((form.barsNum || 0) < 3) formError.value = 'Selected pattern needs at least 3 bars.'
  else if ((form.corrPer || 0) <= 0 || (form.corrPer || 0) > 100) formError.value = 'Correlation percentage must be between 1 and 100.'
  else if ((form.tim || 0) <= 0) formError.value = 'Time in market must be greater than 0.'

  return !formError.value
}

function cpmPayload(): CpmCorrelationPayload {
  return {
    name: form.name.trim(),
    symbol: form.symbol.trim().toUpperCase(),
    timeframe: form.timeframe,
    start_date: form.startDate,
    end_date: form.endDate,
    lookback_period: form.lookbackPeriod,
    year: form.lookbackYears,
    corr_per: form.corrPer,
    tim: form.tim,
    exclude_overlap: form.excludeOverlap,
    direction: form.direction,
    bars_num: form.barsNum,
    ma_condition: form.condition,
    ma: form.period,
    system_pattern: selectedPayloadPattern.value,
  }
}

async function previewMatches() {
  if (!validateForm()) return

  previewLoading.value = true
  previewJob.value = null
  previewMatchResult.value = null
  actionMessage.value = ''
  activeStep.value = 2

  try {
    const started = await startCpmPatternMatchPreview(cpmPayload(), abortController.signal)
    previewJob.value = started
    previewMatchResult.value = normalizeCpmCorrelationResult(started.raw)

    if (started.url) {
      const finished = await pollJob(started.url, fetchCpmPatternMatchPreview)
      previewJob.value = finished
      previewMatchResult.value = normalizeCpmCorrelationResult(finished.raw)
    }

    actionMessage.value = previewJob.value?.message || 'Preview finished.'
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Preview failed.'
  } finally {
    previewLoading.value = false
  }
}

async function runBacktest() {
  if (!validateForm()) return

  backtestLoading.value = true
  detailLoading.value = true
  actionMessage.value = ''
  activeStep.value = 3

  try {
    const payload = cpmPayload()
    const started = currentUrl.value
      ? await updateCpmPatternBacktest(currentUrl.value, payload, abortController.signal)
      : await startCpmPatternBacktest(payload, abortController.signal)
    const url = started.url || currentUrl.value

    if (url) {
      currentUrl.value = url
      await router.replace({ path: '/cpm/results', query: { url } })
      const finished = await pollBacktest(url)
      if (finished) backtestResult.value = finished
      actionMessage.value = 'Backtest finished.'
    } else {
      backtestResult.value = normalizeCpmCorrelationResult(started.raw)
      actionMessage.value = started.message || 'Backtest request finished.'
    }
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Backtest failed.'
  } finally {
    backtestLoading.value = false
    detailLoading.value = false
  }
}

async function pollJob(url: string, getter: (url: string, signal?: AbortSignal) => Promise<CpmJobResponse>) {
  let latest: CpmJobResponse | null = null
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await delay(attempt === 0 ? 800 : 1500)
    latest = await getter(url, abortController.signal)
    if (isJobFailed(latest)) throw new Error(latest.message || 'CPM job failed.')
    if (isJobComplete(latest)) return latest
  }
  if (latest) return latest
  throw new Error('CPM job timed out.')
}

async function pollBacktest(url: string) {
  let latest: CpmCorrelationResult | null = null
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await delay(attempt === 0 ? 800 : 1500)
    const job = await fetchCpmPatternBacktestJob(url, abortController.signal)
    if (isJobFailed(job)) throw new Error(job.message || 'CPM backtest failed.')

    const result = normalizeCpmCorrelationResult(job.raw)
    latest = result
    backtestResult.value = result
    applyResultToForm(result)

    if (isBacktestComplete(result, job)) return result
  }
  return latest
}

function isJobComplete(job: CpmJobResponse) {
  const status = job.status.trim().toLowerCase()
  return job.code === 200 || ['finish', 'finished', 'success', 'complete', 'completed'].includes(status)
}

function isJobFailed(job: CpmJobResponse) {
  const status = job.status.trim().toLowerCase()
  return job.code === 500 || ['fail', 'failed', 'error'].includes(status)
}

function isBacktestComplete(result: CpmCorrelationResult, job: CpmJobResponse) {
  const status = String(result.data.status ?? job.status ?? '').trim().toLowerCase()
  if (['fail', 'failed', 'error'].includes(status)) throw new Error(result.message || job.message || 'CPM backtest failed.')
  return result.code === 200 || isJobComplete(job) || ['finish', 'finished', 'success'].includes(status)
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function loadDetail(url: string) {
  if (!url) return
  currentUrl.value = url
  detailLoading.value = true
  activeStep.value = 3
  try {
    const result = await fetchCpmResult(url, abortController.signal)
    if (result) {
      backtestResult.value = result
      applyResultToForm(result)
    }
  } finally {
    detailLoading.value = false
  }
}

function applyResultToForm(result: CpmCorrelationResult) {
  const data = result.data
  assignString('name', data, ['name'])
  assignString('symbol', data, ['symbol'])
  assignString('timeframe', data, ['timeframe'])
  assignString('direction', data, ['direction'])
  assignString('startDate', data, ['start_date', 'startDate'])
  assignString('endDate', data, ['end_date', 'endDate'])
  assignString('lookbackPeriod', data, ['lookback_period', 'lookbackPeriod'])
  assignString('selectPattern', data, ['system_pattern', 'systemPattern'])
  assignNumber('corrPer', data, ['corr_per', 'corrPer', 'minimum_correlation'])
  assignNumber('tim', data, ['tim', 'time_in_market'])
  assignNumber('period', data, ['ma', 'period'])
  assignNumber('barsNum', data, ['bars_num', 'barsNum'])

  const condition = valueFrom(data, ['ma_condition', 'condition'])
  if (condition !== undefined && condition !== null && condition !== '') form.condition = String(condition)
  form.patternSource = form.selectPattern === 'customize_pattern' ? 'Historical Pattern' : 'Common Pattern'
}

function assignString(key: keyof PatternForm, data: Record<string, unknown>, keys: string[]) {
  const value = valueFrom(data, keys)
  if (value === undefined || value === null || value === '') return
  const normalized = String(value)
  if (typeof form[key] === 'string') {
    const writableForm = form as Record<keyof PatternForm, string | number | boolean>
    writableForm[key] = normalized
  }
}

function assignNumber(key: keyof PatternForm, data: Record<string, unknown>, keys: string[]) {
  const parsed = parseCpmNumber(valueFrom(data, keys))
  if (parsed === null) return
  if (typeof form[key] === 'number') {
    const writableForm = form as Record<keyof PatternForm, string | number | boolean>
    writableForm[key] = parsed
  }
}

function nestedRecords(data: Record<string, unknown>) {
  return [
    data,
    recordFrom(data.params),
    recordFrom(data.input),
    recordFrom(data.inputs),
    recordFrom(data.setup),
    recordFrom(data.request),
  ]
}

function valueFrom(data: Record<string, unknown>, keys: string[]) {
  for (const record of nestedRecords(data)) {
    for (const key of keys) {
      const value = record[key]
      if (value !== undefined && value !== null && value !== '') return value
    }
  }
  return undefined
}

function firstPresent(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null) return data[key]
  }
  return undefined
}

function recordFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function rowsFromUnknown(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object' && !Array.isArray(row)))
  }

  const record = recordFrom(value)
  if (!Object.keys(record).length) return []
  const arrayKeys = Object.keys(record).filter((key) => Array.isArray(record[key]))
  if (!arrayKeys.length) return []
  const length = Math.max(...arrayKeys.map((key) => (record[key] as unknown[]).length))

  return Array.from({ length }, (_, rowIndex) =>
    arrayKeys.reduce<Record<string, unknown>>((row, key) => {
      row[displayFieldLabel(key)] = (record[key] as unknown[])[rowIndex]
      return row
    }, { id: rowIndex + 1 }),
  )
}

function resultSeries(data: Record<string, unknown>) {
  return recordFrom(data.result)
}

function arrayField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (Array.isArray(value)) return value
  }
  return []
}

function buildTradeRows(data: Record<string, unknown>) {
  const result = resultSeries(data)
  const startDates = arrayField(result, ['Start Date', 'start_date', 'Trade Date'])
  const entryPrices = arrayField(result, ['Symbol Close', 'Entry Price', 'entry_price'])
  const exitDates = arrayField(result, ['Exit Date', 'End Date', 'exit_date'])
  const exitPrices = arrayField(result, ['Exit Price', 'exit_price'])
  const maxGains = arrayField(result, ['Max Gain', 'max_gain'])
  const maxLosses = arrayField(result, ['Max Loss', 'max_loss'])
  const returns = arrayField(result, ['Each Return', 'Return', 'return'])
  const marketConditions = arrayField(result, ['Market Condition', 'market_condition'])
  const correlations = arrayField(result, ['Correlation Percentage', 'correlation_percentage', 'Correlation'])
  const length = Math.max(startDates.length, exitDates.length, returns.length, correlations.length)

  return Array.from({ length }, (_, index) => ({
    id: index + 1,
    'Trade Date': startDates[index] ?? '-',
    'Entry Price': entryPrices[index] ?? '-',
    'Exit Date': exitDates[index] ?? '-',
    'Exit Price': exitPrices[index] ?? '-',
    'Max Gain': maxGains[index] ?? '-',
    'Max Loss': maxLosses[index] ?? '-',
    Return: returns[index] ?? '-',
    'Market Condition': marketConditions[index] ?? '-',
    'Correlation Percentage': correlations[index] ?? '-',
  }))
}

function buildCorrelationRows(data: Record<string, unknown>) {
  const result = resultSeries(data)
  const startDates = arrayField(result, ['Start Date', 'start_date'])
  const endDates = arrayField(result, ['End Date', 'Exit Date', 'end_date'])
  const correlations = arrayField(result, ['Correlation Percentage', 'correlation_percentage', 'Correlation'])
  const returns = arrayField(result, ['Each Return', 'Return', 'return'])
  const length = Math.max(startDates.length, endDates.length, correlations.length)

  return Array.from({ length }, (_, index) => ({
    id: index + 1,
    'Start Date': startDates[index] ?? '-',
    'End Date': endDates[index] ?? '-',
    'Correlation Percentage': correlations[index] ?? '-',
    Return: returns[index] ?? '-',
  }))
}

function tableColumns(rows: Array<Record<string, unknown>>): AppDataTableColumn[] {
  const first = rows[0]
  if (!first) return []
  return Object.keys(first)
    .filter((key) => key !== 'id')
    .map((key) => {
      const numeric = rows.some((row) => parseCpmNumber(row[key]) !== null)
      return {
        key,
        label: displayFieldLabel(key),
        minWidth: key.toLowerCase().includes('date') ? 120 : numeric ? 110 : 150,
        align: numeric ? 'right' as const : 'left' as const,
        format: numeric ? formatFlexibleTableNumber : undefined,
        cellClass: /return|gain|loss/i.test(key) ? toneClass : undefined,
      }
    })
}

function displayFieldLabel(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatFlexibleTableNumber(value: unknown) {
  const key = String(value ?? '')
  if (key.includes('%')) return key
  const parsed = parseCpmNumber(value)
  if (parsed === null) return value === undefined || value === null || value === '' ? '-' : String(value)
  return Number.isInteger(parsed) ? formatCpmNumber(parsed, 0, true) : formatCpmNumber(parsed, 2, true)
}

function formatTableNumber(value: unknown) {
  return formatCpmNumber(value, 2, true)
}

function formatTablePercent(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text || text === '-') return '-'
  if (text.includes('%')) return text
  return formatCpmPercent(value)
}

function toneClass(value: unknown) {
  const parsed = parseCpmNumber(value)
  if (parsed === null) return 'text-[var(--app-text-secondary)]'
  if (parsed > 0) return 'text-[var(--app-positive)]'
  if (parsed < 0) return 'text-[var(--app-negative)]'
  return 'text-[var(--app-text-secondary)]'
}

function metricToneClass(tone: MetricCard['tone']) {
  if (tone === 'positive') return 'text-[var(--app-positive)]'
  if (tone === 'negative') return 'text-[var(--app-negative)]'
  return 'text-[var(--app-text)]'
}

function metricValue(...keys: string[]) {
  return formatCpmPercent(valueFrom(resultData.value, keys))
}

function toneFromValue(value: unknown): MetricCard['tone'] {
  const parsed = parseCpmNumber(value)
  if (parsed === null) return 'neutral'
  if (parsed > 0) return 'positive'
  if (parsed < 0) return 'negative'
  return 'neutral'
}

function downloadResults() {
  const rows = activeResultRows.value as Array<Record<string, unknown>>
  const columns = activeResultColumns.value
  if (!rows.length || !columns.length) return
  const headers = columns.map((column) => column.label)
  const body = rows.map((row) => columns.map((column) => row[column.key] ?? ''))
  downloadCsv(cpmCsvFilename(`${form.symbol || 'cpm'}-${activeResultTab.value}`, new Date().toISOString().slice(0, 10)), toCsv(headers, body))
}

watch(
  () => [form.startDate, form.endDate],
  () => {
    updateBarsFromDates()
  },
)

watch(
  () => [form.symbol, form.startDate, form.endDate],
  () => {
    void refreshPatternPreview()
  },
  { immediate: true },
)

watch(
  () => route.query.url,
  (url) => {
    if (typeof url === 'string' && url) void loadDetail(url)
    else currentUrl.value = ''
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  abortController.abort()
})
</script>

<template>
  <div class="p-3">
    <section class="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)]">
      <div class="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <h2 class="text-2xl font-black leading-tight text-[var(--app-text)]">Correlation Pattern Match</h2>
          <p class="mt-1 text-sm leading-5 text-[var(--app-text-secondary)]">
            Find similar historical patterns and backtest their outcomes.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-xs font-extrabold text-[var(--app-primary)] hover:bg-[var(--app-primary-soft)]" type="button" @click="goToStep(2)">
            <Info :size="14" />
            Description
          </button>
          <button class="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-xs font-extrabold text-[var(--app-primary)] hover:bg-[var(--app-primary-soft)] disabled:cursor-not-allowed disabled:opacity-50" type="button" :disabled="backtestLoading" @click="runBacktest">
            <Save :size="14" />
            Save
          </button>
          <button class="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-xs font-extrabold text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-soft)]" type="button" @click="duplicateSetup">
            <Copy :size="14" />
            Duplicate
          </button>
          <button class="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-xs font-extrabold text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-soft)]" type="button" @click="goToStep(2)">
            <CircleHelp :size="14" />
            Help
          </button>
        </div>
      </div>

      <div class="flex min-w-0 overflow-x-auto border-t border-[var(--app-border)] px-4">
        <button
          v-for="step in workflowTabs"
          :key="step.id"
          class="h-11 shrink-0 border-b-2 px-4 text-sm font-extrabold"
          :class="activeStep === step.id ? 'border-[var(--app-primary)] text-[var(--app-primary)]' : 'border-transparent text-[var(--app-text-secondary)] hover:text-[var(--app-primary)]'"
          type="button"
          @click="goToStep(step.id)"
        >
          {{ step.label }}
        </button>
      </div>
    </section>

    <section ref="selectPatternElement" class="mt-3 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)]">
      <div class="grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div class="p-4">
          <h3 class="text-xl font-black text-[var(--app-text)]">Select Pattern</h3>
          <div class="mt-3 grid max-w-md grid-cols-2 overflow-hidden rounded-md border border-[var(--app-primary-hover)] bg-[var(--app-surface)]">
            <button
              class="h-9 text-sm font-extrabold transition"
              :class="form.patternSource === 'Historical Pattern' ? 'bg-[var(--app-primary)] text-white' : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]'"
              type="button"
              @click="setPatternSource('Historical Pattern')"
            >
              Historical Pattern
            </button>
            <button
              class="h-9 border-l border-[var(--app-primary-hover)] text-sm font-extrabold transition"
              :class="form.patternSource === 'Common Pattern' ? 'bg-[var(--app-primary)] text-white' : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]'"
              type="button"
              @click="setPatternSource('Common Pattern')"
            >
              Common Pattern
            </button>
          </div>

          <div class="mt-3 flex flex-wrap items-start gap-x-3 gap-y-2">
            <label class="grid min-w-44 flex-[3_1_0%] gap-1 text-xs font-bold text-[var(--app-text-muted)]">
              Symbol
              <SearchSelect
                v-model="form.symbol"
                :options="symbolSearchOptions"
                placeholder="Search symbol"
                aria-label="Search pattern symbol"
                @select="normalizeSymbol"
              />
            </label>
            <label class="grid min-w-64 flex-[4_1_0%] gap-1 text-xs font-bold text-[var(--app-text-muted)]">
              Date Range
              <span class="flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1">
                <input v-model="form.startDate" type="date" class="h-9 min-w-28 flex-1 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2 text-sm font-semibold text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]" />
                <span class="text-xs font-semibold text-[var(--app-text-muted)]">to</span>
                <input v-model="form.endDate" type="date" class="h-9 min-w-28 flex-1 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2 text-sm font-semibold text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]" />
              </span>
            </label>
            <label class="grid min-w-32 flex-[2_1_0%] gap-1 text-xs font-bold text-[var(--app-text-muted)]">
              Timeframe
              <select v-model="form.timeframe" class="h-9 min-w-0 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm font-semibold text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]">
                <option v-for="option in timeframeOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </label>
            <label
              v-if="form.patternSource === 'Common Pattern'"
              class="grid min-w-0 flex-[3_1_0%] gap-1 text-xs font-bold text-[var(--app-text-muted)]"
            >
              Common Pattern
              <select v-model="form.selectPattern" class="h-9 min-w-0 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm font-semibold text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]">
                <option v-for="option in commonPatternOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </label>
            <button
              class="mt-5 inline-flex h-9 min-w-36 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-[var(--app-primary)] px-4 text-xs font-extrabold text-white transition hover:bg-[var(--app-primary-hover)]"
              type="button"
              @click="fitSelection"
            >
              <ZoomIn :size="14" />
              Fit Selection
            </button>
          </div>

          <div class="relative mt-4 overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)]">
            <CpmPatternPreviewChart :points="chartPoints" value-mode="price" :loading="patternPreviewLoading" :height="310" :overlays="previewMatchOverlays" />
            <div class="pointer-events-none absolute bottom-9 left-[10%] top-9 w-[88%] border-x-2 border-[var(--app-primary)] bg-[var(--app-primary-soft)]/70">
              <span class="absolute -left-2 top-[28%] h-4 w-4 -translate-y-1/2 rounded-full bg-[var(--app-primary)] shadow" />
              <span class="absolute -right-2 top-[20%] h-4 w-4 -translate-y-1/2 rounded-full bg-[var(--app-primary)] shadow" />
            </div>
          </div>
        </div>

        <aside class="border-t border-[var(--app-border-muted)] p-4 xl:border-l xl:border-t-0">
          <h3 class="text-lg font-black text-[var(--app-text)]">Selected Pattern</h3>
          <dl class="mt-3 divide-y divide-[var(--app-border-muted)] text-sm">
            <div class="grid grid-cols-[1fr_auto] gap-3 py-2">
              <dt class="font-normal text-[var(--app-text-muted)]">Symbol</dt>
              <dd class="font-extrabold text-[var(--app-text)]">{{ form.symbol || '-' }}</dd>
            </div>
            <div class="grid grid-cols-[1fr_auto] gap-3 py-2">
              <dt class="font-normal text-[var(--app-text-muted)]">Pattern Start Date</dt>
              <dd class="font-extrabold text-[var(--app-text)]">{{ form.startDate || '-' }}</dd>
            </div>
            <div class="grid grid-cols-[1fr_auto] gap-3 py-2">
              <dt class="font-normal text-[var(--app-text-muted)]">Pattern End Date</dt>
              <dd class="font-extrabold text-[var(--app-text)]">{{ form.endDate || '-' }}</dd>
            </div>
            <div class="grid grid-cols-[1fr_auto] gap-3 py-2">
              <dt class="font-normal text-[var(--app-text-muted)]">Number of Bars</dt>
              <dd class="font-extrabold text-[var(--app-text)]">{{ form.barsNum || '-' }}</dd>
            </div>
            <div class="grid grid-cols-[1fr_auto] gap-3 py-2">
              <dt class="font-normal text-[var(--app-text-muted)]">Timeframe</dt>
              <dd class="font-extrabold text-[var(--app-text)]">{{ form.timeframe }}</dd>
            </div>
          </dl>

          <div class="mt-4">
            <div class="mb-1 text-xs font-normal uppercase tracking-wide text-[var(--app-text-muted)]">Normalized Pattern Preview</div>
            <div class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] p-2">
              <CpmPatternPreviewChart :points="normalizedPreviewPoints" value-mode="normalized" :height="118" />
            </div>
          </div>

          <button class="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-[var(--app-primary)] px-4 text-sm font-extrabold text-white shadow-sm hover:bg-[var(--app-primary-hover)]" type="button" @click="useThisPattern">
            Use This Pattern
          </button>
        </aside>
      </div>
    </section>

    <section ref="settingsElement" class="mt-3 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h3 class="text-xl font-black text-[var(--app-text)]">Match &amp; Backtest Settings</h3>
        <span v-if="currentUrl" class="rounded-md bg-[var(--app-surface-soft)] px-2.5 py-1 text-xs font-extrabold text-[var(--app-text-muted)]">Detail URL loaded</span>
      </div>

      <p class="mb-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md bg-[var(--app-surface-soft)] px-3 py-2 text-sm font-normal text-[var(--app-text)]">
        <span>{{ form.symbol || '-' }}</span>
        <span class="text-[var(--app-text-muted)]">·</span>
        <span>{{ form.timeframe }}</span>
        <span class="text-[var(--app-text-muted)]">·</span>
        <span>{{ summaryPatternLabel }}</span>
        <span class="text-[var(--app-text-muted)]">·</span>
        <span>{{ formatSummaryDate(form.startDate) }}</span>
        <ArrowRight :size="14" class="shrink-0 text-[var(--app-primary)]" />
        <span>{{ formatSummaryDate(form.endDate) }} ({{ selectionSummaryBars }} bars)</span>
      </p>

      <div class="grid gap-x-8 gap-y-3 xl:grid-cols-3">
        <label class="grid gap-1 text-xs font-bold text-[var(--app-text-muted)]">
          Study Name
          <input v-model="form.name" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm font-semibold text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]" />
        </label>
        <label class="grid gap-1 text-xs font-bold text-[var(--app-text-muted)]">
          Condition
          <select v-model="form.condition" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm font-semibold text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]">
            <option v-for="option in conditionOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label class="grid gap-1 text-xs font-bold text-[var(--app-text-muted)]">
          Search Period
          <span class="flex h-9 overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-surface)]">
            <input v-model.number="form.period" type="number" min="1" class="min-w-0 flex-1 bg-transparent px-2.5 text-sm font-semibold text-[var(--app-text)] outline-none" />
            <span class="flex w-14 items-center justify-center border-l border-[var(--app-border)] bg-[var(--app-surface-soft)] text-sm font-extrabold text-[var(--app-text-muted)]">bars</span>
          </span>
        </label>
        <label class="grid gap-1 text-xs font-bold text-[var(--app-text-muted)]">
          Minimum Correlation
          <span class="flex h-9 overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-surface)]">
            <input v-model.number="form.corrPer" type="number" min="1" max="100" class="min-w-0 flex-1 bg-transparent px-2.5 text-sm font-semibold text-[var(--app-text)] outline-none" />
            <span class="flex w-12 items-center justify-center border-l border-[var(--app-border)] bg-[var(--app-surface-soft)] text-sm font-extrabold text-[var(--app-text-muted)]">%</span>
          </span>
        </label>
        <label class="grid gap-1 text-xs font-bold text-[var(--app-text-muted)]">
          Direction
          <select v-model="form.direction" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm font-semibold text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]">
            <option v-for="option in directionOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
        <label class="grid gap-1 text-xs font-bold text-[var(--app-text-muted)]">
          Time in Market
          <span class="flex h-9 overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-surface)]">
            <input v-model.number="form.tim" type="number" min="1" class="min-w-0 flex-1 bg-transparent px-2.5 text-sm font-semibold text-[var(--app-text)] outline-none" />
            <span class="flex w-14 items-center justify-center border-l border-[var(--app-border)] bg-[var(--app-surface-soft)] text-sm font-extrabold text-[var(--app-text-muted)]">bars</span>
          </span>
        </label>
        <label class="grid gap-1 text-xs font-bold text-[var(--app-text-muted)]">
          Lookback Period
          <select v-model="form.lookbackPeriod" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm font-semibold text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]">
            <option v-for="option in lookbackOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label v-if="form.lookbackPeriod === 'Years'" class="grid gap-1 text-xs font-bold text-[var(--app-text-muted)]">
          Lookback Years
          <span class="flex h-9 overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-surface)]">
            <input v-model.number="form.lookbackYears" type="number" min="1" class="min-w-0 flex-1 bg-transparent px-2.5 text-sm font-semibold text-[var(--app-text)] outline-none" />
            <span class="flex w-14 items-center justify-center border-l border-[var(--app-border)] bg-[var(--app-surface-soft)] text-sm font-extrabold text-[var(--app-text-muted)]">years</span>
          </span>
        </label>
      </div>

      <div class="mt-5 flex flex-col gap-3 border-t border-[var(--app-border-muted)] pt-4 lg:flex-row lg:items-center lg:justify-between">
        <p class="text-sm leading-5 text-[var(--app-text-secondary)]">Higher correlation finds closer matches to the historical pattern.</p>
        <div class="flex flex-wrap gap-2 lg:justify-end">
          <button class="inline-flex h-10 min-w-44 items-center justify-center gap-2 rounded-md border border-[var(--app-primary-hover)] bg-[var(--app-surface)] px-4 text-sm font-extrabold text-[var(--app-primary)] hover:bg-[var(--app-primary-soft)] disabled:cursor-not-allowed disabled:opacity-50" type="button" :disabled="previewLoading" @click="previewMatches">
            <Loader2 v-if="previewLoading" :size="16" class="animate-spin" />
            <Search v-else :size="16" />
            Preview Matches
          </button>
          <button class="inline-flex h-10 min-w-44 items-center justify-center gap-2 rounded-md bg-[var(--app-primary)] px-4 text-sm font-extrabold text-white shadow-sm hover:bg-[var(--app-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50" type="button" :disabled="backtestLoading" @click="runBacktest">
            <Loader2 v-if="backtestLoading" :size="16" class="animate-spin" />
            <Play v-else :size="16" />
            Backtest Pattern
          </button>
        </div>
      </div>

      <p v-if="formError" class="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{{ formError }}</p>
      <p v-else-if="actionMessage" class="mt-3 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-primary-soft)] px-3 py-2 text-sm font-semibold text-[var(--app-text-secondary)]">{{ actionMessage }}</p>

      <div v-if="previewMatchColumns.length || previewLoading" class="mt-4">
        <div class="mb-2 flex items-center justify-between gap-2">
          <h4 class="text-sm font-extrabold text-[var(--app-text)]">Preview Matches</h4>
          <span class="text-xs font-semibold text-[var(--app-text-muted)]">{{ previewJob?.status || previewJob?.message || '' }}</span>
        </div>
        <AppDataTable :columns="previewMatchColumns" :rows="previewMatchRows" :loading="previewLoading" empty-message="No preview matches returned" />
      </div>
    </section>

    <section ref="resultsElement" class="mt-3 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
      <div class="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 class="text-xl font-black text-[var(--app-text)]">Backtest Results</h3>
          <p class="mt-1 text-sm text-[var(--app-text-muted)]">{{ resultSubtitle }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--app-border)] px-2.5 text-xs font-extrabold text-[var(--app-text-secondary)] hover:text-[var(--app-primary)] disabled:cursor-not-allowed disabled:opacity-50" type="button" :disabled="!activeResultRows.length" @click="downloadResults">
            <Download :size="14" />
            Download
          </button>
          <button class="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--app-border)] px-2.5 text-xs font-extrabold text-[var(--app-text-secondary)] hover:text-[var(--app-primary)]" type="button" @click="printWorkspace">
            <Camera :size="14" />
            Screenshot
          </button>
        </div>
      </div>

      <div class="grid gap-3 lg:grid-cols-3">
        <div v-for="card in primaryResultCards" :key="card.label" class="flex min-h-[94px] items-center gap-4 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] px-4 py-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--app-primary-soft)] text-[var(--app-primary)]">
            <component :is="card.icon" :size="22" />
          </span>
          <div>
            <div class="text-sm font-semibold text-[var(--app-text-secondary)]">{{ card.label }}</div>
            <div class="mt-1 text-3xl font-black leading-none" :class="metricToneClass(card.tone)">{{ card.value }}</div>
          </div>
        </div>
      </div>

      <div class="mt-3 grid gap-0 overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] sm:grid-cols-2 lg:grid-cols-6">
        <div v-for="stat in secondaryResultStats" :key="stat.label" class="border-b border-[var(--app-border-muted)] px-4 py-2 last:border-b-0 sm:border-r lg:border-b-0">
          <div class="text-xs font-semibold text-[var(--app-text-muted)]">{{ stat.label }}</div>
          <div class="mt-1 text-sm font-black" :class="metricToneClass(stat.tone)">{{ stat.value }}</div>
        </div>
      </div>

      <div class="mt-4 overflow-hidden rounded-md border border-[var(--app-border-muted)]">
        <div class="flex min-w-0 overflow-x-auto border-b border-[var(--app-border-muted)] bg-[var(--app-surface)] px-2">
          <button
            v-for="tab in resultTabs"
            :key="tab.id"
            class="h-11 shrink-0 border-b-2 px-3 text-sm font-extrabold"
            :class="activeResultTab === tab.id ? 'border-[var(--app-primary)] text-[var(--app-primary)]' : 'border-transparent text-[var(--app-text-secondary)] hover:text-[var(--app-primary)]'"
            type="button"
            @click="activeResultTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="p-3">
          <AppDataTable
            v-if="activeResultColumns.length"
            :columns="activeResultColumns"
            :rows="activeResultRows"
            :loading="detailLoading || backtestLoading"
            empty-message="No rows returned for this result tab"
          />
          <div v-else class="h-48 rounded-md border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface)] px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
            {{ detailLoading || backtestLoading ? 'Loading result...' : 'No rows returned for this result tab' }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

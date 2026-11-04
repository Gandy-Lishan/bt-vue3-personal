<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
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
  parseCpmJsonRecord,
  parseCpmNumber,
} from '@/entities/cpm/model/cpm.adapter'
import type {
  CpmCorrelationPayload,
  CpmCorrelationResult,
  CpmJobResponse,
  CpmPatternPreviewResult,
} from '@/entities/cpm/model/cpm.types'
import {
  buildCpmLongTermReport,
  buildCpmMaxGainLossReport,
  buildCpmShortTermReport,
} from '@/entities/cpm/model/cpm.timeframe'
import type {
  CpmChartQuoteSnapshot,
  CpmMaxGainLossReport,
  CpmTimeframeReport,
} from '@/entities/cpm/model/cpm.timeframe'
import { downloadCsv, toCsv } from '@/shared/utils/csv'
import { timestampToTime } from '@/shared/utils/time'
import AppDataTable from '@/shared/ui/AppDataTable.vue'
import type { AppDataTableColumn } from '@/shared/ui/app-data-table.types'
import SearchSelect from '@/shared/ui/SearchSelect.vue'
import indexesData from '@/assets/indexes_list.json'
import stocksData from '@/assets/stocks_list.json'
import ascendingChannelImage from '@/assets/patterns/ascending_channel_svg.svg'
import ascendingChannelThumbnail from '@/assets/patterns/ascending_channel.png'
import descendingChannelImage from '@/assets/patterns/descending_channel_svg.svg'
import descendingChannelThumbnail from '@/assets/patterns/descending_channel.png'
import doubleBottomImage from '@/assets/patterns/double_bottom_svg.svg'
import doubleBottomThumbnail from '@/assets/patterns/double_bottom.png'
import doubleTopImage from '@/assets/patterns/double_top_svg.svg'
import doubleTopThumbnail from '@/assets/patterns/double_top.png'
import headAndShoulderBottomImage from '@/assets/patterns/head_and_shoulder_bottom_svg.svg'
import headAndShoulderBottomThumbnail from '@/assets/patterns/head_and_shoulder_bottom.png'
import headAndShoulderTopImage from '@/assets/patterns/head_and_shoulder_top_svg.svg'
import headAndShoulderTopThumbnail from '@/assets/patterns/head_and_shoulder_top.png'
import roundingBottomImage from '@/assets/patterns/rounding_bottom_svg.svg'
import roundingBottomThumbnail from '@/assets/patterns/rounding_bottom.png'
import tripleTapImage from '@/assets/patterns/triple_tap_svg.svg'
import tripleTapThumbnail from '@/assets/patterns/triple_tap.png'
import CpmPatternPreviewChart from './CpmPatternPreviewChart.vue'
import CpmPatternChartIQ from './CpmPatternChartIQ.vue'

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
const commonPatternMenu = ref<HTMLDetailsElement | null>(null)
const patternPreview = ref<CpmPatternPreviewResult | null>(null)
const patternPreviewLoading = ref(false)
const previewLoading = ref(false)
const backtestLoading = ref(false)
const detailLoading = ref(false)
const backtestProgress = ref(0)
const backtestTips = ref('')
const formError = ref('')
const actionMessage = ref('')
const previewJob = ref<CpmJobResponse | null>(null)
const previewMatchResult = ref<CpmCorrelationResult | null>(null)
const backtestResult = ref<CpmCorrelationResult | null>(null)
/** ChartIQ 行情快照（dataSet/masterData），Vue2 TIM/MaxMin 计算的数据源 */
const chartQuotes = ref<CpmChartQuoteSnapshot | null>(null)
const currentUrl = ref('')
let patternPreviewRequestId = 0

/**
 * Vue2 Form.vue setBacktestHistory(val)：end_date = 今天，start_date = 同一日往前 val 个月。
 * mounted 时调用 setBacktestHistory(1)，所以默认选中「最近一个月」的 pattern（约 22 根日线），
 * 而不是固定天数的区间。
 */
function defaultPatternRange(monthsBack: number) {
  const endDate = timestampToTime(new Date().getTime())
  const end = new Date(endDate)
  const start = new Date(end)
  start.setMonth(end.getMonth() - monthsBack)
  return { startDate: timestampToTime(start.getTime()), endDate }
}

const initialPatternRange = defaultPatternRange(1)
const defaultEndDate = initialPatternRange.endDate
const defaultStartDate = initialPatternRange.startDate

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
  { value: 'customize_pattern', label: 'Customize Pattern', image: '', thumbnail: '' },
  { value: 'triple_tap', label: 'Triple Tap', image: tripleTapImage, thumbnail: tripleTapThumbnail },
  { value: 'rounding_bottom', label: 'Rounding Bottom', image: roundingBottomImage, thumbnail: roundingBottomThumbnail },
  { value: 'descending_channel', label: 'Descending Channel', image: descendingChannelImage, thumbnail: descendingChannelThumbnail },
  { value: 'ascending_channel', label: 'Ascending Channel', image: ascendingChannelImage, thumbnail: ascendingChannelThumbnail },
  { value: 'head_and_shoulder_bottom', label: 'Head and Shoulders Bottom', image: headAndShoulderBottomImage, thumbnail: headAndShoulderBottomThumbnail },
  { value: 'head_and_shoulder_top', label: 'Head and Shoulders Top', image: headAndShoulderTopImage, thumbnail: headAndShoulderTopThumbnail },
  { value: 'double_bottom', label: 'Double Bottom', image: doubleBottomImage, thumbnail: doubleBottomThumbnail },
  { value: 'double_top', label: 'Double Top', image: doubleTopImage, thumbnail: doubleTopThumbnail },
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
/** Vue2 的 Short Term tab 只在 rowFrequency === 'Daily' 时显示 */
const visibleResultTabs = computed(() =>
  resultTabs.filter((tab) => tab.id !== 'shortTerm' || form.timeframe === 'Daily'),
)
const workflowTabs: Array<{ id: ActiveStep; label: string }> = [
  { id: 1, label: 'Select Pattern' },
  { id: 2, label: 'Match Settings' },
  { id: 3, label: 'Backtest Results' },
]

const commonPatternOptions = computed(() => patternOptions.filter((item) => item.value !== 'customize_pattern'))
const selectedCommonPattern = computed(() => commonPatternOptions.value.find((item) => item.value === form.selectPattern))
const patternPreviewTitle = computed(() => form.patternSource === 'Common Pattern' ? 'Common Pattern Preview' : 'Normalized Pattern Preview')

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
const chartPoints = computed(() => patternPreview.value?.points ?? [])
const normalizedPreviewPoints = computed(() => chartPoints.value.slice(-Math.max(6, Math.min(chartPoints.value.length, form.barsNum || 63))))
const resultData = computed(() => backtestResult.value?.data ?? {})
const previewMatchRows = computed(() => {
  const result = previewMatchResult.value
  if (!result) return []
  if (result.matrixRows.length) return result.matrixRows
  if (result.seriesRows.length) return result.seriesRows.slice(0, 50)
  return rowsFromUnknown(result.data).slice(0, 50)
})
const previewMatchColumns = computed(() => tableColumns(previewMatchRows.value))
/** 只有 preview 轮询成功且解析出命中列（数组字段）后，才画到 ChartIQ 上 */
const previewChartResult = computed(() => {
  if (previewJob.value?.code !== 200) return null
  const data = previewMatchResult.value?.data
  if (!data || !Object.values(data).some((value) => Array.isArray(value))) return null
  return data
})
const tradeRows = computed(() => buildTradeRows(resultData.value))
const correlationRows = computed(() => buildCorrelationRows(resultData.value))
/** Vue2 results/index.vue TradeDateArray：每笔交易取 result['End Date'] */
const tradeDates = computed(() => {
  const result = resultSeries(resultData.value)
  return arrayField(result, ['End Date', 'end_date', 'Trade Date']).map((value) => String(value))
})

/**
 * Vue2 tim.vue / timShortTerm.vue / MaxMin.vue 的数据源是 CIQ.stxx.chart.dataSet/masterData，
 * 图表加载完成后由 CpmPatternChartIQ 通过 chart-quotes 上报快照后在这里计算。
 */
const timeframeReports = computed<{
  longTerm: CpmTimeframeReport | null
  shortTerm: CpmTimeframeReport | null
  maxGainLoss: CpmMaxGainLossReport | null
}>(() => {
  const snapshot = chartQuotes.value
  const dates = tradeDates.value
  if (!snapshot?.dataSet.length || !dates.length) {
    return { longTerm: null, shortTerm: null, maxGainLoss: null }
  }

  const options = {
    rowFrequency: form.timeframe,
    direction: form.direction || 'Long',
    tradeDates: dates,
    chartDataSet: snapshot.dataSet,
    chartMasterData: snapshot.masterData,
  }

  return {
    longTerm: buildCpmLongTermReport(options),
    // Vue2 只在 Daily 下渲染 Short Term
    shortTerm: form.timeframe === 'Daily' ? buildCpmShortTermReport(options) : null,
    maxGainLoss: buildCpmMaxGainLossReport(options),
  }
})
const activeTimeframeReport = computed(() =>
  activeResultTab.value === 'shortTerm' ? timeframeReports.value.shortTerm : timeframeReports.value.longTerm,
)
const maxGainLossReport = computed(() => timeframeReports.value.maxGainLoss)
const maxGainLossRows = computed(() => maxGainLossReport.value?.rows ?? [])
/** Vue2 MaxMin 表头只显示周期列，汇总行与表头行用不同样式 */
const maxGainLossPeriodLabels = computed(() =>
  (maxGainLossReport.value?.labels ?? []).filter(
    (label) => label !== 'Dates of Signals' && label !== 'Max Gain' && label !== 'Max Loss',
  ),
)
const maxGainLossMeanIndex = computed(() =>
  maxGainLossRows.value.findIndex((row) => row['Dates of Signals'] === 'Mean'),
)

const timeframeStatsColumns = computed<AppDataTableColumn[]>(() => {
  const periods = activeTimeframeReport.value?.periods ?? []
  return [
    { key: 'property', label: 'Property', minWidth: 120, align: 'center' },
    ...periods.map((period) => ({
      key: period,
      label: period,
      minWidth: 100,
      align: 'center' as const,
      format: formatTimeframeStat,
      cellClass: negativeCellClass,
    })),
  ]
})
const timeframeHistoryColumns = computed<AppDataTableColumn[]>(() =>
  (activeTimeframeReport.value?.historyLabels ?? []).map((label) => ({
    key: label,
    label: label === 'Entry Date' ? label : label.replace('[%]', 'Later [%]'),
    minWidth: label === 'Entry Date' ? 120 : 100,
    align: 'center' as const,
    format: formatHistoryCell,
    cellClass: negativeCellClass,
  })),
)

const activeResultRows = computed(() => {
  if (activeResultTab.value === 'statistics') return tradeRows.value
  if (activeResultTab.value === 'correlation') return correlationRows.value
  return []
})
const activeResultColumns = computed<AppDataTableColumn[]>(() => {
  if (activeResultTab.value === 'statistics') return tradeColumns
  if (activeResultTab.value === 'correlation') return tableColumns(correlationRows.value)
  return []
})
/** 下载按钮按当前 tab 导出对应表格 */
const exportTable = computed<{ rows: Array<Record<string, unknown>>; columns: AppDataTableColumn[] }>(() => {
  if (activeResultTab.value === 'statistics') return { rows: tradeRows.value, columns: tradeColumns }
  if (activeResultTab.value === 'correlation') return { rows: correlationRows.value, columns: tableColumns(correlationRows.value) }
  if (activeResultTab.value === 'maxGainLoss') {
    return { rows: maxGainLossExportRows.value, columns: maxGainLossExportColumns.value }
  }
  return { rows: activeTimeframeReport.value?.historyRows ?? [], columns: timeframeHistoryColumns.value }
})
const maxGainLossExportRows = computed(() =>
  maxGainLossRows.value.map((row) => {
    const flat: Record<string, unknown> = { 'Dates of Signals': row['Dates of Signals'] }
    maxGainLossPeriodLabels.value.forEach((label) => {
      flat[`${label} Max Loss`] = nestedMaxMin(row, label, 'Max Loss')
      flat[`${label} Max Gain`] = nestedMaxMin(row, label, 'Max Gain')
    })
    return flat
  }),
)
const maxGainLossExportColumns = computed<AppDataTableColumn[]>(() => [
  { key: 'Dates of Signals', label: 'Dates of Signals', minWidth: 150, align: 'center' },
  ...maxGainLossPeriodLabels.value.flatMap((label) => [
    { key: `${label} Max Loss`, label: `${label.replace('[%]', 'Later [%]')} Max Loss`, minWidth: 100, align: 'center' as const },
    { key: `${label} Max Gain`, label: `${label.replace('[%]', 'Later [%]')} Max Gain`, minWidth: 100, align: 'center' as const },
  ]),
])

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

function updateBarsFromDates() {
  const bars = businessDaysBetween(form.startDate, form.endDate)
  form.barsNum = bars || form.barsNum
}

/** 图表就绪/重载后用 CIQ.measureBarDistance 的实测值覆盖工作日估算 */
function onBarDistance(bars: number) {
  if (bars > 0) form.barsNum = bars
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

function selectCommonPattern(value: string) {
  form.selectPattern = value
  if (commonPatternMenu.value) commonPatternMenu.value.open = false
}

/** Vue2 Form.vue generateCPMName: `SYMBOL  YYYY-M-D H:mm:ss`（不补零） */
function generateCpmName() {
  const date = new Date()
  const stamp = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}  ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
  form.name = `${form.symbol || 'CPM'}  ${stamp}`
}

function duplicateSetup() {
  currentUrl.value = ''
  backtestResult.value = null
  activeStep.value = 1
  generateCpmName()
  actionMessage.value = 'Setup duplicated. Save it to create a new run.'
  void router.replace('/cpm/results')
}

onMounted(() => {
  // Vue2 mounted 时生成默认 CPM 名称；从 url 载入已有 CPM 时会被 applyResultToForm 覆盖
  generateCpmName()
})

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
  patternPreview.value = null
  patternPreviewLoading.value = true
  try {
    const result = await fetchCpmPatternPreview(
      {
        symbol,
        startDate: form.startDate,
        endDate: form.endDate,
        bars: form.barsNum,
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
  // 与 Vue2 Form.vue 保持一致：
  // - year 不作为独立字段提交，Specific Years 时用 lookback_years 覆盖 lookback_period
  // - Historical Pattern（customize_pattern）不发送 system_pattern
  const payload: CpmCorrelationPayload = {
    name: form.name.trim(),
    symbol: form.symbol.trim().toUpperCase(),
    timeframe: form.timeframe,
    start_date: form.startDate,
    end_date: form.endDate,
    lookback_period: form.lookbackPeriod === 'Years' ? form.lookbackYears : form.lookbackPeriod,
    corr_per: form.corrPer,
    tim: form.tim,
    // Vue2 提交的是 1/0，后端按整数解析
    exclude_overlap: form.excludeOverlap ? 1 : 0,
    direction: form.direction,
    bars_num: form.barsNum,
    ma_condition: form.condition,
    ma: form.period,
  }
  if (form.patternSource === 'Common Pattern') payload.system_pattern = form.selectPattern
  return payload
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
    } else {
      // Vue2 行为：未拿到轮询 url 时，code != 201 视为 preview 失败
      const terminal = terminalMessage(started, PREVIEW_ERROR_MESSAGES)
      if (terminal) throw new Error(terminal)
      if (started.code !== 200) throw new Error(started.message || 'Pattern preview failed.')
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
  // backtest 结果会替代 preview 命中标记
  previewJob.value = null
  previewMatchResult.value = null
  backtestProgress.value = 5
  backtestTips.value = 'Tips: Saving your pattern matching parameters...'

  try {
    const payload = cpmPayload()
    // Vue2 saveCPM：校验通过、发出请求前把进度置为 8，之后每轮轮询 +1
    backtestProgress.value = 8
    const started = currentUrl.value
      ? await updateCpmPatternBacktest(currentUrl.value, payload, abortController.signal)
      : await startCpmPatternBacktest(payload, abortController.signal)
    const url = started.url || currentUrl.value

    if (url) {
      currentUrl.value = url
      await router.replace({ path: '/cpm/results', query: { url } })
      backtestTips.value = 'Tips: The pattern backtest is in progress, which may take some time. Please be patient...'
      const finished = await pollBacktest(url)
      if (finished) backtestResult.value = finished
      actionMessage.value = 'Backtest finished.'
    } else {
      const terminal = terminalMessage(started, BACKTEST_ERROR_MESSAGES)
      if (terminal) throw new Error(terminal)
      if (started.code !== null && started.code !== 200 && started.code !== 203) {
        throw new Error(started.message || 'Backtest failed.')
      }
      backtestResult.value = normalizeCpmCorrelationResult(started.raw)
      actionMessage.value = started.message || 'Backtest request finished.'
    }
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Backtest failed.'
  } finally {
    backtestLoading.value = false
    detailLoading.value = false
    backtestProgress.value = 0
    backtestTips.value = ''
  }
}

/** 与 Vue2 Form.vue 对齐的终止错误码 */
const PREVIEW_ERROR_MESSAGES: Record<number, string> = {
  400: 'Pattern preview failed.',
  401: 'Calculate error.',
  403: 'Save failed, please try again.',
  404: 'Save failed, please try again.',
  406: 'This name is already taken. Please pick another.',
  407: 'No correlation pattern match meeting the criteria found.',
}
const BACKTEST_ERROR_MESSAGES: Record<number, string> = {
  401: 'Calculate error.',
  403: 'Save failed, please try again.',
  404: 'Save failed, please try again.',
  407: 'No correlation pattern match meeting the criteria found.',
}
/** Vue2 为无限轮询；这里保持同样的 1.5s 节奏，用 10 分钟上限兜底避免页面卡死 */
const POLL_MAX_ATTEMPTS = 400

function terminalMessage(job: CpmJobResponse, messages: Record<number, string>) {
  if (job.code === null) return ''
  if (job.code === 406) return `Sorry, ${form.name.trim() || 'this name'} is taken. Please pick another.`
  return messages[job.code] ?? ''
}

async function pollJob(url: string, getter: (url: string, signal?: AbortSignal) => Promise<CpmJobResponse>) {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
    await delay(attempt === 0 ? 800 : 1500)
    if (abortController.signal.aborted) throw new Error('Preview cancelled.')
    const job = await getter(url, abortController.signal)
    if (isJobFailed(job)) throw new Error(job.message || 'CPM preview failed.')
    if (isJobComplete(job)) return job

    const terminal = terminalMessage(job, PREVIEW_ERROR_MESSAGES)
    if (terminal) throw new Error(terminal)
  }
  throw new Error('CPM preview timed out. Please try again later.')
}

async function pollBacktest(url: string) {
  let latest: CpmCorrelationResult | null = null
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
    // Vue2: 每次轮询 percentage += 1，最多到 99
    if (backtestProgress.value < 99) backtestProgress.value += 1
    await delay(attempt === 0 ? 800 : 1500)
    if (abortController.signal.aborted) return latest
    const job = await fetchCpmPatternBacktestJob(url, abortController.signal)
    if (isJobFailed(job)) throw new Error(job.message || 'CPM backtest failed.')

    const terminal = terminalMessage(job, BACKTEST_ERROR_MESSAGES)
    if (terminal) throw new Error(terminal)

    const result = normalizeCpmCorrelationResult(job.raw)
    latest = result

    if (isBacktestComplete(result, job)) {
      // 与 Vue2 一致：只把最终结果交给页面/图表。轮询中间态每 1.5s 就换一次对象，
      // 之前每次都会触发图表重绘并叠加 marker。
      backtestResult.value = result
      applyResultToForm(result)
      return result
    }
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
  // 与 Vue2 一致：后端返回 status 时必须等到 finish 才算完成
  if (['finish', 'finished', 'success'].includes(status)) return true
  if (status) return false
  return result.code === 200 || isJobComplete(job)
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
  assignNumber('corrPer', data, ['corr_per', 'corrPer', 'minimum_correlation'])
  assignNumber('tim', data, ['tim', 'time_in_market'])
  assignNumber('barsNum', data, ['bars_num', 'barsNum'])

  // 与 Vue2 displayData 对齐：exclude_overlap 后端返回 1/0
  const excludeOverlap = parseCpmNumber(valueFrom(data, ['exclude_overlap', 'excludeOverlap']))
  if (excludeOverlap !== null) form.excludeOverlap = excludeOverlap === 1

  // lookback_period 命中预设选项时直接用，否则视为自定义年数（Vue2 的 Custom）
  const lookbackRaw = valueFrom(data, ['lookback_period', 'lookbackPeriod'])
  if (lookbackRaw !== undefined) {
    const lookback = String(lookbackRaw)
    const preset = lookbackOptions.some((option) => option.value === lookback)
    form.lookbackPeriod = preset ? lookback : 'Years'
    const years = parseCpmNumber(lookback)
    if (years !== null) form.lookbackYears = years
  }

  // system_pattern 为空 = 用户自选历史区间（Vue2 的 customize_pattern）
  const patternRaw = valueFrom(data, ['system_pattern', 'systemPattern'])
  if (patternRaw === undefined) {
    form.patternSource = 'Historical Pattern'
    form.selectPattern = 'customize_pattern'
  } else {
    form.patternSource = 'Common Pattern'
    form.selectPattern = String(patternRaw)
  }

  // ma_condition / ma 为空时回落到默认值（Vue2 默认 None / 200）
  const condition = valueFrom(data, ['ma_condition', 'condition'])
  form.condition = condition === undefined ? '0' : String(condition)
  form.period = parseCpmNumber(valueFrom(data, ['ma', 'period'])) ?? 200
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
  // 与 Vue2 一致：result 可能是 JSON 字符串
  return parseCpmJsonRecord(data.result) ?? recordFrom(data.result)
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
  // Vue2 results/index.vue: TradeDate 取的是 result['End Date'][i]，不是 Start Date
  const tradeDates = arrayField(result, ['End Date', 'end_date', 'Trade Date'])
  const entryPrices = arrayField(result, ['Symbol Close', 'Entry Price', 'entry_price'])
  const exitDates = arrayField(result, ['Exit Date', 'exit_date'])
  const exitPrices = arrayField(result, ['Exit Price', 'exit_price'])
  const maxGains = arrayField(result, ['Max Gain', 'max_gain'])
  const maxLosses = arrayField(result, ['Max Loss', 'max_loss'])
  const returns = arrayField(result, ['Each Return', 'Return', 'return'])
  const marketConditions = arrayField(result, ['Market Condition', 'market_condition'])
  const correlations = arrayField(result, ['Correlation Percentage', 'correlation_percentage', 'Correlation'])
  const length = Math.max(tradeDates.length, exitDates.length, returns.length, correlations.length)

  return Array.from({ length }, (_, index) => ({
    id: index + 1,
    'Trade Date': tradeDates[index] ?? '-',
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

/** Vue2 tim.vue 统计表单元格：数字 toFixed(1)，字符串原样，NaN 不显示 */
function formatTimeframeStat(value: unknown) {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return Number.isNaN(value) ? '' : parseFloat(String(value)).toFixed(1)
  return ''
}

/** Vue2 tim.vue displayData（后定义覆盖前定义的那个版本） */
function formatHistoryCell(value: unknown) {
  const numberRegex = /^-?\d+(\.\d+)?$/
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  const text = String(value ?? '')
  if (numberRegex.test(text) && !isNaN(value as number)) return parseFloat(text).toFixed(1)
  if (dateRegex.test(text)) return text
  if (typeof value === 'string') return value
  return ''
}

/** Vue2 MaxMin.vue displayData */
function formatMaxMinCell(value: unknown) {
  const numberRegex = /^-?\d+(\.\d+)?$/
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  const text = String(value ?? '')
  if (numberRegex.test(text)) return parseFloat(text).toFixed(1)
  if (dateRegex.test(text)) return text
  if (typeof value === 'string') return value
  return ''
}

/** Vue2 getCellStyle：负数红字 */
function negativeCellClass(value: unknown) {
  const parsed = parseCpmNumber(value)
  return parsed !== null && parsed < 0 ? 'text-[var(--app-negative)]' : ''
}

function nestedMaxMin(row: Record<string, unknown>, label: string, field: 'Max Loss' | 'Max Gain') {
  const cell = row[label]
  if (!cell || typeof cell !== 'object') return undefined
  return (cell as Record<string, unknown>)[field]
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
  const { rows, columns } = exportTable.value
  if (!rows.length || !columns.length) return
  const headers = columns.map((column) => column.label)
  const body = rows.map((row) => columns.map((column) => row[column.key] ?? ''))
  downloadCsv(cpmCsvFilename(`${form.symbol || 'cpm'}-${activeResultTab.value}`, new Date().toISOString().slice(0, 10)), toCsv(headers, body))
}

function onChartQuotes(snapshot: CpmChartQuoteSnapshot) {
  chartQuotes.value = snapshot
}

// 换了符号/周期或重新跑结果时，旧图表的快照不再有效（Vue2 clearResults 会清空 TIM/MaxMin）
watch(
  () => [form.symbol, form.timeframe, backtestResult.value],
  () => {
    chartQuotes.value = null
  },
)

// Vue2 Short Term 只在 Daily 下显示；切到 Weekly/Monthly 时回到 Long Term
watch(
  () => form.timeframe,
  (timeframe) => {
    if (timeframe !== 'Daily' && activeResultTab.value === 'shortTerm') activeResultTab.value = 'longTerm'
  },
)

watch(
  () => [form.startDate, form.endDate],
  () => {
    updateBarsFromDates()
  },
)

watch(
  () => [form.symbol, form.startDate, form.endDate, form.barsNum],
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

      <nav class="progress-track" aria-label="CPM setup progress">
        <template v-for="step in workflowTabs" :key="step.id">
          <div v-if="step.id !== 1" class="progress-line" :class="activeStep >= step.id && 'progress-line--active'" aria-hidden="true" />
          <button
            class="progress-step"
            :class="[activeStep > step.id && 'progress-step--complete', activeStep === step.id && 'progress-step--selected']"
            type="button"
            :aria-current="activeStep === step.id ? 'step' : undefined"
            @click="goToStep(step.id)"
          >
            <span>{{ step.id }}</span><strong>{{ step.label }}</strong>
          </button>
        </template>
      </nav>
    </section>

    <section ref="selectPatternElement" class="mt-3 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)]">
      <!-- 与下方 Match & Backtest Settings 共用同一套 xl 三列网格（同 gap-x-8、同 p-4）：
           左栏跨前两列，放标题、切换按钮和两行字段（行高随内容，label 紧贴输入框）；
           右栏（第三列）从卡片顶部起放预览图和按钮，整列高度上下对齐。
           窄屏时退回单列，预览排在字段之后。 -->
      <div class="grid gap-y-3 p-4 xl:grid-cols-3 xl:gap-x-8">
        <div class="min-w-0 xl:col-span-2">
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

          <!-- 左栏内部两列等宽，正好复现外层网格的前两列，字段框与下方 Settings 逐列对齐 -->
          <div class="mt-3 grid gap-x-8 gap-y-3 xl:grid-cols-2">
            <label class="grid content-start gap-1 text-xs font-bold text-[var(--app-text-muted)]">
              Symbol
              <SearchSelect
                v-model="form.symbol"
                :options="symbolSearchOptions"
                placeholder="Search symbol"
                aria-label="Search pattern symbol"
                @select="normalizeSymbol"
              />
            </label>
            <label
              v-if="form.patternSource === 'Historical Pattern'"
              class="grid content-start gap-1 text-xs font-bold text-[var(--app-text-muted)]"
            >
              Date Range
              <span class="flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1">
                <input v-model="form.startDate" type="date" class="h-9 min-w-28 flex-1 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2 text-sm font-semibold text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]" />
                <span class="text-xs font-semibold text-[var(--app-text-muted)]">to</span>
                <input v-model="form.endDate" type="date" class="h-9 min-w-28 flex-1 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2 text-sm font-semibold text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]" />
              </span>
            </label>
            <div
              v-else
              class="grid content-start gap-1 text-xs font-bold text-[var(--app-text-muted)]"
            >
              Common Pattern
              <details ref="commonPatternMenu" class="group relative min-w-0 text-sm font-semibold text-[var(--app-text)]">
                <summary class="flex h-9 cursor-pointer list-none items-center justify-between rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 outline-none hover:border-[var(--app-primary)] focus-visible:border-[var(--app-primary)] [&::-webkit-details-marker]:hidden">
                  <span>{{ selectedCommonPattern?.label ?? 'Select pattern' }}</span>
                  <span class="ml-2 text-[10px] text-[var(--app-text-muted)] transition group-open:rotate-180">▼</span>
                </summary>
                <div class="absolute left-0 top-[calc(100%+0.25rem)] z-30 w-full min-w-56 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-1 shadow-xl">
                  <button
                    v-for="option in commonPatternOptions"
                    :key="option.value"
                    class="group/option relative flex w-full items-center rounded px-2.5 py-2 text-left text-sm font-semibold text-[var(--app-text)] hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)] focus:bg-[var(--app-primary-soft)] focus:text-[var(--app-primary)] focus:outline-none"
                    :class="option.value === form.selectPattern ? 'bg-[var(--app-surface-soft)]' : ''"
                    type="button"
                    @click="selectCommonPattern(option.value)"
                  >
                    {{ option.label }}
                    <span class="pointer-events-none absolute left-[calc(100%+0.5rem)] top-1/2 hidden w-64 -translate-y-1/2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-xl group-hover/option:block group-focus/option:block">
                      <img :src="option.thumbnail" :alt="`${option.label} thumbnail`" class="h-36 w-full object-contain" />
                    </span>
                  </button>
                </div>
              </details>
            </div>
            <label class="grid content-start gap-1 text-xs font-bold text-[var(--app-text-muted)]">
              Timeframe
              <select v-model="form.timeframe" class="h-9 min-w-0 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm font-semibold text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]">
                <option v-for="option in timeframeOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </label>
            <div v-if="form.patternSource === 'Historical Pattern'" class="grid content-start gap-1 text-xs font-bold text-[var(--app-text-muted)]">
              Number of Bars
              <span class="flex h-9 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-2.5 text-sm font-extrabold text-[var(--app-text)]">
                {{ form.barsNum || '-' }}
              </span>
            </div>
          </div>
        </div>

        <aside class="flex flex-col gap-3 border-t border-[var(--app-border-muted)] pt-3 xl:col-start-3 xl:row-start-1 xl:border-t-0 xl:pt-0">
          <div>
            <div class="mb-1 text-xs font-normal uppercase tracking-wide text-[var(--app-text-muted)]">{{ patternPreviewTitle }}</div>
            <div class="flex h-[220px] items-center justify-center rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] p-2">
              <img
                v-if="form.patternSource === 'Common Pattern' && selectedCommonPattern"
                :src="selectedCommonPattern.image"
                :alt="`${selectedCommonPattern.label} pattern`"
                class="max-h-[204px] w-full object-contain"
              />
              <CpmPatternPreviewChart v-else class="w-full" :points="normalizedPreviewPoints" value-mode="normalized" :height="160" />
            </div>
          </div>

          <button class="mt-auto inline-flex h-10 w-full items-center justify-center rounded-md bg-[var(--app-primary)] px-4 text-sm font-extrabold text-white shadow-sm hover:bg-[var(--app-primary-hover)]" type="button" @click="useThisPattern">
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

      <div v-if="backtestLoading" class="mt-4">
        <div class="h-3 w-full overflow-hidden rounded-full bg-[var(--app-surface-soft)]">
          <div class="h-full rounded-full bg-[var(--app-primary)] transition-all duration-300" :style="{ width: `${backtestProgress}%` }" />
        </div>
        <p v-if="backtestTips" class="mt-2 text-xs font-semibold text-[var(--app-text-muted)]">{{ backtestTips }}</p>
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

    <section ref="resultsElement" class="mt-3 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)]">
      <div class="grid gap-0 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <div class="border-b border-[var(--app-border)] p-4 xl:border-b-0 xl:border-r xl:pr-3">
          <div class="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 class="text-xl font-black text-[var(--app-text)]">Backtest Results</h3>
              <p class="mt-1 text-sm text-[var(--app-text-muted)]">{{ resultSubtitle }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button class="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--app-border)] px-2.5 text-xs font-extrabold text-[var(--app-text-secondary)] hover:text-[var(--app-primary)] disabled:cursor-not-allowed disabled:opacity-50" type="button" :disabled="!exportTable.rows.length" @click="downloadResults">
                <Download :size="14" />
                Download
              </button>
              <button class="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--app-border)] px-2.5 text-xs font-extrabold text-[var(--app-text-secondary)] hover:text-[var(--app-primary)]" type="button" @click="printWorkspace">
                <Camera :size="14" />
                Screenshot
              </button>
            </div>
          </div>

          <div class="grid gap-3 lg:grid-rows-3">
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
        </div>

        <div class="p-4 xl:pl-3">
          <h3 class="text-xl font-black text-[var(--app-text)]">Chart</h3>
          <!-- ChartIQ 自带边框，外层不再加 border，避免双重边框 -->
          <div class="mt-3">
            <CpmPatternChartIQ
              :symbol="form.symbol"
              :timeframe="form.timeframe"
              :start-date="form.startDate"
              :end-date="form.endDate"
              :chart-data="backtestResult ? backtestResult.data : null"
              :preview-result="previewChartResult"
              :loading="backtestLoading || detailLoading || previewLoading"
              @bar-distance="onBarDistance"
              @chart-quotes="onChartQuotes"
            />
          </div>
        </div>
      </div>

      <div class="border-t border-[var(--app-border)] p-4">
        <div class="overflow-hidden rounded-md border border-[var(--app-border-muted)]">
            <div class="flex min-w-0 overflow-x-auto border-b border-[var(--app-border-muted)] bg-[var(--app-surface)] px-2">
              <button
                v-for="tab in visibleResultTabs"
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
              <!-- Backtest Statistics / Correlation Info：原有逐笔表格 -->
              <template v-if="activeResultTab === 'statistics' || activeResultTab === 'correlation'">
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
              </template>

              <!-- Multi-Timeframe Results (Long Term) / (Short Term)：Vue2 tim.vue 两张表 -->
              <template v-else-if="activeResultTab === 'longTerm' || activeResultTab === 'shortTerm'">
                <template v-if="activeTimeframeReport">
                  <p class="mb-3 text-xs leading-5 text-[var(--app-text-secondary)]">
                    The results below provide a multiple timeframe view of the backtest of the indicator and index that you have chosen.
                    The 'observation period' selected for the backtest is not used for the results below. Instead, we provide a look at
                    various time-frames from 1-Week to 1-Year of returns.
                  </p>
                  <AppDataTable
                    :columns="timeframeStatsColumns"
                    :rows="activeTimeframeReport.statsRows"
                    :hide-header="true"
                    empty-message="No timeframe statistics"
                  />
                  <div class="mt-3">
                    <AppDataTable
                      :columns="timeframeHistoryColumns"
                      :rows="activeTimeframeReport.historyRows"
                      empty-message="No timeframe history"
                    />
                  </div>
                </template>
                <div v-else class="h-48 rounded-md border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface)] px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
                  {{ detailLoading || backtestLoading ? 'Loading result...' : 'No rows returned for this result tab' }}
                </div>
              </template>

              <!-- Max Gain and Loss：Vue2 MaxMin.vue 双层表头表格 -->
              <template v-else-if="activeResultTab === 'maxGainLoss'">
                <div v-if="maxGainLossRows.length" class="overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)]">
                  <div class="overflow-x-auto">
                    <table class="min-w-full border-collapse text-[0.8125rem] text-[var(--app-text)]">
                      <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold text-[var(--app-text)]">
                        <tr class="border-b border-[var(--app-border)]">
                          <th rowspan="2" class="box-border px-3 py-2.5 text-center" style="min-width: 150px">
                            Dates of {{ tradeDates.length }} Signals
                          </th>
                          <th
                            v-for="label in maxGainLossPeriodLabels"
                            :key="label"
                            colspan="2"
                            class="box-border border-l border-[var(--app-border)] px-3 py-2.5 text-center"
                          >
                            {{ label.replace('[%]', 'Later [%]') }}
                          </th>
                        </tr>
                        <tr class="border-b border-[var(--app-border)]">
                          <template v-for="label in maxGainLossPeriodLabels" :key="`${label}-header`">
                            <th class="box-border border-l border-[var(--app-border)] px-2 py-2.5 text-center text-[var(--app-negative)]" style="min-width: 80px">Max Loss</th>
                            <th class="box-border px-2 py-2.5 text-center" style="min-width: 80px">Max Gain</th>
                          </template>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="(row, index) in maxGainLossRows"
                          :key="String(row.id ?? index)"
                          class="border-b border-[var(--app-border-muted)] odd:bg-[var(--app-surface)] even:bg-[var(--app-row-even)] last:border-b-0 hover:bg-[var(--app-surface-hover)]"
                          :class="index === maxGainLossMeanIndex ? 'border-t-2 border-t-[var(--app-border-strong)]' : ''"
                        >
                          <td class="box-border px-3 py-2.5 text-center font-semibold">{{ formatMaxMinCell(row['Dates of Signals']) }}</td>
                          <template v-for="label in maxGainLossPeriodLabels" :key="`${label}-cell`">
                            <td class="box-border border-l border-[var(--app-border-muted)] px-2 py-2.5 text-center font-semibold text-[var(--app-negative)]">
                              {{ formatMaxMinCell(nestedMaxMin(row, label, 'Max Loss')) }}
                            </td>
                            <td class="box-border px-2 py-2.5 text-center font-semibold">
                              {{ formatMaxMinCell(nestedMaxMin(row, label, 'Max Gain')) }}
                            </td>
                          </template>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div v-else class="h-48 rounded-md border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface)] px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
                  {{ detailLoading || backtestLoading ? 'Loading result...' : 'No rows returned for this result tab' }}
                </div>
              </template>
            </div>
          </div>
        </div>

    </section>
  </div>
</template>

<style scoped>
.progress-track { display: flex; align-items: center; padding: 12px 16px; border-top: 1px solid var(--app-border); }
.progress-step { display: flex; flex: none; align-items: center; gap: 8px; border-radius: 6px; padding: 3px 5px; color: var(--app-text-muted); font-size: .76rem; transition: background-color .15s ease, color .15s ease; }
.progress-step:hover { background: var(--app-surface-soft); color: var(--app-text); }
.progress-step span { display: flex; width: 27px; height: 27px; align-items: center; justify-content: center; border-radius: 9999px; background: var(--app-surface-muted); font-weight: 900; }
.progress-step--complete { color: var(--app-primary); }
.progress-step--complete span { background: var(--app-primary); color: white; }
.progress-step--selected { color: var(--app-text); }
.progress-step--selected span { background: var(--app-primary); color: white; }
.progress-line { height: 1px; flex: 1; margin: 0 11px; background: var(--app-border-strong); }
.progress-line--active { background: var(--app-primary); }
@media (max-width: 700px) { .progress-step strong { display: none; } }
</style>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  Eye,
  Info,
  LoaderCircle,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wand2,
  X,
} from '@lucide/vue'
import {
  deleteStrategyBasket,
  fetchAutoStrategyBaskets,
  fetchStrategyBasketRecords,
  fetchStrategyBasketRunResult,
  runStrategyBasket,
  updateStrategyBasket,
} from '@/entities/strategy/api/strategy.api'
import {
  normalizeStrategyBasketRunResult,
  strategyBasketSubmitPayload,
  type StrategyBasketAllocation,
  type StrategyBasketAutoCandidate,
  type StrategyBasketMode,
  type StrategyBasketRecord,
  type StrategyBasketRunResult,
  type StrategyBasketStrategyDetail,
} from '@/entities/strategy/model/strategy.basket'
import {
  formatStrategyInteger,
  formatStrategyNumber,
  formatStrategyPercent,
} from '@/entities/strategy/model/strategy.adapter'
import type { StrategySignalRow } from '@/entities/strategy/model/strategy.types'
import IndicatorPagination from '@/pages/indicators/ui/IndicatorPagination.vue'
import ImageLightboxGrid, { type ImageLightboxGridItem } from '@/shared/ui/ImageLightboxGrid.vue'

interface DraftAllocationRow {
  id: string
  strategy: string
  url: string
  category: string
  percent: string
}

interface AutoFilterState {
  enabled: boolean
  min: string
  max: string
}

type StrategyBasketWorkspaceTab = 'saved' | 'build'
type StrategyBasketBuilderMode = 'build' | 'view' | 'edit'

const allocationColors = ['#0b74ff', '#10bfa1', '#8b5cf6', '#f59e0b', '#64748b']

const props = defineProps<{
  signals: StrategySignalRow[]
}>()

const records = ref<StrategyBasketRecord[]>([])
const totalRecords = ref(0)
const page = ref(1)
const searchQuery = ref('')
const listLoading = ref(false)
const actionLoadingUrl = ref('')
const selectedRecord = ref<StrategyBasketRecord | null>(null)
const builderMode = ref<StrategyBasketBuilderMode>('build')
const runResult = ref<StrategyBasketRunResult | null>(null)
const resultLoading = ref(false)
const running = ref(false)
const progress = ref(0)
const notice = ref('')
const candidates = ref<StrategyBasketAutoCandidate[]>([])
const findingCandidates = ref(false)
const activeBasketTab = ref<StrategyBasketWorkspaceTab>('saved')
const activeBasketResultTab = ref('summary')
const isBuilderCollapsed = ref(false)
const expandedRecordIds = ref(new Set<string>())
const hoveredAllocationRecord = ref<StrategyBasketRecord | null>(null)
const allocationPopoverPosition = ref({ left: 12, top: 12 })
const abortController = new AbortController()
let rowId = 0
let allocationPopoverHideTimer: number | null = null

const draft = reactive({
  name: 'my basket',
  startDate: yearsAgoText(10),
  endDate: todayText(),
  cash: '1000000',
  mode: 'manual' as StrategyBasketMode,
})

const autoFilters = reactive<Record<'cagr' | 'winRate' | 'ytdReturn' | 'maxDrawdown', AutoFilterState>>({
  cagr: { enabled: true, min: '5', max: '15' },
  winRate: { enabled: true, min: '50', max: '70' },
  ytdReturn: { enabled: true, min: '0', max: '15' },
  maxDrawdown: { enabled: true, min: '20', max: '50' },
})

const allocationRows = ref<DraftAllocationRow[]>([createDraftRow()])

const strategyOptions = computed(() =>
  props.signals
    .map((row) => ({
      label: row.modelName,
      url: row.url,
      category: row.category,
    }))
    .sort((left, right) => left.label.localeCompare(right.label)),
)

const strategyLookup = computed(() => {
  const lookup = new Map<string, StrategySignalRow>()
  for (const row of props.signals) {
    lookup.set(row.modelName.toLowerCase(), row)
    lookup.set(row.url.toLowerCase(), row)
    lookup.set(strategyLookupKey(row.modelName), row)
    lookup.set(strategyLookupKey(row.url), row)
  }
  return lookup
})

const selectedAllocations = computed<StrategyBasketAllocation[]>(() =>
  allocationRows.value
    .map((row) => draftRowToAllocation(row))
    .filter((row) => row.strategy && row.strategy !== '—' && row.percent !== null),
)

const strategyWeight = computed(() =>
  selectedAllocations.value.reduce((sum, row) => sum + (row.percent ?? 0), 0),
)

const cashWeight = computed(() => Math.max(0, 100 - strategyWeight.value))

const validationErrors = computed(() => {
  const errors: string[] = []
  const name = draft.name.trim()
  const cash = numberFrom(draft.cash)
  const seen = new Set<string>()

  if (!name) errors.push('Enter a basket name.')
  if (!draft.startDate) errors.push('Select a start date.')
  if (!draft.endDate) errors.push('Select an end date.')
  if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) errors.push('Start date must be before end date.')
  if (cash === null || cash < 1000) errors.push('Starting capital must be at least 1,000.')
  if (!selectedAllocations.value.length) errors.push('Add at least one strategy.')

  for (const row of allocationRows.value) {
    const strategyText = row.strategy.trim()
    if (!strategyText || strategyText === '—') continue
    const matched = findStrategy(row.strategy, row.url)
    const percent = numberFrom(row.percent)
    if (!matched) errors.push(`Choose "${row.strategy}" from the strategy list.`)
    if (percent === null || percent <= 0 || percent > 100) errors.push(`Enter a valid weight for ${row.strategy}.`)

    const duplicateKey = (matched?.url || row.strategy).toLowerCase()
    if (seen.has(duplicateKey)) errors.push(`Duplicate strategy: ${matched?.modelName ?? row.strategy}.`)
    seen.add(duplicateKey)
  }

  if (strategyWeight.value > 100) errors.push('Total strategy weight cannot exceed 100%.')
  return Array.from(new Set(errors))
})

const canRun = computed(() => !running.value && validationErrors.value.length === 0)
const runDisabledReason = computed(() => validationErrors.value[0] ?? '')

const builderHeaderText = computed(() => {
  if (builderMode.value === 'view' && selectedRecord.value) return `Viewing: ${selectedRecord.value.name}`
  if (selectedRecord.value) return `Editing: ${selectedRecord.value.name}`
  return 'Create a basket from manual or auto strategy selection.'
})

const basketDisplayName = computed(() =>
  (runResult.value?.record?.name ?? selectedRecord.value?.name ?? draft.name.trim()) || 'my basket',
)

const builderDateRange = computed(() =>
  `${formatDisplayDate(draft.startDate)} - ${formatDisplayDate(draft.endDate)}`,
)

const builderCapitalText = computed(() => {
  const cash = numberFrom(draft.cash)
  return cash === null ? 'Starting capital —' : `Starting capital ${formatCurrency(cash)}`
})

const builderModeText = computed(() => (draft.mode === 'auto' ? 'Auto Basket' : 'Manual'))

const basketPageCount = computed(() => Math.max(1, Math.ceil(totalRecords.value / 10)))

const allocationPopoverStyle = computed(() => ({
  left: `${allocationPopoverPosition.value.left}px`,
  top: `${allocationPopoverPosition.value.top}px`,
}))

const allocationSummaryRows = computed(() =>
  selectedAllocations.value.map((allocation, index) => ({
    ...allocation,
    color: allocationColors[index % allocationColors.length],
    percentValue: allocation.percent ?? 0,
  })),
)

const allocationTotal = computed(() => strategyWeight.value + cashWeight.value)

const isAllocationBalanced = computed(() => strategyWeight.value <= 100)

const allocationStatusMessage = computed(() => {
  if (strategyWeight.value > 100) return 'Reduce strategy weights to 100% or less.'
  return ''
})

const summaryStatisticsRows = computed(() => {
  const metrics = runResult.value?.metrics ?? {}
  return [
    { label: 'Strategy CAGR', value: percentMetric(metrics.CAGR), tone: toneClass(numberFrom(metrics.CAGR)) },
    { label: 'Benchmark CAGR', value: percentMetric(metrics.benchmark_CAGR), tone: toneClass(numberFrom(metrics.benchmark_CAGR)) },
    { label: 'Max Drawdown', value: percentMetric(metrics.max_risk), tone: 'text-[var(--app-negative)]' },
    { label: 'Expectancy', value: formatStrategyNumber(numberFrom(metrics.Expectancy_val ?? metrics.Expectancy), 2), tone: 'text-[var(--app-text)]' },
    { label: 'Sharpe Ratio', value: formatStrategyNumber(numberFrom(metrics.sharp_ratio), 2), tone: 'text-[var(--app-text)]' },
    { label: 'Profit/Loss Ratio', value: formatStrategyNumber(numberFrom(metrics.profit_loss_ratio), 2), tone: 'text-[var(--app-text)]' },
    { label: 'Average Win', value: percentMetric(metrics.avg_win), tone: toneClass(numberFrom(metrics.avg_win)) },
    { label: 'Average Loss', value: percentMetric(metrics.avg_loss), tone: toneClass(numberFrom(metrics.avg_loss)) },
    { label: 'Total Trades', value: formatStrategyInteger(numberFrom(metrics.total_trades)), tone: 'text-[var(--app-text)]' },
    { label: 'Trades Per Year', value: formatStrategyNumber(numberFrom(metrics.trades_per_year), 2), tone: 'text-[var(--app-text)]' },
  ]
})

const portfolioSummaryRows = computed(() => {
  const metrics = runResult.value?.metrics ?? {}
  return [
    { label: 'Total Assets', value: formatSummaryNumber(metrics.total_assets), tone: toneClass(numberFrom(metrics.total_assets)) },
    { label: 'Float Profit', value: formatSummaryNumber(metrics.float_profit), tone: toneClass(numberFrom(metrics.float_profit)) },
    { label: 'Total Return %', value: percentMetric(metrics.total_return), tone: toneClass(numberFrom(metrics.total_return)) },
    { label: 'Cash', value: formatSummaryNumber(metrics.cash), tone: toneClass(numberFrom(metrics.cash)) },
    { label: 'Market Value', value: formatSummaryNumber(metrics.market_value), tone: toneClass(numberFrom(metrics.market_value)) },
    { label: 'Win Rate %', value: percentMetric(metrics.winrate), tone: toneClass(numberFrom(metrics.winrate)) },
  ]
})

const holdingRows = computed(() => runResult.value?.holdings ?? [])
const strategyDetailRows = computed(() => runResult.value?.strategyDetails ?? [])
const basketResultTabs = computed(() => [
  { id: 'summary', label: 'Summary' },
  ...strategyDetailRows.value.map((detail, index) => ({
    id: strategyDetailTabId(detail, index),
    label: strategyDetailLabel(detail),
  })),
])
const activeStrategyDetail = computed(() =>
  strategyDetailRows.value.find((detail, index) => strategyDetailTabId(detail, index) === activeBasketResultTab.value)
  ?? null,
)
const activeStrategyPerformanceRows = computed(() =>
  activeStrategyDetail.value ? historicalPerformanceRows(activeStrategyDetail.value) : [],
)
const activeTransactionImages = computed(() =>
  activeStrategyDetail.value ? strategyTransactionImages(activeStrategyDetail.value) : [],
)
const activePerformanceImages = computed(() =>
  activeStrategyDetail.value ? strategyPerformanceImages(activeStrategyDetail.value) : [],
)

watch(
  () => runResult.value,
  () => {
    activeBasketResultTab.value = 'summary'
  },
)

watch(
  () => basketResultTabs.value.map((tab) => tab.id).join('|'),
  () => {
    if (!basketResultTabs.value.some((tab) => tab.id === activeBasketResultTab.value)) {
      activeBasketResultTab.value = 'summary'
    }
  },
)

function strategyDetailTabId(detail: StrategyBasketStrategyDetail, index: number) {
  return `${detail.id || detail.model || detail.modelName || 'strategy'}-${index}`
}

function strategyDetailLabel(detail: StrategyBasketStrategyDetail) {
  return detail.modelName || detail.model || (detail.symbolNotLong === 'CASH' ? 'Model' : `Model - ${detail.symbolNotLong}`)
}

const holdingColumns = [
  'Symbol',
  'Entry Price',
  'Current Price',
  'Shares',
  'Profit',
  'Market Value',
  'Total position(%)',
  'Strategy',
]

function todayText() {
  return new Date().toISOString().slice(0, 10)
}

function formatDisplayDate(value: string) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function yearsAgoText(years: number) {
  const date = new Date()
  date.setFullYear(date.getFullYear() - years)
  return date.toISOString().slice(0, 10)
}

function numberFrom(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(String(value).replace(/,/g, ''))
  return Number.isFinite(numeric) ? numeric : null
}

function textFrom(value: unknown) {
  return String(value ?? '').trim()
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function createDraftRow(allocation?: Partial<DraftAllocationRow>): DraftAllocationRow {
  rowId += 1
  return {
    id: `basket-row-${rowId}`,
    strategy: allocation?.strategy ?? '',
    url: allocation?.url ?? '',
    category: allocation?.category ?? '',
    percent: allocation?.percent ?? '',
  }
}

function findStrategy(name: string, url = '') {
  const normalizedName = name.trim().toLowerCase()
  const normalizedUrl = url.trim().toLowerCase()
  return strategyLookup.value.get(normalizedName)
    ?? strategyLookup.value.get(normalizedUrl)
    ?? strategyLookup.value.get(strategyLookupKey(name))
    ?? strategyLookup.value.get(strategyLookupKey(url))
    ?? null
}

function strategyLookupKey(value: string) {
  return value.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function draftRowToAllocation(row: DraftAllocationRow): StrategyBasketAllocation {
  const matched = findStrategy(row.strategy, row.url)
  return {
    id: row.id,
    strategy: matched?.modelName ?? row.strategy.trim(),
    modelName: matched?.modelName ?? row.strategy.trim(),
    url: matched?.url ?? row.url,
    model: 'CASH',
    category: matched?.category ?? row.category,
    percent: numberFrom(row.percent),
  }
}

function rowFromAllocation(allocation: StrategyBasketAllocation): DraftAllocationRow {
  const matched = findStrategy(allocation.modelName || allocation.strategy, allocation.url)
  return createDraftRow({
    strategy: matched?.modelName ?? allocation.modelName ?? allocation.strategy,
    url: matched?.url ?? allocation.url,
    category: matched?.category ?? allocation.category,
    percent: allocation.percent === null ? '' : String(allocation.percent),
  })
}

function setNotice(message: string) {
  notice.value = message
}

function clearNotice() {
  notice.value = ''
}

function reloadBasketRecords() {
  page.value = 1
  void loadRecords()
}

function syncStrategyRow(row: DraftAllocationRow) {
  const matched = findStrategy(row.strategy, row.url)
  if (!matched) return
  row.strategy = matched.modelName
  row.url = matched.url
  row.category = matched.category
}

function addStrategyRow() {
  if (allocationRows.value.length >= 5) {
    setNotice('Up to 5 strategies can be added.')
    return
  }
  allocationRows.value.push(createDraftRow())
}

function removeStrategyRow(index: number) {
  allocationRows.value.splice(index, 1)
  if (!allocationRows.value.length) allocationRows.value.push(createDraftRow())
}

function resetBuilder() {
  selectedRecord.value = null
  builderMode.value = 'build'
  runResult.value = null
  isBuilderCollapsed.value = false
  draft.name = 'my basket'
  draft.startDate = yearsAgoText(10)
  draft.endDate = todayText()
  draft.cash = '1000000'
  draft.mode = 'manual'
  allocationRows.value = [createDraftRow()]
  candidates.value = []
  progress.value = 0
  clearNotice()
}

function loadRecordIntoBuilder(record: StrategyBasketRecord) {
  selectedRecord.value = record
  draft.name = record.name
  draft.startDate = record.startDate
  draft.endDate = record.endDate
  draft.cash = record.cash === null ? '1000000' : String(record.cash)
  draft.mode = 'manual'
  allocationRows.value = record.strategyCombination.length
    ? record.strategyCombination.map(rowFromAllocation)
    : [createDraftRow()]
  candidates.value = []
}

function startNewBasket() {
  activeBasketTab.value = 'build'
  resetBuilder()
}

function editRecord(record: StrategyBasketRecord) {
  activeBasketTab.value = 'build'
  actionLoadingUrl.value = record.url
  builderMode.value = 'edit'
  isBuilderCollapsed.value = false
  loadRecordIntoBuilder(record)
  runResult.value = null
  clearNotice()
  void loadRunResult(record)
}

function applyCandidate(candidate: StrategyBasketAutoCandidate) {
  allocationRows.value = candidate.allocations.length
    ? candidate.allocations.map(rowFromAllocation)
    : [createDraftRow()]
  setNotice(`${candidate.label} applied to the allocation list.`)
}

function autoRange(filter: AutoFilterState) {
  return filter.enabled ? `${filter.min}-${filter.max}` : ''
}

async function findCandidates() {
  const hasEnabledFilter = Object.values(autoFilters).some((filter) => filter.enabled)
  if (!hasEnabledFilter) {
    setNotice('Select at least one Auto Basket condition.')
    return
  }

  findingCandidates.value = true
  clearNotice()
  try {
    candidates.value = await fetchAutoStrategyBaskets(
      {
        returnRange: autoRange(autoFilters.ytdReturn),
        mddRange: autoRange(autoFilters.maxDrawdown),
        winRateRange: autoRange(autoFilters.winRate),
        cagrRange: autoRange(autoFilters.cagr),
        signals: props.signals,
      },
      abortController.signal,
    )
    if (!candidates.value.length) setNotice('No matching baskets found.')
  } finally {
    findingCandidates.value = false
  }
}

async function loadRecords() {
  listLoading.value = true
  try {
    const result = await fetchStrategyBasketRecords(
      {
        page: page.value,
        name: searchQuery.value,
        signals: props.signals,
      },
      abortController.signal,
    )
    records.value = result.records
    totalRecords.value = result.count
  } finally {
    listLoading.value = false
  }
}

async function viewRecord(record: StrategyBasketRecord) {
  activeBasketTab.value = 'build'
  actionLoadingUrl.value = record.url
  builderMode.value = 'view'
  isBuilderCollapsed.value = true
  loadRecordIntoBuilder(record)
  clearNotice()
  await loadRunResult(record)
}

async function loadRunResult(record: StrategyBasketRecord) {
  resultLoading.value = true
  try {
    const result = await fetchStrategyBasketRunResult(
      record.url,
      {
        signals: props.signals,
        fallbackRecord: record,
      },
      abortController.signal,
    )
    runResult.value = result
    if (result.code === 203 || result.status === 'Running') setNotice('Basket is still running. Results are not ready yet.')
    else if (result.code !== 200) setNotice('Basket details are unavailable.')
  } finally {
    resultLoading.value = false
    actionLoadingUrl.value = ''
  }
}

async function deleteRecord(record: StrategyBasketRecord) {
  if (!window.confirm(`Delete "${record.name}"?`)) return
  actionLoadingUrl.value = record.url
  try {
    const result = await deleteStrategyBasket(record.url, abortController.signal)
    if (result.code === 204 || result.code === 200) {
      setNotice('Basket deleted.')
      await loadRecords()
      if (selectedRecord.value?.url === record.url) resetBuilder()
    } else {
      setNotice(result.message || 'Delete failed.')
    }
  } finally {
    actionLoadingUrl.value = ''
  }
}

async function runBasket() {
  if (!canRun.value) {
    setNotice(validationErrors.value[0] ?? 'Please review the basket settings.')
    return
  }

  running.value = true
  progress.value = 8
  clearNotice()

  const payload = strategyBasketSubmitPayload({
    name: draft.name.trim(),
    startDate: draft.startDate,
    endDate: draft.endDate,
    cash: draft.cash,
    allocations: selectedAllocations.value,
    auto: draft.mode === 'auto',
  })

  try {
    const saveResult = selectedRecord.value?.url
      ? await updateStrategyBasket(selectedRecord.value.url, payload, abortController.signal)
      : await runStrategyBasket(payload, abortController.signal)

    if (!saveResult.code || [400, 401, 403, 404, 406, 407, 443, 444, 445, 446, 500].includes(saveResult.code)) {
      setNotice(saveResult.message || 'Basket run failed. Please adjust the inputs and try again.')
      return
    }

    const saveData = saveResult.data && typeof saveResult.data === 'object'
      ? (saveResult.data as Record<string, unknown>)
      : {}
    const url = textFrom(saveData.url) || selectedRecord.value?.url || ''

    if (saveResult.code === 200 && !url) {
      runResult.value = normalizeStrategyBasketRunResult(saveResult.raw, props.signals, selectedRecord.value)
      progress.value = 100
      isBuilderCollapsed.value = true
      await loadRecords()
      return
    }

    if (!url) {
      setNotice('Basket saved, but no result URL was returned.')
      await loadRecords()
      return
    }

    selectedRecord.value = selectedRecord.value ? { ...selectedRecord.value, url } : selectedRecord.value
    await pollBasketResult(url)
  } finally {
    running.value = false
    progress.value = 0
  }
}

async function pollBasketResult(url: string) {
  for (let attempt = 0; attempt < 70; attempt += 1) {
    progress.value = Math.min(98, Math.max(progress.value, 12 + attempt))
    const result = await fetchStrategyBasketRunResult(
      url,
      {
        signals: props.signals,
        fallbackRecord: selectedRecord.value,
      },
      abortController.signal,
    )

    if (result.code === 200) {
      runResult.value = result
      selectedRecord.value = result.record ?? selectedRecord.value
      progress.value = 100
      isBuilderCollapsed.value = true
      setNotice('Basket completed successfully.')
      await loadRecords()
      return
    }

    if ([401, 403, 404, 407, 443, 444, 445, 446, 500].includes(result.code ?? 0)) {
      setNotice('Basket failed. Adjust filters and rerun.')
      await loadRecords()
      return
    }

    await delay(1500)
  }

  setNotice('Basket is still running. Refresh the saved list later to view results.')
  await loadRecords()
}

function percentMetric(value: unknown) {
  return formatStrategyPercent(numberFrom(value))
}

function toneClass(value: number | null) {
  if (value === null) return 'text-[var(--app-text)]'
  return value < 0 ? 'text-[var(--app-negative)]' : 'text-[var(--app-positive)]'
}

function formatRecordNumber(value: number | null, suffix = '') {
  if (value === null) return '—'
  return `${formatStrategyNumber(value, 2)}${suffix}`
}

function formatCompactPercent(value: number | null) {
  if (value === null) return '—'
  return `${Number.isInteger(value) ? value : formatStrategyNumber(value, 2)}%`
}

function formatSummaryNumber(value: unknown) {
  const numeric = numberFrom(value)
  if (numeric === null) return '—'
  return formatStrategyNumber(numeric, 2)
}

function formatHistoricalValue(value: number | string | null, percent = false) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'string') return value
  const formatted = Number.isInteger(value) ? formatStrategyInteger(value) : formatStrategyNumber(value, 2)
  return percent ? `${formatted}%` : formatted
}

function historicalPerformanceRows(detail: StrategyBasketStrategyDetail) {
  return [
    { label: 'Strategy CAGR', value: formatHistoricalValue(detail.cagr, true), tone: toneClass(detail.cagr) },
    { label: 'Benchmark CAGR', value: formatHistoricalValue(detail.benchmarkCagr, true), tone: toneClass(detail.benchmarkCagr) },
    { label: 'Max Drawdown', value: formatHistoricalValue(detail.maxDrawdown, true), tone: 'text-[var(--app-negative)]' },
    { label: 'Net Profit', value: formatHistoricalValue(detail.netProfit, true), tone: toneClass(detail.netProfit) },
    { label: 'Expectancy', value: formatHistoricalValue(detail.expectancy), tone: toneClass(detail.expectancy) },
    { label: 'Sharpe Ratio', value: formatHistoricalValue(detail.sharpeRatio), tone: toneClass(detail.sharpeRatio) },
    { label: 'Information Ratio', value: formatHistoricalValue(detail.informationRatio), tone: toneClass(detail.informationRatio) },
    { label: 'Profit/Loss Ratio', value: formatHistoricalValue(detail.profitLossRatio), tone: 'text-[var(--app-text)]' },
    { label: 'Average Win', value: formatHistoricalValue(detail.averageWin, true), tone: toneClass(detail.averageWin) },
    { label: 'Average Loss', value: formatHistoricalValue(detail.averageLoss, true), tone: toneClass(detail.averageLoss) },
    { label: 'Total Trades', value: formatHistoricalValue(detail.totalTrades), tone: 'text-[var(--app-text)]' },
    { label: 'Win Rate', value: formatHistoricalValue(detail.winRate, true), tone: toneClass(detail.winRate) },
    { label: 'Trades Per Year', value: formatHistoricalValue(detail.tradesPerYear), tone: 'text-[var(--app-text)]' },
  ]
}

function strategyTransactionImages(detail: StrategyBasketStrategyDetail): ImageLightboxGridItem[] {
  if (!detail.tradeTableUrl) return []
  return [
    {
      key: `${detail.id}-transactions`,
      label: '10 Most Recent Transactions',
      url: detail.tradeTableUrl,
      alt: `${strategyDetailLabel(detail)} recent transactions`,
    },
  ]
}

function strategyPerformanceImages(detail: StrategyBasketStrategyDetail): ImageLightboxGridItem[] {
  return [
    {
      key: 'returns',
      label: 'Returns',
      description: 'Strategy returns are shown in blue and benchmark returns are shown in gray.',
      url: detail.returnsUrl,
    },
    {
      key: 'drawdown',
      label: 'Drawdown',
      description: 'Strategy drawdown versus the benchmark.',
      url: detail.drawdownUrl,
    },
    {
      key: 'heatmap',
      label: 'Return Heatmap',
      description: 'Calendar-style view of returns.',
      url: detail.heatmapUrl,
    },
    {
      key: 'annual-returns',
      label: 'Annual Returns',
      description: 'Year-by-year returns for this strategy component.',
      url: detail.annualReturnsUrl,
    },
  ].filter((item) => item.url)
}

function recordKey(record: StrategyBasketRecord) {
  return record.url || record.id
}

function isRecordExpanded(record: StrategyBasketRecord) {
  return expandedRecordIds.value.has(recordKey(record))
}

function toggleRecordExpanded(record: StrategyBasketRecord) {
  const key = recordKey(record)
  const next = new Set(expandedRecordIds.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedRecordIds.value = next
}

function allocationSummary(record: StrategyBasketRecord) {
  if (!record.strategyCombination.length) return 'No strategy allocation'
  return record.strategyCombination
    .map((allocation) => `${allocation.modelName} ${formatCompactPercent(allocation.percent)}`)
    .join(' · ')
}

function recordFoldMetrics(record: StrategyBasketRecord) {
  return [
    { label: 'Average Win %', value: formatRecordNumber(record.avgWin, '%') },
    { label: 'Average Loss %', value: formatRecordNumber(record.avgLoss, '%') },
    { label: 'Median Return %', value: formatRecordNumber(record.medianReturn, '%') },
    { label: 'Total Trades', value: formatStrategyInteger(record.totalTrades) },
    { label: 'Total Positive', value: formatStrategyInteger(record.totalPositive) },
    { label: 'Total Negative', value: formatStrategyInteger(record.totalNegative) },
  ]
}

function clearAllocationPopoverHideTimer() {
  if (allocationPopoverHideTimer === null) return
  window.clearTimeout(allocationPopoverHideTimer)
  allocationPopoverHideTimer = null
}

function showAllocationPopover(record: StrategyBasketRecord, event: MouseEvent | FocusEvent) {
  clearAllocationPopoverHideTimer()

  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) {
    hoveredAllocationRecord.value = record
    return
  }

  const rect = target.getBoundingClientRect()
  const popoverWidth = 520
  const popoverHeight = Math.min(320, 88 + record.strategyCombination.length * 36)
  const left = Math.max(12, Math.min(rect.left, window.innerWidth - popoverWidth - 12))
  const belowTop = rect.bottom + 8
  const preferredTop = belowTop + popoverHeight > window.innerHeight
    ? rect.top - popoverHeight - 8
    : belowTop

  allocationPopoverPosition.value = {
    left,
    top: Math.max(12, Math.min(preferredTop, window.innerHeight - popoverHeight - 12)),
  }
  hoveredAllocationRecord.value = record
}

function hideAllocationPopover() {
  clearAllocationPopoverHideTimer()
  hoveredAllocationRecord.value = null
}

function scheduleAllocationPopoverHide() {
  clearAllocationPopoverHideTimer()
  allocationPopoverHideTimer = window.setTimeout(() => {
    hoveredAllocationRecord.value = null
    allocationPopoverHideTimer = null
  }, 100)
}

function cellText(row: Record<string, unknown>, key: string) {
  const value = row[key]
  if (Array.isArray(value)) return value.join(', ')
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

function holdingStrategyItems(row: Record<string, unknown>) {
  const value = row.Strategy
  const items = Array.isArray(value) ? value : String(value ?? '').split(',')
  return items.map((item) => String(item).trim()).filter(Boolean)
}

function setBasketPage(nextPage: number) {
  const normalizedPage = Math.max(1, Math.min(Math.trunc(nextPage), basketPageCount.value))
  if (normalizedPage === page.value) return
  page.value = normalizedPage
  void loadRecords()
}

watch(
  () => props.signals.length,
  (count, previousCount) => {
    if (count && !previousCount) void loadRecords()
  },
)

onMounted(() => {
  void loadRecords()
  window.addEventListener('scroll', hideAllocationPopover, true)
  window.addEventListener('resize', hideAllocationPopover)
})

onBeforeUnmount(() => {
  hideAllocationPopover()
  abortController.abort()
  window.removeEventListener('scroll', hideAllocationPopover, true)
  window.removeEventListener('resize', hideAllocationPopover)
})
</script>

<template>
  <div class="pb-4">
    <div
      v-if="notice"
      class="mx-4 mb-3 mt-4 flex items-start justify-between gap-3 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-primary-soft)] px-3 py-2 text-sm text-[var(--app-text-secondary)]"
    >
      <span>{{ notice }}</span>
      <button class="text-[var(--app-text-muted)] hover:text-[var(--app-primary)]" type="button" aria-label="Dismiss message" @click="clearNotice">
        <X :size="16" />
      </button>
    </div>

    <nav class="flex min-w-0 overflow-x-auto border-b border-[var(--app-border)] px-4" aria-label="Basket workspace tabs">
      <button
        class="flex h-14 shrink-0 items-center border-b-2 px-3 text-sm font-semibold transition"
        :class="activeBasketTab === 'saved' ? 'border-[var(--app-primary)] text-[var(--app-primary)]' : 'border-transparent text-[var(--app-text)] hover:text-[var(--app-primary)]'"
        type="button"
        @click="activeBasketTab = 'saved'"
      >
        Saved Baskets
        <span class="ml-2 rounded-full bg-[var(--app-primary-soft-alt)] px-2 py-0.5 text-xs font-bold text-[var(--app-text-secondary)]">
          {{ listLoading && !totalRecords ? '...' : totalRecords }}
        </span>
      </button>
      <button
        class="flex h-14 shrink-0 items-center border-b-2 px-3 text-sm font-semibold transition"
        :class="activeBasketTab === 'build' ? 'border-[var(--app-primary)] text-[var(--app-primary)]' : 'border-transparent text-[var(--app-text)] hover:text-[var(--app-primary)]'"
        type="button"
        @click="activeBasketTab = 'build'"
      >
        Build &amp; Results
      </button>
    </nav>

    <div v-show="activeBasketTab === 'saved'">
      <div class="border-b border-[var(--app-border)] px-4 py-3">
        <div class="grid gap-2 md:grid-cols-[minmax(260px,1fr)_auto_auto]">
          <label class="flex h-9 min-w-0 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5">
              <Search :size="15" class="mr-2 shrink-0 text-[var(--app-text-muted)]" />
              <input
                v-model="searchQuery"
                class="w-full bg-transparent text-[0.8125rem] outline-none"
                placeholder="Search baskets"
                @keyup.enter="reloadBasketRecords"
              />
          </label>
          <button
            class="flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[0.8125rem] text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)]"
            type="button"
            @click="reloadBasketRecords"
          >
            <RefreshCw :size="16" :class="{ 'animate-spin': listLoading }" />
            Refresh
          </button>
          <button
            class="flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[0.8125rem] text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)]"
            type="button"
            @click="startNewBasket"
          >
            <Plus :size="16" />
            Create new Basket
          </button>
        </div>
      </div>

      <div class="px-4 pb-4 pt-4">
      <section class="overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)]">
        <div class="overflow-x-auto">
          <table class="min-w-full border-collapse text-left text-[0.8125rem]">
            <thead class="bg-[var(--app-surface-muted)] text-[0.68rem] font-semibold uppercase text-[var(--app-text-muted)]">
              <tr class="border-b border-[var(--app-border)]">
                <th class="w-10 px-2 py-2.5"></th>
                <th class="px-3 py-2.5">Name</th>
                <th class="px-3 py-2.5">Status</th>
                <th class="px-3 py-2.5 text-right">Return</th>
                <th class="px-3 py-2.5 text-right">Win Rate</th>
                <th class="px-3 py-2.5 text-right">STD. DEV</th>
                <th class="px-3 py-2.5 text-right">Max Risk</th>
                <th class="px-3 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="listLoading">
                <td colspan="8" class="h-36 px-3 py-8 text-center text-sm text-[var(--app-text-muted)]">Loading baskets...</td>
              </tr>
              <tr v-else-if="!records.length">
                <td colspan="8" class="h-36 px-3 py-8 text-center text-sm text-[var(--app-text-muted)]">No baskets found</td>
              </tr>
              <template v-else>
                <template v-for="record in records" :key="record.id">
                  <tr class="border-b border-[var(--app-border-muted)] odd:bg-[var(--app-surface)] even:bg-[var(--app-row-even)] hover:bg-[var(--app-surface-hover)]">
                    <td class="px-2 py-3 align-top">
                      <button
                        class="basket-icon-button"
                        type="button"
                        :aria-label="isRecordExpanded(record) ? 'Collapse basket details' : 'Expand basket details'"
                        @click="toggleRecordExpanded(record)"
                      >
                        <ChevronDown :size="16" class="transition-transform" :class="{ '-rotate-90': !isRecordExpanded(record) }" />
                      </button>
                    </td>
                    <td class="px-3 py-3 align-top">
                      <button class="text-left font-extrabold text-[var(--app-primary)] hover:underline" type="button" @click="viewRecord(record)">
                        {{ record.name }}
                      </button>
                      <div
                        v-if="record.strategyCombination.length"
                        class="basket-allocation-summary"
                        tabindex="0"
                        @mouseenter="showAllocationPopover(record, $event)"
                        @mouseleave="scheduleAllocationPopoverHide"
                        @focus="showAllocationPopover(record, $event)"
                        @blur="scheduleAllocationPopoverHide"
                      >
                        <span class="basket-allocation-summary__text">{{ allocationSummary(record) }}</span>
                      </div>
                    </td>
                    <td class="px-3 py-3 align-top">
                      <span class="rounded-md px-2 py-1 text-xs font-extrabold" :class="record.status === 'Finish' ? 'bg-emerald-500/10 text-[var(--app-positive)]' : 'bg-[var(--app-surface-muted)] text-[var(--app-text-secondary)]'">
                        {{ record.status }}
                      </span>
                    </td>
                    <td class="px-3 py-3 text-right align-top font-bold" :class="toneClass(record.totalReturn)">
                      {{ formatRecordNumber(record.totalReturn, '%') }}
                    </td>
                    <td class="px-3 py-3 text-right align-top font-bold">{{ formatRecordNumber(record.winRate, '%') }}</td>
                    <td class="px-3 py-3 text-right align-top font-bold">{{ formatRecordNumber(record.stdDev, '%') }}</td>
                    <td class="px-3 py-3 text-right align-top font-bold text-[var(--app-negative)]">{{ formatRecordNumber(record.maxRisk, '%') }}</td>
                    <td class="px-3 py-3 align-top">
                      <div class="flex justify-center gap-1">
                        <button class="basket-icon-button" type="button" title="View Basket Details" @click="viewRecord(record)">
                          <LoaderCircle v-if="actionLoadingUrl === record.url" :size="15" class="animate-spin" />
                          <Eye v-else :size="15" />
                        </button>
                        <button class="basket-icon-button" type="button" title="Edit Basket" @click="editRecord(record)">
                          <LoaderCircle v-if="actionLoadingUrl === record.url" :size="15" class="animate-spin" />
                          <Wand2 v-else :size="15" />
                        </button>
                        <button class="basket-icon-button text-[var(--app-negative)]" type="button" title="Delete Basket" @click="deleteRecord(record)">
                          <Trash2 :size="15" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="isRecordExpanded(record)" class="border-b border-[var(--app-border)] bg-[var(--app-surface-soft)]">
                    <td colspan="8" class="px-4 py-4">
                      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.65fr)]">
                        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          <article
                            v-for="metric in recordFoldMetrics(record)"
                            :key="metric.label"
                            class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-3"
                          >
                            <p class="text-[0.68rem] font-semibold uppercase text-[var(--app-text-muted)]">{{ metric.label }}</p>
                            <p class="mt-1 text-base font-extrabold text-[var(--app-text)]">{{ metric.value }}</p>
                          </article>
                        </div>
                        <div class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-3">
                          <h4 class="text-sm font-extrabold text-[var(--app-text)]">Strategy Combination</h4>
                          <table class="mt-2 w-full border-collapse text-left text-xs">
                            <thead class="text-[0.68rem] uppercase text-[var(--app-text-muted)]">
                              <tr>
                                <th class="py-1 pr-2">#</th>
                                <th class="py-1 pr-2">Strategies</th>
                                <th class="py-1 text-right">Weight</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(allocation, allocationIndex) in record.strategyCombination" :key="allocation.id" class="border-t border-[var(--app-border-muted)]">
                                <td class="py-1.5 pr-2">{{ allocationIndex + 1 }}</td>
                                <td class="py-1.5 pr-2 font-semibold text-[var(--app-text-secondary)]">{{ allocation.modelName }}</td>
                                <td class="py-1.5 text-right font-bold">{{ formatCompactPercent(allocation.percent) }}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
              </template>
            </tbody>
          </table>
        </div>

        <footer class="border-t border-[var(--app-border)] px-4 py-3">
          <IndicatorPagination
            :page="page"
            :page-count="basketPageCount"
            :total="totalRecords"
            item-label="baskets"
            @change="setBasketPage"
          />
        </footer>
      </section>
      </div>
    </div>

    <div v-show="activeBasketTab === 'build'" class="space-y-4 px-4 pt-4">
      <section class="basket-builder-shell" :class="{ 'basket-builder-shell--collapsed': isBuilderCollapsed }">
        <div v-if="isBuilderCollapsed" class="basket-builder-summary">
          <div class="basket-builder-summary__identity">
            <button
              class="basket-builder-toggle"
              type="button"
              aria-label="Expand basket configuration"
              :aria-expanded="false"
              @click="isBuilderCollapsed = false"
            >
              <ChevronDown :size="20" class="-rotate-90" />
            </button>
            <div class="min-w-0">
              <h3 class="text-xl font-extrabold leading-tight text-[var(--app-text)]">Basket Builder</h3>
              <p class="mt-1 text-sm text-[var(--app-text-muted)]">{{ builderHeaderText }}</p>
              <p class="basket-builder-summary__meta">
                <span>
                  <CalendarDays :size="15" />
                  {{ builderDateRange }}
                </span>
                <span class="basket-builder-summary__divider" aria-hidden="true" />
                <span>
                  <BriefcaseBusiness :size="15" />
                  {{ builderCapitalText }}
                </span>
              </p>
              <div class="basket-builder-summary__chips">
                <span>{{ builderModeText }}</span>
                <span>Cash {{ formatStrategyNumber(cashWeight, 2) }}%</span>
              </div>
            </div>
          </div>

          <div class="basket-builder-summary__allocation">
            <div class="basket-builder-summary__allocation-header">
              <h4>Strategy allocation</h4>
              <span>{{ allocationSummaryRows.length }} strategies</span>
            </div>
            <div class="basket-allocation-bar" aria-hidden="true">
              <span
                v-for="allocation in allocationSummaryRows"
                :key="allocation.id"
                :style="{ width: `${Math.max(0, allocation.percentValue)}%`, background: allocation.color }"
              />
              <span
                v-if="cashWeight > 0"
                :style="{ width: `${cashWeight}%`, background: 'var(--app-text-faint)' }"
              />
            </div>
            <div v-if="allocationSummaryRows.length" class="basket-builder-summary__legend">
              <div
                v-for="allocation in allocationSummaryRows"
                :key="allocation.id"
                class="basket-builder-summary__legend-row"
              >
                <span class="h-2.5 w-2.5 rounded-full" :style="{ background: allocation.color }" />
                <span class="min-w-0 truncate">{{ allocation.modelName }}</span>
                <strong>{{ formatCompactPercent(allocation.percent) }}</strong>
              </div>
            </div>
            <p v-else class="text-xs font-semibold text-[var(--app-text-muted)]">No strategy allocation selected.</p>
          </div>

          <div class="basket-builder-summary__actions">
            <div class="basket-run-action-row">
              <button
                class="basket-run-button"
                type="button"
                :disabled="!canRun"
                :title="runDisabledReason || undefined"
                @click="runBasket"
              >
                <LoaderCircle v-if="running" :size="18" class="animate-spin" />
                <Play v-else :size="18" fill="currentColor" />
                Run Basket
              </button>
              <p v-if="runDisabledReason" class="basket-run-warning">
                <Info :size="14" />
                <span>{{ runDisabledReason }}</span>
              </p>
            </div>
            <button class="basket-secondary-action" type="button" @click="isBuilderCollapsed = false">
              <Wand2 :size="16" />
              Edit
            </button>
          </div>

          <div v-if="running" class="basket-builder-summary__progress">
            <div class="h-2 overflow-hidden rounded-full bg-[var(--app-surface-muted)]">
              <div class="h-full rounded-full bg-[var(--app-primary)] transition-all" :style="{ width: `${progress}%` }" />
            </div>
          </div>
        </div>

        <header v-else class="basket-builder-header">
          <div class="flex min-w-0 items-start gap-3">
            <button
              class="basket-builder-toggle mt-0.5"
              type="button"
              aria-label="Collapse basket configuration"
              :aria-expanded="true"
              @click="isBuilderCollapsed = true"
            >
              <ChevronDown :size="20" />
            </button>
            <div class="min-w-0">
              <h3 class="text-xl font-extrabold leading-tight text-[var(--app-text)]">Basket Builder</h3>
              <p class="mt-1 text-sm text-[var(--app-text-muted)]">
                {{ builderHeaderText }}
              </p>
            </div>
          </div>
          <button class="basket-secondary-action" type="button" @click="startNewBasket">
            <Plus :size="17" />
            Create new Basket
          </button>
        </header>

        <div v-if="!isBuilderCollapsed" class="space-y-4 p-4">
          <section class="basket-panel">
            <h4 class="text-base font-extrabold text-[var(--app-text)]">Backtest Settings</h4>
            <div class="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_1.25fr]">
              <label class="basket-field">
                <span>Basket Name</span>
                <input v-model="draft.name" type="text" />
              </label>
              <label class="basket-field">
                <span>Start Date</span>
                <input v-model="draft.startDate" type="date" />
              </label>
              <label class="basket-field">
                <span>End Date</span>
                <input v-model="draft.endDate" type="date" />
              </label>
              <label class="basket-field">
                <span>Starting Capital</span>
                <input v-model="draft.cash" inputmode="numeric" type="text" />
              </label>
            </div>
          </section>

          <div class="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(340px,0.9fr)]">
            <section class="basket-panel">
              <header class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h4 class="text-lg font-extrabold text-[var(--app-text)]">Strategy Allocation</h4>
                  <p class="mt-1 text-sm text-[var(--app-text-muted)]">Choose strategies and assign their portfolio weights.</p>
                </div>
                <button class="basket-secondary-action" type="button" @click="addStrategyRow">
                  <Plus :size="17" />
                  Add Strategy
                </button>
              </header>

              <div class="mt-4 flex flex-wrap items-center gap-3">
                <span class="text-xs font-extrabold text-[var(--app-text-secondary)]">Allocation mode</span>
                <div class="inline-flex rounded-md border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-1">
                  <button
                    class="basket-mode-button"
                    :class="draft.mode === 'manual' ? 'basket-mode-button--active' : ''"
                    type="button"
                    @click="draft.mode = 'manual'"
                  >
                    Manual
                  </button>
                  <button
                    class="basket-mode-button"
                    :class="draft.mode === 'auto' ? 'basket-mode-button--active' : ''"
                    type="button"
                    @click="draft.mode = 'auto'"
                  >
                    Auto Basket
                  </button>
                </div>
              </div>

              <section v-if="draft.mode === 'auto'" class="mt-4 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] p-3">
                <div class="grid gap-3 lg:grid-cols-2">
                  <label
                    v-for="(filter, key) in autoFilters"
                    :key="key"
                    class="grid gap-2 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-3"
                  >
                    <span class="flex items-center gap-2 text-xs font-extrabold text-[var(--app-text)]">
                      <input v-model="filter.enabled" type="checkbox" />
                      <span>{{ key === 'cagr' ? 'CAGR' : key === 'winRate' ? 'Win Rate' : key === 'ytdReturn' ? 'YTD Return' : 'Max Drawdown' }}</span>
                    </span>
                    <span class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs text-[var(--app-text-muted)]">
                      <input v-model="filter.min" class="basket-small-input" :disabled="!filter.enabled" inputmode="decimal" type="text" />
                      <span>to</span>
                      <input v-model="filter.max" class="basket-small-input" :disabled="!filter.enabled" inputmode="decimal" type="text" />
                    </span>
                  </label>
                </div>

                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    class="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[var(--app-primary)] px-3 text-xs font-extrabold text-white transition hover:bg-[var(--app-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    :disabled="findingCandidates"
                    @click="findCandidates"
                  >
                    <LoaderCircle v-if="findingCandidates" :size="15" class="animate-spin" />
                    <Wand2 v-else :size="15" />
                    Find Matching Baskets
                  </button>
                </div>

                <div v-if="candidates.length" class="mt-3 grid gap-2 lg:grid-cols-2">
                  <article
                    v-for="candidate in candidates"
                    :key="candidate.id"
                    class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-3"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <h4 class="text-sm font-extrabold text-[var(--app-text)]">{{ candidate.label }}</h4>
                      <button class="text-xs font-extrabold text-[var(--app-primary)] hover:underline" type="button" @click="applyCandidate(candidate)">
                        Use Basket
                      </button>
                    </div>
                    <ol class="mt-2 list-decimal space-y-1 pl-4 text-xs leading-5 text-[var(--app-text-secondary)]">
                      <li v-for="allocation in candidate.allocations" :key="allocation.id">
                        {{ allocation.modelName }} <strong>{{ allocation.percent ?? '—' }}%</strong>
                      </li>
                    </ol>
                  </article>
                </div>
              </section>

              <div class="mt-4 overflow-x-auto rounded-md border border-[var(--app-border-muted)]">
                <table class="min-w-full border-collapse text-left text-[0.8125rem]">
                  <thead class="bg-[var(--app-surface-muted)] text-[0.68rem] font-semibold uppercase text-[var(--app-text-muted)]">
                    <tr>
                      <th class="px-3 py-2">Model Name</th>
                      <th class="px-3 py-2">Category</th>
                      <th class="w-36 px-3 py-2 text-right">Weight</th>
                      <th class="w-14 px-3 py-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, index) in allocationRows" :key="row.id" class="border-b border-[var(--app-border-muted)]">
                      <td class="px-3 py-2">
                        <input
                          v-model="row.strategy"
                          class="basket-table-input"
                          list="strategy-basket-options"
                          placeholder="Search strategy"
                          @change="syncStrategyRow(row)"
                          @blur="syncStrategyRow(row)"
                        />
                      </td>
                      <td class="px-3 py-2">
                        <span class="basket-category-pill">{{ row.category || '—' }}</span>
                      </td>
                      <td class="px-3 py-2">
                        <span class="basket-weight-input">
                          <input v-model="row.percent" inputmode="decimal" placeholder="0" type="text" />
                          <span>%</span>
                        </span>
                      </td>
                      <td class="px-3 py-2 text-center">
                        <button class="basket-icon-button" type="button" title="Delete row" @click="removeStrategyRow(index)">
                          <Trash2 :size="14" />
                        </button>
                      </td>
                    </tr>
                    <tr class="bg-[var(--app-surface-soft)]">
                      <td class="px-3 py-3">
                        <div class="font-extrabold text-[var(--app-text)]">Cash</div>
                        <div class="mt-0.5 text-xs text-[var(--app-text-muted)]">Remaining allocation</div>
                      </td>
                      <td class="px-3 py-3">
                        <span class="basket-category-pill">Residual</span>
                      </td>
                      <td class="px-3 py-3 text-right font-extrabold text-[var(--app-text)]">{{ formatStrategyNumber(cashWeight, 2) }}%</td>
                      <td class="px-3 py-3"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <datalist id="strategy-basket-options">
                <option v-for="option in strategyOptions" :key="option.url" :value="option.label">{{ option.category }}</option>
              </datalist>
            </section>

            <aside class="basket-panel">
              <h4 class="text-lg font-extrabold text-[var(--app-text)]">Allocation Summary</h4>

              <div class="basket-allocation-bar mt-5" aria-hidden="true">
                <span
                  v-for="allocation in allocationSummaryRows"
                  :key="allocation.id"
                  :style="{ width: `${Math.max(0, allocation.percentValue)}%`, background: allocation.color }"
                />
                <span
                  v-if="cashWeight > 0"
                  :style="{ width: `${cashWeight}%`, background: 'var(--app-text-faint)' }"
                />
              </div>

              <div v-if="allocationSummaryRows.length" class="mt-4 space-y-2">
                <div
                  v-for="allocation in allocationSummaryRows"
                  :key="allocation.id"
                  class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-sm"
                >
                  <span class="h-3 w-3 rounded-full" :style="{ background: allocation.color }" />
                  <span class="min-w-0 truncate text-[var(--app-text-secondary)]">{{ allocation.modelName }}</span>
                  <span class="font-extrabold text-[var(--app-text)]">{{ formatCompactPercent(allocation.percent) }}</span>
                </div>
              </div>
              <p v-else class="mt-4 rounded-md border border-dashed border-[var(--app-border-muted)] px-3 py-4 text-sm text-[var(--app-text-muted)]">
                Add strategies to preview the allocation.
              </p>

              <dl class="mt-5 space-y-3 border-y border-[var(--app-border-muted)] py-4 text-sm">
                <div class="flex items-center justify-between gap-3">
                  <dt class="text-[var(--app-text-muted)]">Strategies</dt>
                  <dd class="font-extrabold text-[var(--app-text)]">{{ allocationSummaryRows.length }}</dd>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <dt class="text-[var(--app-text-muted)]">Strategy allocation</dt>
                  <dd class="font-extrabold text-[var(--app-text)]">{{ formatStrategyNumber(strategyWeight, 2) }}%</dd>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <dt class="text-[var(--app-text-muted)]">Cash allocation</dt>
                  <dd class="font-extrabold text-[var(--app-text)]">{{ formatStrategyNumber(cashWeight, 2) }}%</dd>
                </div>
              </dl>

              <div class="mt-4 flex items-center justify-between gap-3">
                <span class="font-extrabold text-[var(--app-text)]">Total allocation</span>
                <span class="inline-flex items-center gap-2 font-extrabold" :class="isAllocationBalanced ? 'text-[var(--app-positive)]' : 'text-[var(--app-negative)]'">
                  <span class="basket-status-dot" :class="isAllocationBalanced ? 'basket-status-dot--ok' : 'basket-status-dot--error'">
                    <Check v-if="isAllocationBalanced" :size="14" />
                    <X v-else :size="14" />
                  </span>
                  {{ formatStrategyNumber(allocationTotal, 2) }}%
                </span>
              </div>

              <div v-if="allocationStatusMessage" class="mt-4 flex items-start gap-2 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] px-3 py-3 text-xs text-[var(--app-text-secondary)]">
                <Info :size="15" class="mt-0.5 shrink-0 text-[var(--app-primary)]" />
                <span>{{ allocationStatusMessage }}</span>
              </div>
            </aside>
          </div>

          <footer class="basket-run-footer">
            <div class="flex min-w-0 items-center gap-3">
              <span class="basket-run-footer__icon" :class="isAllocationBalanced ? 'basket-run-footer__icon--ok' : 'basket-run-footer__icon--error'">
                <Check v-if="isAllocationBalanced" :size="20" />
                <X v-else :size="20" />
              </span>
              <div class="min-w-0">
                <p class="font-extrabold" :class="isAllocationBalanced ? 'text-[var(--app-positive)]' : 'text-[var(--app-negative)]'">
                  Total allocation: {{ formatStrategyNumber(allocationTotal, 2) }}%
                </p>
                <p class="mt-0.5 flex items-center gap-1.5 text-xs" :class="runDisabledReason ? 'text-[var(--app-negative)]' : 'text-[var(--app-text-muted)]'">
                  <Info v-if="runDisabledReason" :size="13" />
                  <span>{{ runDisabledReason || 'Run the basket to calculate performance results.' }}</span>
                </p>
              </div>
            </div>
            <button
              class="basket-run-button"
              type="button"
              :disabled="!canRun"
              :title="runDisabledReason || undefined"
              @click="runBasket"
            >
              <LoaderCircle v-if="running" :size="18" class="animate-spin" />
              <Play v-else :size="18" fill="currentColor" />
              Run Basket
            </button>
          </footer>

          <div v-if="running" class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] p-3">
            <div class="h-2 overflow-hidden rounded-full bg-[var(--app-surface-muted)]">
              <div class="h-full rounded-full bg-[var(--app-primary)] transition-all" :style="{ width: `${progress}%` }" />
            </div>
            <p class="mt-2 text-xs font-semibold text-[var(--app-text-muted)]">Running basket. Please wait...</p>
          </div>
        </div>
      </section>

      <section v-if="resultLoading" class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] px-4 py-14 text-center">
        <LoaderCircle :size="24" class="mx-auto animate-spin text-[var(--app-primary)]" />
        <p class="mt-3 text-sm font-semibold text-[var(--app-text-secondary)]">Loading results...</p>
      </section>

      <section v-else-if="runResult" class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)]">
      <header class="border-b border-[var(--app-border)] p-4">
        <h3 class="text-base font-extrabold text-[var(--app-text)]">Results</h3>
        <p class="mt-1 text-sm text-[var(--app-text-muted)]">{{ basketDisplayName }}</p>
      </header>

      <nav class="basket-result-tabs" aria-label="Basket result sections">
        <button
          v-for="tab in basketResultTabs"
          :key="tab.id"
          class="basket-result-tab"
          :class="{ 'basket-result-tab--active': activeBasketResultTab === tab.id }"
          type="button"
          @click="activeBasketResultTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>

      <div class="space-y-5 p-4">
        <template v-if="activeBasketResultTab === 'summary'">
          <section>
            <h4 class="mb-2 text-sm font-extrabold text-[var(--app-text)]">Summary Statistics</h4>
            <div class="grid gap-3 md:grid-cols-3 2xl:grid-cols-5">
              <article
                v-for="metric in summaryStatisticsRows"
                :key="metric.label"
                class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] p-3"
              >
                <p class="text-xs font-semibold text-[var(--app-text-muted)]">{{ metric.label }}</p>
                <p class="mt-1 text-lg font-extrabold" :class="metric.tone">{{ metric.value }}</p>
              </article>
            </div>
          </section>

          <section>
            <h4 class="mb-2 text-sm font-extrabold text-[var(--app-text)]">Summary</h4>
            <div class="grid gap-3 md:grid-cols-3 2xl:grid-cols-6">
              <article
                v-for="metric in portfolioSummaryRows"
                :key="metric.label"
                class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] p-3"
              >
                <p class="text-xs font-semibold text-[var(--app-text-muted)]">{{ metric.label }}</p>
                <p class="mt-1 text-lg font-extrabold" :class="metric.tone">{{ metric.value }}</p>
              </article>
            </div>
          </section>

          <section>
            <h4 class="mb-2 text-sm font-extrabold text-[var(--app-text)]">Holding Details</h4>
            <div class="overflow-x-auto rounded-md border border-[var(--app-border-muted)]">
              <table class="min-w-full border-collapse text-left text-[0.8125rem]">
                <thead class="bg-[var(--app-surface-muted)] text-[0.68rem] font-semibold uppercase text-[var(--app-text-muted)]">
                  <tr>
                    <th class="px-3 py-2">#</th>
                    <th v-for="column in holdingColumns" :key="column" class="px-3 py-2">{{ column }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!holdingRows.length">
                    <td :colspan="holdingColumns.length + 1" class="px-3 py-8 text-center text-sm text-[var(--app-text-muted)]">No holding details found</td>
                  </tr>
                  <tr v-for="(row, index) in holdingRows" v-else :key="index" class="border-t border-[var(--app-border-muted)]">
                    <td class="px-3 py-2 text-[var(--app-text-muted)]">{{ index + 1 }}</td>
                    <td v-for="column in holdingColumns" :key="column" class="px-3 py-2">
                      <template v-if="column === 'Strategy'">
                        <div v-if="holdingStrategyItems(row).length" class="space-y-1 leading-snug">
                          <p v-for="(item, itemIndex) in holdingStrategyItems(row)" :key="`${item}-${itemIndex}`">
                            <span v-if="holdingStrategyItems(row).length > 1">{{ itemIndex + 1 }}.</span>{{ item }}
                          </p>
                        </div>
                        <span v-else>—</span>
                      </template>
                      <template v-else>{{ cellText(row, column) }}</template>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>

        <section v-else-if="activeStrategyDetail" class="space-y-5">
          <header>
            <h4 class="text-base font-extrabold text-[var(--app-text)]">Historical Return Details</h4>
            <p class="mt-1 text-xs text-[var(--app-text-muted)]">{{ strategyDetailLabel(activeStrategyDetail) }}</p>
          </header>

          <section>
            <h5 class="mb-2 text-sm font-extrabold text-[var(--app-text)]">Performance Statistics</h5>
            <div class="grid gap-3 md:grid-cols-3 2xl:grid-cols-5">
              <article
                v-for="metric in activeStrategyPerformanceRows"
                :key="metric.label"
                class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] p-3"
              >
                <p class="text-xs font-semibold text-[var(--app-text-muted)]">{{ metric.label }}</p>
                <p class="mt-1 text-lg font-extrabold" :class="metric.tone">{{ metric.value }}</p>
              </article>
            </div>
          </section>

          <section v-if="activeTransactionImages.length">
            <h5 class="mb-2 text-sm font-extrabold text-[var(--app-text)]">10 Most Recent Transactions</h5>
            <ImageLightboxGrid :items="activeTransactionImages" :columns="2" :show-meta="false" />
          </section>

          <section v-if="activePerformanceImages.length">
            <div class="mb-2">
              <h5 class="text-sm font-extrabold text-[var(--app-text)]">Performance Charts</h5>
              <p class="mt-1 text-xs text-[var(--app-text-muted)]">Strategy returns are shown in blue and benchmark returns are shown in gray.</p>
            </div>
            <ImageLightboxGrid :items="activePerformanceImages" :columns="2" />
          </section>
        </section>
      </div>
    </section>

      <section v-else class="rounded-md border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] p-8 text-center">
        <h3 class="text-base font-extrabold text-[var(--app-text)]">No results yet</h3>
        <p class="mt-2 text-sm text-[var(--app-text-muted)]">Run a basket or view one from Saved Baskets to see summary metrics and holdings here.</p>
      </section>
    </div>

    <Teleport to="body">
      <div
        v-if="hoveredAllocationRecord"
        class="basket-allocation-popover-fixed"
        :style="allocationPopoverStyle"
        role="tooltip"
        @mouseenter="clearAllocationPopoverHideTimer"
        @mouseleave="scheduleAllocationPopoverHide"
      >
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Strategies</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(allocation, allocationIndex) in hoveredAllocationRecord.strategyCombination" :key="allocation.id">
              <td>{{ allocationIndex + 1 }}</td>
              <td>{{ allocation.modelName }}</td>
              <td>{{ formatCompactPercent(allocation.percent) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.basket-builder-shell,
.basket-panel {
  border: 1px solid var(--app-border-muted);
  border-radius: 8px;
  background: var(--app-surface);
}

.basket-builder-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: space-between;
  border-bottom: 1px solid var(--app-border);
  padding: 16px;
}

.basket-builder-shell--collapsed {
  overflow: hidden;
}

.basket-builder-toggle {
  display: inline-flex;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--app-text-secondary);
  transition:
    background-color 160ms ease,
    color 160ms ease;
}

.basket-builder-toggle:hover,
.basket-builder-toggle:focus-visible {
  background: var(--app-primary-soft);
  color: var(--app-primary);
  outline: none;
}

.basket-builder-summary {
  display: grid;
  gap: 18px;
  padding: 18px 20px;
}

.basket-builder-summary__identity {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: flex-start;
  gap: 14px;
}

.basket-builder-summary .basket-builder-toggle {
  width: 44px;
  height: 44px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-primary-soft);
  color: var(--app-text);
}

.basket-builder-summary__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-top: 12px;
  color: var(--app-text-muted);
  font-size: 0.875rem;
  font-weight: 650;
  line-height: 1.3;
}

.basket-builder-summary__meta span:not(.basket-builder-summary__divider) {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.basket-builder-summary__meta svg {
  color: var(--app-text-muted);
}

.basket-builder-summary__divider {
  width: 1px;
  height: 18px;
  background: var(--app-border);
}

.basket-builder-summary__allocation {
  display: grid;
  width: 100%;
  max-width: 620px;
  min-width: 0;
  align-content: center;
  gap: 12px;
  justify-self: center;
}

.basket-builder-summary__allocation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.basket-builder-summary__allocation-header h4 {
  color: var(--app-text);
  font-size: 1.125rem;
  font-weight: 850;
  line-height: 1.2;
}

.basket-builder-summary__allocation-header span {
  color: var(--app-text-muted);
  font-size: 0.875rem;
  font-weight: 750;
  white-space: nowrap;
}

.basket-builder-summary__allocation .basket-allocation-bar {
  height: 22px;
}

.basket-builder-summary__legend {
  display: grid;
  gap: 6px;
}

.basket-builder-summary__legend-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  color: var(--app-text-secondary);
  font-size: 0.8125rem;
  line-height: 1.2;
}

.basket-builder-summary__legend-row strong {
  color: var(--app-text);
  font-weight: 800;
}

.basket-builder-summary__actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
}

.basket-builder-summary__actions .basket-run-button,
.basket-builder-summary__actions .basket-secondary-action {
  width: 100%;
  min-width: 170px;
}

.basket-builder-summary__actions .basket-run-button {
  height: 48px;
}

.basket-builder-summary__actions .basket-secondary-action {
  height: 46px;
  border-radius: 10px;
  font-size: 0.9375rem;
}

.basket-run-action-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
}

.basket-run-action-row .basket-run-button {
  flex: 0 0 auto;
}

.basket-run-warning {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  max-width: 240px;
  color: var(--app-negative);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.35;
}

.basket-run-warning svg {
  margin-top: 1px;
  flex: 0 0 auto;
}

.basket-builder-summary__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.basket-builder-summary__chips span {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--app-border-muted);
  border-radius: 999px;
  background: var(--app-primary-soft-alt);
  padding: 0 13px;
  color: var(--app-text-secondary);
  font-size: 0.8125rem;
  font-weight: 800;
  white-space: nowrap;
}

.basket-builder-summary__progress {
  border-top: 1px solid var(--app-border-muted);
  padding-top: 12px;
}

.basket-panel {
  padding: 16px;
}

.basket-secondary-action {
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
    background-color 160ms ease,
    color 160ms ease;
}

.basket-secondary-action:hover,
.basket-secondary-action:focus-visible {
  border-color: var(--app-primary);
  background: var(--app-primary-soft);
  outline: none;
}

.basket-category-pill {
  display: inline-flex;
  min-height: 26px;
  align-items: center;
  border-radius: 999px;
  background: var(--app-primary-soft-alt);
  padding: 0 12px;
  color: var(--app-text-secondary);
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.basket-weight-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  max-width: 120px;
  margin-left: auto;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-surface);
  padding: 0 10px;
  color: var(--app-text-muted);
  font-size: 0.8125rem;
  font-weight: 800;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.basket-weight-input:focus-within {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px var(--app-primary-shadow);
}

.basket-weight-input input {
  height: 36px;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--app-text);
  font-size: 0.8125rem;
  font-weight: 700;
  outline: none;
  text-align: right;
}

.basket-allocation-bar {
  display: flex;
  height: 26px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--app-surface-muted);
}

.basket-allocation-bar span {
  min-width: 4px;
  transition: width 160ms ease;
}

.basket-status-dot,
.basket-run-footer__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #ffffff;
}

.basket-status-dot {
  height: 24px;
  width: 24px;
}

.basket-status-dot--ok,
.basket-run-footer__icon--ok {
  background: var(--app-positive);
}

.basket-status-dot--error,
.basket-run-footer__icon--error {
  background: var(--app-negative);
}

.basket-run-footer {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: stretch;
  justify-content: space-between;
  border: 1px solid var(--app-border-muted);
  border-radius: 8px;
  background: var(--app-surface);
  padding: 14px 16px;
}

.basket-run-footer__icon {
  height: 42px;
  width: 42px;
  flex-shrink: 0;
}

.basket-run-button {
  display: inline-flex;
  height: 46px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: 8px;
  background: var(--app-primary);
  padding: 0 22px;
  color: #ffffff;
  font-size: 0.9375rem;
  font-weight: 800;
  transition:
    background-color 160ms ease,
    opacity 160ms ease;
}

.basket-run-button:hover:not(:disabled),
.basket-run-button:focus-visible:not(:disabled) {
  background: var(--app-primary-hover);
  outline: none;
}

.basket-run-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.basket-result-tabs {
  display: flex;
  min-width: 0;
  overflow-x: auto;
  border-bottom: 1px solid var(--app-border);
  padding: 0 16px;
}

.basket-result-tab {
  display: inline-flex;
  height: 46px;
  flex-shrink: 0;
  align-items: center;
  border-bottom: 2px solid transparent;
  padding: 0 12px;
  color: var(--app-text);
  font-size: 0.875rem;
  font-weight: 700;
  transition:
    border-color 160ms ease,
    color 160ms ease;
}

.basket-result-tab:hover,
.basket-result-tab:focus-visible {
  color: var(--app-primary);
  outline: none;
}

.basket-result-tab--active {
  border-color: var(--app-primary);
  color: var(--app-primary);
}

@media (min-width: 1024px) {
  .basket-builder-header,
  .basket-run-footer {
    flex-direction: row;
    align-items: center;
  }

  .basket-builder-summary {
    grid-template-columns: minmax(380px, 0.95fr) minmax(420px, 1.15fr) minmax(180px, auto);
    align-items: stretch;
  }

  .basket-builder-summary__allocation,
  .basket-builder-summary__actions {
    border-left: 1px solid var(--app-border);
    padding-left: 24px;
  }

  .basket-builder-summary__progress {
    grid-column: 1 / -1;
  }

  .basket-builder-summary__actions {
    align-items: flex-end;
    justify-content: center;
  }

  .basket-builder-summary__actions .basket-run-action-row {
    justify-content: flex-end;
  }
}

.basket-allocation-summary {
  max-width: min(560px, 56vw);
  margin-top: 4px;
  color: var(--app-text-muted);
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.35;
  outline: none;
}

.basket-allocation-summary__text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.basket-allocation-popover-fixed {
  position: fixed;
  z-index: 80;
  width: min(520px, calc(100vw - 24px));
  max-height: min(320px, calc(100vh - 24px));
  overflow: auto;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-surface);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22);
  color: var(--app-text);
  padding: 8px;
}

.basket-allocation-popover-fixed table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
}

.basket-allocation-popover-fixed th,
.basket-allocation-popover-fixed td {
  border-bottom: 1px solid var(--app-border-muted);
  padding: 6px 8px;
  text-align: left;
  vertical-align: top;
}

.basket-allocation-popover-fixed th:last-child,
.basket-allocation-popover-fixed td:last-child {
  text-align: right;
  white-space: nowrap;
}

.basket-allocation-popover-fixed tbody tr:last-child td {
  border-bottom: 0;
}

.basket-icon-button {
  display: inline-flex;
  height: 30px;
  width: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--app-text-secondary);
  transition:
    background-color 160ms ease,
    color 160ms ease;
}

.basket-icon-button:hover,
.basket-icon-button:focus-visible {
  background: var(--app-primary-soft);
  color: var(--app-primary);
  outline: none;
}

.basket-field {
  display: grid;
  gap: 6px;
  min-width: 0;
  color: var(--app-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.basket-field input,
.basket-small-input,
.basket-table-input {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-surface);
  color: var(--app-text);
  outline: none;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.basket-field input {
  height: 36px;
  padding: 0 10px;
  font-size: 0.8125rem;
}

.basket-small-input,
.basket-table-input {
  height: 32px;
  padding: 0 8px;
  font-size: 0.8125rem;
}

.basket-field input:focus,
.basket-small-input:focus,
.basket-table-input:focus {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px var(--app-primary-shadow);
}

.basket-small-input:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.basket-mode-button {
  height: 30px;
  border-radius: 5px;
  padding: 0 12px;
  color: var(--app-text-secondary);
  font-size: 0.75rem;
  font-weight: 800;
}

.basket-mode-button--active {
  background: var(--app-primary);
  color: white;
}
</style>

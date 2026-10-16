<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { ArrowDown, ArrowUp, ArrowUpDown, CircleHelp, Info, Link2, Play, RotateCcw, Search, Table2, X } from '@lucide/vue'
import indexesData from '@/assets/indexes_list.json'
import stocksData from '@/assets/stocks_list.json'
import {
  fetchPatternPrices,
  fetchAssetCorrelation,
  runAssetCorrelation,
  runBetaAnalyzer,
  runPatternCorrelation,
  runSymbolCorrelation,
} from '@/entities/cpm/api/cpm.api'
import type { CpmCorrelationResult, CpmSectionKey } from '@/entities/cpm/model/cpm.types'
import { cpmCsvFilename, parseCpmNumber } from '@/entities/cpm/model/cpm.adapter'
import { downloadCsv, toCsv } from '@/shared/utils/csv'
import AppDataTable from '@/shared/ui/AppDataTable.vue'
import type { AppDataTableColumn } from '@/shared/ui/app-data-table.types'
import SearchSelect from '@/shared/ui/SearchSelect.vue'
import CpmPatternComparisonChart from './CpmPatternComparisonChart.vue'
import CpmRollingCorrelationChart from './CpmRollingCorrelationChart.vue'
import { patternCalendarRangeValid } from '@/entities/cpm/model/pattern-calendar'

type CorrelationTone = 'positive' | 'negative' | 'neutral' | 'empty'
type SortDirection = 'asc' | 'desc'
type AssetStatsSortKey = 'name' | 'ticker' | 'annualizedReturn' | 'dailyStdDev' | 'monthlyStdDev' | 'annualizedStdDev'
type BetaRegime = 'aggressive' | 'defensive' | 'inverse' | 'unknown'

interface SymbolMatrixCell {
  key: string
  value: number | null
}

interface SymbolMatrixRow {
  label: string
  cells: SymbolMatrixCell[]
}

interface SymbolPairCard {
  symbol: string
  pairLabel: string
  value: number | null
  latestValue: number | null
  label: string
  tone: CorrelationTone
}

interface SymbolRollingSeries {
  key: string
  name: string
  symbol: string
  data: Array<[number, number]>
  latestDate: string
  latestValue: number | null
}

interface SymbolPriceSeries {
  name: string
  data: Array<[number, number]>
}

interface BetaSnapshot {
  benchmark: string
  symbol: string
  startDate: string
  endDate: string
  allHistory: boolean
  rollWindow: number
}

interface BetaHistoryPoint {
  timestamp: number
  date: string
  assetPrice: number | null
  comparisonPrice: number | null
  correlation: number | null
  assetVolatility: number | null
  comparisonVolatility: number | null
  beta: number | null
  regime: BetaRegime
}

interface BetaMetricCard {
  label: string
  value: string
  detail: string
  tone: BetaRegime | 'neutral'
}

interface SearchSelectOption {
  value: string
  label: string
  description?: string
  meta?: string
}

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

interface AssetMatrixCell {
  key: string
  value: number | null
}

interface AssetMatrixRow {
  name: string
  ticker: string
  assetClass: string
  cells: AssetMatrixCell[]
  annualizedReturn: number | null
  dailyStdDev: number | null
  monthlyStdDev: number | null
  annualizedStdDev: number | null
}

interface AssetPair {
  key: string
  left: string
  right: string
  leftName: string
  rightName: string
  leftClass: string
  rightClass: string
  value: number
}

interface PatternSnapshot {
  referenceSymbol: string
  referenceStartDate: string
  referenceEndDate: string
  comparisonSymbol: string
  comparisonStartDate: string
  comparisonEndDate: string
  referenceBarsNum: number
  comparisonBarsNum: number
}

interface PatternPeriodPoint {
  alignedBar: number
  timestamp: number | null
  date: string
  price: number | null
  normalized: number | null
}

interface PatternObservation {
  bar: number
  reference: PatternPeriodPoint | null
  comparison: PatternPeriodPoint | null
  difference: number | null
}

const props = defineProps<{
  section: CpmSectionKey
}>()

const loading = ref(false)
const result = ref<CpmCorrelationResult | null>(null)
const errorMessage = ref('')
const selectedPairSymbol = ref('')
const selectedAssetPairKey = ref('')
const isAssetPairModalOpen = ref(false)
const compareSymbolDraft = ref('')
const assetSearchQuery = ref('')
const assetStatsSortKey = ref<AssetStatsSortKey | ''>('')
const assetStatsSortDirection = ref<SortDirection>('asc')
const today = new Date().toISOString().slice(0, 10)

const shared = reactive({
  benchmark: 'AAPL',
  symbol: 'SPY',
  comparisonSymbols: 'AADI, AAN',
  startDate: '',
  endDate: today,
  allHistory: true,
  rollWindow: 21,
})

const submittedSymbol = reactive({
  benchmark: shared.benchmark,
  comparisonSymbols: shared.comparisonSymbols,
  startDate: shared.startDate,
  endDate: shared.endDate,
  allHistory: shared.allHistory,
  rollWindow: shared.rollWindow,
})

const submittedBeta = reactive<BetaSnapshot>({
  benchmark: shared.benchmark,
  symbol: shared.symbol,
  startDate: shared.startDate,
  endDate: shared.endDate,
  allHistory: shared.allHistory,
  rollWindow: shared.rollWindow,
})

const asset = reactive({
  startDate: '2008-01-01',
  endDate: today,
})

const pattern = reactive({
  referenceSymbol: 'SPX',
  referenceStartDate: '',
  referenceEndDate: '',
  comparisonSymbol: 'SPX',
  comparisonStartDate: '',
  comparisonEndDate: '',
  referenceBarsNum: 252,
  comparisonBarsNum: 252,
})

const submittedPattern = reactive<PatternSnapshot>({
  referenceSymbol: pattern.referenceSymbol,
  referenceStartDate: pattern.referenceStartDate,
  referenceEndDate: pattern.referenceEndDate,
  comparisonSymbol: pattern.comparisonSymbol,
  comparisonStartDate: pattern.comparisonStartDate,
  comparisonEndDate: pattern.comparisonEndDate,
  referenceBarsNum: pattern.referenceBarsNum,
  comparisonBarsNum: pattern.comparisonBarsNum,
})
const selectedPatternObservationIndex = ref(0)
const patternChartMode = ref<'price' | 'normalized'>('price')
const patternCalendar = ref<Array<{ Date: string; Close: number }>>([])
const patternCalendarLoading = ref(false)
let patternCalendarRequest = 0

async function autoRunPatternComparison() {
  if (props.section !== 'pattern') return
  if (!patternCalendar.value.length) await loadPatternCalendar()
  if (patternCalendar.value.length && pattern.referenceStartDate && pattern.referenceEndDate) void submit()
}

async function loadPatternCalendar() {
  if (props.section !== 'pattern') return
  const request = ++patternCalendarRequest
  patternCalendarLoading.value = true
  try {
    const rows = await fetchPatternPrices('SPX')
    if (request !== patternCalendarRequest || props.section !== 'pattern') return
    if (!rows.length) throw new Error('No trading calendar data.')
    patternCalendar.value = rows
    setPatternDefaults()
  } catch {
    if (request === patternCalendarRequest) errorMessage.value = 'Trading calendar could not be loaded. Please try again.'
  } finally {
    if (request === patternCalendarRequest) patternCalendarLoading.value = false
  }
}

function setPatternDefaults() {
  const rows = patternCalendar.value
  if (!rows.length) return
  pattern.referenceEndDate = rows.at(-1)!.Date
  pattern.referenceStartDate = rows[Math.max(0, rows.length - 252)]!.Date
  pattern.comparisonEndDate = pattern.referenceStartDate
  pattern.comparisonStartDate = rows[Math.max(0, rows.length - 504)]!.Date
  pattern.referenceBarsNum = 252
  pattern.comparisonBarsNum = 252
  calculatePatternBars()
  applySubmittedPatternSnapshot(currentPatternSnapshot())
}

function calculatePatternBars() {
  pattern.comparisonBarsNum = Number(pattern.referenceBarsNum)
  updatePatternEndDate('reference')
  updatePatternEndDate('comparison')
}

function onPatternStartDateChange(side: 'reference' | 'comparison') {
  const end = pattern[`${side}EndDate`]
  if (end) {
    const bars = patternTradingBarsBetween(pattern[`${side}StartDate`], end)
    if (bars > 0) {
      pattern.referenceBarsNum = bars
      pattern.comparisonBarsNum = bars
      updatePatternEndDate(side === 'reference' ? 'comparison' : 'reference')
      return
    }
  }
  calculatePatternBars()
}

function patternTradingBarsBetween(startDate: string, endDate: string) {
  const dates = patternCalendar.value.map(row => row.Date)
  const startIndex = dates.findIndex(date => date >= startDate)
  if (startIndex < 0) return 0
  let count = 0
  for (let index = startIndex; index < dates.length && dates[index] <= endDate; index += 1) count += 1
  return count
}

function updatePatternEndDate(side: 'reference' | 'comparison') {
  const bars = Number(pattern.referenceBarsNum)
  const dates = patternCalendar.value.map(row => row.Date)
  const start = pattern[`${side}StartDate`]
  const index = dates.findIndex(date => date >= start)
  pattern[`${side}EndDate`] = start && Number.isInteger(bars) && bars >= 5 && bars <= 252 && index >= 0
    ? dates[index + bars - 1] ?? ''
    : ''
}

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

const fallbackSymbolEntries: MarketEntry[] = [
  { symbol: 'SPX', name: 'S&P 500', category: 'Index' },
  { symbol: 'NDX', name: 'Nasdaq 100', category: 'Index' },
  { symbol: 'AAPL', name: 'Apple Inc', category: 'Stock' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', category: 'ETF' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', category: 'ETF' },
  { symbol: 'MSFT', name: 'Microsoft Corp', category: 'Stock' },
]

const symbolEntries = marketEntries.length ? marketEntries : fallbackSymbolEntries
const assetStatKeys = [
  'Annualized Return',
  'Daily Standard Deviation',
  'Monthly Standard Deviation',
  'Annualized Standard Deviation',
] as const
const assetMetadataKeys = new Set([
  'Name',
  'Ticker',
  'Asset Class',
  'AssetClass',
  'asset_class',
  'assetClass',
  'last_updated',
])
const assetClassByTicker: Record<string, string> = {
  IVV: 'U.S. Equity',
  IJH: 'U.S. Equity',
  IJR: 'U.S. Equity',
  EFA: 'International Equity',
  SCZ: 'International Equity',
  EEM: 'International Equity',
  AGG: 'Fixed Income',
  SHY: 'Fixed Income',
  IEF: 'Fixed Income',
  TLT: 'Fixed Income',
  TIP: 'Fixed Income',
  LQD: 'Fixed Income',
  VNQ: 'Real Assets',
  GLD: 'Real Assets',
  DBC: 'Real Assets',
  HYG: 'Credit',
  USO: 'Credit',
  DXY: 'Currency',
}
const assetClassPalette: Record<string, { color: string; soft: string }> = {
  'U.S. Equity': { color: '#1677ff', soft: 'rgba(22, 119, 255, 0.12)' },
  'International Equity': { color: '#12b981', soft: 'rgba(18, 185, 129, 0.12)' },
  'Fixed Income': { color: '#8b5cf6', soft: 'rgba(139, 92, 246, 0.12)' },
  'Real Assets': { color: '#e6a700', soft: 'rgba(230, 167, 0, 0.13)' },
  Credit: { color: '#f43f7d', soft: 'rgba(244, 63, 125, 0.12)' },
  Currency: { color: '#0891b2', soft: 'rgba(8, 145, 178, 0.12)' },
}
const correlationValueGuide = [
  {
    label: 'Strong positive',
    description: 'prices usually move in the same direction',
    range: '0.60 to 1.00',
    color: '#0b4fb8',
  },
  {
    label: 'Moderate positive',
    description: 'prices often move together, but less consistently',
    range: '0.20 to 0.60',
    color: '#1d8cff',
  },
  {
    label: 'Near zero',
    description: 'little directional relationship',
    range: '-0.20 to 0.20',
    color: '#78baff',
  },
  {
    label: 'Moderate negative',
    description: 'prices often move in opposite directions',
    range: '-0.60 to -0.20',
    color: '#f0798c',
  },
  {
    label: 'Strong negative',
    description: 'prices usually move in opposite directions',
    range: '-1.00 to -0.60',
    color: '#d80f36',
  },
] as const
const betaRegimeGuide = [
  {
    label: 'Aggressive',
    range: 'β > 1',
    description: 'The asset has tended to move more than the comparison ticker.',
    color: '#f59e0b',
  },
  {
    label: 'Defensive',
    range: '0 < β < 1',
    description: 'The asset has tended to move in the same direction with smaller magnitude.',
    color: '#006cff',
  },
  {
    label: 'Inverse',
    range: 'β < 0',
    description: 'The asset has tended to move opposite the comparison ticker.',
    color: '#f43f5e',
  },
] as const
const correlationBandGuide = [
  {
    label: 'Positive correlation',
    range: 'ρ > 0',
    description: 'The pair has tended to move in the same direction during the rolling window.',
    color: '#006cff',
  },
  {
    label: 'Near zero',
    range: 'ρ ≈ 0',
    description: 'The rolling relationship is weak or unstable around the zero line.',
    color: '#94a3b8',
  },
  {
    label: 'Negative correlation',
    range: 'ρ < 0',
    description: 'The pair has tended to move in opposite directions during the rolling window.',
    color: '#f43f5e',
  },
] as const
const betaValueAxisPlotBands = [
  { from: 1, to: 1000, color: 'rgba(245, 158, 11, 0.11)' },
  { from: 0, to: 1, color: 'rgba(0, 108, 255, 0.07)' },
  { from: -1000, to: 0, color: 'rgba(244, 63, 94, 0.09)' },
]
const correlationValueAxisPlotBands = [
  { from: 0, to: 1, color: 'rgba(0, 108, 255, 0.06)' },
  { from: -1, to: 0, color: 'rgba(244, 63, 94, 0.06)' },
]

const sectionTitle = computed(() => {
  if (props.section === 'symbol') return 'Symbol Correlation'
  if (props.section === 'asset') return 'Asset Correlation'
  if (props.section === 'pattern') return 'Date Range Correlation'
  return 'Beta Analyzer'
})

const sectionDescription = computed(() => {
  if (props.section === 'symbol') return 'Compare rolling relationships between a benchmark and up to five symbols.'
  if (props.section === 'asset') return 'Review the monthly return correlation matrix across major asset classes.'
  if (props.section === 'pattern') return 'Compare two date ranges and score the similarity of their price patterns.'
  return 'Measure rolling beta between a benchmark and a selected comparison symbol.'
})

const primaryRows = computed(() => result.value?.matrixRows ?? [])
const secondaryRows = computed(() => result.value?.seriesRows ?? [])
const score = computed(() => {
  if (props.section !== 'pattern') return ''
  const data = result.value?.data ?? {}
  const value = data.pattern_corr ?? data.patternCorrelation ?? data.score ?? data.correlation ?? data.corr
  return value === undefined || value === null || value === '' ? '' : String(value)
})

const patternObservations = computed<PatternObservation[]>(() => (
  props.section === 'pattern'
    ? buildPatternObservations(result.value?.data ?? {}, primaryRows.value, secondaryRows.value)
    : []
))
const patternObservationRows = computed<Array<Record<string, unknown>>>(() => patternObservations.value.map((row) => ({
  Bar: row.bar,
  'Period A Date': row.reference?.date || '-',
  'Period A Price': row.reference?.price,
  'Period B Date': row.comparison?.date || '-',
  'Period B Price': row.comparison?.price,
  'Normalized A': row.reference?.normalized,
  'Normalized B': row.comparison?.normalized,
  'Difference (A - B)': row.difference,
})))
const patternCorrelationValue = computed(() => patternCorrelationDecimal(score.value, patternObservations.value))
const patternCorrelationPercent = computed(() => {
  const value = patternCorrelationValue.value
  return value === null ? '-' : `${Math.round(value * 100)}%`
})
const patternCorrelationText = computed(() => {
  const value = patternCorrelationValue.value
  return value === null ? '-' : value.toFixed(2).replace(/\.?0+$/, '')
})
const patternStrength = computed(() => patternSimilarityStrength(patternCorrelationValue.value))
const patternPriceChartSeries = computed(() => [
  {
    key: 'period-a-price',
    name: `Period A · ${normalizeSymbolLabel(submittedPattern.referenceSymbol) || 'Reference'}`,
    data: patternObservations.value
      .filter((row) => row.reference?.price !== null && row.reference?.price !== undefined)
      .map((row) => [row.bar, row.reference?.price as number] as [number, number]),
    fill: true,
    yAxis: 0 as const,
  },
  {
    key: 'period-b-price',
    name: `Period B · ${normalizeSymbolLabel(submittedPattern.comparisonSymbol) || 'Comparison'}`,
    data: patternObservations.value
      .filter((row) => row.comparison?.price !== null && row.comparison?.price !== undefined)
      .map((row) => [row.bar, row.comparison?.price as number] as [number, number]),
    color: '#7c3aed',
    fill: true,
    yAxis: 1 as const,
  },
])

function patternMinMaxScaled(data: Array<[number, number]>) {
  if (data.length < 2) return data
  const values = data.map((point) => point[1])
  const low = Math.min(...values)
  const range = Math.max(...values) - low
  return data.map(([bar, value]) => [bar, range ? ((value - low) / range) * 100 : 50] as [number, number])
}

const patternNormalizedChartSeries = computed(() => [
  {
    key: 'period-a-normalized',
    name: `Period A · ${normalizeSymbolLabel(submittedPattern.referenceSymbol) || 'Reference'}`,
    data: patternMinMaxScaled(patternPriceChartSeries.value[0]!.data),
    fill: true,
  },
  {
    key: 'period-b-normalized',
    name: `Period B · ${normalizeSymbolLabel(submittedPattern.comparisonSymbol) || 'Comparison'}`,
    data: patternMinMaxScaled(patternPriceChartSeries.value[1]!.data),
    color: '#7c3aed',
    fill: true,
  },
])
const selectedPatternObservation = computed(() => {
  const rows = patternObservations.value
  if (!rows.length) return null
  const index = Math.max(0, Math.min(selectedPatternObservationIndex.value, rows.length - 1))
  return rows[index] ?? rows[0]
})
const patternAlignedBars = computed(() => patternObservations.value.length || Math.min(Number(submittedPattern.referenceBarsNum) || 0, Number(submittedPattern.comparisonBarsNum) || 0))
const selectedPatternReferenceReturn = computed(() => patternReturnSinceStart(selectedPatternObservation.value?.reference?.normalized))
const selectedPatternComparisonReturn = computed(() => patternReturnSinceStart(selectedPatternObservation.value?.comparison?.normalized))
const selectedPatternReturnGap = computed(() => {
  const reference = selectedPatternReferenceReturn.value
  const comparison = selectedPatternComparisonReturn.value
  return reference === null || comparison === null ? null : reference - comparison
})
const patternPeriodsSameLength = computed(() => Number(pattern.referenceBarsNum) === Number(pattern.comparisonBarsNum))
const submittedPatternPeriodsSameLength = computed(() => Number(submittedPattern.referenceBarsNum) === Number(submittedPattern.comparisonBarsNum))
const hasPatternResults = computed(() => Boolean(score.value || patternObservations.value.length || primaryRows.value.length || secondaryRows.value.length))
const primaryColumns = computed(() => tableColumns(primaryRows.value))
const secondaryColumns = computed(() => tableColumns(secondaryRows.value.slice(0, 1)))
const hasResults = computed(() => primaryRows.value.length || secondaryRows.value.length || score.value || (props.section === 'pattern' && patternObservations.value.length))
const assetRows = computed(() => (props.section === 'asset' ? primaryRows.value : []))
const assetMatrixColumnKeys = computed(() => {
  const rows = assetRows.value
  const first = rows[0]
  if (!first) return []

  const statKeys = new Set<string>(assetStatKeys)
  return Object.keys(first).filter((key) => {
    if (assetMetadataKeys.has(key) || statKeys.has(key)) return false
    return rows.some((row) => parseCpmNumber(row[key]) !== null)
  })
})
const assetMatrixRows = computed<AssetMatrixRow[]>(() => {
  const columns = assetMatrixColumnKeys.value
  return assetRows.value
    .map((row, index) => {
      const ticker = normalizeSymbolLabel(row.Ticker ?? row.ticker ?? row.Symbol ?? row.symbol ?? row.index)
      const name = textValue(row.Name ?? row.name) || ticker || `Asset ${index + 1}`
      const assetClass = textValue(row['Asset Class'] ?? row.AssetClass ?? row.asset_class ?? row.assetClass)
        || assetClassByTicker[ticker]
        || 'Other'

      return {
        name,
        ticker,
        assetClass,
        cells: columns.map((key) => ({
          key,
          value: parseCpmNumber(row[key]),
        })),
        annualizedReturn: parseCpmNumber(row['Annualized Return']),
        dailyStdDev: parseCpmNumber(row['Daily Standard Deviation']),
        monthlyStdDev: parseCpmNumber(row['Monthly Standard Deviation']),
        annualizedStdDev: parseCpmNumber(row['Annualized Standard Deviation']),
      }
    })
    .filter((row) => row.ticker || row.name)
})
const filteredAssetMatrixRows = computed(() => {
  const query = assetSearchQuery.value.trim().toLowerCase()
  if (!query) return assetMatrixRows.value

  return assetMatrixRows.value.filter((row) => {
    const haystack = `${row.ticker} ${row.name} ${row.assetClass}`.toLowerCase()
    return haystack.includes(query)
  })
})
const assetStatsRows = computed(() => {
  const sortKey = assetStatsSortKey.value
  if (!sortKey) return assetMatrixRows.value

  const direction = assetStatsSortDirection.value === 'asc' ? 1 : -1
  return [...assetMatrixRows.value].sort((left, right) => {
    const leftValue = assetStatsSortValue(left, sortKey)
    const rightValue = assetStatsSortValue(right, sortKey)

    if (typeof leftValue === 'string' || typeof rightValue === 'string') {
      return String(leftValue).localeCompare(String(rightValue), undefined, { sensitivity: 'base' }) * direction
    }

    if (leftValue === null && rightValue === null) return 0
    if (leftValue === null) return 1
    if (rightValue === null) return -1
    return (leftValue - rightValue) * direction
  })
})
const assetPairCandidates = computed<AssetPair[]>(() => {
  const rowByTicker = new Map(assetMatrixRows.value.map((row) => [row.ticker, row]))
  const pairs: AssetPair[] = []
  const seen = new Set<string>()

  assetMatrixRows.value.forEach((leftRow) => {
    leftRow.cells.forEach((cell) => {
      const right = normalizeSymbolLabel(cell.key)
      const rightRow = rowByTicker.get(right)
      if (!rightRow || !leftRow.ticker || right === leftRow.ticker || cell.value === null) return

      const key = assetPairKey(leftRow.ticker, right)
      if (seen.has(key)) return
      seen.add(key)

      pairs.push({
        key,
        left: leftRow.ticker,
        right,
        leftName: leftRow.name,
        rightName: rightRow.name,
        leftClass: leftRow.assetClass,
        rightClass: rightRow.assetClass,
        value: cell.value,
      })
    })
  })

  return pairs
})
const strongestPositiveAssetPairs = computed(() => {
  return [...assetPairCandidates.value]
    .sort((left, right) => right.value - left.value)
    .slice(0, 5)
})
const strongestInverseAssetPairs = computed(() => {
  return [...assetPairCandidates.value]
    .sort((left, right) => left.value - right.value)
    .slice(0, 5)
})
const selectedAssetPair = computed(() => {
  return assetPairCandidates.value.find((pair) => pair.key === selectedAssetPairKey.value)
    ?? strongestInverseAssetPairs.value[0]
    ?? assetPairCandidates.value[0]
    ?? null
})
const selectedAssetLeftRow = computed(() => {
  const pair = selectedAssetPair.value
  return pair ? assetMatrixRows.value.find((row) => row.ticker === pair.left) ?? null : null
})
const selectedAssetRightRow = computed(() => {
  const pair = selectedAssetPair.value
  return pair ? assetMatrixRows.value.find((row) => row.ticker === pair.right) ?? null : null
})
const assetDateRangeLabel = computed(() => `${asset.startDate || 'Start'} to ${asset.endDate || assetLastUpdated.value || 'End'}`)
const assetTitleDateRange = computed(() => {
  const start = formatAssetMonth(asset.startDate)
  const end = formatAssetMonth(asset.endDate || assetLastUpdated.value)
  return start && end ? `${start} - ${end}` : assetDateRangeLabel.value
})
const assetLastUpdated = computed(() => extractAssetLastUpdated(assetRows.value))
const assetObservationMonths = computed(() => monthSpan(asset.startDate, asset.endDate || assetLastUpdated.value))
const symbolDateMode = computed({
  get: () => {
    if (shared.allHistory) return 'all'
    const years = activeSymbolQuickYear()
    return years ? String(years) : 'custom'
  },
  set(value: string) {
    if (value === 'all') {
      shared.allHistory = true
      return
    }
    shared.allHistory = false
    if (value === 'custom') return
    const years = Number(value)
    if (Number.isInteger(years) && years > 0) applySymbolQuickYear(years)
  },
})
const symbolSearchOptions = computed<SearchSelectOption[]>(() => {
  const defaults = ['AAPL', 'SPY', 'SPX', 'QQQ', 'MSFT', 'AADI', 'AAN']
  const entries = new Map<string, MarketEntry>()

  for (const symbol of defaults) {
    const entry = symbolEntries.find((item) => item.symbol === symbol)
      ?? fallbackSymbolEntries.find((item) => item.symbol === symbol)
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
const formComparisonSymbols = computed(() => uniqueSymbolList(comparisonList(shared.comparisonSymbols)))
const normalizedBenchmark = computed(() => normalizeSymbolLabel(submittedSymbol.benchmark) || 'BENCHMARK')
const symbolComparisonSymbols = computed(() => uniqueSymbolList(comparisonList(submittedSymbol.comparisonSymbols)))
const symbolMatrixColumnKeys = computed(() => {
  if (!primaryRows.value.length) return []
  const keys = new Set<string>()
  primaryRows.value.forEach((row) => {
    const labelKey = matrixLabelKey(row)
    Object.keys(row).forEach((key) => {
      if (key === labelKey) return
      if (parseCpmNumber(row[key]) === null) return
      keys.add(key)
    })
  })
  return Array.from(keys)
})
const symbolMatrixRows = computed<SymbolMatrixRow[]>(() => {
  if (!primaryRows.value.length || !symbolMatrixColumnKeys.value.length) return []

  return primaryRows.value.map((row, index) => {
    const label = matrixRowLabel(row) || `Row ${index + 1}`
    return {
      label,
      cells: symbolMatrixColumnKeys.value.map((key) => ({
        key,
        value: parseCpmNumber(row[key]),
      })),
    }
  })
})
const symbolRollingSeries = computed<SymbolRollingSeries[]>(() => {
  const rows = secondaryRows.value
  if (!rows.length) return []

  const dateKey = rollingDateKey(rows)
  if (!dateKey) return []

  const keys = rollingValueKeys(rows, dateKey)
  return keys.map((key, index) => {
    const symbol = symbolForRollingKey(key, index, keys.length)
    const points = rows
      .map((row) => {
        const timestamp = timestampFromValue(row[dateKey])
        const value = parseCpmNumber(row[key])
        if (timestamp === null || value === null) return null
        return {
          timestamp,
          date: dateLabel(row[dateKey], timestamp),
          value,
        }
      })
      .filter((point): point is { timestamp: number; date: string; value: number } => point !== null)
      .sort((left, right) => left.timestamp - right.timestamp)

    const latestPoint = points.at(-1)
    return {
      key,
      name: symbol && symbol !== key ? pairLabel(symbol) : displayFieldLabel(key),
      symbol,
      data: points.map((point) => [point.timestamp, point.value] as [number, number]),
      latestDate: latestPoint?.date ?? '',
      latestValue: latestPoint?.value ?? null,
    }
  })
})
const symbolPriceSeries = computed<SymbolPriceSeries | null>(() => {
  const rows = secondaryRows.value
  if (!rows.length) return null

  const dateKey = rollingDateKey(rows)
  if (!dateKey) return null

  const priceKey = rollingPriceKey(rows, dateKey)
  if (!priceKey) return null

  const data = rows
    .map((row) => {
      const timestamp = timestampFromValue(row[dateKey])
      const value = parseCpmNumber(row[priceKey])
      if (timestamp === null || value === null) return null
      return [timestamp, value] as [number, number]
    })
    .filter((point): point is [number, number] => point !== null)
    .sort((left, right) => left[0] - right[0])

  if (data.length < 2) return null
  return {
    name: `${normalizedBenchmark.value} Price`,
    data,
  }
})
const symbolPairCards = computed<SymbolPairCard[]>(() => {
  return symbolComparisonSymbols.value.map((symbol) => {
    const value = matrixValueForPair(symbol)
    const rolling = rollingSeriesForSymbol(symbol)
    const latestValue = rolling?.latestValue ?? null
    const displayValue = value ?? latestValue
    const strength = correlationStrength(displayValue)

    return {
      symbol,
      pairLabel: pairLabel(symbol),
      value,
      latestValue,
      label: strength.label,
      tone: strength.tone,
    }
  })
})
const selectedPairCard = computed(() => {
  return symbolPairCards.value.find((card) => card.symbol === selectedPairSymbol.value) ?? symbolPairCards.value[0] ?? null
})
const comparisonPairCard = computed(() => {
  return symbolPairCards.value.find((card) => card.symbol !== selectedPairCard.value?.symbol) ?? null
})
const selectedRollingSeries = computed(() => {
  const selected = selectedPairCard.value?.symbol
  return selected ? rollingSeriesForSymbol(selected) : symbolRollingSeries.value[0] ?? null
})
const selectedRollingKey = computed(() => selectedRollingSeries.value?.key ?? '')
const hasSymbolResults = computed(() => primaryRows.value.length > 0 || secondaryRows.value.length > 0)
const normalizedBetaAsset = computed(() => normalizeSymbolLabel(submittedBeta.benchmark) || 'ASSET')
const normalizedBetaComparison = computed(() => normalizeSymbolLabel(submittedBeta.symbol) || 'COMPARISON')
const betaRows = computed(() => (props.section === 'transmission' ? secondaryRows.value : []))
const betaHistoryPoints = computed<BetaHistoryPoint[]>(() => {
  const rows = betaRows.value
  if (!rows.length) return []

  const dateKey = rollingDateKey(rows)
  if (!dateKey) return []

  const betaKey = betaValueKey(rows, dateKey, submittedBeta.symbol)
  const assetPriceKey = betaPriceKey(rows, dateKey, submittedBeta.benchmark, 'asset')
  const comparisonPriceKey = betaPriceKey(rows, dateKey, submittedBeta.symbol, 'comparison', assetPriceKey)
  const correlationKey = betaCorrelationKey(rows, dateKey)
  const assetVolatilityKey = betaVolatilityKey(rows, dateKey, submittedBeta.benchmark, 'asset')
  const comparisonVolatilityKey = betaVolatilityKey(rows, dateKey, submittedBeta.symbol, 'comparison')

  return rows
    .map((row) => {
      const timestamp = timestampFromValue(row[dateKey])
      if (timestamp === null) return null

      const beta = betaKey ? parseCpmNumber(row[betaKey]) : null
      return {
        timestamp,
        date: dateLabel(row[dateKey], timestamp),
        assetPrice: assetPriceKey ? parseCpmNumber(row[assetPriceKey]) : null,
        comparisonPrice: comparisonPriceKey ? parseCpmNumber(row[comparisonPriceKey]) : null,
        correlation: correlationKey ? parseCpmNumber(row[correlationKey]) : null,
        assetVolatility: assetVolatilityKey ? parseCpmNumber(row[assetVolatilityKey]) : null,
        comparisonVolatility: comparisonVolatilityKey ? parseCpmNumber(row[comparisonVolatilityKey]) : null,
        beta,
        regime: betaRegimeForValue(beta),
      }
    })
    .filter((point): point is BetaHistoryPoint => point !== null)
    .sort((left, right) => left.timestamp - right.timestamp)
})
const betaChartSeries = computed<SymbolRollingSeries[]>(() => {
  const data = betaHistoryPoints.value
    .filter((point) => point.beta !== null)
    .map((point) => [point.timestamp, point.beta as number] as [number, number])

  return data.length > 1
    ? [{
        key: 'rolling-beta',
        name: 'Rolling Beta',
        symbol: normalizedBetaComparison.value,
        data,
        latestDate: betaHistoryPoints.value.at(-1)?.date ?? '',
        latestValue: data.at(-1)?.[1] ?? null,
      }]
    : []
})
const betaAssetPriceSeries = computed<SymbolPriceSeries | null>(() => {
  const data = betaHistoryPoints.value
    .filter((point) => point.assetPrice !== null)
    .map((point) => [point.timestamp, point.assetPrice as number] as [number, number])

  return data.length > 1 ? { name: `${normalizedBetaAsset.value} Price`, data } : null
})
const betaComparisonPriceSeries = computed<SymbolPriceSeries | null>(() => {
  const data = betaHistoryPoints.value
    .filter((point) => point.comparisonPrice !== null)
    .map((point) => [point.timestamp, point.comparisonPrice as number] as [number, number])

  return data.length > 1 ? { name: `${normalizedBetaComparison.value} Price`, data } : null
})
const betaValues = computed(() => betaHistoryPoints.value.map((point) => point.beta).filter((value): value is number => value !== null))
const betaSummary = computed(() => {
  const values = betaValues.value
  const latest = [...betaHistoryPoints.value].reverse().find((point) => point.beta !== null)?.beta ?? null
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
  const datedBetaPoints = betaHistoryPoints.value.filter((point) => point.beta !== null)
  const highPoint = datedBetaPoints.reduce<BetaHistoryPoint | null>((best, point) => (
    best === null || (point.beta as number) > (best.beta as number) ? point : best
  ), null)
  const lowPoint = datedBetaPoints.reduce<BetaHistoryPoint | null>((best, point) => (
    best === null || (point.beta as number) < (best.beta as number) ? point : best
  ), null)
  const high = highPoint?.beta ?? null
  const low = lowPoint?.beta ?? null
  const aggressiveCount = values.filter((value) => value > 1).length
  const inverseCount = values.filter((value) => value < 0).length

  return {
    latest,
    average,
    high,
    highDate: highPoint?.date ?? null,
    low,
    lowDate: lowPoint?.date ?? null,
    aggressiveCount,
    inverseCount,
    totalCount: values.length,
  }
})
const betaMetricCards = computed<BetaMetricCard[]>(() => {
  const summary = betaSummary.value
  return [
    {
      label: 'Current Beta',
      value: formatBetaValue(summary.latest),
      detail: 'Latest rolling value',
      tone: betaRegimeForValue(summary.latest),
    },
    {
      label: 'Average Beta',
      value: formatBetaValue(summary.average),
      detail: 'Mean over selected range',
      tone: 'neutral',
    },
    {
      label: 'Highest Beta',
      value: formatBetaValue(summary.high),
      detail: summary.highDate ?? 'No rolling value',
      tone: 'aggressive',
    },
    {
      label: 'Lowest Beta',
      value: formatBetaValue(summary.low),
      detail: summary.lowDate ?? 'No rolling value',
      tone: summary.low !== null && summary.low < 0 ? 'inverse' : 'defensive',
    },
    {
      label: '> 1 (Aggressive)',
      value: formatPercentShare(summary.aggressiveCount, summary.totalCount),
      detail: `${summary.aggressiveCount} observations`,
      tone: 'aggressive',
    },
    {
      label: '< 0 (Inverse)',
      value: formatPercentShare(summary.inverseCount, summary.totalCount),
      detail: `${summary.inverseCount} observations`,
      tone: 'inverse',
    },
  ]
})
const betaTopRows = computed(() =>
  [...betaHistoryPoints.value]
    .filter((point) => point.beta !== null)
    .sort((left, right) => (right.beta as number) - (left.beta as number))
    .slice(0, 5),
)
const betaBottomRows = computed(() =>
  [...betaHistoryPoints.value]
    .filter((point) => point.beta !== null)
    .sort((left, right) => (left.beta as number) - (right.beta as number))
    .slice(0, 5),
)
const betaDataDateRange = computed(() => {
  const first = betaHistoryPoints.value[0]
  const last = betaHistoryPoints.value.at(-1)
  if (first && last) return submittedBeta.allHistory ? last.date : `${first.date} - ${last.date}`
  return submittedBeta.allHistory ? 'All History' : `${submittedBeta.startDate || '-'} to ${submittedBeta.endDate || '-'}`
})
const hasBetaResults = computed(() => betaHistoryPoints.value.length > 0 || primaryRows.value.length > 0 || secondaryRows.value.length > 0)

function tableColumns(rows: Array<Record<string, unknown>>): AppDataTableColumn[] {
  const first = rows[0]
  if (!first) return []
  return Object.keys(first).map((key) => ({
    key,
    label: key === 'index' ? 'Ticker' : key,
    minWidth: key === 'Name' || key === 'index' ? 150 : 110,
    align: typeof first[key] === 'number' ? 'right' : 'left',
    format(value) {
      if (typeof value === 'number') return Number.isFinite(value) ? value.toFixed(3).replace(/\.?0+$/, '') : '-'
      if (value === undefined || value === null || value === '') return '-'
      return String(value)
    },
  }))
}

function numericDataKeys(rows: Array<Record<string, unknown>>, dateKey: string) {
  const keys = new Set<string>()
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (key !== dateKey && parseCpmNumber(row[key]) !== null) keys.add(key)
    })
  })
  return Array.from(keys)
}

function hasNumericData(rows: Array<Record<string, unknown>>, key: string) {
  return rows.some((row) => parseCpmNumber(row[key]) !== null)
}

function betaValueKey(rows: Array<Record<string, unknown>>, dateKey: string, comparisonSymbol: string) {
  const keys = numericDataKeys(rows, dateKey)
  const target = compactKey(comparisonSymbol)
  const excluded = /(price|close|adjclose|volatility|standarddeviation|stdev|stddev|sigma|corr|correlation|rho)/

  return keys.find((key) => compactKey(key) === target)
    ?? keys.find((key) => /beta/.test(compactKey(key)))
    ?? keys.find((key) => {
      const compact = compactKey(key)
      return target && compact.includes(target) && !excluded.test(compact)
    })
    ?? keys.find((key) => !excluded.test(compactKey(key)))
    ?? ''
}

function betaPriceKey(
  rows: Array<Record<string, unknown>>,
  dateKey: string,
  symbol: string,
  role: 'asset' | 'comparison',
  excludeKey = '',
) {
  const keys = numericDataKeys(rows, dateKey).filter((key) => key !== excludeKey)
  const target = compactKey(symbol)
  const isPriceKey = (key: string) => /(price|close|adjclose)/.test(compactKey(key))
  const symbolPriceKey = keys.find((key) => {
    const compact = compactKey(key)
    return isPriceKey(key) && target && (compact === `${target}price` || compact === `${target}close` || compact.includes(`${target}price`))
  })
  if (symbolPriceKey) return symbolPriceKey

  const candidates = role === 'asset'
    ? ['stock_price', 'stockPrice', 'Stock Price', 'benchmark_price', 'benchmarkPrice', 'asset_price', 'assetPrice', 'price', 'Price', 'close', 'Close', 'adj_close', 'Adj Close']
    : ['comparison_price', 'comparisonPrice', 'symbol_price', 'symbolPrice', `${symbol}_price`, `${symbol} Price`, 'benchmark_comparison_price']

  const candidate = candidates.find((key) => key !== excludeKey && keys.includes(key) && hasNumericData(rows, key))
  if (candidate) return candidate

  return keys.find((key) => {
    const compact = compactKey(key)
    if (!isPriceKey(key)) return false
    if (role === 'comparison') return !/(stock|asset|primary|benchmark)/.test(compact)
    return true
  }) ?? ''
}

function betaCorrelationKey(rows: Array<Record<string, unknown>>, dateKey: string) {
  return numericDataKeys(rows, dateKey).find((key) => /(corr|correlation|rho)/.test(compactKey(key))) ?? ''
}

function betaVolatilityKey(
  rows: Array<Record<string, unknown>>,
  dateKey: string,
  symbol: string,
  role: 'asset' | 'comparison',
) {
  const keys = numericDataKeys(rows, dateKey)
  const target = compactKey(symbol)
  const isVolatilityKey = (key: string) => /(volatility|standarddeviation|stdev|stddev|sigma)/.test(compactKey(key))
  const symbolVolatilityKey = keys.find((key) => {
    const compact = compactKey(key)
    return isVolatilityKey(key) && target && compact.includes(target)
  })
  if (symbolVolatilityKey) return symbolVolatilityKey

  const candidates = role === 'asset'
    ? ['stock_volatility', 'stockVolatility', 'benchmark_volatility', 'benchmarkVolatility', 'asset_volatility', 'assetVolatility']
    : ['comparison_volatility', 'comparisonVolatility', 'symbol_volatility', 'symbolVolatility']

  return candidates.find((key) => keys.includes(key) && hasNumericData(rows, key))
    ?? keys.find((key) => {
      const compact = compactKey(key)
      if (!isVolatilityKey(key)) return false
      if (role === 'comparison') return !/(stock|asset|primary|benchmark)/.test(compact)
      return true
    })
    ?? ''
}

function betaRegimeForValue(value: number | null): BetaRegime {
  if (value === null) return 'unknown'
  if (value > 1) return 'aggressive'
  if (value < 0) return 'inverse'
  return 'defensive'
}

function betaToneClass(tone: BetaRegime | 'neutral') {
  if (tone === 'aggressive') return 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300'
  if (tone === 'defensive') return 'bg-[var(--app-primary-soft)] text-[var(--app-primary)]'
  if (tone === 'inverse') return 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300'
  return 'bg-[var(--app-surface-muted)] text-[var(--app-text-secondary)]'
}

function formatBetaValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '-'
  return value.toFixed(2).replace(/\.?0+$/, '')
}

function formatBetaTableValue(value: number | null, decimals = 2) {
  if (value === null || !Number.isFinite(value)) return '-'
  return value.toFixed(decimals).replace(/\.?0+$/, '')
}

function formatPercentShare(count: number, total: number) {
  if (!total) return '-'
  return `${((count / total) * 100).toFixed(0)}%`
}

function assetStatsSortValue(row: AssetMatrixRow, key: AssetStatsSortKey) {
  if (key === 'name') return row.name
  if (key === 'ticker') return row.ticker
  return row[key]
}

function sortAssetStats(key: AssetStatsSortKey) {
  if (assetStatsSortKey.value === key) {
    assetStatsSortDirection.value = assetStatsSortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }

  assetStatsSortKey.value = key
  assetStatsSortDirection.value = key === 'name' || key === 'ticker' ? 'asc' : 'desc'
}

function assetStatsSortIcon(key: AssetStatsSortKey) {
  if (assetStatsSortKey.value !== key) return ArrowUpDown
  return assetStatsSortDirection.value === 'asc' ? ArrowUp : ArrowDown
}

function assetStatsAriaSort(key: AssetStatsSortKey) {
  if (assetStatsSortKey.value !== key) return 'none'
  return assetStatsSortDirection.value === 'asc' ? 'ascending' : 'descending'
}

function assetPairKey(left: string, right: string) {
  return [normalizeSymbolLabel(left), normalizeSymbolLabel(right)].sort().join('__')
}

function selectAssetPair(pair: AssetPair) {
  selectedAssetPairKey.value = pair.key
  isAssetPairModalOpen.value = true
}

function closeAssetPairModal() {
  isAssetPairModalOpen.value = false
}

function selectAssetMatrixCell(row: AssetMatrixRow, cell: AssetMatrixCell) {
  const key = assetPairKey(row.ticker, cell.key)
  const pair = assetPairCandidates.value.find((candidate) => candidate.key === key)
  if (pair) selectAssetPair(pair)
}

function isSelectedAssetCell(row: AssetMatrixRow, cell: AssetMatrixCell) {
  const selected = selectedAssetPair.value
  if (!selected || row.ticker === normalizeSymbolLabel(cell.key)) return false
  return selected.key === assetPairKey(row.ticker, cell.key)
}

function extractAssetLastUpdated(rows: Array<Record<string, unknown>>) {
  const value = textValue(rows.find((row) => row.last_updated)?.last_updated ?? rows[0]?.last_updated)
  if (!value) return ''
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return value.slice(0, 10)
  return new Date(timestamp).toISOString().slice(0, 10)
}

function formatAssetMonth(value: unknown) {
  const text = textValue(value)
  if (!text) return ''
  const timestamp = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00Z` : text)
  if (!Number.isFinite(timestamp)) return text
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(timestamp))
}

function monthSpan(startValue: unknown, endValue: unknown) {
  const startText = textValue(startValue)
  const endText = textValue(endValue)
  const start = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(startText) ? `${startText}T00:00:00Z` : startText)
  const end = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(endText) ? `${endText}T00:00:00Z` : endText)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null

  const startDate = new Date(start)
  const endDate = new Date(end)
  const months = (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 + (endDate.getUTCMonth() - startDate.getUTCMonth()) + 1
  return months > 0 ? months : null
}

function assetClassMeta(assetClass: string) {
  return assetClassPalette[assetClass] ?? { color: 'var(--app-text-muted)', soft: 'var(--app-surface-muted)' }
}

function assetClassStyle(assetClass: string) {
  const meta = assetClassMeta(assetClass)
  return {
    borderColor: meta.color,
    borderLeftColor: meta.color,
    backgroundColor: meta.soft,
  }
}

function assetClassPillStyle(assetClass: string) {
  const meta = assetClassMeta(assetClass)
  return {
    backgroundColor: meta.soft,
    color: meta.color,
  }
}

function assetPairStrength(value: number | null): { label: string; tone: CorrelationTone } {
  if (value === null) return { label: 'Pending data', tone: 'empty' }
  if (value >= 0.6) return { label: 'Strong positive', tone: 'positive' }
  if (value >= 0.2) return { label: 'Moderate positive', tone: 'positive' }
  if (value <= -0.6) return { label: 'Strong inverse relationship', tone: 'negative' }
  if (value <= -0.2) return { label: 'Moderate inverse relationship', tone: 'negative' }
  return { label: 'Near zero', tone: 'neutral' }
}

function assetPairBadgeClass(value: number | null) {
  return correlationBadgeClass(assetPairStrength(value).tone)
}

function formatAssetStat(value: number | null, decimals = 2) {
  if (value === null) return '-'
  return value.toFixed(decimals).replace(/\.?0+$/, '')
}

function extractRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    if (Array.isArray(record.data)) return extractRecordArray(record.data)
    if (Array.isArray(record.rows)) return extractRecordArray(record.rows)
    if (Array.isArray(record.result)) return extractRecordArray(record.result)
  }
  return []
}

function dataRowsByKeys(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const rows = extractRecordArray(data[key])
    if (rows.length) return rows
  }

  const compactTargets = keys.map(compactKey)
  for (const [key, value] of Object.entries(data)) {
    if (!compactTargets.includes(compactKey(key))) continue
    const rows = extractRecordArray(value)
    if (rows.length) return rows
  }

  return []
}

function buildPatternObservations(
  data: Record<string, unknown>,
  primary: Array<Record<string, unknown>>,
  secondary: Array<Record<string, unknown>>,
): PatternObservation[] {
  const alignedCandidates = [
    dataRowsByKeys(data, ['alignedRows', 'aligned_rows', 'aligned', 'observations', 'observationRows', 'comparisonRows']),
    dataRowsByKeys(data, ['corr_info', 'corr_matrix', 'data', 'result', 'results']),
    secondary,
    primary,
  ]

  const alignedRows = alignedCandidates.find((rows) => rows.length && rowsLookLikeAlignedPattern(rows)) ?? []
  if (alignedRows.length) return normalizeAlignedPatternRows(alignedRows)

  const referenceRows = patternPeriodRows(data, 'reference', primary, secondary)
  const comparisonRows = patternPeriodRows(data, 'comparison', primary, secondary)
  if (referenceRows.length && comparisonRows.length) return pairPatternPeriodRows(referenceRows, comparisonRows)

  return []
}

function patternPeriodRows(
  data: Record<string, unknown>,
  role: 'reference' | 'comparison',
  primary: Array<Record<string, unknown>>,
  secondary: Array<Record<string, unknown>>,
) {
  const keys = role === 'reference'
    ? ['reference', 'referenceData', 'reference_data', 'referenceRows', 'periodA', 'period_a', 'periodAData', 'period_a_data', 'period1', 'period_1', 'aData']
    : ['comparison', 'comparisonData', 'comparison_data', 'comparisonRows', 'periodB', 'period_b', 'periodBData', 'period_b_data', 'period2', 'period_2', 'bData']
  const keyedRows = dataRowsByKeys(data, keys)
  if (keyedRows.length && rowsLookLikeSinglePatternPeriod(keyedRows)) return keyedRows

  const roleTokens = role === 'reference'
    ? ['reference', 'ref', 'perioda', 'period1']
    : ['comparison', 'compare', 'comp', 'periodb', 'period2']
  for (const [key, value] of Object.entries(data)) {
    const compact = compactKey(key)
    if (!roleTokens.some((token) => compact.includes(token))) continue
    const rows = extractRecordArray(value)
    if (rows.length && rowsLookLikeSinglePatternPeriod(rows)) return rows
  }

  if (role === 'reference' && rowsLookLikeSinglePatternPeriod(primary)) return primary
  if (role === 'comparison' && rowsLookLikeSinglePatternPeriod(secondary)) return secondary
  return []
}

function rowsLookLikeAlignedPattern(rows: Array<Record<string, unknown>>) {
  const row = rows.find(Boolean)
  if (!row) return false
  const referenceSignal = patternRoleFieldKey(row, 'reference', 'date')
    || patternRoleFieldKey(row, 'reference', 'price')
    || patternRoleFieldKey(row, 'reference', 'normalized')
  const comparisonSignal = patternRoleFieldKey(row, 'comparison', 'date')
    || patternRoleFieldKey(row, 'comparison', 'price')
    || patternRoleFieldKey(row, 'comparison', 'normalized')
  return Boolean(referenceSignal && comparisonSignal)
}

function rowsLookLikeSinglePatternPeriod(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return false
  const dateKey = rollingDateKey(rows)
  const priceKey = patternPeriodPriceKey(rows, dateKey)
  const normalizedKey = patternPeriodNormalizedKey(rows, dateKey, priceKey)
  return Boolean(dateKey && (priceKey || normalizedKey))
}

function patternRoleFieldKey(row: Record<string, unknown>, role: 'reference' | 'comparison', kind: 'date' | 'price' | 'normalized' | 'bar') {
  const keys = Object.keys(row)
  const exact = patternExactFieldKeys(role, kind)
  const exactMatch = keys.find((key) => exact.includes(compactKey(key)))
  if (exactMatch) return exactMatch

  const roleTokens = role === 'reference'
    ? ['reference', 'ref', 'perioda', 'period1', 'base', 'left']
    : ['comparison', 'compare', 'comp', 'periodb', 'period2', 'match', 'right']
  const kindTokens = kind === 'date'
    ? ['date', 'time', 'datetime', 'timestamp']
    : kind === 'price'
      ? ['price', 'close', 'adjclose', 'value']
      : kind === 'bar'
        ? ['bar', 'index', 'number']
        : ['normalized', 'normalised', 'indexed', 'indexvalue', 'cumreturn', 'return']

  return keys.find((key) => {
    const compact = compactKey(key)
    return roleTokens.some((token) => compact.includes(token))
      && kindTokens.some((token) => compact.includes(token))
  }) ?? ''
}

function patternExactFieldKeys(role: 'reference' | 'comparison', kind: 'date' | 'price' | 'normalized' | 'bar') {
  const side = role === 'reference' ? 'a' : 'b'
  const period = role === 'reference' ? 'perioda' : 'periodb'
  const roleName = role === 'reference' ? 'reference' : 'comparison'
  const aliases = role === 'reference' ? ['ref'] : ['compare', 'comp']
  const kindAliases = kind === 'date'
    ? ['date', 'time', 'datetime', 'timestamp']
    : kind === 'price'
      ? ['price', 'close', 'adjclose', 'value']
      : kind === 'bar'
        ? ['bar', 'barnumber', 'alignedbar']
        : ['normalized', 'normalised', 'indexed', 'index', 'return', 'normalizedvalue']
  const roleAliases = [side, period, roleName, ...aliases]
  return roleAliases.flatMap((prefix) => kindAliases.flatMap((suffix) => [
    `${prefix}${suffix}`,
    `${suffix}${prefix}`,
  ]))
}

function patternBarKey(rows: Array<Record<string, unknown>>, dateKey = '') {
  const row = rows[0]
  if (!row) return ''
  const candidates = ['aligned_bar', 'alignedBar', 'bar', 'Bar', 'bar_num', 'barNumber', 'index']
  return candidates.find((key) => key !== dateKey && key in row && rows.some((item) => parseCpmNumber(item[key]) !== null))
    ?? Object.keys(row).find((key) => key !== dateKey && /^(aligned)?bar(number|num)?$|^index$/i.test(key) && rows.some((item) => parseCpmNumber(item[key]) !== null))
    ?? ''
}

function patternPeriodPriceKey(rows: Array<Record<string, unknown>>, dateKey: string) {
  const keys = numericDataKeys(rows, dateKey)
  const candidates = ['price', 'Price', 'close', 'Close', 'adj_close', 'Adj Close', 'stock_price', 'stockPrice']
  const exact = candidates.find((key) => keys.includes(key) && hasNumericData(rows, key))
  if (exact) return exact

  return keys.find((key) => {
    const compact = compactKey(key)
    return /(price|close|adjclose|value)/.test(compact) && !/(norm|index|return|corr)/.test(compact)
  }) ?? ''
}

function patternPeriodNormalizedKey(rows: Array<Record<string, unknown>>, dateKey: string, priceKey = '') {
  const keys = numericDataKeys(rows, dateKey).filter((key) => key !== priceKey)
  const candidates = ['normalized', 'Normalized', 'normalized_return', 'normalizedReturn', 'indexed', 'Indexed', 'index_value', 'Index Value']
  const exact = candidates.find((key) => keys.includes(key) && hasNumericData(rows, key))
  if (exact) return exact

  return keys.find((key) => /(norm|index|return)/.test(compactKey(key)) && !/(price|close|corr)/.test(compactKey(key))) ?? ''
}

function normalizeAlignedPatternRows(rows: Array<Record<string, unknown>>): PatternObservation[] {
  const first = rows[0] ?? {}
  const referenceDateKey = patternRoleFieldKey(first, 'reference', 'date')
  const referencePriceKey = patternRoleFieldKey(first, 'reference', 'price')
  const referenceNormalizedKey = patternRoleFieldKey(first, 'reference', 'normalized')
  const comparisonDateKey = patternRoleFieldKey(first, 'comparison', 'date')
  const comparisonPriceKey = patternRoleFieldKey(first, 'comparison', 'price')
  const comparisonNormalizedKey = patternRoleFieldKey(first, 'comparison', 'normalized')
  const barKey = patternBarKey(rows, referenceDateKey || comparisonDateKey)
  const referenceFirstPrice = firstNumericValue(rows, referencePriceKey)
  const comparisonFirstPrice = firstNumericValue(rows, comparisonPriceKey)
  const referenceMode = normalizedValueMode(rows.map((row) => parseCpmNumber(row[referenceNormalizedKey])).filter((value): value is number => value !== null))
  const comparisonMode = normalizedValueMode(rows.map((row) => parseCpmNumber(row[comparisonNormalizedKey])).filter((value): value is number => value !== null))

  return rows.map((row, index) => {
    const bar = Math.trunc(parseCpmNumber(row[barKey]) ?? index + 1)
    const reference = patternPointFromRow(row, bar, referenceDateKey, referencePriceKey, referenceNormalizedKey, referenceFirstPrice, referenceMode)
    const comparison = patternPointFromRow(row, bar, comparisonDateKey, comparisonPriceKey, comparisonNormalizedKey, comparisonFirstPrice, comparisonMode)
    return {
      bar,
      reference,
      comparison,
      difference: patternDifference(reference?.normalized ?? null, comparison?.normalized ?? null),
    }
  }).filter((row) => row.reference || row.comparison)
}

function pairPatternPeriodRows(referenceRows: Array<Record<string, unknown>>, comparisonRows: Array<Record<string, unknown>>): PatternObservation[] {
  const referencePoints = normalizeSinglePatternPeriodRows(referenceRows)
  const comparisonPoints = normalizeSinglePatternPeriodRows(comparisonRows)
  const length = Math.min(referencePoints.length, comparisonPoints.length)

  return Array.from({ length }, (_, index) => {
    const bar = index + 1
    const reference = { ...referencePoints[index], alignedBar: bar }
    const comparison = { ...comparisonPoints[index], alignedBar: bar }
    return {
      bar,
      reference,
      comparison,
      difference: patternDifference(reference.normalized, comparison.normalized),
    }
  })
}

function normalizeSinglePatternPeriodRows(rows: Array<Record<string, unknown>>): PatternPeriodPoint[] {
  const dateKey = rollingDateKey(rows)
  const priceKey = patternPeriodPriceKey(rows, dateKey)
  const normalizedKey = patternPeriodNormalizedKey(rows, dateKey, priceKey)
  const barKey = patternBarKey(rows, dateKey)
  const firstPrice = firstNumericValue(rows, priceKey)
  const normalizedMode = normalizedValueMode(rows.map((row) => parseCpmNumber(row[normalizedKey])).filter((value): value is number => value !== null))

  return rows
    .map((row, index) => patternPointFromRow(
      row,
      Math.trunc(parseCpmNumber(row[barKey]) ?? index + 1),
      dateKey,
      priceKey,
      normalizedKey,
      firstPrice,
      normalizedMode,
    ))
    .filter((point): point is PatternPeriodPoint => point !== null)
    .sort((left, right) => {
      if (left.timestamp !== null && right.timestamp !== null) return left.timestamp - right.timestamp
      return left.alignedBar - right.alignedBar
    })
}

function patternPointFromRow(
  row: Record<string, unknown>,
  alignedBar: number,
  dateKey: string,
  priceKey: string,
  normalizedKey: string,
  firstPrice: number | null,
  normalizedMode: 'index' | 'return' | 'ratio',
): PatternPeriodPoint | null {
  const timestamp = dateKey ? timestampFromValue(row[dateKey]) : null
  const price = priceKey ? parseCpmNumber(row[priceKey]) : null
  const rawNormalized = normalizedKey ? parseCpmNumber(row[normalizedKey]) : null
  const normalized = firstPrice && price !== null
    ? (price / firstPrice) * 100
    : rawNormalized !== null ? normalizeIndexedValue(rawNormalized, normalizedMode) : null
  const date = dateKey && timestamp !== null ? dateLabel(row[dateKey], timestamp) : textValue(row[dateKey])

  if (timestamp === null && price === null && normalized === null) return null
  return {
    alignedBar,
    timestamp,
    date,
    price,
    normalized,
  }
}

function firstNumericValue(rows: Array<Record<string, unknown>>, key: string) {
  if (!key) return null
  return rows.map((row) => parseCpmNumber(row[key])).find((value): value is number => value !== null && value !== 0) ?? null
}

function normalizedValueMode(values: number[]): 'index' | 'return' | 'ratio' {
  const first = values.find((value) => Number.isFinite(value))
  if (first === undefined) return 'index'
  const maxAbs = Math.max(...values.map((value) => Math.abs(value)), Math.abs(first))
  if (Math.abs(first - 1) <= 0.15 && maxAbs <= 4) return 'ratio'
  if (Math.abs(first) <= 5 && maxAbs <= 80) return 'return'
  return 'index'
}

function normalizeIndexedValue(value: number, mode: 'index' | 'return' | 'ratio') {
  if (mode === 'ratio') return value * 100
  if (mode === 'return') return value + 100
  return value
}

function patternDifference(reference: number | null, comparison: number | null) {
  if (reference === null || comparison === null) return null
  return reference - comparison
}

function patternCorrelationDecimal(rawValue: unknown, observations: PatternObservation[]) {
  const parsed = parseCpmNumber(rawValue)
  if (parsed !== null) return Math.max(-1, Math.min(1, Math.abs(parsed) > 1 ? parsed / 100 : parsed))
  return pearsonPatternCorrelation(observations)
}

function pearsonPatternCorrelation(observations: PatternObservation[]) {
  const levels = observations
    .map((row) => [row.reference?.normalized ?? null, row.comparison?.normalized ?? null] as const)
  const pairs = levels.slice(1).map((pair, index) => {
    const previous = levels[index]
    if (!previous || previous[0] === null || previous[1] === null || !previous[0] || !previous[1] || pair[0] === null || pair[1] === null) return [null, null] as const
    return [pair[0] / previous[0] - 1, pair[1] / previous[1] - 1] as const
  })
    .filter((pair): pair is readonly [number, number] => pair[0] !== null && pair[1] !== null)
  if (pairs.length < 2) return null

  const leftMean = pairs.reduce((sum, pair) => sum + pair[0], 0) / pairs.length
  const rightMean = pairs.reduce((sum, pair) => sum + pair[1], 0) / pairs.length
  let numerator = 0
  let leftVariance = 0
  let rightVariance = 0

  pairs.forEach(([left, right]) => {
    const leftDelta = left - leftMean
    const rightDelta = right - rightMean
    numerator += leftDelta * rightDelta
    leftVariance += leftDelta ** 2
    rightVariance += rightDelta ** 2
  })

  const denominator = Math.sqrt(leftVariance * rightVariance)
  if (!denominator) return null
  return Math.max(-1, Math.min(1, numerator / denominator))
}

function patternSimilarityStrength(value: number | null): { label: string; tone: CorrelationTone } {
  if (value === null) return { label: 'Pending data', tone: 'empty' }
  const abs = Math.abs(value)
  const direction = value < 0 ? 'inverse' : 'positive'
  const tone = value < 0 ? 'negative' : value > 0.15 ? 'positive' : 'neutral'
  if (abs >= 0.7) return { label: `Strong ${direction} correlation`, tone }
  if (abs >= 0.4) return { label: `Moderate ${direction} correlation`, tone }
  if (abs >= 0.15) return { label: `Weak ${direction} correlation`, tone }
  return { label: 'Low correlation', tone: 'neutral' }
}

function formatPatternPrice(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-'
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatPatternNumber(value: number | null | undefined, decimals = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-'
  return value.toFixed(decimals).replace(/\.?0+$/, '')
}

function patternReturnSinceStart(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  return value - 100
}

function formatPatternReturn(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-'
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

function formatPatternGap(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-'
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)} pp`
}

function patternReturnTone(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return ''
  return value < 0 ? 'pattern-negative' : 'pattern-valid'
}

function formatPatternDate(value: string | undefined) {
  if (!value) return '-'
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function patternPeriodValid(startDate: string, endDate: string, bars: number) {
  return Boolean(startDate && endDate && startDate <= endDate && Number.isInteger(Number(bars)) && Number(bars) >= 5 && Number(bars) <= 252)
}

function selectPatternObservationByAlignedX(x: number) {
  const rows = patternObservations.value
  if (!rows.length || !Number.isFinite(x)) return
  const rounded = Math.round(x)
  const index = rows.findIndex((row) => row.bar === rounded)
  selectedPatternObservationIndex.value = index >= 0
    ? index
    : Math.max(0, Math.min(rounded - 1, rows.length - 1))
}

function textValue(value: unknown) {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

function normalizeSymbolLabel(value: unknown) {
  return textValue(value).toUpperCase()
}

function compactKey(value: unknown) {
  return textValue(value).toLowerCase().replace(/[^a-z0-9]/g, '')
}

function uniqueSymbolList(values: string[]) {
  const seen = new Set<string>()
  return values
    .map(normalizeSymbolLabel)
    .filter((value) => {
      if (!value || seen.has(value)) return false
      seen.add(value)
      return true
    })
}

function displayFieldLabel(value: string) {
  return value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || value
}

function pairLabel(symbol: string) {
  return `${normalizedBenchmark.value} vs ${normalizeSymbolLabel(symbol)}`
}

function pairSlashLabel(symbol: string) {
  return `${normalizedBenchmark.value} / ${normalizeSymbolLabel(symbol)}`
}

function matrixLabelKey(row: Record<string, unknown>) {
  const candidates = ['index', 'ticker', 'Ticker', 'symbol', 'Symbol', 'name', 'Name']
  return candidates.find((key) => key in row)
    ?? Object.keys(row).find((key) => parseCpmNumber(row[key]) === null)
    ?? ''
}

function matrixRowLabel(row: Record<string, unknown>) {
  const labelKey = matrixLabelKey(row)
  return normalizeSymbolLabel(labelKey ? row[labelKey] : '')
}

function matrixColumnKey(row: Record<string, unknown>, symbol: string) {
  const target = compactKey(symbol)
  const labelKey = matrixLabelKey(row)
  const keys = Object.keys(row).filter((key) => key !== labelKey)
  return keys.find((key) => compactKey(key) === target)
    ?? keys.find((key) => compactKey(key).includes(target))
    ?? ''
}

function matrixValueForPair(symbol: string) {
  const benchmark = normalizedBenchmark.value
  const target = normalizeSymbolLabel(symbol)
  const benchmarkRow = primaryRows.value.find((row) => matrixRowLabel(row) === benchmark)
  const targetRow = primaryRows.value.find((row) => matrixRowLabel(row) === target)
  const benchmarkColumn = benchmarkRow ? matrixColumnKey(benchmarkRow, target) : ''
  const targetColumn = targetRow ? matrixColumnKey(targetRow, benchmark) : ''
  return parseCpmNumber(benchmarkRow?.[benchmarkColumn]) ?? parseCpmNumber(targetRow?.[targetColumn])
}

function correlationTone(value: number | null): CorrelationTone {
  if (value === null) return 'empty'
  if (Math.abs(value) < 0.2) return 'neutral'
  return value > 0 ? 'positive' : 'negative'
}

function correlationStrength(value: number | null): { label: string; tone: CorrelationTone } {
  const tone = correlationTone(value)
  if (value === null) return { label: 'Pending data', tone }

  const abs = Math.abs(value)
  const direction = value > 0 ? 'positive' : value < 0 ? 'negative' : 'flat'
  if (abs < 0.2) return { label: 'Weak / near zero', tone }
  if (abs < 0.5) return { label: `Moderate ${direction}`, tone }
  return { label: `Strong ${direction}`, tone }
}

function formatCorrelationValue(value: unknown) {
  const number = parseCpmNumber(value)
  if (number === null) return '-'
  return number.toFixed(2)
}

function correlationBadgeClass(tone: CorrelationTone) {
  if (tone === 'positive') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'
  if (tone === 'negative') return 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300'
  if (tone === 'neutral') return 'bg-[var(--app-primary-soft)] text-[var(--app-primary)]'
  return 'bg-[var(--app-surface-muted)] text-[var(--app-text-muted)]'
}

function matrixCellStyle(value: number | null) {
  if (value === null) return {}
  const normalized = Math.max(-1, Math.min(1, value))
  const alpha = (0.06 + Math.abs(normalized) * 0.24).toFixed(3)
  const color = normalized >= 0 ? '0, 108, 255' : '190, 18, 60'
  return {
    backgroundColor: `rgba(${color}, ${alpha})`,
  }
}

function rollingDateKey(rows: Array<Record<string, unknown>>) {
  const candidates = ['Date', 'date', 'datetime', 'Datetime', 'time', 'Time', 'timestamp', 'Timestamp']
  const rowWithDate = rows.find((row) => candidates.some((key) => key in row))
  const candidate = rowWithDate ? candidates.find((key) => key in rowWithDate) : ''
  if (candidate) return candidate

  const first = rows[0]
  return first
    ? Object.keys(first).find((key) => timestampFromValue(first[key]) !== null) ?? ''
    : ''
}

function rollingPriceKey(rows: Array<Record<string, unknown>>, dateKey: string) {
  const candidates = [
    'stock_price',
    'stockPrice',
    'Stock Price',
    'benchmark_price',
    'benchmarkPrice',
    'price',
    'Price',
    'close',
    'Close',
    'adj_close',
    'Adj Close',
  ]
  const rowWithPrice = rows.find((row) => candidates.some((key) => key in row && parseCpmNumber(row[key]) !== null))
  const candidate = rowWithPrice ? candidates.find((key) => key in rowWithPrice && parseCpmNumber(rowWithPrice[key]) !== null) : ''
  if (candidate && candidate !== dateKey) return candidate

  const first = rows[0]
  if (!first) return ''
  return Object.keys(first).find((key) => {
    if (key === dateKey) return false
    const compact = compactKey(key)
    if (!/(stock|benchmark)?price|close/.test(compact)) return false
    return rows.some((row) => parseCpmNumber(row[key]) !== null)
  }) ?? ''
}

function rollingValueKeys(rows: Array<Record<string, unknown>>, dateKey: string) {
  const keys = new Set<string>()
  const priceKey = rollingPriceKey(rows, dateKey)
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (key === priceKey) return
      if (key !== dateKey) keys.add(key)
    })
  })

  return Array.from(keys).filter((key) => {
    const values = rows
      .map((row) => parseCpmNumber(row[key]))
      .filter((value): value is number => value !== null)
    if (!values.length) return false
    if (/corr|correlation|rho|rolling/i.test(key)) return true
    return values.every((value) => Math.abs(value) <= 1.25)
  })
}

function symbolForRollingKey(key: string, index: number, keyCount: number) {
  const keyName = compactKey(key)
  const matchedSymbol = symbolComparisonSymbols.value.find((symbol) => keyName.includes(compactKey(symbol)))
  if (matchedSymbol) return matchedSymbol
  if (symbolComparisonSymbols.value.length === keyCount) return symbolComparisonSymbols.value[index] ?? key
  if (symbolComparisonSymbols.value.length === 1) return symbolComparisonSymbols.value[0]
  return displayFieldLabel(key)
}

function rollingSeriesForSymbol(symbol: string) {
  const target = compactKey(symbol)
  return symbolRollingSeries.value.find((series) => compactKey(series.symbol) === target)
    ?? symbolRollingSeries.value.find((series) => compactKey(series.name).includes(target))
    ?? null
}

function timestampFromValue(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    if (value > 1_000_000_000_000) return value
    if (value > 1_000_000_000) return value * 1000
  }

  const text = textValue(value)
  const timestamp = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00Z` : text)
  return Number.isFinite(timestamp) ? timestamp : null
}

function dateLabel(value: unknown, timestamp: number) {
  const raw = textValue(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(timestamp))
}

function comparisonList(value = shared.comparisonSymbols) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5)
}

function setComparisonSymbols(symbols: string[]) {
  shared.comparisonSymbols = uniqueSymbolList(symbols).slice(0, 5).join(', ')
}

function addComparisonSymbol(option: SearchSelectOption) {
  const symbol = normalizeSymbolLabel(option.value)
  if (!symbol) return

  const current = formComparisonSymbols.value
  if (current.includes(symbol) || current.length >= 5) {
    compareSymbolDraft.value = ''
    void nextTick(() => {
      compareSymbolDraft.value = ''
    })
    return
  }

  setComparisonSymbols([...current, symbol])
  compareSymbolDraft.value = ''
  void nextTick(() => {
    compareSymbolDraft.value = ''
  })
}

function removeComparisonSymbol(symbol: string) {
  const target = normalizeSymbolLabel(symbol)
  setComparisonSymbols(formComparisonSymbols.value.filter((item) => item !== target))
}

function sharedDatePayload(allHistory = shared.allHistory, startDate = shared.startDate, endDate = shared.endDate) {
  return allHistory
    ? { start_date: '1800-10-01', end_date: today }
    : { start_date: startDate, end_date: endDate }
}

function currentSymbolSnapshot() {
  return {
    benchmark: shared.benchmark,
    comparisonSymbols: shared.comparisonSymbols,
    startDate: shared.startDate,
    endDate: shared.endDate,
    allHistory: shared.allHistory,
    rollWindow: shared.rollWindow,
  }
}

function applySubmittedSymbolSnapshot(snapshot: ReturnType<typeof currentSymbolSnapshot>) {
  submittedSymbol.benchmark = snapshot.benchmark
  submittedSymbol.comparisonSymbols = snapshot.comparisonSymbols
  submittedSymbol.startDate = snapshot.startDate
  submittedSymbol.endDate = snapshot.endDate
  submittedSymbol.allHistory = snapshot.allHistory
  submittedSymbol.rollWindow = snapshot.rollWindow

  const symbols = uniqueSymbolList(comparisonList(snapshot.comparisonSymbols))
  if (!symbols.length) {
    selectedPairSymbol.value = ''
    return
  }
  if (!symbols.includes(selectedPairSymbol.value)) selectedPairSymbol.value = symbols[0]
}

function currentBetaSnapshot(): BetaSnapshot {
  return {
    benchmark: shared.benchmark,
    symbol: shared.symbol,
    startDate: shared.startDate,
    endDate: shared.endDate,
    allHistory: shared.allHistory,
    rollWindow: shared.rollWindow,
  }
}

function applySubmittedBetaSnapshot(snapshot: BetaSnapshot) {
  submittedBeta.benchmark = snapshot.benchmark
  submittedBeta.symbol = snapshot.symbol
  submittedBeta.startDate = snapshot.startDate
  submittedBeta.endDate = snapshot.endDate
  submittedBeta.allHistory = snapshot.allHistory
  submittedBeta.rollWindow = snapshot.rollWindow
}

function currentPatternSnapshot(): PatternSnapshot {
  return {
    referenceSymbol: pattern.referenceSymbol,
    referenceStartDate: pattern.referenceStartDate,
    referenceEndDate: pattern.referenceEndDate,
    comparisonSymbol: pattern.comparisonSymbol,
    comparisonStartDate: pattern.comparisonStartDate,
    comparisonEndDate: pattern.comparisonEndDate,
    referenceBarsNum: Number(pattern.referenceBarsNum) || 0,
    comparisonBarsNum: Number(pattern.comparisonBarsNum) || 0,
  }
}

function applySubmittedPatternSnapshot(snapshot: PatternSnapshot) {
  submittedPattern.referenceSymbol = snapshot.referenceSymbol
  submittedPattern.referenceStartDate = snapshot.referenceStartDate
  submittedPattern.referenceEndDate = snapshot.referenceEndDate
  submittedPattern.comparisonSymbol = snapshot.comparisonSymbol
  submittedPattern.comparisonStartDate = snapshot.comparisonStartDate
  submittedPattern.comparisonEndDate = snapshot.comparisonEndDate
  submittedPattern.referenceBarsNum = snapshot.referenceBarsNum
  submittedPattern.comparisonBarsNum = snapshot.comparisonBarsNum
}

function swapPatternPeriods() {
  const snapshot = currentPatternSnapshot()
  pattern.referenceSymbol = snapshot.comparisonSymbol
  pattern.referenceStartDate = snapshot.comparisonStartDate
  pattern.referenceEndDate = snapshot.comparisonEndDate
  pattern.referenceBarsNum = snapshot.comparisonBarsNum
  pattern.comparisonSymbol = snapshot.referenceSymbol
  pattern.comparisonStartDate = snapshot.referenceStartDate
  pattern.comparisonEndDate = snapshot.referenceEndDate
  pattern.comparisonBarsNum = snapshot.referenceBarsNum
}

function isoYearsAgo(years: number) {
  const date = new Date()
  date.setFullYear(date.getFullYear() - years)
  return date.toISOString().slice(0, 10)
}

function applySymbolQuickYear(years: number) {
  shared.allHistory = false
  shared.endDate = today
  shared.startDate = isoYearsAgo(years)
}

function activeSymbolQuickYear() {
  if (shared.allHistory || shared.endDate !== today || !shared.startDate) return null
  return [1, 2, 3, 5].find((years) => shared.startDate === isoYearsAgo(years)) ?? null
}

async function submit() {
  if (props.section === 'pattern' && !patternCalendarRangeValid(pattern.referenceStartDate, pattern.referenceEndDate, pattern.comparisonStartDate, pattern.comparisonEndDate)) {
    errorMessage.value = 'The selected date ranges differ substantially in length. Please adjust your dates.'
    return
  }
  loading.value = true
  errorMessage.value = ''
  const symbolSnapshot = props.section === 'symbol' ? currentSymbolSnapshot() : null
  const betaSnapshot = props.section === 'transmission' ? currentBetaSnapshot() : null
  const patternSnapshot = props.section === 'pattern' ? currentPatternSnapshot() : null
  try {
    if (props.section === 'asset') {
      result.value = await runAssetCorrelation({ start_date: asset.startDate, end_date: asset.endDate })
    } else if (props.section === 'pattern') {
      const snapshot = patternSnapshot ?? currentPatternSnapshot()
      result.value = await runPatternCorrelation({
        referenceSymbol: snapshot.referenceSymbol,
        referenceStartDate: snapshot.referenceStartDate,
        referenceEndDate: snapshot.referenceEndDate,
        comparisonSymbol: snapshot.comparisonSymbol,
        comparisonStartDate: snapshot.comparisonStartDate,
        comparisonEndDate: snapshot.comparisonEndDate,
        referenceBarsNum: snapshot.referenceBarsNum,
        comparisonBarsNum: snapshot.comparisonBarsNum,
      })
      applySubmittedPatternSnapshot(snapshot)
      if (result.value.code === 211 || score.value) {
        const reference = snapshot.referenceSymbol === 'SPX' ? patternCalendar.value : await fetchPatternPrices(snapshot.referenceSymbol)
        const comparison = snapshot.comparisonSymbol === 'SPX' ? patternCalendar.value : await fetchPatternPrices(snapshot.comparisonSymbol)
        result.value.data.reference = reference.filter(row => row.Date >= snapshot.referenceStartDate && row.Date <= snapshot.referenceEndDate)
        result.value.data.comparison = comparison.filter(row => row.Date >= snapshot.comparisonStartDate && row.Date <= snapshot.comparisonEndDate)
      }
    } else if (props.section === 'transmission') {
      const snapshot = betaSnapshot ?? currentBetaSnapshot()
      result.value = await runBetaAnalyzer({
        ...sharedDatePayload(snapshot.allHistory, snapshot.startDate, snapshot.endDate),
        benchmark: snapshot.benchmark,
        symbol: snapshot.symbol,
        stock_comparison: JSON.stringify([snapshot.symbol]),
        roll_window: snapshot.rollWindow,
      })
      applySubmittedBetaSnapshot(snapshot)
    } else {
      const snapshot = symbolSnapshot ?? currentSymbolSnapshot()
      result.value = await runSymbolCorrelation({
        ...sharedDatePayload(snapshot.allHistory, snapshot.startDate, snapshot.endDate),
        benchmark: snapshot.benchmark,
        stock_comparison: JSON.stringify(comparisonList(snapshot.comparisonSymbols)),
        roll_window: snapshot.rollWindow,
      })
      applySubmittedSymbolSnapshot(snapshot)
    }

    if (!hasResults.value) errorMessage.value = result.value?.message || 'No results found.'
  } catch {
    errorMessage.value = 'Could not load comparison data. Please try again.'
  } finally {
    loading.value = false
  }
}

async function loadAssetDefaults() {
  if (props.section !== 'asset') return
  loading.value = true
  errorMessage.value = ''
  try {
    result.value = await fetchAssetCorrelation()
    const lastUpdated = extractAssetLastUpdated(result.value.matrixRows)
    if (lastUpdated) asset.endDate = lastUpdated
    if (!hasResults.value) errorMessage.value = 'No results found.'
  } finally {
    loading.value = false
  }
}

function resetForm() {
  result.value = null
  errorMessage.value = ''
  shared.benchmark = 'AAPL'
  shared.symbol = 'SPY'
  shared.comparisonSymbols = 'AADI, AAN'
  shared.startDate = ''
  shared.endDate = today
  shared.allHistory = true
  shared.rollWindow = 21
  applySubmittedSymbolSnapshot(currentSymbolSnapshot())
  applySubmittedBetaSnapshot(currentBetaSnapshot())
  selectedAssetPairKey.value = ''
  isAssetPairModalOpen.value = false
  assetSearchQuery.value = ''
  asset.startDate = '2008-01-01'
  asset.endDate = today
  pattern.referenceSymbol = 'SPX'
  pattern.referenceStartDate = ''
  pattern.referenceEndDate = ''
  pattern.comparisonSymbol = 'SPX'
  pattern.comparisonStartDate = ''
  pattern.comparisonEndDate = ''
  pattern.referenceBarsNum = 252
  pattern.comparisonBarsNum = 252
  applySubmittedPatternSnapshot(currentPatternSnapshot())
  selectedPatternObservationIndex.value = 0
  if (props.section === 'pattern') {
    if (patternCalendar.value.length) setPatternDefaults()
    else void loadPatternCalendar()
  }
  void loadAssetDefaults()
}

function downloadResults() {
  const rows = props.section === 'pattern' && patternObservationRows.value.length
    ? patternObservationRows.value
    : props.section === 'transmission' && secondaryRows.value.length
    ? secondaryRows.value
    : primaryRows.value.length ? primaryRows.value : secondaryRows.value
  const columns = tableColumns(rows)
  if (!rows.length || !columns.length) return
  const headers = columns.map((column) => column.label)
  const csvRows = rows.map((row) => columns.map((column) => row[column.key]))
  const isoDate = new Date().toISOString().slice(0, 10)
  downloadCsv(cpmCsvFilename(sectionTitle.value, isoDate), toCsv(headers, csvRows))
}

watch(
  () => props.section,
  (section) => {
    resetForm()
    if (section === 'symbol' || section === 'transmission') void submit()
    if (section === 'pattern') void autoRunPatternComparison()
  },
)

watch(
  symbolComparisonSymbols,
  (symbols) => {
    if (!symbols.length) {
      selectedPairSymbol.value = ''
      return
    }
    if (!symbols.includes(selectedPairSymbol.value)) selectedPairSymbol.value = symbols[0]
  },
  { immediate: true },
)

onMounted(() => {
  void autoRunPatternComparison()
  void loadAssetDefaults()
  if (props.section === 'symbol' || props.section === 'transmission') void submit()
})
</script>

<template>
  <div class="px-4 pb-4">
    <template v-if="props.section === 'pattern'">
      <div class="pattern-workspace">
        <div class="pattern-length">
          <label for="comparison-length">Comparison Length</label>
          <input id="comparison-length" v-model.number="pattern.referenceBarsNum" type="number" min="5" max="252" :disabled="patternCalendarLoading || loading" @input="calculatePatternBars" />
          <strong>bars</strong>
          <span class="pattern-length-lock">Equal length for both periods</span>
          <span class="pattern-subtitle">End dates are calculated from available trading bars.</span>
        </div>
        <div class="pattern-periods">
          <template v-for="(side, index) in (['reference', 'comparison'] as const)" :key="side">
            <section class="pattern-period">
              <h3 :class="index ? 'pattern-b' : 'pattern-a'">Period {{ index ? 'B (Purple)' : 'A (Blue)' }}</h3>
              <div class="pattern-fields">
                <label>Symbol<SearchSelect v-model="pattern[`${side}Symbol`]" :options="symbolSearchOptions" :aria-label="`Period ${index ? 'B' : 'A'} symbol`" /></label>
                <label>Date Range<span class="pattern-date-range"><input v-model="pattern[`${side}StartDate`]" type="date" :max="today" :disabled="patternCalendarLoading || loading" @change="onPatternStartDateChange(side)" /><span aria-hidden="true">→</span><input :value="pattern[`${side}EndDate`]" type="text" readonly :aria-label="`Period ${index ? 'B' : 'A'} automatic end date`" placeholder="Unavailable" /></span></label>
              </div>
              <p class="pattern-period-caption">{{ patternCalendarLoading ? 'Loading trading calendar...' : pattern[`${side}EndDate`] ? 'End date adjusts automatically to the shared bar count.' : 'Not enough available trading bars for this start date.' }}</p>
            </section>
            <div v-if="index === 0" class="pattern-swap">
              <button type="button" title="Swap periods" aria-label="Swap periods" @click="swapPatternPeriods" :disabled="loading"><ArrowUpDown :size="19" /></button>
              <span>Swap</span>
            </div>
          </template>
        </div>
        <div class="pattern-actions">
          <div class="pattern-aligned-status">
            <Info :size="17" />
            Periods are matched by trading-bar position, not calendar date.
          </div>
          <button type="button" class="pattern-run" @click="submit" :disabled="loading || patternCalendarLoading || !patternPeriodsSameLength || !pattern.referenceSymbol.trim() || !pattern.comparisonSymbol.trim() || !patternPeriodValid(pattern.referenceStartDate, pattern.referenceEndDate, pattern.referenceBarsNum) || !patternPeriodValid(pattern.comparisonStartDate, pattern.comparisonEndDate, pattern.comparisonBarsNum)"><Play :size="17" />{{ loading ? 'Comparing...' : 'Compare Periods' }}</button>
        </div>
        <p v-if="errorMessage" role="alert" class="pattern-status">{{ errorMessage }}</p>
        <section class="pattern-score">
          <h3>Return Correlation</h3>
          <strong :class="patternCorrelationValue !== null && patternCorrelationValue < 0 ? 'pattern-negative' : 'pattern-valid'">{{ patternCorrelationPercent }}</strong>
          <span class="pattern-score-decimal">({{ patternCorrelationText }})</span>
          <span class="pattern-badge" :class="correlationBadgeClass(patternStrength.tone)">{{ patternStrength.label }}</span>
          <span class="pattern-score-bars">{{ patternAlignedBars }} aligned bars</span>
          <p class="pattern-score-note">Shows how closely returns move together. High correlation does not mean equal total gains.</p>
        </section>
        <div class="pattern-analysis" :aria-busy="loading">
          <section class="pattern-chart pattern-performance">
            <div class="pattern-chart-heading">
              <h3>Performance Comparison <span class="pattern-subtitle">{{ patternChartMode === 'price' ? 'Actual prices on separate axes.' : 'Each line scaled 0–100 (min–max).' }}</span></h3>
              <div class="pattern-mode-toggle">
                <button type="button" :aria-pressed="patternChartMode === 'price'" :disabled="loading" @click="patternChartMode = 'price'">Price</button>
                <button type="button" :aria-pressed="patternChartMode === 'normalized'" :disabled="loading" @click="patternChartMode = 'normalized'">Normalized</button>
              </div>
            </div>
            <CpmPatternComparisonChart
              :series="patternChartMode === 'price' ? patternPriceChartSeries : patternNormalizedChartSeries"
              :dual-axis="patternChartMode === 'price'"
              :selected-x="selectedPatternObservation?.bar"
              x-mode="aligned"
              value-mode="price"
              :y-axis-label="patternChartMode === 'price' ? `${submittedPattern.referenceSymbol || 'A'} · Price` : 'Normalized (0–100)'"
              :right-axis-label="`${submittedPattern.comparisonSymbol || 'B'} · Price`"
              :loading="loading"
              :height="410"
              show-legend
              @point-hover="selectPatternObservationByAlignedX"
            />
          </section>
          <aside class="pattern-detail">
            <div class="pattern-detail-heading"><h3>Comparison Point</h3><strong>Bar {{ selectedPatternObservation?.bar ?? '-' }} of {{ patternAlignedBars || '-' }}</strong></div>
            <input v-if="patternObservations.length" type="range" min="0" :max="patternObservations.length - 1" v-model.number="selectedPatternObservationIndex" aria-label="Comparison bar" class="pattern-slider" />
            <p class="pattern-detail-help">Hover or drag to compare the same bar in both periods.</p>
            <div v-for="(side, index) in (['reference', 'comparison'] as const)" :key="side" class="pattern-detail-period">
              <h4 :class="index ? 'pattern-b' : 'pattern-a'">Period {{ index ? 'B' : 'A' }} · {{ submittedPattern[`${side}Symbol`] }}</h4>
              <dl>
                <dt>Date</dt><dd>{{ formatPatternDate(selectedPatternObservation?.[side]?.date) }}</dd>
                <dt>Price</dt><dd>{{ formatPatternPrice(selectedPatternObservation?.[side]?.price) }}</dd>
                <dt>Indexed Value</dt><dd>{{ formatPatternNumber(selectedPatternObservation?.[side]?.normalized) }}</dd>
                <dt>Return Since Start</dt><dd class="pattern-return" :class="patternReturnTone(index ? selectedPatternComparisonReturn : selectedPatternReferenceReturn)">{{ formatPatternReturn(index ? selectedPatternComparisonReturn : selectedPatternReferenceReturn) }}</dd>
              </dl>
            </div>
            <div class="pattern-difference"><span>Return Gap (A − B)</span><strong :class="patternReturnTone(selectedPatternReturnGap)">{{ formatPatternGap(selectedPatternReturnGap) }}</strong></div>
            <small>pp = percentage points.</small>
            <p v-if="!hasPatternResults" class="pattern-status">No results yet</p>
            <p v-else-if="!submittedPatternPeriodsSameLength" class="pattern-status">Periods have different lengths.</p>
          </aside>
        </div>
      </div>
    </template>
    <template v-else-if="props.section === 'symbol'">
      <section class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-4">
        <div class="grid items-end gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(170px,0.9fr)_minmax(280px,1.35fr)_minmax(170px,0.85fr)_minmax(160px,0.75fr)_auto]">
          <label class="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
            1. Primary Symbol
            <SearchSelect
              v-model="shared.benchmark"
              :options="symbolSearchOptions"
              placeholder="Search ticker"
              aria-label="Search primary symbol"
            />
          </label>

          <div class="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
            2. Compare With
            <SearchSelect
              v-model="compareSymbolDraft"
              :options="symbolSearchOptions"
              placeholder="Search ticker to add"
              aria-label="Search comparison symbol"
              @select="addComparisonSymbol"
            />
            <span v-if="formComparisonSymbols.length" class="flex flex-wrap gap-1.5 pt-1 normal-case tracking-normal">
              <button
                v-for="symbol in formComparisonSymbols"
                :key="symbol"
                class="inline-flex items-center gap-1 rounded-md bg-[var(--app-primary-soft)] px-2 py-0.5 text-[0.6875rem] font-extrabold text-[var(--app-primary)] transition hover:bg-[var(--app-primary-shadow)]"
                type="button"
                :aria-label="`Remove ${symbol}`"
                @click="removeComparisonSymbol(symbol)"
              >
                {{ symbol }}
                <X :size="12" />
              </button>
            </span>
          </div>

          <label class="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
            3. Date Range
            <select v-model="symbolDateMode" class="h-10 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm font-semibold normal-case tracking-normal text-[var(--app-text-secondary)] outline-none">
              <option value="all">All History</option>
              <option value="1">1 Year</option>
              <option value="2">2 Years</option>
              <option value="3">3 Years</option>
              <option value="5">5 Years</option>
              <option value="custom">Custom Range</option>
            </select>
          </label>

          <label class="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
            4. Rolling Window
            <span class="flex h-10 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5">
              <input v-model.number="shared.rollWindow" class="min-w-0 flex-1 bg-transparent text-sm font-semibold normal-case tracking-normal text-[var(--app-text-secondary)] outline-none" type="number" min="21" max="252" />
              <span class="ml-1 text-sm font-semibold normal-case tracking-normal text-[var(--app-text-muted)]">Bars</span>
            </span>
          </label>

          <div class="flex flex-wrap items-end gap-2">
            <button
              class="inline-flex h-10 min-w-[150px] items-center justify-center gap-1.5 rounded-md bg-[var(--app-primary)] px-4 text-sm font-extrabold text-white transition hover:bg-[var(--app-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              :disabled="loading"
              @click="submit"
            >
              <Play :size="17" />
              {{ loading ? 'Running...' : 'Run Analysis' }}
            </button>
          </div>
        </div>

        <div v-if="!shared.allHistory" class="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[170px_170px_minmax(0,1fr)]">
          <label class="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
            Start Date
            <input v-model="shared.startDate" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm font-semibold normal-case tracking-normal text-[var(--app-text-secondary)] outline-none" type="date" />
          </label>
          <label class="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
            End Date
            <input v-model="shared.endDate" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm font-semibold normal-case tracking-normal text-[var(--app-text-secondary)] outline-none" type="date" />
          </label>
        </div>
      </section>

      <div v-if="errorMessage" class="mt-3 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2 text-sm text-[var(--app-text-muted)]">
        {{ errorMessage }}
      </div>

      <div v-if="loading && !hasSymbolResults" class="mt-4 h-48 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
        Loading results...
      </div>
      <div v-else-if="!hasSymbolResults" class="mt-4 h-48 rounded-md border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface)] px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
        No results yet
      </div>

      <template v-else>
        <div class="mt-4 grid gap-4">
          <section class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-4">
            <div class="mb-3 flex flex-wrap items-end gap-x-4 gap-y-1">
              <h3 class="text-xl font-extrabold leading-tight text-[var(--app-text)]">Full-period correlation</h3>
              <span class="text-sm font-bold text-[var(--app-text-muted)]">
                {{ normalizedBenchmark }} · {{ submittedSymbol.allHistory ? 'All History' : `${submittedSymbol.startDate || '-'} to ${submittedSymbol.endDate || '-'}` }}
              </span>
            </div>
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <button
                v-for="card in symbolPairCards"
                :key="card.symbol"
                class="min-h-[118px] rounded-md border bg-[var(--app-surface)] px-4 py-3 text-left transition hover:border-[var(--app-primary-hover)]"
                :class="selectedPairCard?.symbol === card.symbol ? 'border-[var(--app-primary)] shadow-[0_0_0_1px_var(--app-primary-shadow)]' : 'border-[var(--app-border-muted)]'"
                type="button"
                @click="selectedPairSymbol = card.symbol"
              >
                <div class="flex items-start gap-3">
                  <span
                    class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition"
                    :class="selectedPairCard?.symbol === card.symbol
                      ? 'bg-[var(--app-primary)] text-white shadow-[0_0_0_3px_var(--app-primary-soft)]'
                      : 'border-2 border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-faint)]'"
                  >
                    <Check :size="13" :stroke-width="3" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-extrabold text-[var(--app-text)]">{{ pairSlashLabel(card.symbol) }}</div>
                    <div class="mt-2 text-3xl font-extrabold leading-none text-[var(--app-text)]">{{ formatCorrelationValue(card.value) }}</div>
                    <div class="mt-2 inline-flex max-w-full rounded-md px-2.5 py-1 text-xs font-extrabold" :class="correlationBadgeClass(card.tone)">
                      {{ card.label }}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </section>

          <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_500px]">
            <section class="flex min-h-0 flex-col rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-3">
              <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <Link2 :size="20" class="text-[var(--app-primary)]" />
                  <h4 class="text-base font-extrabold text-[var(--app-text)]">
                    {{ selectedPairCard?.pairLabel || normalizedBenchmark }} - {{ submittedSymbol.rollWindow }}-Bar Rolling Correlation
                  </h4>
                </div>
                <div class="ml-auto flex flex-wrap items-center justify-end gap-2 text-xs font-bold text-[var(--app-text-muted)]">
                  <span class="inline-flex items-center gap-1 rounded-md bg-[var(--app-primary-soft)] px-2 py-1 text-[var(--app-primary)]">
                    <Check :size="14" />
                    {{ selectedPairCard?.pairLabel || 'Selected pair' }}
                  </span>
                  <button
                    v-if="comparisonPairCard"
                    type="button"
                    class="inline-flex items-center gap-1 rounded-md bg-[var(--app-surface-muted)] px-2 py-1 text-[var(--app-text-subtle)] transition hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]"
                    :title="`Show ${comparisonPairCard.pairLabel}`"
                    @click="selectedPairSymbol = comparisonPairCard.symbol"
                  >
                    <Check :size="14" />
                    {{ comparisonPairCard.pairLabel }} comparison
                  </button>
                  <span>{{ submittedSymbol.allHistory ? 'All History' : `${submittedSymbol.startDate || '-'} to ${submittedSymbol.endDate || '-'}` }}</span>
                </div>
              </div>
              <div class="min-h-0 flex-1">
                <CpmRollingCorrelationChart
                  fill
                  :series="symbolRollingSeries"
                  :price-series="symbolPriceSeries"
                  :selected-key="selectedRollingKey"
                  :value-axis-plot-bands="correlationValueAxisPlotBands"
                  :loading="loading"
                  :height="540"
                  :show-legend="false"
                />
              </div>
            </section>

            <aside class="grid gap-4 content-start">
              <section class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-5">
                <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <Table2 :size="20" class="text-[var(--app-primary)]" />
                    <h4 class="text-lg font-extrabold text-[var(--app-text)]">Correlation Matrix</h4>
                  </div>
                  <button
                    class="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-xs font-extrabold text-[var(--app-primary)] transition hover:border-[var(--app-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    :disabled="!primaryRows.length && !secondaryRows.length"
                    @click="downloadResults"
                  >
                    <Download :size="15" />
                    CSV
                  </button>
                </div>
                <div v-if="symbolMatrixRows.length" class="overflow-x-auto">
                  <table class="min-w-[460px] w-full border-collapse text-[0.92rem]">
                    <thead>
                      <tr class="border-b border-[var(--app-border)] bg-[var(--app-surface-muted)] text-[0.78rem] font-extrabold text-[var(--app-text-secondary)]">
                        <th class="px-4 py-3 text-left">Ticker</th>
                        <th v-for="column in symbolMatrixColumnKeys" :key="column" class="px-4 py-3 text-center">{{ displayFieldLabel(column) }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in symbolMatrixRows" :key="row.label" class="border-b border-[var(--app-border-muted)] last:border-b-0">
                        <th class="bg-[var(--app-surface-muted)] px-4 py-3 text-left text-sm font-extrabold text-[var(--app-text)]">{{ row.label }}</th>
                        <td
                          v-for="cell in row.cells"
                          :key="cell.key"
                          class="px-4 py-3 text-center text-[0.92rem] font-extrabold text-[var(--app-text-secondary)]"
                          :style="matrixCellStyle(cell.value)"
                        >
                          {{ formatCorrelationValue(cell.value) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else class="h-32 rounded-md border border-dashed border-[var(--app-border-strong)] px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
                  No matrix rows found
                </div>
                <div class="mt-3 flex items-center gap-2 text-xs text-[var(--app-text-muted)]">
                  <span>Negative correlation(-1)</span>
                  <span class="h-2.5 min-w-24 flex-1 rounded-full bg-gradient-to-r from-rose-300 via-[var(--app-surface-muted)] to-blue-400" />
                  <span>Positive correlation(1)</span>
                </div>
              </section>

              <section class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-4">
                <h5 class="text-sm font-extrabold text-[var(--app-text)]">Correlation value guide</h5>
                <ul class="mt-3 grid gap-2 text-sm leading-5 text-[var(--app-text-secondary)]">
                  <li
                    v-for="item in correlationValueGuide"
                    :key="item.label"
                    class="flex items-center gap-2"
                  >
                    <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: item.color }" />
                    <span class="inline-flex min-w-0 items-center gap-1.5">
                      <span class="font-extrabold text-[var(--app-text)]">{{ item.label }}</span>
                      <span
                        class="app-tooltip"
                        :data-tooltip="item.description"
                        :aria-label="`${item.label}: ${item.description}`"
                        tabindex="0"
                      >
                        <Info :size="13" />
                      </span>
                      <span class="text-[var(--app-text-muted)]">({{ item.range }})</span>
                    </span>
                  </li>
                </ul>
              </section>

              <section class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-primary-soft)] p-4">
                <div class="flex items-start gap-3">
                  <CircleHelp :size="20" class="mt-0.5 shrink-0 text-[var(--app-primary)]" />
                  <div>
                    <h5 class="text-sm font-extrabold text-[var(--app-text)]">Full-period vs. rolling</h5>
                    <p class="mt-1 text-sm leading-5 text-[var(--app-text-secondary)]">
                      The matrix shows full-period correlations. The chart shows {{ normalizedBenchmark }} price above rolling {{ submittedSymbol.rollWindow }}-bar correlations.
                    </p>
                  </div>
                </div>
              </section>

              <section class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-4">
                <h5 class="text-sm font-extrabold text-[var(--app-text)]">How to Read Correlation Bands</h5>
                <ul class="mt-3 grid gap-2 text-sm leading-5 text-[var(--app-text-secondary)]">
                  <li v-for="item in correlationBandGuide" :key="item.label" class="flex items-center gap-2">
                    <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: item.color }" />
                    <span class="inline-flex min-w-0 items-center gap-1.5">
                      <span class="font-extrabold text-[var(--app-text)]">{{ item.label }}</span>
                      <span
                        class="app-tooltip"
                        :data-tooltip="item.description"
                        :aria-label="`${item.label}: ${item.description}`"
                        tabindex="0"
                      >
                        <Info :size="13" />
                      </span>
                      <span class="text-[var(--app-text-muted)]">({{ item.range }})</span>
                    </span>
                  </li>
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </template>
    </template>

    <template v-else>
    <div class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] p-4">
      <div v-if="props.section !== 'asset' && props.section !== 'transmission'" class="flex flex-col gap-3 border-b border-[var(--app-border-muted)] pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 class="text-xl font-semibold text-[var(--app-text)]">{{ sectionTitle }}</h3>
          <p class="mt-1 max-w-3xl text-sm text-[var(--app-text-muted)]">{{ sectionDescription }}</p>
        </div>
        <div class="flex shrink-0 flex-wrap items-center gap-2">
          <button
            class="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[var(--app-primary)] px-3 text-sm font-extrabold text-white transition hover:bg-[var(--app-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="loading"
            @click="submit"
          >
            <Play :size="16" />
            {{ loading ? 'Running...' : 'View Results' }}
          </button>
          <button
            class="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm font-semibold text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)]"
            type="button"
            @click="resetForm"
          >
            <RotateCcw :size="16" />
            Reset
          </button>
          <button
            class="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm font-semibold text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            :disabled="!primaryRows.length && !secondaryRows.length"
            @click="downloadResults"
          >
            <Download :size="16" />
            CSV
          </button>
        </div>
      </div>

      <div v-if="props.section === 'asset'" class="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div class="flex flex-wrap items-center gap-2 text-sm font-extrabold text-[var(--app-text)]">
          <span>Correlation matrix of monthly asset returns for the period</span>
          <span
            class="app-tooltip"
            data-tooltip="The analysis begins in January 2008, corresponding to the start of available data for the iShares MSCI EAFE Small-Cap ETF (SCZ)."
            aria-label="The analysis begins in January 2008, corresponding to the start of available data for the iShares MSCI EAFE Small-Cap ETF (SCZ)."
            tabindex="0"
          >
            <CircleHelp :size="16" />
          </span>
          <input
            v-model="asset.startDate"
            class="h-9 w-[150px] rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm font-semibold text-[var(--app-text-secondary)] outline-none"
            type="date"
            aria-label="Asset correlation start date"
          />
          <span class="text-[var(--app-text-muted)]">to</span>
          <input
            v-model="asset.endDate"
            class="h-9 w-[150px] rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm font-semibold text-[var(--app-text-secondary)] outline-none"
            type="date"
            aria-label="Asset correlation end date"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            class="inline-flex h-9 min-w-[140px] items-center justify-center gap-1.5 rounded-md bg-[var(--app-primary)] px-4 text-sm font-extrabold text-white transition hover:bg-[var(--app-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="loading"
            @click="submit"
          >
            <Play :size="16" />
            {{ loading ? 'Running...' : 'Run Analysis' }}
          </button>
          <button
            class="inline-flex h-9 min-w-[110px] items-center justify-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm font-semibold text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            :disabled="!primaryRows.length && !secondaryRows.length"
            @click="downloadResults"
          >
            <Download :size="16" />
            CSV
          </button>
        </div>
      </div>

      <div v-else-if="props.section === 'transmission'" class="grid gap-4">
        <div class="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-[minmax(150px,0.9fr)_minmax(160px,1fr)_minmax(150px,0.7fr)_minmax(130px,0.6fr)_auto]">
          <label class="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
            Asset / Designated Ticker
            <SearchSelect
              v-model="shared.benchmark"
              :options="symbolSearchOptions"
              placeholder="Search ticker"
              aria-label="Search asset ticker"
            />
          </label>

          <label class="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
            Benchmark / Comparison Ticker
            <SearchSelect
              v-model="shared.symbol"
              :options="symbolSearchOptions"
              placeholder="Search ticker"
              aria-label="Search comparison ticker"
            />
          </label>

          <label class="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
            Date Range
            <select v-model="symbolDateMode" class="h-10 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm font-semibold normal-case tracking-normal text-[var(--app-text-secondary)] outline-none">
              <option value="all">All History</option>
              <option value="1">1 Year</option>
              <option value="2">2 Years</option>
              <option value="3">3 Years</option>
              <option value="5">5 Years</option>
              <option value="custom">Custom Range</option>
            </select>
          </label>

          <label class="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
            Rolling Window
            <span class="flex h-10 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5">
              <input v-model.number="shared.rollWindow" class="min-w-0 flex-1 bg-transparent text-sm font-semibold normal-case tracking-normal text-[var(--app-text-secondary)] outline-none" type="number" min="21" max="252" />
              <span class="ml-1 text-sm font-semibold normal-case tracking-normal text-[var(--app-text-muted)]">Bars</span>
            </span>
          </label>

          <button
            class="inline-flex h-10 min-w-[150px] items-center justify-center gap-1.5 rounded-md bg-[var(--app-primary)] px-4 text-sm font-extrabold text-white transition hover:bg-[var(--app-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="loading"
            @click="submit"
          >
            <Play :size="17" />
            {{ loading ? 'Analyzing...' : 'Analyze Beta' }}
          </button>
        </div>

        <div v-if="!shared.allHistory" class="grid gap-3 md:grid-cols-2 xl:grid-cols-[170px_170px_minmax(0,1fr)]">
          <label class="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
            Start Date
            <input v-model="shared.startDate" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm font-semibold normal-case tracking-normal text-[var(--app-text-secondary)] outline-none" type="date" />
          </label>
          <label class="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
            End Date
            <input v-model="shared.endDate" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm font-semibold normal-case tracking-normal text-[var(--app-text-secondary)] outline-none" type="date" />
          </label>
        </div>
      </div>


      <div v-else class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[150px_minmax(180px,1fr)_150px_120px_140px_140px]">
        <label class="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
          Benchmark
          <input v-model="shared.benchmark" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm font-semibold normal-case tracking-normal text-[var(--app-text-secondary)] outline-none" />
        </label>
        <label class="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
          Comparison Symbols
          <input
            v-model="shared.comparisonSymbols"
            class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm font-semibold normal-case tracking-normal text-[var(--app-text-secondary)] outline-none"
          />
        </label>
        <label class="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
          Rolling Bars
          <input v-model.number="shared.rollWindow" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm font-semibold normal-case tracking-normal text-[var(--app-text-secondary)] outline-none" type="number" min="21" max="252" />
        </label>
        <label class="flex items-end gap-2 pb-2 text-sm font-semibold text-[var(--app-text-secondary)]">
          <input v-model="shared.allHistory" class="h-4 w-4 accent-[var(--app-primary)]" type="checkbox" />
          All History
        </label>
        <label class="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]" :class="{ 'opacity-50': shared.allHistory }">
          Start Date
          <input v-model="shared.startDate" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm font-semibold normal-case tracking-normal text-[var(--app-text-secondary)] outline-none" type="date" :disabled="shared.allHistory" />
        </label>
        <label class="grid gap-1 text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]" :class="{ 'opacity-50': shared.allHistory }">
          End Date
          <input v-model="shared.endDate" class="h-9 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-sm font-semibold normal-case tracking-normal text-[var(--app-text-secondary)] outline-none" type="date" :disabled="shared.allHistory" />
        </label>
      </div>
    </div>

    <div v-if="errorMessage" class="mt-3 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2 text-sm text-[var(--app-text-muted)]">
      {{ errorMessage }}
    </div>

    <div v-if="score" class="mt-4 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] px-4 py-3">
      <div class="text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]">Pattern Correlation</div>
      <div class="mt-1 text-2xl font-extrabold text-[var(--app-primary)]">{{ score }}%</div>
    </div>

    <template v-if="props.section === 'asset'">
      <div class="mt-4 grid gap-4">
        <div v-if="loading && !assetMatrixRows.length" class="h-48 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
          Loading results...
        </div>
        <div v-else-if="!assetMatrixRows.length" class="h-48 rounded-md border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface)] px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
          No matrix rows found
        </div>

        <template v-else>
          <div class="grid gap-4">
            <section class="min-w-0 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-4 shadow-sm">
              <div class="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-baseline gap-2">
                    <h3 class="text-lg font-extrabold text-[var(--app-text)]">Monthly Return Correlation Matrix</h3>
                    <span class="text-sm font-bold text-[var(--app-text-secondary)]">{{ assetTitleDateRange }}</span>
                    <span class="text-sm font-bold text-[var(--app-text-muted)]">({{ assetMatrixRows.length }} assets)</span>
                  </div>
                  <p class="mt-1 text-xs font-medium text-[var(--app-text-muted)]">
                    Values show full-period correlations of monthly returns. Select any non-diagonal cell to inspect the pair.
                  </p>
                </div>
                <label class="flex h-9 min-w-[260px] items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 text-sm text-[var(--app-text-secondary)]">
                  <Search :size="16" class="mr-2 shrink-0 text-[var(--app-text-muted)]" />
                  <input
                    v-model="assetSearchQuery"
                    class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--app-text-muted)]"
                    placeholder="Search asset (ticker or name)..."
                  />
                </label>
              </div>

              <div class="overflow-x-auto overflow-y-hidden rounded-md border border-[var(--app-border-muted)]">
                <table class="min-w-[1080px] w-full table-fixed border-collapse text-xs">
                  <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold text-[var(--app-text-secondary)]">
                    <tr class="border-b border-[var(--app-border)]">
                      <th class="w-[112px] px-2 py-3 text-left">Asset Class</th>
                      <th class="w-[72px] px-2 py-3 text-left">Asset</th>
                      <th
                        v-for="column in assetMatrixColumnKeys"
                        :key="column"
                        class="px-1 py-3 text-center"
                      >
                        {{ column }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in filteredAssetMatrixRows"
                      :key="row.ticker"
                      class="border-b border-[var(--app-border-muted)] last:border-b-0"
                    >
                      <td class="px-2 py-2 align-middle">
                        <span
                          class="block rounded-sm border-l-4 px-2 py-2 text-[0.68rem] font-semibold leading-tight"
                          :style="assetClassStyle(row.assetClass)"
                        >
                          {{ row.assetClass }}
                        </span>
                      </td>
                      <th class="px-2 py-2 text-left align-middle font-normal">
                        <span
                          class="app-tooltip app-tooltip--below inline-flex font-semibold text-[var(--app-text)]"
                          :data-tooltip="row.name"
                          :aria-label="row.name"
                          tabindex="0"
                        >
                          {{ row.ticker }}
                        </span>
                      </th>
                      <td
                        v-for="cell in row.cells"
                        :key="cell.key"
                        class="p-0 text-center align-middle"
                        :style="matrixCellStyle(cell.value)"
                      >
                        <button
                          class="h-9 w-full border-0 bg-transparent px-1 text-xs font-medium text-[var(--app-text)] transition enabled:hover:bg-white/45 enabled:hover:text-[var(--app-primary)] disabled:cursor-default"
                          :class="{ 'ring-2 ring-inset ring-[var(--app-primary)]': isSelectedAssetCell(row, cell) }"
                          type="button"
                          :disabled="row.ticker === normalizeSymbolLabel(cell.key)"
                          @click="selectAssetMatrixCell(row, cell)"
                        >
                          {{ formatCorrelationValue(cell.value) }}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="mt-3 flex flex-wrap items-center justify-between gap-3 text-[0.6875rem] font-normal text-[var(--app-text-muted)]">
                <div class="flex min-w-[220px] flex-1 items-center gap-1.5">
                  <span>Negative correlation</span>
                  <span class="h-2 max-w-[180px] min-w-[120px] flex-1 rounded-full bg-gradient-to-r from-rose-400 via-[var(--app-surface-muted)] to-blue-500" />
                  <span>Positive correlation</span>
                </div>
                <div>
                  <span>Hover a ticker to see the full asset name.</span>
                </div>
              </div>
            </section>

          </div>

          <div class="grid gap-4 xl:grid-cols-2">
            <section class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-4 shadow-sm">
              <div class="mb-3 flex items-center gap-2">
                <ArrowUp :size="20" class="text-emerald-600" />
                <h3 class="text-lg font-extrabold text-[var(--app-text)]">Strongest Positive Pairs</h3>
              </div>
              <div class="overflow-hidden rounded-md border border-[var(--app-border-muted)]">
                <table class="w-full border-collapse text-sm">
                  <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold text-[var(--app-text-secondary)]">
                    <tr>
                      <th class="w-10 px-2 py-2 text-center">#</th>
                      <th class="px-2 py-2 text-left">Pair</th>
                      <th class="px-2 py-2 text-right">Correlation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(pair, index) in strongestPositiveAssetPairs"
                      :key="pair.key"
                      class="cursor-pointer border-t border-[var(--app-border-muted)] transition hover:bg-[var(--app-primary-soft)]"
                      :class="{ 'bg-[var(--app-primary-soft)]': selectedAssetPair?.key === pair.key }"
                      @click="selectAssetPair(pair)"
                    >
                      <td class="px-2 py-2 text-center text-[var(--app-text-muted)]">{{ index + 1 }}</td>
                      <td class="px-2 py-2 font-semibold text-[var(--app-primary)]">{{ pair.left }} - {{ pair.right }}</td>
                      <td class="px-2 py-2 text-right font-semibold text-emerald-600">{{ formatCorrelationValue(pair.value) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-4 shadow-sm">
              <div class="mb-3 flex items-center gap-2">
                <ArrowDown :size="20" class="text-rose-600" />
                <h3 class="text-lg font-extrabold text-[var(--app-text)]">Strongest Inverse Pairs</h3>
              </div>
              <div class="overflow-hidden rounded-md border border-[var(--app-border-muted)]">
                <table class="w-full border-collapse text-sm">
                  <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold text-[var(--app-text-secondary)]">
                    <tr>
                      <th class="w-10 px-2 py-2 text-center">#</th>
                      <th class="px-2 py-2 text-left">Pair</th>
                      <th class="px-2 py-2 text-right">Correlation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(pair, index) in strongestInverseAssetPairs"
                      :key="pair.key"
                      class="cursor-pointer border-t border-[var(--app-border-muted)] transition hover:bg-[var(--app-primary-soft)]"
                      :class="{ 'bg-[var(--app-primary-soft)]': selectedAssetPair?.key === pair.key }"
                      @click="selectAssetPair(pair)"
                    >
                      <td class="px-2 py-2 text-center text-[var(--app-text-muted)]">{{ index + 1 }}</td>
                      <td class="px-2 py-2 font-semibold text-[var(--app-primary)]">{{ pair.left }} - {{ pair.right }}</td>
                      <td class="px-2 py-2 text-right font-semibold text-rose-600">{{ formatCorrelationValue(pair.value) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-4 shadow-sm">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <Table2 :size="19" class="text-[var(--app-primary)]" />
                <h3 class="text-lg font-extrabold text-[var(--app-text)]">Asset Return &amp; Risk Statistics</h3>
                <span class="text-sm font-bold text-[var(--app-text-muted)]">(Monthly Returns)</span>
              </div>
            </div>
            <div class="overflow-x-auto rounded-md border border-[var(--app-border-muted)]">
              <table class="min-w-[920px] w-full border-collapse text-[0.8125rem] text-[var(--app-text)]">
                <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold text-[var(--app-text-secondary)]">
                  <tr>
                    <th class="px-3 py-2.5 text-left" :aria-sort="assetStatsAriaSort('name')">
                      <button class="inline-flex items-center gap-1 rounded-sm text-left transition hover:text-[var(--app-primary)]" type="button" @click="sortAssetStats('name')">
                        Name
                        <component :is="assetStatsSortIcon('name')" :size="13" />
                      </button>
                    </th>
                    <th class="px-3 py-2.5 text-left" :aria-sort="assetStatsAriaSort('ticker')">
                      <button class="inline-flex items-center gap-1 rounded-sm text-left transition hover:text-[var(--app-primary)]" type="button" @click="sortAssetStats('ticker')">
                        Ticker
                        <component :is="assetStatsSortIcon('ticker')" :size="13" />
                      </button>
                    </th>
                    <th class="px-3 py-2.5 text-right" :aria-sort="assetStatsAriaSort('annualizedReturn')">
                      <button class="ml-auto inline-flex items-center gap-1 rounded-sm text-right transition hover:text-[var(--app-primary)]" type="button" @click="sortAssetStats('annualizedReturn')">
                        Annualized Return
                        <component :is="assetStatsSortIcon('annualizedReturn')" :size="13" />
                      </button>
                    </th>
                    <th class="px-3 py-2.5 text-right" :aria-sort="assetStatsAriaSort('dailyStdDev')">
                      <button class="ml-auto inline-flex items-center gap-1 rounded-sm text-right transition hover:text-[var(--app-primary)]" type="button" @click="sortAssetStats('dailyStdDev')">
                        Daily Std Dev
                        <component :is="assetStatsSortIcon('dailyStdDev')" :size="13" />
                      </button>
                    </th>
                    <th class="px-3 py-2.5 text-right" :aria-sort="assetStatsAriaSort('monthlyStdDev')">
                      <button class="ml-auto inline-flex items-center gap-1 rounded-sm text-right transition hover:text-[var(--app-primary)]" type="button" @click="sortAssetStats('monthlyStdDev')">
                        Monthly Std Dev
                        <component :is="assetStatsSortIcon('monthlyStdDev')" :size="13" />
                      </button>
                    </th>
                    <th class="px-3 py-2.5 text-right" :aria-sort="assetStatsAriaSort('annualizedStdDev')">
                      <button class="ml-auto inline-flex items-center gap-1 rounded-sm text-right transition hover:text-[var(--app-primary)]" type="button" @click="sortAssetStats('annualizedStdDev')">
                        Annualized Std Dev
                        <component :is="assetStatsSortIcon('annualizedStdDev')" :size="13" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in assetStatsRows" :key="`${row.ticker}-stats`" class="border-t border-[var(--app-border-muted)]">
                    <td class="px-3 py-2.5 font-bold text-[var(--app-text)]">{{ row.name }}</td>
                    <td class="px-3 py-2.5 font-semibold text-[var(--app-primary)]">{{ row.ticker }}</td>
                    <td class="px-3 py-2.5 text-right text-[var(--app-text-secondary)]">{{ formatAssetStat(row.annualizedReturn) }}</td>
                    <td class="px-3 py-2.5 text-right text-[var(--app-text-secondary)]">{{ formatAssetStat(row.dailyStdDev) }}</td>
                    <td class="px-3 py-2.5 text-right text-[var(--app-text-secondary)]">{{ formatAssetStat(row.monthlyStdDev) }}</td>
                    <td class="px-3 py-2.5 text-right text-[var(--app-text-secondary)]">{{ formatAssetStat(row.annualizedStdDev) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>
      </div>

      <div
        v-if="isAssetPairModalOpen && selectedAssetPair"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-pair-detail-title"
        @click.self="closeAssetPairModal"
      >
        <section class="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-5 shadow-2xl">
          <div class="mb-4 flex items-center justify-between gap-3">
            <h3 id="asset-pair-detail-title" class="text-lg font-extrabold text-[var(--app-text)]">Selected pair</h3>
            <button
              class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-muted)] transition hover:border-[var(--app-primary-hover)] hover:text-[var(--app-primary)]"
              type="button"
              aria-label="Close pair detail"
              @click="closeAssetPairModal"
            >
              <X :size="16" />
            </button>
          </div>

          <div class="grid grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] items-stretch gap-3 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] p-3">
            <div>
              <div class="text-xl font-extrabold text-[var(--app-text)]">{{ selectedAssetPair.left }}</div>
              <div class="mt-0.5 truncate text-sm font-semibold text-[var(--app-text-secondary)]">{{ selectedAssetPair.leftName }}</div>
              <span class="mt-2 inline-flex rounded-md px-2 py-1 text-xs font-extrabold" :style="assetClassPillStyle(selectedAssetPair.leftClass)">
                {{ selectedAssetPair.leftClass }}
              </span>
            </div>
            <div class="flex items-center justify-center border-x border-[var(--app-border-muted)] text-[var(--app-primary)]">
              <Link2 :size="22" />
            </div>
            <div>
              <div class="text-xl font-extrabold text-[var(--app-text)]">{{ selectedAssetPair.right }}</div>
              <div class="mt-0.5 truncate text-sm font-semibold text-[var(--app-text-secondary)]">{{ selectedAssetPair.rightName }}</div>
              <span class="mt-2 inline-flex rounded-md px-2 py-1 text-xs font-extrabold" :style="assetClassPillStyle(selectedAssetPair.rightClass)">
                {{ selectedAssetPair.rightClass }}
              </span>
            </div>
          </div>

          <div class="mt-4 border-b border-[var(--app-border-muted)] pb-4">
            <div class="text-sm font-extrabold text-[var(--app-text)]">Monthly Correlation</div>
            <div class="mt-2 flex flex-wrap items-center gap-3">
              <div
                class="text-5xl font-black"
                :class="selectedAssetPair.value < 0 ? 'text-rose-600 dark:text-rose-300' : 'text-[var(--app-primary)]'"
              >
                {{ formatCorrelationValue(selectedAssetPair.value) }}
              </div>
              <span class="rounded-md px-2.5 py-1 text-xs font-extrabold" :class="assetPairBadgeClass(selectedAssetPair.value)">
                {{ assetPairStrength(selectedAssetPair.value).label }}
              </span>
            </div>
          </div>

          <dl class="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
            <dt class="font-semibold text-[var(--app-text-muted)]">Date Range</dt>
            <dd class="text-right font-extrabold text-[var(--app-text-secondary)]">{{ assetDateRangeLabel }}</dd>
            <dt class="font-semibold text-[var(--app-text-muted)]">Return Frequency</dt>
            <dd class="text-right font-extrabold text-[var(--app-text-secondary)]">Monthly</dd>
            <dt class="font-semibold text-[var(--app-text-muted)]">Observations</dt>
            <dd class="text-right font-extrabold text-[var(--app-text-secondary)]">{{ assetObservationMonths ? `${assetObservationMonths} months` : '-' }}</dd>
          </dl>

          <div class="mt-5">
            <h4 class="text-sm font-extrabold text-[var(--app-text)]">Asset Statistics (from original data)</h4>
            <div class="mt-2 overflow-hidden rounded-md border border-[var(--app-border-muted)]">
              <table class="w-full border-collapse text-sm">
                <thead class="bg-[var(--app-surface-muted)] text-xs font-semibold text-[var(--app-text-secondary)]">
                  <tr>
                    <th class="px-3 py-2 text-left">Asset</th>
                    <th class="px-3 py-2 text-right">Annualized Return (%)</th>
                    <th class="px-3 py-2 text-right">Daily Std Dev</th>
                    <th class="px-3 py-2 text-right">Monthly Std Dev</th>
                    <th class="px-3 py-2 text-right">Annualized Std Dev (%)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="selectedAssetLeftRow" class="border-t border-[var(--app-border-muted)]">
                    <td class="px-3 py-2 font-extrabold text-[var(--app-primary)]">{{ selectedAssetLeftRow.ticker }}</td>
                    <td class="px-3 py-2 text-right text-[var(--app-text-secondary)]">{{ formatAssetStat(selectedAssetLeftRow.annualizedReturn) }}</td>
                    <td class="px-3 py-2 text-right text-[var(--app-text-secondary)]">{{ formatAssetStat(selectedAssetLeftRow.dailyStdDev) }}</td>
                    <td class="px-3 py-2 text-right text-[var(--app-text-secondary)]">{{ formatAssetStat(selectedAssetLeftRow.monthlyStdDev) }}</td>
                    <td class="px-3 py-2 text-right text-[var(--app-text-secondary)]">{{ formatAssetStat(selectedAssetLeftRow.annualizedStdDev) }}</td>
                  </tr>
                  <tr v-if="selectedAssetRightRow" class="border-t border-[var(--app-border-muted)]">
                    <td class="px-3 py-2 font-extrabold text-[var(--app-primary)]">{{ selectedAssetRightRow.ticker }}</td>
                    <td class="px-3 py-2 text-right text-[var(--app-text-secondary)]">{{ formatAssetStat(selectedAssetRightRow.annualizedReturn) }}</td>
                    <td class="px-3 py-2 text-right text-[var(--app-text-secondary)]">{{ formatAssetStat(selectedAssetRightRow.dailyStdDev) }}</td>
                    <td class="px-3 py-2 text-right text-[var(--app-text-secondary)]">{{ formatAssetStat(selectedAssetRightRow.monthlyStdDev) }}</td>
                    <td class="px-3 py-2 text-right text-[var(--app-text-secondary)]">{{ formatAssetStat(selectedAssetRightRow.annualizedStdDev) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="mt-4 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-primary-soft)] p-3 text-sm leading-5 text-[var(--app-text-secondary)]">
            <div class="flex items-start gap-2">
              <Info :size="17" class="mt-0.5 shrink-0 text-[var(--app-primary)]" />
              <p>Correlation does not imply causation and can change over time.</p>
            </div>
          </div>
        </section>
      </div>
    </template>

    <template v-else-if="props.section === 'transmission'">
      <div class="mt-4 grid gap-4">
        <div v-if="loading && !hasBetaResults" class="h-48 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
          Loading beta analysis...
        </div>
        <div v-else-if="!hasBetaResults" class="h-48 rounded-md border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface)] px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
          No results yet
        </div>

        <template v-else>
          <section class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-4">
            <div class="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-baseline gap-2">
                  <h3 class="text-xl font-extrabold leading-tight text-[var(--app-text)]">
                    {{ normalizedBetaAsset }} Beta Relative to {{ normalizedBetaComparison }}
                  </h3>
                  <span class="text-sm font-bold text-[var(--app-text-muted)]">
                    {{ normalizedBetaAsset }} relative to {{ normalizedBetaComparison }} · {{ submittedBeta.rollWindow }}-bar rolling beta · {{ betaDataDateRange }}
                  </span>
                </div>
              </div>
              <button
                class="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-xs font-extrabold text-[var(--app-primary)] disabled:opacity-50"
                type="button"
                :disabled="!secondaryRows.length"
                @click="downloadResults"
              >
                <Download :size="15" />
                CSV
              </button>
            </div>

            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div
                v-for="card in betaMetricCards"
                :key="card.label"
                class="min-h-[104px] rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] px-4 py-3"
              >
                <div class="min-w-0">
                  <div class="text-[0.8rem] font-extrabold leading-tight text-[var(--app-text)]">{{ card.label }}</div>
                  <div class="mt-1 text-3xl font-extrabold leading-none text-[var(--app-text)]">{{ card.value }}</div>
                  <div class="mt-2 inline-flex rounded-md px-2 py-0.5 text-[0.7rem] font-extrabold" :class="betaToneClass(card.tone)">
                    {{ card.detail }}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section class="flex min-h-[620px] flex-col rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-3">
              <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--app-primary-soft)] text-sm font-black leading-none text-[var(--app-primary)]">
                    β
                  </span>
                  <h4 class="text-base font-extrabold text-[var(--app-text)]">
                    Price &amp; Rolling Beta
                  </h4>
                </div>
                <div class="ml-auto flex flex-wrap items-center justify-end gap-2 text-xs font-bold text-[var(--app-text-muted)]">
                  <span class="inline-flex items-center gap-1 rounded-md bg-[var(--app-surface-muted)] px-2 py-1">
                    <span class="h-2 w-5 rounded-full bg-[var(--app-text)]" />
                    {{ normalizedBetaAsset }} price
                  </span>
                  <span
                    v-if="betaComparisonPriceSeries"
                    class="inline-flex items-center gap-1 rounded-md bg-[var(--app-surface-muted)] px-2 py-1"
                  >
                    <span class="h-2 w-5 rounded-full bg-rose-500" />
                    {{ normalizedBetaComparison }} price
                  </span>
                  <span class="inline-flex items-center gap-1 rounded-md bg-[var(--app-primary-soft)] px-2 py-1 text-[var(--app-primary)]">
                    <span class="h-2 w-5 rounded-full bg-[var(--app-primary)]" />
                    Rolling Beta
                  </span>
                </div>
              </div>
              <div class="min-h-0 flex-1">
                <CpmRollingCorrelationChart
                  fill
                  :series="betaChartSeries"
                  :price-series="betaAssetPriceSeries"
                  :secondary-price-series="betaComparisonPriceSeries"
                  selected-key="rolling-beta"
                  value-axis-label="Beta"
                  :value-axis-plot-bands="betaValueAxisPlotBands"
                  :loading="loading"
                  :height="560"
                  :show-legend="false"
                />
              </div>
            </section>

            <aside class="grid content-start gap-4">
              <section class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-4">
                <div class="flex items-center justify-between gap-2">
                  <h4 class="text-lg font-extrabold text-[var(--app-text)]">How Beta Is Calculated</h4>
                  <CircleHelp :size="17" class="text-[var(--app-primary)]" />
                </div>
                <div class="mt-3 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] px-4 py-5 text-center">
                  <img src="/beta-removebg-preview.png" alt="Rolling beta formula" class="beta-formula-img mx-auto max-h-24 w-auto" />
                </div>
                <div class="mt-4 grid gap-3 text-sm leading-5 text-[var(--app-text-secondary)]">
                  <div class="flex gap-3">
                    <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--app-primary)] text-xs font-extrabold text-white">1</span>
                    <div>
                      <div class="font-extrabold text-[var(--app-text)]">Rolling correlation (&rho;)</div>
                      <p>Measures how closely the two tickers moved together over the selected window.</p>
                    </div>
                  </div>
                  <div class="flex gap-3">
                    <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--app-primary)] text-xs font-extrabold text-white">2</span>
                    <div>
                      <div class="font-extrabold text-[var(--app-text)]">Relative volatility (&sigma;)</div>
                      <p>Compares {{ normalizedBetaAsset }} volatility to {{ normalizedBetaComparison }} volatility.</p>
                    </div>
                  </div>
                  <div class="flex gap-3">
                    <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--app-primary)] text-xs font-extrabold text-white">3</span>
                    <div>
                      <div class="font-extrabold text-[var(--app-text)]">Rolling beta (&beta;)</div>
                      <p>Estimates {{ normalizedBetaAsset }} sensitivity to {{ normalizedBetaComparison }} for each rolling window.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-4">
                <h4 class="text-lg font-extrabold text-[var(--app-text)]">How to Read Beta Regimes</h4>
                <ul class="mt-3 grid gap-2 text-sm leading-5 text-[var(--app-text-secondary)]">
                  <li v-for="item in betaRegimeGuide" :key="item.label" class="flex items-center gap-2">
                    <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: item.color }" />
                    <span class="inline-flex min-w-0 items-center gap-1.5">
                      <span class="font-extrabold text-[var(--app-text)]">{{ item.label }}</span>
                      <span
                        class="app-tooltip"
                        :data-tooltip="item.description"
                        :aria-label="`${item.label}: ${item.description}`"
                        tabindex="0"
                      >
                        <Info :size="13" />
                      </span>
                      <span class="text-[var(--app-text-muted)]">({{ item.range }})</span>
                    </span>
                  </li>
                </ul>
                <div class="mt-4 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-primary-soft)] p-3 text-sm leading-5 text-[var(--app-text-secondary)]">
                  <div class="flex items-start gap-2">
                    <Info :size="17" class="mt-0.5 shrink-0 text-[var(--app-primary)]" />
                    <p>Beta measures historical sensitivity to the selected comparison ticker. It does not forecast returns.</p>
                  </div>
                </div>
              </section>
            </aside>
          </div>

          <div class="grid gap-4 xl:grid-cols-2">
            <section class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-4 shadow-sm">
              <div class="mb-3 flex items-center gap-2">
                <ArrowUp :size="20" class="text-emerald-600" />
                <h3 class="text-lg font-extrabold text-[var(--app-text)]">Highest Beta</h3>
              </div>
              <div class="overflow-hidden rounded-md border border-[var(--app-border-muted)]">
                <table class="w-full border-collapse text-sm">
                  <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold text-[var(--app-text-secondary)]">
                    <tr>
                      <th class="w-10 px-2 py-2 text-center">#</th>
                      <th class="px-2 py-2 text-left">Date</th>
                      <th class="px-2 py-2 text-right">Beta</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, index) in betaTopRows" :key="row.timestamp" class="border-t border-[var(--app-border-muted)]">
                      <td class="px-2 py-2 text-center text-[var(--app-text-muted)]">{{ index + 1 }}</td>
                      <td class="px-2 py-2 font-semibold text-[var(--app-primary)]">{{ row.date }}</td>
                      <td class="px-2 py-2 text-right font-semibold text-emerald-600">{{ formatBetaTableValue(row.beta) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-4 shadow-sm">
              <div class="mb-3 flex items-center gap-2">
                <ArrowDown :size="20" class="text-rose-600" />
                <h3 class="text-lg font-extrabold text-[var(--app-text)]">Lowest Beta</h3>
              </div>
              <div class="overflow-hidden rounded-md border border-[var(--app-border-muted)]">
                <table class="w-full border-collapse text-sm">
                  <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold text-[var(--app-text-secondary)]">
                    <tr>
                      <th class="w-10 px-2 py-2 text-center">#</th>
                      <th class="px-2 py-2 text-left">Date</th>
                      <th class="px-2 py-2 text-right">Beta</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, index) in betaBottomRows" :key="row.timestamp" class="border-t border-[var(--app-border-muted)]">
                      <td class="px-2 py-2 text-center text-[var(--app-text-muted)]">{{ index + 1 }}</td>
                      <td class="px-2 py-2 font-semibold text-[var(--app-primary)]">{{ row.date }}</td>
                      <td class="px-2 py-2 text-right font-semibold text-rose-600">{{ formatBetaTableValue(row.beta) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </template>
      </div>
    </template>

    <template v-else>
      <div class="mt-4 grid gap-4">
        <AppDataTable
          v-if="primaryColumns.length"
          :columns="primaryColumns"
          :rows="primaryRows"
          :loading="loading"
          empty-message="No matrix rows found"
        />
        <AppDataTable
          v-if="secondaryColumns.length"
          :columns="secondaryColumns"
          :rows="secondaryRows.slice(0, 50)"
          :loading="loading"
          empty-message="No series rows found"
        />
        <div v-if="loading && !primaryColumns.length && !secondaryColumns.length" class="h-48 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
          Loading results...
        </div>
        <div v-else-if="!hasResults" class="h-48 rounded-md border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface)] px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
          No results yet
        </div>
      </div>
    </template>
    </template>
  </div>
</template>

<style scoped>
.pattern-workspace { display: grid; gap: 16px; min-width: 0; color: var(--app-text-secondary); font-size: 13px; }
.pattern-workspace h3 { font-size: 15px; font-weight: 800; color: var(--app-text); }
.pattern-workspace h4 { font-size: 14px; font-weight: 750; }
.pattern-periods { display: grid; grid-template-columns: minmax(0, 1fr) 130px minmax(0, 1fr); gap: 12px; }
.pattern-period { min-width: 0; border: 1px solid #c5ddff; border-radius: 6px; background: #f0f7ff; padding: 12px; }
.pattern-period:last-child { background: #f6f1ff; border-color: #dfd1ff; }
.pattern-period h3::before, .pattern-chart h3::before { content: ''; display: inline-block; width: 5px; height: 19px; background: var(--app-primary); border-radius: 3px; margin-right: 8px; vertical-align: middle; }
.pattern-period:last-child h3::before, .pattern-chart h3.pattern-b::before { background: #b52bfa; }
.pattern-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
.pattern-fields label { display: grid; gap: 5px; min-width: 0; color: var(--app-text-muted); font-size: 11px; font-weight: 700; }
.pattern-fields input { width: 100%; min-width: 0; height: 40px; padding: 0 10px; border: 1px solid var(--app-border); border-radius: 6px; background: var(--app-surface); color: var(--app-text-secondary); font-size: 13px; }
.pattern-status { display: flex; align-items: center; gap: 6px; color: var(--app-text-muted); font-size: 12px; margin-top: 10px; }
.pattern-period .pattern-status { background: #e7f7f0; border: 1px solid #d0eee4; padding: 10px; border-radius: 4px; font-weight: 600; }
.pattern-bar-input { display: flex; align-items: center; gap: 5px; }
.pattern-bar-input input { flex: 1; }
.pattern-bar-input input { min-width: 62px; }
.pattern-bar-input small { font-size: 10px; white-space: nowrap; }
.pattern-workspace .pattern-a { color: var(--app-primary); }
.pattern-workspace .pattern-b { color: var(--app-accent); }
.pattern-valid { color: var(--app-positive); }
.pattern-negative { color: var(--app-negative); }
.pattern-swap { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; border: 1px solid var(--app-border); border-radius: 6px; background: var(--app-surface); }
.pattern-workspace button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 34px; padding: 6px 10px; border: 1px solid var(--app-border); border-radius: 6px; background: var(--app-surface); color: var(--app-primary); font-size: 12px; font-weight: 700; }
.pattern-workspace button:disabled { opacity: .5; cursor: not-allowed; }
.pattern-workspace button:hover:enabled { border-color: var(--app-primary); }
.pattern-actions { display: flex; justify-content: flex-end; gap: 8px; }
.pattern-workspace .pattern-run { background: var(--app-primary); color: white; }
.pattern-analysis { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 3fr); gap: 16px; }
.pattern-detail { display: flex; flex-direction: column; }
.pattern-detail > small { margin-top: 4px; }
.pattern-score { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; padding: 16px; border: 1px solid var(--app-border); border-radius: 6px; background: var(--app-surface); }
.pattern-score > strong { font-size: 42px; line-height: 1; font-weight: 800; }
.pattern-score-note { flex: 1 1 170px; border-left: 1px solid var(--app-border); padding-left: 15px; color: var(--app-text-muted); font-size: 12px; }
.pattern-badge { display: inline-block; padding: 5px 9px; border-radius: 6px; font-size: 11px; font-weight: 700; }
.pattern-chart { min-width: 0; overflow: hidden; background: var(--app-surface); border: 1px solid var(--app-border-muted); border-radius: 6px; padding: 12px; }
.pattern-chart > p { font-size: 11px; color: var(--app-text-muted); margin-top: 5px; }
.pattern-detail { border: 1px solid var(--app-border-muted); border-radius: 6px; background: var(--app-surface); padding: 16px; min-width: 0; }
.pattern-detail-period { margin-top: 16px; }
.pattern-detail dl { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 7px; margin-top: 8px; font-size: 12px; }
.pattern-detail dt { color: var(--app-text-muted); }
.pattern-detail dd { text-align: right; font-weight: 700; overflow-wrap: anywhere; }
.pattern-difference { margin-top: auto; padding-top: 14px; border-top: 1px solid var(--app-border); display: flex; justify-content: space-between; gap: 8px; }
.pattern-subtitle { color: var(--app-text-muted); font-size: 12px; font-weight: 500; }
@media (min-width: 1500px) { .pattern-fields { grid-template-columns: minmax(0, .8fr) minmax(0, 1.5fr); gap: 8px; } .pattern-bar-input { flex-direction: column; align-items: stretch; } .pattern-bar-input input { flex: none; } }
:root[data-theme='dark'] .pattern-period { background: #10263c; border-color: #29445f; }
:root[data-theme='dark'] .pattern-period:last-child { background: #261d3c; }
:root[data-theme='dark'] .pattern-period .pattern-status { background: #12382f; border-color: #215445; }
@media (max-width: 1200px) { .pattern-analysis { grid-template-columns: minmax(0, 1fr); } .pattern-detail { border-left: 0; border-top: 1px solid var(--app-border); } }
@media (max-width: 760px) { .pattern-periods { grid-template-columns: minmax(0, 1fr); } .pattern-swap { flex-direction: row; flex-wrap: wrap; } }
/* The formula image is black-on-transparent; invert it for dark surfaces. */
.pattern-length { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; padding: 14px 16px; border: 1px solid var(--app-border); border-radius: 6px; }
.pattern-length label { font-weight: 800; color: var(--app-text); }
.pattern-length input { width: 100px; height: 38px; padding: 0 12px; border: 1px solid var(--app-border); border-radius: 5px; background: var(--app-surface); font-size: 16px; font-weight: 700; }
.pattern-length-lock { border-inline: 1px solid var(--app-border); padding-inline: 24px; }
.pattern-periods { grid-template-columns: minmax(0, 1fr) 44px minmax(0, 1fr); }
.pattern-fields { grid-template-columns: minmax(0, .85fr) minmax(0, 1.5fr); }
.pattern-period { padding: 14px; }
.pattern-swap { border: 0; background: transparent; }
.pattern-swap button { width: 42px; height: 44px; }
.pattern-auto-end { position: relative; display: flex; align-items: center; }
.pattern-auto-end input { background: var(--app-surface-muted); color: var(--app-text-muted); padding-right: 55px; }
.pattern-auto-end > span { position: absolute; right: 8px; padding: 3px 7px; background: var(--app-border-muted); border-radius: 12px; color: var(--app-text-muted); font-size: 11px; }
.pattern-period-caption { color: var(--app-text-muted); margin-top: 8px; font-size: 12px; }
.pattern-actions { align-items: stretch; }
.pattern-actions > button { min-height: 44px; }
.pattern-aligned-status { display: flex; align-items: center; gap: 8px; flex: 1; padding: 10px 16px; background: color-mix(in srgb, var(--app-positive) 8%, var(--app-surface)); border: 1px solid color-mix(in srgb, var(--app-positive) 22%, var(--app-surface)); border-radius: 5px; font-weight: 700; }
@media (max-width: 760px) { .pattern-periods { grid-template-columns: minmax(0, 1fr); } .pattern-fields { grid-template-columns: minmax(0, 1fr); } .pattern-actions { flex-wrap: wrap; } .pattern-aligned-status { flex-basis: 100%; } .pattern-length-lock { padding-inline: 12px; } }
.pattern-chart-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pattern-mode-toggle { display: inline-flex; overflow: hidden; border: 1px solid var(--app-border); border-radius: 6px; }
.pattern-mode-toggle button { border: 0; border-radius: 0; min-height: 30px; background: var(--app-surface); }
.pattern-mode-toggle button + button { border-left: 1px solid var(--app-border); }
.pattern-mode-toggle button[aria-pressed='true'] { background: var(--app-primary-soft); color: var(--app-primary); }
.pattern-date-range { display: flex; align-items: center; gap: 6px; }
.pattern-date-range input { flex: 1; min-width: 0; padding: 0 8px; }
.pattern-date-range > span { flex-shrink: 0; color: var(--app-text-muted); font-weight: 700; }
.pattern-score-decimal { color: var(--app-text-muted); font-size: 16px; font-weight: 700; }
.pattern-score-bars { color: var(--app-text-muted); font-size: 12px; font-weight: 600; }
.pattern-slider { width: 100%; margin: 10px 0 2px; accent-color: var(--app-primary); cursor: pointer; }
.pattern-detail-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.pattern-detail-heading strong { font-size: 13px; font-weight: 800; color: var(--app-text); }
.pattern-detail-help { color: var(--app-text-muted); font-size: 11px; margin-top: 4px; }
:root[data-theme='dark'] .beta-formula-img {
  filter: invert(1);
}
</style>

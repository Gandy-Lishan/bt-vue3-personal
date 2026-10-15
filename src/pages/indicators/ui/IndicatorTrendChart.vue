<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BarChart3, CalendarDays, Download, ExternalLink, Maximize2, Plus } from '@lucide/vue'
import Highcharts from 'highcharts/highstock'
import { isIndicatorSeasonalityChartData, isSeasonalityIndicatorType } from '@/entities/indicator/model/indicator.chart'
import type { IndicatorChartData, IndicatorChartDataRow, IndicatorDetail } from '@/entities/indicator/model/indicator.types'
import IndicatorSeasonalityChart from './IndicatorSeasonalityChart.vue'
import {
  baseHighchartsChartOptions,
  chartFontSize,
  chartNavigatorOptions,
  chartScrollbarOptions,
  chartSize,
  cssVar,
  disabledSeriesStates,
  highchartsCrosshairOptions,
  indicatorChartTheme,
  monthLabels,
} from './indicatorHighcharts'
import { colorZonesFromFlags, type ChartZone } from './indicatorChartZones'
import { indicatorLineIndexes, seriesColorFallback, seriesColorVar } from './indicatorSeriesColor'

type RangeId = '3M' | '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | '10Y' | '15Y' | '20Y' | 'All'

interface ChartSeriesModel {
  key: string
  name: string
  data: Array<[number, number]>
  color: string
  /** Set only for series whose rows carry a per-row Color flag. */
  zones?: ChartZone[]
}

interface ChartThresholdValues {
  opt: number | null
  pess: number | null
}

const props = withDefaults(
  defineProps<{
    detail: IndicatorDetail
    rows: IndicatorChartData
    loading?: boolean
    error?: string
    isMobile?: boolean
  }>(),
  {
    loading: false,
    error: '',
    isMobile: false,
  },
)

const emit = defineEmits<{
  download: []
}>()

let chart: Highcharts.Chart | null = null
let activeSeriesModels: ChartSeriesModel[] = []
let themeObserver: MutationObserver | null = null
const chartElement = ref<HTMLDivElement | null>(null)
const chartShell = ref<HTMLElement | null>(null)
const activeRange = ref<RangeId>('3Y')
const isComparing = ref(false)
const visibleMin = ref<number | null>(null)
const visibleMax = ref<number | null>(null)

// Chart-specific narrow breakpoint: axis titles, navigator etc. should only fold on small phones.
const compactChartBreakpoint = '(max-width: 640px)'
const isCompactChart = ref(false)
let compactQuery: MediaQueryList | null = null

function updateCompactChartState() {
  isCompactChart.value = compactQuery?.matches ?? false
}

const standardRows = computed(() => (Array.isArray(props.rows) ? props.rows : []))
const seasonalityData = computed(() => (isIndicatorSeasonalityChartData(props.rows) ? props.rows : null))
const isSeasonalityChart = computed(() => {
  const type = props.detail.raw?.type ?? props.detail.type
  return isSeasonalityIndicatorType(type) || seasonalityData.value !== null
})
const hasRows = computed(() => {
  if (isSeasonalityChart.value) {
    const data = seasonalityData.value
    return Boolean(data && (data.day_of_year.length || data.current_day_of_year.length || data.month.length))
  }
  return standardRows.value.length > 0
})

const rangeOptions: Array<{ id: RangeId; label: string; unit?: 'month' | 'year' | 'ytd'; count?: number }> = [
  { id: '3M', label: '3M', unit: 'month', count: 3 },
  { id: '6M', label: '6M', unit: 'month', count: 6 },
  { id: 'YTD', label: 'YTD', unit: 'ytd' },
  { id: '1Y', label: '1Y', unit: 'year', count: 1 },
  { id: '3Y', label: '3Y', unit: 'year', count: 3 },
  { id: '5Y', label: '5Y', unit: 'year', count: 5 },
  { id: '10Y', label: '10Y', unit: 'year', count: 10 },
  { id: '15Y', label: '15Y', unit: 'year', count: 15 },
  { id: '20Y', label: '20Y', unit: 'year', count: 20 },
  { id: 'All', label: 'All' },
]

const excludedKeys = new Set(['date', 'Date', 'dumb', 'Dumb', 'color', 'Color'])
const thresholdKeys = new Set(['opt', 'pess'])
const chartTheme = indicatorChartTheme

const visibleRangeLabel = computed(() => {
  if (visibleMin.value === null || visibleMax.value === null) return 'No date range'
  return `${formatChartDate(visibleMin.value)} - ${formatChartDate(visibleMax.value)}`
})

function rawString(key: string) {
  const value = props.detail.raw?.[key]
  return value === undefined || value === null ? '' : String(value)
}

function numericValue(value: unknown) {
  if (value === undefined || value === null || value === '' || typeof value === 'boolean') return null
  const numeric = Number(String(value).replace('%', ''))
  return Number.isFinite(numeric) ? numeric : null
}

function rowTimestamp(row: IndicatorChartDataRow) {
  const value = row.date ?? row.Date
  if (typeof value === 'number') return value > 1_000_000_000_000 ? value : value * 1000

  const text = String(value ?? '').trim()
  const dateParts = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2})(?::?(\d{1,2}))?(?::?(\d{1,2}))?)?/)
  if (dateParts) {
    const [, year, month, day, hour = '0', minute = '0', second = '0'] = dateParts
    return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
  }

  const timestamp = Date.parse(text)
  return Number.isFinite(timestamp) ? timestamp : null
}

function formattedNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[char] ?? char
  })
}

function formatChartDate(timestamp: number) {
  const date = new Date(timestamp)
  return `${monthLabels[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

function datedRows() {
  return standardRows.value
    .map((row) => ({ row, timestamp: rowTimestamp(row) }))
    .filter((item): item is { row: IndicatorChartDataRow; timestamp: number } => item.timestamp !== null)
    .sort((left, right) => left.timestamp - right.timestamp)
}

function isThresholdKey(key: string) {
  return thresholdKeys.has(key.toLowerCase())
}

function marketSymbol() {
  return String(props.detail.marketSymbol ?? rawString('market_symbol') ?? '').trim()
}

function isMarketKey(key: string) {
  const symbol = marketSymbol()
  return Boolean(symbol) && key.toLowerCase() === symbol.toLowerCase()
}

function isTrendReltrend() {
  const type = rawString('type') || props.detail.type
  const subType = rawString('sub_type')
  const groups = rawString('groups')
  return [type, subType, groups].some((value) => value.includes('trend_reltrend'))
}

function orderedSeriesKeys() {
  const keys = new Set<string>()
  for (const row of standardRows.value) {
    for (const [key, value] of Object.entries(row)) {
      if (excludedKeys.has(key)) continue
      if (numericValue(value) !== null) keys.add(key)
    }
  }

  return Array.from(keys).sort((left, right) => {
    const leftLower = left.toLowerCase()
    const rightLower = right.toLowerCase()
    const leftThreshold = isThresholdKey(left)
    const rightThreshold = isThresholdKey(right)
    if (leftThreshold !== rightThreshold) return leftThreshold ? 1 : -1

    if (marketSymbol()) {
      if (isMarketKey(left) && !isMarketKey(right)) return -1
      if (!isMarketKey(left) && isMarketKey(right)) return 1
    }

    if (leftLower === props.detail.id.toLowerCase() && rightLower !== props.detail.id.toLowerCase()) return 1
    if (leftLower !== props.detail.id.toLowerCase() && rightLower === props.detail.id.toLowerCase()) return -1

    const leftHasUnderscore = left.includes('_')
    const rightHasUnderscore = right.includes('_')
    if (leftHasUnderscore !== rightHasUnderscore) return leftHasUnderscore ? 1 : -1

    return left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true })
  })
}

function marketSeriesLabel(key: string) {
  const symbol = marketSymbol() || key
  const underlying = String(
    props.detail.raw?.underlying_name ??
      props.detail.raw?.market_name ??
      props.detail.raw?.symbol_name ??
      props.detail.raw?.name ??
      '',
  ).trim()

  if (underlying && !symbol.includes('(') && !underlying.toLowerCase().includes(symbol.toLowerCase())) {
    return `${symbol.toUpperCase()} (${underlying})`
  }

  return symbol.toUpperCase()
}

function titleCaseKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bSpx\b/g, 'SPX')
}

function seriesLabel(key: string, index: number) {
  const lower = key.toLowerCase()
  const url = props.detail.id
  const type = rawString('type') || props.detail.type
  const subType = rawString('sub_type')
  const groups = rawString('groups')
  const volatilitySymbol = marketSymbol().toLowerCase()

  if (isMarketKey(key)) return marketSeriesLabel(key)
  if (lower === props.detail.id.toLowerCase()) return props.detail.title
  if (lower === 'close' && index === 0) return props.detail.title

  if ((key.includes('_reltrend') || key.includes('_trend')) && isTrendReltrend()) {
    return key.replace('_reltrend', ' Relative Trend Score').replace('_trend', ' Trend Score')
  }

  if (key === 'model_smart_money' && url === 'smart_dumb') return 'Smart Money'
  if (key === 'model_dumb_money' && url === 'smart_dumb') return 'Dumb Money'
  if (key === 'model_risk_stocks_short' && url === 'risk_levels') return 'Short Term Risk Levels'
  if (key === 'model_risk_stocks_medium' && url === 'risk_levels') return 'Intermediate Term Risk Levels'
  if (groups === 'volatility_relvolatility' && volatilitySymbol) {
    if (lower === `${volatilitySymbol}_volatility`) return 'Historical Volatility (20-Day)'
    if (lower === `${volatilitySymbol}_volatility_60d`) return 'Historical Volatility (60-Day)'
  }

  if (
    key.includes('_') &&
    url !== 'smart_dumb' &&
    url !== 'risk_levels' &&
    subType !== 'crp_trend_reltrend' &&
    groups !== 'volatility_relvolatility' &&
    !type.includes('trend_reltrend')
  ) {
    return props.detail.title
  }

  return titleCaseKey(key)
}

function seriesColor(key: string, indicatorIndex: number) {
  const variable = seriesColorVar(isMarketKey(key), indicatorIndex)
  return cssVar(variable, seriesColorFallback(variable))
}

/** The per-row `Color` flag that drives risk_measure's segment colours. */
function rowColorFlag(row: IndicatorChartDataRow): boolean | null {
  const value = row.Color ?? row.color
  return typeof value === 'boolean' ? value : null
}

function riskFlagZones(entries: Array<{ timestamp: number; flag: boolean | null }>) {
  // The flag is a market-wide state, so every line drawn from these rows carries it —
  // the indicator's own line and the ticker overlay alike.
  if (!entries.length || !entries.every((entry) => entry.flag !== null)) return undefined

  return colorZonesFromFlags(
    entries.map((entry) => ({ x: entry.timestamp, flagged: Boolean(entry.flag) })),
    {
      flagged: cssVar('--chart-flag-true', '#ff0000'),
      unflagged: cssVar('--chart-flag-false', '#000000'),
    },
  )
}

function buildSeriesModels(): ChartSeriesModel[] {
  const rows = datedRows()
  const keys = orderedSeriesKeys().filter((key) => !isThresholdKey(key))
  const lineIndexes = indicatorLineIndexes(keys, isMarketKey)

  return keys
    .map((key, index): ChartSeriesModel | null => {
      const entries = rows
        .map((item) => {
          const value = numericValue(item.row[key])
          return value === null ? null : { timestamp: item.timestamp, value, flag: rowColorFlag(item.row) }
        })
        .filter((entry): entry is { timestamp: number; value: number; flag: boolean | null } => entry !== null)

      if (entries.length < 2) return null

      return {
        key,
        name: seriesLabel(key, index),
        data: entries.map((entry) => [entry.timestamp, entry.value] as [number, number]),
        color: seriesColor(key, lineIndexes.get(key) ?? 0),
        zones: riskFlagZones(entries),
      }
    })
    .filter((series): series is ChartSeriesModel => series !== null)
}

function latestRowValue(key: string) {
  for (const row of [...standardRows.value].reverse()) {
    const value = numericValue(row[key])
    if (value !== null) return value
  }
  return null
}

function thresholdValues() {
  const rowOpt = latestRowValue('opt')
  const rowPess = latestRowValue('pess')
  const opt = rowOpt !== null ? rowOpt : Number.isFinite(props.detail.opt) ? Number(props.detail.opt) : null
  const pess = rowPess !== null ? rowPess : Number.isFinite(props.detail.pess) ? Number(props.detail.pess) : null

  return {
    opt,
    pess,
  }
}

function latestSeriesValue(data: Array<[number, number]>) {
  for (let index = data.length - 1; index >= 0; index -= 1) {
    const value = data[index]?.[1]
    if (Number.isFinite(value)) return value
  }
  return null
}

function seriesLegendName(series: ChartSeriesModel) {
  const latestValue = latestSeriesValue(series.data)
  if (latestValue === null) return series.name
  return `${series.name} (Last = ${formattedNumber(latestValue)})`
}

function seriesAxisTitle(series: ChartSeriesModel) {
  const latestValue = latestSeriesValue(series.data)
  const name = escapeHtml(series.name)
  if (latestValue === null) return name
  return `${name}<br/><span style="white-space:nowrap;">(Last = ${formattedNumber(latestValue)})</span>`
}

function stripLastValueSuffix(name: string) {
  return name.replace(/\s+\(Last = [^)]+\)$/, '')
}

function seriesNumericValues(series: ChartSeriesModel[]) {
  return series.flatMap((item) => item.data.map((point) => point[1])).filter((value) => Number.isFinite(value))
}

function indicatorSeries(series: ChartSeriesModel[], twoPane: boolean) {
  return twoPane ? series.slice(1) : series
}

function normalizeThresholdValue(value: number | null, indicatorValues: number[]) {
  if (value === null || !Number.isFinite(value) || !indicatorValues.length) return value

  const maxAbsIndicator = Math.max(...indicatorValues.map((item) => Math.abs(item)))
  if (!Number.isFinite(maxAbsIndicator) || maxAbsIndicator === 0) return value

  let normalized = value
  if (normalized === 0) return normalized

  while (Math.abs(normalized) > maxAbsIndicator * 5 && Math.abs(normalized) > 1) {
    normalized /= 100
  }
  while (Math.abs(normalized) * 5 < maxAbsIndicator && Math.abs(normalized) < 2) {
    normalized *= 100
  }

  return normalized
}

function thresholdValuesForAxis(indicatorValues: number[]): ChartThresholdValues {
  const { opt, pess } = thresholdValues()
  return {
    opt: normalizeThresholdValue(opt, indicatorValues),
    pess: normalizeThresholdValue(pess, indicatorValues),
  }
}

function thresholdPlotLines(thresholds: ChartThresholdValues): Highcharts.YAxisPlotLinesOptions[] {
  const { opt, pess } = thresholds
  const lines: Highcharts.YAxisPlotLinesOptions[] = []

  if (opt !== null && Number.isFinite(opt)) {
    const color = chartTheme().negative
    lines.push({
      value: opt,
      color,
      dashStyle: 'ShortDash',
      width: 1.5,
      zIndex: 5,
      label: {
        text: formattedNumber(opt),
        align: 'left',
        x: 4,
        y: -5,
        style: { color, fontSize: chartFontSize(12), fontWeight: '700' },
      },
    })
  }

  if (pess !== null && Number.isFinite(pess)) {
    const color = chartTheme().positive
    lines.push({
      value: pess,
      color,
      dashStyle: 'ShortDash',
      width: 1.5,
      zIndex: 5,
      label: {
        text: formattedNumber(pess),
        align: 'left',
        x: 4,
        y: -5,
        style: { color, fontSize: chartFontSize(12), fontWeight: '700' },
      },
    })
  }

  return lines
}

function chartDataBounds(series = buildSeriesModels()) {
  const timestamps = series.flatMap((item) => item.data.map((point) => point[0]))
  if (!timestamps.length) return null
  return {
    min: Math.min(...timestamps),
    max: Math.max(...timestamps),
  }
}

function visibleSeriesValues(series: ChartSeriesModel[], min: number | null = visibleMin.value, max: number | null = visibleMax.value) {
  const hasRange = Number.isFinite(min) && Number.isFinite(max)
  const values = series.flatMap((item) =>
    item.data
      .filter((point) => !hasRange || (point[0] >= Number(min) && point[0] <= Number(max)))
      .map((point) => point[1]),
  )

  return values.length ? values : seriesNumericValues(series)
}

function paddedDataRange(values: number[]) {
  const finiteValues = values.filter((value) => Number.isFinite(value))
  if (!finiteValues.length) return null

  let min = Math.min(...finiteValues)
  let max = Math.max(...finiteValues)
  if (min === max) {
    const padding = Math.max(Math.abs(min) * 0.08, 0.01)
    return { min: min - padding, max: max + padding }
  }

  const padding = (max - min) * 0.08
  return { min: min - padding, max: max + padding }
}

function syncChartYAxisExtremes(min = visibleMin.value, max = visibleMax.value, redraw = true) {
  if (!chart || !activeSeriesModels.length || isComparing.value) return

  const twoPane = activeSeriesModels.length > 1
  const panes: Array<{ axisIndex: number; series: ChartSeriesModel[] }> = twoPane
    ? [
        { axisIndex: 0, series: activeSeriesModels.slice(0, 1) },
        { axisIndex: 1, series: activeSeriesModels.slice(1) },
      ]
    : [{ axisIndex: 0, series: activeSeriesModels }]

  for (const pane of panes) {
    const axis = chart.yAxis[pane.axisIndex]
    const range = paddedDataRange(visibleSeriesValues(pane.series, min, max))
    if (axis && range) {
      axis.setExtremes(range.min, range.max, false, false)
    }
  }

  if (redraw) chart.redraw(false)
}

function rangeStartFor(rangeId: RangeId, max: number) {
  if (rangeId === 'All') return null

  const range = rangeOptions.find((item) => item.id === rangeId)
  if (!range) return null

  const date = new Date(max)
  if (range.unit === 'ytd') return Date.UTC(date.getUTCFullYear(), 0, 1)
  if (range.unit === 'month') {
    date.setUTCMonth(date.getUTCMonth() - (range.count ?? 0))
    return date.getTime()
  }
  if (range.unit === 'year') {
    date.setUTCFullYear(date.getUTCFullYear() - (range.count ?? 0))
    return date.getTime()
  }

  return null
}

function updateVisibleRange(min: number | undefined, max: number | undefined) {
  visibleMin.value = Number.isFinite(min) ? Number(min) : null
  visibleMax.value = Number.isFinite(max) ? Number(max) : null
}

function applyRange(rangeId: RangeId) {
  activeRange.value = rangeId

  const axis = chart?.xAxis[0]
  const axisWithData = axis as (Highcharts.Axis & { dataMin?: number; dataMax?: number }) | undefined
  const bounds =
    axisWithData?.dataMin !== undefined && axisWithData.dataMax !== undefined
      ? { min: axisWithData.dataMin, max: axisWithData.dataMax }
      : chartDataBounds()
  if (!axis || !bounds) return

  const nextStart = rangeStartFor(rangeId, bounds.max)
  const min = nextStart === null ? bounds.min : Math.max(bounds.min, nextStart)
  axis.setExtremes(min, bounds.max, true, false, { trigger: 'customRangeButton' })
  updateVisibleRange(min, bounds.max)
  syncChartYAxisExtremes(min, bounds.max)
}

function defaultRange() {
  const url = props.detail.id
  if (url === 'risk_levels' || isTrendReltrend()) return '1Y'
  return '3Y'
}

function fullscreenTarget() {
  return chartShell.value ?? chartElement.value
}

async function toggleFullScreen() {
  const target = fullscreenTarget()
  if (!target) return

  if (document.fullscreenElement) {
    await document.exitFullscreen()
  } else if (target.requestFullscreen) {
    await target.requestFullscreen()
  }

  window.setTimeout(() => chart?.reflow(), 100)
}

function toggleCompare() {
  isComparing.value = !isComparing.value
  chart?.update(
    {
      plotOptions: {
        series: {
          compare: isComparing.value ? 'percent' : undefined,
        },
      },
    } as Highcharts.Options,
    true,
    false,
  )
}

function backtestMarketSymbol() {
  let symbol = marketSymbol() || 'Unknown'
  const subType = rawString('sub_type')
  if (subType === 'crp_trend_reltrend' || subType === 'crypto') {
    const [prefix, suffix] = symbol.split('_')
    if (prefix && suffix) symbol = `${prefix.toLowerCase()}_${suffix}`
  }
  return symbol
}

function backtestIndicatorId() {
  const url = props.detail.id
  if (url === 'smart_dumb') return 'model_smart_money'
  if (url === 'risk_levels') return 'model_risk_stocks_short'
  if (isTrendReltrend()) return url.replace(/(.*?)_trend_reltrend/, '$1_trend')
  return url
}

function openBacktest() {
  const target = `/backtester/sr/setup?index=${encodeURIComponent(backtestMarketSymbol())}&indicator=${encodeURIComponent(backtestIndicatorId())}`
  window.open(target, '_blank', 'noopener,noreferrer')
}

function openLargeChart() {
  window.open(`https://users.sentimentrader.com/users/charts/${props.detail.id}`, '_blank', 'noopener,noreferrer')
}

function destroyChart() {
  chart?.destroy()
  chart = null
  activeSeriesModels = []
}

function renderChart() {
  destroyChart()
  if (isSeasonalityChart.value || !chartElement.value || props.loading || props.error || !hasRows.value) {
    updateVisibleRange(undefined, undefined)
    return
  }

  const seriesModels = buildSeriesModels()
  if (!seriesModels.length) {
    updateVisibleRange(undefined, undefined)
    return
  }
  activeSeriesModels = seriesModels

  const isCompact = isCompactChart.value
  const twoPane = seriesModels.length > 1
  const theme = chartTheme()
  const textColor = theme.textSecondary
  const gridColor = theme.grid
  const borderColor = theme.border
  const primaryColor = theme.primary
  const lowerSeries = indicatorSeries(seriesModels, twoPane)
  const indicatorValues = seriesNumericValues(lowerSeries)
  const thresholds = thresholdValuesForAxis(indicatorValues)
  const navigatorSource = seriesModels[1] ?? seriesModels[0]

  chart = Highcharts.stockChart(chartElement.value, {
    time: {
      timezone: 'UTC',
    },
    chart: {
      ...baseHighchartsChartOptions(theme),
      spacingLeft: chartSize(8),
      spacingRight: chartSize(isCompact ? 48 : 72),
      spacingTop: chartSize(8),
      spacingBottom: chartSize(10),
      zooming: {
        type: 'x',
      },
    },
    credits: {
      enabled: false,
    },
    accessibility: {
      enabled: false,
    },
    rangeSelector: {
      enabled: false,
    },
    legend: {
      enabled: true,
      align: 'center',
      verticalAlign: 'top',
      layout: 'horizontal',
      itemDistance: chartSize(26),
      margin: chartSize(46),
      symbolWidth: chartSize(34),
      x: 0,
      y: chartSize(28),
      itemStyle: {
        color: textColor,
        fontSize: chartFontSize(11),
        fontWeight: '600',
      },
      itemHoverStyle: {
        color: primaryColor,
      },
    },
    navigator: {
      ...chartNavigatorOptions(theme, navigatorSource.data),
      enabled: !isCompact,
    },
    scrollbar: {
      ...chartScrollbarOptions(theme),
      enabled: !isCompact,
    },
    xAxis: {
      type: 'datetime',
      ordinal: false,
      gridLineWidth: 0,
      gridLineColor: gridColor,
      gridLineDashStyle: 'Dot',
      lineColor: borderColor,
      tickColor: borderColor,
      tickPixelInterval: chartSize(150),
      labels: {
        format: "{value:%b '%y}",
        style: { color: textColor, fontSize: chartFontSize(11) },
      },
      crosshair: highchartsCrosshairOptions(),
      events: {
        afterSetExtremes(event) {
          updateVisibleRange(event.min, event.max)
          syncChartYAxisExtremes(event.min, event.max)
        },
      },
    },
    yAxis: twoPane
      ? [
          {
            top: '0%',
            height: '37%',
            opposite: true,
            offset: 0,
            gridLineWidth: 1,
            gridLineColor: gridColor,
            gridLineDashStyle: 'Dot',
            lineWidth: 0,
            minPadding: 0.1,
            maxPadding: 0.1,
            tickPixelInterval: chartSize(46),
            labels: {
              x: chartSize(isCompact ? 4 : 25),
              style: { color: textColor, fontSize: chartFontSize(isCompact ? 9 : 10) },
            },
            title: isCompact
              ? undefined
              : {
                  text: seriesModels[0] ? seriesAxisTitle(seriesModels[0]) : undefined,
                  useHTML: true,
                  style: { color: textColor, fontSize: chartFontSize(10), lineHeight: '1.15' },
                  x: chartSize(36),
                },
          },
          {
            top: '40%',
            height: '60%',
            opposite: true,
            offset: 0,
            gridLineWidth: 1,
            gridLineColor: gridColor,
            gridLineDashStyle: 'Dot',
            lineWidth: 0,
            minPadding: 0.1,
            maxPadding: 0.1,
            tickPixelInterval: chartSize(44),
            labels: {
              x: chartSize(isCompact ? 4 : 25),
              style: { color: textColor, fontSize: chartFontSize(isCompact ? 9 : 10) },
            },
            title: isCompact
              ? undefined
              : {
                  text: seriesModels[1] ? seriesAxisTitle(seriesModels[1]) : escapeHtml(props.detail.title),
                  useHTML: true,
                  style: { color: primaryColor, fontSize: chartFontSize(10), lineHeight: '1.15' },
                  x: chartSize(44),
                },
            plotLines: thresholdPlotLines(thresholds),
          },
        ]
      : [
          {
            height: '90%',
            opposite: true,
            offset: 0,
            gridLineWidth: 1,
            gridLineColor: gridColor,
            gridLineDashStyle: 'Dot',
            lineWidth: 0,
            minPadding: 0.1,
            maxPadding: 0.1,
            tickPixelInterval: chartSize(44),
            labels: {
              x: chartSize(isCompact ? 4 : 25),
              style: { color: textColor, fontSize: chartFontSize(isCompact ? 9 : 10) },
            },
            title: isCompact
              ? undefined
              : {
                  text: seriesModels[0] ? seriesAxisTitle(seriesModels[0]) : undefined,
                  useHTML: true,
                  style: { color: primaryColor, fontSize: chartFontSize(10), fontWeight: '600', lineHeight: '1.15' },
                  x: chartSize(44),
                },
            plotLines: thresholdPlotLines(thresholds),
          },
        ],
    tooltip: {
      shared: true,
      useHTML: true,
      backgroundColor: theme.tooltipBg,
      borderColor,
      borderRadius: chartSize(8),
      padding: chartSize(8),
      shadow: true,
      style: {
        color: textColor,
        fontSize: chartFontSize(12),
      },
      formatter(this: { x?: number; points?: Highcharts.Point[]; point?: Highcharts.Point }) {
        const points = this.points ?? (this.point ? [this.point] : [])
        const rows = points
          .filter((point: Highcharts.Point) => point.y !== undefined && point.series.visible)
          .map((point: Highcharts.Point) => {
            const value = typeof point.y === 'number' ? point.y.toFixed(2) : point.y
            const name = escapeHtml(stripLastValueSuffix(point.series.name))
            return `<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:12px;margin-top:6px;"><span style="display:flex;align-items:center;min-width:0;"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${point.color};margin-right:7px;flex:0 0 auto;"></span><span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</span></span><b>${value}</b></div>`
          })
          .join('')

        return `<div style="width:220px;max-width:220px;"><b>${formatChartDate(Number(this.x))}</b>${rows}</div>`
      },
    },
    plotOptions: {
      series: {
        animation: false,
        turboThreshold: 0,
        showInNavigator: true,
        connectNulls: false,
        getExtremesFromAll: false,
        compare: isComparing.value ? 'percent' : undefined,
        states: disabledSeriesStates(),
      },
      column: {
        borderWidth: 0,
        pointWidth: props.detail.type === 'mff' ? 2 : undefined,
      },
    } as Highcharts.PlotOptions,
    series: seriesModels.map((series, index) => ({
      type: props.detail.type === 'mff' && index > 0 ? 'column' : 'line',
      name: seriesLegendName(series),
      data: series.data,
      yAxis: twoPane ? (index === 0 ? 0 : 1) : 0,
      color: series.color,
      // x-axis zones recolour the line per segment; without them it draws solid.
      zones: series.zones,
      zoneAxis: series.zones ? 'x' : undefined,
      lineWidth: 2,
      marker: {
        enabled: false,
      },
      threshold: props.detail.type === 'mff' ? 0 : undefined,
      dataGrouping: {
        enabled: true,
      },
    })) as Highcharts.SeriesOptionsType[],
  } as Highcharts.Options)

  applyRange(activeRange.value)
}

function handleFullscreenChange() {
  window.setTimeout(() => chart?.reflow(), 100)
}

function observeThemeChanges() {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return

  themeObserver?.disconnect()
  themeObserver = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.attributeName === 'data-theme')) {
      void nextTick(renderChart)
    }
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
}

watch(
  () => props.detail.id,
  () => {
    activeRange.value = defaultRange()
  },
  { immediate: true },
)

watch(
  () => [props.detail.id, props.rows, props.loading, props.error, props.isMobile, isCompactChart.value],
  () => {
    void nextTick(renderChart)
  },
  { deep: true },
)

watch(isCompactChart, () => {
  void nextTick(renderChart)
})

watch(isComparing, () => {
  void nextTick(renderChart)
})

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  observeThemeChanges()
  if (typeof window !== 'undefined') {
    compactQuery = window.matchMedia(compactChartBreakpoint)
    updateCompactChartState()
    compactQuery.addEventListener('change', updateCompactChartState)
  }
  void nextTick(renderChart)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  themeObserver?.disconnect()
  themeObserver = null
  compactQuery?.removeEventListener('change', updateCompactChartState)
  compactQuery = null
  destroyChart()
})
</script>

<template>
  <section ref="chartShell" class="indicator-chart-shell overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]">
    <div class="chart-toolbar px-4 pt-4">
      <!-- Desktop toolbar -->
      <div v-if="!props.isMobile" class="chart-primary-row">
        <div v-if="!isSeasonalityChart" class="chart-range-group">
          <button
            v-for="range in rangeOptions"
            :key="range.id"
            class="chart-range-button border-r border-[var(--app-border)] text-[0.8125rem] font-semibold last:border-r-0"
            :class="activeRange === range.id ? 'bg-[var(--app-primary)] text-white' : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]'"
            type="button"
            @click="applyRange(range.id)"
          >
            {{ range.label }}
          </button>
        </div>

        <div v-if="!isSeasonalityChart" class="chart-date-range text-[0.8125rem] font-semibold text-[var(--app-primary)]">
          <span>{{ visibleRangeLabel }}</span>
          <CalendarDays :size="16" />
        </div>

        <div class="chart-actions-row">
          <button
            v-if="!isSeasonalityChart"
            class="chart-action-button"
            :class="{ 'bg-[var(--app-primary-soft)]': isComparing }"
            type="button"
            @click="toggleCompare"
          >
            <Plus :size="15" />
            Compare
          </button>

          <button
            class="chart-action-button"
            type="button"
            @click="toggleFullScreen"
          >
            <Maximize2 :size="15" />
            Full Screen
          </button>

          <div class="download-tooltip-wrapper">
            <button
              class="chart-action-button"
              type="button"
              aria-describedby="indicator-download-tooltip"
              @click="emit('download')"
            >
              <Download :size="15" />
              Download
            </button>
            <div id="indicator-download-tooltip" class="download-tooltip" role="tooltip">
              To prevent abuse of sentimentrader data, we only provide recent 3-6 months data of the indicator.
              If you need access to full history, please contact us
              <a href="mailto:admin@sentimentrader.com" target="_blank" rel="noopener noreferrer">admin@sentimentrader.com</a>.
            </div>
          </div>

          <button
            class="chart-action-button"
            type="button"
            @click="openLargeChart"
          >
            <ExternalLink :size="15" />
            Legacy Indicator Chart
          </button>

          <button
            v-if="!isSeasonalityChart"
            class="chart-action-button"
            type="button"
            @click="openBacktest"
          >
            <BarChart3 :size="15" />
            Backtest
          </button>
        </div>
      </div>

      <!-- Mobile toolbar -->
      <div v-else class="flex flex-col gap-3">
        <!-- Range select -->
        <div v-if="!isSeasonalityChart" class="flex items-center gap-2">
          <select
            v-model="activeRange"
            class="flex-1 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--app-text)]"
            @change="applyRange(activeRange)"
          >
            <option v-for="range in rangeOptions" :key="range.id" :value="range.id">{{ range.label }}</option>
          </select>
          <span class="text-xs font-semibold text-[var(--app-primary)]">{{ visibleRangeLabel }}</span>
        </div>

        <!-- Action buttons row -->
        <div class="flex items-center gap-2 overflow-x-auto">
          <button
            v-if="!isSeasonalityChart"
            class="flex items-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs font-semibold text-[var(--app-primary)] whitespace-nowrap"
            :class="{ 'bg-[var(--app-primary-soft)]': isComparing }"
            type="button"
            @click="toggleCompare"
          >
            <Plus :size="14" /> Compare
          </button>
          <button
            class="flex items-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs font-semibold text-[var(--app-primary)] whitespace-nowrap"
            type="button"
            @click="toggleFullScreen"
          >
            <Maximize2 :size="14" /> Fullscreen
          </button>
          <button
            class="flex items-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs font-semibold text-[var(--app-primary)] whitespace-nowrap"
            type="button"
            @click="emit('download')"
          >
            <Download :size="14" /> CSV
          </button>
          <button
            class="flex items-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs font-semibold text-[var(--app-primary)] whitespace-nowrap"
            type="button"
            @click="openLargeChart"
          >
            <ExternalLink :size="14" /> Legacy
          </button>
          <button
            v-if="!isSeasonalityChart"
            class="flex items-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs font-semibold text-[var(--app-primary)] whitespace-nowrap"
            type="button"
            @click="openBacktest"
          >
            <BarChart3 :size="14" /> Backtest
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="indicator-chart-body flex items-center justify-center text-sm text-[var(--app-text-muted)]">
      Loading chart...
    </div>
    <div v-else-if="error" class="indicator-chart-body flex items-center justify-center px-6 text-center text-sm text-[var(--app-negative)]">
      {{ error }}
    </div>
    <div v-else-if="!hasRows" class="indicator-chart-body flex items-center justify-center text-sm text-[var(--app-text-muted)]">
      No chart data
    </div>
    <IndicatorSeasonalityChart
      v-else-if="isSeasonalityChart && seasonalityData"
      :detail="detail"
      :data="seasonalityData"
    />
    <div v-else ref="chartElement" class="indicator-chart-body w-full px-4 pb-4 pt-1" />
  </section>
</template>

<style scoped>
.chart-toolbar {
  display: flex;
  flex-direction: column;
  gap: calc(7px * var(--fixed-ui-scale, 1));
}

.indicator-chart-body {
  height: var(--indicator-chart-height);
}

.chart-primary-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(7px * var(--fixed-ui-scale, 1));
}

.chart-range-group {
  display: inline-flex;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: calc(6px * var(--fixed-ui-scale, 1));
  background: var(--app-surface);
}

.chart-range-button {
  min-width: calc(30px * var(--fixed-ui-scale, 1));
  height: calc(30px * var(--fixed-ui-scale, 1));
  padding: 0 calc(6px * var(--fixed-ui-scale, 1));
}

.chart-date-range,
.chart-action-button,
.chart-actions-row,
.download-tooltip-wrapper {
  display: inline-flex;
  align-items: center;
}

.chart-date-range {
  height: calc(30px * var(--fixed-ui-scale, 1));
  gap: calc(6px * var(--fixed-ui-scale, 1));
  white-space: nowrap;
}

.chart-action-button {
  height: calc(30px * var(--fixed-ui-scale, 1));
  gap: calc(6px * var(--fixed-ui-scale, 1));
  border: 1px solid var(--app-border);
  border-radius: calc(6px * var(--fixed-ui-scale, 1));
  background: var(--app-surface);
  padding: 0 calc(9px * var(--fixed-ui-scale, 1));
  color: var(--app-primary);
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
}

.chart-action-button:hover {
  background: var(--app-primary-soft);
}

.download-tooltip-wrapper {
  position: relative;
}

.download-tooltip {
  position: absolute;
  top: calc(100% + (8px * var(--fixed-ui-scale, 1)));
  right: 0;
  z-index: 20;
  width: min(360px, calc(100vw - 32px));
  padding: calc(10px * var(--fixed-ui-scale, 1)) calc(12px * var(--fixed-ui-scale, 1));
  border: 1px solid var(--app-border);
  border-radius: calc(6px * var(--fixed-ui-scale, 1));
  background: var(--app-surface);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
  color: var(--app-text-secondary);
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.45;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-2px);
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.download-tooltip a {
  color: var(--app-primary);
  font-weight: 700;
  text-decoration: underline;
}

.download-tooltip-wrapper:hover .download-tooltip,
.download-tooltip-wrapper:focus-within .download-tooltip {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.chart-actions-row {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: calc(7px * var(--fixed-ui-scale, 1));
  margin-left: auto;
}

@media (max-width: 1280px) {
  .chart-range-button {
    min-width: 40px;
    padding: 0 8px;
  }

  .chart-action-button {
    padding: 0 11px;
  }

  .chart-actions-row {
    justify-content: flex-start;
    margin-left: 0;
  }
}

.indicator-chart-shell:fullscreen {
  overflow: auto;
  background: var(--app-surface);
  padding: 16px;
}

:deep(.highcharts-navigator-xaxis text),
:deep(.highcharts-scrollbar text) {
  font-size: calc(9px * var(--chart-ui-scale, 1)) !important;
  font-weight: 400 !important;
}

:deep(.highcharts-title) {
  letter-spacing: 0;
}

:deep(.highcharts-background),
:deep(.highcharts-plot-background) {
  fill: var(--app-surface);
}

:deep(.highcharts-grid-line) {
  stroke: var(--chart-grid);
}

:deep(.highcharts-axis-line),
:deep(.highcharts-tick) {
  stroke: var(--app-border);
}

:deep(.highcharts-axis-labels text),
:deep(.highcharts-axis-title),
:deep(.highcharts-legend-item text),
:deep(.highcharts-range-input text) {
  fill: var(--app-text-secondary) !important;
  color: var(--app-text-secondary) !important;
}

:deep(.highcharts-tooltip-box) {
  fill: var(--chart-tooltip-bg);
  stroke: var(--app-border);
}

:deep(.highcharts-crosshair) {
  stroke-dasharray: 4 4;
}

:deep(.highcharts-navigator-mask-inside) {
  fill: rgba(22, 119, 255, 0.338);
}

:root[data-theme='dark'] :deep(.highcharts-navigator-mask-inside) {
  fill: rgba(97, 180, 255, 0.12);
}

:deep(.highcharts-scrollbar-thumb) {
  fill: rgba(22, 119, 255, 0.08);
  stroke: rgba(143, 182, 242, 0.35);
}

:root[data-theme='dark'] :deep(.highcharts-scrollbar-thumb) {
  fill: rgba(97, 180, 255, 0.14);
  stroke: rgba(97, 180, 255, 0.28);
}

:deep(.highcharts-scrollbar-track) {
  fill: rgba(255, 255, 255, 0.18);
  stroke: var(--app-border);
}

:root[data-theme='dark'] :deep(.highcharts-scrollbar-track) {
  fill: rgba(15, 27, 43, 0.38);
}
</style>

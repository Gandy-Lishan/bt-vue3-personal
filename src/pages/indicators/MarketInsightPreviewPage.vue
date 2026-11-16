<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { CalendarDays } from '@lucide/vue'
import Highcharts from 'highcharts/highstock'
import SpotlightChart from '../research-workspace/SpotlightChart.vue'
import { baseHighchartsChartOptions, chartFontSize, chartNavigatorOptions, chartScrollbarOptions, chartSize, disabledSeriesStates, highchartsCrosshairOptions, indicatorChartTheme, monthLabels } from './ui/indicatorHighcharts'

type Point = [number, number]
type AnnotationSpec = { type: 'point' | 'endpoint' | 'range' | 'arrow' | 'difference'; series: string; otherSeries?: string; date?: string; from?: string; to?: string; text?: string; metric?: 'value' | 'change' | 'change_percent'; arrow?: boolean; dx?: number; dy?: number }
type Row = Record<string, unknown>
type DataSet = { price: Point[]; indicators: Record<string, Point[]> }
type Metadata = { chart_name?: string; chart_type?: string; opt_extreme?: number | string; pess_extreme?: number | string; sentiment?: number | string }
type ZoomRange = '3M' | '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | '10Y' | '15Y' | '20Y' | 'All'

const defaultIndicatorChoices = [
  { id: 'etf_qqq_flow', label: 'QQQ Fund Flow' },
  { id: 'etf_spy_flow', label: 'SPY Fund Flow' },
] 
const route = useRoute()
const pageTitle = ref('Big inflows, then a Friday selloff')
const pageSubtitle = ref('Thursday fund flows and Friday price moves for SPY and QQQ.')
const baseSymbol = ref('SPX')
const priceTickers = ref<string[]>(['SPY', 'QQQ'])
const indicatorChoices = ref<Array<{ id: string; label: string }>>([...defaultIndicatorChoices])
const selectedTickers = ref<string[]>(['SPY', 'QQQ'])
const selectedIndicators = ref<string[]>(defaultIndicatorChoices.map(choice => choice.id))
const indicatorLayout = ref<'separate' | 'shared'>('separate')
const startDate = ref('1800-01-01')
const endDate = ref('2026-11-11')
const showMarks = ref(true)
const urlAnnotations = ref<AnnotationSpec[]>([])
const activeZoom = ref<ZoomRange>('1Y')
const relatedPeriod = ref<'1M' | '3M' | '6M'>('3M')
const relatedPeriodCount = computed(() => ({ '1M': 21, '3M': 63, '6M': 126 })[relatedPeriod.value])
const zoomRanges: ZoomRange[] = ['3M', '6M', 'YTD', '1Y', '3Y', '5Y', '10Y', '15Y', '20Y', 'All']
const visibleMin = ref<number | null>(null)
const visibleMax = ref<number | null>(null)
const loading = ref(false)
const error = ref('')
const data = ref<Record<string, DataSet>>({})
const metadata = ref<Record<string, Metadata>>({})
const chartElement = ref<HTMLDivElement | null>(null)
let chart: Highcharts.Chart | null = null
let annotationGroup: Highcharts.SVGElement | null = null
let themeObserver: MutationObserver | null = null
let requestController: AbortController | null = null

const loadedTickers = computed(() => selectedTickers.value.filter(ticker => data.value[ticker]?.price.length))
const loadedIndicators = computed(() => selectedIndicators.value.filter(id => data.value[baseSymbol.value]?.indicators[id]?.length))
const relatedCards = computed(() => indicatorChoices.value.flatMap(choice => {
  const points = data.value[baseSymbol.value]?.indicators[choice.id]?.slice(-126) ?? []
  if (!points.length) return []
  const meta = metadata.value[choice.id]
  const optimism = meta?.opt_extreme == null ? undefined : Number(meta.opt_extreme)
  const pessimism = meta?.pess_extreme == null ? undefined : Number(meta.pess_extreme)
  const extremes = {
    optimism: Number.isFinite(optimism) ? optimism : undefined,
    pessimism: Number.isFinite(pessimism) ? pessimism : undefined,
  }
  const values = points.map(point => point[1])
  const dates = points.map(point => new Date(point[0]).toISOString().slice(0, 10))
  const low = Math.min(...values, ...(extremes.optimism === undefined ? [] : [extremes.optimism]), ...(extremes.pessimism === undefined ? [] : [extremes.pessimism]))
  const high = Math.max(...values, ...(extremes.optimism === undefined ? [] : [extremes.optimism]), ...(extremes.pessimism === undefined ? [] : [extremes.pessimism]))
  const padding = (high - low || Math.max(Math.abs(high) * .1, 1)) * .12
  const last = values.at(-1)!
  return [{ id: choice.id, label: choice.label, values, dates, min: low - padding, max: high + padding,
    last, change: values.length > 1 ? last - values.at(-2)! : null, extremes }]
}))
const priceCards = computed(() => priceTickers.value.map(ticker => {
  const points = data.value[ticker]?.price ?? []
  const current = points.at(-1)
  const previous = points.at(-2)
  const change = current && previous ? current[1] - previous[1] : null
  const percent = change !== null && previous?.[1] ? change / previous[1] * 100 : null
  return { ticker, date: current ? formatChartDate(current[0]) : '', change, percent }
}))
const visibleRangeLabel = computed(() => visibleMin.value === null || visibleMax.value === null
  ? 'No date range' : `${formatChartDate(visibleMin.value)} - ${formatChartDate(visibleMax.value)}`)

function formattedNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function signedChange(value: number | null, suffix = '', prefix = '') {
  if (value === null) return '—'
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${prefix}${Math.abs(value).toFixed(2)}${suffix}`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)
}

function formatChartDate(timestamp: number) {
  const date = new Date(timestamp)
  return `${monthLabels[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

function latestValue(points: Point[]) {
  return points.at(-1)?.[1]
}

function seriesLegendName(name: string, points: Point[]) {
  const value = latestValue(points)
  return value === undefined ? name : `${name} (Last = ${formattedNumber(value)})`
}

function seriesAxisTitle(name: string, points: Point[]) {
  const value = latestValue(points)
  return `${escapeHtml(name)}${value === undefined ? '' : `<br/><span style="white-space:nowrap;">(Last = ${formattedNumber(value)})</span>`}`
}

function queryText(key: string): string | undefined {
  const value = route.query[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function applyUrlConfig() {
  pageTitle.value = queryText('title') ?? 'Big inflows, then a Friday selloff'
  pageSubtitle.value = queryText('subtitle') ?? queryText('description') ?? 'Thursday fund flows and Friday price moves for SPY and QQQ.'
  baseSymbol.value = (queryText('symbol') ?? 'SPX').toUpperCase()
  const requestedPrices = (queryText('price_symbols') ?? 'SPY,QQQ').split(',').map(value => value.trim().toUpperCase()).filter(Boolean)
  priceTickers.value = [...new Set(requestedPrices)].slice(0, 2)
  if (!priceTickers.value.length) priceTickers.value = ['SPY', 'QQQ']
  const indicatorParams = Object.entries(route.query)
    .filter(([key, value]) => /^indicator(?:_\d+)?$/.test(key) && typeof value === 'string' && value.trim())
    .sort(([left], [right]) => (left === 'indicator' ? 1 : Number(left.slice(10))) - (right === 'indicator' ? 1 : Number(right.slice(10))))
    .map(([key, value]) => ({ key, id: String(value).trim() }))
  const ids = indicatorParams.length ? indicatorParams : defaultIndicatorChoices.map((choice, index) => ({ key: index ? `indicator_${index + 1}` : 'indicator', id: choice.id }))
  indicatorChoices.value = [...new Set(ids.map(item => item.id))].map(id => {
    const key = ids.find(item => item.id === id)!.key
    const labelKey = key === 'indicator' ? 'indicator_label' : `${key}_label`
    return { id, label: queryText(labelKey) ?? defaultIndicatorChoices.find(choice => choice.id === id)?.label ?? id.replace(/_/g, ' ') }
  })
  selectedTickers.value = [...priceTickers.value]
  selectedIndicators.value = indicatorChoices.value.map(choice => choice.id)
  startDate.value = queryText('start') ?? '1800-01-01'
  endDate.value = queryText('end') ?? '2026-11-11'
  const rawAnnotations = queryText('annotations')
  urlAnnotations.value = []
  if (rawAnnotations) {
    try {
      const parsed: unknown = JSON.parse(rawAnnotations)
      if (Array.isArray(parsed)) urlAnnotations.value = parsed.filter((item): item is AnnotationSpec =>
        item && typeof item === 'object' && ['point', 'endpoint', 'range', 'arrow', 'difference'].includes(item.type)
        && typeof item.series === 'string' && (!item.text || typeof item.text === 'string')).slice(0, 20)
    } catch { /* Ignore malformed URL annotations. */ }
  }
  showMarks.value = true
  indicatorLayout.value = queryText('indicator_layout')?.toLowerCase() === 'shared' ? 'shared' : 'separate'
  const requestedZoom = queryText('zoom')?.toUpperCase()
  activeZoom.value = zoomRanges.find(range => range.toUpperCase() === requestedZoom) ?? '1Y'
}

function toggleTicker(ticker: string) {
  if (selectedTickers.value.includes(ticker)) {
    if (selectedTickers.value.length > 1) selectedTickers.value = selectedTickers.value.filter(item => item !== ticker)
  } else selectedTickers.value = priceTickers.value.filter(item => selectedTickers.value.includes(item) || item === ticker)
}

function toggleIndicator(id: string) {
  selectedIndicators.value = selectedIndicators.value.includes(id)
    ? selectedIndicators.value.filter(item => item !== id)
    : indicatorChoices.value.map(choice => choice.id).filter(item => selectedIndicators.value.includes(item) || item === id)
}

function priceLineColor(index: number) {
  return index === 0 ? 'var(--chart-primary,#111827)' : 'var(--app-primary,#006cff)'
}

function indicatorLineColor(id: string, index: number) {
  if (indicatorLayout.value === 'shared' && index === 1) return 'var(--app-negative,#be123c)'
  return id === 'etf_spy_flow' ? 'var(--chart-primary,#111827)' : ['var(--app-primary,#006cff)', '#d97706', '#7c3aed', '#059669'][index % 4]
}

function zoomBounds(latest: number, range: ZoomRange): number | undefined {
  if (range === 'All') return undefined
  const date = new Date(latest)
  if (range === 'YTD') return Date.UTC(date.getUTCFullYear(), 0, 1)
  if (range === '3M' || range === '6M') return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - (range === '3M' ? 3 : 6), date.getUTCDate())
  const years = Number.parseInt(range, 10)
  return Date.UTC(date.getUTCFullYear() - years, date.getUTCMonth(), date.getUTCDate())
}

function paddedChartMax(min: number, latest: number) {
  const day = 86400000
  return latest + Math.min(14 * day, Math.max(2 * day, (latest - min) * .03))
}

function chartDateBounds(): { earliest: number; latest: number } | null {
  const series = [
    ...loadedTickers.value.map(ticker => data.value[ticker]?.price ?? []),
    ...loadedIndicators.value.map(id => data.value[baseSymbol.value]?.indicators[id] ?? []),
  ].filter(points => points.length)
  if (!series.length) return null
  return {
    earliest: Math.min(...series.map(points => points[0]![0])),
    latest: Math.max(...series.map(points => points.at(-1)![0])),
  }
}

function setZoom(range: ZoomRange) {
  activeZoom.value = range
  if (!chart) return
  const bounds = chartDateBounds()
  if (!bounds) return
  const min = range === 'All' ? bounds.earliest : zoomBounds(bounds.latest, range)
  const max = paddedChartMax(min ?? bounds.earliest, bounds.latest)
  chart.xAxis[0]?.setExtremes(min, max)
  visibleMin.value = min ?? bounds.earliest
  visibleMax.value = max
}

function rowsFrom(payload: unknown): Row[] {
  if (Array.isArray(payload)) return payload as Row[]
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    if (Array.isArray(record.data)) return record.data as Row[]
    if (Array.isArray(record.rows)) return record.rows as Row[]
  }
  return []
}

function pointsFrom(rows: Row[], field: string): Point[] {
  return rows.flatMap(row => {
    const rawDate = row.DT ?? row.Date ?? row.date
    const date = typeof rawDate === 'number' ? rawDate : Date.parse(`${String(rawDate ?? '').slice(0, 10)}T00:00:00Z`)
    const rawValue = row[field]
    const value = Number(rawValue)
    return Number.isFinite(date) && rawValue != null && rawValue !== '' && Number.isFinite(value) ? [[date, value] as Point] : []
  }).sort((a, b) => a[0] - b[0])
}

function parsePairData(payload: unknown, requested: string[]): DataSet {
  const rows = rowsFrom(payload)
  const indicatorSeries: Record<string, Point[]> = {}
  requested.forEach((id, index) => { indicatorSeries[id] = pointsFrom(rows, index === 0 ? 'indicator_Close' : `indicator${index + 1}_Close`) })
  return { price: pointsFrom(rows, 'Close'), indicators: indicatorSeries }
}

async function fetchJson(path: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(path, { credentials: 'include', headers: { Accept: 'application/json' }, signal })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${path.split('?')[0]}`)
  return response.json() as Promise<unknown>
}

async function fetchPairHistory(ticker: string, requestedIndicators: string[], signal: AbortSignal): Promise<DataSet> {
  const allRows = new Map<string, Row>()
  let nextStart = startDate.value
  const endTime = Date.parse(`${endDate.value}T00:00:00Z`)
  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({ symbol: ticker })
    requestedIndicators.forEach((id, index) => params.set(index === 0 ? 'indicator' : `indicator_${index + 1}`, id))
    if (!requestedIndicators.length) params.set('indicator', '')
    params.set('start', nextStart)
    params.set('end', endDate.value)
    params.set('freq', 'daily')
    const rows = rowsFrom(await fetchJson(`/dev/st_data/pair_data?${params}`, signal))
    if (!rows.length) break
    for (const row of rows) {
      const date = String(row.DT ?? row.Date ?? row.date ?? '').slice(0, 10)
      if (date) allRows.set(date, row)
    }
    const lastDate = String(rows.at(-1)?.DT ?? rows.at(-1)?.Date ?? rows.at(-1)?.date ?? '').slice(0, 10)
    const lastTime = Date.parse(`${lastDate}T00:00:00Z`)
    if (!Number.isFinite(lastTime) || lastTime >= endTime - 7 * 86400000) break
    const following = new Date(lastTime + 86400000).toISOString().slice(0, 10)
    if (following <= nextStart) break
    nextStart = following
  }
  return parsePairData([...allRows.values()], requestedIndicators)
}

function indicatorParams(ids: string[]): URLSearchParams {
  const params = new URLSearchParams()
  ids.forEach((id, index) => params.set(index === 0 ? 'indicator' : `indicator_${index + 1}`, id))
  if (!ids.length) params.set('indicator', '')
  return params
}

async function loadData() {
  requestController?.abort()
  const controller = new AbortController()
  requestController = controller
  loading.value = true
  error.value = ''
  data.value = {}
  chart?.destroy()
  chart = null
  visibleMin.value = null
  visibleMax.value = null
  const requestedTickers = [...new Set([baseSymbol.value, ...priceTickers.value])]
  const requestedIndicators = indicatorChoices.value.map(choice => choice.id)
  try {
    const metadataRequest = requestedIndicators.length
      ? fetchJson(`/dev/st_data/indicators_metadata?${indicatorParams(requestedIndicators)}`, controller.signal).catch(() => ({}))
      : Promise.resolve({})
    const pairRequests = requestedTickers.map(async ticker => {
      const requestedForTicker = ticker === baseSymbol.value ? requestedIndicators : []
      return [ticker, await fetchPairHistory(ticker, requestedForTicker, controller.signal)] as const
    })
    const [metadataPayload, ...results] = await Promise.all([metadataRequest, ...pairRequests])
    if (controller.signal.aborted) return
    const nextData = Object.fromEntries(results) as Record<string, DataSet>
    if (!Object.values(nextData).some(set => set.price.length)) throw new Error('The API returned no price rows for this date range.')
    data.value = nextData
    metadata.value = metadataPayload && typeof metadataPayload === 'object' && !Array.isArray(metadataPayload)
      ? metadataPayload as Record<string, Metadata> : {}
    await nextTick()
    renderChart()
  } catch (cause) {
    if (!controller.signal.aborted) {
      error.value = cause instanceof Error ? cause.message : 'Unable to load chart data.'
      data.value = {}
    }
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}

function renderChart() {
  chart?.destroy()
  chart = null
  annotationGroup = null
  if (!chartElement.value || !loadedTickers.value.length) return
  const theme = indicatorChartTheme()
  const isCompact = window.matchMedia('(max-width: 640px)').matches
  const hasLeftPriceAxis = loadedTickers.value.length > 1
  const sharedIndicators = indicatorLayout.value === 'shared' && loadedIndicators.value.length > 1
  const panels = ['Price', ...(sharedIndicators ? ['Indicators'] : loadedIndicators.value)]
  const panelHeight = 100 / panels.length
  const palette = [theme.marketLine, theme.primary, '#d97706', '#7c3aed', '#059669']
  const priceSeries: Highcharts.SeriesOptionsType[] = loadedTickers.value.map((ticker, index) => ({
    type: 'line', name: seriesLegendName(`${ticker} Close`, data.value[ticker]!.price), data: data.value[ticker]!.price, yAxis: index,
    color: palette[priceTickers.value.indexOf(ticker)], lineWidth: 2,
    marker: { enabled: false }, dataGrouping: { enabled: true },
  }))
  const indicatorSeries: Highcharts.SeriesOptionsType[] = loadedIndicators.value.map((id, index) => ({
    type: 'line', name: seriesLegendName(indicatorChoices.value.find(choice => choice.id === id)?.label || metadata.value[id]?.chart_name || id, data.value[baseSymbol.value]!.indicators[id]!),
    data: data.value[baseSymbol.value]!.indicators[id]!, yAxis: loadedTickers.value.length + (sharedIndicators ? 0 : index),
    color: sharedIndicators && indicatorChoices.value.findIndex(choice => choice.id === id) === 1 ? theme.negative
      : id === 'etf_spy_flow' ? palette[0] : palette[(indicatorChoices.value.findIndex(choice => choice.id === id) + 1) % palette.length], lineWidth: 2,
    marker: { enabled: false }, dataGrouping: { enabled: true },
  }))
  const series: Highcharts.SeriesOptionsType[] = [...priceSeries, ...indicatorSeries]
  if (showMarks.value) loadedTickers.value.forEach(ticker => {
    if (!urlAnnotations.value.some(spec => spec.type === 'endpoint' && spec.series.toUpperCase() === ticker)) return
    const last = data.value[ticker]?.price.at(-1)
    if (!last) return
    series.push({ type: 'scatter', name: `${ticker} end`, data: [last], yAxis: loadedTickers.value.indexOf(ticker), zIndex: 10,
      color: palette[priceTickers.value.indexOf(ticker)], marker: { enabled: true, symbol: 'circle', radius: 4, lineWidth: 0 },
      showInLegend: false, enableMouseTracking: false, dataGrouping: { enabled: false } })
  })
  if (showMarks.value) loadedIndicators.value.forEach(id => {
    if (!urlAnnotations.value.some(spec => spec.type === 'endpoint' && spec.series === id)) return
    const last = data.value[baseSymbol.value]?.indicators[id]?.at(-1)
    if (!last) return
    const choiceIndex = indicatorChoices.value.findIndex(choice => choice.id === id)
    series.push({ type: 'scatter', name: `${id} end`, data: [last], yAxis: loadedTickers.value.length + (sharedIndicators ? 0 : loadedIndicators.value.indexOf(id)), zIndex: 10,
      color: sharedIndicators && choiceIndex === 1 ? theme.negative : id === 'etf_spy_flow' ? palette[0] : palette[(choiceIndex + 1) % palette.length],
      marker: { enabled: true, symbol: 'circle', radius: 4, lineWidth: 0 },
      showInLegend: false, enableMouseTracking: false, dataGrouping: { enabled: false } })
  })
  const bounds = chartDateBounds()!
  const initialMin = activeZoom.value === 'All' ? bounds.earliest : zoomBounds(bounds.latest, activeZoom.value)
  const initialMax = paddedChartMax(initialMin ?? bounds.earliest, bounds.latest)
  visibleMin.value = initialMin ?? bounds.earliest
  visibleMax.value = initialMax
  chart = Highcharts.stockChart(chartElement.value, {
    time: { timezone: 'UTC' },
    chart: { ...baseHighchartsChartOptions(theme), spacingTop: chartSize(8), spacingRight: chartSize(isCompact ? 24 : 42), spacingBottom: chartSize(10), spacingLeft: chartSize(hasLeftPriceAxis ? (isCompact ? 24 : 42) : 8), zooming: { type: 'x' },
      events: { render() { drawUrlAnnotations(this) } } },
    credits: { enabled: false }, accessibility: { enabled: false }, rangeSelector: { enabled: false },
    navigator: { ...chartNavigatorOptions(theme, data.value[loadedTickers.value[0]!]!.price), enabled: !isCompact },
    scrollbar: { ...chartScrollbarOptions(theme), enabled: !isCompact },
    legend: { enabled: false },
    xAxis: { type: 'datetime', ordinal: false, min: initialMin, max: initialMax, gridLineWidth: 0, gridLineColor: theme.grid, gridLineDashStyle: 'Dot',
      lineColor: theme.border, tickColor: theme.border, tickPixelInterval: chartSize(150), crosshair: highchartsCrosshairOptions(),
      labels: { format: "{value:%b '%y}", style: { color: theme.textSecondary, fontSize: chartFontSize(11) } },
      events: { afterSetExtremes(event) { visibleMin.value = event.min ?? null; visibleMax.value = event.max ?? null } } },
    yAxis: [...loadedTickers.value.map((ticker, tickerIndex) => ({
      top: '0%', height: `${panelHeight - 3}%`, opposite: tickerIndex !== 1, offset: 0,
      gridLineWidth: 1, gridLineColor: theme.grid, gridLineDashStyle: 'Dot' as const, lineWidth: 0,
      minPadding: 0.1, maxPadding: 0.1, tickPixelInterval: chartSize(46),
      labels: { x: chartSize(tickerIndex === 1 ? (isCompact ? 6 : 8) : 5), style: { color: theme.textSecondary, fontSize: chartFontSize(isCompact ? 9 : 10) } },
      title: isCompact ? undefined : { text: seriesAxisTitle(`${ticker} Close`, data.value[ticker]!.price), useHTML: true,
        margin: chartSize(tickerIndex === 1 ? 2 : 5),
        style: { color: theme.textSecondary, fontSize: chartFontSize(10), lineHeight: '1.15' }, x: chartSize(tickerIndex === 1 ? -10 : 16) },
    })), ...(sharedIndicators ? loadedIndicators.value.slice(0, 1) : loadedIndicators.value).map((panel, index) => ({
      top: `${(index + 1) * panelHeight}%`, height: `${panelHeight - 3}%`, opposite: true, offset: 0,
      gridLineWidth: 1, gridLineColor: theme.grid, gridLineDashStyle: 'Dot' as const, lineWidth: 0,
      minPadding: 0.1, maxPadding: 0.1, tickPixelInterval: chartSize(44),
      labels: { x: chartSize(5), style: { color: theme.textSecondary, fontSize: chartFontSize(isCompact ? 9 : 10) } },
      title: isCompact || sharedIndicators ? undefined : { text: seriesAxisTitle(indicatorChoices.value.find(choice => choice.id === panel)?.label || metadata.value[panel]?.chart_name || panel, data.value[baseSymbol.value]!.indicators[panel]!),
        useHTML: true, style: { color: theme.primary, fontSize: chartFontSize(10), lineHeight: '1.15' }, x: chartSize(16) },
      plotLines: [
        ...(metadata.value[panel]?.opt_extreme != null ? [{ value: Number(metadata.value[panel]?.opt_extreme), color: theme.negative, dashStyle: 'ShortDash' as const, width: 1 }] : []),
        ...(metadata.value[panel]?.pess_extreme != null ? [{ value: Number(metadata.value[panel]?.pess_extreme), color: theme.positive, dashStyle: 'ShortDash' as const, width: 1 }] : []),
      ],
    }))],
    tooltip: {
      shared: true,
      split: false,
      useHTML: true,
      backgroundColor: theme.tooltipBg,
      borderColor: theme.border,
      zIndex: 100,
      borderRadius: chartSize(8), padding: chartSize(8), shadow: true,
      style: { color: theme.textSecondary, fontSize: chartFontSize(12) },
      formatter(this: { x?: number; points?: Highcharts.Point[]; point?: Highcharts.Point }) {
        const points = this.points ?? (this.point ? [this.point] : [])
        const rows = points.filter(point => point.y !== undefined && point.series.visible)
          .map(point => `<div style="display:flex;justify-content:space-between;gap:12px;margin-top:6px;"><span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${point.color};margin-right:7px;"></span>${escapeHtml(point.series.name.replace(/\s+\(Last = [^)]+\)$/, ''))}</span><b>${formattedNumber(Number(point.y))}</b></div>`).join('')
        return `<div style="width:220px;max-width:220px;"><b>${formatChartDate(Number(this.x))}</b>${rows}</div>`
      },
    } as Highcharts.TooltipOptions,
    plotOptions: { series: { animation: false, states: disabledSeriesStates(), showInNavigator: false } }, series,
  })
}

function annotationPoint(points: Point[], date?: string): Point | undefined {
  if (!date) return points.at(-1)
  const timestamp = Date.parse(`${date.slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(timestamp)) return undefined
  const nearest = points.reduce<Point | undefined>((best, point) =>
    !best || Math.abs(point[0] - timestamp) < Math.abs(best[0] - timestamp) ? point : best, undefined)
  return nearest && Math.abs(nearest[0] - timestamp) <= 7 * 86400000 ? nearest : undefined
}

function drawUrlAnnotations(targetChart: Highcharts.Chart) {
  annotationGroup?.destroy()
  annotationGroup = null
  if (!showMarks.value || !urlAnnotations.value.length) return
  const group = targetChart.renderer.g('url-annotations').attr({ zIndex: 8 }).add()
  annotationGroup = group
  const theme = indicatorChartTheme()
  const palette = [theme.marketLine, theme.primary, '#d97706', '#7c3aed', '#059669']
  const boxes: Array<{ x: number; y: number; width: number; height: number }> = []
  const xAxis = targetChart.xAxis[0]
  if (!xAxis) return
  const left = targetChart.plotLeft + 5
  const right = targetChart.plotLeft + targetChart.plotWidth - 5
  for (const spec of urlAnnotations.value) {
    if (spec.type === 'difference') {
      if (indicatorLayout.value !== 'shared' || !spec.otherSeries || !loadedIndicators.value.includes(spec.series) || !loadedIndicators.value.includes(spec.otherSeries)) continue
      const first = annotationPoint(data.value[baseSymbol.value]?.indicators[spec.series] ?? [], spec.date)
      const second = annotationPoint(data.value[baseSymbol.value]?.indicators[spec.otherSeries] ?? [], spec.date)
      const sharedAxis = targetChart.yAxis[loadedTickers.value.length]
      if (!first || !second || !sharedAxis) continue
      const x = xAxis.toPixels(first[0])
      const y1 = sharedAxis.toPixels(first[1])
      const y2 = sharedAxis.toPixels(second[1])
      if (x < left || x > right || y1 < sharedAxis.pos || y1 > sharedAxis.pos + sharedAxis.len || y2 < sharedAxis.pos || y2 > sharedAxis.pos + sharedAxis.len) continue
      const arrowX = Math.min(right - 9, x + 13 + (Number(spec.dx) || 0))
      const topY = Math.min(y1, y2)
      const bottomY = Math.max(y1, y2)
      const arrowColor = theme.text
      targetChart.renderer.path([['M', arrowX, topY + 9], ['L', arrowX, bottomY - 9]])
        .attr({ stroke: arrowColor, 'stroke-width': 1.5 }).add(group)
      targetChart.renderer.path([['M', arrowX, topY], ['L', arrowX - 5, topY + 9], ['L', arrowX + 5, topY + 9], ['Z']])
        .attr({ fill: arrowColor, stroke: arrowColor }).add(group)
      targetChart.renderer.path([['M', arrowX, bottomY], ['L', arrowX - 5, bottomY - 9], ['L', arrowX + 5, bottomY - 9], ['Z']])
        .attr({ fill: arrowColor, stroke: arrowColor }).add(group)
      const firstIndex = indicatorChoices.value.findIndex(choice => choice.id === spec.series)
      const secondIndex = indicatorChoices.value.findIndex(choice => choice.id === spec.otherSeries)
      const firstColor = firstIndex === 1 ? theme.negative : spec.series === 'etf_spy_flow' ? palette[0]! : palette[(firstIndex + 1) % palette.length]!
      const secondColor = secondIndex === 1 ? theme.negative : spec.otherSeries === 'etf_spy_flow' ? palette[0]! : palette[(secondIndex + 1) % palette.length]!
      targetChart.renderer.circle(x, y1, 4).attr({ fill: firstColor, stroke: firstColor }).add(group)
      targetChart.renderer.circle(xAxis.toPixels(second[0]), y2, 4).attr({ fill: secondColor, stroke: secondColor }).add(group)
      for (const [id, value, y, color] of [[spec.series, first[1], y1, firstColor], [spec.otherSeries, second[1], y2, secondColor]] as const) {
        const name = indicatorChoices.value.find(choice => choice.id === id)?.label ?? metadata.value[id]?.chart_name ?? id
        const label = targetChart.renderer.label(`${escapeHtml(name)}: ${formattedNumber(value)}`, 0, 0, 'rect')
          .attr({ padding: 5, r: 4, fill: theme.surface, stroke: color, 'stroke-width': 1 })
          .css({ color, fontSize: '11px', fontWeight: '600', textOutline: 'none' }).add(group)
        const size = label.getBBox()
        const labelX = Math.max(left, Math.min(right - size.width, x - size.width - 6))
        const labelY = Math.max(sharedAxis.pos + 3, Math.min(sharedAxis.pos + sharedAxis.len - size.height - 3,
          y < (y1 + y2) / 2 ? y - size.height - 6 : y + 6))
        label.attr({ x: labelX, y: labelY })
        boxes.push({ x: labelX, y: labelY, width: size.width, height: size.height })
      }
      const difference = spec.text ?? formattedNumber(Math.abs(first[1] - second[1]))
      const middle = targetChart.renderer.label(escapeHtml(difference), arrowX - 12, (y1 + y2) / 2 - 12 + (Number(spec.dy) || 0), 'rect')
        .attr({ padding: 4, r: 3, fill: theme.surface })
        .css({ color: theme.text, fontSize: '11px', fontWeight: '700', textOutline: 'none' }).add(group)
      const middleSize = middle.getBBox()
      middle.attr({ x: Math.max(left, Math.min(right - middleSize.width, arrowX - middleSize.width - 5)) })
      continue
    }
    const tickerIndex = loadedTickers.value.indexOf(spec.series.toUpperCase())
    const indicatorIndex = loadedIndicators.value.indexOf(spec.series)
    if (tickerIndex < 0 && indicatorIndex < 0) continue
    const points = tickerIndex >= 0 ? data.value[loadedTickers.value[tickerIndex]!]?.price : data.value[baseSymbol.value]?.indicators[spec.series]
    const axis = targetChart.yAxis[tickerIndex >= 0 ? tickerIndex : loadedTickers.value.length + (indicatorLayout.value === 'shared' && loadedIndicators.value.length > 1 ? 0 : indicatorIndex)]
    if (!points?.length || !axis) continue
    const end = annotationPoint(points, spec.type === 'endpoint' ? undefined : spec.date ?? spec.to)
    if (!end) continue
    const start = spec.from ? annotationPoint(points, spec.from) : undefined
    if ((spec.type === 'range' || spec.type === 'arrow') && !start) continue
    const x = xAxis.toPixels(end[0])
    const y = axis.toPixels(end[1])
    if (x < left || x > right || y < axis.pos || y > axis.pos + axis.len) continue
    const startX = start ? xAxis.toPixels(start[0]) : 0
    const startY = start ? axis.toPixels(start[1]) : 0
    const color = tickerIndex >= 0
      ? palette[priceTickers.value.indexOf(loadedTickers.value[tickerIndex]!)]!
      : (indicatorLayout.value === 'shared' && indicatorChoices.value.findIndex(choice => choice.id === spec.series) === 1 ? theme.negative
        : spec.series === 'etf_spy_flow' ? palette[0]! : palette[(indicatorChoices.value.findIndex(choice => choice.id === spec.series) + 1) % palette.length]!)
    if (spec.type === 'point' || spec.type === 'range') {
      targetChart.renderer.circle(x, y, 4).attr({ fill: color, stroke: color }).add(group)
    }
    if (start && (spec.arrow || spec.type === 'arrow') && startX >= left && startX <= right) {
      targetChart.renderer.path([['M', startX, startY], ['L', x, y]]).attr({ stroke: color, 'stroke-width': 1.5, zIndex: 1 }).add(group)
      const angle = Math.atan2(y - startY, x - startX)
      const head = 7
      targetChart.renderer.path([['M', x, y], ['L', x - head * Math.cos(angle - .45), y - head * Math.sin(angle - .45)],
        ['M', x, y], ['L', x - head * Math.cos(angle + .45), y - head * Math.sin(angle + .45)]])
        .attr({ stroke: color, 'stroke-width': 1.5 }).add(group)
    }
    const pointIndex = points.findIndex(point => point[0] === end[0])
    const previous = pointIndex > 0 ? points[pointIndex - 1] : undefined
    const change = previous ? end[1] - previous[1] : null
    const metric = spec.metric === 'change_percent' && previous?.[1]
      ? signedChange(change! / previous[1] * 100, '%')
      : spec.metric === 'change' ? signedChange(change) : formattedNumber(end[1])
    const fallback = start
      ? `${formattedNumber(start[1])} → ${formattedNumber(end[1])}  (${formatChartDate(start[0])} → ${formatChartDate(end[0])})`
      : `${spec.series.toUpperCase()} ${metric}`
    const labelText = (spec.text || fallback).slice(0, 160).split(/\r?\n/).map(escapeHtml).join('<br/>')
    const label = targetChart.renderer.label(labelText, 0, 0, 'rect')
      .attr({ padding: 7, r: 5, fill: theme.surface, stroke: color, 'stroke-width': 1, zIndex: 2 })
      .css({ color, fontSize: '11px', fontWeight: '600', textOutline: 'none' }).add(group)
    const size = label.getBBox()
    const top = axis.pos + 3
    const bottom = axis.pos + axis.len - size.height - 3
    const candidates = [
      { x: x - size.width - 6, y: y - size.height - 6 },
      { x: x - size.width - 6, y: y + 6 },
      { x: x + 6, y: y - size.height - 6 },
      { x: x + 6, y: y + 6 },
    ]
    const placed = candidates.map(candidate => {
      const bx = Math.max(left, Math.min(right - size.width, candidate.x + (Number(spec.dx) || 0)))
      const by = Math.max(top, Math.min(bottom, candidate.y + (Number(spec.dy) || 0)))
      const overlap = boxes.reduce((total, box) => total + Math.max(0, Math.min(bx + size.width, box.x + box.width) - Math.max(bx, box.x))
        * Math.max(0, Math.min(by + size.height, box.y + box.height) - Math.max(by, box.y)), 0)
      return { x: bx, y: by, score: overlap + Math.abs(bx - candidate.x) + Math.abs(by - candidate.y) }
    }).sort((a, b) => a.score - b.score)[0]!
    label.attr({ x: placed.x, y: placed.y })
    boxes.push({ x: placed.x, y: placed.y, width: size.width, height: size.height })
  }
}

watch([showMarks, selectedTickers, selectedIndicators], () => nextTick(renderChart), { deep: true })
onMounted(() => {
  applyUrlConfig()
  void loadData()
  window.addEventListener('resize', renderChart)
  themeObserver = new MutationObserver(renderChart)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})
onBeforeUnmount(() => { requestController?.abort(); themeObserver?.disconnect(); window.removeEventListener('resize', renderChart); chart?.destroy() })
watch(() => route.fullPath, () => { applyUrlConfig(); void loadData() })
</script>

<template>
  <main class="insight-page"><div class="insight-wrap">
    <div class="eyebrow">MARKET INSIGHTS / CHART PREVIEW</div>
    <h1>{{ pageTitle }}</h1>
    <p class="intro">{{ pageSubtitle }}</p>
    <div class="price-cards">
      <article v-for="card in priceCards" :key="card.ticker" class="price-card">
        <h2>{{ card.ticker }}</h2>
        <div class="price-card-metrics">
          <div><strong :class="{ positive: card.change !== null && card.change > 0, negative: card.change !== null && card.change < 0 }">{{ signedChange(card.change, '', '$') }}</strong></div>
          <div><strong :class="{ positive: card.percent !== null && card.percent > 0, negative: card.percent !== null && card.percent < 0 }">{{ signedChange(card.percent, '%') }}</strong></div>
        </div>
        <small v-if="card.date">{{ card.date }} vs previous close</small>
      </article>
    </div>
    <section class="chart-card">
      <div class="chart-primary-row">
        <div class="chart-range-group"><button v-for="range in zoomRanges" :key="range" class="chart-range-button" :class="{ active: activeZoom === range }" type="button" @click="setZoom(range)">{{ range }}</button></div>
        <div class="chart-date-range"><span>{{ visibleRangeLabel }}</span><CalendarDays :size="16" /></div>
      </div>
      <div class="series-controls" aria-label="Chart series visibility">
        <div v-if="priceTickers.length > 1" class="series-group"><label v-for="(ticker, index) in priceTickers" :key="ticker" class="series-toggle"><input type="checkbox" :checked="selectedTickers.includes(ticker)" :disabled="selectedTickers.length === 1 && selectedTickers.includes(ticker)" @change="toggleTicker(ticker)" /><i :style="{ backgroundColor: priceLineColor(index) }" aria-hidden="true"></i><span>{{ ticker }}</span></label></div>
        <div class="series-group"><label v-for="(choice, index) in indicatorChoices" :key="choice.id" class="series-toggle"><input type="checkbox" :checked="selectedIndicators.includes(choice.id)" @change="toggleIndicator(choice.id)" /><i :style="{ backgroundColor: indicatorLineColor(choice.id, index) }" aria-hidden="true"></i><span>{{ choice.label }}</span></label></div>
        <label class="series-toggle"><input v-model="showMarks" type="checkbox" /><span>Show mark</span></label>
      </div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-else-if="loading" class="loading">Loading chart data…</p>
      <div ref="chartElement" class="chart" :class="{ 'chart-dual-price': loadedTickers.length > 1 }"></div>
    </section>
    <section class="related-section" aria-labelledby="related-title">
      <header class="related-heading">
        <div><h2 id="related-title">Related Indicators</h2><p>Current readings and recent history</p></div>
        <div class="related-periods" role="group" aria-label="Related indicators chart window">
          <button v-for="period in ['1M', '3M', '6M'] as const" :key="period" type="button" :class="{ active: relatedPeriod === period }" :aria-pressed="relatedPeriod === period" @click="relatedPeriod = period">{{ period }}</button>
        </div>
      </header>
      <div class="related-grid">
        <article v-for="card in relatedCards" :key="card.id" class="related-card">
          <header><RouterLink :to="`/indicators/${encodeURIComponent(card.id)}`">{{ card.label }}</RouterLink><RouterLink :to="`/indicators/${encodeURIComponent(card.id)}`" :aria-label="`Open ${card.label}`">↗</RouterLink></header>
          <div class="related-reading"><strong>{{ formattedNumber(card.last) }}</strong><small v-if="card.change !== null">{{ signedChange(card.change) }} vs previous session</small></div>
          <SpotlightChart :name="card.label" :values="card.values" :dates="card.dates" :period="relatedPeriodCount" :min="card.min" :max="card.max" :decimals="2" kind="position" :end-label-x="-5" :end-label-y="-7" :extremes="card.extremes" />
        </article>
      </div>
    </section>
  </div></main>
</template>

<style scoped>
.series-controls{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:8px;padding:8px 0 4px}.series-group{display:flex;align-items:center;flex-wrap:wrap;gap:8px}.series-toggle{display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:4px 8px;border:1px solid var(--app-border,#d5e3f7);border-radius:6px;background:var(--app-surface,#fff);color:var(--app-text,#071b4f);font-size:12px;font-weight:700;white-space:nowrap;cursor:pointer}.series-toggle:has(input:checked){border-color:var(--app-primary,#006cff)}.series-toggle:has(input:disabled){cursor:default}.series-toggle input{width:14px;height:14px;margin:0;accent-color:var(--app-primary,#006cff);cursor:inherit}.series-toggle i{display:block;width:24px;height:2px;flex:none}.series-toggle:has(input:not(:checked)) i{opacity:.55}@media(max-width:700px){.series-controls{justify-content:flex-start}.series-group{width:100%}}
.related-section{margin-top:22px}.related-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:12px}.related-heading h2{margin:0;font-size:22px;font-weight:800}.related-heading p{margin:3px 0 0;color:var(--app-text-muted,#6f7fa8);font-size:12px}.related-periods{display:inline-flex;gap:2px;padding:3px;border:1px solid var(--app-border,#d5e3f7);border-radius:7px;background:var(--app-surface-muted,#f6faff)}.related-periods button{min-height:28px;padding:4px 10px;border:0;background:transparent}.related-periods button.active{background:var(--app-surface,#fff);color:var(--app-primary,#006cff);box-shadow:0 1px 3px #0002}.related-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.related-card{min-width:0;overflow:hidden;background:var(--app-surface,#fff);border:1px solid var(--app-border,#d5e3f7);border-radius:10px;padding:14px 12px 4px}.related-card header{display:flex;align-items:start;justify-content:space-between;gap:10px;padding:0 4px}.related-card header a{color:var(--app-text,#071b4f);font-size:14px;font-weight:700;text-decoration:none}.related-card header a:hover{color:var(--app-primary,#006cff)}.related-card header a:last-child{color:var(--app-primary,#006cff)}.related-reading{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;padding:8px 4px 0}.related-reading strong{font-size:23px;font-variant-numeric:tabular-nums}.related-reading small{font-size:11px;color:var(--app-text-muted,#6f7fa8)}@media(max-width:900px){.related-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.related-grid{grid-template-columns:1fr}.related-heading h2{font-size:19px}}
.price-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:12px;margin:0 0 14px}
.price-card{min-width:0;display:flex;align-items:center;flex-wrap:wrap;gap:8px 16px;background:var(--app-surface,#fff);border:1px solid var(--app-border,#d5e3f7);border-radius:10px;padding:12px 16px}
.price-card h2{flex:none;font-size:16px;line-height:1.2;margin:0;font-weight:800}
.price-card-metrics{display:flex;align-items:center;gap:16px;flex:none}
.price-card-metrics strong{display:block;font-size:22px;line-height:1.2;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--app-text,#071b4f)}
.price-card-metrics strong.positive{color:var(--app-positive,#087a56)}
.price-card-metrics strong.negative{color:var(--app-negative,#be123c)}
.price-card small{margin-left:auto;color:var(--app-text-muted,#6f7fa8);font-size:10px;white-space:nowrap}
@media(max-width:700px){.price-cards{grid-template-columns:1fr;gap:10px}.price-card{padding:12px 14px}}.insight-page{min-height:100vh;background:var(--app-surface-muted,#f6faff);color:var(--app-text,#071b4f);padding:48px 24px 80px}.insight-wrap{max-width:1180px;margin:auto}.eyebrow{font-size:10px;font-weight:800;letter-spacing:.09em;color:var(--app-text-secondary,#173267)}h1{font-size:clamp(24px,2.8vw,32px);line-height:1.15;margin:8px 0 8px;font-weight:800}.intro{font-size:14px;color:var(--app-text-secondary,#173267);margin:0 0 16px}.chart-card{background:var(--app-surface,#fff);border:1px solid var(--app-border,#d5e3f7);border-radius:12px;padding:14px 20px}button{border:1px solid var(--app-border,#d5e3f7);background:var(--app-surface,#fff);color:var(--app-text-secondary,#173267);border-radius:6px;padding:8px 13px;min-height:36px;cursor:pointer;font-size:12px;font-weight:700}.error,.loading{font-size:12px;margin:8px 0;color:var(--app-text-secondary,#173267)}.error{color:var(--app-negative,#be123c)}.chart{width:100%;height:var(--indicator-chart-height,680px)}@media(max-width:700px){.insight-page{padding:24px 12px 48px}.chart-card{padding:12px}.chart{height:540px}}
.chart-primary-row{display:flex;flex-wrap:wrap;align-items:center;gap:calc(7px * var(--fixed-ui-scale,1));margin:2px 0 7px}.chart-range-group{display:inline-flex;overflow:hidden;border:1px solid var(--app-border);border-radius:calc(6px * var(--fixed-ui-scale,1));background:var(--app-surface);max-width:100%;overflow-x:auto}.chart-range-button{min-width:calc(30px * var(--fixed-ui-scale,1));height:calc(30px * var(--fixed-ui-scale,1));padding:0 calc(6px * var(--fixed-ui-scale,1));border:0;border-right:1px solid var(--app-border);border-radius:0;min-height:0;font-size:.8125rem;font-weight:600;white-space:nowrap}.chart-range-button:last-child{border-right:0}.chart-range-button.active{background:var(--app-primary,#006cff);color:#fff}.chart-range-button:not(.active):hover{background:var(--app-primary-soft);color:var(--app-primary)}.chart-date-range{display:inline-flex;align-items:center;height:calc(30px * var(--fixed-ui-scale,1));gap:calc(6px * var(--fixed-ui-scale,1));white-space:nowrap;color:var(--app-primary);font-size:.8125rem;font-weight:600}
.chart-dual-price{margin-left:-20px;width:calc(100% + 20px)}
:deep(.highcharts-background),:deep(.highcharts-plot-background){fill:var(--app-surface)}:deep(.highcharts-grid-line){stroke:var(--chart-grid)}:deep(.highcharts-axis-line),:deep(.highcharts-tick){stroke:var(--app-border)}:deep(.highcharts-axis-labels text),:deep(.highcharts-axis-title),:deep(.highcharts-legend-item text){fill:var(--app-text-secondary)!important;color:var(--app-text-secondary)!important}:deep(.highcharts-tooltip-box){fill:var(--chart-tooltip-bg);stroke:var(--app-border)}:deep(.highcharts-crosshair){stroke-dasharray:4 4}


</style>

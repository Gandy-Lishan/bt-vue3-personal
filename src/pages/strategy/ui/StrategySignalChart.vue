<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { CalendarDays } from '@lucide/vue'
import Highcharts from 'highcharts/highstock'
import type { StrategyChartSeries } from '@/entities/strategy/model/strategy.types'
import {
  baseHighchartsChartOptions,
  chartFontSize,
  chartNavigatorOptions,
  chartScrollbarOptions,
  chartSize,
  disabledSeriesStates,
  highchartsCrosshairOptions,
  indicatorChartTheme,
  monthLabels,
} from '@/pages/indicators/ui/indicatorHighcharts'

const props = withDefaults(
  defineProps<{
    series: StrategyChartSeries[]
    loading?: boolean
  }>(),
  {
    loading: false,
  },
)

let chart: Highcharts.Chart | null = null
let themeObserver: MutationObserver | null = null
const chartElement = ref<HTMLDivElement | null>(null)
const hasSeries = computed(() => props.series.some((series) => series.points.length))

// Chart-specific narrow breakpoint: fold axis titles, navigator, etc. on phones only.
const compactChartBreakpoint = '(max-width: 640px)'
const isCompactChart = ref(false)
let compactQuery: MediaQueryList | null = null

function updateCompactChartState() {
  isCompactChart.value = compactQuery?.matches ?? false
}

type RangeId = '3M' | '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | '10Y' | '15Y' | '20Y' | 'All'

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

const activeRange = ref<RangeId>('3Y')
const visibleMin = ref<number | null>(null)
const visibleMax = ref<number | null>(null)

type StrategyChartPalette = {
  lines: string[]
  buy: string[]
  sell: string[]
  markerBorder: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function destroyChart() {
  chart?.destroy()
  chart = null
}

const visibleRangeLabel = computed(() => {
  if (visibleMin.value === null || visibleMax.value === null) return 'No date range'
  return `${formatChartDate(visibleMin.value)} - ${formatChartDate(visibleMax.value)}`
})

function formatChartDate(timestamp: number) {
  const date = new Date(timestamp)
  return `${monthLabels[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

function chartDataBounds() {
  const timestamps = props.series.flatMap((series) => series.points.map((point) => point[0]))
  if (!timestamps.length) return null
  return {
    min: Math.min(...timestamps),
    max: Math.max(...timestamps),
  }
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
  if (!axis || !bounds) {
    updateVisibleRange(bounds?.min, bounds?.max)
    return
  }

  const nextStart = rangeStartFor(rangeId, bounds.max)
  const min = nextStart === null ? bounds.min : Math.max(bounds.min, nextStart)
  axis.setExtremes(min, bounds.max, true, false, { trigger: 'customRangeButton' })
  updateVisibleRange(min, bounds.max)
}

function strategyChartPalette(theme = indicatorChartTheme()): StrategyChartPalette {
  return {
    lines: [
      theme.marketLine,
      theme.primary,
    ],
    buy: [
      theme.positive,
      theme.dark ? '#86efac' : '#16a34a',
    ],
    sell: [
      theme.negative,
      theme.dark ? '#fdba74' : '#f97316',
    ],
    markerBorder: theme.dark ? '#f8fbff' : '#071b4f',
  }
}

function chartSeries(theme = indicatorChartTheme()) {
  const output: Highcharts.SeriesOptionsType[] = []
  const palette = strategyChartPalette(theme)

  props.series.forEach((model, index) => {
    const yAxis = index === 0 ? 0 : 1
    const lineColor = palette.lines[index] ?? theme.primary
    const buyColor = palette.buy[index] ?? theme.positive
    const sellColor = palette.sell[index] ?? theme.negative
    const suffix = model.symbol ? `(${model.symbol})` : ''

    output.push({
      type: 'line',
      name: model.symbol,
      data: model.points.map((point) => [point[0], point[1]]),
      yAxis,
      color: lineColor,
      lineWidth: 2,
      marker: {
        enabled: false,
      },
      showInNavigator: true,
      dataGrouping: {
        enabled: false,
      },
    } as Highcharts.SeriesLineOptions)

    output.push({
      type: 'scatter',
      name: `Buy Signal${suffix}`,
      data: model.points
        .filter((point) => point[2] === 1)
        .map((point) => ({ x: point[0], y: point[1] })),
      yAxis,
      color: buyColor,
      marker: {
        symbol: 'triangle',
        radius: 7,
        states: {
          hover: {
            enabled: true,
            lineColor: palette.markerBorder,
            lineWidth: 1,
          },
        },
      },
      showInNavigator: false,
      dataGrouping: {
        enabled: false,
      },
    } as Highcharts.SeriesScatterOptions)

    output.push({
      type: 'scatter',
      name: `Sell Signal${suffix}`,
      data: model.points
        .filter((point) => point[3] === -1)
        .map((point) => ({ x: point[0], y: point[1] })),
      yAxis,
      color: sellColor,
      marker: {
        symbol: 'triangle-down',
        radius: 7,
        states: {
          hover: {
            enabled: true,
            lineColor: palette.markerBorder,
            lineWidth: 1,
          },
        },
      },
      showInNavigator: false,
      dataGrouping: {
        enabled: false,
      },
    } as Highcharts.SeriesScatterOptions)
  })

  return output
}

function renderChart() {
  if (!chartElement.value || props.loading || !hasSeries.value) {
    destroyChart()
    updateVisibleRange(undefined, undefined)
    return
  }

  const isCompact = isCompactChart.value
  const theme = indicatorChartTheme()
  const palette = strategyChartPalette(theme)
  const textColor = theme.textSecondary
  const gridColor = theme.grid
  const borderColor = theme.border
  const primaryColor = theme.primary
  const twoAxis = props.series.length > 1
  const navigatorData = props.series[0]?.points.map((point) => [point[0], point[1]] as [number, number]) ?? []
  destroyChart()

  chart = Highcharts.stockChart(chartElement.value, {
    time: {
      timezone: 'UTC',
    },
    chart: {
      ...baseHighchartsChartOptions(theme),
      height: chartSize(isCompact ? 350 : 560),
      // Equal gutters so both symbol titles sit the same distance from the
      // container edge. Highcharts reserves the rest of each margin itself.
      spacingLeft: chartSize(8),
      spacingRight: chartSize(isCompact ? 8 : 8),
      spacingTop: chartSize(isCompact ? 4 : 8),
      spacingBottom: chartSize(isCompact ? 4 : 10),
      zooming: {
        type: 'x',
      },
    },
    title: {
      text: undefined,
    },
    credits: {
      enabled: !isCompact,
      text: 'SENTIMENTRADER',
      href: '#',
      // Tucked into the plot area's bottom-right corner rather than below the axis.
      position: {
        align: 'right',
        verticalAlign: 'bottom',
        x: -8,
        y: -6,
      },
      style: {
        color: theme.textMuted,
        fontSize: '9px',
      },
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
      verticalAlign: isCompact ? 'bottom' : 'top',
      layout: 'horizontal',
      itemDistance: chartSize(isCompact ? 10 : 26),
      margin: chartSize(isCompact ? 8 : 46),
      symbolWidth: chartSize(isCompact ? 16 : 34),
      itemMarginTop: chartSize(isCompact ? 1 : 0),
      itemMarginBottom: chartSize(isCompact ? 1 : 0),
      x: 0,
      y: isCompact ? -2 : chartSize(28),
      itemStyle: {
        color: textColor,
        fontSize: chartFontSize(isCompact ? 9 : 11),
        fontWeight: '600',
      },
      itemHoverStyle: {
        color: primaryColor,
      },
    },
    navigator: {
      ...chartNavigatorOptions(theme, navigatorData),
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
      tickPixelInterval: chartSize(isCompact ? 80 : 150),
      labels: {
        format: "{value:%b '%y}",
        style: { color: textColor, fontSize: chartFontSize(isCompact ? 9 : 11) },
      },
      crosshair: highchartsCrosshairOptions(),
      events: {
        afterSetExtremes(event) {
          updateVisibleRange(event.min, event.max)
        },
      },
    },
    // The two axes mirror each other: same tick label gap from the axis, same
    // title placement, so both symbol titles sit the same distance from their
    // axis and from the container edge. Keep the `labels`/`title` pairs in sync
    // when touching either axis.
    yAxis: [
      {
        title: isCompact
          ? undefined
          : {
              text: props.series[0]?.symbol,
              style: { color: textColor, fontSize: chartFontSize(10), fontWeight: '600', lineHeight: '1.15' },
            },
        opposite: true,
        offset: 0,
        gridLineWidth: 1,
        gridLineColor: gridColor,
        gridLineDashStyle: 'Dot',
        lineWidth: 0,
        minPadding: 0.1,
        maxPadding: 0.1,
        tickPixelInterval: chartSize(isCompact ? 36 : 44),
        labels: {
          // Mirror of the left axis' `x: -8`. Highcharts only auto-reserves room
          // for labels on non-opposite axes, so this axis needs it spelled out.
          align: 'left',
          reserveSpace: true,
          x: chartSize(isCompact ? 4 : 8),
          style: { color: textColor, fontSize: chartFontSize(isCompact ? 9 : 10) },
        },
      },
      {
        title: isCompact
          ? undefined
          : {
              text: twoAxis ? props.series[1]?.symbol : '',
              style: { color: primaryColor, fontSize: chartFontSize(10), fontWeight: '600', lineHeight: '1.15' },
            },
        opposite: false,
        visible: twoAxis,
        offset: 0,
        gridLineWidth: 0,
        gridLineColor: gridColor,
        gridLineDashStyle: 'Dot',
        lineWidth: 0,
        minPadding: 0.1,
        maxPadding: 0.1,
        tickPixelInterval: chartSize(isCompact ? 36 : 44),
        labels: {
          x: chartSize(isCompact ? -4 : -8),
          style: { color: textColor, fontSize: chartFontSize(isCompact ? 9 : 10) },
        },
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
          .filter((point) => point.y !== undefined && point.series.visible)
          .map((point) => {
            const value = typeof point.y === 'number' ? point.y.toFixed(2) : point.y
            return `<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:12px;margin-top:6px;"><span style="display:flex;align-items:center;min-width:0;"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${point.color};border:1px solid ${palette.markerBorder};margin-right:7px;flex:0 0 auto;"></span><span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(point.series.name)}</span></span><b>${value}</b></div>`
          })
          .join('')

        return `<div style="width:230px;max-width:230px;"><b>${Highcharts.dateFormat('%m-%d-%Y', Number(this.x))}</b>${rows}</div>`
      },
    },
    plotOptions: {
      series: {
        animation: false,
        turboThreshold: 0,
        states: disabledSeriesStates(),
      },
      scatter: {
        stickyTracking: false,
      },
    } as Highcharts.PlotOptions,
    series: chartSeries(theme),
  } as Highcharts.Options)

  applyRange(activeRange.value)
}

function observeThemeChanges() {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return
  themeObserver?.disconnect()
  themeObserver = new MutationObserver(() => {
    void nextTick(renderChart)
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
}

watch(
  () => [props.series, props.loading, isCompactChart.value],
  () => {
    void nextTick(renderChart)
  },
  { deep: true },
)

watch(isCompactChart, () => {
  void nextTick(renderChart)
})

onMounted(() => {
  observeThemeChanges()
  if (typeof window !== 'undefined') {
    compactQuery = window.matchMedia(compactChartBreakpoint)
    updateCompactChartState()
    compactQuery.addEventListener('change', updateCompactChartState)
  }
  void nextTick(renderChart)
})

onBeforeUnmount(() => {
  themeObserver?.disconnect()
  compactQuery?.removeEventListener('change', updateCompactChartState)
  compactQuery = null
  destroyChart()
})
</script>

<template>
  <div class="strategy-chart-shell rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-extrabold text-[var(--app-text)]">Signal Chart</h2>
        <p class="mt-1 text-sm text-[var(--app-text-muted)]">Price history with buy and sell signal markers.</p>
      </div>
    </div>

    <div v-if="!props.loading && hasSeries" class="chart-toolbar mb-3">
      <div class="chart-primary-row">
        <div class="chart-range-group" aria-label="Signal chart zoom range">
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

        <div class="chart-date-range text-[0.8125rem] font-semibold text-[var(--app-primary)]">
          <span>{{ visibleRangeLabel }}</span>
          <CalendarDays :size="16" />
        </div>
      </div>
    </div>

    <div v-if="props.loading" class="flex h-[560px] items-center justify-center rounded-md border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] text-sm text-[var(--app-text-muted)]">
      Loading signal chart...
    </div>
    <div v-else-if="!hasSeries" class="flex h-64 items-center justify-center rounded-md border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] text-sm text-[var(--app-text-muted)]">
      No signal chart data found.
    </div>
    <div v-show="!props.loading && hasSeries" ref="chartElement" class="strategy-signal-chart" />
  </div>
</template>

<style scoped>
.chart-toolbar {
  display: flex;
  flex-direction: column;
  gap: calc(7px * var(--fixed-ui-scale, 1));
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

.chart-date-range {
  display: inline-flex;
  height: calc(30px * var(--fixed-ui-scale, 1));
  align-items: center;
  gap: calc(6px * var(--fixed-ui-scale, 1));
  white-space: nowrap;
}

.strategy-signal-chart {
  min-height: calc(560px * var(--chart-ui-scale, 1));
}

@media (max-width: 640px) {
  .strategy-signal-chart {
    min-height: calc(350px * var(--chart-ui-scale, 1));
  }
}

@media (max-width: 1280px) {
  .chart-range-button {
    min-width: 40px;
    padding: 0 8px;
  }
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
:deep(.highcharts-range-input text),
:deep(.highcharts-credits) {
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

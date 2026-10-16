<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Highcharts from 'highcharts/highstock'
import {
  axisLabelStyle,
  axisTitleStyle,
  baseHighchartsChartOptions,
  cssVar,
  disabledSeriesStates,
  highchartsCrosshairOptions,
  indicatorChartTheme,
} from '@/pages/indicators/ui/indicatorHighcharts'

export interface CpmPatternChartSeries {
  key: string
  name: string
  data: Array<[number, number]>
  color?: string
  fill?: boolean
  yAxis?: 0 | 1
}

const props = withDefaults(
  defineProps<{
    series: CpmPatternChartSeries[]
    xMode?: 'datetime' | 'aligned'
    yAxisLabel?: string
    valueMode?: 'price' | 'normalized'
    loading?: boolean
    height?: number
    showLegend?: boolean
    selectedX?: number | null
    dualAxis?: boolean
    rightAxisLabel?: string
  }>(),
  {
    xMode: 'datetime',
    yAxisLabel: '',
    valueMode: 'price',
    loading: false,
    height: 260,
    showLegend: false,
    dualAxis: false,
    rightAxisLabel: '',
  },
)

const emit = defineEmits<{
  pointHover: [x: number]
}>()

const chartElement = ref<HTMLDivElement | null>(null)
let chart: Highcharts.Chart | null = null
let themeObserver: MutationObserver | null = null

const hasData = computed(() => props.series.some((series) => series.data.length > 1))
const chartHeight = computed(() => props.height)
const selectedZoom = ref('All')
const zoomOptions = ['1m', '3m', '6m', 'YTD', '1y', 'All']
function setZoom(value: string) {
  selectedZoom.value = value
  const data = props.series.flatMap(series => series.data)
  const max = Math.max(...data.map(point => point[0]))
  const min = Math.min(...data.map(point => point[0]))
  if (!data.length || !chart) return
  const bars = value === '1m' ? 21 : value === '3m' ? 63 : value === '6m' ? 126 : 252
  let start = min
  if (value !== 'All') {
    if (props.xMode === 'aligned') start = Math.max(min, max - bars + 1)
    else {
      const date = new Date(max)
      if (value === 'YTD') date.setUTCMonth(0, 1)
      else date.setUTCMonth(date.getUTCMonth() - (value === '1m' ? 1 : value === '3m' ? 3 : value === '6m' ? 6 : 12))
      start = Math.max(min, date.getTime())
    }
  }
  chart.xAxis[0]?.setExtremes(start, max)
}

function destroyChart() {
  chart?.destroy()
  chart = null
}

function formatNumber(value: number) {
  return Highcharts.numberFormat(value, 2).replace(/\.?0+$/, '')
}

function formatValue(value: number) {
  return props.valueMode === 'normalized' ? formatNumber(value) : formatNumber(value)
}

function seriesColor(index: number) {
  const palette = [
    cssVar('--app-primary', '#006cff'),
    cssVar('--app-accent', '#7c3aed'),
    cssVar('--app-positive', '#047857'),
    cssVar('--app-negative', '#be123c'),
  ]
  return palette[index % palette.length]
}

function withAlpha(color: string, opacity: number) {
  const parsed = Highcharts.color(color)
  return parsed ? String(parsed.setOpacity(opacity).get('rgba')) : color
}

function renderChart() {
  destroyChart()
  if (!chartElement.value || props.loading || !hasData.value) return

  const theme = indicatorChartTheme()
  const isAligned = props.xMode === 'aligned'
  const isDual = props.dualAxis && props.series.some((series) => (series.yAxis ?? 0) === 1)

  function yAxisConfig(axis: 0 | 1, title: string, opposite: boolean) {
    const values = (isDual ? props.series.filter((series) => (series.yAxis ?? 0) === axis) : props.series)
      .flatMap((series) => series.data.map((point) => point[1]))
    const low = values.length ? Math.min(...values) : 0
    const high = values.length ? Math.max(...values) : 1
    const padding = Math.max((high - low) * 0.14, Math.abs(high) * 0.01, 1)
    return {
      opposite,
      title: {
        text: title,
        // No explicit rotation: Highcharts defaults to 270 (bottom-to-top)
        // on left-side axes and 90 (top-to-bottom) on right-side axes, so
        // dual-axis titles mirror each other like the Beta Analyzer charts.
        style: axisTitleStyle(theme),
      },
      labels: {
        formatter(this: { value?: number }) {
          return formatValue(Number(this.value))
        },
        style: axisLabelStyle(theme),
      },
      max: high + padding,
      min: low - padding,
      gridLineColor: theme.grid,
      gridLineDashStyle: 'Dash',
      plotLines: !opposite && props.valueMode === 'normalized'
        ? [
            {
              color: theme.border,
              value: 100,
              width: 1,
              dashStyle: 'Dash',
              zIndex: 3,
            },
          ]
        : [],
    }
  }

  chart = Highcharts.chart(chartElement.value, {
    chart: {
      ...baseHighchartsChartOptions(theme),
      zooming: { type: 'x' },
      height: chartHeight.value,
      spacingLeft: 6,
      spacingRight: 6,
      spacingTop: 8,
      spacingBottom: 8,
    },
    title: {
      text: '',
    },
    credits: {
      enabled: props.xMode === 'datetime',
      text: 'Source: SentimenTrader',
      href: 'https://sentimentrader.com',
    },
    accessibility: {
      enabled: false,
    },
    legend: {
      enabled: props.showLegend,
      align: 'right',
      verticalAlign: 'top',
      symbolRadius: 2,
      itemStyle: {
        color: theme.textSecondary,
        fontSize: '11px',
        fontWeight: '700',
      },
      itemHoverStyle: {
        color: theme.primary,
      },
    },
    exporting: {
      enabled: false,
    },
    xAxis: {
      type: isAligned ? 'linear' : 'datetime',
      title: {
        text: isAligned ? 'Trading Bar' : '',
        style: axisTitleStyle(theme),
      },
      min: isAligned ? 1 : undefined,
      gridLineWidth: 1,
      gridLineColor: theme.grid,
      gridLineDashStyle: 'Dash',
      lineColor: theme.border,
      tickColor: theme.border,
      crosshair: highchartsCrosshairOptions(),
      labels: {
        formatter() {
          return isAligned ? String(Math.round(Number(this.value))) : Highcharts.dateFormat('%b %Y', Number(this.value))
        },
        style: axisLabelStyle(theme),
      },
    },
    yAxis: isDual
      ? [
          yAxisConfig(0, props.yAxisLabel || 'Price', false),
          yAxisConfig(1, props.rightAxisLabel || 'Price', true),
        ]
      : yAxisConfig(0, props.yAxisLabel || (props.valueMode === 'normalized' ? 'Indexed Value' : 'Price'), !isAligned),
    tooltip: {
      shared: true,
      split: false,
      backgroundColor: theme.tooltipBg,
      borderColor: theme.border,
      borderRadius: 8,
      style: {
        color: theme.textSecondary,
        fontSize: '12px',
      },
      formatter(this: { x?: number; points?: Highcharts.Point[] }) {
        const x = Number(this.x)
        const title = isAligned ? `Aligned Bar ${Math.round(x)}` : Highcharts.dateFormat('%b %e, %Y', x)
        const rows = (this.points ?? [])
          .filter((point) => point.y !== undefined)
          .map((point) => {
            const color = point.color || point.series.color
            return `<br/><span style="color:${color}">\u25CF</span> ${point.series.name}: <b>${formatValue(Number(point.y))}</b>`
          })
          .join('')
        return `<b>${title}</b>${rows}`
      },
    },
    plotOptions: {
      series: {
        animation: false,
        states: disabledSeriesStates(),
        point: {
          events: {
            mouseOver(this: Highcharts.Point) {
              emit('pointHover', Number(this.x))
            },
          },
        },
      },
      area: {
        marker: {
          enabled: false,
          radius: 2,
        },
      },
      line: {
        marker: {
          enabled: false,
          radius: 2,
        },
      },
    },
    series: props.series
      .filter((series) => series.data.length > 1)
      .map((series, index) => {
        const color = series.color ?? seriesColor(index)
        return {
          type: series.fill ? 'area' : 'line',
          name: series.name,
          data: series.data,
          yAxis: isDual ? series.yAxis ?? 0 : undefined,
          color,
          lineColor: color,
          lineWidth: series.fill ? 2 : 2.3,
          fillColor: series.fill
            ? {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                  [0, withAlpha(color, 0.18)],
                  [1, withAlpha(color, 0)],
                ],
              }
            : undefined,
        } as Highcharts.SeriesOptionsType
      }),
  } as Highcharts.Options)
}

function observeThemeChanges() {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return

  themeObserver?.disconnect()
  themeObserver = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.attributeName === 'data-theme')) void nextTick(renderChart)
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
}

watch(() => props.selectedX, (value) => {
  const axis = chart?.xAxis[0]
  if (!axis) return
  axis.removePlotLine('aligned-selection')
  if (value !== null && value !== undefined) axis.addPlotLine({
    id: 'aligned-selection', value, width: 1, color: indicatorChartTheme().textMuted,
    dashStyle: 'ShortDash', zIndex: 5,
  })
})

watch(
  () => [props.series, props.xMode, props.yAxisLabel, props.rightAxisLabel, props.dualAxis, props.valueMode, props.loading, chartHeight.value, props.showLegend],
  () => {
    void nextTick(renderChart)
  },
  { deep: true },
)

onMounted(() => {
  observeThemeChanges()
  void nextTick(renderChart)
})

onBeforeUnmount(() => {
  themeObserver?.disconnect()
  destroyChart()
})
</script>

<template>
  <div class="cpm-pattern-comparison-chart" :style="{ minHeight: `${chartHeight}px` }">
    <div class="pattern-zoom"><span>Zoom</span><button v-for="zoom in zoomOptions" :key="zoom" type="button" :disabled="!hasData || loading" :aria-pressed="selectedZoom === zoom" @click="setZoom(zoom)">{{ zoom }}</button></div>
    <div v-if="loading" class="cpm-pattern-comparison-chart__empty" :style="{ minHeight: `${chartHeight}px` }">
      Loading pattern data...
    </div>
    <div v-else-if="!hasData" class="cpm-pattern-comparison-chart__empty" :style="{ minHeight: `${chartHeight}px` }">
      No pattern data
    </div>
    <div
      v-show="!loading && hasData"
      ref="chartElement"
      class="cpm-pattern-comparison-chart__canvas"
      :style="{ minHeight: `${chartHeight}px` }"
    />
  </div>
</template>

<style scoped>
.pattern-zoom { display: flex; align-items: center; gap: 4px; margin: 8px 0 4px; color: var(--app-text-muted); font-size: 11px; }
.pattern-zoom button { min-height: 22px; padding: 2px 7px; border: 0; border-radius: 2px; background: var(--app-surface-muted); color: var(--app-text-secondary); font-size: 11px; }
.pattern-zoom button[aria-pressed='true'] { background: var(--app-primary-soft); color: var(--app-primary); }
.cpm-pattern-comparison-chart {
  width: 100%;
}

.cpm-pattern-comparison-chart__canvas {
  width: 100%;
}

.cpm-pattern-comparison-chart__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--app-border-strong);
  border-radius: 6px;
  background: var(--app-surface);
  color: var(--app-text-muted);
  font-size: 0.875rem;
}
</style>

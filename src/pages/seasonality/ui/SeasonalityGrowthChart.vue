<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Highcharts from 'highcharts/highstock'
import {
  axisLabelStyle,
  axisTitleStyle,
  baseHighchartsChartOptions,
  chartNavigatorOptions,
  chartScrollbarOptions,
  disabledSeriesStates,
  indicatorChartTheme,
} from '@/pages/indicators/ui/indicatorHighcharts'

export interface SeasonalityGrowthPoint {
  timestamp: number
  value: number
  rawDate: string
}

const props = defineProps<{
  points: SeasonalityGrowthPoint[]
  loading: boolean
  height?: number
  showChartTitle?: boolean
  transparentBackground?: boolean
}>()

const chartElement = ref<HTMLDivElement | null>(null)

let chart: Highcharts.Chart | null = null
let themeObserver: MutationObserver | null = null

function destroyChart() {
  chart?.destroy()
  chart = null
}

function renderChart() {
  destroyChart()
  if (!chartElement.value || !props.points.length || typeof Highcharts.stockChart !== 'function') return

  const theme = indicatorChartTheme()
  const title = 'The growth of one U.S. dollar'
  const chartHeight = props.height ?? 430

  chart = Highcharts.stockChart(chartElement.value, {
    // Points are built with Date.UTC and read back with getUTCFullYear, so the
    // axis has to format in UTC too. Otherwise a Jan 1 tick lands on Dec 31 of
    // the previous year west of UTC and the navigator's year label is off by one.
    time: {
      timezone: 'UTC',
    },
    chart: {
      ...baseHighchartsChartOptions(theme),
      ...(props.transparentBackground ? { backgroundColor: 'transparent' } : {}),
      height: chartHeight,
      // The right axis reserves its own room for the tick labels and title, so
      // this only has to be the breathing space at the container edge.
      spacingLeft: 8,
      spacingRight: 8,
    },
    title: {
      text: props.showChartTitle === false ? '' : title,
      style: {
        color: theme.text,
        fontSize: '16px',
        fontWeight: '800',
      },
    },
    // Attribution lives in the card header instead: the credits block rendered
    // on the same baseline as the axis labels and collided with them.
    credits: {
      enabled: false,
    },
    accessibility: {
      enabled: false,
    },
    exporting: {
      enabled: true,
      buttons: {
        contextButton: {
          menuItems: ['printChart', 'downloadPNG', 'downloadJPEG', 'downloadPDF'],
        },
      },
    },
    rangeSelector: {
      selected: 7,
      inputEnabled: true,
      inputDateFormat: '%Y-%m-%d',
      inputEditDateFormat: '%Y-%m-%d',
      buttons: [
        { type: 'ytd', text: 'YTD' },
        { type: 'year', count: 1, text: '1y' },
        { type: 'year', count: 3, text: '3y' },
        { type: 'year', count: 5, text: '5y' },
        { type: 'year', count: 10, text: '10y' },
        { type: 'year', count: 15, text: '15y' },
        { type: 'year', count: 20, text: '20y' },
        { type: 'all', text: 'All' },
      ],
      buttonTheme: {
        fill: theme.surfaceMuted,
        stroke: theme.border,
        style: {
          color: theme.textSecondary,
        },
        states: {
          select: {
            fill: theme.primary,
            style: {
              color: '#ffffff',
            },
          },
        },
      },
      inputStyle: {
        color: theme.textSecondary,
      },
      labelStyle: {
        color: theme.textMuted,
      },
    },
    navigator: chartNavigatorOptions(
      theme,
      props.points.map((point) => [point.timestamp, point.value] as [number, number]),
    ),
    scrollbar: chartScrollbarOptions(theme),
    xAxis: {
      type: 'datetime',
      lineColor: theme.border,
      tickColor: theme.border,
      labels: {
        style: axisLabelStyle(theme),
      },
    },
    yAxis: {
      opposite: true,
      gridLineDashStyle: 'Dash',
      gridLineColor: theme.grid,
      title: {
        text: title,
        style: axisTitleStyle(theme),
      },
      labels: {
        formatter() {
          return Highcharts.numberFormat(Number(this.value), 2).replace(/\.?0+$/, '')
        },
        style: axisLabelStyle(theme),
      },
    },
    tooltip: {
      backgroundColor: theme.tooltipBg,
      borderColor: theme.border,
      borderRadius: 8,
      style: {
        color: theme.textSecondary,
        fontSize: '12px',
      },
      formatter() {
        const point = this.points?.[0] ?? this
        const rawDate = typeof point.options === 'object' && 'rawDate' in point.options ? String(point.options.rawDate) : ''
        return `<b>Date: ${rawDate}</b><br/>${point.series.name}: $${Highcharts.numberFormat(Number(point.y), 2)}`
      },
    },
    legend: {
      enabled: false,
    },
    plotOptions: {
      series: {
        animation: false,
        dataGrouping: {
          enabled: false,
        },
        states: disabledSeriesStates(),
      },
    },
    series: [
      {
        type: 'line',
        name: title,
        color: theme.primary,
        lineWidth: 2,
        marker: {
          enabled: false,
        },
        data: props.points.map((point) => ({
          x: point.timestamp,
          y: point.value,
          rawDate: point.rawDate,
        })),
      },
    ] as Highcharts.SeriesOptionsType[],
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

watch(
  () => [props.points, props.height, props.showChartTitle, props.transparentBackground],
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
  <div class="seasonality-growth-chart" :style="{ minHeight: `${height ?? 430}px` }">
    <div v-if="loading" class="seasonality-growth-chart__empty" :style="{ minHeight: `${height ?? 430}px` }">Loading chart...</div>
    <div v-else-if="!points.length" class="seasonality-growth-chart__empty" :style="{ minHeight: `${height ?? 430}px` }">No chart data</div>
    <div
      v-show="!loading && points.length"
      ref="chartElement"
      class="seasonality-growth-chart__canvas"
      :style="{ minHeight: `${height ?? 430}px` }"
    />
  </div>
</template>

<style scoped>
.seasonality-growth-chart {
  width: 100%;
}

.seasonality-growth-chart__canvas {
  width: 100%;
}

.seasonality-growth-chart__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text-muted);
  font-size: 0.875rem;
}

/* Navigator and scrollbar chrome. Highcharts draws these outside the option
   surface, so the fills have to be pinned here to match the indicator charts. */
:deep(.highcharts-navigator-xaxis text),
:deep(.highcharts-scrollbar text) {
  font-size: calc(9px * var(--chart-ui-scale, 1)) !important;
  font-weight: 400 !important;
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

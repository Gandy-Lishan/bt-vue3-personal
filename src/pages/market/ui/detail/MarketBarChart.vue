<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Highcharts from 'highcharts/highstock'
import {
  axisLabelStyle,
  axisTitleStyle,
  baseHighchartsChartOptions,
  chartSize,
  chartFontSize,
  disabledSeriesStates,
  indicatorChartTheme,
} from '@/pages/indicators/ui/indicatorHighcharts'

export interface MarketBarChartSeries {
  key: string
  label: string
  /** CSS variable name (e.g. '--app-positive') or hex color */
  colorVar: string
  type?: 'column' | 'line'
  /** CSS variable for negative zones (for column charts) */
  negativeColorVar?: string
  /** For line charts: show area fill below the line */
  areaFill?: string
}

const props = withDefaults(
  defineProps<{
    categories: string[]
    series: MarketBarChartSeries[]
    data: Record<string, number | null>[]
    height?: number
    loading?: boolean
    emptyMessage?: string
    /** Show percentage axis formatting */
    percentAxis?: boolean
  }>(),
  {
    height: 400,
    loading: false,
    emptyMessage: 'No data available',
    percentAxis: false,
  },
)

const chartEl = ref<HTMLDivElement | null>(null)
let chart: Highcharts.Chart | null = null
let themeObserver: MutationObserver | null = null

const hasData = computed(() => props.categories.length > 0 && props.data.length > 0)

function destroyChart() {
  chart?.destroy()
  chart = null
}

function resolveColor(cssVarOrHex: string) {
  if (cssVarOrHex.startsWith('--')) {
    return getComputedStyle(document.documentElement).getPropertyValue(cssVarOrHex).trim() || '#999'
  }
  return cssVarOrHex
}

function renderChart() {
  destroyChart()
  if (!chartEl.value || props.loading || !hasData.value) return

  const theme = indicatorChartTheme()
  const seriesOpts = props.series.map((s) => {
    const color = resolveColor(s.colorVar)
    const type = s.type === 'line' ? 'line' : 'column' as const
    const seriesData = props.data.map((row) => row[s.key] ?? null)

    if (type === 'column' && s.negativeColorVar) {
      const negColor = resolveColor(s.negativeColorVar)
      return {
        type,
        name: s.label,
        color,
        data: seriesData.map((v) => {
          if (v === null || v === undefined) return { y: null, color }
          return { y: v, color: v >= 0 ? color : negColor }
        }),
      }
    }

    if (type === 'line' && s.areaFill) {
      const fillColor = resolveColor(s.areaFill)
      // Convert color to hex for gradient stops (handle both hex and rgb formats)
      const hexColor = fillColor.startsWith('#') ? fillColor.slice(1) : ''
      return {
        type: 'area',
        name: s.label,
        color,
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: hexColor
            ? [
                [0, `#${hexColor}66`],
                [1, `#${hexColor}1A`],
              ]
            : [
                [0, fillColor],
                [1, fillColor + '33'],
              ],
        },
        threshold: 0,
        lineColor: color,
        lineWidth: 2,
        marker: { enabled: true, radius: 3 },
        data: seriesData,
      }
    }

    return { type, name: s.label, color, data: seriesData }
  })

  const height = chartSize(props.height)

  chart = Highcharts.chart(chartEl.value, {
    chart: {
      ...baseHighchartsChartOptions(theme),
      // Vue2 `BarChart.vue` leaves Highcharts defaults on, so series animate
      // on first paint and whenever the chart is re-created after a data change.
      animation: true,
      height,
      spacingLeft: 8,
      spacingRight: 56,
      // Vue2 `BarChart.vue` uses spacingTop: 30, leaving room for the top
      // y-axis label so it is not clipped by the chart container.
      spacingTop: 30,
      spacingBottom: 8,
    },
    title: { text: '', margin: 0 },
    credits: {
      enabled: true,
      text: 'SENTIMENTRADER',
      href: 'https://sentimentrader.com',
      position: { align: 'right', x: -40, y: -40 },
      style: { color: theme.textMuted, fontSize: '9px' },
    },
    accessibility: { enabled: false },
    legend: {
      enabled: props.series.length > 1,
      align: 'center',
      verticalAlign: 'bottom',
      itemStyle: { color: theme.textSecondary, fontSize: chartFontSize(10) },
      itemHoverStyle: { color: theme.text },
      symbolHeight: 10,
      symbolWidth: 10,
      symbolRadius: 0,
    },
    xAxis: {
      categories: props.categories,
      tickWidth: 0,
      lineWidth: 0,
      gridLineWidth: 0,
      labels: { style: axisLabelStyle(theme, '10px') },
    },
    yAxis: {
      title: { text: '', style: axisTitleStyle(theme, '10px') },
      labels: {
        style: axisLabelStyle(theme, '10px'),
        ...(props.percentAxis ? { format: '{value:.1f}%' } : {}),
      },
      plotLines: [{ color: theme.border, width: 1, value: 0 }],
      gridLineWidth: 0,
      tickPixelInterval: 37,
    },
    tooltip: {
      backgroundColor: theme.tooltipBg,
      borderColor: theme.border,
      borderRadius: 8,
      style: { color: theme.textSecondary, fontSize: '12px' },
      ...(props.percentAxis ? { valueSuffix: '%' } : {}),
    },
    exporting: { enabled: false },
    plotOptions: {
      series: {
        dataGrouping: { enabled: false },
        states: disabledSeriesStates(),
      },
      column: { borderWidth: 0 },
      line: {
        marker: { enabled: true, radius: 3 },
        lineWidth: 2,
      },
    },
    series: seriesOpts as Highcharts.SeriesOptionsType[],
  })
}

function observeTheme() {
  if (themeObserver) return
  themeObserver = new MutationObserver(() => {
    nextTick(renderChart)
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
}

onMounted(() => {
  observeTheme()
  renderChart()
})

watch(() => [props.categories, props.series, props.data, props.loading, props.percentAxis], () => {
  nextTick(renderChart)
}, { deep: true })

onBeforeUnmount(() => {
  destroyChart()
  themeObserver?.disconnect()
})
</script>

<template>
  <div>
    <div v-if="loading" class="flex h-[400px] items-center justify-center text-sm italic text-[var(--app-text-muted)]">
      Loading chart data...
    </div>
    <div v-else-if="!hasData" class="flex h-[400px] items-center justify-center text-sm italic text-[var(--app-text-muted)]">
      {{ emptyMessage }}
    </div>
    <div v-else ref="chartEl" class="w-full overflow-hidden rounded-md" :style="{ height: `${height}px` }" />
  </div>
</template>

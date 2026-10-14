<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Highcharts from 'highcharts/highstock'
import type { CpmPatternPreviewPoint } from '@/entities/cpm/model/cpm.types'
import {
  axisLabelStyle,
  axisTitleStyle,
  baseHighchartsChartOptions,
  disabledSeriesStates,
  indicatorChartTheme,
} from '@/pages/indicators/ui/indicatorHighcharts'

const props = withDefaults(
  defineProps<{
    points: CpmPatternPreviewPoint[]
    loading?: boolean
    height?: number
  }>(),
  {
    loading: false,
    height: 260,
  },
)

const chartElement = ref<HTMLDivElement | null>(null)

let chart: Highcharts.Chart | null = null
let themeObserver: MutationObserver | null = null

const hasData = computed(() => props.points.length > 1)
const chartHeight = computed(() => props.height)

function formatPercent(value: number) {
  return `${Highcharts.numberFormat(value, 2).replace(/\.?0+$/, '')}%`
}

function destroyChart() {
  chart?.destroy()
  chart = null
}

function renderChart() {
  destroyChart()
  if (!chartElement.value || props.loading || !hasData.value) return

  const theme = indicatorChartTheme()
  const data = props.points.map((point) => [point.timestamp, point.normalizedReturn] as [number, number])
  const maxAbsValue = Math.max(...data.map((point) => Math.abs(point[1])), 1)

  chart = Highcharts.chart(chartElement.value, {
    chart: {
      ...baseHighchartsChartOptions(theme),
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
      enabled: false,
    },
    accessibility: {
      enabled: false,
    },
    legend: {
      enabled: false,
    },
    exporting: {
      enabled: false,
    },
    xAxis: {
      type: 'datetime',
      gridLineWidth: 1,
      gridLineColor: theme.grid,
      gridLineDashStyle: 'Dash',
      lineColor: theme.border,
      tickColor: theme.border,
      labels: {
        style: axisLabelStyle(theme),
      },
    },
    yAxis: {
      title: {
        text: 'Normalized Return',
        style: axisTitleStyle(theme),
      },
      labels: {
        formatter() {
          return formatPercent(Number(this.value))
        },
        style: axisLabelStyle(theme),
      },
      max: Math.ceil(maxAbsValue * 1.15),
      min: Math.floor(maxAbsValue * -1.15),
      gridLineColor: theme.grid,
      gridLineDashStyle: 'Dash',
      plotLines: [
        {
          color: theme.border,
          value: 0,
          width: 1,
          zIndex: 3,
        },
      ],
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
        return `<b>${Highcharts.dateFormat('%b %e, %Y', Number(this.x))}</b><br/>Normalized: ${formatPercent(Number(this.y))}`
      },
    },
    plotOptions: {
      series: {
        animation: false,
        states: disabledSeriesStates(),
      },
      area: {
        lineWidth: 2,
        marker: {
          enabled: false,
          radius: 2,
        },
      },
    },
    series: [
      {
        type: 'area',
        name: 'Normalized Pattern',
        data,
        color: theme.primary,
        lineColor: theme.primary,
        fillColor: {
          linearGradient: {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 1,
          },
          stops: [
            [0, 'rgba(0, 108, 255, 0.18)'],
            [1, 'rgba(0, 108, 255, 0)'],
          ],
        },
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
  () => [props.points, props.loading, chartHeight.value],
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
  <div class="cpm-pattern-preview-chart" :style="{ minHeight: `${chartHeight}px` }">
    <div v-if="loading" class="cpm-pattern-preview-chart__empty" :style="{ minHeight: `${chartHeight}px` }">
      Loading pattern...
    </div>
    <div v-else-if="!hasData" class="cpm-pattern-preview-chart__empty" :style="{ minHeight: `${chartHeight}px` }">
      No pattern data
    </div>
    <div
      v-show="!loading && hasData"
      ref="chartElement"
      class="cpm-pattern-preview-chart__canvas"
      :style="{ minHeight: `${chartHeight}px` }"
    />
  </div>
</template>

<style scoped>
.cpm-pattern-preview-chart {
  width: 100%;
}

.cpm-pattern-preview-chart__canvas {
  width: 100%;
}

.cpm-pattern-preview-chart__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text-muted);
  font-size: 0.875rem;
}
</style>

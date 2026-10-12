<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Highcharts from 'highcharts/highstock'
import {
  axisLabelStyle,
  axisTitleStyle,
  baseHighchartsChartOptions,
  disabledSeriesStates,
  indicatorChartTheme,
} from '@/pages/indicators/ui/indicatorHighcharts'

export interface SeasonalityYearReturnPoint {
  year: number
  windowReturn: number | null
}

const props = withDefaults(
  defineProps<{
    points: SeasonalityYearReturnPoint[]
    loading: boolean
    height?: number
  }>(),
  {
    height: 250,
  },
)

const chartElement = ref<HTMLDivElement | null>(null)

let chart: Highcharts.Chart | null = null
let themeObserver: MutationObserver | null = null

const hasData = computed(() => props.points.some((point) => point.windowReturn !== null))

function trimTrailingZeros(text: string) {
  if (!text.includes('.')) return text
  return text.replace(/0+$/, '').replace(/\.$/, '')
}

function roundedTickPositions(minValue: number, maxValue: number, targetTicks = 6) {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) return [-20, 0, 20]
  if (minValue === maxValue) {
    const padding = Math.max(Math.abs(minValue) * 0.2, 5)
    return [Number((minValue - padding).toFixed(2)), Number(minValue.toFixed(2)), Number((maxValue + padding).toFixed(2))]
  }

  const range = maxValue - minValue
  const rawStep = range / Math.max(targetTicks - 1, 1)
  const magnitude = 10 ** Math.floor(Math.log10(Math.abs(rawStep)))
  const step = Math.ceil(rawStep / magnitude) * magnitude
  const start = Math.floor(minValue / step) * step
  const end = Math.ceil(maxValue / step) * step
  const positions: number[] = []

  for (let value = start; value <= end + step / 2; value += step) {
    positions.push(Number(value.toFixed(2)))
  }

  if (!positions.includes(0) && start < 0 && end > 0) {
    positions.push(0)
    positions.sort((left, right) => left - right)
  }

  return positions
}

function destroyChart() {
  chart?.destroy()
  chart = null
}

function renderChart() {
  destroyChart()
  if (!chartElement.value || !hasData.value) return

  const theme = indicatorChartTheme()
  const values = props.points
    .map((point) => point.windowReturn)
    .filter((value): value is number => value !== null)
  const tickPositions = roundedTickPositions(Math.min(...values), Math.max(...values))

  chart = Highcharts.chart(chartElement.value, {
    chart: {
      ...baseHighchartsChartOptions(theme),
      backgroundColor: 'transparent',
      height: props.height,
      spacingLeft: 8,
      spacingRight: 24,
      spacingBottom: 12,
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
    exporting: {
      enabled: false,
    },
    legend: {
      enabled: false,
    },
    xAxis: {
      categories: props.points.map((point) => String(point.year)),
      gridLineWidth: 1,
      gridLineColor: theme.grid,
      gridLineDashStyle: 'Dash',
      tickInterval: 1,
      tickWidth: 0,
      labels: {
        step: 1,
        style: axisLabelStyle(theme),
      },
    },
    yAxis: {
      title: {
        text: 'Window Return',
        style: axisTitleStyle(theme),
      },
      labels: {
        formatter() {
          return `${trimTrailingZeros(Highcharts.numberFormat(Number(this.value), 2))}%`
        },
        style: axisLabelStyle(theme),
      },
      tickPositions,
      gridLineDashStyle: 'Dash',
      gridLineColor: theme.grid,
      plotLines: [
        {
          color: theme.border,
          value: 0,
          width: 1,
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
        const value = this.y === null || this.y === undefined ? 'no data' : `${trimTrailingZeros(Highcharts.numberFormat(Number(this.y), 2))}%`
        return `<b>Year: ${this.x}</b><br/>Window Return: ${value}`
      },
    },
    plotOptions: {
      series: {
        animation: false,
        states: disabledSeriesStates(),
      },
      column: {
        borderWidth: 0,
      },
    },
    series: [
      {
        type: 'column',
        name: 'Window Return',
        data: props.points.map((point) => ({
          y: point.windowReturn,
          color:
            point.windowReturn === null
              ? theme.textMuted
              : point.windowReturn >= 0
                ? theme.positive
                : theme.negative,
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
  () => [props.points, props.height],
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
  <div class="seasonality-year-return-chart" :style="{ minHeight: `${height}px` }">
    <div v-if="loading" class="seasonality-year-return-chart__empty" :style="{ minHeight: `${height}px` }">Loading chart...</div>
    <div v-else-if="!hasData" class="seasonality-year-return-chart__empty" :style="{ minHeight: `${height}px` }">No chart data</div>
    <div
      v-show="!loading && hasData"
      ref="chartElement"
      class="seasonality-year-return-chart__canvas"
      :style="{ minHeight: `${height}px` }"
    />
  </div>
</template>

<style scoped>
.seasonality-year-return-chart {
  width: 100%;
}

.seasonality-year-return-chart__canvas {
  width: 100%;
}

.seasonality-year-return-chart__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text-muted);
  font-size: 0.875rem;
}
</style>

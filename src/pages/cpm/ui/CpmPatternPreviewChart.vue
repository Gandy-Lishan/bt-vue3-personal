<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Highcharts from 'highcharts/highstock'
import type { CpmPatternPreviewPoint } from '@/entities/cpm/model/cpm.types'
import {
  baseHighchartsChartOptions,
  disabledSeriesStates,
  indicatorChartTheme,
} from '@/pages/indicators/ui/indicatorHighcharts'

export interface CpmPatternPreviewOverlay {
  start: number
  end: number
  label?: string
}

const props = withDefaults(
  defineProps<{
    points: CpmPatternPreviewPoint[]
    valueMode?: 'normalized' | 'price'
    loading?: boolean
    height?: number
    overlays?: CpmPatternPreviewOverlay[]
  }>(),
  {
    valueMode: 'normalized',
    loading: false,
    height: 260,
    overlays: () => [],
  },
)

const chartElement = ref<HTMLDivElement | null>(null)

let chart: Highcharts.Chart | null = null
let themeObserver: MutationObserver | null = null

const chartData = computed(() => {
  return props.points
    .map((point) => {
      const value = props.valueMode === 'price' ? point.close : point.normalizedReturn
      return value === null || !Number.isFinite(value) ? null : [point.timestamp, value] as [number, number]
    })
    .filter((point): point is [number, number] => point !== null)
})
const hasData = computed(() => chartData.value.length > 1)
const chartHeight = computed(() => props.height)

function formatPercent(value: number) {
  return `${Highcharts.numberFormat(value, 2).replace(/\.?0+$/, '')}%`
}

function formatPrice(value: number) {
  return Highcharts.numberFormat(value, 2).replace(/\.?0+$/, '')
}

function destroyChart() {
  chart?.destroy()
  chart = null
}

function renderChart() {
  destroyChart()
  if (!chartElement.value || props.loading || !hasData.value) return

  const theme = indicatorChartTheme()
  const data = chartData.value
  const values = data.map((point) => point[1])
  const isPriceMode = props.valueMode === 'price'
  const maxAbsValue = Math.max(...values.map((value) => Math.abs(value)), 1)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const pricePadding = Math.max((maxValue - minValue) * 0.12, maxValue * 0.01, 1)

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
      visible: false,
      plotBands: props.overlays.slice(0, 24).map((overlay, index) => {
        const primary = index % 2 === 0
        return {
          from: overlay.start,
          to: overlay.end,
          color: primary ? 'rgba(0, 108, 255, 0.10)' : 'rgba(124, 58, 237, 0.10)',
          borderWidth: 1,
          borderColor: primary ? 'rgba(0, 108, 255, 0.55)' : 'rgba(124, 58, 237, 0.55)',
          label: overlay.label
            ? {
                text: overlay.label,
                vertical: 'top',
                style: {
                  color: primary ? '#006cff' : '#7c3aed',
                  fontSize: '10px',
                  fontWeight: '700',
                },
              }
            : undefined,
        }
      }),
    },
    yAxis: {
      visible: false,
      max: isPriceMode ? maxValue + pricePadding : Math.ceil(maxAbsValue * 1.15),
      min: isPriceMode ? Math.max(0, minValue - pricePadding) : Math.floor(maxAbsValue * -1.15),
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
        const label = isPriceMode ? 'Price' : 'Normalized'
        const value = isPriceMode ? formatPrice(Number(this.y)) : formatPercent(Number(this.y))
        return `<b>${Highcharts.dateFormat('%b %e, %Y', Number(this.x))}</b><br/>${label}: ${value}`
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
        name: isPriceMode ? 'Price Trend' : 'Normalized Pattern',
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
  () => [props.points, props.valueMode, props.loading, props.overlays, chartHeight.value],
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

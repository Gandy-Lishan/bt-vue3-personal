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

export interface SeasonalityReturnPoint {
  label: string | number
  averageReturn: number | null
  percentPositive: number | null
}

const props = defineProps<{
  title: string
  subtitle: string
  xAxisTitle: string
  xPointLabel: string
  points: SeasonalityReturnPoint[]
  loading: boolean
  height?: number
  showChartTitle?: boolean
  // Charts with a dense category axis (e.g. day of month) read better without
  // the vertical grid lines, which crowd the columns.
  showXGridLines?: boolean
  showEveryCategoryLabel?: boolean
  // Highcharts paints an opaque rect over the whole container, which squares
  // off the bottom corners of a rounded card the chart sits flush inside. Set
  // this when the card already supplies the surface, so the corners show.
  transparentBackground?: boolean
}>()

const chartElement = ref<HTMLDivElement | null>(null)

let chart: Highcharts.Chart | null = null
let themeObserver: MutationObserver | null = null

const chartHeight = computed(() => props.height ?? 430)
const hasData = computed(() => props.points.some((point) => point.averageReturn !== null || point.percentPositive !== null))

function roundedTickPositions(minValue: number, maxValue: number, targetTicks = 8) {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) return [-1, 0, 1]
  if (minValue === maxValue) {
    const padding = Math.max(Math.abs(minValue) * 0.2, 0.1)
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

// Tooltips have no column to align against, so trailing zeros are pure noise
// ("1.20%" reads the same as "1.2%").
function trimTrailingZeros(text: string) {
  if (!text.includes('.')) return text
  return text.replace(/0+$/, '').replace(/\.$/, '')
}

function tooltipXAxisLabel(xValue: unknown, category: unknown, points: SeasonalityReturnPoint[]) {
  if (category !== null && category !== undefined) return String(category)
  if (typeof xValue === 'number' && Number.isInteger(xValue)) {
    const point = points[xValue]
    if (point) return String(point.label)
  }
  return String(xValue ?? '')
}

function destroyChart() {
  chart?.destroy()
  chart = null
}

function renderChart() {
  destroyChart()
  if (!chartElement.value || !hasData.value) return

  const theme = indicatorChartTheme()
  const averageValues = props.points
    .map((point) => point.averageReturn)
    .filter((value): value is number => value !== null)
  const tickPositions = roundedTickPositions(
    averageValues.length ? Math.min(...averageValues) : -1,
    averageValues.length ? Math.max(...averageValues) : 1,
  )
  const positiveColor = theme.positive
  const negativeColor = theme.negative

  chart = Highcharts.chart(chartElement.value, {
    chart: {
      ...baseHighchartsChartOptions(theme),
      // Only the container background needs clearing: it is the rect that
      // reaches the card's corners. The plot background is inset and matches
      // the card colour anyway.
      ...(props.transparentBackground ? { backgroundColor: 'transparent' } : {}),
      height: chartHeight.value,
      spacingLeft: 8,
      spacingRight: 48,
      spacingBottom: 12,
    },
    title: {
      text: props.showChartTitle === false ? '' : props.title,
      style: {
        color: theme.text,
        fontSize: '16px',
        fontWeight: '800',
      },
    },
    subtitle: {
      text: props.showChartTitle === false ? '' : props.subtitle,
      style: {
        color: theme.textMuted,
      },
    },
    // Attribution lives in the card header instead: the credits block was
    // rendered on the same baseline as the x-axis labels and collided with them.
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
    legend: {
      align: 'center',
      verticalAlign: 'top',
      itemDistance: 24,
      itemStyle: {
        color: theme.text,
        fontSize: '11px',
        fontWeight: '700',
      },
      itemHoverStyle: {
        color: theme.primary,
      },
    },
    xAxis: {
      categories: props.points.map((point) => String(point.label)),
      gridLineWidth: props.showXGridLines === false ? 0 : 1,
      gridLineColor: theme.grid,
      gridLineDashStyle: 'Dash',
      tickInterval: props.showEveryCategoryLabel ? 1 : undefined,
      tickWidth: 0,
      title: {
        text: props.xAxisTitle,
        style: axisTitleStyle(theme),
      },
      labels: {
        step: props.showEveryCategoryLabel ? 1 : undefined,
        style: axisLabelStyle(theme),
      },
    },
    yAxis: [
      {
        title: {
          text: 'Average Return',
          style: axisTitleStyle(theme),
        },
        labels: {
          format: '{value}%',
          style: axisLabelStyle(theme),
        },
        gridLineWidth: 0,
        tickPositions,
        plotLines: [
          {
            color: theme.border,
            value: 0,
            width: 1,
          },
        ],
      },
      {
        title: {
          text: '% of Time Positive',
          style: axisTitleStyle(theme),
        },
        labels: {
          format: '{value}%',
          style: axisLabelStyle(theme),
        },
        min: 0,
        max: 100,
        tickPositions: [0, 20, 40, 60, 80, 100],
        opposite: true,
        gridLineWidth: 0,
      },
    ],
    tooltip: {
      shared: true,
      backgroundColor: theme.tooltipBg,
      borderColor: theme.border,
      borderRadius: 8,
      style: {
        color: theme.textSecondary,
        fontSize: '12px',
      },
      formatter() {
        const points = this.points ?? []
        const xLabel = tooltipXAxisLabel(this.x, points[0]?.category, props.points)
        const averagePoint = points.find((point) => point.series.name === 'Avg Return (%)')
        const positivePoint = points.find((point) => point.series.name === 'Percent Positive (%)')
        const average =
          averagePoint && averagePoint.y !== null && averagePoint.y !== undefined
            ? `${trimTrailingZeros(Highcharts.numberFormat(Number(averagePoint.y), 2))}%`
            : 'no data'
        const positive =
          positivePoint && positivePoint.y !== null && positivePoint.y !== undefined
            ? `${trimTrailingZeros(Highcharts.numberFormat(Number(positivePoint.y), 2))}%`
            : 'no data'
        return `<b>${props.xPointLabel}: ${xLabel}</b><br/>Avg Return: ${average}<br/>Percent Positive: ${positive}`
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
        name: 'Avg Return (%)',
        yAxis: 0,
        // Neutral series colour so the legend swatch does not imply a single
        // colour: each bar is coloured individually by sign below.
        color: theme.textMuted,
        data: props.points.map((point) => ({
          y: point.averageReturn,
          color: point.averageReturn === null ? undefined : point.averageReturn >= 0 ? positiveColor : negativeColor,
        })),
      },
      {
        type: 'line',
        name: 'Percent Positive (%)',
        yAxis: 1,
        color: theme.primary,
        marker: {
          enabled: true,
          radius: 4,
          symbol: 'diamond',
        },
        data: props.points.map((point) => point.percentPositive),
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
  () => [
    props.title,
    props.subtitle,
    props.xAxisTitle,
    props.xPointLabel,
    props.points,
    props.showXGridLines,
    props.showEveryCategoryLabel,
    props.transparentBackground,
    chartHeight.value,
  ],
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
  <div class="seasonality-return-chart" :style="{ minHeight: `${chartHeight}px` }">
    <div v-if="loading" class="seasonality-return-chart__empty" :style="{ minHeight: `${chartHeight}px` }">Loading chart...</div>
    <div v-else-if="!hasData" class="seasonality-return-chart__empty" :style="{ minHeight: `${chartHeight}px` }">No chart data</div>
    <div
      v-show="!loading && hasData"
      ref="chartElement"
      class="seasonality-return-chart__canvas"
      :style="{ minHeight: `${chartHeight}px` }"
    />
  </div>
</template>

<style scoped>
.seasonality-return-chart {
  width: 100%;
}

.seasonality-return-chart__canvas {
  width: 100%;
}

.seasonality-return-chart__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text-muted);
  font-size: 0.875rem;
}
</style>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Highcharts from 'highcharts/highstock'
import { CandlestickChart, ChartLine, Maximize2 } from '@lucide/vue'
import { fetchMarketPriceHistory } from '@/entities/market/api/market-detail.api'
import type { MarketPriceRow } from '@/entities/market/model/market-detail.types'
import {
  axisLabelStyle,
  axisTitleStyle,
  baseHighchartsChartOptions,
  chartSize,
  indicatorChartTheme,
} from '@/pages/indicators/ui/indicatorHighcharts'

const props = defineProps<{
  ticker: string
}>()

type MarketChartType = 'candlestick' | 'line'

interface MarketZoomOption {
  text: string
  range: number | 'ytd' | null
}

// Mirrors Vue2 `components/Market/sec/Chart.vue`.
const zoomOptions: MarketZoomOption[] = [
  { text: '1m', range: 1000 * 60 * 60 * 24 * 30 },
  { text: '3m', range: 1000 * 60 * 60 * 24 * 90 },
  { text: '6m', range: 1000 * 60 * 60 * 24 * 180 },
  { text: 'YTD', range: 'ytd' },
  { text: '1y', range: 1000 * 60 * 60 * 24 * 365 },
  { text: 'All', range: null },
]

const chartType = ref<MarketChartType>('candlestick')
const selectedZoom = ref('All')
const zoomRange = ref<{ min: number | null; max: number | null } | null>(null)
const pairData = ref<MarketPriceRow[]>([])
const isLoading = ref(false)
const error = ref('')
const chartEl = ref<HTMLDivElement | null>(null)

const endDate = new Date().toISOString().slice(0, 10)
const chartHeight = chartSize(400)

let chart: Highcharts.Chart | null = null
let abortController: AbortController | null = null
let themeObserver: MutationObserver | null = null

const symbol = computed(() => props.ticker)
const fullChartHref = computed(
  () => `/backtester/sr/setup?index=${symbol.value}&indicator=${symbol.value}`,
)

const lastPrice = computed(() => {
  if (!pairData.value.length) return null
  return pairData.value[pairData.value.length - 1].close
})

const change = computed(() => {
  if (pairData.value.length < 2) return null
  const latest = pairData.value[pairData.value.length - 1].close
  const previous = pairData.value[pairData.value.length - 2].close
  if (latest === null || previous === null) return null
  return Number((latest - previous).toFixed(2))
})

const changePercentage = computed(() => {
  if (pairData.value.length < 2) return null
  const latest = pairData.value[pairData.value.length - 1].close
  const previous = pairData.value[pairData.value.length - 2].close
  if (latest === null || previous === null || previous === 0) return null
  return Number(((latest - previous) / previous).toFixed(4))
})

const changePercentText = computed(() => ((changePercentage.value ?? 0) * 100).toFixed(2))

const seriesData = computed(() => {
  if (!pairData.value.length) return []

  const processed = pairData.value.map((item) => {
    const timestamp = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(item.date)
      ? new Date(item.date).getTime()
      : null
    return chartType.value === 'candlestick'
      ? [timestamp, item.open, item.high, item.low, item.close]
      : [timestamp, item.close]
  })

  return [
    {
      name: symbol.value,
      type: chartType.value,
      data: processed,
      showInNavigator: true,
    },
  ]
})

function destroyChart() {
  chart?.destroy()
  chart = null
}

function tooltipFormatter(this: { x: number; points?: Highcharts.Point[]; point?: Highcharts.Point }) {
  const point = this.points?.[0] ?? this.point
  const date = Highcharts.dateFormat('%A, %b %e, %Y', this.x)
  if (!point) return date

  const series = point.series
  if (series.type === 'candlestick') {
    const candle = point as Highcharts.Point & {
      open: number
      high: number
      low: number
      close: number
    }
    return `
      ${date}<br/>
      <span style="color:${series.color}">●</span> ${series.name}<br/>
      Open: <b>${candle.open.toFixed(2)}</b><br/>
      High: <b>${candle.high.toFixed(2)}</b><br/>
      Low: <b>${candle.low.toFixed(2)}</b><br/>
      Close: <b>${candle.close.toFixed(2)}</b>
    `
  }

  return `
    ${date}<br/>
    <span style="color:${series.color}">●</span> ${series.name}: <b>${Number(point.y).toFixed(2)}</b>
  `
}

function renderChart() {
  destroyChart()
  if (!chartEl.value || isLoading.value || error.value || !seriesData.value.length) return

  const theme = indicatorChartTheme()
  const series = seriesData.value.map((item) => ({ ...item, color: theme.primary }))

  chart = Highcharts.stockChart(chartEl.value, {
    chart: {
      ...baseHighchartsChartOptions(theme),
      // Vue2 StockChart leaves Highcharts defaults on, so series animate on
      // first paint and whenever the chart is re-created after a data change.
      animation: true,
      backgroundColor: 'transparent',
      zoomType: 'x',
      height: chartHeight,
    },
    title: { text: '' },
    accessibility: { enabled: false },
    exporting: { enabled: true },
    legend: { enabled: false },
    yAxis: [{
      title: {
        text: symbol.value,
        style: axisTitleStyle(theme, '10px'),
      },
      labels: {
        align: 'left',
        x: 5,
        style: {
          ...axisLabelStyle(theme, '10px'),
          color: theme.primary,
        },
      },
      opposite: true,
      gridLineWidth: 1,
      gridLineColor: theme.grid,
    }],
    xAxis: {
      labels: { style: axisLabelStyle(theme, '10px') },
      gridLineWidth: 0,
    },
    tooltip: {
      split: false,
      xDateFormat: '%A, %b %e, %Y',
      backgroundColor: theme.tooltipBg,
      borderColor: theme.border,
      borderRadius: 8,
      style: { color: theme.textSecondary, fontSize: '12px' },
      formatter: tooltipFormatter,
    },
    credits: {
      enabled: true,
      text: 'SENTIMENTRADER',
      href: '#',
      position: { align: 'right', x: -10, y: 0 },
      style: { color: theme.textMuted, fontSize: '9px' },
    },
    navigator: {
      enabled: true,
      maskFill: theme.navigatorMask,
      outlineColor: theme.border,
      outlineWidth: 1,
      handles: {
        backgroundColor: theme.surface,
        borderColor: theme.border,
      },
      series: {
        color: theme.primary,
        lineWidth: 1,
        fillOpacity: 0.05,
      },
      xAxis: {
        labels: { style: axisLabelStyle(theme, '10px') },
      },
      yAxis: {
        gridLineColor: theme.border,
        labels: { style: axisLabelStyle(theme, '9px') },
      },
    },
    scrollbar: {
      enabled: true,
      barBackgroundColor: theme.scrollbarBar,
      barBorderColor: theme.border,
      buttonBackgroundColor: theme.scrollbarButton,
      buttonBorderColor: theme.border,
      rifleColor: theme.textMuted,
      buttonArrowColor: theme.textMuted,
      height: 10,
    },
    rangeSelector: { enabled: false },
    plotOptions: {
      candlestick: {
        // Original leaves wicks/bodies at Highcharts defaults on a white card.
        // Map those defaults to tokens so they stay visible in dark mode.
        lineColor: theme.text,
        upLineColor: theme.text,
        upColor: theme.surface,
      },
      line: {
        lineWidth: 2,
        states: { hover: { lineWidthPlus: 1 } },
        marker: { enabled: false, radius: 3, states: { hover: { enabled: true } } },
      },
      series: { showInNavigator: true },
    },
    series: series as Highcharts.SeriesOptionsType[],
  })

  if (zoomRange.value?.min && zoomRange.value?.max) {
    chart.xAxis[0].setExtremes(zoomRange.value.min, zoomRange.value.max)
  }
}

function setZoom(option: MarketZoomOption) {
  selectedZoom.value = option.text

  const now = new Date(endDate).getTime()

  if (option.range === 'ytd') {
    const yearStart = new Date(new Date(endDate).getFullYear(), 0, 1).getTime()
    zoomRange.value = { min: yearStart, max: now }
  } else if (option.range === null) {
    // Full range: reset the extremes.
    zoomRange.value = { min: null, max: null }
  } else {
    zoomRange.value = { min: now - option.range, max: now }
  }
}

async function reloadData() {
  abortController?.abort()
  const controller = new AbortController()
  abortController = controller
  isLoading.value = true
  error.value = ''

  try {
    const rows = await fetchMarketPriceHistory(symbol.value, controller.signal)
    if (controller.signal.aborted) return
    pairData.value = rows
  } catch (caught) {
    if (controller.signal.aborted) return
    pairData.value = []
    error.value = caught instanceof Error ? caught.message : 'Failed to load chart data.'
  } finally {
    if (abortController === controller) isLoading.value = false
  }
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

watch(() => props.ticker, reloadData)

watch(
  () => [seriesData.value, isLoading.value, error.value],
  () => { nextTick(renderChart) },
  { deep: true },
)

watch(zoomRange, (value) => {
  if (!chart) return
  if (value?.min && value?.max) {
    chart.xAxis[0].setExtremes(value.min, value.max)
  } else {
    chart.xAxis[0].setExtremes()
  }
}, { deep: true })

onMounted(() => {
  observeTheme()
  void reloadData()
})

onBeforeUnmount(() => {
  abortController?.abort()
  abortController = null
  destroyChart()
  themeObserver?.disconnect()
  themeObserver = null
})
</script>

<template>
  <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
    <div class="flex flex-col gap-3">
      <div class="flex flex-col gap-1">
        <p class="text-sm font-bold text-[var(--app-text-secondary)]">{{ symbol }}</p>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-2xl font-extrabold text-[var(--app-text)]">${{ lastPrice ?? '—' }}</span>
          <span class="text-sm font-semibold text-[var(--app-positive)]">
            {{ change ?? '—' }} {{ changePercentText }}%
            <span class="ml-1 text-xs font-normal text-[var(--app-text-muted)]">1 day</span>
          </span>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap gap-1 py-0.5">
          <button
            v-for="option in zoomOptions"
            :key="option.text"
            type="button"
            class="flex h-[44px] w-[44px] items-center justify-center rounded-md text-[13px] font-semibold transition md:h-[36px] md:w-[36px]"
            :class="selectedZoom === option.text
              ? 'bg-[var(--app-primary)] text-white'
              : 'bg-[var(--app-surface-muted)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface-hover)]'"
            :aria-pressed="selectedZoom === option.text"
            @click="setZoom(option)"
          >
            {{ option.text }}
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="flex gap-1">
            <button
              type="button"
              class="flex h-[44px] w-[44px] items-center justify-center rounded-md transition md:h-[36px] md:w-[36px]"
              :class="chartType === 'line'
                ? 'bg-[var(--app-primary)] text-white'
                : 'bg-[var(--app-surface-muted)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface-hover)]'"
              :aria-pressed="chartType === 'line'"
              title="Line Chart"
              @click="chartType = 'line'"
            >
              <ChartLine :size="20" />
            </button>
            <button
              type="button"
              class="flex h-[44px] w-[44px] items-center justify-center rounded-md transition md:h-[36px] md:w-[36px]"
              :class="chartType === 'candlestick'
                ? 'bg-[var(--app-primary)] text-white'
                : 'bg-[var(--app-surface-muted)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface-hover)]'"
              :aria-pressed="chartType === 'candlestick'"
              title="Candlestick Chart"
              @click="chartType = 'candlestick'"
            >
              <CandlestickChart :size="20" />
            </button>
          </div>

          <a
            class="inline-flex h-[44px] items-center gap-2 rounded-md bg-[var(--app-primary)] px-4 text-sm font-bold text-white transition hover:bg-[var(--app-primary-hover)]"
            :href="fullChartHref"
          >
            <Maximize2 :size="16" />
            <span>Full Chart</span>
          </a>
        </div>
      </div>

      <div class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] p-3">
        <div v-if="isLoading" class="flex items-center justify-center text-sm italic text-[var(--app-text-muted)]" :style="{ height: `${chartHeight}px` }">
          Loading chart data...
        </div>
        <div v-else-if="error" class="flex items-center justify-center rounded-md border border-[var(--app-negative)] bg-[var(--app-surface-muted)] p-3 text-sm text-[var(--app-negative)]" :style="{ height: `${chartHeight}px` }">
          {{ error }}
        </div>
        <div v-else-if="!seriesData.length" class="flex items-center justify-center text-sm italic text-[var(--app-text-muted)]" :style="{ height: `${chartHeight}px` }">
          No data available
        </div>
        <div v-else ref="chartEl" class="w-full overflow-hidden rounded-md" :style="{ height: `${chartHeight}px` }" />
      </div>
    </div>
  </section>
</template>

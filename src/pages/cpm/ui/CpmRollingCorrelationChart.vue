<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Highcharts from 'highcharts/highstock'
import {
  axisLabelStyle,
  axisTitleStyle,
  baseHighchartsChartOptions,
  chartNavigatorOptions,
  chartScrollbarOptions,
  cssVar,
  disabledSeriesStates,
  highchartsCrosshairOptions,
  indicatorChartTheme,
} from '@/pages/indicators/ui/indicatorHighcharts'

interface RollingCorrelationSeries {
  key: string
  name: string
  data: Array<[number, number]>
}

interface PriceSeries {
  name: string
  data: Array<[number, number]>
}

interface ValueAxisPlotBand {
  from: number
  to: number
  color: string
}

const props = withDefaults(
  defineProps<{
    series: RollingCorrelationSeries[]
    priceSeries?: PriceSeries | null
    secondaryPriceSeries?: PriceSeries | null
    selectedKey?: string
    valueAxisLabel?: string
    valueAxisMin?: number
    valueAxisMax?: number
    valueAxisPlotBands?: ValueAxisPlotBand[]
    loading?: boolean
    height?: number
    fill?: boolean
    showLegend?: boolean
  }>(),
  {
    selectedKey: '',
    valueAxisLabel: 'Correlation',
    loading: false,
    height: 360,
    fill: false,
    showLegend: true,
  },
)

const chartElement = ref<HTMLDivElement | null>(null)
const wrapperElement = ref<HTMLDivElement | null>(null)
const measuredHeight = ref(props.height)
let chart: Highcharts.Chart | null = null
let themeObserver: MutationObserver | null = null
let resizeObserver: ResizeObserver | null = null
let resizeFrame = 0

const hasPriceData = computed(() => Boolean(props.priceSeries?.data.length && props.priceSeries.data.length > 1))
const hasSecondaryPriceData = computed(() => Boolean(props.secondaryPriceSeries?.data.length && props.secondaryPriceSeries.data.length > 1))
const hasData = computed(() => hasPriceData.value || hasSecondaryPriceData.value || props.series.some((series) => series.data.length > 1))
const chartHeight = computed(() => {
  if (!props.fill) return props.height
  return measuredHeight.value > 0 ? measuredHeight.value : props.height
})

function destroyChart() {
  chart?.destroy()
  chart = null
}

function formatCorrelation(value: number) {
  return Highcharts.numberFormat(value, 2).replace(/\.?0+$/, '')
}

function formatPrice(value: number) {
  return Highcharts.numberFormat(value, 2).replace(/\.?0+$/, '')
}

function seriesColor(index: number) {
  const palette = [
    cssVar('--app-primary', '#006cff'),
    cssVar('--app-accent', '#7c3aed'),
    cssVar('--app-positive', '#047857'),
    cssVar('--app-negative', '#be123c'),
    cssVar('--app-text-subtle', '#506184'),
  ]
  return palette[index % palette.length]
}

function renderChart() {
  destroyChart()
  if (!chartElement.value || props.loading || !hasData.value) return

  const theme = indicatorChartTheme()
  const primarySeries = props.series.find((series) => series.key === props.selectedKey && series.data.length > 1)
    ?? props.series.find((series) => series.data.length > 1)
  const priceSeries = props.priceSeries?.data.length ? props.priceSeries : null
  const secondaryPriceSeries = props.secondaryPriceSeries?.data.length ? props.secondaryPriceSeries : null
  const hasPrice = Boolean(priceSeries?.data.length && priceSeries.data.length > 1)
  const hasSecondaryPrice = Boolean(secondaryPriceSeries?.data.length && secondaryPriceSeries.data.length > 1)
  const hasAnyPrice = hasPrice || hasSecondaryPrice
  const valueAxisIndex = hasAnyPrice ? (hasSecondaryPrice ? 2 : 1) : 0
  const valueAxisMin = props.valueAxisMin ?? (props.valueAxisLabel === 'Correlation' ? -1 : undefined)
  const valueAxisMax = props.valueAxisMax ?? (props.valueAxisLabel === 'Correlation' ? 1 : undefined)
  const topControlsHeight = 36
  const bottomNavigatorReserve = 94
  const mainPaneHeight = Math.max(240, chartHeight.value - topControlsHeight - bottomNavigatorReserve)
  const priceAxisHeight = Math.round(mainPaneHeight * 0.42)
  const valueAxisTop = topControlsHeight + priceAxisHeight
  const valueAxisHeight = mainPaneHeight - priceAxisHeight
  const valueAxisPlotLines: Highcharts.YAxisPlotLinesOptions[] = [
    {
      color: theme.border,
      value: 0,
      width: 1,
      zIndex: 3,
    },
  ]
  if (props.valueAxisLabel === 'Beta') {
    valueAxisPlotLines.push({
      color: theme.primary,
      value: 1,
      width: 1,
      dashStyle: 'Dash',
      zIndex: 3,
    })
  }
  const valueAxisPlotBands = props.valueAxisPlotBands?.map((band) => ({
    from: band.from,
    to: band.to,
    color: band.color,
  })) ?? []
  const navigatorData = priceSeries?.data ?? secondaryPriceSeries?.data ?? primarySeries?.data ?? []
  const yAxisOptions: Highcharts.YAxisOptions | Highcharts.YAxisOptions[] = hasAnyPrice
    ? [
        {
          title: {
            text: priceSeries?.name ?? secondaryPriceSeries?.name ?? 'Price',
            style: axisTitleStyle(theme),
          },
          top: topControlsHeight,
          height: priceAxisHeight,
          opposite: false,
          offset: 0,
          gridLineColor: theme.grid,
          gridLineDashStyle: 'Dash',
          labels: {
            formatter() {
              return formatPrice(Number(this.value))
            },
            style: axisLabelStyle(theme),
          },
        },
        ...(hasSecondaryPrice && secondaryPriceSeries
          ? [
              {
                title: {
                  text: secondaryPriceSeries.name,
                  style: axisTitleStyle(theme),
                },
                top: topControlsHeight,
                height: priceAxisHeight,
                opposite: true,
                offset: 0,
                gridLineWidth: 0,
                labels: {
                  formatter() {
                    return formatPrice(Number(this.value))
                  },
                  style: axisLabelStyle(theme),
                },
              } as Highcharts.YAxisOptions,
            ]
          : []),
        {
          title: {
            text: props.valueAxisLabel,
            style: axisTitleStyle(theme),
          },
          top: valueAxisTop,
          height: valueAxisHeight,
          min: valueAxisMin,
          max: valueAxisMax,
          offset: 0,
          gridLineColor: theme.grid,
          gridLineDashStyle: 'Dash',
          labels: {
            formatter() {
              return formatCorrelation(Number(this.value))
            },
            style: axisLabelStyle(theme),
          },
          plotBands: valueAxisPlotBands,
          plotLines: valueAxisPlotLines,
        },
      ]
    : {
        title: {
          text: props.valueAxisLabel,
          style: axisTitleStyle(theme),
        },
        top: topControlsHeight,
        height: mainPaneHeight,
        min: valueAxisMin,
        max: valueAxisMax,
        gridLineColor: theme.grid,
        gridLineDashStyle: 'Dash',
        labels: {
          formatter() {
            return formatCorrelation(Number(this.value))
          },
          style: axisLabelStyle(theme),
        },
        plotBands: valueAxisPlotBands,
        plotLines: valueAxisPlotLines,
      }
  const chartSeries: Highcharts.SeriesOptionsType[] = [
    ...(hasPrice && priceSeries
      ? [{
          type: 'line',
          name: priceSeries.name,
          data: priceSeries.data,
          yAxis: 0,
          color: theme.text,
          lineWidth: 1.7,
          marker: {
            enabled: false,
          },
          showInNavigator: true,
        } as Highcharts.SeriesLineOptions]
      : []),
    ...(hasSecondaryPrice && secondaryPriceSeries
      ? [{
          type: 'line',
          name: secondaryPriceSeries.name,
          data: secondaryPriceSeries.data,
          yAxis: 1,
          color: cssVar('--app-negative', '#ef4444'),
          lineWidth: 1.7,
          marker: {
            enabled: false,
          },
          showInNavigator: false,
        } as Highcharts.SeriesLineOptions]
      : []),
    ...props.series
      .filter((series) => series.data.length > 1)
      .map((series, index) => {
        const selected = !props.selectedKey || series.key === props.selectedKey
        return {
          type: 'line',
          name: series.name,
          data: series.data,
          yAxis: valueAxisIndex,
          color: seriesColor(index),
          lineWidth: selected ? 2.4 : 1.4,
          opacity: selected ? 1 : 0.38,
        } as Highcharts.SeriesLineOptions
      }),
  ]

  chart = Highcharts.stockChart(chartElement.value, {
    chart: {
      ...baseHighchartsChartOptions(theme),
      height: chartHeight.value,
      spacingLeft: 0,
      spacingRight: 0,
      spacingTop: 2,
      spacingBottom: 2,
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
    rangeSelector: {
      selected: 4,
      inputEnabled: false,
      buttonTheme: {
        fill: theme.surfaceMuted,
        stroke: theme.border,
        r: 4,
        style: {
          color: theme.textSecondary,
          fontWeight: '700',
        },
        states: {
          hover: {
            fill: theme.surfaceSoft,
            style: {
              color: theme.primary,
            },
          },
          select: {
            fill: theme.primary,
            style: {
              color: '#ffffff',
            },
          },
        },
      },
      buttons: [
        { type: 'month', count: 3, text: '3m' },
        { type: 'month', count: 6, text: '6m' },
        { type: 'ytd', text: 'YTD' },
        { type: 'year', count: 1, text: '1y' },
        { type: 'year', count: 3, text: '3y' },
        { type: 'year', count: 5, text: '5y' },
        { type: 'all', text: 'All' },
      ],
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
    navigator: chartNavigatorOptions(theme, navigatorData),
    scrollbar: chartScrollbarOptions(theme),
    xAxis: {
      type: 'datetime',
      gridLineColor: theme.grid,
      lineColor: theme.border,
      tickColor: theme.border,
      crosshair: highchartsCrosshairOptions(),
      labels: {
        style: axisLabelStyle(theme),
      },
    },
    yAxis: yAxisOptions,
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
        const rows = (this.points ?? [])
          .filter((point) => point.y !== undefined)
          .map((point) => {
            const color = point.color || point.series.color
            const isPricePoint = (hasPrice && point.series.name === priceSeries?.name)
              || (hasSecondaryPrice && point.series.name === secondaryPriceSeries?.name)
            const formatted = isPricePoint ? formatPrice(Number(point.y)) : formatCorrelation(Number(point.y))
            return `<br/><span style="color:${color}">\u25CF</span> ${point.series.name}: <b>${formatted}</b>`
          })
          .join('')
        return `<b>${Highcharts.dateFormat('%b %e, %Y', Number(this.x))}</b>${rows}`
      },
    },
    plotOptions: {
      series: {
        animation: false,
        states: disabledSeriesStates(),
      },
      line: {
        marker: {
          enabled: false,
          radius: 2,
        },
      },
    },
    series: chartSeries,
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

function measureWrapper() {
  if (!wrapperElement.value) return
  const rect = wrapperElement.value.getBoundingClientRect()
  if (rect.height > 0) measuredHeight.value = Math.round(rect.height)
}

function scheduleResize() {
  if (resizeFrame) return
  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = 0
    measureWrapper()
  })
}

function observeResize() {
  if (typeof ResizeObserver === 'undefined' || typeof window === 'undefined') return
  resizeObserver?.disconnect()
  resizeObserver = null
  if (!props.fill) return
  measureWrapper()
  resizeObserver = new ResizeObserver(scheduleResize)
  if (wrapperElement.value) resizeObserver.observe(wrapperElement.value)
}

watch(
  () => [
    props.series,
    props.priceSeries,
    props.secondaryPriceSeries,
    props.selectedKey,
    props.valueAxisLabel,
    props.valueAxisMin,
    props.valueAxisMax,
    props.valueAxisPlotBands,
    props.loading,
    chartHeight.value,
  ],
  () => {
    void nextTick(renderChart)
  },
  { deep: true },
)

onMounted(() => {
  observeThemeChanges()
  observeResize()
  void nextTick(renderChart)
})

onBeforeUnmount(() => {
  if (resizeFrame) cancelAnimationFrame(resizeFrame)
  resizeObserver?.disconnect()
  themeObserver?.disconnect()
  destroyChart()
})
</script>

<template>
  <div
    ref="wrapperElement"
    class="cpm-rolling-correlation-chart"
    :class="{ 'cpm-rolling-correlation-chart--fill': props.fill }"
    :style="props.fill ? undefined : { minHeight: `${chartHeight}px` }"
  >
    <div v-if="loading" class="cpm-rolling-correlation-chart__empty" :style="{ minHeight: `${chartHeight}px` }">
      Loading rolling history...
    </div>
    <div v-else-if="!hasData" class="cpm-rolling-correlation-chart__empty" :style="{ minHeight: `${chartHeight}px` }">
      No rolling history data
    </div>
    <div
      v-show="!loading && hasData"
      ref="chartElement"
      class="cpm-rolling-correlation-chart__canvas"
      :style="{ minHeight: `${chartHeight}px` }"
    />
  </div>
</template>

<style scoped>
.cpm-rolling-correlation-chart {
  width: 100%;
}

.cpm-rolling-correlation-chart--fill {
  height: 100%;
}

.cpm-rolling-correlation-chart--fill .cpm-rolling-correlation-chart__canvas,
.cpm-rolling-correlation-chart--fill .cpm-rolling-correlation-chart__empty {
  height: 100%;
}

.cpm-rolling-correlation-chart__canvas {
  width: 100%;
}

.cpm-rolling-correlation-chart__empty {
  display: flex;
  min-height: 100%;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--app-border-strong);
  border-radius: 6px;
  background: var(--app-surface);
  color: var(--app-text-muted);
  font-size: 0.875rem;
}
</style>

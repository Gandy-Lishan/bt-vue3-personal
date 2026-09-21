<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Highcharts from 'highcharts/highstock'
import type {
  IndicatorDetail,
  IndicatorSeasonalityChartData,
  IndicatorSeasonalityPoint,
} from '@/entities/indicator/model/indicator.types'
import {
  axisLabelStyle,
  axisTitleStyle,
  baseHighchartsChartOptions,
  disabledSeriesStates,
  indicatorChartTheme,
  monthLabels,
} from './indicatorHighcharts'

const props = defineProps<{
  detail: IndicatorDetail
  data: IndicatorSeasonalityChartData
}>()

const lineElement = ref<HTMLDivElement | null>(null)
const barElement = ref<HTMLDivElement | null>(null)

let lineChart: Highcharts.Chart | null = null
let barChart: Highcharts.Chart | null = null
let themeObserver: MutationObserver | null = null

const hasRenderableData = computed(() => props.data.day_of_year.length > 0 || props.data.month.length > 0)

function numericValue(value: unknown) {
  if (value === undefined || value === null || value === '' || typeof value === 'boolean') return null
  const numeric = Number(String(value).replace('%', ''))
  return Number.isFinite(numeric) ? numeric : null
}

function firstNumericValue(row: IndicatorSeasonalityPoint, keys: string[]) {
  for (const key of keys) {
    const value = numericValue(row[key])
    if (value !== null) return value
  }
  return null
}

function dayOfYearData() {
  return props.data.day_of_year
    .map((row, index): [number, number] | null => {
      const y = firstNumericValue(row, ['AvgReturn', 'avg_return', 'return'])
      if (y === null) return null

      const day = firstNumericValue(row, ['day', 'Day', 'trading_day', 'TradingDay'])
      return [day ?? index + 1, y]
    })
    .filter((point): point is [number, number] => point !== null)
}

function currentDayOfYearData() {
  return props.data.current_day_of_year
    .map((row, index): [number, number] | null => {
      const y = firstNumericValue(row, ['balance', 'Balance', 'AvgReturn', 'avg_return'])
      if (y === null) return null

      const day = firstNumericValue(row, ['day', 'Day', 'trading_day', 'TradingDay'])
      return [day ?? index + 1, y]
    })
    .filter((point): point is [number, number] => point !== null)
}

function monthIndex(row: IndicatorSeasonalityPoint, fallbackIndex: number) {
  const month = firstNumericValue(row, ['month', 'Month', 'month_of_year', 'MonthOfYear', 'symbol'])
  if (month !== null && month >= 1 && month <= 12) return Math.round(month)
  return fallbackIndex + 1
}

function monthData() {
  return props.data.month
    .map((row, index) => {
      const y = firstNumericValue(row, ['AvgReturn', 'avg_return', 'return'])
      if (y === null) return null

      return {
        name: monthLabels[monthIndex(row, index) - 1] ?? monthLabels[index] ?? String(index + 1),
        y,
      }
    })
    .filter((point): point is { name: string; y: number } => point !== null)
}

function currentTradingDay(data: Array<[number, number]>) {
  if (!data.length) return null
  return Math.max(...data.map((point) => point[0]))
}

function destroyCharts() {
  lineChart?.destroy()
  barChart?.destroy()
  lineChart = null
  barChart = null
}

function renderCharts() {
  destroyCharts()
  if (!lineElement.value || !barElement.value || !hasRenderableData.value) return

  const theme = indicatorChartTheme()
  const averageData = dayOfYearData()
  const currentData = currentDayOfYearData()
  const monthlyData = monthData()
  const currentDay = currentTradingDay(currentData)
  const positiveBar = '#5abe7b'
  const negativeBar = '#da8a8a'

  lineChart = Highcharts.chart(lineElement.value, {
    chart: {
      ...baseHighchartsChartOptions(theme),
      height: 420,
      spacingLeft: 8,
      spacingRight: 56,
      spacingTop: 0,
      spacingBottom: 0,
      zooming: {
        type: 'x',
      },
    },
    // Rendered in the template instead: Highcharts reserves vertical space for a title
    // regardless of its size, and its type scale cannot follow the page.
    title: { text: '', margin: 0 },
    credits: {
      enabled: true,
      text: 'SENTIMENTRADER',
      href: 'https://sentimentrader.com',
      position: {
        align: 'right',
        x: -40,
        y: -62,
      },
      style: {
        color: theme.textMuted,
        fontSize: '9px',
      },
    },
    accessibility: {
      enabled: false,
    },
    legend: {
      enabled: true,
      align: 'center',
      verticalAlign: 'top',
      y: 6,
      itemDistance: 28,
      itemStyle: {
        color: theme.text,
        fontSize: '11px',
        fontWeight: '700',
      },
      itemHiddenStyle: {
        color: theme.textMuted,
      },
      itemHoverStyle: {
        color: theme.primary,
      },
    },
    xAxis: {
      type: 'linear',
      min: 0,
      tickInterval: 10,
      tickWidth: 0,
      lineColor: theme.border,
      labels: {
        style: axisLabelStyle(theme, '10px'),
      },
      plotLines:
        currentDay === null
          ? []
          : [
              {
                color: theme.positive,
                width: 1,
                value: currentDay,
                zIndex: 5,
              },
            ],
    },
    yAxis: {
      title: {
        text: 'Cumulative Return (%)',
        style: axisTitleStyle(theme, '10px'),
      },
      labels: {
        formatter(this: Highcharts.AxisLabelsFormatterContextObject) {
          return Highcharts.numberFormat(Number(this.value), 1)
        },
        style: axisLabelStyle(theme, '10px'),
      },
      plotLines: [
        {
          color: theme.border,
          width: 1,
          value: 0,
        },
      ],
      gridLineWidth: 0,
      tickPixelInterval: 37,
    },
    tooltip: {
      shared: true,
      crosshairs: true,
      valueDecimals: 2,
      backgroundColor: theme.tooltipBg,
      borderColor: theme.border,
      borderRadius: 8,
      style: {
        color: theme.textSecondary,
        fontSize: '12px',
      },
      headerFormat: '<span style="font-size: 10px">Day {point.key}</span><br/>',
    },
    exporting: {
      enabled: true,
      buttons: {
        contextButton: {
          menuItems: ['printChart', 'downloadPNG', 'downloadJPEG', 'downloadPDF'],
        },
      },
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
        id: 'seasonality-line-average',
        name: 'Average of All Years',
        color: theme.primary,
        lineWidth: 2,
        marker: {
          enabled: false,
        },
        data: averageData,
      },
      {
        type: 'line',
        id: 'seasonality-line-current',
        name: 'Current Year Performance',
        color: theme.textMuted,
        lineWidth: 2,
        marker: {
          enabled: false,
        },
        visible: false,
        data: currentData,
      },
    ] as Highcharts.SeriesOptionsType[],
  } as Highcharts.Options)

  barChart = Highcharts.chart(barElement.value, {
    chart: {
      ...baseHighchartsChartOptions(theme),
      height: 260,
      spacingLeft: 8,
      spacingRight: 56,
      spacingTop: 0,
      spacingBottom: 8,
    },
    title: { text: '', margin: 0 },
    credits: {
      enabled: true,
      text: 'SENTIMENTRADER',
      href: 'https://sentimentrader.com',
      position: {
        align: 'right',
        x: -40,
        y: -40,
      },
      style: {
        color: theme.textMuted,
        fontSize: '9px',
      },
    },
    accessibility: {
      enabled: false,
    },
    legend: {
      enabled: false,
    },
    xAxis: {
      categories: monthLabels,
      tickWidth: 0,
      lineWidth: 0,
      gridLineWidth: 0,
      gridLineColor: theme.border,
      gridLineDashStyle: 'Dash',
      labels: {
        style: axisLabelStyle(theme, '10px'),
      },
    },
    yAxis: {
      title: {
        text: 'Average Return',
        style: axisTitleStyle(theme, '10px'),
      },
      labels: {
        format: '{value:.1f}%',
        style: axisLabelStyle(theme, '10px'),
      },
      plotLines: [
        {
          color: theme.border,
          width: 1,
          value: 0,
        },
      ],
      gridLineWidth: 0,
      tickPixelInterval: 37,
    },
    tooltip: {
      valueDecimals: 3,
      valueSuffix: '%',
      backgroundColor: theme.tooltipBg,
      borderColor: theme.border,
      borderRadius: 8,
      style: {
        color: theme.textSecondary,
        fontSize: '12px',
      },
    },
    exporting: {
      enabled: true,
      buttons: {
        contextButton: {
          menuItems: ['printChart', 'downloadPNG', 'downloadJPEG', 'downloadPDF'],
        },
      },
    },
    plotOptions: {
      series: {
        animation: false,
        dataGrouping: {
          enabled: false,
        },
        states: disabledSeriesStates(),
      },
      column: {
        borderWidth: 0,
        colorByPoint: true,
      },
    } as Highcharts.PlotOptions,
    series: [
      {
        type: 'column',
        id: 'seasonality-column-month',
        name: 'Average Return',
        data: monthlyData.map((point) => ({
          name: point.name,
          y: point.y,
          color: point.y >= 0 ? positiveBar : negativeBar,
        })),
      },
    ] as Highcharts.SeriesOptionsType[],
  } as Highcharts.Options)
}

function observeThemeChanges() {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return

  themeObserver?.disconnect()
  themeObserver = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.attributeName === 'data-theme')) {
      void nextTick(renderCharts)
    }
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
}

watch(
  () => [props.detail.id, props.data],
  () => {
    void nextTick(renderCharts)
  },
  { deep: true },
)

onMounted(() => {
  observeThemeChanges()
  void nextTick(renderCharts)
})

onBeforeUnmount(() => {
  themeObserver?.disconnect()
  themeObserver = null
  destroyCharts()
})
</script>

<template>
  <div class="seasonality-chart-stack">
    <div v-if="!hasRenderableData" class="flex h-[690px] items-center justify-center text-sm text-[var(--app-text-muted)]">
      No chart data
    </div>
    <template v-else>
      <section>
        <h4 class="seasonality-chart-title">Trading Day Of The Year</h4>
        <div ref="lineElement" class="seasonality-line-chart" />
      </section>
      <section>
        <h4 class="seasonality-chart-title">Month Of The Year</h4>
        <div ref="barElement" class="seasonality-bar-chart" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.seasonality-chart-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 16px 8px;
}

.seasonality-chart-title {
  margin-bottom: 10px;
  color: var(--app-text);
  font-size: 0.9375rem;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
}

/* Must match the `chart.height` passed to Highcharts. */
.seasonality-line-chart,
.seasonality-bar-chart {
  width: 100%;
}

.seasonality-line-chart {
  height: 420px;
}

.seasonality-bar-chart {
  height: 260px;
}
</style>

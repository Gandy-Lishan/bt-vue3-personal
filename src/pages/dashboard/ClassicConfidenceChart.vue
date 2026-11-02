<script setup lang="ts">
import Highcharts from 'highcharts/highstock'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  axisLabelStyle,
  axisTitleStyle,
  baseHighchartsChartOptions,
  chartFontSize,
  chartSize,
  disabledSeriesStates,
  highchartsCrosshairOptions,
  indicatorChartTheme,
} from '@/pages/indicators/ui/indicatorHighcharts'

const props = defineProps<{ rows: unknown[]; range: string; smartLast?: number | null; dumbLast?: number | null }>()
const frame = ref<HTMLElement | null>(null)
const container = ref<HTMLElement | null>(null)
let chart: Highcharts.Chart | null = null
let themeObserver: MutationObserver | null = null
let layoutObserver: ResizeObserver | null = null

const normalized = computed(() => props.rows.flatMap((raw) => {
  if (!Array.isArray(raw) || raw.length < 4) return []
  const numericTime = Number(raw[0])
  const time = Number.isFinite(numericTime)
    ? numericTime > 1_000_000_000_000 ? numericTime : numericTime * 1000
    : Date.parse(String(raw[0]))
  const smart = Number(raw[1]); const spx = Number(raw[2]); const dumb = Number(raw[3])
  return Number.isFinite(time) && Number.isFinite(smart) && Number.isFinite(spx) && Number.isFinite(dumb)
    ? [{ time, smart, spx, dumb }]
    : []
}))

const visible = computed(() => {
  if (props.range === 'All' || !normalized.value.length) return normalized.value
  const years = Number.parseInt(props.range, 10)
  if (!Number.isFinite(years)) return normalized.value
  const latest = normalized.value.at(-1)!.time
  return normalized.value.filter(row => row.time >= latest - years * 365.25 * 86_400_000)
})

const smartLastLabel = computed(() => props.smartLast == null ? 'Smart Money' : `Smart Money (Last = ${props.smartLast.toFixed(2)})`)
const dumbLastLabel = computed(() => props.dumbLast == null ? 'Dumb Money' : `Dumb Money (Last = ${props.dumbLast.toFixed(2)})`)

function render() {
  if (!container.value) return
  const theme = indicatorChartTheme()
  chart?.destroy()
  chart = Highcharts.stockChart(container.value, {
    time: { timezone: 'UTC' },
    chart: {
      ...baseHighchartsChartOptions(theme),
      height: Math.max(320, frame.value?.clientHeight ?? container.value.clientHeight),
      spacingLeft: chartSize(8),
      spacingRight: chartSize(48),
      spacingTop: chartSize(14),
      spacingBottom: chartSize(14),
      zooming: { type: 'x' },
    },
    credits: { enabled: false },
    accessibility: { enabled: false },
    title: { text: undefined },
    exporting: { enabled: false },
    rangeSelector: { enabled: false },
    navigator: { enabled: false },
    scrollbar: { enabled: false },
    legend: {
      enabled: true,
      align: 'center',
      verticalAlign: 'top',
      layout: 'horizontal',
      itemDistance: chartSize(26),
      margin: chartSize(18),
      symbolWidth: chartSize(34),
      itemStyle: { color: theme.textSecondary, fontSize: chartFontSize(11), fontWeight: '600' },
      itemHoverStyle: { color: theme.primary },
    },
    xAxis: {
      type: 'datetime',
      ordinal: false,
      gridLineWidth: 0,
      gridLineColor: theme.grid,
      gridLineDashStyle: 'Dot',
      lineColor: theme.border,
      tickColor: theme.border,
      tickPixelInterval: chartSize(150),
      labels: { format: "{value:%b '%y}", style: axisLabelStyle(theme, chartFontSize(11)) },
      crosshair: highchartsCrosshairOptions(),
    },
    yAxis: [{
      title: { text: 'SPX', style: axisTitleStyle(theme, chartFontSize(10)), x: chartSize(36) },
      labels: { x: chartSize(25), style: axisLabelStyle(theme, chartFontSize(10)) },
      gridLineWidth: 1,
      gridLineColor: theme.grid,
      gridLineDashStyle: 'Dot',
      lineWidth: 0,
      minPadding: 0.1,
      maxPadding: 0.1,
      tickPixelInterval: chartSize(46),
      top: '0%',
      height: '37%',
      offset: 0,
      opposite: true,
    }, {
      title: {
        text: [
          { label: smartLastLabel.value, color: theme.primary },
          { label: dumbLastLabel.value, color: theme.negative },
        ].map(({ label, color }) => `<span style="color:${color}">${label}</span>`).join('<br/>'),
        useHTML: true,
        style: axisTitleStyle(theme, chartFontSize(11)),
        x: chartSize(32),
      },
      labels: { x: chartSize(25), style: axisLabelStyle(theme, chartFontSize(10)) },
      min: 0,
      max: 1,
      tickInterval: .2,
      opposite: true,
      gridLineWidth: 1,
      gridLineColor: theme.grid,
      gridLineDashStyle: 'Dot',
      lineWidth: 0,
      top: '40%',
      height: '60%',
      offset: 0,
      plotLines: [
        { value: .3, color: theme.textMuted, dashStyle: 'ShortDash', width: 1 },
        { value: .7, color: theme.textMuted, dashStyle: 'ShortDash', width: 1 },
      ],
    }],
    tooltip: {
      shared: true,
      useHTML: true,
      backgroundColor: theme.tooltipBg,
      borderColor: theme.border,
      borderRadius: chartSize(8),
      padding: chartSize(8),
      shadow: true,
      style: { color: theme.textSecondary, fontSize: chartFontSize(12) },
      formatter(this: { x?: number; points?: Highcharts.Point[] }) {
        const rows = (this.points ?? []).filter(point => point.y !== undefined && point.series.visible).map((point) => {
          const value = typeof point.y === 'number' ? point.y.toFixed(2) : point.y
          return `<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:12px;margin-top:6px;"><span style="display:flex;align-items:center;min-width:0;"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${point.color};margin-right:7px;flex:0 0 auto;"></span><span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${point.series.name}</span></span><b>${value}</b></div>`
        }).join('')
        return `<div style="width:220px;max-width:220px;"><b>${Highcharts.dateFormat('%b %e, %Y', Number(this.x))}</b>${rows}</div>`
      },
    },
    plotOptions: {
      series: {
        animation: false,
        turboThreshold: 0,
        connectNulls: false,
        marker: { enabled: false },
        lineWidth: 2,
        states: disabledSeriesStates(),
        dataGrouping: { enabled: true },
      },
    },
    series: [
      { type: 'line', name: 'SPX', color: theme.marketLine, yAxis: 0, data: visible.value.map(row => [row.time, row.spx]) },
      { type: 'line', name: smartLastLabel.value, color: theme.primary, yAxis: 1, data: visible.value.map(row => [row.time, row.smart]) },
      { type: 'line', name: dumbLastLabel.value, color: theme.negative, yAxis: 1, data: visible.value.map(row => [row.time, row.dumb]) },
    ],
  } as Highcharts.Options)
}

watch(() => [props.rows, props.range, props.smartLast, props.dumbLast], () => void nextTick(render), { deep: true })
onMounted(() => {
  render()
  themeObserver = new MutationObserver(render)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  layoutObserver = new ResizeObserver(([entry]) => {
    const height = Math.max(320, Math.round(entry?.contentRect.height ?? 0))
    if (chart && chart.chartHeight !== height) chart.setSize(undefined, height, false)
  })
  if (frame.value) layoutObserver.observe(frame.value)
})
onBeforeUnmount(() => { themeObserver?.disconnect(); layoutObserver?.disconnect(); chart?.destroy() })
</script>

<template><div ref="frame" class="confidence-highchart"><div ref="container" class="confidence-highchart-canvas"/></div></template>

<style scoped>.confidence-highchart{width:100%;height:100%;min-height:320px;padding:.3rem .2rem;box-sizing:border-box}.confidence-highchart-canvas{width:100%;height:100%}</style>

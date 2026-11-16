<script setup lang="ts">
import Highcharts from 'highcharts/highstock'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { axisLabelStyle, baseHighchartsChartOptions, indicatorChartTheme } from '@/pages/indicators/ui/indicatorHighcharts'

const props = withDefaults(defineProps<{ data: unknown; name: string; height?: number; range?: string; showLastLine?: boolean }>(), {
  height: 92,
  range: 'mini',
  showLastLine: false,
})
const container = ref<HTMLElement | null>(null)
let chart: Highcharts.Chart | null = null
let resizeObserver: ResizeObserver | null = null
let themeObserver: MutationObserver | null = null

function list(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try { const parsed: unknown = JSON.parse(raw); return Array.isArray(parsed) ? parsed : [] } catch { return [] }
  }
  return []
}

function timestamp(raw: unknown, index: number) {
  const numeric = Number(raw)
  if (Number.isFinite(numeric)) return numeric > 1_000_000_000_000 ? numeric : numeric > 1_000_000_000 ? numeric * 1000 : index
  const parsed = Date.parse(String(raw ?? ''))
  return Number.isFinite(parsed) ? parsed : index
}

const allPoints = computed<[number, number][]>(() => list(props.data).flatMap((raw, index): [number, number][] => {
  if (Array.isArray(raw)) {
    const y = raw.slice(1).map(Number).find(Number.isFinite)
    return y === undefined ? [] : [[timestamp(raw[0], index), y]]
  }
  if (!raw || typeof raw !== 'object') return []
  const row = raw as Record<string, unknown>
  const y = Number(row.value ?? row.close ?? row.y ?? row.latest_value)
  return Number.isFinite(y) ? [[timestamp(row.date ?? row.time ?? row.x, index), y]] : []
}))

const points = computed<[number, number][]>(() => {
  const rows = allPoints.value
  if (props.range === 'mini') return rows.slice(-90)
  if (!rows.length) return []
  const hasDates = rows.some(point => point[0] > 1_000_000_000_000)
  if (!hasDates) {
    const counts: Record<string, number> = { '3m': 63, '6m': 126, YTD: 252, '1y': 252, '3y': 756, '5y': 1260 }
    return rows.slice(-(counts[props.range] ?? rows.length))
  }
  const latest = new Date(rows.at(-1)![0])
  const cutoff = new Date(latest)
  if (props.range === 'YTD') cutoff.setUTCMonth(0, 1)
  else {
    const months: Record<string, number> = { '3m': 3, '6m': 6, '1y': 12, '3y': 36, '5y': 60 }
    cutoff.setUTCMonth(cutoff.getUTCMonth() - (months[props.range] ?? 3))
  }
  return rows.filter(point => point[0] >= cutoff.getTime())
})

function render() {
  if (!container.value) return
  const theme = indicatorChartTheme()
  const lastValue = points.value.at(-1)?.[1]
  chart?.destroy()
  chart = Highcharts.chart(container.value, {
    chart: { ...baseHighchartsChartOptions(theme), height: props.height, margin: props.height > 120 ? [14, 14, 36, 28] : [6, 5, 18, 34], spacing: [0, 0, 0, 0] },
    credits: { enabled: false },
    accessibility: { enabled: false },
    exporting: { enabled: false },
    title: { text: undefined },
    legend: { enabled: false },
    xAxis: {
      type: points.value.some(point => point[0] > 1_000_000_000_000) ? 'datetime' : 'linear',
      lineColor: theme.border,
      tickColor: theme.border,
      tickLength: 3,
      tickAmount: 3,
      labels: { style: axisLabelStyle(theme, '8px'), formatter() { return this.axis.options.type === 'datetime' ? Highcharts.dateFormat('%b', Number(this.value)) : String(this.value) } },
    },
    yAxis: {
      title: { text: undefined },
      gridLineColor: theme.grid,
      gridLineDashStyle: 'Dot',
      tickAmount: 3,
      labels: { style: axisLabelStyle(theme, '8px'), x: -3 },
      plotLines: props.showLastLine && lastValue !== undefined ? [{
        value: lastValue,
        color: theme.textMuted,
        dashStyle: 'Dash',
        width: 1.5,
        zIndex: 4,
        label: {
          text: Highcharts.numberFormat(lastValue, 2),
          align: 'left',
          x: -25,
          y: 3,
          style: { ...axisLabelStyle(theme, '8px'), fontWeight: '400' },
        },
      }] : [],
    },
    tooltip: {
      shared: true,
      backgroundColor: theme.tooltipBg,
      borderColor: theme.border,
      style: { color: theme.text, fontSize: '10px' },
      formatter(this: { x?: number; y?: number; points?: Highcharts.Point[] }) {
        const point = this.points?.[0]
        const x = Number(this.x)
        const heading = x > 1_000_000_000_000 ? Highcharts.dateFormat('%b %e, %Y', x) : props.name
        return `<b>${heading}</b><br/>${props.name}: <b>${Highcharts.numberFormat(Number(point?.y ?? this.y), 2)}</b>`
      },
    },
    plotOptions: { series: { animation: false, marker: { enabled: false }, states: { hover: { lineWidthPlus: 1 }, inactive: { opacity: 1 } } } },
    series: [{ type: 'line', name: props.name, data: points.value, color: theme.primary, lineWidth: 1.7 }],
  } as Highcharts.Options)
}

onMounted(() => {
  nextTick(render)
  resizeObserver = new ResizeObserver(() => chart?.reflow())
  if (container.value) resizeObserver.observe(container.value)
  themeObserver = new MutationObserver(render)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] })
})
watch(() => [props.data, props.name, props.height, props.range, props.showLastLine], () => nextTick(render), { deep: true })
onBeforeUnmount(() => { resizeObserver?.disconnect(); themeObserver?.disconnect(); chart?.destroy() })
</script>

<template><div ref="container" class="chart-summary-highchart" :style="{ height: `${props.height}px` }"/></template>

<style scoped>
.chart-summary-highchart{width:100%;height:92px;min-width:0}
</style>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Highcharts from 'highcharts'
import { useTheme } from '@/shared/theme/theme'
import { endLabel, endMarker } from './researchChart'
import type { IntradayItem } from './intraday.data'
import { intradayDates } from './intraday.data'

const props = defineProps<{ item: IntradayItem; period: number; height?: number }>()
const root = ref<HTMLElement | null>(null)
let chart: Highcharts.Chart | null = null
let observer: ResizeObserver | null = null
const css = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
function render() {
  if (!root.value) return
  chart?.destroy()
  const values = props.item.values.slice(-props.period)
  const dates = intradayDates.slice(-props.period)
  const primary = css('--app-primary', '#1672ed'), positive = css('--app-positive', '#57aa8c'), negative = css('--app-negative', '#d98498'), muted = css('--app-text-muted', '#6b7280'), border = css('--app-border', '#d8dee8'), grid = css('--chart-grid', '#e5e7eb'), surface = css('--app-surface', '#fff'), text = css('--app-text', '#111111')
  const time = (date: string) => Date.parse(`${date.replace(' ', 'T')}:00Z`)
  const data = values.map((value, index) => index === values.length - 1 ? { x: time(dates[index]), y: value, marker: endMarker(primary, surface), dataLabels: endLabel(`{y:,.${props.item.decimals}f}`, primary) } : [time(dates[index]), value])
  const thresholds = props.item.min === 0 && props.item.max === 100 ? [30, 70] : props.item.zeroBaseline ? [0] : props.item.unit === 'x' ? [1] : []
  chart = Highcharts.chart(root.value, {
    chart: { backgroundColor: 'transparent', height: props.height ?? 155, spacing: [8, 40, 4, 4], animation: false },
    title: { text: undefined }, credits: { enabled: false }, legend: { enabled: false }, accessibility: { enabled: false },
    xAxis: { type: 'datetime', lineColor: border, tickColor: border, tickAmount: 3, labels: { format: '{value:%b %e}', style: { color: muted, fontSize: '9px' } }, crosshair: true },
    yAxis: { title: { text: undefined }, min: props.item.min, max: props.item.max, opposite: true, gridLineColor: grid, labels: { x: 6, align: 'left', style: { color: muted, fontSize: '9px' } }, plotBands: props.item.min === 0 && props.item.max === 100 ? [{ from: 0, to: 30, color: 'rgba(87,170,140,.08)' }, { from: 70, to: 100, color: 'rgba(217,132,152,.08)' }] : undefined, plotLines: thresholds.map((value) => ({ value, width: 1, color: value === 30 ? positive : value === 70 ? negative : muted, dashStyle: 'Dash' as const, label: { text: String(value), align: 'right' as const, x: -4, style: { color: muted, fontSize: '9px' } } })) },
    tooltip: { valueDecimals: props.item.decimals, backgroundColor: surface, borderColor: border, style: { color: text } },
    plotOptions: { series: { animation: false, marker: { enabled: false }, states: { inactive: { opacity: 1 } } } },
    series: [{ type: 'line', name: props.item.name, data, color: primary, lineWidth: 2 }],
  })
}
watch(() => [props.period, props.item.values, props.height], () => nextTick(render), { deep: true })
const { isDarkTheme } = useTheme()
watch(isDarkTheme, () => nextTick(render))
onMounted(() => { render(); if (typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(() => chart?.reflow()); if (root.value) observer.observe(root.value) } })
onBeforeUnmount(() => { observer?.disconnect(); chart?.destroy() })
</script>
<template><div ref="root" class="w-full min-w-0" :style="{ height: `${height ?? 155}px` }" /></template>

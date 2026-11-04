<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Highcharts from 'highcharts'
import { useTheme } from '@/shared/theme/theme'
import { endLabel, endMarker } from './researchChart'
const props = defineProps<{ name: string; values: number[]; dates: string[]; period: number; min: number; max: number; decimals: number; kind: string; height?: number }>()
const root = ref<HTMLElement | null>(null)
let chart: Highcharts.Chart | null = null
let observer: ResizeObserver | null = null
const css = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
function render() {
  if (!root.value) return
  chart?.destroy()
  const values = props.values.slice(-props.period), dates = props.dates.slice(-props.period)
  const primary = css('--app-primary', '#1672ed'), green = css('--app-positive', '#57aa8c'), rose = css('--app-negative', '#d98498'), muted = css('--app-text-muted', '#6b7280'), textStrong = css('--app-text', '#111111'), border = css('--app-border', '#d8dee8'), grid = css('--chart-grid', '#e5e7eb'), surface = css('--app-surface', '#fff')
  const data = values.map((value, index) => index === values.length - 1 ? { x: Date.parse(`${dates[index]}T12:00:00Z`), y: value, marker: endMarker(primary, surface), dataLabels: endLabel(`{y:,.${props.decimals}f}`, primary) } : [Date.parse(`${dates[index]}T12:00:00Z`), value])
  const threshold = props.kind === 'sentiment' ? [{ value: 30, color: green, width: 1, dashStyle: 'Dash' as const, label: { text: '30', style: { color: green, fontSize: '9px' } } }, { value: 70, color: rose, width: 1, dashStyle: 'Dash' as const, label: { text: '70', style: { color: rose, fontSize: '9px' } } }] : props.kind === 'breadth' ? [{ value: 50, color: muted, width: 1, dashStyle: 'Dash' as const, label: { text: '50%', style: { color: muted, fontSize: '9px' } } }] : props.kind === 'risk' || props.kind === 'macroline' ? [] : [{ value: 0, color: muted, width: 1, dashStyle: 'Dash' as const }]
  chart = Highcharts.chart(root.value, { chart: { backgroundColor: 'transparent', height: props.height ?? 164, spacing: [8, 15, 4, 4], animation: false }, title: { text: undefined }, credits: { enabled: false }, legend: { enabled: false }, accessibility: { enabled: false }, xAxis: { type: 'datetime', lineColor: border, tickColor: border, tickAmount: 3, labels: { format: '{value:%b %e}', style: { color: muted, fontSize: '9px' } }, crosshair: true }, yAxis: { title: { text: undefined }, min: props.min, max: props.max, gridLineColor: grid, opposite: true, labels: { x: 6, align: 'left', style: { color: muted, fontSize: '9px' } }, plotBands: props.kind === 'sentiment' ? [{ from: 0, to: 30, color: 'rgba(87,170,140,.09)' }, { from: 70, to: 100, color: 'rgba(217,132,152,.09)' }] : undefined, plotLines: threshold }, tooltip: { valueDecimals: props.decimals, backgroundColor: surface, borderColor: border, style: { color: textStrong, fontSize: '12px' } }, plotOptions: { series: { animation: false, marker: { enabled: false }, states: { inactive: { opacity: 1 } } } }, series: [props.kind === 'flow' || props.kind === 'velocity' || props.kind === 'macrobar' ? { type: 'column', name: props.name, data, color: primary, negativeColor: rose, pointPadding: 0.05, groupPadding: 0.03 } : { type: 'line', name: props.name, data, color: primary, lineWidth: 2, step: props.kind === 'risk' ? 'left' : undefined }] })
}
watch(() => [props.period, props.values, props.height], () => nextTick(render), { deep: true })
// Re-render on theme switches: CSS variables are captured once per render.
const { isDarkTheme } = useTheme()
watch(isDarkTheme, () => nextTick(render))
onMounted(() => { render(); if (typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(() => chart?.reflow()); if (root.value) observer.observe(root.value) } })
onBeforeUnmount(() => { observer?.disconnect(); chart?.destroy() })
</script>
<template><div ref="root" class="w-full min-w-0" :style="{ height: `${height ?? 164}px` }" /></template>

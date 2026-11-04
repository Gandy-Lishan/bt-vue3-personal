<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Highcharts from 'highcharts'
import { useTheme } from '@/shared/theme/theme'
const props = defineProps<{ dates: string[]; values: number[]; period: number; regimes?: number[]; signal?: boolean }>()
const root = ref<HTMLElement | null>(null)
let chart: Highcharts.Chart | null = null
let observer: ResizeObserver | null = null
const css = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
function render() {
  if (!root.value) return
  chart?.destroy()
  const values = props.values.slice(-props.period), dates = props.dates.slice(-props.period), states = props.regimes?.slice(-props.period)
  const times = dates.map((date) => Date.parse(`${date}T12:00:00Z`))
  const positive = css('--app-positive', '#57aa8c'), negative = css('--app-negative', '#d98498'), primary = css('--app-primary', '#1672ed'), neutral = css('--app-text-muted', '#9eafc5'), textStrong = css('--app-text', '#111111'), border = css('--app-border', '#d8dee8'), grid = css('--chart-grid', '#e5e7eb'), surface = css('--app-surface', '#fff')
  const color = (state: number) => state > 0 ? positive : state < 0 ? negative : neutral
  const lastColor = props.signal ? color(values.at(-1) ?? 0) : color(states?.at(-1) ?? 0)
  const segments: Highcharts.SeriesOptionsType[] = states ? values.slice(1).map((value, index) => ({ type: 'line', data: [[times[index], values[index]], [times[index + 1], value]], color: color(states[index + 1]), lineWidth: 2, marker: { enabled: false }, enableMouseTracking: false, showInLegend: false, animation: false })) : []
  const data = values.map((value, index) => index === values.length - 1 ? { x: times[index], y: value, marker: { enabled: true, radius: 3.3, fillColor: lastColor, lineColor: surface, lineWidth: 1.8 }, dataLabels: { enabled: true, crop: false, overflow: 'allow' as const, format: '{y:,.0f}', align: 'left' as const, x: 7, y: 4, padding: 4, borderRadius: 3, backgroundColor: lastColor, style: { color: '#fff', fontSize: '9px', fontWeight: '600', textOutline: 'none' } } } : [times[index], value])
  chart = Highcharts.chart(root.value, { chart: { backgroundColor: 'transparent', height: props.signal ? 190 : 230, spacing: [8, 10, 8, 4], animation: false }, accessibility: { enabled: false }, title: { text: undefined }, credits: { enabled: false }, legend: { enabled: false }, xAxis: { type: 'datetime', lineColor: border, tickColor: border, tickAmount: 4, labels: { format: '{value:%b %e}', style: { color: neutral, fontSize: '10px' } }, crosshair: true }, yAxis: { min: props.signal ? -1 : undefined, max: props.signal ? 1 : undefined, tickPositions: props.signal ? [-1, 0, 1] : undefined, title: { text: undefined }, opposite: true, gridLineColor: grid, labels: { style: { color: neutral, fontSize: '10px' } }, plotBands: props.signal ? [{ from: -1, to: 0, color: 'rgba(217,132,152,.08)' }, { from: 0, to: 1, color: 'rgba(87,170,140,.08)' }] : undefined, plotLines: props.signal ? [{ value: 0, color: neutral, width: 1, dashStyle: 'Dash', label: { text: 'Neutral', align: 'right', style: { color: neutral, fontSize: '10px' } } }] : undefined }, tooltip: { shared: true, backgroundColor: surface, borderColor: border, style: { color: textStrong, fontSize: '12px' }, formatter(this: { x?: number; points?: Highcharts.Point[] }) { const value = this.points?.find((point) => point.series.name === 'Series')?.y; return `<b>${Highcharts.dateFormat('%b %e, %Y', Number(this.x))}</b><br/>${props.signal ? 'Signal' : 'S&P 500 Index'}: <b>${Highcharts.numberFormat(Number(value), 0)}</b>` } }, plotOptions: { series: { animation: false, states: { hover: { halo: { size: 0 } }, inactive: { opacity: 1 } } } }, series: [...segments, { type: 'line', name: 'Series', data, color: states ? 'rgba(0,0,0,0.001)' : primary, lineWidth: states ? 6 : 2, step: props.signal ? 'left' : undefined, marker: { enabled: false }, dataLabels: { enabled: false } }] })
}
watch(() => [props.period, props.values, props.regimes], () => nextTick(render), { deep: true })
// Re-render on theme switches: CSS variables are captured once per render.
const { isDarkTheme } = useTheme()
watch(isDarkTheme, () => nextTick(render))
onMounted(() => { render(); if (typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(() => chart?.reflow()); if (root.value) observer.observe(root.value) } })
onBeforeUnmount(() => { observer?.disconnect(); chart?.destroy() })
</script>
<template><div ref="root" class="w-full min-w-0" :class="signal ? 'h-[190px]' : 'h-[230px]'" /></template>

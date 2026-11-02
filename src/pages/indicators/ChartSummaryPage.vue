<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from '@lucide/vue'
import { fetchClassicDashboard, type MetricRow } from '@/pages/dashboard/dashboard.api'
import ChartSummaryMiniChart from '@/pages/dashboard/ChartSummaryMiniChart.vue'

const zoomOptions = ['3m', '6m', 'YTD', '1y', '3y', '5y']
const chartZooms = ref<Record<string, string>>({})
const rows = ref<MetricRow[]>([])
const loading = ref(false)
const loadError = ref(false)
let controller: AbortController | null = null

function text(value: unknown, fallback = '—'): string {
  return value === null || value === undefined || value === '' ? fallback : String(value)
}

function value(row: MetricRow, ...keys: string[]): unknown {
  for (const key of keys) if (row[key] !== null && row[key] !== undefined && row[key] !== '') return row[key]
  return null
}

function parseRows(raw: unknown): MetricRow[] {
  if (typeof raw === 'string') {
    try { return parseRows(JSON.parse(raw)) } catch { return [] }
  }
  return Array.isArray(raw) ? raw.filter((item): item is MetricRow => !!item && typeof item === 'object' && !Array.isArray(item)).slice(0, 4) : []
}

function chartValues(raw: unknown): number[] {
  const source = typeof raw === 'string' ? (() => { try { return JSON.parse(raw) as unknown } catch { return [] } })() : raw
  if (!Array.isArray(source)) return []
  return source.flatMap((item): number[] => {
    if (Array.isArray(item)) {
      const numeric = item.slice(1).map(Number).find(Number.isFinite)
      return numeric === undefined ? [] : [numeric]
    }
    if (!item || typeof item !== 'object') return []
    const record = item as MetricRow
    const numeric = Number(record.value ?? record.close ?? record.y ?? record.latest_value)
    return Number.isFinite(numeric) ? [numeric] : []
  })
}

function formatMetric(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
}

const charts = computed(() => rows.value.map((row, index) => {
  const values = chartValues(row.data)
  const last = values.at(-1) ?? null
  const prior = values.at(-2) ?? null
  return {
    id: text(value(row, 'symbol', 'chart_id', 'url', 'chart_url'), `summary-${index + 1}`),
    title: text(value(row, 'title', 'chart_name'), `Summary Chart ${index + 1}`),
    name: text(value(row, 'chart_name', 'title'), 'Indicator'),
    subtitle: text(value(row, 'yaxistext', 'sub_type', 'timeframe'), ''),
    data: row.data,
    last,
    change: last !== null && prior !== null ? last - prior : null,
  }
}))

function chartZoom(chartId: string): string {
  return chartZooms.value[chartId] ?? '3y'
}

function setChartZoom(chartId: string, zoom: string) {
  chartZooms.value = { ...chartZooms.value, [chartId]: zoom }
}

async function load() {
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  loadError.value = false
  try {
    const dashboard = await fetchClassicDashboard(controller.signal)
    rows.value = parseRows(dashboard.dashboard_spotlight_data.data)
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) loadError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <main class="min-h-screen bg-[var(--app-bg)] px-[var(--page-gutter)] pb-10 pt-8 text-[var(--app-text)]">
    <div class="mx-auto max-w-[1500px]">
      <RouterLink class="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--app-primary)] hover:underline" to="/">
        <ArrowLeft :size="16" /> Back to Classic Dashboard
      </RouterLink>

      <section class="overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]">
        <header class="border-b border-[var(--app-border)] px-5 py-5">
          <h1 class="text-3xl font-semibold leading-tight">Chart Summary</h1>
          <p class="mt-2 max-w-5xl text-sm leading-6 text-[var(--app-text-muted)]">These thumbnail charts are summary charts for those indicators we believe are indicative of overall market health. The chart titles are hyperlinks...click to be taken to the main chart page.</p>
        </header>

        <p v-if="loadError" class="m-4 rounded-md border border-[var(--app-negative)]/30 bg-[var(--app-negative)]/5 px-4 py-3 text-sm text-[var(--app-negative)]">Unable to load Chart Summary. <button class="font-semibold underline" type="button" @click="load">Try again</button></p>
        <div v-if="loading" class="flex min-h-[420px] items-center justify-center text-sm text-[var(--app-text-muted)]">Loading summary charts...</div>
        <div v-else-if="charts.length" class="grid gap-5 p-5 xl:grid-cols-2">
          <article v-for="chart in charts" :key="chart.id" class="overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
            <header class="flex items-center justify-between gap-3 border-b border-[var(--app-border-muted)] px-4 py-3">
              <div class="min-w-0"><div class="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1"><RouterLink class="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-[var(--app-text)] transition hover:text-[var(--app-primary)] hover:underline" :to="`/indicators/${encodeURIComponent(chart.id)}`">{{ chart.title }}</RouterLink><span class="text-xs font-normal text-[var(--app-text-muted)]">Last <b class="font-bold text-[var(--app-text)]">{{ formatMetric(chart.last) }}</b></span><span v-if="chart.change !== null" class="inline-flex items-center gap-1 text-xs font-normal text-[var(--app-text-muted)]">Change <b class="inline-flex items-center gap-0.5 font-bold" :class="chart.change > 0 ? 'text-[var(--app-positive)]' : chart.change < 0 ? 'text-[var(--app-negative)]' : 'text-[var(--app-text)]'"><ArrowUp v-if="chart.change > 0" :size="13"/><ArrowDown v-else-if="chart.change < 0" :size="13"/>{{ formatMetric(Math.abs(chart.change)) }}</b></span></div><small v-if="chart.subtitle" class="mt-1 block text-xs text-[var(--app-text-muted)]">{{ chart.subtitle }}</small></div>
              <RouterLink class="shrink-0 text-[var(--app-primary)] transition hover:text-[var(--app-primary-hover)]" :to="`/indicators/${encodeURIComponent(chart.id)}`" aria-label="Open chart"><ArrowRight :size="17"/></RouterLink>
            </header>
            <div class="flex flex-wrap items-center gap-2 px-4 pt-4">
              <strong class="mr-1 text-[.8125rem] font-semibold">Zoom</strong>
              <div class="inline-flex overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-surface)]">
                <button v-for="zoom in zoomOptions" :key="`${chart.id}-${zoom}`" type="button" class="h-[30px] min-w-[34px] border-r border-[var(--app-border)] px-2 text-[.8125rem] font-semibold transition last:border-r-0" :class="chartZoom(chart.id) === zoom ? 'bg-[var(--app-primary)] text-white' : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]'" @click="setChartZoom(chart.id, zoom)">{{ zoom }}</button>
              </div>
            </div>
            <div class="p-3"><ChartSummaryMiniChart :data="chart.data" :name="chart.name" :height="320" :range="chartZoom(chart.id)" show-last-line/></div>
          </article>
        </div>
        <p v-else-if="!loadError" class="px-4 py-16 text-center text-sm text-[var(--app-text-muted)]">No summary charts available.</p>
      </section>
    </div>
  </main>
</template>

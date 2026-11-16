<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown } from '@lucide/vue'
import { fetchClassicDashboard, type ClassicDashboardPayload, type MetricRow } from '@/pages/dashboard/dashboard.api'

interface RankRow {
  name: string
  value: number
  url: string
}

interface RankChartDefinition {
  key: string
  title: string
  linked: boolean
}

type RankSortKey = 'market' | 'value'
type RankSortDirection = 'asc' | 'desc'

const definitions: RankChartDefinition[] = [
  { key: 'sector_chart_data', title: 'Sectors Ranked by Lowest–Highest Optimism Index', linked: true },
  { key: 'sector_flow_chart_data', title: 'Sectors Ranked by Lowest–Highest Money Flow', linked: true },
  { key: 'sector_breadth_chart_data', title: 'Sectors Ranked by Oversold–Overbought Breadth', linked: true },
  { key: 'bond_bar_data', title: 'Bonds Ranked by Lowest–Highest Optimism Index', linked: true },
  { key: 'country_chart_data', title: 'Countries Ranked by Lowest–Highest Optimism Index', linked: true },
  { key: 'country_flow_chart_data', title: 'Countries Ranked by Lowest–Highest Money Flow', linked: true },
  { key: 'commods_data', title: 'Commodities Ranked by Lowest–Highest Optimism Index', linked: true },
  { key: 'currency_data', title: 'Currencies Ranked by Lowest–Highest Optimism Index', linked: true },
  { key: 'industry_chart_data', title: 'Industries Ranked by Lowest–Highest Optimism Index', linked: false },
  { key: 'stock_chart_data', title: 'Stocks Ranked by Lowest–Highest Optimism Index', linked: false },
]

const dashboard = ref<ClassicDashboardPayload | null>(null)
const loading = ref(false)
const loadError = ref(false)
const hover = ref<{ name: string; thumbnail: string; x: number; y: number } | null>(null)
const chartSorts = ref<Record<string, { key: RankSortKey; direction: RankSortDirection }>>({})
const selectedChartKey = ref('')
let controller: AbortController | null = null

function parseList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed : [] } catch { return [] }
  }
  return []
}

function rowValue(row: MetricRow, ...keys: string[]): unknown {
  for (const key of keys) if (row[key] !== null && row[key] !== undefined && row[key] !== '') return row[key]
  return null
}

function rankRows(value: unknown): RankRow[] {
  return parseList(value).flatMap((item, index): RankRow[] => {
    if (Array.isArray(item)) {
      const numeric = item.slice(1).map(Number).find(Number.isFinite)
      if (numeric === undefined) return []
      const url = item.slice(1).find(candidate => typeof candidate === 'string' && !Number.isFinite(Number(candidate)))
      return [{ name: String(item[0] ?? `Item ${index + 1}`), value: numeric, url: typeof url === 'string' ? url : '' }]
    }
    if (!item || typeof item !== 'object') return []
    const row = item as MetricRow
    const numeric = Number(rowValue(row, 'value', 'score', 'last_value', 'latest_value'))
    if (!Number.isFinite(numeric)) return []
    return [{
      name: String(rowValue(row, 'name', 'label', 'title', 'chart_name', 'symbol') ?? `Item ${index + 1}`),
      value: numeric,
      url: String(rowValue(row, 'url', 'chart_url', 'chart_id', 'indicator_url') ?? ''),
    }]
  })
}

const charts = computed(() => definitions.map(definition => {
  const rows = rankRows(dashboard.value?.[definition.key])
  const sort = chartSorts.value[definition.key]
  if (sort) rows.sort((left, right) => {
    const a = sort.key === 'value' ? left.value : left.name.toLowerCase()
    const b = sort.key === 'value' ? right.value : right.name.toLowerCase()
    const result = a < b ? -1 : a > b ? 1 : 0
    return sort.direction === 'asc' ? result : -result
  })
  return { ...definition, rows }
}).filter(chart => chart.rows.length))
const visibleCharts = computed(() => selectedChartKey.value
  ? charts.value.filter(chart => chart.key === selectedChartKey.value)
  : charts.value)

function toggleChartSort(chartKey: string, key: RankSortKey) {
  const current = chartSorts.value[chartKey]
  chartSorts.value = {
    ...chartSorts.value,
    [chartKey]: { key, direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc' },
  }
}

function chartSortIcon(chartKey: string, key: RankSortKey) {
  const sort = chartSorts.value[chartKey]
  if (sort?.key !== key) return ArrowUpDown
  return sort.direction === 'asc' ? ArrowUp : ArrowDown
}

function clampedValue(value: number): number {
  return Math.min(100, Math.max(0, value))
}

function barStyle(value: number) {
  const current = clampedValue(value)
  return current < 50
    ? { left: `${current}%`, width: `${50 - current}%` }
    : { left: '50%', width: `${current - 50}%` }
}

function indicatorHref(url: string): string {
  const query = new URLSearchParams({ index: 'Unknown', indicator: url })
  return `/backtester/sr/setup?${query.toString()}`
}

function movePreview(event: MouseEvent) {
  if (!hover.value) return
  const width = 300
  const height = 225
  hover.value.x = Math.min(window.innerWidth - width - 12, Math.max(12, event.clientX + 14))
  hover.value.y = event.clientY > height + 24 ? event.clientY - height - 12 : event.clientY + 14
}

function showPreview(event: MouseEvent, row: RankRow) {
  if (!row.url) return
  hover.value = { name: row.name, thumbnail: `https://d1wrgh3h32hjn2.cloudfront.net/${row.url}_250.png`, x: 12, y: 12 }
  movePreview(event)
}

function hideBrokenThumbnail(event: Event) {
  ;(event.target as HTMLImageElement).style.display = 'none'
}

async function load() {
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  loadError.value = false
  try {
    dashboard.value = await fetchClassicDashboard(controller.signal)
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
          <h1 class="text-3xl font-semibold leading-tight">Rank Charts</h1>
          <p class="mt-2 max-w-5xl text-sm leading-6 text-[var(--app-text-muted)]">The Sector, Bonds, Countries, Commodities, and Currency names are links to the actual charts. Click any name in this rank chart and you'll be taken to the chart. <em>Note: The Industries and Stocks Rank charts are not hyperlinked.</em></p>
          <label v-if="charts.length" class="mt-5 block max-w-xl">
            <strong class="block text-xs font-semibold uppercase tracking-wide text-[var(--app-text-muted)]">Quick Access</strong>
            <select v-model="selectedChartKey" class="mt-2 h-10 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm font-semibold text-[var(--app-text-secondary)] outline-none transition focus:border-[var(--app-primary)]">
              <option value="">All Rank Charts</option>
              <option v-for="chart in charts" :key="`quick-${chart.key}`" :value="chart.key">{{ chart.title }}</option>
            </select>
          </label>
        </header>

        <p v-if="loadError" class="m-4 rounded-md border border-[var(--app-negative)]/30 bg-[var(--app-negative)]/5 px-4 py-3 text-sm text-[var(--app-negative)]">Unable to load Rank Charts. <button class="font-semibold underline" type="button" @click="load">Try again</button></p>
        <div v-if="loading" class="flex min-h-[420px] items-center justify-center text-sm text-[var(--app-text-muted)]">Loading rank charts...</div>
        <div v-else-if="!loadError && charts.length" class="grid items-start gap-5 p-5 xl:grid-cols-2">
          <article v-for="chart in visibleCharts" :id="`rank-${chart.key}`" :key="chart.key" class="rank-chart-card overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
            <header class="border-b border-[var(--app-border-muted)] px-4 py-3">
              <h2 class="text-sm font-bold">{{ chart.title }}</h2>
            </header>
            <div class="rank-scale grid grid-cols-[minmax(130px,.8fr)_minmax(220px,1.6fr)_52px] items-center gap-3 border-b border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-2.5 text-[.6875rem] font-semibold text-[var(--app-text)]">
              <button type="button" class="inline-flex items-center gap-1 text-left transition hover:text-[var(--app-primary)]" @click="toggleChartSort(chart.key, 'market')">Market <component :is="chartSortIcon(chart.key, 'market')" :size="13"/></button>
              <span class="flex justify-between text-[.65rem] text-[var(--app-text-muted)]"><b>0</b><b>50</b><b>100</b></span>
              <button type="button" class="inline-flex items-center justify-end gap-1 text-right transition hover:text-[var(--app-primary)]" @click="toggleChartSort(chart.key, 'value')">Value <component :is="chartSortIcon(chart.key, 'value')" :size="13"/></button>
            </div>
            <div class="px-4 py-3">
              <div v-for="row in chart.rows" :key="`${chart.key}-${row.name}-${row.url}`" class="grid min-h-9 grid-cols-[minmax(130px,.8fr)_minmax(220px,1.6fr)_52px] items-center gap-3 border-b border-[var(--app-border-muted)] py-2 text-xs last:border-b-0">
                <a v-if="chart.linked && row.url" class="overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-[var(--app-primary)] hover:underline" :href="indicatorHref(row.url)" @mouseenter="showPreview($event, row)" @mousemove="movePreview" @mouseleave="hover = null">{{ row.name }}</a>
                <span v-else class="overflow-hidden text-ellipsis whitespace-nowrap font-semibold">{{ row.name }}</span>
                <i class="rank-track"><em :class="row.value < 50 ? 'low' : 'high'" :style="barStyle(row.value)"/></i>
                <b class="text-right font-variant-numeric tabular-nums">{{ Math.round(row.value) }}</b>
              </div>
            </div>
          </article>
        </div>
        <p v-else-if="!loadError" class="px-4 py-16 text-center text-sm text-[var(--app-text-muted)]">No rank chart data available.</p>
      </section>
    </div>

    <Teleport to="body">
      <div v-if="hover" class="rank-preview" :style="{ left: `${hover.x}px`, top: `${hover.y}px` }">
        <strong>{{ hover.name }}</strong>
        <img :src="hover.thumbnail" :alt="`${hover.name} chart preview`" @error="hideBrokenThumbnail" />
      </div>
    </Teleport>
  </main>
</template>

<style scoped>
.rank-track{position:relative;display:block;height:8px;overflow:visible;border-radius:999px;background:var(--app-border-muted)}.rank-track:after{position:absolute;top:-5px;bottom:-5px;left:50%;width:1px;background:var(--app-border-strong);content:''}.rank-track em{position:absolute;top:0;z-index:1;height:100%}.rank-track em.low{border-radius:999px 0 0 999px;background:var(--app-positive)}.rank-track em.high{border-radius:0 999px 999px 0;background:var(--app-negative)}
.rank-chart-card{scroll-margin-top:1rem}
.rank-preview{position:fixed;z-index:300;width:300px;overflow:hidden;border:1px solid var(--app-border);border-radius:8px;background:var(--app-surface);box-shadow:0 10px 28px rgb(0 0 0 / .24);color:var(--app-text);pointer-events:none}.rank-preview strong{display:block;overflow:hidden;padding:.55rem .7rem;font-size:.75rem;text-overflow:ellipsis;white-space:nowrap}.rank-preview img{display:block;width:100%;max-height:180px;object-fit:contain;background:var(--app-surface-muted)}
@media(max-width:640px){.rank-scale,.rank-scale+div>div{grid-template-columns:minmax(90px,.8fr) minmax(130px,1.5fr) 36px;gap:.55rem}}
</style>

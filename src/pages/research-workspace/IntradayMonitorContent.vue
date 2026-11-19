<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Info, Search, X } from '@lucide/vue'
import { fetchIntradayChart, fetchIntradayList, formatIntradayTime, intradayChartRows, intradayPeriodChange, parseIntradayId } from '@/entities/indicator/api/intraday.api'
import { intradayMarketElapsedMs, isIntradayMarketOpen } from '@/entities/indicator/model/intraday.market-time'
import type { Indicator } from '@/entities/indicator/model/indicator.types'
import type { IntradayItem } from './intraday.data'
import IntradayChart from './IntradayChart.vue'

type LiveItem = IntradayItem & { dates: string[]; updatedAt: string }
const data = ref<{ indexes: LiveItem[]; overview: LiveItem[]; sp1500: LiveItem[] }>({ indexes: [], overview: [], sp1500: [] })
const loading = ref(true)
const error = ref('')
const period = ref<14 | 70 | 140>(70)
const universe = ref<'overview' | 'sp1500'>('overview')
const view = ref<'cards' | 'table'>('cards')
const query = ref('')
const detail = ref<LiveItem | null>(null)
const flashed = ref<Record<string, 'up' | 'down'>>({})
const fetchedAt = { overview: 0, sp1500: 0 }
const refreshing = { overview: false, sp1500: false }
let refreshTimer: ReturnType<typeof setInterval> | null = null
let flashTimer: ReturnType<typeof setTimeout> | null = null
const flashClass = (item: LiveItem) => flashed.value[item.id] ? `data-flash-${flashed.value[item.id]}` : ''
const periodName = computed(() => ({ 14: '1D', 70: '1W', 140: '2W' })[period.value])
const visible = computed(() => data.value[universe.value].filter(item => `${item.name} ${item.description}`.toLowerCase().includes(query.value.trim().toLowerCase())))
const pageSize = 12
const pageNumber = ref(1)
const pageCount = computed(() => Math.max(1, Math.ceil(visible.value.length / pageSize)))
const pagedVisible = computed(() => visible.value.slice((pageNumber.value - 1) * pageSize, pageNumber.value * pageSize))
const chartLoaded = new Set<string>()
const chartLoading = new Set<string>()
let chartGeneration = 0
async function loadVisibleCharts() {
  if (universe.value !== 'sp1500') return
  const generation = chartGeneration
  await Promise.all(pagedVisible.value.map(async item => {
    if (chartLoaded.has(item.id) || chartLoading.has(item.id)) return
    const symbol = parseIntradayId(item.id)?.symbol
    if (!symbol) return
    chartLoading.add(item.id)
    try {
      const payload = await fetchIntradayChart('intraday', symbol)
      if (generation !== chartGeneration || !payload) return
      const rows = intradayChartRows(payload, 'intraday').filter(row => Number.isFinite(Number(row.optix)))
      if (rows.length) {
        const values = rows.map(row => Number(row.optix))
        const dates = rows.map(row => new Date(Number(row.date)).toISOString().slice(0, 16).replace('T', ' '))
        data.value = { ...data.value, sp1500: data.value.sp1500.map(current => current.id === item.id
          ? { ...current, values, dates, min: Math.min(0, ...values), max: Math.max(100, ...values), change: intradayPeriodChange(payload, 'intraday') ?? current.change, updatedAt: formatIntradayTime(rows.at(-1)?.date) }
          : current) }
        chartLoaded.add(item.id)
      }
    } catch { /* Keep the current list reading when this chart is unavailable. */ }
    finally { chartLoading.delete(item.id) }
  }))
}
watch([universe, pageNumber, query, () => data.value.sp1500], () => { void loadVisibleCharts() }, { flush: 'post' })
watch([universe, query], () => { pageNumber.value = 1 })
watch(pageCount, count => { if (pageNumber.value > count) pageNumber.value = count })
const latestUpdated = computed(() => [...data.value.indexes, ...data.value.overview, ...data.value.sp1500].map(item => item.updatedAt).filter(Boolean).sort().at(-1) ?? '—')
const number = (item: IntradayItem) => (item.values.at(-1) ?? 0).toLocaleString('en-US', { minimumFractionDigits: item.decimals, maximumFractionDigits: item.decimals })
const router = useRouter()
function openDetail(item: LiveItem) {
  if (item.group === 'overview') router.push({ path: `/indicators/${item.id}`, query: { list: 'intraday-charts' } })
  else detail.value = item
}
const changeText = (item: IntradayItem) => Number.isFinite(item.change) ? `${item.change > 0 ? '+' : ''}${item.change.toLocaleString('en-US', { minimumFractionDigits: item.decimals, maximumFractionDigits: item.decimals })}${item.unit === '%' ? ' pp' : ''}` : '—'
const referenceText = (item: IntradayItem) => item.pessExtreme !== undefined && item.optExtreme !== undefined ? `${item.pessExtreme} / ${item.optExtreme} reference lines` : item.min === 0 && item.max === 100 ? '20 / 80 reference lines' : item.zeroBaseline ? 'Zero reference line' : item.unit === 'x' ? '1.00 ratio reference' : '20 / 80 reference lines'
const changeClass = (item: IntradayItem) => item.change > 0 ? 'text-[var(--app-positive)]' : item.change < 0 ? 'text-[var(--app-negative)]' : 'text-[var(--app-text-muted)]'
function points(item: IntradayItem, height = 40) {
  const values = item.values.slice(-period.value), min = Math.min(...values), max = Math.max(...values), span = max - min || 1
  return values.map((value, index) => `${index / Math.max(values.length - 1, 1) * 100},${height - 3 - (value - min) / span * (height - 6)}`).join(' ')
}
function adapt(rows: Indicator[], groupSource: 'overview' | 'sp1500'): LiveItem[] {
  return rows.flatMap(row => {
      const raw = row.raw as Record<string, unknown> | undefined
      if (!raw) return []
      const chartRows = intradayChartRows(raw, groupSource === 'overview' ? 'intraday-charts' : 'intraday')
      const values = chartRows.map(point => Number(groupSource === 'overview' ? point.value : point.optix)).filter(Number.isFinite)
      if (!values.length && !Number.isFinite(row.currentValue)) return []
      if (!values.length) values.push(row.currentValue)
      const name = row.name
      const rawUnit = raw.unit
      const unit = typeof rawUnit === 'string' ? rawUnit : ''
      const rawMin = Number(raw.min)
      const rawMax = Number(raw.max)
      const min = Number.isFinite(rawMin) && raw.min != null ? rawMin : Math.min(...values)
      const max = Number.isFinite(rawMax) && raw.max != null ? rawMax : Math.max(...values)
      const lowerName = name.toLowerCase()
      const group: IntradayItem['group'] = groupSource === 'sp1500' ? 'sp1500' : /^(s&p 500|s&p 1500|nasdaq 100)$/.test(lowerName) ? 'index' : 'overview'
      const decimals = Number.isInteger(values.at(-1)) ? 0 : 2
      const description = typeof raw.description === 'string' ? raw.description : groupSource === 'overview' ? 'Intraday chart · 30-minute readings' : 'S&P 1500 Intraday Optix · 5-minute readings'
      const dates = chartRows.map(point => new Date(Number(point.date)).toISOString().slice(0, 16).replace('T', ' '))
      if (!dates.length) dates.push(row.updatedAt || new Date().toISOString().slice(0, 16).replace('T', ' '))
      const pessExtreme = raw.pess_extreme != null && Number.isFinite(Number(raw.pess_extreme)) ? Number(raw.pess_extreme) : undefined
      const optExtreme = raw.opt_extreme != null && Number.isFinite(Number(raw.opt_extreme)) ? Number(raw.opt_extreme) : undefined
      return [{ id: row.id, name, group, min, max, pessExtreme, optExtreme, decimals, unit, description, zeroBaseline: min < 0 && max > 0, anchor: values.at(-1)!, values, change: Number(raw.intraday_change ?? 0), updated: 0, updatedAt: row.updatedAt || formatIntradayTime(raw.last_updated), dates }]
    })
}
function applyItems(source: 'overview' | 'sp1500', items: LiveItem[]) {
  const previous = new Map([...data.value.indexes, ...data.value.overview, ...data.value.sp1500].map(item => [item.id, item]))
  const nextFlash: Record<string, 'up' | 'down'> = {}
  for (const item of items) {
    const before = previous.get(item.id)?.values.at(-1)
    const after = item.values.at(-1)
    if (before !== undefined && after !== undefined && before !== after) nextFlash[item.id] = after > before ? 'up' : 'down'
  }
  if (source === 'overview') data.value = { ...data.value, indexes: items.filter(item => item.group === 'index'), overview: items.filter(item => item.group === 'overview') }
  else {
    chartGeneration++
    chartLoaded.clear()
    chartLoading.clear()
    data.value = { ...data.value, sp1500: items }
  }
  if (detail.value) detail.value = items.find(item => item.id === detail.value?.id) ?? detail.value
  if (Object.keys(nextFlash).length) {
    flashed.value = { ...flashed.value, ...nextFlash }
    if (flashTimer) clearTimeout(flashTimer)
    flashTimer = setTimeout(() => { flashed.value = {} }, 1400)
  }
}
async function loadSource(source: 'overview' | 'sp1500') {
  if (refreshing[source]) return
  refreshing[source] = true
  try {
    const rows = source === 'overview'
      ? await fetchIntradayList('intraday-charts')
      : await fetchIntradayList('intraday', { record: {}, tickers: [], url: null })
    applyItems(source, adapt(rows, source))
    fetchedAt[source] = Date.now()
    error.value = ''
  } catch (reason) {
    if (!data.value.indexes.length && !data.value.overview.length && !data.value.sp1500.length) error.value = reason instanceof Error ? reason.message : 'Unable to refresh intraday data'
  }
  finally { refreshing[source] = false }
}
async function load() {
  loading.value = true
  await Promise.all([loadSource('overview'), loadSource('sp1500')])
  loading.value = false
}
function checkRefresh() {
  if (document.hidden || !isIntradayMarketOpen(Date.now())) return
  if ((fetchedAt.overview && intradayMarketElapsedMs(fetchedAt.overview, Date.now()) >= 30 * 60_000)
    || (fetchedAt.sp1500 && intradayMarketElapsedMs(fetchedAt.sp1500, Date.now()) >= 30 * 60_000)) void load()
}
function onVisibilityChange() { if (!document.hidden) checkRefresh() }
onMounted(() => { void load(); refreshTimer = setInterval(checkRefresh, 30_000); document.addEventListener('visibilitychange', onVisibilityChange) })
onBeforeUnmount(() => { if (refreshTimer) clearInterval(refreshTimer); if (flashTimer) clearTimeout(flashTimer); document.removeEventListener('visibilitychange', onVisibilityChange) })
</script>

<template>
  <section class="space-y-4" data-testid="intraday-monitor-content">
    <div class="flex items-start gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-primary-soft)] px-4 py-3 text-xs leading-5 text-[var(--app-text-secondary)]"><Info :size="18" class="mt-0.5 shrink-0 text-[var(--app-primary)]" /><p>Intraday chart readings from the Indicators API. Historical observations are 30 minutes apart.</p></div>
    <div class="flex flex-wrap items-center justify-between gap-4"><div class="flex items-center gap-2 text-xs"><span class="font-semibold text-[var(--app-text-muted)]">Chart window</span><div class="inline-flex rounded-md border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-0.5" role="group" aria-label="Chart window"><button v-for="option in [{value:14,label:'1D'},{value:70,label:'1W'},{value:140,label:'2W'}] as const" :key="option.value" type="button" :aria-pressed="period === option.value" class="rounded px-3 py-1.5 font-semibold" :class="period === option.value ? 'bg-[var(--app-surface)] text-[var(--app-primary)] shadow-sm' : 'text-[var(--app-text-muted)]'" @click="period = option.value">{{ option.label }}</button></div></div><div class="flex flex-wrap items-center gap-3 text-xs"><span class="text-[var(--app-text-muted)]">Last update <b class="text-[var(--app-text-secondary)]">{{ latestUpdated }}</b></span><button type="button" class="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 font-semibold text-[var(--app-text-secondary)]" @click="load">Refresh</button></div></div>
    <div class="flex flex-wrap justify-between gap-2 text-[11px] text-[var(--app-text-muted)]"><span><strong class="text-[var(--app-text-secondary)]">Latest update: {{ latestUpdated }}</strong></span><span>API data · up to {{ period }} half-hour observations in the selected chart window</span></div>
    <div class="grid gap-3 md:grid-cols-3"><article v-for="item in data.indexes" :key="item.id" class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm"><header class="flex items-center justify-between gap-2"><h2 class="text-sm font-semibold">{{ item.name }}</h2><button type="button" :aria-label="`Expand ${item.name} chart`" class="h-7 w-7 rounded border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-primary)]" @click="detail = item">↗</button></header><div class="mt-3 grid grid-cols-[minmax(0,1fr)_40%] items-end gap-3"><div><strong class="text-3xl font-semibold tabular-nums data-flash-number" :class="flashClass(item)">{{ number(item) }}</strong><small class="ml-1 text-[10px] text-[var(--app-text-muted)]">{{ item.unit }}</small><p class="mt-1 text-xs" :class="changeClass(item)">{{ changeText(item) }} <small class="text-[var(--app-text-muted)]">Δ since previous update</small></p></div><button type="button" :aria-label="`View ${item.name} recent trend`" class="w-full" @click="detail = item"><svg viewBox="0 0 100 49" preserveAspectRatio="none" class="h-[49px] w-full"><polyline :points="points(item,49)" fill="none" stroke="var(--app-primary)" stroke-width="1.6" vector-effect="non-scaling-stroke" /></svg></button></div><footer class="mt-3 flex justify-between border-t border-[var(--app-border-muted)] pt-2 text-[10px] text-[var(--app-text-muted)]"><span>Index level</span><span>{{ periodName }} trend · {{ item.updatedAt }}</span></footer></article></div>
    <div class="flex flex-wrap items-end justify-between gap-3"><div><h2 class="font-semibold">{{ universe === 'overview' ? 'Indicator overview' : 'S&P 1500 indicators' }}</h2><p class="mt-1 text-xs text-[var(--app-text-muted)]">{{ universe === 'overview' ? 'Models, participation, momentum and options in one view.' : 'Participation, volume and momentum measures for the broad market.' }}</p></div><span class="rounded bg-[var(--app-surface-muted)] px-2 py-1 text-xs text-[var(--app-text-muted)]">{{ visible.length }} indicators</span></div>
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)]"><div class="flex gap-5" role="tablist" aria-label="Intraday indicator universe"><button v-for="option in [{value:'overview',label:'Overview',count:data.overview.length},{value:'sp1500',label:'S&P 1500',count:data.sp1500.length}] as const" :key="option.value" type="button" role="tab" :aria-selected="universe === option.value" class="border-b-2 pb-3 text-xs font-semibold" :class="universe === option.value ? 'border-[var(--app-primary)] text-[var(--app-primary)]' : 'border-transparent text-[var(--app-text-muted)]'" @click="universe = option.value">{{ option.label }} <small>{{ option.count }}</small></button></div><div class="flex items-center gap-2 pb-2"><label class="flex h-8 items-center gap-2 rounded border border-[var(--app-border)] bg-[var(--app-surface)] px-2"><Search :size="14" class="text-[var(--app-text-muted)]" /><input v-model="query" type="search" aria-label="Search indicators" placeholder="Search indicators…" class="w-36 bg-transparent text-xs outline-none" /></label><div class="inline-flex rounded border border-[var(--app-border)] p-0.5" role="group" aria-label="Indicator display"><button v-for="option in ['cards','table'] as const" :key="option" type="button" :aria-pressed="view === option" class="rounded px-2 py-1 text-xs capitalize" :class="view === option ? 'bg-[var(--app-primary-soft)] font-semibold text-[var(--app-primary)]' : 'text-[var(--app-text-muted)]'" @click="view = option">{{ option }}</button></div></div></div>
    <p class="text-xs text-[var(--app-text-muted)]"><strong>Δ since previous update.</strong> Percentages change in percentage points (pp); other readings keep their own units. Only changed values briefly highlight.</p>
    <p v-if="loading" role="status" class="py-8 text-center text-sm">Loading Intraday Charts…</p><p v-else-if="error" role="alert" class="py-8 text-center text-sm text-[var(--app-negative)]">{{ error }}</p><div v-else-if="!visible.length" class="rounded-lg border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center text-xs text-[var(--app-text-muted)]"><strong class="block text-sm">No matching indicators</strong><p class="mt-2">Try another name or clear your search to see this category.</p><button type="button" class="mt-3 rounded border border-[var(--app-border)] px-3 py-2 text-[var(--app-primary)]" @click="query = ''">Clear search</button></div>
    <div v-else-if="view === 'cards'" class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3"><article v-for="item in pagedVisible" :key="item.id" class="overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm"><header class="flex items-start justify-between gap-2 px-4 pt-4"><div><button type="button" class="text-left text-xs font-semibold text-[var(--app-text-secondary)] hover:text-[var(--app-primary)]" @click="openDetail(item)">{{ item.name }}</button><p class="mt-1 text-[10px] text-[var(--app-text-muted)]">{{ item.description }}</p></div><button type="button" :aria-label="`Expand ${item.name} chart`" class="h-7 w-7 shrink-0 rounded border border-[var(--app-border)] text-[var(--app-text-muted)]" @click="openDetail(item)">↗</button></header><div class="flex items-baseline justify-between gap-2 px-4 pt-3"><strong class="text-2xl tabular-nums data-flash-number" :class="flashClass(item)">{{ number(item) }} <small class="text-xs font-normal text-[var(--app-text-muted)]">{{ item.unit }}</small></strong><span class="text-xs tabular-nums" :class="changeClass(item)">{{ changeText(item) }}</span></div><div class="px-2"><IntradayChart :item="item" :period="period" /></div><footer class="flex justify-between gap-2 border-t border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-2 text-[10px] text-[var(--app-text-muted)]"><span>{{ referenceText(item) }}</span><span>Updated {{ item.updatedAt }}</span></footer></article></div>
    <section v-else class="overflow-x-auto rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]"><table class="w-full min-w-[800px] text-left text-xs"><thead class="bg-[var(--app-surface-muted)] text-[var(--app-text-muted)]"><tr><th v-for="heading in ['Indicator','Current','Change Δ','Recent trend','Updated']" :key="heading" class="px-4 py-3">{{ heading }}</th></tr></thead><tbody><tr v-for="item in pagedVisible" :key="item.id" class="border-t border-[var(--app-border-muted)] hover:bg-[var(--app-surface-hover)]"><td class="px-4 py-3"><button type="button" class="font-semibold text-[var(--app-text-secondary)] hover:text-[var(--app-primary)]" @click="openDetail(item)">{{ item.name }}</button><small class="block text-[var(--app-text-muted)]">{{ item.description }}</small></td><td class="px-4 py-3 font-semibold tabular-nums"><span class="data-flash-number" :class="flashClass(item)">{{ number(item) }}</span> <small>{{ item.unit }}</small></td><td class="px-4 py-3 tabular-nums" :class="changeClass(item)">{{ changeText(item) }}</td><td class="w-[170px] px-4 py-3"><button type="button" :aria-label="`Expand ${item.name} recent trend`" class="w-full" @click="openDetail(item)"><svg viewBox="0 0 100 35" preserveAspectRatio="none" class="h-[35px] w-full"><polyline :points="points(item,35)" fill="none" stroke="var(--app-primary)" stroke-width="1.5" vector-effect="non-scaling-stroke" /></svg></button></td><td class="px-4 py-3 text-[var(--app-text-muted)]">{{ item.updatedAt }}</td></tr></tbody></table></section>

    <div v-if="visible.length > pageSize" class="flex items-center justify-between gap-3 text-xs text-[var(--app-text-muted)]"><span>{{ (pageNumber - 1) * pageSize + 1 }}–{{ Math.min(pageNumber * pageSize, visible.length) }} of {{ visible.length }}</span><div class="flex items-center gap-2"><button type="button" class="rounded border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1.5 disabled:opacity-40" :disabled="pageNumber === 1" @click="pageNumber--">Previous</button><span>{{ pageNumber }} / {{ pageCount }}</span><button type="button" class="rounded border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1.5 disabled:opacity-40" :disabled="pageNumber === pageCount" @click="pageNumber++">Next</button></div></div>    <Teleport to="body"><div v-if="detail" class="fixed inset-0 z-[80] grid place-items-center bg-[var(--app-overlay)] p-4" role="dialog" aria-modal="true" :aria-label="`${detail.name} detail`"><section class="w-full max-w-4xl rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-2xl"><header class="mb-4 flex justify-between gap-3"><div><h2 class="text-lg font-semibold">{{ detail.name }}</h2><p class="mt-1 text-xs text-[var(--app-text-muted)]">{{ detail.description }} · {{ periodName }} window</p></div><button type="button" aria-label="Close detail" @click="detail = null"><X :size="18" /></button></header><div class="mb-3 flex items-baseline gap-3"><strong class="text-2xl">{{ number(detail) }} <small class="text-xs font-normal">{{ detail.unit }}</small></strong><span class="text-xs" :class="changeClass(detail)">{{ changeText(detail) }}</span></div><IntradayChart :item="detail" :period="period" :height="300" /><p class="mt-3 text-xs text-[var(--app-text-muted)]">{{ referenceText(detail) }} · Updated {{ detail.updatedAt }}</p></section></div></Teleport>
  </section>
</template>

<style scoped>
.data-flash-number{display:inline-block;border-radius:3px;padding:1px 2px;margin:-1px -2px;font-variant-numeric:tabular-nums}
.data-flash-up{animation:data-flash-up 1.3s ease-out}
.data-flash-down{animation:data-flash-down 1.3s ease-out}
@keyframes data-flash-up{0%,22%{background:var(--app-value-flash-up);box-shadow:0 0 0 3px var(--app-value-flash-up)}100%{background:transparent;box-shadow:0 0 0 3px transparent}}
@keyframes data-flash-down{0%,22%{background:var(--app-value-flash-down);box-shadow:0 0 0 3px var(--app-value-flash-down)}100%{background:transparent;box-shadow:0 0 0 3px transparent}}
@media(prefers-reduced-motion:reduce){.data-flash-up,.data-flash-down{animation:none}}
</style>

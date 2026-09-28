<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowRight,
  BarChart3,
  Building2,
  ChevronDown,
  ChevronLeft,
  Database,
  Download,
  FileText,
  LineChart,
  Newspaper,
  Star,
  Users,
} from '@lucide/vue'
import { fetchMarketPredictionDetail, normalizeMarketDetailTab } from '@/entities/market/api/market-detail.api'
import { fetchMarketPredictions } from '@/entities/market/api/market-prediction.api'
import {
  formatMarketCompact,
  latestItem,
  marketDetailTabs,
  predictionDisplayName,
  targetSummaryText,
} from '@/entities/market/model/market-detail.adapter'
import {
  formatMarketCurrency,
  formatMarketPercent,
  marketPredictionCsvTable,
} from '@/entities/market/model/market-prediction.adapter'
import type {
  MarketDetailTab,
  MarketMetric,
  MarketPredictionDetail,
} from '@/entities/market/model/market-detail.types'
import type { MarketPredictionRow } from '@/entities/market/model/market-prediction.types'
import { downloadCsv, toCsv } from '@/shared/utils/csv'
import DetailSearchSidebar from '@/shared/ui/DetailSearchSidebar.vue'
import MarketPredictionRatingBadge from './ui/MarketPredictionRatingBadge.vue'

const route = useRoute()
const router = useRouter()
const ticker = computed(() => String(route.params.ticker ?? '').trim().toUpperCase())
const rows = ref<MarketPredictionRow[]>([])
const detail = ref<MarketPredictionDetail | null>(null)
const listLoading = ref(false)
const detailLoading = ref(false)
const listSearchQuery = ref('')
const profileExpanded = ref(false)
const watched = ref(false)
const storedSymbols = ref<Map<string, string>>(new Map())
const detailContentElement = ref<HTMLElement | null>(null)
const sidebarHeight = ref('')
const sidebarBreakpoint = '(min-width: 1280px)'
let listAbortController: AbortController | null = null
let detailAbortController: AbortController | null = null
let detailResizeObserver: ResizeObserver | null = null
let observedDetailContent: HTMLElement | null = null

const activeTab = computed<MarketDetailTab>(() => normalizeMarketDetailTab(route.query.tab))
const selectedPrediction = computed(() => rows.value.find((row) => row.ticker === ticker.value) ?? detail.value?.prediction ?? null)
const profile = computed(() => detail.value?.profile ?? null)
const logoUrl = computed(() => profile.value?.logoUrl ?? `https://images.financialmodelingprep.com/symbol/${ticker.value}.png`)
const latestTarget = computed(() => latestItem(detail.value?.analystTargets ?? []))
const latestFinancial = computed(() => latestItem(detail.value?.financials ?? []))
const latestCashFlow = computed(() => latestItem(detail.value?.cashFlow ?? []))
const latestBalance = computed(() => latestItem(detail.value?.balanceSheet ?? []))
const visibleDescription = computed(() => {
  const description = profile.value?.description ?? ''
  if (profileExpanded.value || description.length < 210) return description
  return `${description.slice(0, 210).trim()}...`
})

const sidebarItems = computed(() => {
  const query = listSearchQuery.value.trim().toLowerCase()
  const sourceRows = rows.value.length ? rows.value : selectedPrediction.value ? [selectedPrediction.value] : []

  return sourceRows
    .filter((row) => {
      const label = storedSymbols.value.get(row.ticker) ?? predictionDisplayName(row)
      const searchable = `${row.ticker} ${label} ${row.rating}`.toLowerCase()
      return !query || searchable.includes(query)
    })
    .map((row) => {
      const label = storedSymbols.value.get(row.ticker) ?? predictionDisplayName(row)
      return {
        id: row.ticker,
        label,
        to: { name: 'market-prediction-detail', params: { ticker: row.ticker }, query: route.query.tab ? { tab: route.query.tab } : {} },
        active: row.ticker === ticker.value,
      }
    })
})

const topMetrics = computed(() => {
  const prediction = selectedPrediction.value
  return [
    { label: 'Target', value: formatMarketCurrency(prediction?.target ?? latestTarget.value?.target ?? null) },
    { label: 'Upside', value: formatMarketPercent(prediction?.potentialUpside ?? null, true), tone: (prediction?.potentialUpside ?? 0) >= 0 ? 'positive' : 'negative' },
    { label: 'Accuracy', value: formatMarketPercent(prediction?.meanAccuracy ?? latestTarget.value?.accuracy ?? null) },
    { label: 'Rating', value: prediction?.rating ?? detail.value?.prediction?.rating ?? 'Unrated' },
  ]
})

const forecastPoints = computed(() => {
  const targets = (detail.value?.analystTargets ?? [])
    .filter((row) => row.target !== null)
    .slice(-10)
    .map((row) => ({ label: row.date, value: row.target }))

  const currentPrice = profile.value?.price ?? selectedPrediction.value?.lastPrice ?? null
  const target = selectedPrediction.value?.target ?? latestTarget.value?.target ?? null
  if (!targets.length && (currentPrice !== null || target !== null)) {
    return [
      { label: 'Current', value: currentPrice },
      { label: selectedPrediction.value?.predictionEndDate ?? 'Target', value: target },
    ]
  }

  return targets.length ? targets : [{ label: 'No forecast data', value: null }]
})

const forecastPath = computed(() => linePath(forecastPoints.value.map((point) => point.value), 760, 220))
const forecastBars = computed(() =>
  (detail.value?.analystTargets ?? []).slice(-18).map((row, index) => ({
    id: `${row.date}-${index}`,
    height: Math.max(10, Math.min(72, ((row.reportCount ?? 1) / Math.max(1, maxValue((detail.value?.analystTargets ?? []).map((item) => item.reportCount)))) * 72)),
  })),
)

const earningsChartRows = computed(() => (detail.value?.earnings ?? []).slice(-5))
const financialChartRows = computed(() => (detail.value?.financials ?? []).slice(-5))

function setActiveTab(tab: MarketDetailTab) {
  const query = { ...route.query }
  if (tab === 'overview') {
    delete query.tab
  } else {
    query.tab = tab
  }
  void router.replace({ name: 'market-prediction-detail', params: { ticker: ticker.value }, query })
}

function readStoredSymbols() {
  if (typeof window === 'undefined') return
  try {
    const parsed = JSON.parse(window.localStorage.getItem('refactoredConcatList') ?? '[]') as Array<Record<string, unknown>>
    const next = new Map<string, string>()
    for (const item of parsed) {
      const symbol = String(item.url ?? item.stock ?? item.symbol ?? item.ticker ?? '').trim().toUpperCase()
      const name = String(item.name ?? item.label ?? '').trim()
      if (symbol && name) next.set(symbol, name)
    }
    storedSymbols.value = next
  } catch {
    storedSymbols.value = new Map()
  }
}

async function loadPredictionRows() {
  if (rows.value.length || listLoading.value) return
  listAbortController?.abort()
  listAbortController = new AbortController()
  listLoading.value = true
  try {
    rows.value = await fetchMarketPredictions(listAbortController.signal)
  } finally {
    listLoading.value = false
  }
}

async function loadDetail() {
  if (!ticker.value) return
  detailAbortController?.abort()
  detailAbortController = new AbortController()
  detailLoading.value = true
  profileExpanded.value = false
  try {
    await loadPredictionRows()
    const prediction = rows.value.find((row) => row.ticker === ticker.value) ?? null
    detail.value = await fetchMarketPredictionDetail(ticker.value, prediction, detailAbortController.signal)
  } finally {
    detailLoading.value = false
  }
}

function linePath(values: Array<number | null>, width: number, height: number) {
  const numeric = values.filter((value): value is number => value !== null)
  if (!numeric.length) return ''
  const min = Math.min(...numeric)
  const max = Math.max(...numeric)
  const range = max - min || 1
  const step = values.length > 1 ? width / (values.length - 1) : width
  return values
    .map((value, index) => {
      if (value === null) return ''
      const x = index * step
      const y = height - ((value - min) / range) * (height - 24) - 12
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .filter(Boolean)
    .join(' ')
}

function maxValue(values: Array<number | null>) {
  const numeric = values.filter((value): value is number => value !== null)
  return numeric.length ? Math.max(...numeric) : 1
}

function barHeight(value: number | null, values: Array<number | null>, maxHeight = 86) {
  const max = maxValue(values)
  return Math.max(8, Math.min(maxHeight, ((value ?? 0) / max) * maxHeight))
}

function metricToneClass(metric: MarketMetric) {
  if (metric.tone === 'positive') return 'text-[var(--app-positive)]'
  if (metric.tone === 'negative') return 'text-[var(--app-negative)]'
  return 'text-[var(--app-text)]'
}

function downloadCurrentPrediction() {
  const prediction = selectedPrediction.value
  if (!prediction) return
  const { headers, rows: csvRows } = marketPredictionCsvTable([prediction])
  downloadCsv(`market-prediction-${prediction.ticker}.csv`, toCsv(headers, csvRows))
}

function tableCurrency(value: number | null) {
  return formatMarketCompact(value, { currency: true })
}

function sourceLabel(item: { url: string; source?: string }) {
  if (item.source) return item.source
  if (!item.url) return '—'
  try {
    return new URL(item.url).hostname.replace(/^www\./, '')
  } catch {
    return item.url
  }
}

function updateSidebarHeight() {
  const element = detailContentElement.value
  const sideBySide = typeof window !== 'undefined' && window.matchMedia(sidebarBreakpoint).matches

  if (!element || !sideBySide) {
    sidebarHeight.value = ''
    return
  }

  const height = Math.ceil(element.getBoundingClientRect().height)
  sidebarHeight.value = height > 0 ? `${height}px` : ''
}

function observeDetailContent() {
  const element = detailContentElement.value
  if (element === observedDetailContent) {
    updateSidebarHeight()
    return
  }

  detailResizeObserver?.disconnect()
  observedDetailContent = element

  if (element && typeof ResizeObserver !== 'undefined') {
    detailResizeObserver = new ResizeObserver(updateSidebarHeight)
    detailResizeObserver.observe(element)
  }

  updateSidebarHeight()
}

watch(ticker, () => {
  void loadDetail()
}, { immediate: true })

watch([detail, activeTab], () => {
  void nextTick(observeDetailContent)
})

onMounted(() => {
  readStoredSymbols()
  window.addEventListener('resize', updateSidebarHeight)
  void nextTick(observeDetailContent)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateSidebarHeight)
  detailResizeObserver?.disconnect()
  listAbortController?.abort()
  detailAbortController?.abort()
})
</script>

<template>
  <div class="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
    <main class="px-[var(--page-gutter)] pb-8 pt-6">
      <section class="grid items-start gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
        <DetailSearchSidebar
          v-model="listSearchQuery"
          title="Market Prediction List"
          placeholder="Search stocks..."
          empty-message="No tickers found"
          :items="sidebarItems"
          :height="sidebarHeight"
        />

        <section ref="detailContentElement" class="min-w-0 space-y-3">
          <nav class="flex min-h-12 flex-wrap items-center gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 text-sm font-semibold">
            <RouterLink class="inline-flex items-center gap-2 text-[var(--app-primary)] hover:underline" :to="{ name: 'market-prediction' }">
              <ChevronLeft :size="18" />
              Back to Market Prediction
            </RouterLink>
          </nav>

          <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
            <div class="grid gap-4 2xl:grid-cols-[minmax(300px,1fr)_minmax(420px,0.95fr)_240px] 2xl:items-center">
              <div class="flex flex-wrap items-center gap-4">
                <img
                  class="h-16 w-16 shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-soft)] object-contain p-1"
                  :src="logoUrl"
                  :alt="`${ticker} logo`"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-baseline gap-3">
                    <h1 class="text-2xl font-extrabold leading-tight text-[var(--app-text)]">
                      {{ profile?.companyName ?? ticker }}
                    </h1>
                    <span class="text-xl font-semibold text-[var(--app-text-muted)]">({{ ticker }})</span>
                  </div>
                  <p class="mt-1 text-sm text-[var(--app-text-secondary)]">
                    {{ profile?.industry ?? '—' }}
                    <span class="mx-2 text-[var(--app-text-faint)]">|</span>
                    {{ profile?.exchange ?? '—' }}
                  </p>
                </div>

                <div class="text-right">
                  <p class="text-2xl font-extrabold">{{ formatMarketCurrency(profile?.price ?? selectedPrediction?.lastPrice ?? null) }}</p>
                  <p
                    class="text-sm font-semibold"
                    :class="(profile?.change ?? 0) >= 0 ? 'text-[var(--app-positive)]' : 'text-[var(--app-negative)]'"
                  >
                    {{ profile?.change === null || profile?.change === undefined ? '—' : `${profile.change > 0 ? '+' : ''}${profile.change.toFixed(2)}` }}
                    {{ profile?.changePercent === null || profile?.changePercent === undefined ? '' : ` ${formatMarketPercent(profile.changePercent, true)}` }}
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--app-border-muted)] bg-[var(--app-border-muted)] md:grid-cols-4">
                <div v-for="metric in topMetrics" :key="metric.label" class="bg-[var(--app-surface-soft)] px-3 py-2.5">
                  <p class="text-xs font-semibold text-[var(--app-text-muted)]">{{ metric.label }}</p>
                  <div v-if="metric.label === 'Rating'" class="mt-1">
                    <MarketPredictionRatingBadge :rating="metric.value" :category="selectedPrediction?.ratingCategory ?? 'other'" />
                  </div>
                  <p
                    v-else
                    class="mt-1 text-lg font-extrabold"
                    :class="metric.tone === 'positive' ? 'text-[var(--app-positive)]' : metric.tone === 'negative' ? 'text-[var(--app-negative)]' : 'text-[var(--app-text)]'"
                  >
                    {{ metric.value }}
                  </p>
                </div>
              </div>

              <div class="flex flex-wrap gap-2 2xl:justify-end">
                <button
                  class="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--app-border)] px-4 text-sm font-bold text-[var(--app-primary)] hover:bg-[var(--app-primary-soft)] 2xl:flex-none"
                  type="button"
                  @click="watched = !watched"
                >
                  <Star :size="17" :fill="watched ? 'var(--app-primary)' : 'transparent'" />
                  Watch
                </button>
                <button
                  class="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-[var(--app-border)] px-4 text-sm font-bold text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-soft)] disabled:cursor-not-allowed disabled:opacity-50 2xl:flex-none"
                  type="button"
                  :disabled="!selectedPrediction"
                  @click="downloadCurrentPrediction"
                >
                  <Download :size="17" />
                  Export
                </button>
              </div>
            </div>
          </section>

          <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]">
            <div class="flex min-w-0 overflow-x-auto border-b border-[var(--app-border)] px-4">
              <button
                v-for="tab in marketDetailTabs"
                :key="tab.id"
                class="h-12 shrink-0 border-b-2 px-3 text-sm font-extrabold"
                :class="activeTab === tab.id ? 'border-[var(--app-primary)] text-[var(--app-primary)]' : 'border-transparent text-[var(--app-text-secondary)] hover:text-[var(--app-primary)]'"
                type="button"
                @click="setActiveTab(tab.id)"
              >
                {{ tab.label }}
              </button>
            </div>
          </section>

          <div v-if="detailLoading" class="flex min-h-80 items-center justify-center rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] text-sm text-[var(--app-text-muted)]">
            Loading market prediction detail...
          </div>

          <template v-else-if="detail">
            <section v-if="activeTab === 'overview'" class="space-y-3">
              <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
                <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
                  <div class="mb-3 flex items-center justify-between gap-3">
                    <h2 class="text-lg font-extrabold">Price & Forecast</h2>
                    <RouterLink class="text-sm font-bold text-[var(--app-primary)] hover:underline" :to="{ query: { ...route.query, tab: 'chart' } }">
                      Expand
                    </RouterLink>
                  </div>

                  <div class="mb-3 flex flex-wrap items-center gap-2">
                    <span v-for="label in ['1M', '3M', '6M', 'YTD', '1Y', '3Y', 'All']" :key="label" class="rounded-md bg-[var(--app-surface-muted)] px-3 py-1.5 text-xs font-bold text-[var(--app-text-muted)]" :class="{ 'bg-[var(--app-primary)] text-white': label === 'All' }">
                      {{ label }}
                    </span>
                    <span class="ml-auto inline-flex items-center gap-2 text-xs font-semibold text-[var(--app-text-secondary)]">
                      <span class="h-2 w-2 rounded-full bg-[var(--app-primary)]" />
                      Consensus {{ formatMarketCurrency(selectedPrediction?.target ?? latestTarget?.target ?? null) }}
                    </span>
                  </div>

                  <div class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] p-3">
                    <svg class="h-56 w-full overflow-visible" viewBox="0 0 760 220" preserveAspectRatio="none" role="img" aria-label="Forecast chart">
                      <defs>
                        <linearGradient id="marketForecastFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stop-color="var(--app-primary)" stop-opacity="0.22" />
                          <stop offset="100%" stop-color="var(--app-primary)" stop-opacity="0.02" />
                        </linearGradient>
                      </defs>
                      <path v-if="forecastPath" :d="`${forecastPath} L 760 220 L 0 220 Z`" fill="url(#marketForecastFill)" />
                      <path v-if="forecastPath" :d="forecastPath" fill="none" stroke="var(--app-primary)" stroke-width="4" stroke-linecap="round" />
                    </svg>
                    <div class="mt-2 flex h-20 items-end gap-1 border-t border-[var(--app-border-muted)] pt-3">
                      <span v-for="bar in forecastBars" :key="bar.id" class="flex-1 rounded-t bg-[var(--app-primary-soft)]" :style="{ height: `${bar.height}px` }" />
                    </div>
                  </div>

                  <div class="mt-3 grid gap-2 md:grid-cols-3">
                    <div v-for="row in detail.analystTargets.slice(-3)" :key="`${row.date}-${row.target}`" class="rounded-md border border-[var(--app-border-muted)] px-3 py-2">
                      <p class="text-xs font-semibold text-[var(--app-text-muted)]">{{ row.date }}</p>
                      <p class="mt-1 text-sm font-bold text-[var(--app-text)]">{{ targetSummaryText(row) }}</p>
                    </div>
                  </div>
                </section>

                <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]">
                  <div class="border-b border-[var(--app-border)] p-4">
                    <h2 class="flex items-center gap-2 text-lg font-extrabold">
                      Analyst Consensus
                      <Users :size="18" class="text-[var(--app-text-muted)]" />
                    </h2>
                  </div>
                  <div class="space-y-3 p-4">
                    <div v-for="item in detail.analystConsensus" :key="item.label" class="grid grid-cols-[88px_minmax(0,1fr)_72px] items-center gap-3 text-sm">
                      <span class="font-semibold text-[var(--app-text-secondary)]">{{ item.label }}</span>
                      <span class="h-3 overflow-hidden rounded-full bg-[var(--app-border-muted)]">
                        <span class="block h-full rounded-full" :style="{ width: `${Math.max(0, Math.min(100, item.percent ?? 0))}%`, backgroundColor: item.color }" />
                      </span>
                      <span class="text-right font-extrabold">{{ item.percent === null ? '—' : `${item.percent}%` }} ({{ item.count ?? 0 }})</span>
                    </div>
                  </div>

                  <div class="border-t border-[var(--app-border)] p-4">
                    <h2 class="mb-2 text-lg font-extrabold">Company Stats</h2>
                    <div class="space-y-2">
                      <div v-for="metric in detail.profile.companyStats" :key="metric.label" class="flex items-center justify-between border-b border-[var(--app-border-muted)] pb-2 text-sm last:border-0 last:pb-0">
                        <span class="font-semibold text-[var(--app-text-secondary)]">{{ metric.label }}</span>
                        <span class="font-extrabold" :class="metricToneClass(metric)">{{ metric.value }}</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
                <button class="mb-2 inline-flex items-center gap-2 text-lg font-extrabold" type="button" @click="profileExpanded = !profileExpanded">
                  <Building2 :size="18" class="text-[var(--app-primary)]" />
                  Company Profile
                  <ChevronDown :size="16" class="transition" :class="{ 'rotate-180': profileExpanded }" />
                </button>
                <p class="text-sm leading-6 text-[var(--app-text-secondary)]">{{ visibleDescription }}</p>
                <button v-if="(profile?.description ?? '').length >= 210" class="mt-2 text-sm font-bold text-[var(--app-primary)]" type="button" @click="profileExpanded = !profileExpanded">
                  {{ profileExpanded ? 'Show less' : 'Show more' }}
                </button>
              </section>

              <section>
                <h2 class="mb-2 text-lg font-extrabold">Research Snapshot</h2>
                <div class="grid gap-3 xl:grid-cols-4">
                  <div class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
                    <h3 class="mb-3 flex items-center gap-2 font-extrabold"><LineChart :size="20" class="text-[var(--app-primary)]" /> Earnings</h3>
                    <div class="flex h-24 items-end gap-2 overflow-hidden border-b border-[var(--app-border-muted)] pb-2">
                      <span v-for="row in earningsChartRows" :key="row.period" class="flex h-full flex-1 items-end justify-center gap-1">
                        <span class="min-h-1 flex-1 rounded-t bg-[var(--app-primary-soft)]" :style="{ height: `${barHeight(row.estimatedEps, earningsChartRows.map((item) => item.estimatedEps), 78)}px` }" />
                        <span class="min-h-1 flex-1 rounded-t bg-[var(--app-primary)]" :style="{ height: `${barHeight(row.actualEps, earningsChartRows.map((item) => item.actualEps), 78)}px` }" />
                      </span>
                    </div>
                    <RouterLink class="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--app-primary)]" :to="{ query: { ...route.query, tab: 'earnings' } }">View details <ArrowRight :size="15" /></RouterLink>
                  </div>

                  <div class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
                    <h3 class="mb-3 flex items-center gap-2 font-extrabold"><BarChart3 :size="20" class="text-[var(--app-primary)]" /> Financials</h3>
                    <div class="flex h-24 items-end gap-2 border-b border-[var(--app-border-muted)] pb-2">
                      <span v-for="row in financialChartRows" :key="row.period" class="flex-1 rounded-t bg-[var(--app-primary)]" :style="{ height: `${barHeight(row.revenue, financialChartRows.map((item) => item.revenue), 82)}px` }" />
                    </div>
                    <p class="mt-3 text-sm text-[var(--app-text-muted)]">Revenue {{ tableCurrency(latestFinancial?.revenue ?? null) }}</p>
                    <RouterLink class="mt-2 inline-flex items-center gap-2 text-sm font-bold text-[var(--app-primary)]" :to="{ query: { ...route.query, tab: 'financials' } }">View details <ArrowRight :size="15" /></RouterLink>
                  </div>

                  <div class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
                    <h3 class="mb-3 flex items-center gap-2 font-extrabold"><Database :size="20" class="text-[var(--app-primary)]" /> Cash Flow</h3>
                    <div class="space-y-3 text-sm">
                      <div class="flex justify-between"><span>Operating Cash Flow</span><b>{{ tableCurrency(latestCashFlow?.operatingCashFlow ?? null) }}</b></div>
                      <div class="flex justify-between"><span>Free Cash Flow</span><b>{{ tableCurrency(latestCashFlow?.freeCashFlow ?? null) }}</b></div>
                      <div class="flex justify-between"><span>Cash Balance</span><b>{{ tableCurrency(latestCashFlow?.cashBalance ?? null) }}</b></div>
                    </div>
                    <RouterLink class="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--app-primary)]" :to="{ query: { ...route.query, tab: 'cashFlow' } }">View details <ArrowRight :size="15" /></RouterLink>
                  </div>

                  <div class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
                    <h3 class="mb-3 flex items-center gap-2 font-extrabold"><FileText :size="20" class="text-[var(--app-primary)]" /> Ownership & Filings</h3>
                    <div class="space-y-3 text-sm">
                      <RouterLink class="flex justify-between hover:text-[var(--app-primary)]" :to="{ query: { ...route.query, tab: 'ownership' } }"><span>Ownership</span><ArrowRight :size="15" /></RouterLink>
                      <RouterLink class="flex justify-between hover:text-[var(--app-primary)]" :to="{ query: { ...route.query, tab: 'news' } }"><span>Latest News</span><ArrowRight :size="15" /></RouterLink>
                      <RouterLink class="flex justify-between hover:text-[var(--app-primary)]" :to="{ query: { ...route.query, tab: 'sec' } }"><span>SEC Filings</span><ArrowRight :size="15" /></RouterLink>
                    </div>
                    <p class="mt-4 text-xs text-[var(--app-text-muted)]">{{ detail.news.length }} news items · {{ detail.sec.length }} filings</p>
                  </div>
                </div>
              </section>
            </section>

            <section v-else class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
              <template v-if="activeTab === 'chart'">
                <h2 class="mb-3 text-lg font-extrabold">Price & Forecast</h2>
                <div class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] p-3">
                  <svg class="h-72 w-full overflow-visible" viewBox="0 0 760 220" preserveAspectRatio="none">
                    <path v-if="forecastPath" :d="forecastPath" fill="none" stroke="var(--app-primary)" stroke-width="4" stroke-linecap="round" />
                  </svg>
                </div>
              </template>

              <template v-else-if="activeTab === 'analysts'">
                <h2 class="mb-3 text-lg font-extrabold">Analyst Price Targets</h2>
                <div class="overflow-hidden rounded-md border border-[var(--app-border)]">
                  <table class="min-w-full text-left text-sm">
                    <thead class="bg-[var(--app-surface-muted)]"><tr><th class="px-3 py-2">Date</th><th class="px-3 py-2">Target</th><th class="px-3 py-2">Min</th><th class="px-3 py-2">Max</th><th class="px-3 py-2">Reports</th><th class="px-3 py-2">Accuracy</th></tr></thead>
                    <tbody>
                      <tr v-for="row in detail.analystTargets" :key="`${row.date}-${row.target}`" class="border-t border-[var(--app-border-muted)]"><td class="px-3 py-2">{{ row.date }}</td><td class="px-3 py-2 font-bold">{{ formatMarketCurrency(row.target) }}</td><td class="px-3 py-2">{{ formatMarketCurrency(row.minPrice) }}</td><td class="px-3 py-2">{{ formatMarketCurrency(row.maxPrice) }}</td><td class="px-3 py-2">{{ row.reportCount ?? '—' }}</td><td class="px-3 py-2">{{ formatMarketPercent(row.accuracy) }}</td></tr>
                    </tbody>
                  </table>
                </div>
              </template>

              <template v-else-if="activeTab === 'earnings'">
                <h2 class="mb-3 text-lg font-extrabold">Earnings History</h2>
                <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  <div v-for="row in detail.earnings" :key="row.period" class="rounded-md border border-[var(--app-border-muted)] p-3 text-sm">
                    <p class="font-extrabold">{{ row.period }}</p>
                    <p>Estimated EPS: <b>{{ formatMarketCurrency(row.estimatedEps) }}</b></p>
                    <p>Actual EPS: <b>{{ formatMarketCurrency(row.actualEps) }}</b></p>
                    <p>Revenue: <b>{{ tableCurrency(row.actualRevenue) }}</b></p>
                  </div>
                </div>
              </template>

              <template v-else-if="activeTab === 'financials'">
                <h2 class="mb-3 text-lg font-extrabold">Financials</h2>
                <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  <div v-for="row in detail.financials" :key="row.period" class="rounded-md border border-[var(--app-border-muted)] p-3 text-sm">
                    <p class="font-extrabold">{{ row.period }}</p>
                    <p>Revenue: <b>{{ tableCurrency(row.revenue) }}</b></p>
                    <p>Net Income: <b>{{ tableCurrency(row.netIncome) }}</b></p>
                    <p>EBITDA: <b>{{ tableCurrency(row.ebitda) }}</b></p>
                  </div>
                </div>
              </template>

              <template v-else-if="activeTab === 'balanceSheet'">
                <h2 class="mb-3 text-lg font-extrabold">Balance Sheet</h2>
                <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <div class="rounded-md border border-[var(--app-border-muted)] p-3"><p class="text-xs text-[var(--app-text-muted)]">Total Assets</p><b>{{ tableCurrency(latestBalance?.totalAssets ?? null) }}</b></div>
                  <div class="rounded-md border border-[var(--app-border-muted)] p-3"><p class="text-xs text-[var(--app-text-muted)]">Total Liabilities</p><b>{{ tableCurrency(latestBalance?.totalLiabilities ?? null) }}</b></div>
                  <div class="rounded-md border border-[var(--app-border-muted)] p-3"><p class="text-xs text-[var(--app-text-muted)]">Total Equity</p><b>{{ tableCurrency(latestBalance?.totalEquity ?? null) }}</b></div>
                  <div class="rounded-md border border-[var(--app-border-muted)] p-3"><p class="text-xs text-[var(--app-text-muted)]">Current Ratio</p><b>{{ latestBalance?.currentRatio ?? '—' }}</b></div>
                </div>
              </template>

              <template v-else-if="activeTab === 'cashFlow'">
                <h2 class="mb-3 text-lg font-extrabold">Cash Flow</h2>
                <div class="grid gap-2 md:grid-cols-3">
                  <div v-for="row in detail.cashFlow" :key="row.period" class="rounded-md border border-[var(--app-border-muted)] p-3 text-sm">
                    <p class="font-extrabold">{{ row.period }}</p>
                    <p>Operating: <b>{{ tableCurrency(row.operatingCashFlow) }}</b></p>
                    <p>Free Cash Flow: <b>{{ tableCurrency(row.freeCashFlow) }}</b></p>
                    <p>Cash Balance: <b>{{ tableCurrency(row.cashBalance) }}</b></p>
                  </div>
                </div>
              </template>

              <template v-else-if="activeTab === 'ownership'">
                <h2 class="mb-3 text-lg font-extrabold">Ownership</h2>
                <div class="grid gap-3 md:grid-cols-3">
                  <div v-for="panel in detail.ownershipPanels" :key="panel.title" class="rounded-md border border-[var(--app-border-muted)] p-3">
                    <h3 class="mb-2 font-extrabold">{{ panel.title }}</h3>
                    <div v-for="metric in panel.metrics" :key="metric.label" class="flex justify-between gap-3 border-t border-[var(--app-border-muted)] py-2 text-sm first:border-0">
                      <span class="text-[var(--app-text-secondary)]">{{ metric.label }}</span><b>{{ metric.value }}</b>
                    </div>
                  </div>
                </div>
              </template>

              <template v-else-if="activeTab === 'news'">
                <h2 class="mb-3 flex items-center gap-2 text-lg font-extrabold"><Newspaper :size="20" /> Latest News</h2>
                <div class="space-y-2">
                  <a v-for="item in detail.news" :key="item.id" class="block rounded-md border border-[var(--app-border-muted)] p-3 hover:bg-[var(--app-surface-soft)]" :href="item.url" target="_blank" rel="noopener noreferrer">
                    <p class="font-extrabold">{{ item.title }}</p>
                    <p class="mt-1 text-xs text-[var(--app-text-muted)]">{{ item.date }} · {{ sourceLabel(item) }}</p>
                  </a>
                  <p v-if="!detail.news.length" class="py-8 text-center text-sm text-[var(--app-text-muted)]">No news found</p>
                </div>
              </template>

              <template v-else-if="activeTab === 'sec'">
                <h2 class="mb-3 text-lg font-extrabold">SEC Filings</h2>
                <div class="space-y-2">
                  <a v-for="item in detail.sec" :key="item.id" class="block rounded-md border border-[var(--app-border-muted)] p-3 hover:bg-[var(--app-surface-soft)]" :href="item.url" target="_blank" rel="noopener noreferrer">
                    <p class="font-extrabold">{{ item.type }} · {{ item.description }}</p>
                    <p class="mt-1 text-xs text-[var(--app-text-muted)]">{{ item.date }}</p>
                  </a>
                  <p v-if="!detail.sec.length" class="py-8 text-center text-sm text-[var(--app-text-muted)]">No SEC filings found</p>
                </div>
              </template>
            </section>
          </template>
        </section>
      </section>
    </main>
  </div>
</template>

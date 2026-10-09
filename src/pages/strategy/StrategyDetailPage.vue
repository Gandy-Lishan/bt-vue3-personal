<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  ChevronLeft,
  FileText,
  Image as ImageIcon,
  LineChart,
  Star,
} from '@lucide/vue'
import {
  addStrategyFavorite,
  fetchStrategyDetail,
  fetchStrategyPairPrices,
  fetchStrategySignals,
  fetchStrategySummaries,
  removeStrategyFavorite,
} from '@/entities/strategy/api/strategy.api'
import {
  formatStrategyInteger,
  formatStrategyNumber,
  formatStrategyPercent,
  mergeStrategyRows,
  normalizeStrategyDescriptionHtml,
  strategySearchScore,
  strategyChartSeriesFromPrices,
} from '@/entities/strategy/model/strategy.adapter'
import { findStrategyBacktestInfoByName } from '@/entities/strategy/model/strategy.backtest-info'
import type {
  StrategyChartSeries,
  StrategyDetail,
  StrategyPerformanceRow,
  StrategyRow,
  StrategySignalRow,
  StrategySummaryRow,
} from '@/entities/strategy/model/strategy.types'
import DetailSearchSidebar from '@/shared/ui/DetailSearchSidebar.vue'
import ImageLightboxGrid from '@/shared/ui/ImageLightboxGrid.vue'
import StrategySignalChart from './ui/StrategySignalChart.vue'

type StrategyMetric = {
  label: string
  value: string
  tone?: 'positive' | 'negative' | 'primary'
}

type StrategyImagePanel = {
  key: string
  label: string
  description: string
  url: string
}

const route = useRoute()
const signalRows = ref<StrategySignalRow[]>([])
const summaryRows = ref<StrategySummaryRow[]>([])
const rows = ref<StrategyRow[]>([])
const detail = ref<StrategyDetail | null>(null)
const signalChartSeries = ref<StrategyChartSeries[]>([])
const loading = ref(false)
const listLoading = ref(false)
const chartLoading = ref(false)
const listSearchQuery = ref('')
const activePerformanceId = ref('')
const favoriteLoading = ref(false)
let abortController: AbortController | null = null
let chartAbortController: AbortController | null = null

const selectedUrl = computed(() => queryText(route.query.url) || queryText(route.params.url))
const routeName = computed(() => queryText(route.query.name))
const routeFrequency = computed(() => queryText(route.query.frequency))
const selectedRow = computed(() => rows.value.find((row) => row.url === selectedUrl.value) ?? null)
const signal = computed(() => detail.value?.signal ?? selectedRow.value?.signal ?? null)
const summary = computed(() => detail.value?.summary ?? selectedRow.value?.summary ?? null)
const strategyName = computed(() => detail.value?.modelName || routeName.value || selectedUrl.value || 'Strategy')
const strategyFrequency = computed(() => signal.value?.frequency || routeFrequency.value || '—')
const activePerformance = computed(
  () => detail.value?.performances.find((row) => row.id === activePerformanceId.value) ?? detail.value?.performances[0] ?? null,
)
const descriptionHtml = computed(
  () => detail.value?.descriptionHtml || normalizeStrategyDescriptionHtml(signal.value?.raw.description),
)
const backtestInfo = computed(() => findStrategyBacktestInfoByName(strategyName.value))
const annualReturnRows = computed(() =>
  (detail.value?.performances ?? []).map((row) => ({
    id: row.id,
    label: annualReturnLabel(row),
    cagr: row.cagr,
  })),
)

const sidebarItems = computed(() => {
  const query = listSearchQuery.value.trim()
  const sourceRows = rows.value.length ? rows.value : selectedRow.value ? [selectedRow.value] : []

  return sourceRows
    .map((row, index) => ({ row, index, score: query ? strategySearchScore(row, query) : 0 }))
    .filter(({ score }) => score !== null)
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0) || left.index - right.index)
    .map(({ row }) => ({
      id: row.url,
      label: row.modelName,
      to: {
        name: 'strategy-detail-legacy',
        query: {
          url: row.url,
          name: row.modelName,
          frequency: row.signal.frequency || undefined,
        },
      },
      active: row.url === selectedUrl.value,
      favorite: row.signal.favorite,
    }))
})

const topMetrics = computed<StrategyMetric[]>(() => [
  { label: 'Current Signal', value: signal.value?.currentSignal ?? '—', tone: 'primary' },
  { label: 'YTD Return', value: formatStrategyPercent(signal.value?.ytdReturn ?? activePerformance.value?.ytdReturn ?? null), tone: valueTone(signal.value?.ytdReturn ?? activePerformance.value?.ytdReturn ?? null) },
  { label: 'Strategy CAGR', value: formatStrategyPercent(summary.value?.cagr ?? activePerformance.value?.cagr ?? null), tone: valueTone(summary.value?.cagr ?? activePerformance.value?.cagr ?? null) },
  { label: 'Benchmark CAGR', value: formatStrategyPercent(summary.value?.benchmarkCagr ?? activePerformance.value?.benchmarkCagr ?? null) },
])

const detailMeta = computed(() => [
  { label: 'Category', value: signal.value?.category || '—' },
  { label: 'Time Frame', value: signal.value?.timeFrame || '—' },
  { label: 'Update Schedule', value: strategyFrequency.value },
  { label: 'Last Signal', value: signal.value?.lastSignalDate || '—' },
])

const performanceMetricGroups = computed(() => {
  const row = activePerformance.value
  return [
    {
      title: 'Return',
      metrics: [
        { label: 'Strategy CAGR', value: formatStrategyPercent(row?.cagr ?? null), tone: valueTone(row?.cagr ?? null) },
        { label: 'Benchmark CAGR', value: formatStrategyPercent(row?.benchmarkCagr ?? null) },
        { label: 'Net Profit', value: formatStrategyPercent(row?.netProfit ?? null), tone: valueTone(row?.netProfit ?? null) },
        { label: 'YTD Return', value: formatStrategyPercent(row?.ytdReturn ?? null), tone: valueTone(row?.ytdReturn ?? null) },
      ],
    },
    {
      title: 'Risk',
      metrics: [
        { label: 'Max Drawdown', value: formatStrategyPercent(row?.maxDrawdown ?? null), tone: 'negative' as const },
        { label: 'Sharpe Ratio', value: formatStrategyNumber(row?.sharpeRatio ?? null, 2) },
        { label: 'Information Ratio', value: formatStrategyNumber(row?.informationRatio ?? null, 2) },
        { label: 'Expectancy', value: formatStrategyNumber(row?.expectancy ?? null, 2), tone: valueTone(row?.expectancy ?? null) },
      ],
    },
    {
      title: 'Trades',
      metrics: [
        { label: 'Total Trades', value: formatStrategyInteger(row?.totalTrades ?? null) },
        { label: 'Trades / Year', value: formatStrategyNumber(row?.tradesPerYear ?? null, 2) },
        { label: 'Win Rate', value: formatStrategyPercent(row?.winRate ?? null) },
        { label: 'Profit / Loss', value: formatProfitLossRatio(row?.profitLossRatio ?? null) },
        { label: 'Average Win', value: formatStrategyPercent(row?.averageWin ?? null), tone: valueTone(row?.averageWin ?? null) },
        { label: 'Average Loss', value: formatStrategyPercent(row?.averageLoss ?? null), tone: valueTone(row?.averageLoss ?? null) },
      ],
    },
  ]
})

const performanceImages = computed<StrategyImagePanel[]>(() => {
  const row = activePerformance.value
  if (!row) return []

  const panels: StrategyImagePanel[] = [
    {
      key: 'returnsUrl',
      label: 'Returns',
      description: 'Strategy returns are shown in blue and benchmark returns are shown in gray.',
      url: row.returnsUrl,
    },
    {
      key: 'drawdownUrl',
      label: 'Drawdown',
      description: 'Drawdown shows historical peak-to-trough pressure for the model and benchmark.',
      url: row.drawdownUrl,
    },
    {
      key: 'heatmapUrl',
      label: 'Monthly Heatmap',
      description: 'Monthly return distribution across the backtest window.',
      url: row.heatmapUrl,
    },
    {
      key: 'annualReturnsUrl',
      label: 'Annual Returns',
      description: 'Year-by-year returns for the model variant.',
      url: row.annualReturnsUrl,
    },
  ]

  return panels.filter((item) => item.url)
})

const transactionImages = computed<StrategyImagePanel[]>(() => {
  const row = activePerformance.value
  if (!row?.tradeTableUrl) return []

  return [
    {
      key: 'tradeTableUrl',
      label: 'Recent Transactions',
      description: 'The 10 most recent transactions for the selected model variant.',
      url: row.tradeTableUrl,
    },
  ]
})

function queryText(value: unknown) {
  if (Array.isArray(value)) return String(value[0] ?? '').trim()
  return String(value ?? '').trim()
}

function syncRows() {
  rows.value = mergeStrategyRows(signalRows.value, summaryRows.value)
}

async function loadStrategyRows(signal?: AbortSignal) {
  if (signalRows.value.length || listLoading.value) return

  listLoading.value = true
  try {
    signalRows.value = await fetchStrategySignals(signal)
    summaryRows.value = await fetchStrategySummaries(signalRows.value, signal)
    syncRows()
  } finally {
    listLoading.value = false
  }
}

async function loadDetail() {
  const url = selectedUrl.value
  abortController?.abort()

  if (!url) {
    detail.value = null
    return
  }

  const controller = new AbortController()
  abortController = controller
  loading.value = true

  try {
    await loadStrategyRows(controller.signal)
    const linkedRow = rows.value.find((row) => row.url === url)
    const nextDetail = await fetchStrategyDetail(
      url,
      {
        name: routeName.value || linkedRow?.modelName,
        signals: signalRows.value,
        summaries: summaryRows.value,
      },
      controller.signal,
    )

    if (controller.signal.aborted) return
    detail.value = nextDetail
    activePerformanceId.value = nextDetail.performances[0]?.id ?? ''
  } finally {
    if (abortController === controller) loading.value = false
  }
}

function todayDateLabel() {
  const date = new Date()
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`
}

async function loadSignalChart() {
  const row = activePerformance.value
  chartAbortController?.abort()
  signalChartSeries.value = []

  if (!row?.symbol1 || !row.startDate || row.startDate === '—') return

  const controller = new AbortController()
  chartAbortController = controller
  chartLoading.value = true

  try {
    const endDate = todayDateLabel()
    const frequency = strategyFrequency.value === '—' ? 'Daily' : strategyFrequency.value
    const firstPrices = await fetchStrategyPairPrices(row.symbol1, row.startDate, endDate, frequency, controller.signal)
    const nextSeries: StrategyChartSeries[] = []
    const firstSeries = strategyChartSeriesFromPrices(row.symbol1, firstPrices, row.buySignal1, row.sellSignal1)
    if (firstSeries) nextSeries.push(firstSeries)

    if (row.singleModel === 'False' && row.symbol2) {
      const secondPrices = await fetchStrategyPairPrices(row.symbol2, row.startDate, endDate, frequency, controller.signal)
      const secondSeries = strategyChartSeriesFromPrices(row.symbol2, secondPrices, row.buySignal2, row.sellSignal2)
      if (secondSeries) nextSeries.push(secondSeries)
    }

    if (!controller.signal.aborted) signalChartSeries.value = nextSeries
  } finally {
    if (chartAbortController === controller) chartLoading.value = false
  }
}

function setActivePerformance(id: string) {
  activePerformanceId.value = id
}

function valueTone(value: number | null | undefined): StrategyMetric['tone'] {
  if (value === null || value === undefined) return undefined
  return value < 0 ? 'negative' : 'positive'
}

function metricToneClass(tone: StrategyMetric['tone']) {
  if (tone === 'positive') return 'text-[var(--app-positive)]'
  if (tone === 'negative') return 'text-[var(--app-negative)]'
  if (tone === 'primary') return 'text-[var(--app-primary)]'
  return 'text-[var(--app-text)]'
}

function formatProfitLossRatio(value: StrategyPerformanceRow['profitLossRatio']) {
  if (typeof value === 'string') return value
  return formatStrategyNumber(value, 2)
}

function performanceLabel(row: StrategyPerformanceRow) {
  if (row.symbolNotLong === 'CASH') return 'Model'
  return `Model - ${row.symbolNotLong}`
}

function annualReturnLabel(row: StrategyPerformanceRow) {
  const symbolLabels: Record<string, string> = {
    SH: '(long/short)',
    PSQ: '(long/short)',
    AGG: '(Multi-Asset Aggregate Bonds)',
    LQD: '(Multi-Asset Corporate Bonds)',
    TLT: '(Multi-Asset Treasury Bonds)',
    GLD: '(Gold)',
  }

  if (row.symbolNotLong === 'CASH') return 'Model'
  const suffix = symbolLabels[row.symbolNotLong]
  return suffix ? `Model ${suffix} - ${row.symbolNotLong}` : `Model - ${row.symbolNotLong}`
}

function displayMonthYear(row: StrategyPerformanceRow | null) {
  if (!row?.endTimestamp) return row?.endDate ?? '—'
  return new Date(row.endTimestamp).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

function performanceDateRange(row: StrategyPerformanceRow | null) {
  if (!row) return '—'
  return `${row.startDate} to ${row.endDate}`
}

function setFavoriteForUrl(url: string, favorite: boolean) {
  signalRows.value = signalRows.value.map((row) => (row.url === url ? { ...row, favorite } : row))
  summaryRows.value = summaryRows.value.map((row) => (row.url === url ? { ...row, favorite } : row))
  syncRows()
  if (detail.value?.signal?.url === url) {
    detail.value = {
      ...detail.value,
      signal: { ...detail.value.signal, favorite },
      summary: detail.value.summary ? { ...detail.value.summary, favorite } : detail.value.summary,
    }
  }
}

async function toggleFavoriteForRow(row: StrategySignalRow | null | undefined) {
  if (!row || favoriteLoading.value) return

  favoriteLoading.value = true
  const ok = row.favorite ? await removeStrategyFavorite(row.url) : await addStrategyFavorite(row.url)
  if (ok) setFavoriteForUrl(row.url, !row.favorite)
  favoriteLoading.value = false
}

function toggleFavorite() {
  void toggleFavoriteForRow(signal.value)
}

function toggleSidebarFavorite(url: string) {
  const row = signalRows.value.find((item) => item.url === url) ?? (signal.value?.url === url ? signal.value : null)
  void toggleFavoriteForRow(row)
}

watch(selectedUrl, () => {
  void loadDetail()
}, { immediate: true })

watch(
  () => [activePerformance.value?.id, strategyFrequency.value],
  () => {
    void loadSignalChart()
  },
)

onBeforeUnmount(() => {
  abortController?.abort()
  chartAbortController?.abort()
})
</script>

<template>
  <div class="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
    <main class="px-[var(--page-gutter)] pb-8 pt-6">
      <section class="grid items-start gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
        <DetailSearchSidebar
          class="order-2 xl:order-1"
          v-model="listSearchQuery"
          title="Strategy List"
          placeholder="Search strategies..."
          empty-message="No strategies found"
          :items="sidebarItems"
        >
          <template #action="{ item }">
            <button
              class="mt-0.5 shrink-0 transition"
              :class="item.favorite ? 'text-[var(--app-favorite)]' : 'text-[var(--app-text-faint)] hover:text-[var(--app-favorite)]'"
              type="button"
              :disabled="favoriteLoading"
              :title="item.favorite ? 'Remove favorite strategy' : 'Add favorite strategy'"
              :aria-label="item.favorite ? 'Remove favorite strategy' : 'Add favorite strategy'"
              @click="toggleSidebarFavorite(String(item.id))"
            >
              <Star :size="16" :fill="item.favorite ? 'var(--app-favorite)' : 'transparent'" />
            </button>
          </template>
        </DetailSearchSidebar>

        <section class="order-1 min-w-0 space-y-3 xl:order-2">
          <section v-if="!selectedUrl" class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-sm text-[var(--app-text-muted)]">
            Missing strategy URL.
          </section>

          <template v-else>
            <section class="strategy-summary">
              <nav class="strategy-detail-breadcrumb" aria-label="Strategy breadcrumb">
                <RouterLink class="strategy-detail-breadcrumb__back" :to="{ name: 'strategy' }">
                  <ChevronLeft :size="16" />
                  Back to Strategy List
                </RouterLink>
                <span class="strategy-detail-breadcrumb__divider" />
                <span class="strategy-detail-breadcrumb__item">Strategy</span>
              </nav>

              <div class="strategy-summary__header">
                <h1 class="strategy-summary__title">{{ strategyName }}</h1>
                <button
                  class="strategy-summary__favorite"
                  :class="{ 'strategy-summary__favorite--active': signal?.favorite }"
                  type="button"
                  :disabled="!signal || favoriteLoading"
                  :aria-label="signal?.favorite ? 'Remove favorite strategy' : 'Add favorite strategy'"
                  :title="signal?.favorite ? 'Remove favorite strategy' : 'Add favorite strategy'"
                  @click="toggleFavorite"
                >
                  <Star :size="24" :fill="signal?.favorite ? 'var(--app-favorite)' : 'transparent'" />
                </button>
              </div>

              <div class="strategy-summary__meta-row">
                <span v-for="meta in detailMeta" :key="meta.label" class="indicator-summary-pill">
                  <span class="indicator-summary-pill__label">{{ meta.label }}:</span>
                  <span class="indicator-summary-pill__value">{{ meta.value }}</span>
                </span>
              </div>

              <div class="strategy-summary__stats">
                <div v-for="metric in topMetrics" :key="metric.label" class="strategy-stat-card">
                  <p class="strategy-stat-card__label">{{ metric.label }}</p>
                  <p class="strategy-stat-card__value" :class="metricToneClass(metric.tone)">
                    {{ metric.value }}
                  </p>
                </div>
              </div>
            </section>

            <div v-if="loading" class="flex min-h-80 items-center justify-center rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] text-sm text-[var(--app-text-muted)]">
              Loading strategy detail...
            </div>

            <template v-else>
              <StrategySignalChart :series="signalChartSeries" :loading="chartLoading" />

              <section class="grid gap-3">
                <article class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
                  <div class="mb-3 flex items-center gap-2">
                    <FileText :size="19" class="text-[var(--app-primary)]" />
                    <h2 class="text-lg font-extrabold">Strategy Description</h2>
                  </div>
                  <div v-if="descriptionHtml" class="strategy-description text-sm leading-6 text-[var(--app-text-secondary)]" v-html="descriptionHtml" />
                  <p v-else class="py-10 text-center text-sm text-[var(--app-text-muted)]">No description found.</p>

                  <section v-if="activePerformance" class="mt-5 border-t border-[var(--app-border-muted)] pt-4">
                    <h3 class="text-base font-extrabold text-[var(--app-text)]">
                      Use BacktestEdge 2.0 to see more details of this strategy,
                      <RouterLink to="/backtests" class="text-[var(--app-primary)] hover:underline">click here</RouterLink>.
                    </h3>
                    <details open class="mt-3 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)]">
                      <summary class="cursor-pointer select-none px-4 py-3 text-sm font-bold text-[var(--app-text-secondary)] hover:text-[var(--app-primary)]">
                        Backtest details
                      </summary>
                      <div class="space-y-4 px-4 pb-4">
                        <dl v-if="backtestInfo" class="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                          <div>
                            <dt class="text-xs font-semibold text-[var(--app-text-muted)]">Strategy Type</dt>
                            <dd class="mt-1 font-bold text-[var(--app-text-secondary)]">{{ backtestInfo.strategy }}</dd>
                          </div>
                          <div>
                            <dt class="text-xs font-semibold text-[var(--app-text-muted)]">Symbols</dt>
                            <dd class="mt-1 font-bold text-[var(--app-text-secondary)]">{{ backtestInfo.symbols }}</dd>
                          </div>
                          <div>
                            <dt class="text-xs font-semibold text-[var(--app-text-muted)]">Benchmark</dt>
                            <dd class="mt-1 font-bold text-[var(--app-text-secondary)]">{{ backtestInfo.benchmark }}</dd>
                          </div>
                          <div>
                            <dt class="text-xs font-semibold text-[var(--app-text-muted)]">Frequency</dt>
                            <dd class="mt-1 font-bold text-[var(--app-text-secondary)]">{{ backtestInfo.frequency }}</dd>
                          </div>
                          <div>
                            <dt class="text-xs font-semibold text-[var(--app-text-muted)]">Capital</dt>
                            <dd class="mt-1 font-bold text-[var(--app-text-secondary)]">{{ backtestInfo.capital }}</dd>
                          </div>
                        </dl>

                        <div v-if="backtestInfo?.groups.length" class="grid gap-3 lg:grid-cols-2">
                          <article
                            v-for="group in backtestInfo.groups"
                            :key="group.label"
                            class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)] p-3"
                          >
                            <div class="mb-3 flex flex-wrap items-center gap-2">
                              <h4 class="text-sm font-extrabold text-[var(--app-text)]">{{ group.label }}</h4>
                              <span class="rounded border border-[var(--app-border-muted)] px-2 py-0.5 text-xs font-bold text-[var(--app-text-secondary)]">{{ group.symbol }}</span>
                              <span class="rounded border border-[var(--app-border-muted)] px-2 py-0.5 text-xs font-bold text-[var(--app-text-secondary)]">{{ group.direction }}</span>
                            </div>

                            <div class="grid gap-3 md:grid-cols-2">
                              <section>
                                <h5 class="text-xs font-extrabold uppercase tracking-wide text-[var(--app-positive)]">Entry</h5>
                                <ul class="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-5 text-[var(--app-text-secondary)]">
                                  <li v-for="line in group.entries" :key="line">{{ line }}</li>
                                </ul>
                              </section>
                              <section>
                                <h5 class="text-xs font-extrabold uppercase tracking-wide text-[var(--app-negative)]">Exit</h5>
                                <ul class="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-5 text-[var(--app-text-secondary)]">
                                  <li v-for="line in group.exits" :key="line">{{ line }}</li>
                                </ul>
                              </section>
                            </div>
                          </article>
                        </div>

                        <div class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-primary-soft)] p-3 text-xs leading-5 text-[var(--app-text-secondary)]">
                          Historical returns include transaction fees in the source backtests and do not include slippage. Past performance is not indicative of future results.
                        </div>
                      </div>
                    </details>
                  </section>

                  <section v-if="activePerformance" class="mt-5 border-t border-[var(--app-border-muted)] pt-4">
                    <h3 class="text-base font-extrabold text-[var(--app-text)]">Performance</h3>
                    <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--app-text-secondary)]">
                      <li>Last updated {{ displayMonthYear(activePerformance) }}</li>
                      <li>
                        Backtest timeframe:
                        <strong>{{ performanceDateRange(activePerformance) }}</strong>.
                        NOTE: These dates were chosen to provide the same coverage across all signals and ETF's used in those signals and are dependant on ETF start dates.
                      </li>
                      <li>
                        For all backtests shown, we used active and accessible ETF's (e.g., SPY, QQQ, TLT, LQD, etc). The prices of these ETF's are split and dividend adjusted.
                      </li>
                      <li>
                        Shorting is performed by buying inverse ETFs. For these backtests, we used SH to short the S&amp;P500 and PSQ to short the NASDAQ. Using leveraged ETFs like SSO (2x) and UPRO (3x) may increase your returns and drawdowns.
                      </li>
                      <li>
                        Historical returns shown below include transaction fees of $1.5 per order (e.g., $3 per round-trip) but does not include slippage.
                      </li>
                    </ul>
                  </section>

                  <section v-if="annualReturnRows.length" class="mt-5 border-t border-[var(--app-border-muted)] pt-4">
                    <h3 class="text-base font-extrabold text-[var(--app-text)]">Model's average annual returns</h3>
                    <ol class="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6 text-[var(--app-text-secondary)]">
                      <li v-for="row in annualReturnRows" :key="row.id">
                        {{ row.label }}:
                        <strong :class="metricToneClass(valueTone(row.cagr))">{{ formatStrategyPercent(row.cagr) }}</strong>
                      </li>
                    </ol>
                  </section>
                </article>

                </section>

              <section v-if="detail?.performances.length" class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]">
                <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)] px-4 py-3">
                  <h2 class="text-base font-extrabold text-[var(--app-text)]">Performance Statistics</h2>
                  <div class="flex min-w-0 flex-wrap gap-2">
                    <button
                      v-for="row in detail.performances"
                      :key="row.id"
                      class="inline-flex h-8 shrink-0 items-center justify-center rounded-md border px-3 text-xs font-extrabold transition"
                      :class="activePerformance?.id === row.id ? 'border-[var(--app-primary)] bg-[var(--app-primary)] text-white' : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-secondary)] hover:border-[var(--app-primary)] hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]'"
                      type="button"
                      @click="setActivePerformance(row.id)"
                    >
                      {{ performanceLabel(row) }}
                    </button>
                  </div>
                </div>

                <div class="space-y-4 p-4">
                  <section class="grid gap-3 xl:grid-cols-3">
                    <article
                      v-for="group in performanceMetricGroups"
                      :key="group.title"
                      class="rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] p-4"
                    >
                      <h3 class="text-sm font-extrabold text-[var(--app-text)]">{{ group.title }}</h3>
                      <div class="mt-3 grid gap-3 sm:grid-cols-2">
                        <div v-for="metric in group.metrics" :key="metric.label" class="min-w-0">
                          <p class="truncate text-xs font-semibold text-[var(--app-text-muted)]">{{ metric.label }}</p>
                          <p class="mt-1 text-lg font-extrabold" :class="metricToneClass(metric.tone)">
                            {{ metric.value }}
                          </p>
                        </div>
                      </div>
                    </article>
                  </section>

                  <section v-if="transactionImages.length" class="space-y-3">
                    <div class="flex items-center gap-2">
                      <LineChart :size="18" class="text-[var(--app-primary)]" />
                      <h3 class="text-base font-extrabold">10 Most Recent Transactions</h3>
                    </div>

                    <div class="transaction-preview-column space-y-2">
                      <dl class="grid gap-x-3 gap-y-1.5 text-[0.6875rem] sm:grid-cols-2">
                        <div>
                          <dt class="font-semibold text-[var(--app-text-muted)]">Update Schedule</dt>
                          <dd class="mt-0.5 font-bold leading-4 text-[var(--app-text)]">{{ strategyFrequency }}</dd>
                        </div>
                        <div>
                          <dt class="font-semibold text-[var(--app-text-muted)]">Current Signal</dt>
                          <dd class="mt-0.5 font-bold leading-4 text-[var(--app-text)]">{{ signal?.currentSignal || '—' }}</dd>
                        </div>
                      </dl>

                      <ImageLightboxGrid :items="transactionImages" :columns="1" :show-meta="false" />
                    </div>
                  </section>

                  <section v-if="performanceImages.length" class="space-y-3">
                    <div class="flex items-center gap-2">
                      <ImageIcon :size="18" class="text-[var(--app-primary)]" />
                      <h3 class="text-base font-extrabold">Performance Charts</h3>
                    </div>
                    <ImageLightboxGrid :items="performanceImages" :columns="2" />
                  </section>
                </div>
              </section>

              <section v-else class="rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] p-8 text-center text-sm text-[var(--app-text-muted)]">
                No historical return details found for this strategy.
              </section>
            </template>
          </template>
        </section>
      </section>
    </main>
  </div>
</template>

<style scoped>
.strategy-summary {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  color: var(--app-text);
  padding: 10px 12px 12px;
}

.strategy-detail-breadcrumb {
  display: flex;
  min-height: 24px;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  color: var(--app-text-secondary);
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.2;
}

.strategy-detail-breadcrumb__back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--app-primary);
}

.strategy-detail-breadcrumb__back:hover {
  text-decoration: underline;
}

.strategy-detail-breadcrumb__divider {
  width: 1px;
  height: 14px;
  background: var(--app-border);
}

.strategy-summary__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.strategy-summary__title {
  min-width: 0;
  color: var(--app-text);
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.strategy-summary__favorite {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  color: var(--app-text-secondary);
  transition:
    background-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.strategy-summary__favorite:hover,
.strategy-summary__favorite:focus-visible {
  background: var(--app-primary-soft);
  color: var(--app-favorite);
  box-shadow: 0 0 0 3px var(--app-primary-shadow);
  outline: none;
}

.strategy-summary__favorite:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.strategy-summary__favorite--active,
.strategy-summary__favorite--active:hover,
.strategy-summary__favorite--active:focus-visible {
  color: var(--app-favorite);
}

.strategy-summary__meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  margin-bottom: 14px;
}

.strategy-summary__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  box-shadow: 0 1px 0 var(--app-border-muted);
}

.strategy-stat-card {
  display: flex;
  min-height: 58px;
  min-width: 0;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  border-left: 1px solid var(--app-border);
  padding: 10px 18px;
  text-align: left;
}

.strategy-stat-card:first-child {
  border-left: 0;
}

.strategy-stat-card__label {
  min-width: 0;
  color: var(--app-text-muted);
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.strategy-stat-card__value {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  color: var(--app-text);
  font-size: 1.0625rem;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.strategy-description :deep(p) {
  margin: 0 0 0.85rem;
}

.strategy-description :deep(h1),
.strategy-description :deep(h2),
.strategy-description :deep(h3),
.strategy-description :deep(h4) {
  margin: 1.1rem 0 0.55rem;
  color: var(--app-text);
  font-weight: 800;
}

.strategy-description :deep(ol),
.strategy-description :deep(ul) {
  margin: 0.6rem 0 0.9rem;
  padding-left: 1.4rem;
}

.strategy-description :deep(ol) {
  list-style: decimal;
}

.strategy-description :deep(ul) {
  list-style: disc;
}

.strategy-description :deep(li) {
  margin: 0.35rem 0;
}

.strategy-description :deep(a) {
  color: var(--app-primary);
  font-weight: 700;
  text-decoration: underline;
}

.transaction-preview-column {
  width: 100%;
  min-width: 0;
}

@media (min-width: 768px) {
  .transaction-preview-column {
    max-width: calc((100% - 12px) / 2);
  }
}

@media (max-width: 1024px) {
  .strategy-summary__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .strategy-stat-card {
    border-top: 1px solid var(--app-border);
    border-left: 0;
  }

  .strategy-stat-card:nth-child(-n + 2) {
    border-top: 0;
  }

  .strategy-stat-card:nth-child(2n) {
    border-left: 1px solid var(--app-border);
  }
}

@media (max-width: 640px) {
  .strategy-summary__header {
    gap: 12px;
  }

  .strategy-summary__title {
    font-size: 1.375rem;
  }

  .strategy-summary__stats {
    grid-template-columns: 1fr;
  }

  .strategy-stat-card,
  .strategy-stat-card:nth-child(2n) {
    border-left: 0;
  }

  .strategy-stat-card:nth-child(-n + 2) {
    border-top: 1px solid var(--app-border);
  }

  .strategy-stat-card:first-child {
    border-top: 0;
  }
}
</style>

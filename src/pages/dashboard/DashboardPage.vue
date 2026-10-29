<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, BarChart3, Bell, CircleHelp, Ellipsis, Eye, FileText, Info, ListFilter, RefreshCw, Star, Trophy } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { copyMySignal, fetchMySignals } from '@/entities/my-stuff/api/my-signal.api'
import type { MySignalRow } from '@/entities/my-stuff/model/my-signal.types'
import SignalPreviewModal from '@/pages/my-stuff/ui/SignalPreviewModal.vue'
import MySignalHeaderCell from '@/pages/my-stuff/ui/MySignalHeaderCell.vue'
import { mySignalHeaderColumns, type MySignalHeaderColumn } from '@/pages/my-stuff/ui/my-signal-table.columns'
import { fetchMyIndicators, type MyIndicatorRow } from '@/entities/my-stuff/api/user-indicator.api'
import IndicatorPreviewModal from '@/pages/my-stuff/ui/IndicatorPreviewModal.vue'
import { fetchReportFavorites } from '@/entities/report/api/report.api'
import type { ReportLibraryItem } from '@/entities/report/model/report.types'
import { fetchDashboardDate, fetchDashboardMarket, fetchDashboardSectors, fetchDashboardWatchlist, fetchLatestSignalTradingDate, type MetricRow } from './dashboard.api'
import { useIndicatorStore } from '@/entities/indicator/model/indicator.store'
import { getIndicatorTableMeta } from '@/entities/indicator/model/indicator.table'
import type { Indicator } from '@/entities/indicator/model/indicator.types'
import IndicatorCardGrid from '@/pages/indicators/ui/IndicatorCardGrid.vue'
import ReportCardGrid from '@/pages/reports/ui/ReportCardGrid.vue'
import { hasMeaningfulIndicatorChange } from './dashboard-indicator-updates'

const marketGroup = ref('sp1500')
const groups = [{ value: 'sp1500', label: 'S&P 1500' }, { value: 'sp500', label: 'S&P 500' }, { value: 'ndx', label: 'NDX' }, { value: 'russell', label: 'Russell' }, { value: 'etf', label: 'ETF' }, { value: 'crp', label: 'Crypto' }]
const signals = ref<MySignalRow[]>([])
const signalSource = ref<'mine' | 'library'>('mine')
type SignalSortKey = 'symbol' | 'signal' | 'timeframe' | 'lastSignalDate'
const signalColumnOrder: SignalSortKey[] = ['symbol', 'signal', 'timeframe', 'lastSignalDate']
const signalColumns: MySignalHeaderColumn[] = [...signalColumnOrder.map(key => {
  const column = mySignalHeaderColumns.find(column => column.key === key)!
  return key === 'lastSignalDate' ? { ...column, label: 'Last Triggered' } : column
}), { key: 'actions', label: 'Action', align: 'right', pad: 'px-3', sortable: false }]
const signalSortKey = ref<SignalSortKey>('lastSignalDate')
const signalSortDirection = ref<'asc' | 'desc'>('desc')
const signalPage = ref(1)
const signalPageSize = 5
const latestTradingDate = ref('')
const previewSignal = ref<MySignalRow | null>(null)
const previewBusy = ref(false)
const router = useRouter()
const indicators = ref<MyIndicatorRow[]>([])
const previewIndicator = ref<MyIndicatorRow | null>(null)
const reports = ref<ReportLibraryItem[]>([])
const favoriteReportCount = ref(0)
const watchlist = ref<MetricRow[]>([])
const latestWatchlistName = ref('')
type MoverSortKey = 'symbol' | 'close' | 'daily_change' | 'trend' | 'trend_30d'
const moverSortKey = ref<MoverSortKey>('daily_change')
const moverSortDirection = ref<'asc' | 'desc'>('desc')
const marketRows = ref<MetricRow[]>([])
const marketLoading = ref(false)
const sectors = ref<MetricRow[]>([])
const indicatorStore = useIndicatorStore()
const savedIndicatorTab = ref<'favorites' | 'created'>('favorites')
const dashboardDate = ref('')
const loading = ref(false)
const errors = ref<Record<string, boolean>>({})
let controller: AbortController | null = null

function field(row: MetricRow, ...keys: string[]): unknown {
  for (const key of keys) if (row[key] !== null && row[key] !== undefined && row[key] !== '') return row[key]
  return null
}
function display(value: unknown, digits?: number): string {
  if (value === null || value === undefined || value === '') return '—'
  const number = Number(value)
  if (digits !== undefined && Number.isFinite(number)) return number.toFixed(digits)
  return String(value)
}
function displayDailyChange(value: unknown): string {
  const number = Number(value)
  if (value === null || value === undefined || value === '' || !Number.isFinite(number)) return '—'
  return `${number > 0 ? '+' : ''}${number.toFixed(2)}`
}
function displayPercent(value: unknown): string {
  const number = Number(value)
  if (value === null || value === undefined || value === '' || !Number.isFinite(number)) return '—'
  return `${number > 0 ? '+' : ''}${number.toFixed(2)}%`
}
function date(value: string): string {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString()
}
function metric(row: MetricRow, ...keys: string[]) { return display(field(row, ...keys)) }
function score(row: MetricRow) { return field(row, 'trend', 'trend_score', 'Trend Score', 'trendScore') }
function change(row: MetricRow) { return field(row, 'daily_change', 'change', 'price_change', 'daily_change_percent') }
function positive(value: unknown) { const n = Number(String(value ?? '').replace('%', '')); return Number.isFinite(n) && n >= 0 }
function trendLevel(row: MetricRow): 'strong' | 'neutral' | 'weak' | 'missing' {
  const value = Number(score(row))
  if (!Number.isFinite(value)) return 'missing'
  if (value >= 7) return 'strong'
  if (value <= 3) return 'weak'
  return 'neutral'
}
function trendLabel(row: MetricRow): string {
  const level = trendLevel(row)
  return level === 'missing' ? '—' : level[0]!.toUpperCase() + level.slice(1)
}
function signalDate(value: string) {
  const match = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  return match ? `${match[1]}-${match[2]!.padStart(2, '0')}-${match[3]!.padStart(2, '0')}` : ''
}
function isToday(row: MySignalRow) { return !!latestTradingDate.value && signalDate(row.lastSignalDate) === latestTradingDate.value }
function signalConditionCount(row: MySignalRow): number {
  for (const key of ['description', 'signals', 'cond']) {
    const raw = row.raw[key]
    if (Array.isArray(raw)) return raw.length
    if (typeof raw === 'string') {
      try {
        const parsed: unknown = JSON.parse(raw.replaceAll("'", '"'))
        if (Array.isArray(parsed)) return parsed.length
      } catch { /* Fall back to the normalized description below. */ }
    }
  }
  return row.description && row.description !== 'No trigger description' ? row.description.split(' · ').filter(Boolean).length : 0
}
function signalSummary(row: MySignalRow): string {
  const count = signalConditionCount(row)
  return `${row.timeframe}${count ? ` · ${count} condition${count === 1 ? '' : 's'} met` : ''}`
}
function compareSignalValues(a: MySignalRow, b: MySignalRow) {
  const key = signalSortKey.value
  const first = key === 'lastSignalDate' ? signalDate(a.lastSignalDate) : key === 'signal' ? a.description : a[key]
  const second = key === 'lastSignalDate' ? signalDate(b.lastSignalDate) : key === 'signal' ? b.description : b[key]
  const firstMissing = first === null || first === undefined || first === ''
  const secondMissing = second === null || second === undefined || second === ''
  if (firstMissing !== secondMissing) return firstMissing ? 1 : -1
  if (firstMissing) return 0
  const compared = typeof first === 'number' && typeof second === 'number'
    ? first - second
    : String(first).localeCompare(String(second), undefined, { numeric: true, sensitivity: 'base' })
  return signalSortDirection.value === 'asc' ? compared : -compared
}
const sortedSignals = computed(() => signals.value.map((row, index) => ({ row, index })).sort((a, b) => {
  const aLatest = latestTradingDate.value && signalDate(a.row.lastSignalDate) === latestTradingDate.value ? 1 : 0
  const bLatest = latestTradingDate.value && signalDate(b.row.lastSignalDate) === latestTradingDate.value ? 1 : 0
  if (aLatest !== bLatest) return bLatest - aLatest
  return compareSignalValues(a.row, b.row) || a.index - b.index
}).map(item => item.row))
const signalPageCount = computed(() => Math.max(1, Math.ceil(sortedSignals.value.length / signalPageSize)))
const pagedSignals = computed(() => sortedSignals.value.slice((signalPage.value - 1) * signalPageSize, signalPage.value * signalPageSize))
function sortSignals(key: string) {
  if (!signalColumnOrder.includes(key as SignalSortKey)) return
  const sortKey = key as SignalSortKey
  if (signalSortKey.value === sortKey) signalSortDirection.value = signalSortDirection.value === 'asc' ? 'desc' : 'asc'
  else { signalSortKey.value = sortKey; signalSortDirection.value = sortKey === 'lastSignalDate' ? 'desc' : 'asc' }
  signalPage.value = 1
}
function changeSignalPage(next: number) { signalPage.value = Math.min(signalPageCount.value, Math.max(1, next)) }

function editPreviewSignal(row: MySignalRow) {
  previewSignal.value = null
  void router.push({ name: 'my-signal-edit', params: { id: row.id } })
}
async function duplicatePreviewSignal(row: MySignalRow) {
  previewBusy.value = true
  try {
    await copyMySignal(row)
    previewSignal.value = null
    await router.push({ path: '/my-stuff/signals', query: { copied: '1' } })
  } catch { errors.value.signals = true; previewSignal.value = null }
  finally { previewBusy.value = false }
}
function trendPoints(row: MetricRow) {
  const raw = field(row, 'trend_30d')
  let values: unknown = raw
  if (typeof raw === 'string') { try { values = JSON.parse(raw) } catch { return '' } }
  if (!Array.isArray(values)) return ''
  const numbers = values.map(value => Number(typeof value === 'object' && value ? (value as MetricRow).close ?? (value as MetricRow).value : value)).filter(Number.isFinite)
  if (numbers.length < 2) return ''
  const minimum = Math.min(...numbers)
  const range = Math.max(...numbers) - minimum || 1
  return numbers.map((value, index) => `${(index / (numbers.length - 1) * 70).toFixed(1)},${(22 - (value - minimum) / range * 18).toFixed(1)}`).join(' ')
}
function moverLogoUrl(row: MetricRow): string {
  const ticker = String(field(row, 'symbol', 'ticker', 'market_symbol') ?? '')
  return `https://images.financialmodelingprep.com/symbol/${ticker}.png`
}
function hideLogo(event: Event) { (event.target as HTMLImageElement).style.display = 'none' }
function moverSortValue(row: MetricRow): string | number | null {
  const key = moverSortKey.value
  if (key === 'symbol') return String(field(row, 'symbol', 'ticker', 'market_symbol') ?? '') || null
  if (key === 'trend_30d') {
    const values = row.trend_30d
    if (!Array.isArray(values) || values.length < 2) return null
    const first = Number(values[0])
    const last = Number(values.at(-1))
    return Number.isFinite(first) && first !== 0 && Number.isFinite(last) ? (last - first) / first : null
  }
  const value = Number(row[key])
  return row[key] === null || row[key] === undefined || !Number.isFinite(value) ? null : value
}
function sortMovers(key: MoverSortKey) {
  if (moverSortKey.value === key) moverSortDirection.value = moverSortDirection.value === 'asc' ? 'desc' : 'asc'
  else { moverSortKey.value = key; moverSortDirection.value = key === 'symbol' ? 'asc' : 'desc' }
}
const movers = computed(() => watchlist.value.map((row, index) => ({ row, index })).sort((a, b) => {
  const first = moverSortValue(a.row)
  const second = moverSortValue(b.row)
  if (first === null || second === null) return first === null && second === null ? a.index - b.index : first === null ? 1 : -1
  const compared = typeof first === 'string' && typeof second === 'string'
    ? first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' })
    : Number(first) - Number(second)
  return (moverSortDirection.value === 'asc' ? compared : -compared) || a.index - b.index
}).map(item => item.row).slice(0, 5))
function marketRank(keys: string[], direction: 'highest' | 'lowest'): MetricRow[] {
  return [...marketRows.value].filter(row => {
    const value = field(row, ...keys)
    return value !== null && Number.isFinite(Number(value))
  }).sort((a, b) => direction === 'highest'
    ? Number(field(b, ...keys)) - Number(field(a, ...keys))
    : Number(field(a, ...keys)) - Number(field(b, ...keys))).slice(0, 5)
}
const marketRankings = computed(() => [
  { id: 'highest-optix', title: 'Highest Optix', valueLabel: 'Optix', sort: 'optix', direction: 'desc', rows: marketRank(['optix', 'Optix'], 'highest'), value: (row: MetricRow) => field(row, 'optix', 'Optix') },
  { id: 'lowest-optix', title: 'Lowest Optix', valueLabel: 'Optix', sort: 'optix', direction: 'asc', rows: marketRank(['optix', 'Optix'], 'lowest'), value: (row: MetricRow) => field(row, 'optix', 'Optix') },
  { id: 'strongest-trend', title: 'Strongest Trend', valueLabel: 'Score', sort: 'trend', direction: 'desc', rows: marketRank(['trend', 'trend_score', 'Trend Score', 'trendScore'], 'highest'), value: (row: MetricRow) => score(row) },
  { id: 'highest-hv20', title: 'Highest HV20', valueLabel: 'HV20', sort: 'volatility_20d', direction: 'desc', rows: marketRank(['volatility_20d', 'hv20', 'HV20', 'Historical Volatility (20-Day)'], 'highest'), value: (row: MetricRow) => field(row, 'volatility_20d', 'hv20', 'HV20', 'Historical Volatility (20-Day)') },
])
type TrendSortKey = 'index_name' | 'constituent_trend_score' | 'trend_above8_ratio' | 'trend_below2_ratio' | 'reltrend_above8_ratio' | 'reltrend_below2_ratio' | 'trend_and_reltrend_above8_ratio' | 'trend_and_reltrend_below2_ratio' | 'reltrend_above8_spx_ratio'
const trendSortKey = ref<TrendSortKey | null>('constituent_trend_score')
const trendSortDirection = ref<'asc' | 'desc'>('desc')
function sortTrends(key: TrendSortKey) {
  if (trendSortKey.value === key) trendSortDirection.value = trendSortDirection.value === 'asc' ? 'desc' : 'asc'
  else { trendSortKey.value = key; trendSortDirection.value = key === 'index_name' ? 'asc' : 'desc' }
}
function trendSortValue(row: MetricRow, key: TrendSortKey): string | number | null {
  if (key === 'index_name') return String(field(row, 'index_name', 'sector') ?? '') || null
  const value = Number(field(row, key))
  return Number.isFinite(value) ? value : null
}
const sortedSectors = computed(() => {
  const key = trendSortKey.value
  if (!key) return sectors.value
  return [...sectors.value].map((row, index) => ({ row, index })).sort((a, b) => {
    const first = trendSortValue(a.row, key)
    const second = trendSortValue(b.row, key)
    if (first === null || second === null) return first === null && second === null ? a.index - b.index : first === null ? 1 : -1
    const compared = typeof first === 'string' && typeof second === 'string'
      ? first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' })
      : Number(first) - Number(second)
    return (trendSortDirection.value === 'asc' ? compared : -compared) || a.index - b.index
  }).map(item => item.row)
})
function sectorScore(row: MetricRow): number | null {
  const value = Number(field(row, 'constituent_trend_score', 'trend_score'))
  return Number.isFinite(value) ? value : null
}
const sectorOnlyRows = computed(() => sectors.value.filter(row => !/s&p\s*500/i.test(metric(row, 'index_name', 'sector')) && sectorScore(row) !== null))
const strongestSector = computed(() => [...sectorOnlyRows.value].sort((a, b) => (sectorScore(b) ?? 0) - (sectorScore(a) ?? 0))[0])
const weakestSector = computed(() => [...sectorOnlyRows.value].sort((a, b) => (sectorScore(a) ?? 0) - (sectorScore(b) ?? 0))[0])
const sp500Sector = computed(() => sectors.value.find(row => /s&p\s*500/i.test(metric(row, 'index_name', 'sector'))))
function scoreWidth(row: MetricRow): string { return `${Math.min(100, Math.max(0, (sectorScore(row) ?? 0) * 10))}%` }
function breadthStyle(row: MetricRow, key: string, tone: 'high' | 'low') {
  const value = Number(field(row, key))
  const strength = Number.isFinite(value) ? Math.min(34, Math.max(5, value * .42)) : 0
  const color = tone === 'high' ? 'var(--app-positive)' : 'var(--app-negative)'
  return { background: `color-mix(in srgb, ${color} ${strength}%, var(--app-surface))` }
}
function sectorKey(row: MetricRow): string { return String(field(row, 'sector', 'index_name') ?? '') }
function sectorHref(row: MetricRow): string { return `/sector_trend_score?index=${encodeURIComponent(sectorKey(row))}` }
function indicatorHref(row: MetricRow, metric: string): string { return `/trend_score?indicator=${encodeURIComponent(`${sectorKey(row)}_${metric}`)}` }
const favoriteIndicators = computed(() => indicatorStore.favoriteItems)
const triggeredTodaySignals = computed(() => signals.value.filter(isToday))
const triggeredTodaySymbolCount = computed(() => new Set(triggeredTodaySignals.value.map((row) => row.symbol).filter(Boolean)).size)
const watchlistUpCount = computed(() => watchlist.value.filter((row) => Number(change(row)) > 0).length)
const watchlistDownCount = computed(() => watchlist.value.filter((row) => Number(change(row)) < 0).length)
const watchlistDirectionWidths = computed(() => {
  const total = watchlistUpCount.value + watchlistDownCount.value || 1
  return {
    up: `${watchlistUpCount.value / total * 100}%`,
    down: `${watchlistDownCount.value / total * 100}%`,
  }
})
const favoriteIndicatorsChangedSentiment = computed(() => favoriteIndicators.value.filter((indicator) => (
  hasMeaningfulIndicatorChange(indicator.raw?.last_change)
)).length)
const favoriteCardColumns = getIndicatorTableMeta('stock_complete_list').columns
function openFavoriteIndicator(indicator: Indicator) {
  indicatorStore.rememberIndicatorSource(indicator.id, indicator.sourceList)
  void router.push({ name: 'indicator-detail', params: { id: indicator.id }, query: { list: 'favorites' } })
}
function indicatorCategoryLabel(row: MyIndicatorRow): string {
  return row.category.trim() || 'Indicator'
}
function formulaOperator(value: string): string {
  if (value === 'Weighted sum') return '+'
  return value || '→'
}
const show = { stuff: true, watchlist: true, tools: true }

async function load() {
  controller?.abort()
  controller = new AbortController()
  const signal = controller.signal
  loading.value = true
  errors.value = {}
  latestTradingDate.value = ''
  async function settle<T>(key: string, request: Promise<T>, assign: (value: T) => void) {
    try { const value = await request; if (!signal.aborted) assign(value) }
    catch { if (!signal.aborted) errors.value[key] = true }
  }
  async function fetchDashboardSignals() {
    const mine = await fetchMySignals('mine', signal)
    return mine.length ? { rows: mine, source: 'mine' as const } : { rows: await fetchMySignals('library', signal), source: 'library' as const }
  }
  await Promise.all([
    settle('date', fetchDashboardDate(signal), value => { dashboardDate.value = value }),
    settle('tradingDate', fetchLatestSignalTradingDate(signal), value => { latestTradingDate.value = value }),
    settle('signals', fetchDashboardSignals(), value => { signals.value = value.rows; signalSource.value = value.source; signalPage.value = 1 }),
    settle('indicators', fetchMyIndicators(signal), value => { indicators.value = value }),
    settle('reports', fetchReportFavorites(1, signal, 4), value => { reports.value = value.items; favoriteReportCount.value = value.count ?? value.items.length }),
    settle('watchlist', fetchDashboardWatchlist(signal), value => { watchlist.value = value.rows; latestWatchlistName.value = value.name }),
    settle('market', fetchDashboardMarket(marketGroup.value, signal), value => { marketRows.value = value }),
    settle('sectors', fetchDashboardSectors(signal), value => { sectors.value = value }),
    settle('sentiment', indicatorStore.ensureFavoriteList(), () => {}),
  ])
  if (!signal.aborted && favoriteIndicators.value.length) {
    try { await indicatorStore.ensureTrendsForIndicators(favoriteIndicators.value.slice(0, 6)) }
    catch { errors.value.sentiment = true }
  }
  if (!signal.aborted) loading.value = false
}
watch(marketGroup, async group => {
  const signal = controller?.signal
  marketRows.value = []
  marketLoading.value = true
  try {
    const rows = await fetchDashboardMarket(group, signal)
    if (marketGroup.value === group && !signal?.aborted) { marketRows.value = rows; errors.value.market = false }
  } catch { if (marketGroup.value === group && !signal?.aborted) errors.value.market = true }
  finally { if (marketGroup.value === group) marketLoading.value = false }
})
onMounted(() => { void load() })
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <main class="dashboard-page">
    <div class="dashboard-shell">
      <section class="content">
        <header class="page-heading">
          <div><h1>Your dashboard</h1><p>Your signals, watchlists and market tools at a glance.</p></div>
          <div class="heading-actions"><span v-if="dashboardDate">Data current as of {{ date(dashboardDate) }}</span><button type="button" :disabled="loading" @click="load"><RefreshCw :size="16" />{{ loading ? 'Loading…' : 'Refresh' }}</button></div>
        </header>
        <section class="dashboard-stats" aria-label="Dashboard statistics">
          <RouterLink class="stat-card stat-card--signals" to="/my-stuff/signals">
            <span class="stat-card__icon"><Bell :size="22" /></span>
            <span class="stat-card__content"><small>Signals Triggered Today</small><strong>{{ triggeredTodaySignals.length }}</strong><span>Across {{ triggeredTodaySymbolCount }} symbol{{ triggeredTodaySymbolCount === 1 ? '' : 's' }}</span></span>
            <ArrowRight :size="19" />
          </RouterLink>
          <RouterLink class="stat-card stat-card--watchlist" to="/my-stuff/watchlists">
            <span class="stat-card__icon"><BarChart3 :size="22" /></span>
            <span class="stat-card__content"><small>Latest Watchlist Today</small><strong class="stat-split"><i>{{ watchlistUpCount }} ↑</i><b>{{ watchlistDownCount }} ↓</b></strong><span class="watchlist-stat-bar" aria-hidden="true"><i :style="{ width: watchlistDirectionWidths.up }"/><b :style="{ width: watchlistDirectionWidths.down }"/></span><span>{{ watchlist.length }} symbols tracked</span></span>
            <ArrowRight :size="19" />
          </RouterLink>
          <RouterLink class="stat-card stat-card--indicators" to="/indicators?list=favorites">
            <span class="stat-card__icon"><Star :size="22" /></span>
            <span class="stat-card__content"><small>Saved Indicator Updates</small><strong>{{ favoriteIndicators.length }}</strong><span>{{ favoriteIndicatorsChangedSentiment }} changed sentiment</span></span>
            <ArrowRight :size="19" />
          </RouterLink>
          <RouterLink class="stat-card stat-card--reports" to="/MR/favorites">
            <span class="stat-card__icon"><FileText :size="22" /></span>
            <span class="stat-card__content"><small>Favorite Reports</small><strong>{{ favoriteReportCount }}</strong><span>Latest saved research</span></span>
            <ArrowRight :size="19" />
          </RouterLink>
        </section>
        <div class="grid">
          <article v-if="show.stuff" class="panel signals-panel">
            <header class="panel-title"><div><Bell :size="19"/><h2>Signal triggered today</h2></div><RouterLink to="/my-stuff/signals">View all signals <ArrowRight :size="14"/></RouterLink></header>
            <p v-if="signalSource === 'library' && !errors.signals" class="signal-highlight-note">No personal signals yet — showing SentimentTrader signals.</p>
            <p v-if="errors.tradingDate" class="trading-date-note">Latest U.S. trading day unavailable; triggered count cannot be calculated.</p>
            <p v-if="errors.signals" class="panel-state">Unable to load signals. Try Refresh.</p><p v-else-if="!loading && !signals.length" class="panel-state">No signals yet.</p>
            <template v-else><div class="table-wrap signal-table"><table><colgroup><col class="signal-symbol-column"><col class="signal-name-column"><col class="signal-timeframe-column"><col class="signal-triggered-column"><col class="signal-action-column"></colgroup><thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold"><tr class="border-b border-[var(--app-border)]"><MySignalHeaderCell v-for="column in signalColumns" :key="column.key" :column="column" :sort-key="signalSortKey" :sort-direction="signalSortDirection" :sortable="column.sortable" @sort="sortSignals" /></tr></thead><tbody><tr v-for="row in pagedSignals" :key="row.id"><td class="link">{{ row.symbol }}</td><td class="signal-info-cell" :title="row.name"><strong>{{ row.name }}</strong><span>{{ signalSummary(row) }}</span></td><td>{{ row.timeframe }}</td><td><span v-if="isToday(row)" class="today-pill">Today</span><template v-else>{{ row.lastSignalDate || 'Never' }}</template></td><td class="action-cell"><button class="signal-preview-button" type="button" :aria-label="`Preview ${row.name}`" title="Signal Preview" @click="previewSignal = row"><Eye :size="15" /></button></td></tr></tbody></table></div></template>
            <footer><div v-if="signals.length" class="signal-pagination"><div><button type="button" :disabled="signalPage === 1" @click="changeSignalPage(signalPage - 1)">Previous</button><span>Page {{ signalPage }} / {{ signalPageCount }} · Total {{ signals.length }}</span><button type="button" :disabled="signalPage === signalPageCount" @click="changeSignalPage(signalPage + 1)">Next</button></div></div></footer>
          </article>
          <article v-if="show.watchlist" class="panel watchlist-movers-panel">
            <header class="panel-title"><div><BarChart3 :size="19"/><span class="watchlist-panel-heading"><h2>Latest watchlist</h2><small v-if="latestWatchlistName">Showing tickers from your latest watchlist: <strong>{{ latestWatchlistName }}</strong></small></span></div><RouterLink to="/my-stuff/watchlists">View all watchlists <ArrowRight :size="14"/></RouterLink></header>
            <p v-if="errors.watchlist" class="panel-state">Unable to load watchlist movers.</p><p v-else-if="!loading && !movers.length" class="panel-state">No watchlist movers available.</p>
            <div v-else class="table-wrap watchlist-table"><table><thead><tr><th>Symbol</th><th>Price</th><th>Day change</th><th><button type="button" class="watchlist-trend-sort" :class="{ active: moverSortKey === 'trend' }" @click="sortMovers('trend')">Trend<ArrowUp v-if="moverSortKey === 'trend' && moverSortDirection === 'asc'" :size="13"/><ArrowDown v-else-if="moverSortKey === 'trend'" :size="13"/><ArrowUpDown v-else :size="13"/></button></th><th>30-day trend</th></tr></thead><tbody><tr v-for="(row, index) in movers" :key="String(field(row, 'symbol', 'ticker', 'market_symbol') ?? index)"><td><span class="watchlist-symbol"><img class="watchlist-logo" :src="moverLogoUrl(row)" :alt="`${metric(row, 'symbol', 'ticker', 'market_symbol')} logo`" loading="lazy" @error="hideLogo" /><span class="watchlist-symbol-text"><strong>{{ metric(row, 'symbol', 'ticker', 'market_symbol') }}</strong><small>{{ metric(row, 'symbol_name', 'company', 'name') }}</small></span></span></td><td class="watchlist-price">{{ display(field(row, 'close'), 2) }}</td><td><span class="watchlist-change" :class="change(row) === null ? '' : positive(change(row)) ? 'up' : 'down'"><strong>{{ displayDailyChange(change(row)) }}</strong><small>{{ displayPercent(field(row, 'daily_change_percent')) }}</small></span></td><td><span class="trend-badge" :class="`trend-${trendLevel(row)}`"><strong v-if="trendLevel(row) !== 'missing'">{{ display(score(row)) }}</strong>{{ trendLabel(row) }}</span></td><td><svg v-if="trendPoints(row)" class="watchlist-spark" viewBox="0 0 72 26" preserveAspectRatio="none"><defs><linearGradient :id="`watchlist-gradient-${index}`" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" :stop-color="positive(change(row)) ? 'var(--app-positive)' : 'var(--app-negative)'" stop-opacity=".3"/><stop offset="100%" :stop-color="positive(change(row)) ? 'var(--app-positive)' : 'var(--app-negative)'" stop-opacity="0"/></linearGradient></defs><polygon :points="`0,26 ${trendPoints(row)} 72,26`" :fill="`url(#watchlist-gradient-${index})`"/><polyline :points="trendPoints(row)" :class="positive(change(row)) ? 'up' : 'down'"/></svg><span v-else>—</span></td></tr></tbody></table></div>
            <footer class="watchlist-footer"><span><Info :size="16"/>Trend score: 0–10</span></footer>
          </article>
          <article v-if="show.tools" class="panel snapshot-panel">
            <header class="panel-title"><div><ListFilter :size="19"/><h2>Explore the Market</h2></div><RouterLink to="/market-screen">View market screener <ArrowRight :size="14"/></RouterLink></header>
            <div class="segments"><button v-for="group in groups" :key="group.value" type="button" :class="{active:marketGroup===group.value}" @click="marketGroup=group.value">{{ group.label }}</button></div>
            <p class="market-scope">Top 5 stocks by market metric</p>
            <p v-if="errors.market" class="panel-state">Unable to load market data. Try Refresh.</p><p v-else-if="loading || marketLoading" class="panel-state">Loading market highlights...</p><p v-else-if="!marketRows.length" class="panel-state">No market results for this group.</p>
            <div v-else class="market-rankings">
              <section v-for="ranking in marketRankings" :key="ranking.id" class="market-ranking-card">
                <header><span class="market-ranking-title"><h3>{{ ranking.title }}</h3><CircleHelp :size="14" aria-hidden="true" /></span><RouterLink :to="{ path: '/market-screen', query: { group: marketGroup, sort: ranking.sort, direction: ranking.direction } }">View all <ArrowRight :size="13"/></RouterLink></header>
                <div class="market-ranking-head"><span>Stock</span><span>{{ ranking.valueLabel }}</span></div>
                <div class="market-ranking-list">
                  <div v-for="row in ranking.rows" :key="`${ranking.id}-${metric(row, 'symbol', 'ticker', 'market_symbol')}`" class="market-ranking-row">
                    <span class="market-company"><img :src="moverLogoUrl(row)" :alt="`${metric(row, 'symbol', 'ticker', 'market_symbol')} logo`" loading="lazy" @error="hideLogo"/><span><strong>{{ metric(row, 'symbol', 'ticker', 'market_symbol') }}</strong><small>{{ metric(row, 'symbol_name', 'company', 'name', 'company_name') }}</small></span></span>
                    <strong class="market-value">{{ display(ranking.value(row), 2) }}</strong>
                  </div>
                </div>
              </section>
            </div>
          </article>
          <article v-if="show.tools" class="panel sentiment-panel">
            <header class="panel-title"><div><Star :size="19"/><h2>Saved Indicators</h2></div><RouterLink v-if="savedIndicatorTab === 'favorites'" to="/indicators?list=favorites">View all favorites <ArrowRight :size="14"/></RouterLink><RouterLink v-else to="/my-stuff/indicators">View my indicators <ArrowRight :size="14"/></RouterLink></header>
            <div class="saved-indicator-tabs"><button type="button" :class="{ active: savedIndicatorTab === 'favorites' }" @click="savedIndicatorTab = 'favorites'">My Favorites</button><button type="button" :class="{ active: savedIndicatorTab === 'created' }" @click="savedIndicatorTab = 'created'">Created by Me</button></div>
            <template v-if="savedIndicatorTab === 'favorites'">
              <p v-if="errors.sentiment" class="panel-state">Unable to load favorite indicators. Try Refresh.</p><p v-else-if="!loading && !favoriteIndicators.length" class="panel-state">No favorite indicators yet.</p>
              <div v-else class="favorite-indicator-cards"><IndicatorCardGrid :indicators="favoriteIndicators.slice(0, 6)" :columns="favoriteCardColumns" layout="two-column" @open="openFavoriteIndicator" @favorite="indicatorStore.toggleFavorite" /></div>
            </template>
            <template v-else>
              <p v-if="errors.indicators" class="panel-state">Unable to load created indicators. Try Refresh.</p><p v-else-if="!loading && !indicators.length" class="panel-state">No indicators created yet.</p>
              <div v-else class="created-indicator-grid">
                <article v-for="row in indicators.slice(0, 6)" :key="row.id" class="created-indicator-card">
                  <header><h3>{{ row.name }}</h3><button type="button" :aria-label="`Preview ${row.name}`" title="Indicator structure" @click="previewIndicator = row"><Ellipsis :size="18"/></button></header>
                  <div class="created-indicator-tags"><span>{{ indicatorCategoryLabel(row) }}</span><span>{{ row.timeframe || '—' }}</span></div>
                  <section class="created-indicator-formula"><small>Formula</small><template v-if="row.included.length"><template v-for="(item, index) in row.included" :key="`${row.id}-${item.url}-${index}`"><strong>{{ item.name }}</strong><b v-if="index < row.included.length - 1">{{ formulaOperator(row.relationship) }}</b></template></template><strong v-else>No formula details available</strong></section>
                </article>
              </div>
            </template>
          </article>
          <article v-if="show.tools" class="panel trends-panel">
            <header class="panel-title"><div><Trophy :size="19"/><h2>Trend Score Board</h2></div><RouterLink to="/trend_score?enlarge=TrendSector">Explore sector details <ArrowRight :size="14"/></RouterLink></header>
            <div class="trend-summary-grid">
              <div class="trend-summary trend-summary--strong"><span>Strongest sector</span><strong>{{ strongestSector ? metric(strongestSector, 'index_name', 'sector') : '—' }}</strong><b>{{ strongestSector ? display(sectorScore(strongestSector), 2) : '—' }} <small>/10</small></b></div>
              <div class="trend-summary trend-summary--weak"><span>Weakest sector</span><strong>{{ weakestSector ? metric(weakestSector, 'index_name', 'sector') : '—' }}</strong><b>{{ weakestSector ? display(sectorScore(weakestSector), 2) : '—' }} <small>/10</small></b></div>
              <div class="trend-summary trend-summary--average"><span>S&amp;P 500 avg. trend</span><b>{{ sp500Sector ? display(sectorScore(sp500Sector), 2) : '—' }} <small>/10</small></b></div>
            </div>
            <p v-if="errors.sectors" class="panel-state">Unable to load sector trends. Try Refresh.</p><p v-else-if="!loading && !sectors.length" class="panel-state">No sector trend data available.</p>
            <div v-else class="table-wrap trend-table"><table>
              <thead>
                <tr>
                  <th rowspan="2"><button type="button" class="trend-sort-button" :class="{ active: trendSortKey === 'index_name' }" @click="sortTrends('index_name')">Sector<ArrowUp v-if="trendSortKey === 'index_name' && trendSortDirection === 'asc'" :size="12"/><ArrowDown v-else-if="trendSortKey === 'index_name'" :size="12"/><ArrowUpDown v-else :size="12"/></button></th>
                  <th rowspan="2"><button type="button" class="trend-sort-button" :class="{ active: trendSortKey === 'constituent_trend_score' }" @click="sortTrends('constituent_trend_score')">Avg. Trend Score <small>/10</small><ArrowUp v-if="trendSortKey === 'constituent_trend_score' && trendSortDirection === 'asc'" :size="12"/><ArrowDown v-else-if="trendSortKey === 'constituent_trend_score'" :size="12"/><ArrowUpDown v-else :size="12"/></button></th>
                  <th colspan="2">Trend Breadth</th><th colspan="2">Relative Breadth</th><th colspan="2">Combined Breadth</th>
                  <th rowspan="2"><button type="button" class="trend-sort-button" :class="{ active: trendSortKey === 'reltrend_above8_spx_ratio' }" @click="sortTrends('reltrend_above8_spx_ratio')">Relative Score<br>≥8 in S&amp;P 500<ArrowUp v-if="trendSortKey === 'reltrend_above8_spx_ratio' && trendSortDirection === 'asc'" :size="12"/><ArrowDown v-else-if="trendSortKey === 'reltrend_above8_spx_ratio'" :size="12"/><ArrowUpDown v-else :size="12"/></button></th>
                </tr>
                <tr>
                  <th><button type="button" class="trend-sort-button" :class="{ active: trendSortKey === 'trend_above8_ratio' }" @click="sortTrends('trend_above8_ratio')">≥8<ArrowUp v-if="trendSortKey === 'trend_above8_ratio' && trendSortDirection === 'asc'" :size="12"/><ArrowDown v-else-if="trendSortKey === 'trend_above8_ratio'" :size="12"/><ArrowUpDown v-else :size="12"/></button></th>
                  <th><button type="button" class="trend-sort-button" :class="{ active: trendSortKey === 'trend_below2_ratio' }" @click="sortTrends('trend_below2_ratio')">≤2<ArrowUp v-if="trendSortKey === 'trend_below2_ratio' && trendSortDirection === 'asc'" :size="12"/><ArrowDown v-else-if="trendSortKey === 'trend_below2_ratio'" :size="12"/><ArrowUpDown v-else :size="12"/></button></th>
                  <th><button type="button" class="trend-sort-button" :class="{ active: trendSortKey === 'reltrend_above8_ratio' }" @click="sortTrends('reltrend_above8_ratio')">≥8<ArrowUp v-if="trendSortKey === 'reltrend_above8_ratio' && trendSortDirection === 'asc'" :size="12"/><ArrowDown v-else-if="trendSortKey === 'reltrend_above8_ratio'" :size="12"/><ArrowUpDown v-else :size="12"/></button></th>
                  <th><button type="button" class="trend-sort-button" :class="{ active: trendSortKey === 'reltrend_below2_ratio' }" @click="sortTrends('reltrend_below2_ratio')">≤2<ArrowUp v-if="trendSortKey === 'reltrend_below2_ratio' && trendSortDirection === 'asc'" :size="12"/><ArrowDown v-else-if="trendSortKey === 'reltrend_below2_ratio'" :size="12"/><ArrowUpDown v-else :size="12"/></button></th>
                  <th><button type="button" class="trend-sort-button" :class="{ active: trendSortKey === 'trend_and_reltrend_above8_ratio' }" @click="sortTrends('trend_and_reltrend_above8_ratio')">Both ≥8<ArrowUp v-if="trendSortKey === 'trend_and_reltrend_above8_ratio' && trendSortDirection === 'asc'" :size="12"/><ArrowDown v-else-if="trendSortKey === 'trend_and_reltrend_above8_ratio'" :size="12"/><ArrowUpDown v-else :size="12"/></button></th>
                  <th><button type="button" class="trend-sort-button" :class="{ active: trendSortKey === 'trend_and_reltrend_below2_ratio' }" @click="sortTrends('trend_and_reltrend_below2_ratio')">Both ≤2<ArrowUp v-if="trendSortKey === 'trend_and_reltrend_below2_ratio' && trendSortDirection === 'asc'" :size="12"/><ArrowDown v-else-if="trendSortKey === 'trend_and_reltrend_below2_ratio'" :size="12"/><ArrowUpDown v-else :size="12"/></button></th>
                </tr>
              </thead>
              <tbody><tr v-for="(row, index) in sortedSectors" :key="String(field(row, 'sector', 'index_name') ?? index)">
                <td><a :href="sectorHref(row)">{{ metric(row, 'index_name', 'sector') }}</a></td>
                <td><a class="trend-score-cell" :href="indicatorHref(row, 'constituent_trend_score')"><strong>{{ display(sectorScore(row), 2) }}</strong><span><i :style="{ width: scoreWidth(row) }"/></span></a></td>
                <td :style="breadthStyle(row, 'trend_above8_ratio', 'high')"><a :href="indicatorHref(row, 'trend_above8_ratio')">{{ display(field(row, 'trend_above8_ratio'), 2) }}%</a></td>
                <td :style="breadthStyle(row, 'trend_below2_ratio', 'low')"><a :href="indicatorHref(row, 'trend_below2_ratio')">{{ display(field(row, 'trend_below2_ratio'), 2) }}%</a></td>
                <td :style="breadthStyle(row, 'reltrend_above8_ratio', 'high')"><a :href="indicatorHref(row, 'reltrend_above8_ratio')">{{ display(field(row, 'reltrend_above8_ratio'), 2) }}%</a></td>
                <td :style="breadthStyle(row, 'reltrend_below2_ratio', 'low')"><a :href="indicatorHref(row, 'reltrend_below2_ratio')">{{ display(field(row, 'reltrend_below2_ratio'), 2) }}%</a></td>
                <td :style="breadthStyle(row, 'trend_and_reltrend_above8_ratio', 'high')"><a :href="indicatorHref(row, 'trend_and_reltrend_above8_ratio')">{{ display(field(row, 'trend_and_reltrend_above8_ratio'), 2) }}%</a></td>
                <td :style="breadthStyle(row, 'trend_and_reltrend_below2_ratio', 'low')"><a :href="indicatorHref(row, 'trend_and_reltrend_below2_ratio')">{{ display(field(row, 'trend_and_reltrend_below2_ratio'), 2) }}%</a></td>
                <td class="trend-relative-cell"><a :href="indicatorHref(row, 'reltrend_above8_spx_ratio')">{{ display(field(row, 'reltrend_above8_spx_ratio'), 2) }}%</a></td>
              </tr></tbody>
            </table></div>
            <footer class="trend-board-footer"><div><span class="trend-legend trend-legend--high"/>High-score share <span class="trend-legend trend-legend--low"/>Low-score share <i/>Shading shows proportion, not daily price change.</div></footer>
          </article>
          <article v-if="show.tools" class="panel favorite-reports-panel">
            <header class="panel-title"><div><FileText :size="19"/><h2>My Favorite Reports</h2></div><RouterLink to="/MR/favorites">Browse favorite reports <ArrowRight :size="14"/></RouterLink></header>
            <p v-if="errors.reports" class="panel-state">Unable to load favorite reports. Try Refresh.</p>
            <p v-else-if="!loading && !reports.length" class="panel-state">No favorite reports yet.</p>
            <ReportCardGrid v-else :reports="reports.slice(0, 4)" compact />
          </article>
        </div>
      </section>
    </div>
    <SignalPreviewModal v-if="previewSignal" :row="previewSignal" :library="signalSource === 'library'" :busy="previewBusy" @close="previewSignal = null" @view="editPreviewSignal" @copy="duplicatePreviewSignal" />
    <IndicatorPreviewModal v-if="previewIndicator" :row="previewIndicator" @close="previewIndicator = null" @edit="router.push({ name: 'my-indicator-edit', query: { url: previewIndicator?.url } })" />
  </main>
</template>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  background: var(--app-bg);
  color: var(--app-text);
}

.dashboard-shell {
  padding: 2rem var(--page-gutter) 3rem;
}

.content { min-width: 0; }
.page-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.25rem;
}
.page-heading .eyebrow {
  margin: 0 0 .35rem;
  color: var(--app-primary);
  font-size: .75rem;
  font-weight: 800;
  letter-spacing: .06em;
  text-transform: uppercase;
}
.page-heading h1 {
  margin: 0;
  color: var(--app-text);
  font-size: clamp(1.7rem, 2.2vw, 2.25rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -.025em;
}
.page-heading p:not(.eyebrow) { margin: .4rem 0 0; color: var(--app-text-muted); font-size: .875rem; }
.heading-actions { display: flex; flex: none; align-items: center; gap: .5rem; }
.heading-actions > span { margin-right: .35rem; color: var(--app-text-muted); font-size: .75rem; white-space: nowrap; }
.heading-actions button, .panel footer .outline, .panel footer .primary {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  gap: .4rem;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-surface);
  padding: .5rem .85rem;
  color: var(--app-primary);
  font-size: .8125rem;
  font-weight: 700;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
}
.heading-actions button:hover, .panel footer .outline:hover { border-color: var(--app-primary); background: var(--app-primary-soft); }
.panel footer .primary { border-color: var(--app-primary); background: var(--app-primary); color: white; }
.panel footer .primary:hover { background: var(--app-primary-hover); }
.dashboard-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:1rem; margin-bottom:1rem; }
.stat-card { display:grid; min-width:0; min-height:7.7rem; grid-template-columns:3rem minmax(0,1fr) auto; align-items:start; gap:.85rem; border:1px solid var(--app-border); border-radius:9px; background:var(--app-surface); padding:1rem; color:var(--app-text); text-decoration:none; box-shadow:0 1px 3px color-mix(in srgb,var(--app-text) 5%,transparent); transition:border-color .16s,transform .16s,box-shadow .16s; }
.stat-card:hover { border-color:color-mix(in srgb,var(--app-primary) 45%,var(--app-border)); transform:translateY(-1px); box-shadow:0 5px 14px color-mix(in srgb,var(--app-text) 8%,transparent); }
.stat-card>.stat-card__icon { display:flex; width:3rem; height:3rem; align-items:center; justify-content:center; border-radius:8px; background:var(--app-primary-soft); color:var(--app-primary); }
.stat-card--indicators>.stat-card__icon { background:color-mix(in srgb,var(--app-favorite) 14%,var(--app-surface)); color:var(--app-favorite); }
.stat-card--reports>.stat-card__icon { background:color-mix(in srgb,#8b5cf6 13%,var(--app-surface)); color:#7c3aed; }
.stat-card>.stat-card__content { display:flex; min-width:0; flex-direction:column; }
.stat-card__content small { overflow:hidden; color:var(--app-text-secondary); font-size:.76rem; font-weight:650; line-height:1.25; text-overflow:ellipsis; white-space:nowrap; }
.stat-card__content>strong { margin-top:.45rem; color:var(--app-text); font-size:1.85rem; font-weight:750; line-height:1; }
.stat-card__content>span { margin-top:.55rem; color:var(--app-text-muted); font-size:.75rem; }
.stat-card>svg { align-self:center; color:var(--app-primary); }
.stat-card__content .stat-split { display:flex; gap:1rem; font-size:1.45rem; }
.stat-split i,.stat-split b { font-style:normal; font-weight:700; }
.stat-split i { color:var(--app-positive); }
.stat-split b { color:var(--app-negative); }
.stat-card__content .watchlist-stat-bar {
  display:flex;
  width:100%;
  height:.34rem;
  margin-top:.45rem;
  overflow:hidden;
  border-radius:999px;
  background:var(--app-surface-muted);
}
.watchlist-stat-bar i,.watchlist-stat-bar b {
  display:block;
  min-width:0;
  height:100%;
  font-style:normal;
  transition:width .25s ease;
}
.watchlist-stat-bar i { background:var(--app-positive); }
.watchlist-stat-bar b { border-left:2px solid var(--app-surface); background:var(--app-negative); }

.grid { display: grid; grid-template-columns: repeat(20, minmax(0, 1fr)); gap: 1rem; }
.panel {
  grid-column: span 10;
  display: flex;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
}
.signals-panel { grid-column: span 10; }
.watchlist-movers-panel { grid-column: span 10; }
.snapshot-panel { grid-column: 1 / -1; }
.sentiment-panel { grid-column: span 10; }
.trends-panel { grid-column: 1 / -1; }
.favorite-reports-panel { grid-column: span 10; }
.signals-panel { order: 1; }
.watchlist-movers-panel { order: 2; }
.snapshot-panel { order: 3; }
.sentiment-panel { order: 4; }
.favorite-reports-panel { order: 5; }
.trends-panel { order: 6; }
.panel-title {
  display: flex;
  min-height: 3.7rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--app-border-muted);
  padding: .75rem 1rem;
}
.sentiment-panel > .panel-title, .favorite-reports-panel > .panel-title { height: 3.7rem; flex: none; }
.panel-title > div:first-child { display: flex; align-items: center; gap: .65rem; min-width: 0; }
.panel-title > div:first-child svg { flex: none; color: var(--app-primary); }
.panel-title h2 { margin: 0; font-size: 1rem; font-weight: 700; line-height: 1.3; }
.watchlist-panel-heading { display:block; min-width:0; }
.watchlist-panel-heading small { display:block; max-width:32rem; margin-top:.1rem; overflow:hidden; color:var(--app-text-muted); font-size:.7rem; font-weight:400; line-height:1.2; text-overflow:ellipsis; white-space:nowrap; }
.watchlist-panel-heading small strong { color:var(--app-text-secondary); font-weight:600; }
.panel-title b { color: var(--app-text-muted); font-size: 1rem; letter-spacing: .12em; }
.panel-title > a { display: inline-flex; flex: none; align-items: center; gap: .35rem; color: var(--app-primary); font-size: .8125rem; font-weight: 700; text-decoration: none; white-space: nowrap; }
.panel-title > a:hover { text-decoration: underline; }
.saved-indicator-tabs { display: flex; gap: .35rem; padding: .75rem 1rem .35rem; }
.panel-title .saved-indicator-tabs { margin-left: .4rem; padding: 0; }
.saved-indicator-tabs button { border: 1px solid var(--app-border); border-radius: 5px; background: var(--app-surface); padding: .4rem .65rem; color: var(--app-text-secondary); font-size: .75rem; font-weight: 400; cursor: pointer; }
.saved-indicator-tabs button:hover { background: var(--app-primary-soft); color: var(--app-primary); }
.saved-indicator-tabs button.active { border-color: var(--app-primary); background: var(--app-primary); color: white; }
.favorite-indicator-cards { display: flex; min-height: 0; flex: 1; padding: .5rem 1rem 1rem; }
.saved-indicator-table table { min-width: 0; table-layout: fixed; }
.saved-indicator-table td:first-child, .saved-indicator-table th:first-child { width: 42%; overflow: hidden; text-overflow: ellipsis; }
.saved-indicator-table td { overflow: hidden; text-overflow: ellipsis; }
.saved-indicator-link { max-width: 100%; overflow: hidden; border: 0; background: none; padding: 0; color: var(--app-primary); font: inherit; font-weight: 700; text-align: left; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.saved-indicator-link:hover { text-decoration: underline; }
.created-indicator-name { display: inline-flex; max-width: 100%; align-items: center; gap: .25rem; }
.created-indicator-name > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.created-indicator-preview { display: inline-flex; width: 25px; height: 25px; flex: none; align-items: center; justify-content: center; border: 0; border-radius: 5px; background: transparent; color: var(--app-text-muted); cursor: pointer; }
.created-indicator-preview:hover { background: var(--app-primary-soft); color: var(--app-primary); }
.created-indicator-grid { display: grid; min-height: 0; flex: 1; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(0, 1fr)); gap: .7rem; padding: .5rem 1rem 1rem; }
.created-indicator-card { display: flex; min-width: 0; height: 100%; flex-direction: column; overflow: hidden; border: 1px solid var(--app-border); border-radius: 8px; background: var(--app-surface); box-shadow: 0 2px 7px color-mix(in srgb, var(--app-text) 7%, transparent); }
.created-indicator-card > header { display: flex; align-items: flex-start; justify-content: space-between; gap: .6rem; padding: .8rem .8rem .35rem; }
.created-indicator-card h3 { display: -webkit-box; overflow: hidden; margin: 0; color: var(--app-text); font-size: .9rem; font-weight: 700; line-height: 1.3; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.created-indicator-card > header button { display: grid; width: 1.75rem; height: 1.75rem; flex: none; place-items: center; border: 0; border-radius: 5px; background: transparent; color: var(--app-text-secondary); cursor: pointer; }
.created-indicator-card > header button:hover { background: var(--app-primary-soft); color: var(--app-primary); }
.created-indicator-tags { display: flex; flex-wrap: wrap; gap: .4rem; padding: 0 .8rem .55rem; }
.created-indicator-tags span { border-radius: 999px; background: var(--app-primary-soft); padding: .22rem .65rem; color: var(--app-primary); font-size: .66rem; }
.created-indicator-tags span + span { background: var(--app-surface-muted); color: var(--app-text-secondary); }
.created-indicator-formula { display: grid; min-height: 6.3rem; align-content: center; justify-items: center; gap: .25rem; margin: 0 .8rem .55rem; border-radius: 7px; background: var(--app-surface-muted); padding: .55rem .75rem; text-align: center; }
.created-indicator-formula small { width: 100%; align-self: start; color: var(--app-text-muted); font-size: .65rem; text-align: left; }
.created-indicator-formula strong { display: -webkit-box; overflow: hidden; max-width: 100%; color: var(--app-text); font-size: .75rem; font-weight: 500; line-height: 1.3; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.created-indicator-formula b { color: var(--app-primary); font-size: .9rem; line-height: 1; }

.panel-state { margin: 0; padding: 1.5rem 1rem; color: var(--app-text-muted); font-size: .8125rem; }
.table-wrap, .panel :deep(.table-wrap) { width: 100%; min-width: 0; overflow-x: auto; padding: .25rem 1rem; }
.panel table, .panel :deep(table) { width: 100%; border-collapse: collapse; font-size: .75rem; white-space: nowrap; }
.panel th, .panel :deep(th) { border-bottom: 1px solid var(--app-border); padding: .65rem .55rem; color: var(--app-text-secondary); font-size: .72rem; font-weight: 700; text-align: left; }
.panel td, .panel :deep(td) { border-bottom: 1px solid var(--app-border-muted); padding: .65rem .55rem; color: var(--app-text-secondary); text-align: left; }
.panel tbody tr:last-child td, .panel :deep(tbody tr:last-child td) { border-bottom: 0; }
.panel tbody tr:hover, .panel :deep(tbody tr:hover) { background: var(--app-surface-soft); }
.panel .link, .panel :deep(.link) { color: var(--app-primary); font-weight: 700; }
.panel .up, .panel :deep(.up) { color: var(--app-positive); font-weight: 700; }
.panel .down, .panel :deep(.down) { color: var(--app-negative); font-weight: 700; }
.signal-table table { table-layout:fixed; min-width:0; }
.signal-symbol-column { width:10%; }
.signal-name-column { width:55%; }
.signal-timeframe-column { width:15%; }
.signal-triggered-column { width:15%; }
.signal-action-column { width:5%; }
.watchlist-table { overflow-x: hidden; padding-inline: .45rem; }
.watchlist-table table { table-layout: fixed; min-width: 0; white-space: normal; }
.watchlist-table th:first-child { width: 28%; }
.watchlist-table th:nth-child(2) { width: 15%; }
.watchlist-table th:nth-child(3) { width: 21%; }
.watchlist-table th:nth-child(4) { width: 20%; }
.watchlist-table th:last-child { width: 16%; }
.signal-table thead, .watchlist-table thead { background: var(--app-surface-muted); }
.signal-table tbody tr:nth-child(even), .watchlist-table tbody tr:nth-child(even) { background: var(--app-row-even); }
.signal-table tbody tr:hover, .watchlist-table tbody tr:hover { background: var(--app-surface-hover); }
.signal-table td { padding: .625rem .75rem; font-size: .8125rem; }
.watchlist-table td { height: 3.45rem; padding: .55rem .45rem; font-size: .75rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
.watchlist-movers-panel .watchlist-table th { padding: .65rem .45rem; color: var(--app-text); font-size: .6875rem; font-weight: 700; }
.mover-header-actions, .mover-symbol-cell { display: inline-flex; align-items: center; gap: .3rem; white-space: nowrap; }
.mover-sort-button { display: inline-flex; align-items: center; gap: .1rem; border: 0; background: transparent; padding: 0; color: var(--app-text); font: inherit; font-weight: 600; white-space: nowrap; cursor: pointer; }
.watchlist-table th:nth-child(4) .mover-sort-button { white-space: normal; text-align: left; }
.mover-change-sort { color: var(--app-text-muted); }
.watchlist-table .mover-daily-change { font-size: .66rem; font-weight: 700; }
.watchlist-table .spark { max-width: 100%; }
.mover-sort-button:hover, .mover-sort-button.active { color: var(--app-primary); }
.signal-table .numeric { text-align: right; font-variant-numeric: tabular-nums; }
.signals-panel .signal-table :deep(th) { padding: .625rem .75rem; color: var(--app-text); font-size: .6875rem; font-weight: 600; }
.signals-panel .signal-table :deep(th.text-right) { text-align: right; }
.signal-pagination { display: flex; align-items: center; justify-content: space-between; gap: .75rem; width: 100%; color: var(--app-text-muted); font-size: .72rem; }
.signal-pagination > div { display: flex; align-items: center; gap: .5rem; }
.signal-pagination button { border: 1px solid var(--app-border); border-radius: 5px; background: var(--app-surface); padding: .3rem .55rem; color: var(--app-primary); font: inherit; font-weight: 700; cursor: pointer; }
.signal-pagination button:hover:not(:disabled) { background: var(--app-primary-soft); }
.signal-pagination button:disabled { color: var(--app-text-muted); opacity: .55; cursor: not-allowed; }
.signals-panel footer { justify-content: center; }
.signal-table td.link { color: var(--app-text); }
.signal-table .action-cell { text-align: right; }
.signal-table .signal-description { max-width: 300px; }
.signal-table .signal-description span { display: inline-block; max-width: calc(100% - 32px); overflow: hidden; text-overflow: ellipsis; vertical-align: middle; }
.signal-info-cell { min-width:0; overflow:hidden; }
.signal-info-cell strong, .signal-info-cell span { display:block; width:100%; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.signal-info-cell strong { color: var(--app-text); font-size: .8125rem; font-weight: 700; }
.signal-info-cell span { margin-top: .2rem; color: var(--app-text-muted); font-size: .72rem; }
.watchlist-symbol { display: flex; align-items: center; gap: .45rem; min-width: 0; }
.watchlist-symbol-text { display: grid; gap: .18rem; min-width: 0; }
.watchlist-change { display: grid; gap: .18rem; min-width: 0; }
.watchlist-logo { height: 1.75rem; width: 1.75rem; flex-shrink: 0; border-radius: 50%; border: 1px solid var(--app-border); background: var(--app-surface-soft); object-fit: contain; padding: 2px; }
.watchlist-symbol strong { overflow: hidden; color: var(--app-text); font-size: .78rem; text-overflow: ellipsis; }
.watchlist-symbol small { overflow: hidden; color: var(--app-text-muted); font-size: .66rem; font-weight: 500; text-overflow: ellipsis; }
.watchlist-price { color: var(--app-text) !important; font-weight: 700; }
.watchlist-change strong { font-size: .78rem; }
.watchlist-change small { color: inherit; font-size: .68rem; font-weight: 700; }
.watchlist-trend-sort { display: inline-flex; align-items: center; gap: .25rem; border: 0; background: transparent; padding: 0; color: inherit; font: inherit; font-weight: 700; cursor: pointer; }
.watchlist-trend-sort:hover, .watchlist-trend-sort.active { color: var(--app-primary); }
.trend-badge { display: inline-flex; align-items: center; gap: .3rem; border-radius: 999px; padding: .15rem .65rem; font-size: .6875rem; font-weight: 700; }
.trend-badge strong { font: inherit; }
.trend-strong { background: color-mix(in srgb, var(--app-positive) 14%, var(--app-surface)); color: var(--app-positive); }
.trend-neutral { background: var(--app-surface-muted); color: var(--app-text-secondary); }
.trend-weak { background: color-mix(in srgb, var(--app-negative) 12%, var(--app-surface)); color: var(--app-negative); }
.trend-missing { background: transparent; color: var(--app-text-muted); }
.watchlist-spark { display: block; width: 100%; height: 32px; overflow: visible; }
.watchlist-spark polyline { fill: none; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.watchlist-spark polygon { stroke: none; }
.watchlist-spark polyline.up { stroke: var(--app-positive); }
.watchlist-spark polyline.down { stroke: var(--app-negative); }
.signal-preview-button { display: inline-flex; width: 26px; height: 26px; align-items: center; justify-content: center; margin-left: 4px; border: 0; border-radius: 5px; background: transparent; color: var(--app-text-muted); vertical-align: middle; cursor: pointer; }
.signal-preview-button:hover { background: var(--app-primary-soft); color: var(--app-primary); }
.trading-date-note { margin: -.25rem 1rem .5rem; color: var(--app-text-muted); font-size: .72rem; }
.signal-highlight-note { margin: 0; padding: .1rem 1rem .35rem; color: var(--app-text-muted); font-size: .72rem; }
.today-pill { display: inline-block; border-radius: 999px; background: color-mix(in srgb, var(--app-positive) 15%, var(--app-surface)); padding: .15rem .65rem; color: var(--app-positive); font-size: .6875rem; font-weight: 700; }
.panel :deep(.spark) { display: block; width: 72px; height: 24px; }
.panel :deep(.spark polyline) { fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.panel :deep(.spark polyline.up) { stroke: var(--app-positive); }
.panel :deep(.spark polyline.down) { stroke: var(--app-negative); }
.panel footer {
  display: flex;
  min-height: 3.6rem;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  margin-top: auto;
  border-top: 1px solid var(--app-border-muted);
  padding: .55rem 1rem;
}
.sentiment-panel > footer, .favorite-reports-panel > footer { height: 3.6rem; flex: none; }
.panel footer > div { display: flex; align-items: center; gap: .5rem; }
.panel .watchlist-footer { min-height: 3.6rem; justify-content: flex-start; color: var(--app-text-muted); font-size: .72rem; }
.watchlist-footer span { display: inline-flex; align-items: center; gap: .45rem; }
.watchlist-footer svg { color: var(--app-primary); }
.panel footer a:not(.outline):not(.primary) { display: inline-flex; align-items: center; gap: .35rem; color: var(--app-primary); font-size: .8125rem; font-weight: 700; text-decoration: none; }
.panel footer a:not(.outline):not(.primary):hover { text-decoration: underline; }

.segments { display: flex; flex-wrap: wrap; gap: .35rem; margin: .75rem 1rem 0; }
.segments button { min-height: 2.35rem; border: 1px solid var(--app-border); border-radius: 5px; background: var(--app-surface); padding: .4rem .65rem; color: var(--app-text-secondary); font-size: .75rem; font-weight: 400; cursor: pointer; }
.segments button:hover { background: var(--app-primary-soft); color: var(--app-primary); }
.segments button.active { background: var(--app-primary); color: white; }
.market-scope { margin: .65rem 1rem 0; color: var(--app-text-muted); font-size: .7rem; }
.market-rankings { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .65rem; padding: .45rem 1rem 1rem; }
.market-ranking-card { min-width: 0; overflow: hidden; border: 1px solid var(--app-border-muted); border-radius: 7px; background: var(--app-surface); }
.market-ranking-card > header { display: flex; align-items: center; justify-content: space-between; gap: .4rem; padding: .7rem .75rem .5rem; color: var(--app-text); }
.market-ranking-title { display: inline-flex; min-width: 0; align-items: center; gap: .4rem; }
.market-ranking-card h3 { margin: 0; overflow: hidden; font-size: .8rem; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.market-ranking-card > header svg { flex: none; color: var(--app-primary); }
.market-ranking-card > header a { display: inline-flex; flex: none; align-items: center; gap: .25rem; color: var(--app-primary); font-size: .7rem; font-weight: 700; text-decoration: none; }
.market-ranking-card > header a:hover { text-decoration: underline; }
.market-ranking-head, .market-ranking-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; column-gap: .45rem; }
.market-ranking-head { border-bottom: 1px solid var(--app-border-muted); padding: .35rem .65rem; color: var(--app-text-secondary); font-size: .65rem; font-weight: 700; }
.market-ranking-head span:first-child { color: var(--app-text); }
.market-ranking-head span:last-child { text-align: right; }
.market-ranking-row { min-height: 3.35rem; border-bottom: 1px solid var(--app-border-muted); padding: .38rem .65rem; }
.market-ranking-row:hover { background: var(--app-surface-soft); }
.market-company { display: flex; min-width: 0; align-items: center; gap: .5rem; }
.market-company > img { width: 1.75rem; height: 1.75rem; flex: none; border: 1px solid var(--app-border-muted); border-radius: 50%; background: var(--app-surface-soft); object-fit: contain; padding: 2px; }
.market-company > span { display: grid; min-width: 0; gap: .12rem; }
.market-company strong { overflow: hidden; color: var(--app-text); font-size: .75rem; text-overflow: ellipsis; white-space: nowrap; }
.market-company small { overflow: hidden; color: var(--app-text-muted); font-size: .62rem; text-overflow: ellipsis; white-space: nowrap; }
.market-value { color: var(--app-text-secondary); font-size: .7rem; font-variant-numeric: tabular-nums; text-align: right; }
.bars { position: absolute; right: .8rem; bottom: .8rem; display: flex; height: 3rem; align-items: flex-end; gap: 3px; }
.bars i { width: 7px; border-radius: 2px 2px 0 0; background: var(--app-positive); }
.bars i:nth-child(-n+3) { background: var(--app-negative); }

.filters { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; gap: .4rem; padding: .9rem 1rem .5rem; }
.filters select { min-width: 0; min-height: 2.35rem; border: 1px solid var(--app-border); border-radius: 6px; background: var(--app-surface); padding: .45rem; color: var(--app-text-secondary); font-size: .75rem; }
.filters select:focus { outline: 2px solid var(--app-primary); outline-offset: 1px; }
.filters button { min-width: 3.5rem; border: 0; border-radius: 6px; background: var(--app-primary); color: white; font-size: .75rem; font-weight: 700; cursor: pointer; }
.filters button:hover { background: var(--app-primary-hover); }
.trend-summary-grid { display: flex; flex-wrap: wrap; gap: .5rem; margin: .7rem 1rem; }
.trend-summary { display: inline-flex; align-items: center; gap: .45rem; min-width: 0; border: 1px solid var(--app-border-muted); border-radius: 999px; padding: .3rem .8rem; }
.trend-summary span { flex: none; color: var(--app-text-muted); font-size: .64rem; }
.trend-summary strong { overflow: hidden; color: var(--app-text); font-size: .72rem; text-overflow: ellipsis; white-space: nowrap; }
.trend-summary b { flex: none; color: var(--app-text); font-size: .85rem; font-variant-numeric: tabular-nums; }
.trend-summary b small { color: var(--app-text-muted); font-size: .72rem; font-weight: 600; }
.trend-summary--strong { background: color-mix(in srgb, var(--app-positive) 8%, var(--app-surface)); }
.trend-summary--weak { background: color-mix(in srgb, var(--app-negative) 8%, var(--app-surface)); }
.trend-summary--weak b { color: var(--app-negative); }
.trend-summary--average { background: var(--app-primary-soft); }
.trend-summary--average b { color: var(--app-primary); }
.trend-table { padding: 0 1rem; }
.trend-table table { min-width: 980px; table-layout: fixed; border: 1px solid var(--app-border); }
.trends-panel .trend-table { margin-bottom: .75rem; }
.trends-panel .trend-table thead { background: var(--app-surface-muted); }
.trends-panel .trend-table th { border-right: 1px solid var(--app-border); border-bottom: 1px solid var(--app-border); padding: .65rem .55rem; background: var(--app-surface-muted); color: var(--app-text-secondary); font-size: .72rem; font-weight: 700; line-height: 1.25; text-align: center; white-space: normal; }
.trends-panel .trend-table th:first-child { width: 16%; text-align: left; }
.trends-panel .trend-table th:nth-child(2) { width: 17%; }
.trends-panel .trend-table thead tr:first-child th:last-child { width: 12%; border-left: 2px solid var(--app-border-strong); background: color-mix(in srgb, var(--app-primary) 9%, var(--app-surface)); }
.trends-panel .trend-table thead svg { display: inline; color: var(--app-text); vertical-align: middle; }
.trends-panel .trend-table td { height: 2.1rem; border-right: 1px solid var(--app-border-muted); padding: .35rem .6rem; font-size: .75rem; font-variant-numeric: tabular-nums; text-align: center; }
.trends-panel .trend-table td:first-child { color: var(--app-text); font-weight: 700; text-align: left; }
.trends-panel .trend-table tbody tr:first-child { background: var(--app-primary-soft); }
.trends-panel .trend-table tbody tr:hover { filter: brightness(.98); }
.trend-relative-cell { border-left: 2px solid var(--app-border-strong) !important; background: color-mix(in srgb, var(--app-primary) 7%, var(--app-surface)); font-weight: 700; }
.trend-sort-button { display: inline-flex; align-items: center; gap: .2rem; border: 0; background: transparent; padding: 0; color: inherit; font: inherit; font-weight: 700; text-align: left; cursor: pointer; }
.trends-panel .trend-table .trend-sort-button { width: 100%; justify-content: center; text-align: center; }
.trends-panel .trend-table th:first-child .trend-sort-button { width: auto; justify-content: flex-start; text-align: left; }
.trends-panel .trend-table thead tr:nth-child(2) th:first-child .trend-sort-button { width: 100%; justify-content: center; text-align: center; }
.trend-sort-button small { color: var(--app-text-muted); font-weight: 500; }
.trend-sort-button:hover, .trend-sort-button.active { color: var(--app-primary); }
.trends-panel .trend-table .trend-sort-button.active svg { color: var(--app-primary); }
.trend-table td a { color: var(--app-text); text-decoration: none; }
.trend-table td a:hover { color: var(--app-primary); text-decoration: underline; }
.trend-score-cell { display: grid; grid-template-columns: 2.4rem minmax(70px, 1fr); align-items: center; gap: .5rem; }
.trend-score-cell strong { text-align: right; }
.trend-score-cell span { height: .6rem; overflow: hidden; border-radius: 3px; background: var(--app-border-muted); }
.trend-score-cell i { display: block; height: 100%; background: var(--app-primary); }
.panel .trend-board-footer { min-height: 4rem; padding-inline: 1rem; }
.trend-board-footer > div { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; color: var(--app-text-muted); font-size: .7rem; }
.trend-board-footer > div > i { width: 1px; height: 1.2rem; margin-inline: .45rem; background: var(--app-border-strong); }
.trend-legend { width: .85rem; height: .85rem; border-radius: 50%; }
.trend-legend--high { background: color-mix(in srgb, var(--app-positive) 35%, var(--app-surface)); }
.trend-legend--low { margin-left: .7rem; background: color-mix(in srgb, var(--app-negative) 35%, var(--app-surface)); }

@media (max-width: 1535px) {
  .page-heading { align-items: flex-start; flex-direction: column; }
  .heading-actions { width: 100%; flex-wrap: wrap; }
}

@media (max-width: 1279px) {
  .dashboard-shell { padding-top: 1.25rem; }
}

@media (max-width: 1439px) {
  .dashboard-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .signals-panel, .watchlist-movers-panel, .snapshot-panel, .sentiment-panel, .trends-panel, .favorite-reports-panel { grid-column: 1 / -1; }
  .market-rankings { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 639px) {
  .dashboard-shell { padding: 1rem var(--page-gutter) 2rem; }
  .page-heading h1 { font-size: 1.65rem; }
  .heading-actions > span { width: 100%; }
  .grid { gap: .75rem; }
  .dashboard-stats { grid-template-columns: minmax(0, 1fr); gap: .75rem; }
  .segments { grid-template-columns: repeat(3, 1fr); }
  .market-rankings { grid-template-columns: minmax(0, 1fr); }
  .created-indicator-grid { grid-template-columns: minmax(0, 1fr); }
  .panel footer { flex-wrap: wrap; }
}
</style>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, BarChart3, BriefcaseBusiness, ChartNoAxesCombined, CircleHelp, Gauge, Grid3X3, LayoutDashboard, Menu, RefreshCw, Scale, Smile, TableProperties, Trophy, X } from '@lucide/vue'
import { fetchIndicatorTrends } from '@/entities/indicator/api/indicator.api'
import { normalizeTrendSeries } from '@/entities/indicator/model/indicator.trends'
import IndicatorSparkline from '@/pages/indicators/ui/IndicatorSparkline.vue'
import { fetchClassicDashboard, fetchDashboardSectors, fetchMostRelevantIndicators, type ClassicDashboardPayload, type MetricRow } from './dashboard.api'
import ClassicConfidenceChart from './ClassicConfidenceChart.vue'
import ChartSummaryMiniChart from './ChartSummaryMiniChart.vue'
import webinarCover from '@/assets/webinar.png'
import { fetchActiveStudies } from '@/entities/active-study/api/active-study.api'
import type { ActiveStudyRow } from '@/entities/active-study/model/active-study.types'

const range = ref('1Y')
const marketSortKey = ref('')
const marketSortDirection = ref<'asc' | 'desc'>('asc')
const isSidebarOpen = ref(false)
const activeWebinar = ref<MetricRow | null>(null)
const heatmapMovingAverages = [
  { days: 0, dataIndex: 0 },
  { days: 5, dataIndex: 2 },
  { days: 10, dataIndex: 3 },
  { days: 50, dataIndex: 5 },
  { days: 100, dataIndex: 6 },
  { days: 200, dataIndex: 7 },
]
const selectedHeatmapIndex = ref(0)
const heatmapHover = ref<{ name: string; value: string; thumbnail: string; x: number; y: number } | null>(null)
const loading = ref(false)
const loadError = ref(false)
const dashboard = ref<ClassicDashboardPayload | null>(null)
const sectorRows = ref<MetricRow[]>([])
const extremeTrends = ref<Record<string, number[][]>>({})
const relevantIndicators = ref<MetricRow[]>([])
const activeStudies = ref<ActiveStudyRow[]>([])
const researchTab = ref<'highlighted' | 'active'>('highlighted')
const rankingTab = ref('sector_chart_data')
let controller: AbortController | null = null

const navigation = [
  { label: 'Daily Summary', icon: LayoutDashboard, active: true },
  { label: 'Market Overview', icon: BarChart3, to: '/market-screen' },
  { label: 'Active Studies', icon: BriefcaseBusiness, to: '/MR/active_studies' },
  { label: 'Heatmap', icon: Grid3X3, anchor: 'heatmap' },
  { label: 'Phase Table', icon: TableProperties, anchor: 'phase-table' },
  { label: 'Ranks', icon: Trophy, anchor: 'ranks' },
  { label: '% Extremes', icon: Gauge, anchor: 'extremes' },
  { label: 'Excess Pessimism', icon: ArrowDown, anchor: 'extremes' },
  { label: 'Excess Optimism', icon: ArrowUp, anchor: 'extremes' },
]

function value(row: MetricRow | null | undefined, ...keys: string[]): unknown {
  for (const key of keys) if (row?.[key] !== null && row?.[key] !== undefined && row?.[key] !== '') return row[key]
  return null
}
function number(value: unknown): number | null { if (value === null || value === undefined || value === '') return null; const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null }
function text(value: unknown, fallback = '—'): string { return value === null || value === undefined || value === '' ? fallback : String(value) }
function parseObject(value: unknown): MetricRow {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as MetricRow
  if (typeof value === 'string') { try { const parsed: unknown = JSON.parse(value); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as MetricRow : {} } catch { return {} } }
  return {}
}
function parseList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') { try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed : [] } catch { return [] } }
  return []
}
function chartThumbnail(value: unknown): string {
  const source = text(value, '').trim()
  if (!source) return ''
  if (/^https?:\/\//i.test(source)) return source
  return `https://d1wrgh3h32hjn2.cloudfront.net/${source.replace(/_250\.png$/i, '')}_250.png`
}
function compactRankRows(source: unknown, limit = 5) {
  return parseList(source).flatMap((item, index) => {
    if (Array.isArray(item)) {
      const rawValue = number(item[1] ?? item[2])
      return rawValue === null ? [] : [{ name: text(item[0], `Item ${index + 1}`), value: rawValue }]
    }
    if (!item || typeof item !== 'object') return []
    const row = item as MetricRow
    const rawValue = number(value(row, 'value', 'score', 'last_value', 'latest_value'))
    return rawValue === null ? [] : [{ name: text(value(row, 'name', 'label', 'title', 'chart_name', 'symbol'), `Item ${index + 1}`), value: rawValue }]
  }).slice(0, limit)
}
function date(value: string): string { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value || '—' : parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }
function commentaryDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  const raw = String(value).trim()
  const direct = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (direct) return new Date(Date.UTC(Number(direct[1]), Number(direct[2]) - 1, Number(direct[3]))).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' })
  const numeric = Number(raw)
  const parsed = Number.isFinite(numeric) ? new Date(raw.length <= 10 ? numeric * 1000 : numeric) : new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw
  return parsed.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' })
}
function reportHref(row: MetricRow): string {
  const url = text(row.url, '')
  return /^https?:\/\//i.test(url) ? url : `/MR/blog/${url}`
}
function isExternalReport(row: MetricRow): boolean { return /^https?:\/\//i.test(text(row.url, '')) }
function hideHeatmapThumbnail(event: Event) { (event.target as HTMLImageElement).style.display = 'none' }
function showHeatmapPreview(event: MouseEvent, item: { name: string; value: string; thumbnail: string }) {
  const width = 300
  const height = 225
  heatmapHover.value = {
    ...item,
    x: Math.min(window.innerWidth - width - 12, Math.max(12, event.clientX + 14)),
    y: event.clientY > height + 24 ? event.clientY - height - 12 : event.clientY + 14,
  }
}
function moveHeatmapPreview(event: MouseEvent) {
  if (!heatmapHover.value) return
  const width = 300
  const height = 225
  heatmapHover.value.x = Math.min(window.innerWidth - width - 12, Math.max(12, event.clientX + 14))
  heatmapHover.value.y = event.clientY > height + 24 ? event.clientY - height - 12 : event.clientY + 14
}
function formatExtremeChange(value: number | null, isPercent = false): string {
  if (value === null) return '—'
  const absolute = Math.abs(value)
  const formatted = new Intl.NumberFormat('en-US', absolute >= 1000
    ? { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 }
    : { maximumFractionDigits: 2 }).format(absolute)
  return `${formatted}${isPercent ? '%' : ''}`
}
function chartRow(index: number): unknown[] | null { const row = dashboard.value?.data[index]; return Array.isArray(row) ? row : null }
const smartLast = computed(() => number(dashboard.value?.smart_last) ?? number(chartRow(dashboard.value?.data.length ? dashboard.value.data.length - 1 : 0)?.[1]))
const dumbLast = computed(() => number(dashboard.value?.dumb_last) ?? number(chartRow(dashboard.value?.data.length ? dashboard.value.data.length - 1 : 0)?.[3]))
function confidenceDelta(column: 1 | 3) { const rows = dashboard.value?.data ?? []; const latest = Array.isArray(rows.at(-1)) ? number((rows.at(-1) as unknown[])[column]) : null; const prior = Array.isArray(rows.at(-2)) ? number((rows.at(-2) as unknown[])[column]) : null; return latest === null || prior === null ? null : latest - prior }
function sparkPoints(column: 1 | 3) { const rows = (dashboard.value?.data ?? []).slice(-30).flatMap(row => Array.isArray(row) ? [number(row[column])] : []).filter((item): item is number => item !== null); if (rows.length < 2) return ''; const min = Math.min(...rows); const span = Math.max(...rows) - min || 1; return rows.map((item,index) => `${index/(rows.length-1)*104},${32-(item-min)/span*28}`).join(' ') }
const confidence = computed(() => ([
  { title: 'Smart Money Confidence', shortTitle: 'Smart Money', value: smartLast.value === null ? '—' : Math.round(smartLast.value * 100), delta: confidenceDelta(1), points: sparkPoints(1) },
  { title: 'Dumb Money Confidence', shortTitle: 'Dumb Money', value: dumbLast.value === null ? '—' : Math.round(dumbLast.value * 100), delta: confidenceDelta(3), points: sparkPoints(3) },
].map(card => ({ ...card, tone: card.delta !== null && card.delta < 0 ? 'negative' : 'positive' }))))
const assetScores = computed(() => {
  const definitions = [['Stocks · Short term','stocks_short_risk_summary'],['Stocks · Medium term','stocks_medium_risk_summary'],['Bonds','bonds_risk_summary'],['Crude Oil','oil_risk_summary','crude_risk_summary'],['Gold','gold_risk_summary'],['Agriculture','ag_risk_summary']]
  return definitions.map(([label,...keys]) => {
    const summary = parseObject(value(dashboard.value, ...keys))
    const rangeRaw = summary.scaleRange
    const rangeObject = parseObject(rangeRaw)
    const rangeArray = Array.isArray(rangeRaw) ? rangeRaw : typeof rangeRaw === 'string' ? (() => { try { const parsed: unknown = JSON.parse(rangeRaw); return Array.isArray(parsed) ? parsed : [] } catch { return [] } })() : []
    const minimum = number(rangeArray[0] ?? value(rangeObject,'min','minimum','start','low')) ?? 0
    const maximum = number(rangeArray[1] ?? value(rangeObject,'max','maximum','end','high')) ?? 10
    const current = number(summary.currentValue)
    const reference = number(summary.referenceValue)
    const delta = current !== null && reference !== null ? current - reference : null
    const position = current === null || maximum <= minimum ? 0 : Math.min(100, Math.max(0, (current - minimum) / (maximum - minimum) * 100))
    return { label, current, reference, delta, minimum, maximum, position }
  })
})
const markets = computed(() => (dashboard.value?.market_overview_data ?? []).slice(0, 10).map(row => {
  const score = number(value(row,'closeSentiment','optix','value')) ?? 0
  const meterPosition = Math.min(100, Math.max(0, (score - 1) / 6 * 100))
  return [text(value(row,'chart_name','name','market')), text(value(row,'close')), String(score), score <= 3 ? 'Pessimistic' : score >= 5 ? 'Optimistic' : 'Neutral', date(text(value(row,'data_date','date','last_update'), '')), String(meterPosition)]
}))
const marketColumns = [
  { key: 'market', label: 'Market', index: 0, kind: 'text' },
  { key: 'close', label: 'Close', index: 1, kind: 'number' },
  { key: 'optix', label: 'Optix Value', index: 2, kind: 'number' },
  { key: 'sentiment', label: 'Sentiment', index: 3, kind: 'text' },
] as { key: string; label: string; index: number; kind: 'number' | 'date' | 'text' }[]
const sortedMarkets = computed(() => {
  const column = marketColumns.find(item => item.key === marketSortKey.value)
  if (!column) return markets.value
  return markets.value.map((row, index) => ({ row, index })).sort((left, right) => {
    const leftRaw = left.row[column.index] ?? ''
    const rightRaw = right.row[column.index] ?? ''
    const leftValue = column.kind === 'number' ? Number(leftRaw) : column.kind === 'date' ? Date.parse(leftRaw) : leftRaw.toLowerCase()
    const rightValue = column.kind === 'number' ? Number(rightRaw) : column.kind === 'date' ? Date.parse(rightRaw) : rightRaw.toLowerCase()
    const result = leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0
    return (marketSortDirection.value === 'asc' ? result : -result) || left.index - right.index
  }).map(item => item.row)
})
function sortMarkets(key: string) {
  if (marketSortKey.value === key) marketSortDirection.value = marketSortDirection.value === 'asc' ? 'desc' : 'asc'
  else { marketSortKey.value = key; marketSortDirection.value = 'asc' }
}
function marketSortIcon(key: string) { return marketSortKey.value !== key ? ArrowUpDown : marketSortDirection.value === 'asc' ? ArrowUp : ArrowDown }
function mapExtremeCards(rows: MetricRow[] | undefined, tone: 'pessimism' | 'optimism') {
  return (rows ?? []).map((row, index) => {
    const optix = number(value(row, 'optix', 'Optix', 'closeSentiment', 'last_value', 'value'))
    const midpoint = optix !== null && Math.abs(optix) <= 1 ? .5 : 50
    return {
      id: text(value(row, 'url', 'chart_url', 'chart_id', 'id', 'symbol'), `${tone}-${index}`),
      trendKey: text(value(row, 'url', 'chart_url', 'chart_id', 'id', 'symbol'), ''),
      name: text(value(row, 'chart_name', 'name', 'title')),
      optix,
      optixLabel: text(value(row, 'optix', 'Optix', 'closeSentiment', 'last_value', 'value')),
      change: number(value(row, 'last_change', 'change', 'daily_change')),
      changeIsPercent: text(value(row, 'last_change_type'), '').toLowerCase() === 'percent',
      group: text(value(row, 'sub_type', 'group', 'category'), tone === 'pessimism' ? 'Excess Pessimism' : 'Excess Optimism'),
      localTrend: normalizeTrendSeries(value(row, 'trend', 'recent_data', 'chart_data', 'values', 'series', 'data')).map(line => line.slice(-30)),
      tone,
      extremeness: optix === null ? -index : Math.abs(optix - midpoint),
    }
  }).sort((a, b) => {
    const aChange = a.change ?? (tone === 'pessimism' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY)
    const bChange = b.change ?? (tone === 'pessimism' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY)
    return tone === 'pessimism' ? bChange - aChange : aChange - bChange
  }).slice(0, 4)
}
const pessimismCards = computed(() => mapExtremeCards(dashboard.value?.pess_extreme, 'pessimism'))
const optimismCards = computed(() => mapExtremeCards(dashboard.value?.opt_extreme, 'optimism'))
const pessimismCount = computed(() => dashboard.value?.pess_extreme.length ?? 0)
const optimismCount = computed(() => dashboard.value?.opt_extreme.length ?? 0)
const commentaryRows = computed(() => dashboard.value?.latest_commentary ?? [])
const webinarRows = computed(() => dashboard.value?.htop_webinar ?? [])
const featuredWebinar = computed(() => webinarRows.value[0] ?? null)
const heatmap = computed(() => { const bucket = dashboard.value?.heatmap_data?.[selectedHeatmapIndex.value]; if (!Array.isArray(bucket)) return []; return bucket.slice(0,20).flatMap(item => { if (!Array.isArray(item)) return []; const score = number(item[3]) ?? 4; const tone = score <= 2 ? 'heat-strong-green' : score <= 3 ? 'heat-soft-green' : score >= 6 ? 'heat-red' : score >= 5 ? 'heat-soft-red' : 'heat-soft-green'; return [{ name: text(item[0]), value: text(item[2]), tone, thumbnail: chartThumbnail(item[1]) }] }) })
const sectors = computed(() => sectorRows.value.slice(0,5).map(row => { const score = number(value(row,'constituent_trend_score','trend_score','trend')) ?? 0; return [text(value(row,'index_name','sector')), score, score >= 6 ? 'Bullish' : score <= 4 ? 'Bearish' : 'Neutral'] as [string,number,string] }))
const rankedSectors = computed(() => [...sectors.value].sort((a,b) => b[1] - a[1]))
const spotlightCharts = computed(() => { const raw = dashboard.value?.dashboard_spotlight_data?.data; const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw) } catch { return [] } })() : raw; return Array.isArray(parsed) ? parsed.slice(0,4).filter((item): item is MetricRow => !!item && typeof item === 'object') : [] })
const shortIndicatorRows = computed(() => compactRankRows(dashboard.value?.short_indicators_data, 5))
const intermediateIndicatorRows = computed(() => compactRankRows(dashboard.value?.int_indicators_data, 5))
const highlightedIndicators = computed(() => parseList(dashboard.value?.blogs_and_charts).filter((item): item is MetricRow => !!item && typeof item === 'object').slice(0, 5))
const rankingOptions = [
  { key: 'sector_chart_data', label: 'Sectors' },
  { key: 'bond_bar_data', label: 'Bonds' },
  { key: 'commods_data', label: 'Commodities' },
  { key: 'currency_data', label: 'Currencies' },
  { key: 'stock_chart_data', label: 'Stocks' },
]
const activeRankingRows = computed(() => compactRankRows(dashboard.value?.[rankingTab.value], 6).sort((a, b) => b.value - a.value))
const phaseSummary = computed(() => { const raw = dashboard.value?.phase_table_data; const data = raw && typeof raw === 'object' ? raw as Record<number, unknown> : {}; return [1,2,3].map((index) => { const rows = Array.isArray(data[index]) ? data[index] as unknown[] : []; return { label: index === 1 ? 'Improving' : index === 2 ? 'Neutral' : 'Deteriorating', count: rows.length, names: rows.slice(0,2).map(row => Array.isArray(row) ? text(row[3]) : '').filter(Boolean).join(', ') } }) })
const marketMoodScore = computed(() => {
  const smart = smartLast.value === null ? 50 : smartLast.value * 100
  const dumb = dumbLast.value === null ? 50 : (1 - dumbLast.value) * 100
  const marketValues = markets.value.map(row => number(row[2])).filter((item): item is number => item !== null)
  const crossMarket = marketValues.length ? marketValues.reduce((sum,item) => sum + (7-item)/6*100, 0) / marketValues.length : 50
  const pess = dashboard.value?.pess_extreme.length ?? 0; const opt = dashboard.value?.opt_extreme.length ?? 0
  const extremes = pess + opt ? 50 + (pess-opt)/(pess+opt)*50 : 50
  const heatValues = (dashboard.value?.heatmap_data?.[0] as unknown[] | undefined)?.flatMap(item => Array.isArray(item) ? [number(item[3])] : []).filter((item): item is number => item !== null) ?? []
  const heat = heatValues.length ? heatValues.reduce((sum,item) => sum + (7-item)/6*100,0)/heatValues.length : 50
  const trend = sectors.value.length ? sectors.value.reduce((sum,item) => sum + item[1]*10,0)/sectors.value.length : 50
  return Math.min(100,Math.max(0,smart*.3+dumb*.2+crossMarket*.2+extremes*.15+heat*.1+trend*.05))
})
const marketMoodLabel = computed(() => marketMoodScore.value >= 80 ? 'Strongly Positive' : marketMoodScore.value >= 60 ? 'Positive' : marketMoodScore.value >= 52.5 ? 'Slightly Positive' : marketMoodScore.value >= 47.5 ? 'Neutral' : marketMoodScore.value >= 40 ? 'Slightly Negative' : marketMoodScore.value >= 20 ? 'Negative' : 'Strongly Negative')
const riskBalance = computed(() => { const scores = assetScores.value.filter(item => item.current !== null); return scores.length ? scores.reduce((sum,item) => sum + ((item.current!-item.minimum)/(item.maximum-item.minimum||1)*10),0)/scores.length : null })
const riskBalanceLabel = computed(() => riskBalance.value === null ? 'Unavailable' : riskBalance.value < 3.5 ? 'Low risk' : riskBalance.value > 6.5 ? 'High risk' : 'Neutral')

async function load() {
  controller?.abort(); controller = new AbortController(); loading.value = true; loadError.value = false
  try {
    const [classic, sectors, relevant, studies] = await Promise.all([
      fetchClassicDashboard(controller.signal),
      fetchDashboardSectors(controller.signal),
      fetchMostRelevantIndicators(controller.signal).catch(() => []),
      fetchActiveStudies(controller.signal).catch(() => ({ items: [], summary: { shortTermBullish: 0, shortTermBearish: 0, mediumTermBullish: 0, mediumTermBearish: 0, longTermBullish: 0, longTermBearish: 0 } })),
    ])
    dashboard.value = classic; sectorRows.value = sectors
    relevantIndicators.value = relevant.slice(0, 5)
    activeStudies.value = studies.items.slice(0, 5)
    const trendKeys = [...classic.pess_extreme, ...classic.opt_extreme].map(row => text(value(row, 'url', 'chart_url', 'chart_id', 'id', 'symbol'), '')).filter(Boolean)
    try { extremeTrends.value = await fetchIndicatorTrends(trendKeys, controller.signal) } catch { extremeTrends.value = {} }
  }
  catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) loadError.value = true }
  finally { loading.value = false }
}
onMounted(load)
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <main class="classic-dashboard">
    <div class="classic-page">
    <section class="classic-switcher">
      <div><strong>Classic Dashboard</strong><span>The familiar market intelligence overview is your default dashboard.</span></div>
      <RouterLink class="dashboard-switch-link" to="/my-dashboard">Switch to My Dashboard <ArrowRight :size="15" /></RouterLink>
    </section>

    <header class="classic-heading">
      <div><h1>Daily Summary</h1><p>Your daily market sentiment and trend overview.</p></div>
      <div class="classic-actions"><span>Data current as of {{ date(dashboard?.date ?? '') }}</span><button type="button" :disabled="loading" @click="load"><RefreshCw :size="16"/> {{ loading ? 'Loading…' : 'Refresh' }}</button></div>
    </header>
    <div v-if="loadError" class="dashboard-load-error">Classic Dashboard data could not be loaded. <button type="button" @click="load">Try again</button></div>

    <div class="mobile-sidebar-trigger"><button type="button" @click="isSidebarOpen = true"><Menu :size="19" /> Market Intelligence</button></div>
    <div class="classic-layout">
      <aside class="classic-sidebar">
        <h2>Market Intelligence</h2>
        <nav>
          <component :is="item.to ? 'RouterLink' : 'a'" v-for="item in navigation" :key="item.label" :to="item.to" :href="item.anchor ? `#${item.anchor}` : undefined" :class="{ active: item.active }">
            <component :is="item.icon" :size="18"/><span>{{ item.label }}</span><b>9</b>
          </component>
        </nav>
      </aside>

      <section class="classic-content">
        <section class="summary-grid" aria-label="Daily market summary">
          <article class="summary-card summary-card--mood"><span class="summary-icon"><Smile :size="21"/></span><div><small>Market Mood</small><strong class="summary-label">{{ marketMoodLabel }}</strong></div><div class="mood-meter"><i :style="{width:`${marketMoodScore}%`}"/></div><ArrowRight :size="18" class="summary-arrow"/></article>
          <article v-for="card in confidence" :key="card.title" class="summary-card" :class="card.tone"><span class="summary-icon"><BarChart3 :size="21"/></span><div><small><span class="confidence-title-full">{{ card.title }}</span><span class="confidence-title-short">{{ card.shortTitle }}</span></small><span class="summary-value"><strong>{{ card.value }}</strong><b>/ 100</b><em v-if="card.delta !== null"><ArrowUp v-if="card.delta >= 0" :size="13"/><ArrowDown v-else :size="13"/>{{ Number((Math.abs(card.delta)*100).toFixed(1)) }}%</em></span></div><svg viewBox="0 0 104 34" preserveAspectRatio="none"><defs><linearGradient :id="`summary-fill-${card.tone}`" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" :stop-color="card.tone === 'positive' ? 'var(--app-positive)' : 'var(--app-negative)'" stop-opacity=".28"/><stop offset="100%" :stop-color="card.tone === 'positive' ? 'var(--app-positive)' : 'var(--app-negative)'" stop-opacity="0"/></linearGradient></defs><polygon v-if="card.points" :points="`0,34 ${card.points} 104,34`" :fill="`url(#summary-fill-${card.tone})`"/><polyline :points="card.points"/></svg><ArrowRight :size="18" class="summary-arrow"/></article>
          <article class="summary-card summary-card--risk"><span class="summary-icon"><Scale :size="21"/></span><div><small>Risk Balance</small><span class="summary-value"><strong>{{ riskBalance === null ? '—' : riskBalance.toFixed(1) }}</strong><b>/ 10</b></span><em>{{ riskBalanceLabel }}</em></div><ArrowRight :size="18" class="summary-arrow"/></article>
        </section>
        <div class="top-grid">
          <article class="dash-panel confidence-chart">
            <header><h2>Smart Money / Dumb Money Confidence <CircleHelp :size="14"/></h2><div class="range-tabs"><button v-for="item in ['1Y','3Y','5Y','10Y','All']" :key="item" :class="{active:range===item}" @click="range=item">{{ item }}</button></div></header>
            <ClassicConfidenceChart :rows="dashboard?.data ?? []" :range="range" :smart-last="smartLast" :dumb-last="dumbLast" />
          </article>

          <article class="dash-panel risk-summary-panel">
            <header><h2>Risk Summary <CircleHelp :size="14"/></h2></header>
            <section class="risk-summary" aria-label="Risk summary">
              <article v-for="score in assetScores" :key="score.label" class="risk-card">
                <header><strong>{{ score.label }}</strong></header>
                <div class="risk-card-reading">
                  <div><div class="risk-track"><i :style="{ left: `${score.position}%` }"/></div><footer><span>{{ score.minimum.toFixed(0) }}</span><span>{{ score.maximum.toFixed(0) }}</span></footer></div>
                  <strong :class="score.current !== null && score.current <= (score.minimum + score.maximum) / 2 ? 'risk-down' : 'risk-up'">{{ score.current === null ? '—' : score.current.toFixed(1).replace('.0','') }}</strong>
                </div>
              </article>
            </section>
          </article>

          <article id="extremes" class="dash-panel extremes-panel extremes-panel--featured">
            <header class="extremes-heading"><div><h2>Extremes Today <CircleHelp :size="15"/></h2></div></header>
            <div v-if="pessimismCards.length || optimismCards.length" class="extreme-columns extreme-card-columns">
              <section v-for="group in [{ title: 'Excess Pessimism', tone: 'pessimism', rows: pessimismCards, count: pessimismCount }, { title: 'Excess Optimism', tone: 'optimism', rows: optimismCards, count: optimismCount }]" :key="group.tone" class="extreme-card-group">
                <header><h3 :class="group.tone"><i/>{{ group.title }}</h3><RouterLink :to="group.tone === 'pessimism' ? '/indicators/excess-pessimism' : '/indicators/excess-optimism'">View all {{ group.count }} <ArrowRight :size="15"/></RouterLink></header>
                <div class="extreme-group-cards">
                  <article v-for="item in group.rows" :key="item.id" class="extreme-favorite-card" :class="`extreme-favorite-card--${item.tone}`">
                    <div class="extreme-card-details">
                      <div class="extreme-favorite-main"><RouterLink :to="{ name: 'indicator-detail', params: { id: item.id } }">{{ item.name }}</RouterLink></div>
                      <div class="extreme-metric-line">
                        <span class="extreme-value-label">Value:</span>
                        <span class="extreme-value-number">{{ item.optixLabel }}</span>
                        <span :class="item.change !== null && item.change < 0 ? 'negative-value' : item.change !== null && item.change > 0 ? 'positive-value' : ''">
                          <ArrowDown v-if="item.change !== null && item.change < 0" :size="14"/>
                          <ArrowUp v-else-if="item.change !== null && item.change > 0" :size="14"/>
                          {{ formatExtremeChange(item.change, item.changeIsPercent) }}
                        </span>
                      </div>
                    </div>
                    <div class="extreme-chart-wrap"><IndicatorSparkline class="extreme-trend" :series="extremeTrends[item.trendKey]?.length ? extremeTrends[item.trendKey] : item.localTrend" :tone="item.tone === 'pessimism' ? 'green' : 'red'" :width="220" :height="72"/></div>
                  </article>
                </div>
              </section>
            </div>
            <p v-else class="panel-empty">{{ loading ? 'Loading extremes…' : 'No extreme indicators available.' }}</p>
          </article>
        </div>

        <h2 class="section-heading"><BarChart3 :size="17"/> Market Sentiment Snapshot</h2>
        <div class="middle-grid section-surface">
          <article class="dash-panel indicator-summary-panel indicator-summary-panel--compact">
            <header><h2>Indicator Summary <CircleHelp :size="14"/></h2><RouterLink to="/indicators">Open indicators <ArrowRight :size="14"/></RouterLink></header>
            <div class="indicator-summary-groups">
              <section v-for="group in [{ title: 'Short-Term', rows: shortIndicatorRows }, { title: 'Intermediate-Term', rows: intermediateIndicatorRows }]" :key="group.title">
                <h3>{{ group.title }} <small>0 – 100</small></h3>
                <div v-if="group.rows.length" class="summary-bars">
                  <div v-for="row in group.rows" :key="row.name" class="summary-bar-row">
                    <div class="summary-metric-head"><span>{{ row.name }}</span><b>{{ row.value.toFixed(0) }}</b></div>
                    <i><em :class="row.value < 50 ? 'low' : 'high'" :style="{ left: `${Math.min(50, Math.max(0, row.value))}%`, width: `${Math.min(50, Math.abs(row.value - 50))}%` }"/></i>
                  </div>
                </div>
                <p v-else class="panel-empty">{{ loading ? 'Loading indicators…' : 'No indicator summary available.' }}</p>
              </section>
            </div>
          </article>
          <article class="dash-panel market-table-panel">
            <header><h2>Cross-Market Sentiment <CircleHelp :size="14"/></h2><RouterLink to="/indicators/market-sentiment-overview">Open full view <ArrowRight :size="14"/></RouterLink></header>
            <div class="table-scroll"><table><thead><tr><th v-for="column in marketColumns" :key="column.key" :aria-sort="marketSortKey === column.key ? (marketSortDirection === 'asc' ? 'ascending' : 'descending') : 'none'"><button type="button" :class="{ active: marketSortKey === column.key }" @click="sortMarkets(column.key)"><span>{{ column.label }}</span><component :is="marketSortIcon(column.key)" :size="13"/></button></th></tr></thead><tbody><tr v-for="row in sortedMarkets" :key="row[0]"><td><a href="#">{{ row[0] }}</a></td><td>{{ row[1] }}</td><td>{{ row[2] }}</td><td><span class="sentiment-meter"><i :style="{left:`${row[5]}%`}"/></span><b :class="String(row[3]).toLowerCase()">{{ row[3] }}</b></td></tr></tbody></table></div>
          </article>

          <article class="dash-panel correlation-panel">
            <header><h2>S&amp;P 500 Most Correlated Indicators</h2></header>
            <div class="correlation-head"><span>Indicator</span><span>Value</span><span>Correlation</span></div>
            <a v-for="row in relevantIndicators" :key="text(value(row,'url','chart_name'))" class="correlation-row" :href="`/backtester/sr/setup?index=Unknown&indicator=${encodeURIComponent(text(row.url,''))}`"><span>{{ text(row.chart_name) }}</span><b>{{ number(row.latest_value)?.toFixed(2) ?? '—' }}</b><strong>{{ number(row.corr_kendall)?.toFixed(2) ?? '—' }}</strong></a>
            <p v-if="!relevantIndicators.length" class="panel-empty">{{ loading ? 'Loading correlations…' : 'No correlation data available.' }}</p>
          </article>

          <article class="dash-panel commentary-panel">
            <header><h2>Latest Commentary</h2><RouterLink to="/MR/reports">View all <ArrowRight :size="14"/></RouterLink></header>
            <button v-if="featuredWebinar" type="button" class="featured-commentary featured-webinar" @click="activeWebinar = featuredWebinar">
              <img :src="webinarCover" alt="Client webinar: Market Indicators" />
              <span><strong>{{ text(featuredWebinar.title, 'Client Webinar') }}</strong><small>{{ commentaryDate(featuredWebinar.date) }}</small><span>{{ text(featuredWebinar.meta_description ?? featuredWebinar.content, 'Watch the latest client webinar.') }}</span></span>
            </button>
            <a class="story-link" href="https://users.sentimentrader.com/users/account/backtest_support/"><span>Backtest Concierge Setup Service<small>{{ commentaryDate('2025-08-29') }}</small></span></a>
            <component :is="isExternalReport(story) ? 'a' : 'RouterLink'" v-for="story in commentaryRows.slice(0, 3)" :key="text(story.url, text(story.title))" class="story-link" :href="isExternalReport(story) ? reportHref(story) : undefined" :to="isExternalReport(story) ? undefined : reportHref(story)"><span>{{ text(story.title) }}<small>{{ commentaryDate(story.post_date) }}</small></span></component>
          </article>

          <article id="heatmap" class="dash-panel heatmap-panel">
            <header><h2>Heatmap Preview</h2><RouterLink to="/indicators/optix-heatmap">Open full view <ArrowRight :size="14"/></RouterLink></header>
            <div class="heat-tabs"><button v-for="average in heatmapMovingAverages" :key="average.days" type="button" :class="{ active: selectedHeatmapIndex === average.dataIndex }" @click="selectedHeatmapIndex = average.dataIndex">{{ average.days }} Days</button></div>
            <div v-if="heatmap.length" class="heatmap"><div v-for="cell in heatmap" :key="cell.name" :class="cell.tone" @mouseenter="showHeatmapPreview($event, cell)" @mousemove="moveHeatmapPreview" @mouseleave="heatmapHover = null"><span>{{ cell.name }}</span><strong>{{ cell.value }}</strong></div></div><p v-else class="panel-empty">{{ loading ? 'Loading heatmap…' : 'No heatmap data available.' }}</p>
            <div class="heat-legend"><span>More Pessimistic</span><i/><span>More Optimistic</span></div>
          </article>
        </div>

        <h2 class="section-heading"><BriefcaseBusiness :size="17"/> Research &amp; Studies</h2>
        <article class="dash-panel research-panel">
          <header><div class="research-tabs"><button type="button" :class="{ active: researchTab === 'highlighted' }" @click="researchTab = 'highlighted'">Highlighted Indicators</button><button type="button" :class="{ active: researchTab === 'active' }" @click="researchTab = 'active'">Active Studies</button></div><RouterLink to="/MR/active_studies">Open full view <ArrowRight :size="14"/></RouterLink></header>
          <div v-if="researchTab === 'highlighted'" class="research-list"><a v-for="item in highlightedIndicators" :key="text(value(item,'chart_url','title'))" :href="`/backtester/sr/setup?index=${encodeURIComponent(text(item.market_symbol,'Unknown'))}&indicator=${encodeURIComponent(text(item.chart_url,''))}`"><span><strong>{{ text(item.chart_name, text(item.title)) }}</strong><small>{{ text(item.title) }}</small></span><b>{{ text(item.last_value,'—') }}</b></a><p v-if="!highlightedIndicators.length" class="panel-empty">No highlighted indicators available.</p></div>
          <div v-else class="research-list"><a v-for="study in activeStudies" :key="study.id" :href="study.href"><span><strong>{{ study.title }}</strong><small>{{ study.market }} · {{ study.timeframe }}</small></span><b :class="study.forecast.toLowerCase()">{{ study.forecast }}</b></a><p v-if="!activeStudies.length" class="panel-empty">No active studies available.</p></div>
        </article>

        <h2 class="section-heading"><ChartNoAxesCombined :size="17"/> Market Structure</h2>
        <div class="bottom-grid section-surface">
          <article class="dash-panel chart-summary-panel"><header><h2>Chart Summary</h2><RouterLink to="/indicators/chart-summary">Open full view <ArrowRight :size="14"/></RouterLink></header><div class="chart-summary-grid"><RouterLink v-for="study in spotlightCharts" :key="text(value(study,'chart_id','symbol','title'))" :to="`/indicators/${text(value(study,'symbol'))}`"><strong>{{ text(value(study,'title','chart_name')) }}</strong><ChartSummaryMiniChart :data="study.data" :name="text(value(study,'chart_name','title'),'Indicator')"/><small>{{ text(value(study,'chart_name','yaxistext'),'View chart') }}</small></RouterLink></div><p v-if="!spotlightCharts.length" class="panel-empty">{{ loading ? 'Loading charts…' : 'No summary charts available.' }}</p></article>
          <article class="dash-panel sector-panel"><header><h2>Sector Trend Score</h2><RouterLink to="/trend_score?enlarge=TrendSector">Open full view <ArrowRight :size="14"/></RouterLink></header><div class="sector-head"><span>Sector <ArrowUpDown :size="12"/></span><span>Avg. Trend Score <small>/10</small> <ArrowDown :size="12"/></span></div><div v-for="sector in rankedSectors" :key="sector[0]" class="sector-row"><RouterLink to="/trend_score">{{ sector[0] }}</RouterLink><span><b>{{ sector[1].toFixed(2) }}</b><i><em :style="{width:`${Math.min(100, Math.max(0, Number(sector[1]) * 10))}%`}"/></i></span></div></article>
          <div class="stacked-previews"><article id="phase-table" class="dash-panel"><header><h2>Phase Table Preview</h2><RouterLink to="/indicators/phase-table">Open full view <ArrowRight :size="14"/></RouterLink></header><div v-for="(phase,index) in phaseSummary" :key="phase.label" class="preview-row"><span><i class="dot" :class="index === 0 ? 'positive' : index === 1 ? 'neutral' : 'negative'"/> {{ phase.label }}</span><b>{{ phase.count }}</b><em>{{ phase.names || '—' }}</em></div></article><article id="ranks" class="dash-panel rankings-panel"><header><h2>Market Rankings</h2><RouterLink to="/indicators/rank-charts">Open full view <ArrowRight :size="14"/></RouterLink></header><div class="ranking-tabs"><button v-for="option in rankingOptions" :key="option.key" type="button" :class="{active:rankingTab===option.key}" @click="rankingTab=option.key">{{ option.label }}</button></div><div class="ranking-list"><div v-for="row in activeRankingRows" :key="row.name"><span>{{ row.name }}</span><i><em :style="{width:`${Math.min(100,Math.max(0,row.value))}%`}"/></i><b>{{ row.value.toFixed(0) }}</b></div></div><p v-if="!activeRankingRows.length" class="panel-empty">No ranking data available.</p></article></div>
        </div>
      </section>
    </div>
    </div>

    <Teleport to="body"><div v-if="isSidebarOpen" class="sidebar-overlay" @click.self="isSidebarOpen=false"><aside class="sidebar-drawer"><header><h2>Market Intelligence</h2><button @click="isSidebarOpen=false"><X :size="20"/></button></header><nav><component :is="item.to ? 'RouterLink' : 'a'" v-for="item in navigation" :key="item.label" :to="item.to" :href="item.anchor ? `#${item.anchor}` : undefined" :class="{active:item.active}" @click="isSidebarOpen=false"><component :is="item.icon" :size="18"/><span>{{ item.label }}</span></component></nav></aside></div></Teleport>
    <Teleport to="body">
      <div v-if="activeWebinar" class="webinar-modal-backdrop" role="presentation" @click.self="activeWebinar = null">
        <section class="webinar-modal" role="dialog" aria-modal="true" aria-labelledby="webinar-modal-title">
          <header><div><small>Client Webinar</small><h2 id="webinar-modal-title">{{ text(activeWebinar.title, 'Webinar') }}</h2><p>{{ date(text(activeWebinar.date, '')) }}</p></div><button type="button" aria-label="Close webinar" @click="activeWebinar = null"><X :size="20"/></button></header>
          <div class="webinar-modal-content"><div v-if="activeWebinar.text1" v-html="activeWebinar.text1"/><hr v-if="activeWebinar.text1 && activeWebinar.text2"/><div v-if="activeWebinar.text2" v-html="activeWebinar.text2"/><p v-if="!activeWebinar.text1 && !activeWebinar.text2">Webinar details are not available.</p></div>
        </section>
      </div>
    </Teleport>
    <Teleport to="body"><div v-if="heatmapHover" class="heatmap-preview-popover" :style="{ left: `${heatmapHover.x}px`, top: `${heatmapHover.y}px` }"><div><strong>{{ heatmapHover.name }}</strong><span>Value: {{ heatmapHover.value }}</span></div><img v-if="heatmapHover.thumbnail" :src="heatmapHover.thumbnail" :alt="`${heatmapHover.name} chart preview`" @error="hideHeatmapThumbnail" /></div></Teleport>
  </main>
</template>

<style scoped>
.classic-dashboard{min-height:100vh;background:var(--app-bg);color:var(--app-text)}.classic-page{padding:2rem var(--page-gutter) 3rem}
.classic-switcher{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.25rem;border:1px solid var(--app-border);border-radius:8px;background:var(--app-primary-soft);padding:.75rem 1rem}.classic-switcher div{display:flex;align-items:center;gap:.65rem}.classic-switcher strong{font-size:.9rem}.classic-switcher span{color:var(--app-text-muted);font-size:.8rem}.dashboard-switch-link,.classic-actions button{display:inline-flex;min-height:2.5rem;align-items:center;justify-content:center;gap:.4rem;border:1px solid var(--app-border);border-radius:6px;background:var(--app-surface);padding:.5rem .85rem;color:var(--app-primary);font-size:.78rem;font-weight:700;text-decoration:none;cursor:pointer}.dashboard-switch-link{border-color:var(--app-primary)}
.classic-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:1.5rem;margin-bottom:1.25rem}.classic-heading h1{margin:0;color:var(--app-text);font-size:clamp(1.7rem,2.2vw,2.25rem);font-weight:700;line-height:1.2;letter-spacing:-.025em}.classic-heading p{margin:.4rem 0 0;color:var(--app-text-muted);font-size:.875rem}.classic-actions{display:flex;flex:none;align-items:center;gap:.5rem}.classic-actions>span{margin-right:.35rem;color:var(--app-text-muted);font-size:.75rem;white-space:nowrap}
.dashboard-load-error{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1rem;border:1px solid color-mix(in srgb,var(--app-negative) 35%,var(--app-border));border-radius:8px;background:color-mix(in srgb,var(--app-negative) 8%,var(--app-surface));padding:.75rem 1rem;color:var(--app-negative);font-size:.8rem}.dashboard-load-error button{border:0;background:transparent;color:inherit;font-weight:700;cursor:pointer}.panel-empty{margin:0;padding:1rem;color:var(--app-text-muted);font-size:.78rem}
.classic-layout{display:grid;grid-template-columns:220px minmax(0,1fr);align-items:start;gap:1rem}.classic-sidebar{position:sticky;top:1rem;border:1px solid var(--app-border);border-radius:8px;background:var(--app-surface);padding:.75rem}.classic-sidebar h2{margin:.25rem .75rem .6rem;color:var(--app-text);font-size:.78rem;font-weight:800;letter-spacing:.055em;text-transform:uppercase}.classic-sidebar nav,.sidebar-drawer nav{display:flex;flex-direction:column}.classic-sidebar a,.sidebar-drawer a{display:flex;min-height:52px;align-items:center;gap:.75rem;margin-bottom:.2rem;border-radius:6px;padding:.65rem .75rem;color:var(--app-text);font-size:.875rem;font-weight:600;text-decoration:none;transition:background-color 150ms,color 150ms}.classic-sidebar a>svg{width:32px;color:var(--app-text-secondary)}.classic-sidebar a:hover,.sidebar-drawer a:hover{background:var(--app-surface-soft);color:var(--app-primary)}.classic-sidebar a.active,.sidebar-drawer a.active{background:var(--app-primary-soft);color:var(--app-text)}.classic-sidebar a.active>svg{color:var(--app-primary)}.classic-sidebar a b{display:grid;width:21px;height:21px;margin-left:auto;place-items:center;border-radius:999px;background:var(--app-surface);color:var(--app-text-muted);font-size:.68rem}
.classic-content{min-width:0}
.classic-layout{grid-template-columns:minmax(0,1fr)}.classic-sidebar,.mobile-sidebar-trigger{display:none!important}
.summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem;margin-bottom:1rem}.summary-card{position:relative;display:grid;min-height:7.7rem;grid-template-columns:48px minmax(0,1fr) 96px 18px;align-items:center;gap:.85rem;overflow:hidden;border:1px solid var(--app-border);border-radius:9px;background:var(--app-surface);padding:1rem;box-shadow:0 1px 3px color-mix(in srgb,var(--app-text) 5%,transparent);transition:border-color .16s,transform .16s,box-shadow .16s}.summary-card:hover{border-color:color-mix(in srgb,var(--app-primary) 45%,var(--app-border));transform:translateY(-1px);box-shadow:0 5px 14px color-mix(in srgb,var(--app-text) 8%,transparent)}.summary-icon{display:grid;width:48px;height:48px;place-items:center;border-radius:8px;background:var(--app-primary-soft);color:var(--app-primary)}.summary-card.positive .summary-icon{background:color-mix(in srgb,var(--app-positive) 11%,var(--app-surface));color:var(--app-positive)}.summary-card.negative .summary-icon{background:color-mix(in srgb,var(--app-negative) 10%,var(--app-surface));color:var(--app-negative)}.summary-card--risk .summary-icon{background:color-mix(in srgb,var(--app-accent) 11%,var(--app-surface));color:var(--app-accent)}.summary-card small{display:block;overflow:hidden;color:var(--app-text-secondary);font-size:.76rem;font-weight:650;line-height:1.25;text-overflow:ellipsis;white-space:nowrap}.summary-label{display:block;margin-top:.45rem;color:var(--app-positive);font-size:.75rem}.summary-value{display:flex;align-items:baseline;gap:.5rem;margin-top:.45rem}.summary-value strong{font-size:1.85rem;font-weight:750;line-height:1}.summary-value em{color:var(--app-text-muted);font-size:.68rem;font-style:normal;white-space:nowrap}.summary-card.positive .summary-value em{color:var(--app-positive)}.summary-card.negative .summary-value em{color:var(--app-negative)}.summary-value b{color:var(--app-text-muted);font-size:.85rem;font-weight:500}.summary-card>svg:not(.summary-arrow){width:96px;height:38px}.summary-card polyline{fill:none;stroke:var(--app-positive);stroke-width:2.25}.summary-card.negative polyline{stroke:var(--app-negative)}.summary-arrow{color:var(--app-primary)}.summary-card--mood{grid-template-columns:48px minmax(0,1fr) 80px 18px}.mood-meter{height:8px;border-radius:999px;background:var(--app-surface-muted)}.mood-meter i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--app-primary),var(--app-positive))}.summary-card--risk{grid-template-columns:48px minmax(0,1fr) 18px}.summary-card--risk>div>em{display:block;margin-top:.25rem;color:var(--app-text-muted);font-size:.68rem;font-style:normal}.section-heading{display:flex;align-items:center;gap:.45rem;margin:1rem 0 .55rem;color:var(--app-text);font-size:.9rem;font-weight:700}.section-heading>svg{color:var(--app-primary)}.section-heading small{color:var(--app-text-secondary);font-size:.72rem;font-weight:500}.section-surface{border:1px solid var(--app-border);border-radius:9px;background:var(--app-surface-soft);padding:.5rem}
.summary-card.positive,.summary-card.negative{grid-template-columns:48px minmax(0,1fr) 120px 18px}.summary-card.positive>svg:not(.summary-arrow),.summary-card.negative>svg:not(.summary-arrow){width:120px;height:58px}.summary-card polyline{stroke-width:2;vector-effect:non-scaling-stroke}
.score-strip{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:.75rem;margin-bottom:.75rem}.confidence-card{position:relative;display:grid;grid-column:span 6;grid-template-columns:minmax(0,1fr) 132px;min-height:82px;align-items:center;gap:1.25rem;overflow:hidden;border:1px solid var(--app-border);border-radius:7px;background:var(--app-surface);padding:.7rem 1rem .7rem 1.05rem}.confidence-card .accent{position:absolute;inset:.5rem auto .5rem .45rem;width:3px;border-radius:4px;background:var(--app-positive)}.confidence-card.negative .accent{background:var(--app-negative)}.confidence-card>div{display:grid;grid-template-columns:minmax(0,1fr) auto;min-width:0;align-items:center;column-gap:1.25rem;padding-left:.35rem}.confidence-card small{font-size:.78rem;font-weight:700;line-height:1.3}.confidence-card strong{min-width:2.1ch;font-size:1.55rem;text-align:right}.confidence-card em{grid-column:1/-1;margin-top:.15rem;color:var(--app-positive);font-size:.72rem;font-style:normal;white-space:nowrap}.confidence-card.negative em{color:var(--app-negative)}.confidence-card svg{width:132px;height:44px}.confidence-card polyline{fill:none;stroke:var(--app-positive);stroke-width:2.25}.confidence-card.negative polyline{stroke:var(--app-negative)}
.risk-summary{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:.75rem;margin-bottom:1rem}.risk-card{min-width:0;border:1px solid var(--app-border);border-radius:8px;background:var(--app-surface);padding:.75rem .85rem;box-shadow:0 2px 7px color-mix(in srgb,var(--app-text) 5%,transparent)}.risk-card header{display:flex;align-items:center;justify-content:space-between;gap:.5rem}.risk-card header>strong{overflow:hidden;color:var(--app-text);font-size:.72rem;text-overflow:ellipsis;white-space:nowrap}.risk-card header>span{font-size:.68rem;font-weight:700}.risk-up{color:var(--app-negative)}.risk-down{color:var(--app-positive)}.risk-value{display:flex;align-items:baseline;gap:.25rem;margin:.25rem 0 .55rem}.risk-value strong{font-size:1.45rem;line-height:1}.risk-value span{color:var(--app-text-muted);font-size:.8rem}.risk-track{position:relative;height:8px;border-radius:999px;background:linear-gradient(90deg,var(--app-positive),color-mix(in srgb,var(--app-positive) 35%,var(--app-surface)),color-mix(in srgb,var(--app-negative) 32%,var(--app-surface)),var(--app-negative))}.risk-track i{position:absolute;top:50%;width:14px;height:14px;transform:translate(-50%,-50%);border:2px solid var(--app-surface);border-radius:50%;background:var(--app-text);box-shadow:0 1px 3px color-mix(in srgb,var(--app-text) 30%,transparent)}.risk-card footer{display:flex;justify-content:space-between;margin-top:.45rem;color:var(--app-text-muted);font-size:.62rem}
.top-grid,.middle-grid,.bottom-grid{display:grid;gap:.65rem;margin-bottom:.65rem}.top-grid{grid-template-columns:minmax(0,1.55fr) minmax(340px,1fr)}.middle-grid{grid-template-columns:1.25fr .95fr 1fr}.bottom-grid{grid-template-columns:1.05fr 1.05fr 1fr}.dash-panel{min-width:0;overflow:hidden;border:1px solid var(--app-border);border-radius:8px;background:var(--app-surface)}.dash-panel>header{display:flex;min-height:38px;align-items:center;justify-content:space-between;gap:.5rem;padding:.55rem .8rem}.dash-panel h2{display:flex;align-items:center;gap:.35rem;margin:0;font-size:.9rem}.dash-panel header a,.market-table-panel a,.extremes-panel a{display:inline-flex;align-items:center;gap:.2rem;color:var(--app-primary);font-size:.69rem;text-decoration:none}.range-tabs,.heat-tabs{display:flex}.heat-tabs{overflow-x:auto}.range-tabs button,.heat-tabs button{border:0;background:var(--app-surface-muted);padding:.28rem .65rem;color:var(--app-text-secondary);font-size:.68rem;cursor:pointer}.heat-tabs button{flex:none;white-space:nowrap}.range-tabs button.active,.heat-tabs button.active{background:var(--app-primary-soft);color:var(--app-primary);font-weight:700}.chart-legend{display:flex;justify-content:center;gap:1.2rem;font-size:.66rem}.chart-legend span:before{display:inline-block;width:16px;height:2px;margin:0 .25rem 2px 0;background:var(--app-text);content:''}.chart-legend .smart:before{background:var(--app-primary)}.chart-legend .dumb:before{background:var(--app-negative)}.line-chart{width:100%;height:210px;padding:.2rem .6rem .5rem}.line-chart polyline{fill:none;stroke-width:2}.spx-line{stroke:var(--app-text)}.smart-line{stroke:var(--app-primary)}.dumb-line{stroke:var(--app-negative)}.grid-lines line{stroke:var(--app-border-muted);stroke-width:1}.axis-labels{fill:var(--app-text-muted);font-size:10px}
.commentary-panel{display:flex;flex-direction:column}.featured-commentary{display:grid;grid-template-columns:90px 1fr;gap:.65rem;padding:0 .8rem .5rem}.story-art{display:grid;min-height:70px;place-items:center;border-radius:5px;background:linear-gradient(135deg,var(--app-text-secondary),var(--app-primary-soft));color:var(--app-surface)}.featured-commentary a,.story-link{color:var(--app-primary);font-size:.72rem;font-weight:700;text-decoration:none}.featured-commentary small,.story-link small{display:block;margin-top:.15rem;color:var(--app-text-muted);font-size:.63rem;font-weight:400}.featured-commentary p{display:-webkit-box;overflow:hidden;margin:.25rem 0 0;color:var(--app-text-secondary);font-size:.66rem;line-height:1.35;-webkit-box-orient:vertical;-webkit-line-clamp:2}.commentary-panel .story-link{display:flex;min-height:28px;flex:1;align-items:center;border-top:1px solid var(--app-border-muted);padding:.4rem .8rem}
.featured-webinar{width:100%;border:0;background:transparent;color:var(--app-text);font:inherit;text-align:left;cursor:pointer}.featured-webinar img{width:80px;height:90px;border-radius:5px;object-fit:cover;object-position:center}.featured-webinar>span{display:flex;min-width:0;height:90px;flex-direction:column}.featured-webinar strong{display:block;color:var(--app-text);font-size:.78rem}.featured-webinar>span>span{display:-webkit-box;overflow:hidden;margin-top:auto;color:var(--app-text-secondary);font-size:.75rem;line-height:1.35;-webkit-box-orient:vertical;-webkit-line-clamp:2}.featured-webinar:hover strong{color:var(--app-primary)}
.webinar-modal-backdrop{position:fixed;inset:0;z-index:200;display:grid;place-items:center;background:var(--app-overlay);padding:1rem}.webinar-modal{display:flex;width:min(760px,100%);max-height:min(760px,calc(100vh - 2rem));flex-direction:column;overflow:hidden;border:1px solid var(--app-border);border-radius:12px;background:var(--app-surface);box-shadow:0 24px 64px rgb(0 0 0 / .28);color:var(--app-text)}.webinar-modal>header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;border-bottom:1px solid var(--app-border);padding:1.25rem 1.5rem}.webinar-modal>header small{color:var(--app-primary);font-size:.72rem;font-weight:700;text-transform:uppercase}.webinar-modal>header h2{margin:.2rem 0;font-size:1.25rem}.webinar-modal>header p{margin:0;color:var(--app-text-muted);font-size:.78rem}.webinar-modal>header button{display:grid;width:36px;height:36px;flex:none;place-items:center;border:1px solid var(--app-border);border-radius:6px;background:var(--app-surface);color:var(--app-text);cursor:pointer}.webinar-modal-content{overflow:auto;padding:1.5rem;font-size:.875rem;line-height:1.65}.webinar-modal-content hr{margin:1.25rem 0;border:0;border-top:1px solid var(--app-border)}.webinar-modal-content :deep(p){margin:0}.webinar-modal-content :deep(p + p){margin-top:1.25rem}.webinar-modal-content :deep(a){color:var(--app-primary);font-weight:700;text-decoration:none}.webinar-modal-content :deep(a:hover),.webinar-modal-content :deep(a:focus-visible){color:color-mix(in srgb,var(--app-primary) 72%,black)}
.market-table-panel{display:flex;flex-direction:column}.table-scroll{min-height:0;flex:1;overflow:auto}.market-table-panel table{width:100%;height:100%;border-collapse:collapse;font-size:.69rem}.market-table-panel th,.market-table-panel td{border-bottom:1px solid var(--app-border-muted);padding:.25rem .7rem;text-align:left;white-space:nowrap}.market-table-panel th{font-size:.62rem}.market-table-panel td:nth-child(2),.market-table-panel td:nth-child(3){text-align:right}.market-table-panel td:last-child{display:flex;align-items:center;gap:.45rem}.sentiment-meter{position:relative;width:75px;height:5px;border-radius:5px;background:linear-gradient(90deg,var(--app-positive),var(--app-surface-muted),var(--app-negative))}.sentiment-meter i{position:absolute;top:50%;width:8px;height:8px;transform:translate(-50%,-50%);border-radius:50%;background:var(--app-text)}.market-table-panel td b{min-width:58px;font-size:.63rem;font-weight:500}.market-table-panel .optimistic{color:var(--app-negative)}.market-table-panel .pessimistic{color:var(--app-positive)}
.extremes-panel--featured{padding-bottom:.8rem}.extremes-panel--featured>.extremes-heading{align-items:flex-start;padding:.9rem 1rem}.extremes-heading>div>h2{color:var(--app-text);font-size:1.05rem}.extremes-heading h2>svg:first-child{color:var(--app-primary)}.extremes-heading p,.movers-heading p{margin:.25rem 0 0;color:var(--app-text-muted);font-size:.72rem}.extreme-columns,.mover-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem;padding:0 .8rem}.extreme-card-columns{column-gap:2rem}.extreme-card,.mover-card{overflow:hidden;border:1px solid var(--app-border);border-radius:7px;background:var(--app-surface)}.extreme-card>header{display:flex;min-height:45px;align-items:center;justify-content:space-between;gap:.45rem;padding:.5rem .65rem}.extreme-card h3{display:flex;min-width:0;align-items:center;gap:.45rem;margin:0;color:var(--app-text);font-size:.78rem;white-space:nowrap}.extreme-card h3>i,.mover-card h4>i{width:9px;height:9px;flex:none;border-radius:50%;background:var(--app-positive)}.extreme-card h3.negative>i,.mover-card.decrease h4>i{background:var(--app-negative)}.extreme-card h3 b{border-radius:5px;background:var(--app-surface-muted);padding:.28rem .4rem;color:var(--app-text-secondary);font-size:.62rem;font-weight:500}.extreme-card header>a{white-space:nowrap}.extreme-card>p{margin:0;padding:0 .65rem .55rem;color:var(--app-text-muted);font-size:.67rem}.extreme-card ul{margin:0;padding:0;list-style:none}.extreme-card li{border-top:1px solid var(--app-border-muted)}.extreme-card li>a{display:flex;min-height:34px;align-items:center;justify-content:space-between;gap:.5rem;padding:.35rem .65rem;color:var(--app-text);font-size:.7rem;font-weight:650;text-decoration:none}.extreme-card li svg,.mover-card>a svg{flex:none;color:var(--app-text-muted)}.movers-heading{padding:.9rem .8rem .55rem}.movers-heading h3{margin:0;color:var(--app-text);font-size:.9rem}.optix-movers{margin-top:1rem;border-top:1px solid var(--app-border-muted);padding-top:.15rem}.mover-card-columns{padding-bottom:.2rem}.mover-card h4{display:flex;align-items:center;gap:.5rem;margin:0;padding:.55rem .65rem;color:var(--app-text);font-size:.75rem}.mover-table-head{display:grid;grid-template-columns:1fr auto;padding:.35rem .65rem;border-bottom:1px solid var(--app-border-muted);color:var(--app-text-muted);font-size:.65rem}.mover-card>a{display:grid;min-height:34px;grid-template-columns:minmax(0,1fr) auto 16px;align-items:center;gap:.6rem;border-top:1px solid var(--app-border-muted);padding:.35rem .65rem;color:var(--app-text);font-size:.7rem;text-decoration:none}.mover-card>a:first-of-type{border-top:0}.mover-card b{color:var(--app-positive)}.mover-card.decrease b{color:var(--app-negative)}
.extreme-list-head,.extreme-card li>a{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:.45rem}.extreme-list-head{border-top:1px solid var(--app-border-muted);border-bottom:1px solid var(--app-border-muted);padding:.35rem .65rem;color:var(--app-text-secondary);font-size:.65rem;font-weight:700}.extreme-list-head span:first-child{color:var(--app-text)}.extreme-list-head span:last-child{text-align:right}.extreme-card li{border-top:0;border-bottom:1px solid var(--app-border-muted)}.extreme-card li:last-child{border-bottom:0}.extreme-card li>a{min-height:3.35rem;padding:.38rem .65rem;font-size:.75rem}.extreme-card li>a:hover{background:var(--app-surface-soft)}.extreme-card li>a>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.extreme-card li strong{color:var(--app-text-secondary);font-size:.7rem;font-variant-numeric:tabular-nums;text-align:right}
.extreme-favorite-cards{display:grid;gap:.65rem;padding:0 .8rem}.extreme-favorite-card{min-width:0;overflow:hidden;border:1px solid var(--app-border);border-radius:8px;background:var(--app-surface);padding:.8rem;box-shadow:0 2px 7px color-mix(in srgb,var(--app-text) 7%,transparent);transition:transform .16s,background-color .16s,box-shadow .16s}.extreme-favorite-card:hover{transform:translateY(-1px);background:var(--app-surface-soft);box-shadow:0 5px 12px color-mix(in srgb,var(--app-text) 9%,transparent)}.extreme-favorite-main{display:grid;grid-template-columns:18px minmax(0,1fr) auto;align-items:start;gap:.6rem}.extreme-favorite-main>svg{color:var(--app-favorite)}.extreme-favorite-main a{display:-webkit-box;overflow:hidden;color:var(--app-text);font-size:.8rem;font-weight:700;line-height:1.3;text-decoration:none;-webkit-box-orient:vertical;-webkit-line-clamp:2}.extreme-favorite-main a:hover{color:var(--app-primary);text-decoration:underline}.extreme-favorite-main p{margin:.2rem 0 0;color:var(--app-text-muted);font-size:.65rem}.extreme-tone{border-radius:999px;padding:.25rem .45rem;background:color-mix(in srgb,var(--app-positive) 10%,var(--app-surface));color:var(--app-positive);font-size:.62rem;font-weight:650}.extreme-favorite-card--optimism .extreme-tone{background:color-mix(in srgb,var(--app-negative) 9%,var(--app-surface));color:var(--app-negative)}.extreme-favorite-metrics{display:grid;grid-template-columns:minmax(70px,.75fr) minmax(70px,.75fr) minmax(90px,1fr);align-items:end;gap:.7rem;margin-top:.75rem}.extreme-favorite-metrics small{display:block;color:var(--app-text-muted);font-size:.62rem}.extreme-favorite-metrics strong{display:block;margin-top:.1rem;color:var(--app-text);font-size:1rem;line-height:1.2}.extreme-favorite-metrics .positive-value{color:var(--app-positive)}.extreme-favorite-metrics .negative-value{color:var(--app-negative)}.extreme-meter{height:7px;margin-bottom:.35rem;overflow:hidden;border-radius:999px;background:var(--app-surface-muted)}.extreme-meter i{display:block;height:100%;border-radius:inherit;background:var(--app-positive)}.extreme-favorite-card--optimism .extreme-meter i{background:var(--app-negative)}
.extreme-card-columns{align-items:start}.extreme-card-group{min-width:0}.extreme-card-group>header{display:flex;min-height:40px;align-items:center;justify-content:space-between;gap:.4rem}.extreme-card-group h3{display:flex;min-width:0;align-items:center;gap:.45rem;margin:0;color:var(--app-text);font-size:.82rem;font-weight:800;white-space:nowrap}.extreme-card-group h3 i{width:8px;height:8px;flex:none;border-radius:50%;background:var(--app-positive)}.extreme-card-group h3.optimism i,.extreme-card-group h3.negative i{background:var(--app-negative)}.extreme-card-group>header>a{display:inline-flex;flex:none;align-items:center;gap:.2rem;color:var(--app-primary);font-size:.64rem;text-decoration:none}.extreme-group-cards{display:grid;gap:.45rem}.extreme-card-group .extreme-favorite-card{position:relative;display:grid;width:100%;grid-template-columns:minmax(0,1fr) minmax(76px,42%);align-items:stretch;padding:.6rem 0 .35rem .65rem}.extreme-card-details{display:grid;min-width:0;align-content:center;padding-right:.35rem}.extreme-card-group .extreme-favorite-main{display:block;min-height:1.65rem}.extreme-card-group .extreme-favorite-main a{font-size:.7rem;line-height:1.3}.extreme-metric-line{display:flex;min-width:0;align-items:center;gap:.25rem;white-space:nowrap}.extreme-value-label{color:var(--app-text-secondary);font-size:.66rem;font-weight:400}.extreme-value-number{color:var(--app-text);font-size:.76rem;font-weight:700;font-variant-numeric:tabular-nums}.extreme-metric-line>span:last-child{display:flex;align-items:center;color:var(--app-text-muted);font-size:.6rem;font-variant-numeric:tabular-nums}.extreme-metric-line .positive-value{color:var(--app-positive)}.extreme-metric-line .negative-value{color:var(--app-negative)}.extreme-chart-wrap{position:relative;min-width:0;height:4.6rem;overflow:hidden}.extreme-card-group .extreme-trend{position:absolute;right:.5rem;bottom:0;left:0;width:calc(100% - .5rem)!important;height:100%!important}
.extreme-metric-line>span.positive-value:last-child{color:var(--app-positive)}.extreme-metric-line>span.negative-value:last-child{color:var(--app-negative)}
.heatmap-panel{display:flex;align-self:start;flex-direction:column}.heat-tabs{justify-content:center;margin-bottom:.45rem}.heatmap{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:50px;padding:0 .7rem}.heatmap>div{display:flex;align-items:center;justify-content:center;flex-direction:column;border:1px solid var(--app-surface);font-size:.63rem;text-align:center}.heatmap .wide{grid-column:span 1}.heat-strong-green{background:color-mix(in srgb,var(--app-positive) 95%,var(--app-surface));color:white}.heat-green{background:color-mix(in srgb,var(--app-positive) 70%,var(--app-surface));color:white}.heat-soft-green{background:color-mix(in srgb,var(--app-positive) 26%,var(--app-surface))}.heat-red{background:color-mix(in srgb,var(--app-negative) 76%,var(--app-surface));color:white}.heat-soft-red{background:color-mix(in srgb,var(--app-negative) 33%,var(--app-surface))}.heat-legend{display:flex;align-items:center;justify-content:center;gap:.5rem;margin-top:auto;padding:.65rem .7rem;font-size:.6rem}.heat-legend i{position:relative;width:75px;height:5px;flex:none;border-radius:5px;background:linear-gradient(90deg,var(--app-positive),var(--app-surface-muted),var(--app-negative))}.heat-legend i:after{position:absolute;top:50%;left:50%;width:8px;height:8px;transform:translate(-50%,-50%);border-radius:50%;background:var(--app-text);content:''}
.heatmap-preview-popover{position:fixed;z-index:250;width:300px;overflow:hidden;border:1px solid var(--app-border);border-radius:8px;background:var(--app-surface);box-shadow:0 10px 28px rgb(0 0 0 / .24);color:var(--app-text);pointer-events:none}.heatmap-preview-popover>div{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.55rem .7rem}.heatmap-preview-popover strong{overflow:hidden;font-size:.75rem;text-overflow:ellipsis;white-space:nowrap}.heatmap-preview-popover span{flex:none;color:var(--app-text-muted);font-size:.7rem}.heatmap-preview-popover img{display:block;width:100%;max-height:180px;object-fit:contain;background:white}
.indicator-summary-panel{margin-bottom:1rem}.indicator-summary-groups{display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding:0 .8rem .8rem}.indicator-summary-groups h3{margin:.15rem 0 .45rem;font-size:.75rem}.summary-bars{display:grid;gap:.35rem}.summary-bars>div{display:grid;grid-template-columns:minmax(90px,1fr) minmax(100px,1.3fr) 30px;align-items:center;gap:.5rem;font-size:.67rem}.summary-bars span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.summary-bars i,.extreme-distribution i,.ranking-list i{height:7px;overflow:hidden;border-radius:999px;background:var(--app-surface-muted)}.summary-bars em,.extreme-distribution em,.ranking-list em{display:block;height:100%;border-radius:inherit;background:var(--app-primary)}.summary-bars b{text-align:right}.extreme-distribution{display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding:0 1rem .8rem}.extreme-distribution>div{display:grid;grid-template-columns:minmax(140px,1fr) minmax(100px,1.3fr) 42px;align-items:center;gap:.55rem;font-size:.68rem}.extreme-distribution>div:first-child em{background:var(--app-positive)}.extreme-distribution>div:last-child em{background:var(--app-negative)}.extreme-distribution b{text-align:right}.correlation-head,.correlation-row{display:grid;grid-template-columns:minmax(0,1fr) 60px 70px;align-items:center;gap:.6rem;padding:.38rem .8rem;font-size:.68rem}.correlation-head{border-block:1px solid var(--app-border-muted);color:var(--app-text-muted);font-weight:700}.correlation-row{border-bottom:1px solid var(--app-border-muted);color:var(--app-text);text-decoration:none}.correlation-row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.correlation-row b,.correlation-row strong{text-align:right}.correlation-row strong{color:var(--app-primary)}.research-panel{margin-bottom:1rem}.research-panel>header{border-bottom:1px solid var(--app-border-muted)}.research-tabs{display:flex;gap:.35rem}.research-tabs button,.ranking-tabs button{border:0;border-radius:5px;background:transparent;padding:.35rem .55rem;color:var(--app-text-muted);font-size:.7rem;font-weight:700;cursor:pointer}.research-tabs button.active,.ranking-tabs button.active{background:var(--app-primary-soft);color:var(--app-primary)}.research-list{display:grid;grid-template-columns:repeat(5,minmax(0,1fr))}.research-list>a{display:flex;min-width:0;align-items:center;justify-content:space-between;gap:.5rem;border-right:1px solid var(--app-border-muted);padding:.7rem .8rem;color:var(--app-text);font-size:.68rem;text-decoration:none}.research-list>a:last-child{border-right:0}.research-list span{min-width:0}.research-list strong,.research-list small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.research-list small{margin-top:.18rem;color:var(--app-text-muted);font-weight:400}.research-list>a>b{flex:none;color:var(--app-primary)}.research-list>a>b.up{color:var(--app-positive)}.research-list>a>b.down{color:var(--app-negative)}.chart-summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:.45rem;padding:0 .7rem .7rem}.chart-summary-grid>a{display:flex;min-width:0;flex-direction:column;border:1px solid var(--app-border-muted);border-radius:6px;padding:.45rem;color:var(--app-text);font-size:.65rem;text-decoration:none}.chart-summary-grid strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.chart-summary-grid svg{width:100%;height:38px;margin:.2rem 0}.chart-summary-grid polyline{fill:none;stroke:var(--app-primary);stroke-width:2}.chart-summary-grid small{color:var(--app-text-muted)}.ranking-tabs{display:flex;overflow-x:auto;padding:0 .55rem .4rem}.ranking-tabs button{flex:none}.ranking-list{display:grid;gap:.28rem;padding:0 .65rem .6rem}.ranking-list>div{display:grid;grid-template-columns:minmax(70px,1fr) minmax(70px,1.2fr) 25px;align-items:center;gap:.35rem;font-size:.62rem}.ranking-list span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ranking-list b{text-align:right}
.study-feature{display:flex;align-items:center;gap:.55rem;padding:.25rem .8rem .5rem}.mini-chart{position:relative;width:80px;height:48px;border-radius:5px;background:var(--app-surface-muted);padding:.3rem;font-size:.65rem;font-weight:700}.mini-chart svg{width:100%;height:25px}.mini-chart polyline{fill:none;stroke:var(--app-text);stroke-width:2}.study-feature>div:nth-child(2){display:flex;flex:1;flex-direction:column}.study-feature span{color:var(--app-text-muted);font-size:.64rem}.study-feature>b{font-size:.68rem}.study-feature em{color:var(--app-positive);font-style:normal}.study-row{display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--app-border-muted);padding:.3rem .8rem;font-size:.66rem}.study-row a{color:var(--app-primary);text-decoration:none}.study-row span{border-radius:4px;background:var(--app-primary-soft);padding:.16rem .4rem;color:var(--app-positive)}.sector-head,.sector-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(140px,1.25fr);align-items:center;gap:.75rem;padding:.42rem .8rem;font-size:.65rem}.sector-head{border-top:1px solid var(--app-border-muted);border-bottom:1px solid var(--app-border);font-weight:700}.sector-head>span{display:flex;align-items:center;gap:.22rem}.sector-head>span:last-child{justify-content:center}.sector-head small{color:var(--app-text-muted);font-size:.6rem;font-weight:500}.sector-row{border-bottom:1px solid var(--app-border-muted)}.sector-row:last-child{border-bottom:0}.sector-row a{overflow:hidden;color:var(--app-primary);font-weight:650;text-decoration:none;text-overflow:ellipsis;white-space:nowrap}.sector-row>span{display:flex;align-items:center;gap:.5rem}.sector-row b{width:2.6rem;flex:none;font-variant-numeric:tabular-nums;text-align:right}.sector-row i{height:8px;flex:1;overflow:hidden;border:1px solid var(--app-border-muted);border-radius:3px;background:var(--app-surface-muted)}.sector-row em{display:block;height:100%;border-radius:2px;background:color-mix(in srgb,var(--app-primary) 72%,var(--app-surface))}.stacked-previews{display:grid;gap:.65rem}.preview-row{display:grid;grid-template-columns:1fr 30px 1.3fr;gap:.4rem;border-top:1px solid var(--app-border-muted);padding:.22rem .8rem;font-size:.6rem}.preview-row em{font-style:normal}.dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--app-positive)}.dot.neutral{background:var(--app-favorite)}.dot.negative{background:var(--app-negative)}.ranks{display:grid;grid-template-columns:1fr 1fr;gap:.25rem;padding:0 .8rem .55rem;font-size:.6rem}.ranks span{font-weight:700}.ranks b:nth-of-type(even){color:var(--app-negative)}.ranks b:nth-of-type(odd){color:var(--app-positive)}
.classic-content .featured-commentary a,.classic-content .story-link,.classic-content .market-table-panel td a,.classic-content .extreme-columns li a,.classic-content .study-row a,.classic-content .sector-row a{color:var(--app-text)}.classic-content .dash-panel>header a{color:var(--app-primary)}
.dash-panel>header{min-height:46px;padding:.7rem 1rem}.dash-panel h2{font-size:1rem;font-weight:700}.dash-panel header a,.market-table-panel a,.extremes-panel a{font-size:.75rem;font-weight:600}.top-grid,.middle-grid,.bottom-grid{gap:1rem;margin-bottom:1rem}.score-strip{gap:.75rem;margin-bottom:1rem}.confidence-card,.asset-score{min-height:86px;padding:.8rem}.confidence-card small{font-size:.78rem}.confidence-card em{font-size:.72rem}.asset-score small{font-size:.72rem}.chart-legend{font-size:.72rem}.featured-commentary a,.story-link{font-size:.78rem}.featured-commentary small{font-size:.7rem}.featured-commentary p{font-size:.75rem}.market-table-panel table{font-size:.75rem}.market-table-panel th{font-size:.7rem}.market-table-panel th,.market-table-panel td{padding:.34rem .8rem}.study-row,.sector-head,.sector-row{font-size:.73rem}.preview-row,.ranks{font-size:.68rem}
.mobile-sidebar-trigger{display:none}.sidebar-overlay{position:fixed;inset:0;z-index:100;background:var(--app-overlay)}.sidebar-drawer{width:min(80vw,290px);height:100%;background:var(--app-surface)}.sidebar-drawer header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--app-border);padding:1rem}.sidebar-drawer h2{margin:0;font-size:1rem}.sidebar-drawer button{border:0;background:transparent;color:var(--app-text)}
@media(max-width:1279px){.classic-layout{grid-template-columns:1fr}.classic-sidebar{display:none}.mobile-sidebar-trigger{display:block;margin-bottom:1rem}.mobile-sidebar-trigger button{display:flex;width:100%;min-height:44px;align-items:center;gap:.65rem;border:1px solid var(--app-border);border-radius:8px;background:var(--app-surface);padding:.7rem 1rem;color:var(--app-text);font-size:.875rem;font-weight:600}.score-strip{grid-template-columns:repeat(6,1fr)}.confidence-card{grid-column:span 3}.risk-summary{grid-template-columns:repeat(3,minmax(0,1fr))}.top-grid,.middle-grid,.bottom-grid{grid-template-columns:1fr 1fr}.confidence-chart,.commentary-panel,.market-table-panel{grid-column:1/-1}.stacked-previews{grid-column:1/-1;grid-template-columns:1fr 1fr}}
@media(min-width:901px) and (max-width:1279px){.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.top-grid{grid-template-columns:minmax(0,1.6fr) minmax(320px,1fr)}.middle-grid{grid-template-columns:1.2fr .95fr 1fr}.bottom-grid{grid-template-columns:1fr 1fr}.confidence-chart,.commentary-panel,.market-table-panel{grid-column:auto}}
@media(max-width:767px){.classic-page{padding:1.25rem var(--page-gutter) 2rem}.classic-switcher{align-items:flex-start;flex-direction:column}.classic-switcher div{align-items:flex-start;flex-direction:column;gap:.2rem}.dashboard-switch-link{width:100%;justify-content:center}.classic-heading{align-items:flex-start;flex-direction:column}.classic-actions{width:100%;justify-content:space-between}.summary-grid{grid-template-columns:1fr}.summary-card{grid-template-columns:48px minmax(0,1fr) 88px 18px}.summary-card--mood{grid-template-columns:48px minmax(0,1fr) 70px 18px}.summary-card--risk{grid-template-columns:48px minmax(0,1fr) 18px}.risk-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.top-grid,.middle-grid,.bottom-grid{grid-template-columns:1fr}.confidence-chart,.market-table-panel,.stacked-previews{grid-column:auto}.stacked-previews,.extreme-columns,.mover-columns{grid-template-columns:1fr}.extremes-heading{flex-direction:column}.commentary-panel{min-height:0}.line-chart{height:180px}.heatmap{grid-template-columns:repeat(3,1fr)}.heatmap .wide{grid-column:span 1}}
@media(max-width:480px){.risk-summary{grid-template-columns:1fr}}
@media(max-width:767px){.summary-card.positive,.summary-card.negative{grid-template-columns:48px minmax(0,1fr) 88px 18px}.summary-card.positive>svg:not(.summary-arrow),.summary-card.negative>svg:not(.summary-arrow){width:88px;height:46px}}
.confidence-chart{display:flex;flex-direction:column}.confidence-chart>.confidence-highchart{flex:1;min-height:320px}
.risk-summary-panel{display:flex;flex-direction:column}.risk-summary-panel>.risk-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-content:start;gap:0;margin:0;padding:.1rem .8rem .7rem}.risk-summary-panel .risk-card{border:0;border-bottom:1px solid var(--app-border-muted);border-radius:0;background:transparent;padding:.75rem .55rem .6rem;box-shadow:none}.risk-summary-panel .risk-card:nth-last-child(-n+2){border-bottom:0}.risk-summary-panel .risk-card:nth-child(odd){border-right:1px solid var(--app-border-muted);padding-right:.8rem}.risk-summary-panel .risk-card:nth-child(even){padding-left:.8rem}.risk-summary-panel .risk-card>header{min-height:1.25rem}.risk-summary-panel .risk-card>header strong{font-size:.72rem}.risk-card-reading{display:grid;grid-template-columns:minmax(0,1fr) 2rem;align-items:center;gap:.55rem;margin-top:.35rem}.risk-card-reading>div{min-width:0}.risk-card-reading>.risk-up,.risk-card-reading>.risk-down{font-size:1.3rem;text-align:right}.risk-summary-panel .risk-track{height:1.45rem;border-radius:2px}.risk-summary-panel .risk-track i{width:7px;height:1.75rem;border:0;border-radius:3px;background:var(--app-text);box-shadow:0 0 0 1px var(--app-surface)}.risk-summary-panel .risk-card footer{margin-top:.2rem;font-size:.6rem}
@media(min-width:1280px){.top-grid{grid-template-columns:minmax(0,1.05fr) minmax(280px,.65fr) minmax(440px,1.3fr)}}
@media(max-width:767px){.risk-summary-panel>.risk-summary{grid-template-columns:1fr}.risk-summary-panel .risk-card:nth-child(odd){border-right:0;padding-right:.55rem}.risk-summary-panel .risk-card:nth-child(even){padding-left:.55rem}.risk-summary-panel .risk-card:nth-last-child(2){border-bottom:1px solid var(--app-border-muted)}}
.risk-summary-panel>.risk-summary{flex:1;grid-template-columns:1fr;grid-template-rows:repeat(6,minmax(0,1fr));padding-top:.55rem;padding-bottom:.55rem}.risk-summary-panel .risk-card{display:flex;justify-content:center;flex-direction:column;padding:.65rem .55rem .55rem}.risk-summary-panel .risk-card:nth-child(odd){border-right:0;padding-right:.55rem}.risk-summary-panel .risk-card:nth-child(even){padding-left:.55rem}.risk-summary-panel .risk-card:nth-last-child(-n+2){border-bottom:1px solid var(--app-border-muted)}.risk-summary-panel .risk-card:last-child{border-bottom:0}.risk-summary-panel .risk-track{height:8px;border-radius:999px}.risk-summary-panel .risk-track i{width:14px;height:14px;border:2px solid var(--app-surface);border-radius:50%;box-shadow:0 1px 3px color-mix(in srgb,var(--app-text) 30%,transparent)}.extremes-panel--featured{display:flex;flex-direction:column}.extremes-panel--featured>.extreme-card-columns{flex:1;align-items:stretch;padding-top:.55rem;padding-bottom:.55rem}.extremes-panel--featured .extreme-card-group{display:flex;flex-direction:column}.extremes-panel--featured .extreme-group-cards{flex:1;grid-template-rows:repeat(4,minmax(0,1fr))}.extremes-panel--featured .extreme-favorite-card{display:flex;height:100%;flex-direction:column;padding:.6rem .65rem .2rem}.extremes-panel--featured .extreme-favorite-main{width:100%;min-height:1.55rem;align-self:start}.extreme-card-body{display:grid;min-height:0;flex:1;grid-template-columns:minmax(0,1fr) minmax(76px,42%);align-items:end}.extremes-panel--featured .extreme-card-details{display:flex;align-items:flex-end;align-content:normal;padding:0 .35rem .35rem 0}.extremes-panel--featured .extreme-metric-line{align-self:auto}.extremes-panel--featured .extreme-chart-wrap{align-self:end;width:100%}.extremes-panel--featured .extreme-trend{bottom:-.3rem}
.extremes-panel--featured .extreme-favorite-card{display:grid;grid-template-columns:minmax(0,1fr) minmax(76px,42%);padding:.6rem 0 .35rem .65rem}.extremes-panel--featured .extreme-card-details{display:grid;grid-template-rows:auto auto;align-content:center;row-gap:.8rem;padding:.15rem .35rem .25rem 0}.extremes-panel--featured .extreme-favorite-main{width:auto;min-height:0}.extremes-panel--featured .extreme-metric-line{align-self:auto}.extremes-panel--featured .extreme-chart-wrap{align-self:stretch;width:auto}.risk-card-reading{grid-template-columns:minmax(0,1fr) 1.75rem;gap:.2rem}.risk-card-reading>.risk-up,.risk-card-reading>.risk-down{color:var(--app-text);font-size:1rem;font-weight:700}
.summary-card.positive,.summary-card.negative{grid-template-columns:48px minmax(0,1fr) 88px 18px}.summary-card.positive>svg:not(.summary-arrow),.summary-card.negative>svg:not(.summary-arrow){width:88px;height:46px}.summary-card.positive small,.summary-card.negative small{overflow:visible;white-space:normal}.confidence-title-short{display:none}.summary-card .summary-value{gap:.3rem}.summary-card .summary-value em{display:inline-flex;align-items:center;gap:.1rem}.summary-card .summary-value b{white-space:nowrap}.extremes-panel--featured .extreme-card-details{row-gap:.15rem}.risk-summary-panel .risk-track{background:linear-gradient(90deg,var(--app-positive),var(--app-surface-muted),var(--app-negative))}.market-table-panel table{table-layout:fixed}.market-table-panel th:nth-child(1){width:24%}.market-table-panel th:nth-child(2){width:14%}.market-table-panel th:nth-child(3){width:14%}.market-table-panel th:nth-child(4){width:20%}.market-table-panel th:nth-child(5){width:28%}.market-table-panel th,.market-table-panel td,.market-table-panel td:nth-child(2),.market-table-panel td:nth-child(3){text-align:left}.market-table-panel th button{display:inline-flex;width:100%;align-items:center;justify-content:flex-start;gap:.25rem;border:0;background:transparent;padding:0;color:var(--app-text);font:inherit;font-weight:700;cursor:pointer}.market-table-panel th button:hover,.market-table-panel th button.active{color:var(--app-primary)}.market-table-panel td:first-child{overflow:hidden;text-overflow:ellipsis}.market-table-panel td:last-child{width:auto;min-width:0}.market-table-panel .sentiment-meter{min-width:48px;flex:1}
@media(min-width:1280px) and (max-width:1599px){.confidence-title-full{display:none}.confidence-title-short{display:inline}}
.market-table-panel th:nth-child(1){width:30%}.market-table-panel th:nth-child(2){width:18%}.market-table-panel th:nth-child(3){width:18%}.market-table-panel th:nth-child(4){width:34%}
.middle-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.top-grid{column-gap:.65rem}
.risk-summary-panel .risk-card-reading{grid-template-columns:minmax(0,100%) 1rem;justify-content:start}.risk-summary-panel .risk-card-reading>div{width:100%;max-width:220px}.risk-summary-panel .risk-track{height:5px}.risk-summary-panel .risk-track i{width:10px;height:10px;border-width:1px}
.indicator-summary-panel{display:block;margin-bottom:1rem}.indicator-summary-panel .indicator-summary-groups{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:none;column-gap:2.5rem;row-gap:1rem;padding:0 .8rem .8rem}.indicator-summary-groups>section{min-height:0;border:0;border-radius:0;padding:0}.indicator-summary-panel .indicator-summary-groups h3{margin:.15rem 0 .45rem;font-size:.75rem}.indicator-summary-panel .summary-bars{gap:.35rem}.indicator-summary-panel .summary-bars>div{grid-template-columns:minmax(90px,1fr) minmax(100px,1.3fr) 30px;gap:.5rem;font-size:.67rem}
.indicator-summary-panel .indicator-summary-groups h3{display:flex;align-items:baseline;gap:.45rem;font-size:.82rem}.indicator-summary-panel .indicator-summary-groups h3 small{color:var(--app-text-muted);font-size:.62rem;font-weight:500}.indicator-summary-panel .summary-bars{gap:0}.indicator-summary-panel .summary-bars>div{min-height:28px;border-bottom:1px solid var(--app-border-muted)}.indicator-summary-panel .summary-bars>div:last-child{border-bottom:0}.indicator-summary-panel .summary-bars .summary-scale{min-height:22px;border-bottom:0;color:var(--app-text-muted)}.summary-scale>i{display:grid!important;height:auto!important;grid-template-columns:1fr 1fr 1fr;overflow:visible!important;background:transparent!important}.summary-scale>i b:first-child{text-align:left}.summary-scale>i b:nth-child(2){text-align:center}.summary-scale>i b:last-child{text-align:right}.summary-scale>strong{font-size:.6rem;font-weight:500;text-align:right}.indicator-summary-panel .summary-bar-row>i{position:relative;height:8px;overflow:visible;border-radius:3px;background:var(--app-surface-muted)}.indicator-summary-panel .summary-bar-row>i:after{position:absolute;top:-4px;bottom:-4px;left:50%;width:1px;background:var(--app-border);content:''}.indicator-summary-panel .summary-bar-row>i>em{position:absolute;top:0;height:100%;border-radius:3px}.indicator-summary-panel .summary-bar-row>i>em.low{background:linear-gradient(90deg,var(--app-positive),color-mix(in srgb,var(--app-positive) 58%,var(--app-surface)))}.indicator-summary-panel .summary-bar-row>i>em.high{background:linear-gradient(90deg,color-mix(in srgb,var(--app-negative) 58%,var(--app-surface)),var(--app-negative))}.indicator-summary-panel .summary-bar-row>b{font-size:.72rem;font-variant-numeric:tabular-nums}
.indicator-summary-panel .indicator-summary-groups{column-gap:0;padding:0 1rem 1rem}.indicator-summary-panel .indicator-summary-groups>section{min-width:0;padding-right:1.4rem}.indicator-summary-panel .indicator-summary-groups>section+section{border-left:1px solid var(--app-border);padding-right:0;padding-left:1.4rem}.indicator-summary-panel .indicator-summary-groups h3{margin:.2rem 0 .85rem;font-size:.78rem}.indicator-summary-panel .summary-bars{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1.1rem}.indicator-summary-panel .summary-bars>div{display:block;min-width:0;min-height:0;border:0;font-size:.67rem}.summary-metric-head{display:flex;align-items:center;justify-content:space-between;gap:.35rem;margin-bottom:.65rem}.summary-metric-head span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.summary-metric-head b{flex:none;font-size:.72rem;font-variant-numeric:tabular-nums}.indicator-summary-panel .summary-bar-row>i{position:relative;display:block;height:7px;overflow:visible;border-radius:999px;background:var(--app-surface-muted)}.indicator-summary-panel .summary-bar-row>i:after{position:absolute;top:-6px;bottom:-6px;left:50%;display:block;width:1px;background:var(--app-border);content:''}.indicator-summary-panel .summary-bar-row>i>em{position:absolute;top:0;z-index:1;height:100%;border-radius:999px}.indicator-summary-panel .summary-bar-row>i>em.low{background:var(--app-positive)}.indicator-summary-panel .summary-bar-row>i>em.high{background:var(--app-negative)}
@media(min-width:1280px){.top-grid{grid-template-columns:minmax(0,1.35fr) minmax(280px,.5fr) minmax(360px,1.15fr)}}
@media(max-width:1279px){.middle-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.research-list{grid-template-columns:repeat(2,minmax(0,1fr))}.research-list>a{border-bottom:1px solid var(--app-border-muted)}.extremes-panel--featured{grid-column:auto}}
@media(max-width:767px){.middle-grid,.indicator-summary-groups,.extreme-distribution,.research-list{grid-template-columns:1fr}.indicator-summary-groups{gap:.65rem}.extreme-distribution>div{grid-template-columns:minmax(120px,1fr) minmax(70px,1fr) 42px}.research-panel>header{align-items:flex-start;flex-direction:column}.research-tabs{width:100%}.research-tabs button{flex:1}.chart-summary-grid{grid-template-columns:1fr}.correlation-head,.correlation-row{grid-template-columns:minmax(0,1fr) 52px 62px}}
.indicator-summary-panel .summary-bar-row>i>em.low{border-radius:999px 0 0 999px}.indicator-summary-panel .summary-bar-row>i>em.high{border-radius:0 999px 999px 0}
.indicator-summary-panel .indicator-summary-groups{grid-template-columns:1fr;row-gap:1rem}.indicator-summary-panel .indicator-summary-groups>section{padding:0}.indicator-summary-panel .indicator-summary-groups>section+section{border-top:1px solid var(--app-border);border-left:0;padding:1rem 0 0}
.indicator-summary-panel .indicator-summary-groups{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:2.5rem;row-gap:0}.indicator-summary-panel .indicator-summary-groups>section+section{border-top:0;border-left:1px solid var(--app-border);padding:0 0 0 2.5rem}.indicator-summary-panel .summary-bars{grid-template-columns:1fr;gap:.65rem}.indicator-summary-panel .summary-bar-row{display:grid;grid-template-columns:minmax(110px,.7fr) minmax(180px,1.8fr);align-items:center;gap:.75rem}.indicator-summary-panel .summary-metric-head{margin-bottom:0}
.indicator-summary-panel--compact{display:flex;min-height:0;margin:0;flex-direction:column}.indicator-summary-panel--compact .indicator-summary-groups{display:grid;grid-template-columns:1fr;row-gap:.7rem;padding:0 .8rem .8rem}.indicator-summary-panel--compact .indicator-summary-groups>section{padding:0}.indicator-summary-panel--compact .indicator-summary-groups>section+section{border-top:1px solid var(--app-border-muted);border-left:0;padding: .7rem 0 0}.indicator-summary-panel--compact .indicator-summary-groups h3{display:flex;justify-content:space-between;margin:0 0 .45rem;font-size:.76rem}.indicator-summary-panel--compact .indicator-summary-groups h3 small{font-size:.62rem}.indicator-summary-panel--compact .summary-bars{gap:.28rem}.indicator-summary-panel--compact .summary-bar-row{grid-template-columns:minmax(82px,.7fr) minmax(100px,1.45fr);gap:.55rem;min-height:20px}.indicator-summary-panel--compact .summary-metric-head{font-size:.66rem}.indicator-summary-panel--compact .summary-metric-head b{font-size:.68rem}.indicator-summary-panel--compact .summary-bar-row>i{height:6px}.indicator-summary-panel--compact .summary-bar-row>i:after{top:-4px;bottom:-4px}
@media(min-width:1280px){.middle-grid{grid-template-columns:minmax(0,1.2fr) 280px minmax(0,1fr)}.middle-grid .market-table-panel{order:1}.middle-grid .indicator-summary-panel--compact{order:2}.middle-grid .correlation-panel{order:3}.middle-grid .commentary-panel{order:4}.middle-grid .heatmap-panel{order:5;grid-column:2/4}}
</style>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Activity, AlignLeft, BarChart3, CalendarDays, Download, Globe2, Grid3X3, RefreshCw, Search, Shield, SlidersHorizontal, TrendingUp } from '@lucide/vue'
import { fetchResearchPage } from './research.api'
import { findResearchPage, pagesForGroup, researchGroupLabels, researchPages } from './research.catalog'
import RiskOnOffContent from './RiskOnOffContent.vue'
import MarketEnvironmentContent from './MarketEnvironmentContent.vue'
import TacticalCompositeContent from './TacticalCompositeContent.vue'
import MarketBreadthContent from './MarketBreadthContent.vue'
import BondsContent from './BondsContent.vue'
import EnergyContent from './EnergyContent.vue'
import GoldContent from './GoldContent.vue'
import MacroContent from './MacroContent.vue'
import IntradayMonitorContent from './IntradayMonitorContent.vue'
import SeasonalityCalendarContent from './SeasonalityCalendarContent.vue'
import GlobalBreadthContent from './GlobalBreadthContent.vue'
import MarketSentimentContent from './MarketSentimentContent.vue'
import OptixHeatmapContent from './OptixHeatmapContent.vue'
import RankChartsContent from './RankChartsContent.vue'
import LayersIcon from './LayersIcon.vue'
import type { ResearchGroup, ResearchPageData, ResearchSeries } from './research.types'

const route = useRoute()
const loading = ref(false)
const error = ref('')
const data = ref<ResearchPageData | null>(null)
const query = ref('')
const range = ref('3M')
const view = ref<'charts' | 'table'>('charts')
let controller: AbortController | null = null

const group = computed(() => String(route.params.group) as ResearchGroup)
const slug = computed(() => String(route.params.page))
const page = computed(() => findResearchPage(group.value, slug.value))
const navigationGroups: ResearchGroup[] = ['spotlights', 'intraday', 'market-analytics']
const filteredSeries = computed(() => {
  const term = query.value.trim().toLowerCase()
  return (data.value?.series ?? []).filter((item) => !term || item.name.toLowerCase().includes(term))
})

function iconForPage(item = page.value) {
  if (item?.slug === 'risk-on-off') return Shield
  if (item?.slug === 'market-environment') return LayersIcon
  if (item?.slug === 'tactical-composite-trend-model') return LayersIcon
  if (item?.slug === 'market-breadth' || item?.slug === 'rank-charts') return AlignLeft
  if (item?.slug === 'bonds' || item?.slug === 'energy' || item?.slug === 'gold') return TrendingUp
  if (item?.slug === 'macro' || item?.slug === 'global-breadth-overview') return Globe2
  if (item?.slug === 'market-sentiment-overview') return Activity
  if (item?.kind === 'calendar') return CalendarDays
  if (item?.kind === 'heatmap') return Grid3X3
  if (item?.kind === 'intraday') return Activity
  return BarChart3
}

function sparkline(series: ResearchSeries) {
  const values = series.points
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return values.map((value, index) => `${(index / (values.length - 1)) * 100},${36 - ((value - min) / span) * 30}`).join(' ')
}

function toneClass(value: string) {
  if (value.startsWith('+') || value === 'Positive') return 'text-[var(--app-positive)]'
  if (value.startsWith('-') || value === 'Cautious') return 'text-[var(--app-negative)]'
  return 'text-[var(--app-text)]'
}

async function load() {
  if (!page.value) return
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  error.value = ''
  try {
    data.value = await fetchResearchPage(page.value.slug, controller.signal)
  } catch (reason) {
    if (!(reason instanceof DOMException && reason.name === 'AbortError')) error.value = 'Unable to load this research page.'
  } finally {
    loading.value = false
  }
}

watch([group, slug], () => { query.value = ''; void load() }, { immediate: true })
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <main class="min-h-screen bg-[var(--app-bg)] px-[var(--page-gutter)] pb-10 pt-7 text-[var(--app-text)]">
    <div v-if="page" class="mx-auto grid max-w-[1560px] gap-5 xl:grid-cols-[230px_minmax(0,1fr)]">
      <aside class="h-fit overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] xl:sticky xl:top-5">
        <div class="flex items-center justify-between border-b border-[var(--app-border)] px-4 py-4">
          <h2 class="text-xs font-semibold uppercase tracking-[.06em] text-[var(--app-text-secondary)]">Research workspace</h2>
          <span class="rounded bg-[var(--app-primary-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--app-primary)]">{{ researchPages.length }}</span>
        </div>
        <nav class="max-h-72 overflow-y-auto p-2 xl:max-h-[calc(100vh-9rem)]" aria-label="Extra Tools navigation">
          <section v-for="navGroup in navigationGroups" :key="navGroup" class="mb-3 last:mb-0">
            <div class="flex items-center justify-between px-3 py-2 text-[.625rem] font-semibold uppercase tracking-[.06em] text-[var(--app-text-muted)]">
              <span>{{ navGroup === 'intraday' ? 'Intraday' : researchGroupLabels[navGroup] }}</span>
              <span class="rounded bg-[var(--app-surface-muted)] px-1.5 py-0.5">{{ pagesForGroup(navGroup).length }}</span>
            </div>
            <RouterLink v-for="item in pagesForGroup(navGroup)" :key="item.slug" :to="`/research/${item.group}/${item.slug}`" class="flex items-start gap-2 rounded-md px-3 py-2 text-[.8125rem] font-medium leading-5 text-[var(--app-text-secondary)] transition hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-primary)]" :class="item.group === group && item.slug === slug ? 'bg-[var(--app-primary-soft)] font-semibold text-[var(--app-primary)]' : ''" :aria-current="item.group === group && item.slug === slug ? 'page' : undefined">
              <component :is="iconForPage(item)" :size="16" class="mt-0.5 shrink-0" />
              <span>{{ item.title }}</span>
            </RouterLink>
          </section>
        </nav>
      </aside>

      <div class="min-w-0">
        <header class="mb-5">
          <p class="text-xs font-semibold text-[var(--app-primary)]">Extra Tools / {{ researchGroupLabels[group] }}</p>
          <div class="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div class="max-w-5xl">
              <h1 class="text-3xl font-semibold leading-tight">{{ page.title }}</h1>
              <p class="mt-2 text-sm font-medium text-[var(--app-text-secondary)]">{{ page.subtitle }}</p>
            </div>
            <button type="button" class="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-xs font-semibold text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]" @click="load"><RefreshCw :size="14" /> Refresh</button>
          </div>
          <p class="mt-4 max-w-6xl text-[.8125rem] leading-6 text-[var(--app-text-muted)]">{{ page.intro }}</p>
        </header>

        <p v-if="error" class="mb-4 rounded-md border border-[var(--app-negative)] bg-[var(--app-surface)] px-4 py-3 text-sm text-[var(--app-negative)]">{{ error }} <button type="button" class="font-bold underline" @click="load">Try again</button></p>
        <div v-if="loading" class="grid min-h-[360px] place-items-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] text-sm text-[var(--app-text-muted)]">Loading {{ page.title }}…</div>

        <template v-else-if="data">
          <RiskOnOffContent v-if="slug === 'risk-on-off'" :data="data" />
          <MarketEnvironmentContent v-else-if="slug === 'market-environment'" :data="data" />
          <TacticalCompositeContent v-else-if="slug === 'tactical-composite-trend-model'" :data="data" />
          <MarketBreadthContent v-else-if="slug === 'market-breadth'" />
          <BondsContent v-else-if="slug === 'bonds'" />
          <EnergyContent v-else-if="slug === 'energy'" />
          <GoldContent v-else-if="slug === 'gold'" />
          <MacroContent v-else-if="slug === 'macro'" />
          <IntradayMonitorContent v-else-if="slug === 'intraday-monitor'" />
          <SeasonalityCalendarContent v-else-if="slug === 'seasonality-calendar'" />
          <GlobalBreadthContent v-else-if="slug === 'global-breadth-overview'" />
          <MarketSentimentContent v-else-if="slug === 'market-sentiment-overview'" />
          <OptixHeatmapContent v-else-if="slug === 'optix-heatmap'" />
          <RankChartsContent v-else-if="slug === 'rank-charts'" />
          <template v-else>
          <section class="mb-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4" aria-label="Summary metrics">
            <article v-for="metric in data.metrics" :key="metric.label" class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
              <p class="text-xs font-medium text-[var(--app-text-muted)]">{{ metric.label }}</p>
              <strong class="mt-2 block text-2xl font-semibold" :class="metric.tone === 'positive' ? 'text-[var(--app-positive)]' : metric.tone === 'negative' ? 'text-[var(--app-negative)]' : metric.tone === 'primary' ? 'text-[var(--app-primary)]' : ''">{{ metric.value }}</strong>
              <span class="mt-1 block text-[.6875rem] text-[var(--app-text-faint)]">{{ metric.detail }}</span>
            </article>
          </section>

          <section class="overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
            <div class="flex flex-wrap items-center gap-3 border-b border-[var(--app-border)] p-4">
              <div class="flex min-w-[210px] flex-1 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3"><Search :size="15" class="text-[var(--app-text-muted)]"/><input v-model="query" type="search" class="h-9 min-w-0 flex-1 border-0 bg-transparent text-xs outline-none" placeholder="Search measures…" /></div>
              <div class="inline-flex overflow-hidden rounded-md border border-[var(--app-border)]">
                <button v-for="option in ['1D','1M','3M','1Y']" :key="option" type="button" class="h-9 px-3 text-xs font-semibold" :class="range === option ? 'bg-[var(--app-primary)] text-white' : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] hover:bg-[var(--app-primary-soft)]'" @click="range = option">{{ option }}</button>
              </div>
              <div class="inline-flex overflow-hidden rounded-md border border-[var(--app-border)]">
                <button type="button" class="h-9 px-3 text-xs font-semibold" :class="view === 'charts' ? 'bg-[var(--app-primary-soft)] text-[var(--app-primary)]' : ''" @click="view='charts'">Charts</button>
                <button type="button" class="h-9 px-3 text-xs font-semibold" :class="view === 'table' ? 'bg-[var(--app-primary-soft)] text-[var(--app-primary)]' : ''" @click="view='table'">Table</button>
              </div>
              <button type="button" class="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--app-border)] px-3 text-xs font-semibold text-[var(--app-text-secondary)]"><SlidersHorizontal :size="14"/> Filters</button>
              <button type="button" class="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--app-border)] px-3 text-xs font-semibold text-[var(--app-text-secondary)]"><Download :size="14"/> Export</button>
            </div>

            <div v-if="view === 'charts' && page.kind === 'calendar'" class="p-4">
              <div class="mb-4 flex items-center justify-between"><div><h2 class="font-semibold">Seasonality calendar</h2><p class="mt-1 text-xs text-[var(--app-text-muted)]">Active seasonal tendencies by trading date</p></div><strong class="text-sm text-[var(--app-primary)]">November 2026</strong></div>
              <div class="grid grid-cols-7 overflow-hidden rounded-lg border border-[var(--app-border)]">
                <div v-for="day in ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']" :key="day" class="border-b border-r border-[var(--app-border)] bg-[var(--app-surface-muted)] px-2 py-2 text-center text-[.6875rem] font-semibold text-[var(--app-text-muted)] last:border-r-0">{{ day }}</div>
                <div v-for="day in 35" :key="day" class="min-h-24 border-b border-r border-[var(--app-border-muted)] p-2" :class="day < 6 || day > 35 ? 'bg-[var(--app-surface-soft)]' : ''"><span v-if="day >= 6" class="text-xs font-semibold">{{ day - 5 }}</span><div v-if="day >= 6 && day % 4 === 0" class="mt-2 rounded bg-[var(--app-primary-soft)] px-2 py-1 text-[.625rem] font-semibold text-[var(--app-primary)]">Index {{ day % 3 + 1 }}</div></div>
              </div>
            </div>

            <div v-else-if="view === 'charts' && page.kind === 'heatmap'" class="p-4">
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <article v-for="(series,index) in filteredSeries" :key="series.name" class="rounded-lg border p-4" :class="index % 3 === 0 ? 'border-[var(--app-positive)]/30 bg-[var(--app-positive)]/10' : index % 3 === 1 ? 'border-[var(--app-border)] bg-[var(--app-surface-soft)]' : 'border-[var(--app-negative)]/30 bg-[var(--app-negative)]/10'">
                  <div class="flex items-center justify-between gap-3"><h2 class="text-sm font-semibold">{{ series.name }}</h2><span class="text-xs font-semibold" :class="toneClass(series.change)">{{ series.change }}</span></div><strong class="mt-4 block text-3xl">{{ series.value }}</strong><p class="mt-2 text-xs text-[var(--app-text-muted)]">{{ series.status }} · {{ range }}</p>
                </article>
              </div>
            </div>

            <div v-else-if="view === 'charts' && page.kind === 'ranking'" class="space-y-3 p-4">
              <article v-for="(series,index) in filteredSeries" :key="series.name" class="grid grid-cols-[minmax(110px,.7fr)_minmax(180px,2fr)_55px] items-center gap-3 rounded-md border border-[var(--app-border-muted)] px-4 py-3">
                <div><span class="text-[.6875rem] text-[var(--app-text-muted)]">#{{ index + 1 }}</span><h2 class="text-sm font-semibold">{{ series.name }}</h2></div><div class="h-3 overflow-hidden rounded-full bg-[var(--app-surface-muted)]"><div class="h-full rounded-full bg-[var(--app-primary)]" :style="{ width: `${series.value}%` }" /></div><strong class="text-right text-sm">{{ series.value }}</strong>
              </article>
            </div>

            <div v-else-if="view === 'charts'" class="grid gap-4 p-4 lg:grid-cols-2 2xl:grid-cols-3">
              <article v-for="series in filteredSeries" :key="series.name" class="overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]">
                <header class="flex items-start justify-between gap-3 px-4 pt-4"><div><h2 class="text-sm font-semibold">{{ series.name }}</h2><p class="mt-1 text-[.6875rem] text-[var(--app-text-muted)]">{{ range }} history</p></div><span class="rounded px-2 py-1 text-[.6875rem] font-semibold" :class="series.status === 'Optimism' ? 'bg-[var(--app-negative)]/10 text-[var(--app-negative)]' : series.status === 'Pessimism' ? 'bg-[var(--app-positive)]/10 text-[var(--app-positive)]' : 'bg-[var(--app-surface-muted)] text-[var(--app-text-muted)]'">{{ series.status }}</span></header>
                <div class="flex items-baseline gap-3 px-4 pt-3"><strong class="text-2xl">{{ series.value }}</strong><span class="text-xs font-semibold" :class="toneClass(series.change)">{{ series.change }}</span></div>
                <div class="px-3 py-3"><svg viewBox="0 0 100 40" class="h-28 w-full" preserveAspectRatio="none" role="img" :aria-label="`${series.name} trend chart`"><line v-for="y in [8,20,32]" :key="y" x1="0" :y1="y" x2="100" :y2="y" stroke="var(--chart-grid)" stroke-width=".35"/><polyline :points="sparkline(series)" fill="none" stroke="var(--app-primary)" stroke-width="1.4" vector-effect="non-scaling-stroke"/></svg></div>
                <footer class="border-t border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] px-4 py-2 text-[.6875rem] text-[var(--app-text-muted)]">Latest available reading · {{ data.updatedAt }}</footer>
              </article>
              <p v-if="!filteredSeries.length" class="col-span-full py-12 text-center text-sm text-[var(--app-text-muted)]">No measures match your search.</p>
            </div>

            <div v-else class="overflow-x-auto p-4">
              <table class="w-full min-w-[680px] border-collapse text-left text-xs">
                <thead><tr class="border-b border-[var(--app-border)] bg-[var(--app-surface-muted)]"><th v-for="column in data.tables[0]?.columns" :key="column" class="px-4 py-3 font-semibold text-[var(--app-text-secondary)]">{{ column }}</th></tr></thead>
                <tbody><tr v-for="row in data.tables[0]?.rows" :key="row[0]" class="border-b border-[var(--app-border-muted)] last:border-0 hover:bg-[var(--app-surface-hover)]"><td v-for="(cell,index) in row" :key="`${row[0]}-${index}`" class="px-4 py-3" :class="index === 0 ? 'font-semibold' : toneClass(cell)">{{ cell }}</td></tr></tbody>
              </table>
            </div>
          </section>

          <section v-for="table in data.tables.slice(1)" :key="table.title" class="mt-4 overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]"><header class="border-b border-[var(--app-border)] p-4"><h2 class="font-semibold">{{ table.title }}</h2><p class="mt-1 text-xs text-[var(--app-text-muted)]">{{ table.description }}</p></header></section>
          </template>
        </template>
      </div>
    </div>
    <section v-else class="mx-auto max-w-3xl rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center"><h1 class="text-xl font-semibold">Research page not found</h1><RouterLink class="mt-3 inline-block text-[var(--app-primary)]" to="/research/spotlights/risk-on-off">Open Spotlights</RouterLink></section>
  </main>
</template>

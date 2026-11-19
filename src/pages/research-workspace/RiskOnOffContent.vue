<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from '@lucide/vue'
import type { ResearchPageData, ResearchSeries } from './research.types'
import RiskOnOffChart from './RiskOnOffChart.vue'

const props = defineProps<{ data: ResearchPageData; period: 21 | 63 | 126 }>()
const emit = defineEmits<{ 'update:period': [value: 21 | 63 | 126] }>()
const query = ref('')
const expandedTitle = ref('')
const hoveredSession = ref(-1)
type SortKey = 'name' | 'status' | 'sessions'
const sortKey = ref<SortKey>('name')
const sortDirection = ref<'asc' | 'desc'>('asc')

const visibleSeries = computed(() => {
  const term = query.value.trim().toLowerCase()
  return props.data.series.filter((item) => !term || item.name.toLowerCase().includes(term)).sort((left, right) => {
    const leftValue = sortKey.value === 'name' ? left.name : sortKey.value === 'status' ? left.status : sessions(left)
    const rightValue = sortKey.value === 'name' ? right.name : sortKey.value === 'status' ? right.status : sessions(right)
    const result = typeof leftValue === 'number' && typeof rightValue === 'number' ? leftValue - rightValue : String(leftValue).localeCompare(String(rightValue))
    return sortDirection.value === 'asc' ? result : -result
  })
})
const riskMeasure = computed(() => props.data.riskChart?.measure.at(-1) ?? 0)
const riskOn = computed(() => Boolean(props.data.riskChart?.regimes.at(-1)))
const chartDates = computed(() => props.data.riskChart?.dates.slice(-props.period) ?? [])
const tablePeriod = computed(() => props.period)
const tableDates = computed(() => props.data.riskChart?.dates.slice(-tablePeriod.value) ?? [])
const tableSessionCount = computed(() => Math.min(tablePeriod.value, Math.max(0, ...props.data.series.map(item => item.points.length))))
const stateHistory = computed(() => props.data.riskChart?.regimes.slice(-props.period) ?? [])
const riskHistory = computed(() => props.data.riskChart?.measure.slice(-props.period) ?? [])

function linePoints(values: number[], height = 100) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return values.map((value, index) => `${index / Math.max(values.length - 1, 1) * 100},${height - 6 - (value - min) / span * (height - 12)}`).join(' ')
}
function history(item: ResearchSeries) { return item.points.slice(-tablePeriod.value) }
function sessions(item: ResearchSeries) {
  const currentState = item.status === 'Risk-on' ? 1 : 0
  return history(item).filter(state => state === currentState).length
}
function openExpanded(title: string) { expandedTitle.value = title }
const router = useRouter()
function openIndicatorDetail() { void router.push('/indicators/model_percent_spread') }
function sortBy(key: SortKey) { if (sortKey.value === key) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'; else { sortKey.value = key; sortDirection.value = 'asc' } }
function sessionDate(index: number) { return chartDates.value[index] ?? '' }
function tableDate(index: number) { const raw = tableDates.value[index]; return raw ? new Date(`${raw}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '' }
function componentDate(item: ResearchSeries, index: number) { return item.dates?.slice(-tablePeriod.value)[index] ?? tableDates.value[index] ?? '' }
const compositeTooltipStyle = computed(() => {
  if (hoveredSession.value < 0) return {}
  const count = stateHistory.value.length || 1
  const leftPercent = (hoveredSession.value + 0.5) / count * 100
  // Clamp so the centered tooltip never overflows the card edge (overflow-hidden would clip it)
  const clamped = Math.min(Math.max(leftPercent, 14), 86)
  return { left: `${clamped}%`, transform: 'translateX(-50%)' }
})
</script>

<template>
  <section class="space-y-4" data-testid="risk-on-off-content">
    <div class="flex flex-wrap items-center justify-between gap-3"><p class="text-xs text-[var(--app-text-muted)]">Latest data: {{ data.updatedAt }}</p><div class="inline-flex items-center gap-0.5 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-0.5" aria-label="Chart period"><button v-for="option in [21,63,126] as const" :key="option" type="button" class="h-7 rounded px-2.5 text-[.6875rem] font-semibold" :aria-pressed="period === option" :class="period === option ? 'bg-[var(--app-surface)] text-[var(--app-primary)] shadow-sm' : 'text-[var(--app-text-muted)] hover:text-[var(--app-primary)]'" @click="emit('update:period', option)">{{ option }} sessions</button></div></div>
    <div class="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
      <article v-for="metric in data.metrics" :key="metric.label" class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
        <p class="text-xs text-[var(--app-text-muted)]">{{ metric.label }}</p><strong class="mt-2 block text-2xl font-semibold" :class="metric.tone === 'positive' ? 'text-[var(--app-positive)]' : metric.tone === 'negative' ? 'text-[var(--app-negative)]' : metric.tone === 'primary' ? 'text-[var(--app-primary)]' : ''">{{ metric.value }}</strong><span class="mt-1 block text-[.6875rem] leading-5 text-[var(--app-text-faint)]">{{ metric.detail }}</span>
      </article>
    </div>

    <div class="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_290px]">
      <article class="overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        <header class="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--app-border)] px-3 py-3"><div><h2 class="font-semibold">Index and Risk Regime</h2><p class="mt-1 text-xs text-[var(--app-text-muted)]">Compare index movement and the Risk Measure on the same dates.</p></div><button type="button" aria-label="Expand Risk Measure chart" class="grid h-8 w-8 place-items-center rounded border border-[var(--app-border)] bg-[var(--app-surface)] text-sm text-[var(--app-text-muted)] hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]" @click="openExpanded('Index and Risk Regime')">↗</button></header>
        <div class="w-full min-w-0 px-3 py-3"><div class="mb-1 flex items-center justify-between text-xs"><strong>S&amp;P 500 Index</strong><span class="text-[var(--app-text-muted)]">Index level</span></div><RiskOnOffChart v-if="data.riskChart" :chart="data.riskChart" :period="period" /></div>
        <div class="relative border-t border-[var(--app-border)] px-5 py-3"><div class="mb-2 flex justify-between text-[.6875rem]"><strong>Composite state</strong><span class="text-[var(--app-text-muted)]">Green = risk-on · rose = risk-off</span></div><div class="flex h-2.5 gap-0.5" role="img" :aria-label="`Composite state history, ${period} sessions`" @mouseleave="hoveredSession = -1"><span v-for="(state,index) in stateHistory" :key="index" class="relative min-w-0 flex-1 rounded-[1px] transition-opacity hover:z-10 hover:outline hover:outline-1 hover:outline-offset-1 hover:outline-[var(--app-text)]" :class="state ? 'bg-[var(--app-positive)]' : 'bg-[var(--app-negative)]'" @mouseenter="hoveredSession = index"/></div><div v-if="hoveredSession >= 0" class="pointer-events-none absolute bottom-full left-0 z-20 mb-1.5 flex justify-center" :style="compositeTooltipStyle"><span class="whitespace-nowrap rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1 text-[.6875rem] font-semibold shadow-md">{{ sessionDate(hoveredSession) }}: <span :class="stateHistory[hoveredSession] ? 'text-[var(--app-positive)]' : 'text-[var(--app-negative)]'">{{ stateHistory[hoveredSession] ? 'Risk-on' : 'Risk-off' }}</span></span></div></div>
      </article>

      <aside class="space-y-4">
        <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-primary-soft)] p-5"><span class="text-[.6875rem] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">Current Risk Measure</span><strong class="mt-2 block text-4xl" :class="riskOn ? 'text-[var(--app-positive)]' : 'text-[var(--app-negative)]'">{{ riskMeasure.toFixed(2) }}<small class="text-lg">%</small></strong><span class="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold" :class="riskOn ? 'bg-[var(--app-positive)]/10 text-[var(--app-positive)]' : 'bg-[var(--app-negative)]/10 text-[var(--app-negative)]'"><i class="h-1.5 w-1.5 rounded-full bg-current"/>{{ riskOn ? 'Risk-on' : 'Risk-off' }}</span><p class="mt-4 text-xs leading-5 text-[var(--app-text-muted)]">Latest state returned by the Risk On / Off indicator.</p></section>
        <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-5 text-left"><h2 class="font-semibold">How the state changes</h2><div class="mt-4 space-y-4 text-xs"><div v-for="rule in [{range:'>67%',title:'Switch to risk-on',detail:'Hold until the reading falls below 35%.',tone:'positive'},{range:'35–67%',title:'Keep the previous state',detail:'A reading in this range does not change the state.',tone:''},{range:'<35%',title:'Switch to risk-off',detail:'Hold until the reading rises above 67%.',tone:'negative'}]" :key="rule.range" class="grid grid-cols-[68px_minmax(0,1fr)] items-start gap-4"><b class="whitespace-nowrap text-left tabular-nums" :class="rule.tone === 'positive' ? 'text-[var(--app-positive)]' : rule.tone === 'negative' ? 'text-[var(--app-negative)]' : ''">{{ rule.range }}</b><div class="text-left"><strong class="block leading-4">{{ rule.title }}</strong><p class="mt-1 leading-5 text-[var(--app-text-muted)]">{{ rule.detail }}</p></div></div></div></section>
      </aside>
    </div>

    <section v-if="data.series.length" class="overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)] px-5 py-4"><div><h2 class="font-semibold">Inside the composite</h2><p class="mt-1 text-xs text-[var(--app-text-muted)]">All 21 indicators with their current state and daily history.</p></div><div class="flex flex-wrap items-center justify-end gap-2"><span class="inline-flex items-center gap-1.5 rounded-full bg-[var(--app-positive)]/10 px-3 py-1.5 text-[.6875rem] font-bold text-[var(--app-positive)]"><i class="h-1.5 w-1.5 rounded-full bg-current"/>Risk-on</span><span class="inline-flex items-center gap-1.5 rounded-full bg-[var(--app-negative)]/10 px-3 py-1.5 text-[.6875rem] font-bold text-[var(--app-negative)]"><i class="h-1.5 w-1.5 rounded-full bg-current"/>Risk-off</span><span class="inline-flex rounded-full bg-[var(--app-surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--app-text-muted)]">{{ visibleSeries.length }} indicators</span></div></header>
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)] p-4"><label class="flex max-w-md flex-1 items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3"><Search :size="15" class="text-[var(--app-text-muted)]"/><input v-model="query" class="h-9 min-w-0 flex-1 bg-transparent text-xs outline-none" type="search" placeholder="Find an indicator…" /></label><p class="whitespace-nowrap text-[.6875rem] leading-5 text-[var(--app-text-muted)]">Each block = one trading session · Hover for date and state · Older → Latest</p></div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] border-collapse text-left text-[.8125rem]">
          <thead class="bg-[var(--app-surface-muted)] text-[.6875rem] font-semibold text-[var(--app-text-secondary)]">
            <tr class="border-b border-[var(--app-border)]">
              <th class="px-4 py-3"><button type="button" class="inline-flex items-center gap-1.5 font-semibold" @click="sortBy('name')">Component<ArrowUp v-if="sortKey === 'name' && sortDirection === 'asc'" :size="13"/><ArrowDown v-else-if="sortKey === 'name'" :size="13"/><ArrowUpDown v-else :size="13"/></button></th>
              <th class="px-4 py-3"><button type="button" class="inline-flex items-center gap-1.5 font-semibold" @click="sortBy('status')">Current state<ArrowUp v-if="sortKey === 'status' && sortDirection === 'asc'" :size="13"/><ArrowDown v-else-if="sortKey === 'status'" :size="13"/><ArrowUpDown v-else :size="13"/></button></th>
              <th class="w-[32%] min-w-[245px] max-w-[400px] px-4 py-[11px]"><div class="flex items-baseline justify-between gap-2 text-[10px] text-[var(--app-text-secondary)]"><span>Daily state history</span><small class="whitespace-nowrap text-[9px] font-normal text-[var(--app-text-muted)]">{{ tableSessionCount }} sessions</small></div><div class="mt-2 flex justify-between gap-2 text-[9px] font-normal text-[var(--app-text-muted)]"><span>{{ tableDate(0) }}</span><span>{{ tableDate(Math.floor((tableDates.length - 1) / 2)) }}</span><span>{{ tableDate(tableDates.length - 1) }}</span></div></th>
              <th class="px-4 py-3"><button type="button" class="inline-flex items-center gap-1.5 font-semibold" @click="sortBy('sessions')">Sessions in<br/>Current State<ArrowUp v-if="sortKey === 'sessions' && sortDirection === 'asc'" :size="13"/><ArrowDown v-else-if="sortKey === 'sessions'" :size="13"/><ArrowUpDown v-else :size="13"/></button></th>
              <th class="w-12 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item,rowIndex) in visibleSeries" :key="item.name" class="border-b border-[var(--app-border-muted)] last:border-0 hover:bg-[var(--app-surface-hover)]" :class="rowIndex % 2 ? 'bg-[var(--app-row-even)]' : ''">
              <td class="px-4 py-3 font-semibold text-[var(--app-text-secondary)]">{{ item.name }}</td>
              <td class="px-4 py-3"><span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[.6875rem] font-bold" :class="item.status === 'Risk-on' ? 'bg-[var(--app-positive)]/10 text-[var(--app-positive)]' : 'bg-[var(--app-negative)]/10 text-[var(--app-negative)]'"><i class="h-1.5 w-1.5 rounded-full bg-current"/>{{ item.status }}</span></td>
              <td class="w-[32%] min-w-[245px] max-w-[400px] px-4 py-[11px]"><div class="flex h-[10px] min-w-0 gap-0.5" role="img" :aria-label="`${item.name} daily state history, ${history(item).length} sessions`"><span v-for="(state,index) in history(item)" :key="index" class="relative min-w-0 flex-1 rounded-[1px] transition-opacity hover:z-10 hover:outline hover:outline-1 hover:outline-offset-1 hover:outline-[var(--app-text)]" :class="state ? 'bg-[var(--app-positive)]' : 'bg-[var(--app-negative)]'" :title="`${componentDate(item, index)}: ${state ? 'Risk on' : 'Risk off'}`"/></div></td>
              <td class="whitespace-nowrap px-4 py-3 text-[var(--app-text-muted)]">{{ sessions(item) }} {{ sessions(item) === 1 ? 'session' : 'sessions' }}</td>
              <td class="px-4 py-3 text-right"><button type="button" :aria-label="`Open ${item.name} indicator detail`" class="h-6 w-6 rounded border border-[var(--app-border)] bg-[var(--app-surface)] text-sm leading-5 text-[var(--app-text-muted)] hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]" @click="openIndicatorDetail">↗</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!visibleSeries.length" class="py-12 text-center text-sm text-[var(--app-text-muted)]">No indicators match your search.</p>
      <footer class="border-t border-[var(--app-border)] bg-[var(--app-surface-soft)] px-5 py-3 text-[.6875rem] leading-5 text-[var(--app-text-muted)]">The history blocks show each component’s daily state; they do not represent the size of its underlying reading.</footer>
    </section>

    <Teleport to="body">
      <div v-if="expandedTitle" class="fixed inset-0 z-[80] grid place-items-center bg-[var(--app-overlay)] p-4" role="dialog" aria-modal="true" :aria-label="expandedTitle">
        <section class="w-full max-w-5xl overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl">
          <header class="flex items-center justify-between border-b border-[var(--app-border)] px-5 py-4"><div><p class="text-[.6875rem] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">Research detail</p><h2 class="mt-1 text-lg font-semibold">{{ expandedTitle }}</h2></div><button type="button" aria-label="Close expanded chart" class="grid h-9 w-9 place-items-center rounded-md hover:bg-[var(--app-surface-hover)]" @click="expandedTitle = ''"><X :size="18"/></button></header>
          <div class="p-6"><svg viewBox="0 0 100 100" class="h-[55vh] min-h-72 w-full" preserveAspectRatio="none"><line v-for="y in [20,40,60,80]" :key="y" x1="0" :y1="y" x2="100" :y2="y" stroke="var(--chart-grid)" stroke-width=".4"/><polyline :points="linePoints(expandedTitle === 'Index and Risk Regime' ? riskHistory : (data.series.find(item => item.name === expandedTitle)?.points ?? riskHistory))" fill="none" stroke="var(--app-primary)" stroke-width="1.8" vector-effect="non-scaling-stroke"/></svg></div>
          <footer class="border-t border-[var(--app-border)] bg-[var(--app-surface-soft)] px-5 py-3 text-xs text-[var(--app-text-muted)]">{{ period }} sessions · {{ data.updatedAt }}</footer>
        </section>
      </div>
    </Teleport>
  </section>
</template>

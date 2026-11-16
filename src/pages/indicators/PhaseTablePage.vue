<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, ExternalLink } from '@lucide/vue'
import { fetchClassicDashboard } from '@/pages/dashboard/dashboard.api'

interface PhaseRow {
  shaded: boolean
  indicator: string
  optix: string
  market: string
}

type PhaseSortKey = 'market' | 'optix'
type PhaseSortDirection = 'asc' | 'desc'

const phaseHeaders = [
  { phase: 'PHASE 1', title: 'Extremely Low Optimism', description: 'Watch for capitulatory action, reversals and a move into Phase 2', tone: 'phase-one' },
  { phase: 'PHASE 2', title: 'Rising but not High Optimism', description: 'Watch for rising prices and a possible move into Phase 3', tone: 'phase-two' },
  { phase: 'PHASE 3', title: 'Extremely High Optimism', description: 'Watch for blow-off moves, reversals and a move into Phase 4', tone: 'phase-three' },
  { phase: 'PHASE 4', title: 'Falling but not Low Optimism', description: 'Watch for falling prices and a possible move into Phase 1', tone: 'phase-four' },
]

const rawData = ref<unknown>({})
const loading = ref(false)
const loadError = ref(false)
const hover = ref<{ market: string; thumbnail: string; x: number; y: number } | null>(null)
const phaseSorts = ref<Record<number, { key: PhaseSortKey; direction: PhaseSortDirection }>>({})
let controller: AbortController | null = null

function text(value: unknown, fallback = '—'): string {
  return value === null || value === undefined || value === '' ? fallback : String(value)
}

function phaseBucket(index: number): unknown[] {
  const source = rawData.value
  if (Array.isArray(source)) return Array.isArray(source[index]) ? source[index] as unknown[] : []
  if (!source || typeof source !== 'object') return []
  const bucket = (source as Record<string, unknown>)[String(index)]
  return Array.isArray(bucket) ? bucket : []
}

const phases = computed(() => phaseHeaders.map((header, phaseIndex) => {
  const rows = phaseBucket(phaseIndex + 1).flatMap((item): PhaseRow[] => {
    if (!Array.isArray(item)) return []
    return [{
      shaded: Boolean(item[0]),
      indicator: text(item[1], ''),
      optix: text(item[2]),
      market: text(item[3], 'Unknown Market'),
    }]
  })
  const sort = phaseSorts.value[phaseIndex]
  if (sort) rows.sort((left, right) => {
    const leftValue = sort.key === 'optix' ? Number(left.optix) : left.market.toLowerCase()
    const rightValue = sort.key === 'optix' ? Number(right.optix) : right.market.toLowerCase()
    const a = typeof leftValue === 'number' && !Number.isFinite(leftValue) ? Number.NEGATIVE_INFINITY : leftValue
    const b = typeof rightValue === 'number' && !Number.isFinite(rightValue) ? Number.NEGATIVE_INFINITY : rightValue
    const result = a < b ? -1 : a > b ? 1 : 0
    return sort.direction === 'asc' ? result : -result
  })
  return { ...header, rows }
}))

function togglePhaseSort(phaseIndex: number, key: PhaseSortKey) {
  const current = phaseSorts.value[phaseIndex]
  phaseSorts.value = {
    ...phaseSorts.value,
    [phaseIndex]: { key, direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc' },
  }
}

function phaseSortIcon(phaseIndex: number, key: PhaseSortKey) {
  const sort = phaseSorts.value[phaseIndex]
  if (sort?.key !== key) return ArrowUpDown
  return sort.direction === 'asc' ? ArrowUp : ArrowDown
}

function indicatorHref(indicator: string): string {
  const query = new URLSearchParams({ index: 'Unknown', indicator })
  return `/backtester/sr/setup?${query.toString()}`
}

function moveHover(event: MouseEvent) {
  if (!hover.value) return
  const width = 320
  const height = 240
  hover.value.x = Math.min(window.innerWidth - width - 12, Math.max(12, event.clientX + 14))
  hover.value.y = event.clientY > height + 24 ? event.clientY - height - 12 : event.clientY + 14
}

function showPreview(event: MouseEvent, row: PhaseRow) {
  if (!row.indicator) return
  hover.value = {
    market: row.market,
    thumbnail: `https://d1wrgh3h32hjn2.cloudfront.net/${row.indicator}_250.png`,
    x: 0,
    y: 0,
  }
  moveHover(event)
}

function hideBrokenImage(event: Event) {
  ;(event.target as HTMLImageElement).style.display = 'none'
}

async function load() {
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  loadError.value = false
  try {
    const dashboard = await fetchClassicDashboard(controller.signal)
    rawData.value = dashboard.phase_table_data
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
    <div class="mx-auto max-w-[1600px]">
      <RouterLink class="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--app-primary)] hover:underline" to="/">
        <ArrowLeft :size="16" /> Back to Classic Dashboard
      </RouterLink>

      <section class="overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]">
        <header class="border-b border-[var(--app-border)] px-5 py-5">
          <h1 class="text-3xl font-semibold leading-tight">Phase Table</h1>
          <p class="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">
            To view a larger version of this chart,
            <a class="inline-flex items-center gap-1 font-semibold text-[var(--app-primary)] hover:underline" href="https://users.sentimentrader.com/users/phases/" target="_blank" rel="noopener noreferrer">click here <ExternalLink :size="13"/></a>.
          </p>
          <div class="mt-5 max-w-5xl">
            <h2 class="text-lg font-semibold">About the Phase Table</h2>
            <p class="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">The Phase Table shows sentiment regimes for major assets and ETFs. It is based on the level and trend of the Optimism Index for each market. Generally, markets with low and/or rising optimism (Phases 1 and 2) have the best chance for price gains. Markets with high and/or declining optimism (Phases 3 and 4) have a lower probability.</p>
            <p class="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">The Phases are determined by the level and direction of the Optimism Index (10-day average for ETFs and 5-day average for futures).</p>
          </div>
        </header>

        <p v-if="loadError" class="m-4 rounded-md border border-[var(--app-negative)]/30 bg-[var(--app-negative)]/5 px-4 py-3 text-sm text-[var(--app-negative)]">Unable to load the Phase Table. <button class="font-semibold underline" type="button" @click="load">Try again</button></p>
        <div v-if="loading" class="flex min-h-[420px] items-center justify-center text-sm text-[var(--app-text-muted)]">Loading phase table...</div>
        <div v-else-if="!loadError" class="grid items-start gap-4 p-4 md:grid-cols-2 2xl:grid-cols-4">
          <article v-for="(phase, phaseIndex) in phases" :key="phase.phase" class="overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
            <header class="phase-header min-h-[150px] px-4 py-4 text-center text-white" :class="phase.tone">
              <strong class="block text-lg">{{ phase.phase }}</strong>
              <span class="mt-1 block text-sm font-semibold">{{ phase.title }}</span>
              <small class="mt-3 block text-xs leading-5 text-white/85">{{ phase.description }}</small>
            </header>
            <div class="grid grid-cols-[minmax(0,1fr)_82px] border-b border-[var(--app-border)] bg-[var(--app-surface-muted)] px-3 py-2 text-xs font-bold">
              <button type="button" class="inline-flex items-center gap-1 text-left hover:text-[var(--app-primary)]" @click="togglePhaseSort(phaseIndex, 'market')">Market <component :is="phaseSortIcon(phaseIndex, 'market')" :size="13"/></button>
              <button type="button" class="inline-flex items-center justify-end gap-1 text-right hover:text-[var(--app-primary)]" @click="togglePhaseSort(phaseIndex, 'optix')">Optix <component :is="phaseSortIcon(phaseIndex, 'optix')" :size="13"/></button>
            </div>
            <div v-if="phase.rows.length">
              <a v-for="(row, index) in phase.rows" :key="`${row.indicator}-${index}`" class="grid min-h-11 grid-cols-[minmax(0,1fr)_82px] items-center border-b border-[var(--app-border-muted)] px-3 py-2 text-sm text-[var(--app-text)] last:border-b-0 hover:bg-[var(--app-primary-soft)]" :class="{ 'phase-shaded': row.shaded }" :href="indicatorHref(row.indicator)" @mouseenter="showPreview($event, row)" @mousemove="moveHover" @mouseleave="hover = null">
                <span class="overflow-hidden text-ellipsis whitespace-nowrap font-semibold">{{ row.market }}</span>
                <strong class="text-right font-variant-numeric tabular-nums">{{ row.optix }}</strong>
              </a>
            </div>
            <p v-else class="px-4 py-8 text-center text-sm text-[var(--app-text-muted)]">No markets in this phase.</p>
          </article>
        </div>
      </section>
    </div>

    <Teleport to="body">
      <div v-if="hover" class="phase-preview" :style="{ left: `${hover.x}px`, top: `${hover.y}px` }">
        <strong>{{ hover.market }}</strong>
        <img :src="hover.thumbnail" :alt="`${hover.market} indicator preview`" @error="hideBrokenImage" />
      </div>
    </Teleport>
  </main>
</template>

<style scoped>
.phase-one{background:#1b6b34}.phase-two{background:#2a9f83}.phase-three{background:#bd3447}.phase-four{background:#d66b7d}.phase-shaded{background:var(--app-surface-muted)}
.phase-preview{position:fixed;z-index:300;width:320px;overflow:hidden;border:1px solid var(--app-border);border-radius:8px;background:var(--app-surface);box-shadow:0 12px 32px rgb(0 0 0 / .25);pointer-events:none}.phase-preview strong{display:block;overflow:hidden;padding:.55rem .7rem;color:var(--app-text);font-size:.78rem;text-overflow:ellipsis;white-space:nowrap}.phase-preview img{display:block;width:100%;max-height:200px;object-fit:contain;background:#fff}
</style>

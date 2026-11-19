<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowDown, ArrowUp, ArrowUpDown } from '@lucide/vue'
import { fetchGlobalBreadth } from './global-breadth.api'

const regions = ref<string[]>([])
const groups = ['All measures', 'Trend', 'Highs & lows', 'Relative strength', 'Drawdown & recovery', 'Momentum']
function measureGroup(label: string) {
  if (/high|low/i.test(label)) return 'Highs & lows'
  if (/relative|outperform|underperform/i.test(label)) return 'Relative strength'
  if (/drawdown|recovery|correction|bear market/i.test(label)) return 'Drawdown & recovery'
  if (/momentum|rsi|macd|oscillator/i.test(label)) return 'Momentum'
  return 'Trend'
}
type BreadthRow = { id: number; group: string; label: string; values: Array<number | null> }
const rows = ref<BreadthRow[]>([])
const error = ref('')
const loading = ref(true)
const controller = new AbortController()
onMounted(async () => {
  try {
    const result = await fetchGlobalBreadth(controller.signal)
    regions.value = result.regions
    rows.value = result.measures.map((measure, id) => ({
      id,
      group: measureGroup(measure.measure),
      label: measure.measure,
      values: result.regions.map(region => {
        const value = measure.values?.[region]
        return value != null && Number.isFinite(Number(value)) ? Number(value) : null
      }),
    }))
  } catch (reason) { if (!controller.signal.aborted) error.value = reason instanceof Error ? reason.message : 'Unable to load global breadth' }
  finally { if (!controller.signal.aborted) loading.value = false }
})
onBeforeUnmount(() => controller.abort())
const selected = ref(0)
const group = ref('All measures')
const query = ref('')
const sort = ref(-1)
const sortDirection = ref<'asc' | 'desc'>('desc')
const selectedRow = computed(() => rows.value[selected.value] ?? rows.value[0])
const visible = computed(() => {
  const term = query.value.trim().toLowerCase()
  const result = rows.value.filter((row) => (group.value === 'All measures' || row.group === group.value) && row.label.toLowerCase().includes(term))
  if (sort.value === -2) result.sort((left, right) => sortDirection.value === 'asc' ? left.label.localeCompare(right.label) : right.label.localeCompare(left.label))
  if (sort.value >= 0) result.sort((left, right) => {
    const a = left.values[sort.value], b = right.values[sort.value]
    if (a == null) return b == null ? 0 : 1
    if (b == null) return -1
    return (sortDirection.value === 'asc' ? 1 : -1) * (a - b)
  })
  return result
})
function sortBy(index: number) { if (sort.value === index) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'; else { sort.value = index; sortDirection.value = index === -2 ? 'asc' : 'desc' } }
function reset() { selected.value = 0; group.value = 'All measures'; query.value = ''; sort.value = -1; sortDirection.value = 'desc' }
</script>

<template>
  <p v-if="loading" role="status">Loading global breadth…</p>
  <p v-else-if="error" role="alert">{{ error }}</p>
  <p v-else-if="!rows.length" role="status">No global breadth data available.</p>
  <section v-else class="space-y-4" data-testid="global-breadth-content">
    <section class="grid items-center gap-6 rounded-lg border border-[var(--app-border)] bg-[var(--app-primary-soft)] p-6 lg:grid-cols-[1.2fr_1fr]"><div><p class="text-[10px] font-extrabold uppercase tracking-[.13em] text-[var(--app-primary)]">Global index breadth</p><h2 class="mt-2 text-2xl font-semibold">Global market coverage</h2></div><div class="grid grid-cols-3 gap-3"><div v-for="stat in [{value:45,label:'Worldwide indexes'},{value:rows.length,label:'Breadth measures'},{value:regions.length,label:'Market groups'}]" :key="stat.label" class="border-l border-[var(--app-border)] pl-4"><strong class="block text-3xl text-[var(--app-primary)]">{{ stat.value }}</strong><span class="mt-1 block text-xs text-[var(--app-text-muted)]">{{ stat.label }}</span></div></div></section>
    <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm"><div class="flex flex-wrap items-start justify-between gap-3"><div><p class="text-[10px] font-extrabold uppercase tracking-[.13em] text-[var(--app-primary)]">Market group comparison</p><h2 class="mt-2 text-lg font-semibold">{{ selectedRow.label }}</h2><p class="mt-1 text-xs text-[var(--app-text-muted)]">Share of indexes meeting this condition · scale 0–100%</p></div><span class="rounded border border-[var(--app-border)] bg-[var(--app-primary-soft)] px-2 py-1 text-xs font-semibold text-[var(--app-primary)]">{{ selectedRow.group }}</span></div><div class="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3"><div v-for="(region,index) in regions" :key="region"><div class="mb-2 flex items-center justify-between gap-2 text-xs"><span class="text-[var(--app-text-secondary)]">{{ region }}</span><strong class="text-xl tabular-nums text-[var(--app-primary)]">{{ selectedRow.values[index] ?? '—' }}<small class="ml-0.5 text-xs">%</small></strong></div><div class="h-[7px] overflow-hidden rounded-full bg-[var(--app-primary-soft)]"><div class="h-full rounded-full bg-[var(--app-primary)]" :style="{ width: `${selectedRow.values[index] ?? 0}%` }" /></div></div></div></section>
    <section class="overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm"><header class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)] px-5 py-4"><div><h2 class="breadth-group-heading font-semibold">Breadth by market group</h2><p class="mt-1 text-xs text-[var(--app-text-muted)]">All values are percentages. Select a measure to compare it above.</p></div><span class="rounded border border-[var(--app-border)] bg-[var(--app-primary-soft)] px-2 py-1 text-xs font-semibold text-[var(--app-primary)]">{{ visible.length }} of {{ rows.length }} measures</span></header><div class="flex flex-wrap gap-2 border-b border-[var(--app-border)] p-4"><input v-model="query" type="search" aria-label="Search breadth measures" placeholder="Search measures, periods or conditions…" class="min-w-[215px] flex-1 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs" /><select v-model.number="selected" aria-label="Measure to compare" class="min-w-[230px] max-w-[450px] flex-[1.5] rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs"><option v-for="row in rows" :key="row.id" :value="row.id">{{ row.label }}</option></select><button type="button" class="rounded-md border border-[var(--app-border)] bg-[var(--app-primary-soft)] px-3 py-2 text-xs font-semibold text-[var(--app-primary)]" @click="reset">Reset</button></div><div class="flex flex-wrap gap-1.5 px-4 py-3"><button v-for="category in groups" :key="category" type="button" class="rounded-md border px-3 py-1.5 text-[11px] font-semibold" :class="group === category ? 'border-[var(--app-primary)] bg-[var(--app-primary)] text-white' : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-secondary)] hover:bg-[var(--app-primary-soft)]'" @click="group = category">{{ category }} <small v-if="category !== 'All measures'" class="ml-1 opacity-70">{{ rows.filter((row) => row.group === category).length }}</small></button></div>
      <div class="overflow-x-auto"><table class="w-full min-w-[900px] table-fixed border-collapse text-xs text-[var(--app-text-strong)]"><thead class="bg-[var(--app-surface-muted)] text-[.6875rem] font-semibold text-[var(--app-text-strong)]"><tr class="border-b border-[var(--app-border)]"><th class="w-[41%] px-4 py-3 text-left"><button type="button" class="inline-flex items-center gap-1.5 font-semibold" @click="sortBy(-2)">Breadth measure<ArrowUp v-if="sort === -2 && sortDirection === 'asc'" :size="13"/><ArrowDown v-else-if="sort === -2" :size="13"/><ArrowUpDown v-else :size="13"/></button></th><th v-for="(region,index) in regions" :key="region" class="px-2 py-3 text-center"><button type="button" :title="`Sort by ${region}`" class="inline-flex items-center justify-center gap-1.5 font-semibold" @click="sortBy(index)">{{ region }}<ArrowUp v-if="sort === index && sortDirection === 'asc'" :size="13"/><ArrowDown v-else-if="sort === index" :size="13"/><ArrowUpDown v-else :size="13"/></button></th></tr></thead><tbody><tr v-for="row in visible" :key="row.id" class="border-b border-[var(--app-border-muted)]"><th scope="row" class="p-0 text-left font-medium" :class="row.id === selected ? 'bg-[var(--app-primary-soft)] shadow-[inset_3px_0_var(--app-primary)]' : ''"><button type="button" :title="`Compare ${row.label} across regions`" class="flex w-full items-center gap-2 px-4 py-3 text-left leading-5 text-[var(--app-text-strong)] hover:underline" @click="selected = row.id"><i class="h-1.5 w-1.5 shrink-0 rounded-full" :class="row.id === selected ? 'bg-[var(--app-primary)]' : 'bg-[var(--app-border)]'" />{{ row.label }}</button></th><td v-for="(value,index) in row.values" :key="index" class="relative border-x-[3px] border-b-[3px] border-[var(--app-surface)] px-1 py-2 text-center font-semibold tabular-nums text-[var(--app-text-strong)]" :style="{ backgroundColor: value == null ? undefined : `rgba(7,101,249,${0.035 + value * 0.0019})` }"><span class="relative z-10">{{ value ?? '—' }}</span><i class="absolute bottom-0 left-0 h-0.5 bg-[var(--app-primary)]/70" :style="{ width: `${value ?? 0}%` }" /></td></tr><tr v-if="!visible.length"><td colspan="7" class="p-8 text-center text-[var(--app-text-muted)]">No measures match your search.</td></tr></tbody></table></div><footer class="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--app-border)] bg-[var(--app-surface-soft)] px-5 py-3 text-xs text-[var(--app-text-muted)]"><span>Blue shading shows the percentage meeting each condition; darker means a higher percentage.</span><span class="flex items-center gap-2">0% <i class="h-[7px] w-[90px] rounded-full bg-gradient-to-r from-[var(--app-primary-soft)] to-[var(--app-primary)]" /> 100%</span></footer></section>
  </section>
</template>

<style scoped>
.breadth-group-heading { color: var(--app-text-strong); }
</style>


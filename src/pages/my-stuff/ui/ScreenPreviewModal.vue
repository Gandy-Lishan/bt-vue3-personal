<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Filter, Info, Layers3, Pencil, Search, Star, X } from '@lucide/vue'
import type { MyScreenRow } from '@/entities/my-stuff/model/my-screen.types'

const props = defineProps<{ row: MyScreenRow }>()
const emit = defineEmits<{ close: []; edit: [row: MyScreenRow]; viewResults: [row: MyScreenRow] }>()
const universeExpanded = ref(false)

const relationLabel = computed(() => props.row.relation === 2 ? 'OR' : props.row.relation === 1 ? 'AND' : '')
const signalLabels: Record<string, string> = {
  TrendScore: 'Trend Score', HV20: 'Historical Volatility (20-Day)', HV60: 'Historical Volatility (60-Day)',
  Close: 'Symbol Close', Change: 'Daily Return', RSI: 'Relative Strength Index (RSI)',
  SMA200: 'Symbol Close 200-Day Moving Average', SMA100: 'Symbol Close 100-Day Moving Average',
  SMA50: 'Symbol Close 50-Day Moving Average', SMA20: 'Symbol Close 20-Day Moving Average',
  SMA10: 'Symbol Close 10-Day Moving Average', SMA5: 'Symbol Close 5-Day Moving Average',
  Optix: 'Symbol Optix', SATH: 'Symbol Close All-Time High', SATL: 'Symbol Close All-Time Low',
  S52WH: 'Symbol Close 52-Week High', S52WL: 'Symbol Close 52-Week Low',
  S13WH: 'Symbol Close 13-Week High', S13WL: 'Symbol Close 13-Week Low',
  S4WH: 'Symbol Close 4-Week High', S4WL: 'Symbol Close 4-Week Low',
}
function dateLabel(value: number) {
  if (value === 0) return 'Current bar'
  if (value === -1) return 'Previous bar'
  return `${Math.abs(value)} bars ago`
}
function cleanScreenRule(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+(?:and|or)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}
const rules = computed(() => {
  const descriptions = props.row.description.map(cleanScreenRule).filter(Boolean)
  if (descriptions.length) return descriptions
  return props.row.conditions.map((condition) => `${condition.signal} ${['>', '=', '<'][condition.condition] ?? '='} ${condition.value}`)
})
const ruleItems = computed(() => {
  if (props.row.conditions.length) return props.row.conditions.map((condition) => ({
    context: dateLabel(condition.date),
    text: `${signalLabels[condition.signal] ?? condition.signal} ${['greater than', 'equal to', 'less than'][condition.condition] ?? 'equal to'} ${condition.value}`,
  }))
  return rules.value.map((rule) => {
    const match = rule.match(/^((?:Current|Previous) bar|\d+ bars ago):?\s*(.*)$/i)
    return { context: match?.[1] ?? '', text: match?.[2] || rule }
  })
})
const universeText = computed(() => props.row.category === 'Custom'
  ? (props.row.tickers.join(', ') || 'No stocks selected')
  : props.row.category)
const universeCaption = computed(() => {
  if (props.row.category === 'Custom') return `${props.row.tickers.length} selected stock${props.row.tickers.length === 1 ? '' : 's'}`
  if (['S&P 500', 'NDX'].includes(props.row.category)) return 'All stocks in this index'
  return 'All stocks in this sector'
})
const canExpandUniverse = computed(() => props.row.category === 'Custom' && props.row.tickers.length > 12)
const conditionsLabel = computed(() => `${ruleItems.value.length} condition${ruleItems.value.length === 1 ? '' : 's'}`)
const conditionsHint = computed(() => {
  if (ruleItems.value.length <= 1) return 'Stocks must meet the condition below.'
  if (relationLabel.value === 'OR') return 'Stocks must meet AT LEAST ONE of the conditions below.'
  return `Stocks must meet ${ruleItems.value.length === 2 ? 'BOTH' : 'ALL'} conditions below.`
})
const screenSummary = computed(() => {
  if (!ruleItems.value.length) return 'No screening conditions are available.'
  const descriptions = props.row.conditions.length
    ? props.row.conditions.map((condition) => {
      const context = condition.date === 0 ? 'current' : `${dateLabel(condition.date).toLowerCase()}`
      const comparison = ['above', 'equal to', 'below'][condition.condition] ?? 'equal to'
      return `${context} ${signalLabels[condition.signal] ?? condition.signal} ${comparison} ${condition.value}`
    })
    : ruleItems.value.map((rule) => `${rule.context ? `${rule.context.toLowerCase()} ` : ''}${rule.text}`)
  const joiner = relationLabel.value === 'OR' ? ' or ' : ' and '
  return `Finds ${props.row.category === 'Custom' ? 'the selected stocks' : `${props.row.category} stocks`} with ${descriptions.join(joiner)}.`
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--app-overlay)] px-4 py-6" @click.self="emit('close')">
      <section class="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="screen-preview-title">
        <header class="flex items-start justify-between gap-4 border-b border-[var(--app-border-muted)] px-5 py-4">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--app-primary-soft)] text-[var(--app-primary)]"><Filter :size="21" /></span>
            <div><h2 id="screen-preview-title" class="text-xl font-extrabold">Screen Preview</h2><p class="mt-0.5 text-xs text-[var(--app-text-muted)]">Review your stock universe and screening conditions</p></div>
          </div>
          <button class="flex h-9 w-9 items-center justify-center rounded-md text-[var(--app-text-muted)] hover:bg-[var(--app-surface-soft)]" type="button" aria-label="Close screen preview" @click="emit('close')"><X :size="18" /></button>
        </header>

        <div class="overflow-y-auto px-5 py-5">
          <div class="flex items-start justify-between gap-3"><div><h3 class="text-xl font-extrabold">{{ row.name }}</h3><div class="mt-3 flex flex-wrap gap-2"><span class="preview-chip">{{ row.category }}</span><span class="preview-chip">{{ row.direction }}</span><span v-if="row.systemPattern" class="preview-chip">Common pattern</span></div></div><Star v-if="row.favorite" :size="20" class="mt-1 fill-[var(--app-favorite)] text-[var(--app-favorite)]" /></div>

          <section class="mt-5">
            <article class="info-card"><span class="info-icon"><Layers3 :size="17" /></span><div class="min-w-0 flex-1"><p>Stocks to Screen</p><strong class="universe-list" :class="{ 'universe-list--collapsed': canExpandUniverse && !universeExpanded }">{{ universeText }}</strong><small>{{ universeCaption }}</small><button v-if="canExpandUniverse" class="universe-toggle" type="button" :aria-expanded="universeExpanded" @click="universeExpanded = !universeExpanded">{{ universeExpanded ? 'Show less' : `Show all ${row.tickers.length} stocks` }}<ChevronUp v-if="universeExpanded" :size="13" /><ChevronDown v-else :size="13" /></button></div></article>
          </section>

          <section class="mt-5">
            <div class="flex items-center gap-2"><h3 class="text-base font-extrabold">Screening Conditions</h3><span class="condition-count">{{ conditionsLabel }}</span></div>
            <p class="mt-1 text-xs text-[var(--app-text-muted)]">{{ conditionsHint }}</p>
            <div class="mt-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
            <p v-if="!ruleItems.length" class="py-5 text-center text-sm text-[var(--app-text-muted)]">No condition information is available.</p>
            <template v-for="(rule, index) in ruleItems" :key="`${rule.text}-${index}`">
              <div v-if="index && relationLabel" class="rule-connector">
                <ArrowUp :size="14" class="text-[var(--app-text-muted)]" aria-hidden="true" />
                <span>{{ relationLabel }}</span>
                <ArrowDown :size="14" class="text-[var(--app-text-muted)]" aria-hidden="true" />
              </div>
              <article class="rule-node"><span class="rule-number">{{ index + 1 }}</span><div class="min-w-0"><span v-if="rule.context" class="rule-context">{{ rule.context }}</span><strong>{{ rule.text }}</strong></div></article>
            </template>
            </div>
          </section>

          <section class="screen-explanation"><h3>What this screen does</h3><p>{{ screenSummary }}</p></section>
        </div>

        <footer class="flex flex-wrap justify-end gap-3 border-t border-[var(--app-border-muted)] px-5 py-4">
          <button class="secondary-action" type="button" @click="emit('edit', row)"><Pencil :size="16" />Edit</button>
          <button class="primary-action" type="button" @click="emit('viewResults', row)">
            <Search :size="17" />View Screen
            <span class="app-tooltip primary-action-tooltip" data-tooltip="Runs this screen using the latest available data." aria-label="Runs this screen using the latest available data."><Info :size="14" aria-hidden="true" /></span>
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.preview-chip{border-radius:9999px;background:var(--app-surface-muted);padding:.375rem 1rem;color:var(--app-text-muted);font-size:.75rem;font-weight:800}.info-card{display:flex;min-width:0;align-items:flex-start;gap:.75rem;border:1px solid var(--app-border);border-radius:.5rem;background:var(--app-surface);padding:.875rem}.info-card p{font-size:.7rem;font-weight:700;color:var(--app-text-muted)}.info-card strong{display:block;margin-top:.2rem;font-size:.875rem;line-height:1.45}.info-card small{display:block;margin-top:.15rem;color:var(--app-text-muted);font-size:.7rem}.universe-list{overflow-wrap:anywhere}.universe-list--collapsed{max-height:2.9em;overflow:hidden}.universe-toggle{display:inline-flex;align-items:center;gap:.2rem;margin-top:.45rem;color:var(--app-primary);font-size:.7rem;font-weight:800}.universe-toggle:hover{text-decoration:underline}.info-icon{display:flex;height:2rem;width:2rem;flex:0 0 2rem;align-items:center;justify-content:center;border-radius:9999px;background:var(--app-primary-soft);color:var(--app-primary)}.condition-count{border-radius:9999px;background:var(--app-surface-muted);padding:.2rem .55rem;color:var(--app-text-muted);font-size:.6875rem;font-weight:800}.rule-node{display:flex;min-height:3rem;align-items:center;gap:.75rem;border:1px solid var(--app-border-strong);border-radius:9999px;background:var(--app-surface);padding:.55rem 1rem .55rem .55rem}.rule-node strong{display:block;min-width:0;font-size:.8125rem}.rule-context{display:block;margin-bottom:.1rem;color:var(--app-text-muted);font-size:.6875rem;font-weight:700}.rule-number{display:flex;height:2.25rem;width:2.25rem;flex:0 0 2.25rem;align-items:center;justify-content:center;border-radius:9999px;background:var(--app-primary-soft);color:var(--app-primary);font-weight:900}.rule-connector{display:flex;min-height:2.5rem;flex-direction:column;align-items:center;justify-content:center;gap:2px}.rule-connector span{border:1px solid var(--app-border-strong);border-radius:9999px;background:var(--app-primary-soft);padding:5px 14px;color:var(--app-primary);font-size:.6875rem;font-weight:900;letter-spacing:.04em;line-height:1}.screen-explanation{margin-top:1.25rem;border-left:3px solid var(--app-primary);border-radius:.25rem;background:var(--app-primary-soft);padding:.8rem 1rem}.screen-explanation h3{font-size:.8125rem;font-weight:900}.screen-explanation p{margin-top:.25rem;color:var(--app-text-secondary);font-size:.75rem;line-height:1.5}.secondary-action,.primary-action{display:inline-flex;height:2.75rem;align-items:center;justify-content:center;gap:.5rem;border-radius:.375rem;padding:0 1rem;font-size:.8125rem;font-weight:800}.secondary-action{border:1px solid var(--app-border);color:var(--app-text-secondary)}.secondary-action:hover{background:var(--app-surface-soft)}.primary-action{background:var(--app-primary);color:white}.primary-action:hover{background:var(--app-primary-hover)}.primary-action-tooltip{margin-left:.15rem;color:rgba(255,255,255,.78)}.primary-action-tooltip:hover{color:#fff}.primary-action-tooltip::before{right:0;left:auto;transform:translateY(4px)}.primary-action-tooltip::after{right:0;left:auto;transform:translateY(4px)}.primary-action-tooltip:hover::before,.primary-action-tooltip:hover::after{transform:translateY(0)}
</style>

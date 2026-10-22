<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, Filter, Layers3, Pencil, Star, X } from '@lucide/vue'
import type { MyScreenRow } from '@/entities/my-stuff/model/my-screen.types'

const props = defineProps<{ row: MyScreenRow }>()
const emit = defineEmits<{ close: []; edit: [row: MyScreenRow]; viewResults: [row: MyScreenRow] }>()

const relationLabel = computed(() => props.row.relation === 2 ? 'OR' : props.row.relation === 1 ? 'AND' : '')
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
const universeText = computed(() => props.row.category === 'Custom'
  ? (props.row.tickers.join(', ') || 'No symbols saved')
  : `All symbols in ${props.row.category}`)
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--app-overlay)] px-4 py-6" @click.self="emit('close')">
      <section class="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="screen-preview-title">
        <header class="flex items-start justify-between gap-4 border-b border-[var(--app-border-muted)] px-5 py-4">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--app-primary-soft)] text-[var(--app-primary)]"><Filter :size="21" /></span>
            <div><h2 id="screen-preview-title" class="text-xl font-extrabold">Screen Preview</h2><p class="mt-0.5 text-xs text-[var(--app-text-muted)]">Universe and screening rule overview</p></div>
          </div>
          <button class="flex h-9 w-9 items-center justify-center rounded-md text-[var(--app-text-muted)] hover:bg-[var(--app-surface-soft)]" type="button" aria-label="Close screen preview" @click="emit('close')"><X :size="18" /></button>
        </header>

        <div class="overflow-y-auto px-5 py-5">
          <div class="flex items-start justify-between gap-3"><div><h3 class="text-xl font-extrabold">{{ row.name }}</h3><div class="mt-3 flex flex-wrap gap-2"><span class="preview-chip">{{ row.category }}</span><span class="preview-chip">{{ row.direction }}</span><span v-if="row.systemPattern" class="preview-chip">Common pattern</span></div></div><Star v-if="row.favorite" :size="20" class="mt-1 fill-[var(--app-favorite)] text-[var(--app-favorite)]" /></div>

          <section class="mt-5">
            <article class="info-card"><span class="info-icon"><Layers3 :size="17" /></span><div><p>Universe</p><strong>{{ universeText }}</strong></div></article>
          </section>

          <section class="mt-5"><h3 class="text-base font-extrabold">Screen Rules</h3><div class="mt-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
            <p v-if="!rules.length" class="py-5 text-center text-sm text-[var(--app-text-muted)]">No rule information is available.</p>
            <template v-for="(rule, index) in rules" :key="`${rule}-${index}`">
              <div v-if="index && relationLabel" class="rule-connector"><span>{{ relationLabel }}</span></div>
              <article class="rule-node"><span class="rule-number">{{ index + 1 }}</span><strong>{{ rule }}</strong></article>
            </template>
          </div></section>
        </div>

        <footer class="flex flex-wrap justify-end gap-3 border-t border-[var(--app-border-muted)] px-5 py-4">
          <button class="secondary-action" type="button" @click="emit('edit', row)"><Pencil :size="16" />Edit</button>
          <button class="primary-action" type="button" @click="emit('viewResults', row)">View Results<ArrowRight :size="17" /></button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.preview-chip{border-radius:9999px;background:var(--app-surface-muted);padding:.375rem 1rem;color:var(--app-text-muted);font-size:.75rem;font-weight:800}.info-card{display:flex;min-width:0;align-items:center;gap:.75rem;border:1px solid var(--app-border);border-radius:.5rem;background:var(--app-surface);padding:.875rem}.info-card p{font-size:.7rem;font-weight:700;color:var(--app-text-muted)}.info-card strong{display:block;margin-top:.2rem;overflow:hidden;font-size:.8125rem;text-overflow:ellipsis}.info-icon{display:flex;height:2rem;width:2rem;flex:0 0 2rem;align-items:center;justify-content:center;border-radius:9999px;background:var(--app-primary-soft);color:var(--app-primary)}.rule-node{display:flex;min-height:3rem;align-items:center;gap:.75rem;border:1px solid var(--app-border-strong);border-radius:9999px;background:var(--app-surface);padding:.35rem 1rem .35rem .35rem}.rule-node strong{min-width:0;font-size:.8125rem}.rule-number{display:flex;height:2.25rem;width:2.25rem;flex:0 0 2.25rem;align-items:center;justify-content:center;border-radius:9999px;background:var(--app-primary-soft);color:var(--app-primary);font-weight:900}.rule-connector{display:flex;height:2.25rem;align-items:center;justify-content:center}.rule-connector span{border:1px solid var(--app-border-strong);border-radius:9999px;background:var(--app-primary-soft);padding:.25rem .75rem;color:var(--app-primary);font-size:.6875rem;font-weight:900}.secondary-action,.primary-action{display:inline-flex;height:2.75rem;align-items:center;justify-content:center;gap:.5rem;border-radius:.375rem;padding:0 1rem;font-size:.8125rem;font-weight:800}.secondary-action{border:1px solid var(--app-border);color:var(--app-text-secondary)}.secondary-action:hover{background:var(--app-surface-soft)}.primary-action{background:var(--app-primary);color:white}.primary-action:hover{background:var(--app-primary-hover)}
</style>

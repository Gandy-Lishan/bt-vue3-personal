<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, ArrowUp, Database, Info, Network, SlidersHorizontal, X } from '@lucide/vue'
import type { MyIndicatorComponent, MyIndicatorRow } from '@/entities/my-stuff/api/user-indicator.api'

const props = defineProps<{ row: MyIndicatorRow }>()
const emit = defineEmits<{ close: []; edit: [] }>()
function relationText(value: string) {
  if (value === '−') return '−'
  if (value === '÷') return '÷'
  if (value === '+') return '＋'
  return value === 'Weighted sum' ? '＋' : value
}
function relationName(value: string) {
  if (value === '−') return 'Minus'
  if (value === '÷') return 'Divide'
  if (value === '+' || value === 'Weighted sum') return 'Plus'
  return value || 'Combine'
}
function componentLabel(item: MyIndicatorComponent, index: number) { return `${item.kind === 'Symbol' ? 'Symbol' : 'Indicator'} ${String.fromCharCode(65 + index)}` }
function structureMeta(item: MyIndicatorComponent) {
  const shift = item.transform.match(/Shift\s+(\d+)/i)?.[1]
  const period = item.transform.match(/(?:Moving Average|Rate of Change)\s+(\d+)/i)?.[1]
  const calculation = item.transform
    .replace(/\s*·?\s*Shift\s+\d+/i, '')
    .replace(/(Moving Average|Rate of Change)\s+\d+/i, '$1')
    .trim() || (item.weight ? 'Weighted input' : item.kind === 'Symbol' ? 'Close' : 'Indicator Value')
  return { calculation, period, shift: shift ?? '0' }
}
const firstName = computed(() => props.row.included[0]?.name || 'the first input')
const secondName = computed(() => props.row.included[1]?.name || 'the second input')
const reading = computed(() => {
  if (props.row.relationship === '−') return [
    { positive: true, label: 'Positive value', text: `${firstName.value} is higher than ${secondName.value}` },
    { positive: false, label: 'Negative value', text: `${secondName.value} is higher than ${firstName.value}` },
  ]
  if (props.row.relationship === '÷') return [
    { positive: true, label: 'Above 1', text: `${firstName.value} is higher than ${secondName.value}` },
    { positive: false, label: 'Below 1', text: `${secondName.value} is higher than ${firstName.value}` },
  ]
  if (props.row.relationship === '+' || props.row.relationship === 'Weighted sum') return [
    { positive: true, label: 'Positive value', text: 'The combined inputs have a positive net value' },
    { positive: false, label: 'Negative value', text: 'The combined inputs have a negative net value' },
  ]
  return [{ positive: true, label: 'Result', text: `Read the resulting values as ${props.row.name}` }]
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--app-overlay)] px-4 py-6" @click.self="emit('close')">
      <section class="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="indicator-preview-title">
        <header class="flex items-start justify-between gap-4 border-b border-[var(--app-border-muted)] px-5 py-3">
          <div class="flex items-center gap-3"><span class="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--app-primary-soft)] text-[var(--app-primary)]"><SlidersHorizontal :size="19" /></span><div><h2 id="indicator-preview-title" class="text-lg font-extrabold">Indicator Structure Preview</h2><p class="mt-0.5 text-xs text-[var(--app-text-muted)]">How this custom indicator is constructed</p></div></div>
          <button class="flex h-8 w-8 items-center justify-center rounded-md text-[var(--app-text-muted)] hover:bg-[var(--app-surface-soft)]" type="button" aria-label="Close indicator preview" @click="emit('close')"><X :size="17" /></button>
        </header>
        <div class="overflow-y-auto px-5 py-4">
          <div class="flex flex-wrap items-center gap-2"><h3 class="text-lg font-extrabold">{{ row.name }}</h3></div>
          <div class="mt-2 flex flex-wrap gap-2"><span class="preview-chip">{{ row.category }}</span><span class="preview-chip">{{ row.timeframe }}</span></div>
          <section class="mt-4"><h3 class="text-base font-extrabold">Formula Structure</h3>
            <div class="formula-structure">
              <article class="result-node"><span class="structure-icon"><Network :size="15" /></span><div><strong>Result</strong><small>{{ row.name }}</small></div></article>
              <div v-if="row.included.length" class="tree-body">
                <template v-for="(item, index) in row.included" :key="`${item.url}-${index}`">
                  <article class="tree-entry component-node">
                    <span class="structure-icon"><Database :size="15" /></span>
                    <div class="component-content">
                      <strong>{{ componentLabel(item, index) }}: {{ item.name }}</strong>
                      <div class="component-fields">
                        <span class="calculation-field">{{ structureMeta(item).calculation }}</span>
                        <span v-if="structureMeta(item).period" class="detail-field"><small>Period</small>{{ structureMeta(item).period }}</span>
                        <span v-if="structureMeta(item).shift !== '0'" class="detail-field"><small>Shift</small>{{ structureMeta(item).shift }}</span>
                        <span v-if="item.weight" class="detail-field"><small>Weight</small>{{ item.weight }}</span>
                      </div>
                    </div>
                  </article>
                  <div v-if="index < row.included.length - 1" class="tree-entry operator-node"><span>{{ relationText(row.relationship) }}</span><strong>Operator: {{ relationName(row.relationship) }}</strong></div>
                </template>
              </div>
              <p v-else class="py-8 text-center text-sm text-[var(--app-text-muted)]">No component information is available.</p>
            </div>
          </section>
          <section class="reading-card">
            <div class="reading-title"><Info :size="16" /><h3>How to read the result</h3></div>
            <div class="reading-lines">
              <div v-for="item in reading" :key="item.label" class="reading-line">
                <span class="reading-icon"><ArrowUp v-if="item.positive" :size="16" /><ArrowDown v-else :size="16" /></span>
                <span class="reading-copy"><strong>{{ item.label }}</strong>—{{ item.text }}</span>
              </div>
            </div>
          </section>
        </div>
        <footer class="flex justify-end border-t border-[var(--app-border-muted)] px-5 py-3"><button class="h-9 rounded-md bg-[var(--app-primary)] px-5 text-sm font-extrabold text-white hover:bg-[var(--app-primary-hover)]" type="button" @click="emit('edit')">Edit</button></footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.preview-chip { border-radius: 9999px; background: var(--app-surface-muted); padding: 4px 12px; color: var(--app-text-muted); font-size: .7rem; font-weight: 800; }
.formula-structure { margin-top: 8px; border: 1px solid var(--app-border); border-radius: 9px; background: var(--app-surface-soft); padding: 10px; }
.result-node,.component-node { display: flex; align-items: center; gap: 10px; border: 1px solid var(--app-border-strong); border-radius: 8px; background: var(--app-surface); padding: 7px 10px; }
.result-node strong,.result-node small { display: block; }.result-node strong { font-size: .74rem; }.result-node small { margin-top: 1px; color: var(--app-text-secondary); font-size: .68rem; }
.structure-icon { display: inline-flex; width: 24px; height: 24px; flex: 0 0 24px; align-items: center; justify-content: center; border-radius: 9999px; background: var(--app-primary-soft); color: var(--app-primary); }
.tree-body { position: relative; display: grid; gap: 6px; margin: 0 0 0 12px; padding: 10px 0 0 44px; }
.tree-body::before { position: absolute; top: 0; bottom: 20px; left: 14px; width: 1px; background: var(--app-border-strong); content: ''; }
.tree-entry { position: relative; }.tree-entry::before { position: absolute; top: 50%; right: 100%; width: 29px; height: 1px; background: var(--app-border-strong); content: ''; }
.component-content { min-width: 0; flex: 1; }.component-content > strong { display: block; overflow: hidden; font-size: .72rem; text-overflow: ellipsis; white-space: nowrap; }
.component-fields { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }.calculation-field,.detail-field { min-height: 24px; border-radius: 5px; background: var(--app-surface-muted); padding: 4px 8px; color: var(--app-text-secondary); font-size: .66rem; }.calculation-field { min-width: 140px; flex: 1; }.detail-field { display: grid; min-width: 60px; padding-top: 2px; color: var(--app-text); }.detail-field small { color: var(--app-text-muted); font-size: .56rem; line-height: 1; }
.operator-node { display: flex; min-height: 30px; align-items: center; gap: 10px; }.operator-node > span { display: inline-flex; width: 28px; height: 28px; align-items: center; justify-content: center; border: 1px solid color-mix(in srgb, var(--app-primary) 30%, var(--app-border)); border-radius: 7px; background: var(--app-primary-soft); color: var(--app-primary); font-size: 13px; font-weight: 900; }.operator-node strong { font-size: .68rem; }
.reading-card { margin-top: 14px; border: 1px solid color-mix(in srgb, var(--app-primary) 22%, var(--app-border)); border-radius: 8px; background: color-mix(in srgb, var(--app-primary-soft) 58%, var(--app-surface)); padding: 10px 14px; }
.reading-title { display: flex; align-items: center; gap: 10px; color: var(--app-primary); }
.reading-title h3 { color: var(--app-text); font-size: .8125rem; font-weight: 900; }
.reading-lines { margin-top: 8px; display: grid; gap: 6px; }
.reading-line { display: grid; grid-template-columns: 24px minmax(0, 1fr); align-items: center; column-gap: 8px; color: var(--app-text-secondary); font-size: .75rem; }
.reading-copy strong { color: var(--app-text); }
.reading-icon { display: inline-flex; width: 24px; height: 24px; align-items: center; justify-content: center; border-radius: 9999px; background: var(--app-primary-soft); color: var(--app-primary); }
@media (max-width: 560px) { .formula-structure { padding: 10px; }.tree-body { margin-left: 9px; padding-left: 34px; }.tree-entry::before { width: 20px; }.component-fields { display: grid; }.calculation-field { min-width: 0; }.component-content > strong { white-space: normal; } }
</style>

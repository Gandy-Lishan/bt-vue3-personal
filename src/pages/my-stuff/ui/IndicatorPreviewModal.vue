<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, ArrowUp, Info, SlidersHorizontal, X } from '@lucide/vue'
import type { MyIndicatorRow } from '@/entities/my-stuff/api/user-indicator.api'

const props = defineProps<{ row: MyIndicatorRow }>()
const emit = defineEmits<{ close: [] }>()
function relationText(value: string) {
  if (value === '−') return '−'
  if (value === '÷') return '÷'
  if (value === '+') return '＋'
  return value === 'Weighted sum' ? '＋' : value
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
        <header class="flex items-start justify-between gap-4 border-b border-[var(--app-border-muted)] px-5 py-4">
          <div class="flex items-center gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--app-primary-soft)] text-[var(--app-primary)]"><SlidersHorizontal :size="22" /></span><div><h2 id="indicator-preview-title" class="text-2xl font-extrabold">Indicator Preview</h2><p class="mt-0.5 text-xs text-[var(--app-text-muted)]">How this custom indicator is constructed</p></div></div>
          <button class="flex h-9 w-9 items-center justify-center rounded-md text-[var(--app-text-muted)] hover:bg-[var(--app-surface-soft)]" type="button" aria-label="Close indicator preview" @click="emit('close')"><X :size="19" /></button>
        </header>
        <div class="overflow-y-auto px-5 py-5">
          <h3 class="text-xl font-extrabold">{{ row.name }}</h3>
          <div class="mt-3 flex flex-wrap gap-2"><span class="preview-chip">{{ row.category }}</span><span class="preview-chip">{{ row.timeframe }}</span></div>
          <section class="mt-5"><h3 class="text-lg font-extrabold">Indicator Relationship</h3>
            <div class="mt-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-5">
              <div class="mx-auto max-w-xl">
                <template v-for="(item, index) in row.included" :key="`${item.url}-${index}`">
                  <div v-if="index" class="relation-connector"><span>{{ relationText(row.relationship) }}</span></div>
                  <article class="rounded-full border border-[var(--app-border-strong)] bg-[var(--app-surface)] px-5 py-3 shadow-sm">
                    <div class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center"><span class="text-sm text-[var(--app-text)]">{{ item.name }}</span><span v-if="item.transform" class="text-xs text-[var(--app-text-muted)]">{{ item.transform }}</span><span v-if="item.weight" class="rounded-full bg-[var(--app-primary-soft)] px-2 py-1 text-xs font-extrabold text-[var(--app-primary)]">Weight {{ item.weight }}</span></div>
                  </article>
                </template>
                <p v-if="!row.included.length" class="py-8 text-center text-sm text-[var(--app-text-muted)]">No component information is available.</p>
                <div v-if="row.included.length" class="result-flow"><div class="result-arrow" aria-hidden="true"><svg viewBox="0 0 18 28"><path d="M9 1v23M4 19l5 5 5-5" /></svg></div><span>{{ row.name }}</span></div>
              </div>
            </div>
          </section>
          <section class="reading-card">
            <div class="reading-title"><Info :size="19" /><h3>How to read the result</h3></div>
            <div class="reading-lines">
              <div v-for="item in reading" :key="item.label" class="reading-line">
                <span class="reading-icon"><ArrowUp v-if="item.positive" :size="16" /><ArrowDown v-else :size="16" /></span>
                <span class="reading-copy"><strong>{{ item.label }}</strong>—{{ item.text }}</span>
              </div>
            </div>
          </section>
        </div>
        <footer class="flex justify-end border-t border-[var(--app-border-muted)] px-5 py-4"><button class="h-10 rounded-md bg-[var(--app-primary)] px-5 text-sm font-extrabold text-white hover:bg-[var(--app-primary-hover)]" type="button" @click="emit('close')">Close</button></footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.preview-chip { border-radius: 9999px; background: var(--app-surface-muted); padding: 6px 14px; color: var(--app-text-muted); font-size: .75rem; font-weight: 800; }
.relation-connector { display: flex; height: 46px; align-items: center; justify-content: center; }
.relation-connector span { display: inline-flex; width: 28px; height: 28px; align-items: center; justify-content: center; border: 1px solid color-mix(in srgb, var(--app-primary) 30%, var(--app-border)); border-radius: 9999px; background: var(--app-primary-soft); color: var(--app-primary); font-size: 15px; font-weight: 900; line-height: 1; }
.result-flow { display: flex; flex-direction: column; align-items: center; gap: 7px; padding-top: 10px; color: var(--app-primary); }
.result-arrow { display: flex; height: 28px; flex-direction: column; align-items: center; justify-content: flex-end; color: var(--app-text-muted); }
.result-arrow svg { width: 18px; height: 28px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.result-flow > span { width: 100%; border: 1px solid var(--app-primary); border-radius: 9999px; background: var(--app-primary-soft); padding: 11px 18px; color: var(--app-text); font-size: .875rem; font-weight: 800; text-align: center; }
.reading-card { margin-top: 20px; border: 1px solid color-mix(in srgb, var(--app-primary) 22%, var(--app-border)); border-radius: 8px; background: color-mix(in srgb, var(--app-primary-soft) 58%, var(--app-surface)); padding: 14px 16px; }
.reading-title { display: flex; align-items: center; gap: 10px; color: var(--app-primary); }
.reading-title h3 { color: var(--app-text); font-size: .875rem; font-weight: 900; }
.reading-lines { margin-top: 10px; display: grid; gap: 8px; }
.reading-line { display: grid; grid-template-columns: 24px minmax(0, 1fr); align-items: center; column-gap: 8px; color: var(--app-text-secondary); font-size: .8125rem; }
.reading-copy strong { color: var(--app-text); }
.reading-icon { display: inline-flex; width: 24px; height: 24px; align-items: center; justify-content: center; border-radius: 9999px; background: var(--app-primary-soft); color: var(--app-primary); }
</style>

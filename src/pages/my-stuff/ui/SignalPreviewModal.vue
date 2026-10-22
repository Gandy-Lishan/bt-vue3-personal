<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, ArrowRight, ArrowUp, BarChart3, Clock3, Copy, Layers3, LockKeyhole, Pencil, UserRound, X } from '@lucide/vue'
import type { MySignalRow } from '@/entities/my-stuff/model/my-signal.types'

const props = defineProps<{ row: MySignalRow; library: boolean; busy?: boolean }>()
const emit = defineEmits<{ close: []; view: [row: MySignalRow]; copy: [row: MySignalRow] }>()

function numeric(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const relation = computed(() => numeric(props.row.raw.relation, 1))
const relationLabel = computed(() => {
  if (relation.value === 2) return 'SameBar Multi-Condition'
  if (relation.value === 3) return 'TimeOrder Multi-Condition'
  if (relation.value === 0) return 'Risk Control Only'
  return 'Single-Condition'
})
const sourceLabel = computed(() => props.library ? 'SentimentTrader' : 'My Signal')
const sequenceBars = computed(() => numeric(props.row.raw.signals_in_market, 0))
/** Time window for TimeOrder signals, stated as `Period: N` in the description. */
const periodBars = computed(() => {
  const match = props.row.description.match(/period\s*:\s*(\d+)/i)
  return match ? Number(match[1]) : sequenceBars.value
})
const connectorLabel = computed(() => {
  if (relation.value === 3) return 'THEN'
  if (relation.value === 2) {
    const score = numeric(props.row.raw.score, conditions.value.length)
    if (score <= 1) return 'OR'
    if (score >= conditions.value.length) return 'AND'
    return `ANY ${score} OF ${conditions.value.length}`
  }
  return 'OR'
})
const conditions = computed(() => {
  const metadataPattern = /^(samebar|timeorder|single)(?:[ -]?multi)?[ -]?condition|^score\s*:|^period\s*:/i
  const descriptions = props.row.description
    .split(/\s*[·•]\s*|\s*;\s*(?=[A-Za-z%])/)
    .map((value) => value.trim())
    .filter((value) => value && !metadataPattern.test(value))
  return (descriptions.length ? descriptions : [props.row.description]).map((label) => {
    // Greedy prefix so operators inside metric names like "(% > 10 Day Avg)" are not
    // mistaken for the comparison itself; the last operator token wins.
    const match = label.match(/^(.+)\s+(CrossAbove|CrossBelow|Above|Below|>=|<=|>|<|=)\s+(.+)$/i)
    return { label, parts: match ? [match[1].trim(), match[2].trim(), match[3].trim()] : [label] }
  })
})
const score = computed(() => numeric(props.row.raw.score, conditions.value.length))
const sameBarTitle = computed(() => {
  if (score.value <= 1) return `Same-bar rule · Any 1 of ${conditions.value.length}`
  if (score.value >= conditions.value.length) return `Same-bar rule · All ${conditions.value.length}`
  return `Same-bar rule · Any ${score.value} of ${conditions.value.length}`
})
const sameBarDescription = computed(() => {
  const timeframe = props.row.timeframe.toLowerCase()
  if (score.value <= 1) return `A signal triggers when at least 1 of the ${conditions.value.length} conditions is true on the same ${timeframe} bar.`
  return `A signal triggers when at least ${score.value} of the ${conditions.value.length} conditions are true on the same ${timeframe} bar.`
})
const sameBarCompletionLabel = computed(() => score.value < conditions.value.length ? `${score.value}+ conditions met` : `${score.value} conditions met`)
const formattedReturn = computed(() => {
  const value = props.row.currentReturn
  return value === null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--app-overlay)] px-4 py-6" @click.self="emit('close')">
      <section class="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="signal-preview-title">
        <header class="flex items-start justify-between gap-4 border-b border-[var(--app-border-muted)] px-5 py-4">
          <div class="flex min-w-0 items-start gap-3">
            <span class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--app-primary-soft)] text-[var(--app-primary)]"><BarChart3 :size="23" /></span>
            <div><h2 id="signal-preview-title" class="text-2xl font-extrabold">Signal Preview</h2></div>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-[var(--app-surface-muted)] px-3 py-1.5 text-xs font-extrabold text-[var(--app-text-muted)]"><LockKeyhole v-if="library" :size="14" /><UserRound v-else :size="14" />{{ sourceLabel }}</span>
            <span class="rounded-full bg-[var(--app-surface-muted)] px-3 py-1.5 text-xs font-extrabold text-[var(--app-text-muted)]">{{ library ? 'Read-only' : 'Editable' }}</span>
            <button class="flex h-9 w-9 items-center justify-center rounded-md text-[var(--app-text-muted)] hover:bg-[var(--app-surface-soft)]" type="button" aria-label="Close signal preview" @click="emit('close')"><X :size="19" /></button>
          </div>
        </header>

        <div class="overflow-y-auto px-5 py-5">
          <h3 class="text-xl font-extrabold leading-tight text-[var(--app-text)]">{{ row.name }}</h3>
          <div class="flex flex-wrap items-center gap-2">
            <span class="preview-chip mt-3">{{ row.symbol }}</span><span class="preview-chip mt-3">{{ row.timeframe }}</span><span class="preview-chip mt-3">{{ relationLabel }}</span><span v-if="library && row.category" class="preview-chip mt-3">{{ row.category }}</span>
          </div>

          <section v-if="relation === 2 || relation === 3" class="mt-4 flex items-start gap-3 rounded-lg border border-[var(--app-primary)] bg-[var(--app-primary-soft)] p-4">
            <Layers3 v-if="relation === 2" :size="25" class="mt-0.5 shrink-0 text-[var(--app-primary)]" />
            <Clock3 v-else :size="25" class="mt-0.5 shrink-0 text-[var(--app-primary)]" />
            <div v-if="relation === 2">
              <h4 class="font-extrabold">{{ sameBarTitle }}</h4>
              <p class="mt-1 text-sm leading-5 text-[var(--app-text-secondary)]">{{ sameBarDescription }}</p>
              <p class="mt-1 text-xs leading-5 text-[var(--app-text-muted)]">The conditions can be met in any combination; order does not matter.</p>
            </div>
            <div v-else>
              <h4 class="font-extrabold">{{ periodBars > 0 && periodBars < 100000 ? `Sequence window · ${periodBars} ${row.timeframe.toLowerCase()} bars` : 'Sequence window · No time limit' }}</h4>
              <p class="mt-1 text-sm leading-5 text-[var(--app-text-secondary)]">All {{ conditions.length }} conditions must occur in the order shown{{ periodBars > 0 && periodBars < 100000 ? ` within one ${periodBars}-bar window` : '' }}.</p>
              <p class="mt-1 text-xs leading-5 text-[var(--app-text-muted)]">The window starts when Condition 1 is met and ends when the final condition is met.</p>
            </div>
          </section>

          <section class="mt-5">
            <h3 class="text-lg font-extrabold">Trigger Condition</h3>
            <div class="relative mt-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4 sm:p-5" :class="(relation === 2 || relation === 3) && 'pt-14 sm:pt-14'">
              <span v-if="relation === 3" class="sequence-window-badge">{{ periodBars > 0 && periodBars < 100000 ? `Entire sequence ≤ ${periodBars} bars` : 'Entire sequence · No time limit' }}</span>
              <span v-else-if="relation === 2" class="sequence-window-badge">{{ score }} of {{ conditions.length }} required</span>
              <div class="mx-auto max-w-2xl" :class="(relation === 2 || relation === 3) && 'sequence-window-layout'">
                <div v-if="relation === 2 || relation === 3" class="shared-window-rail" :aria-label="relation === 3 ? 'One shared window' : `Same ${row.timeframe.toLowerCase()} bar`">
                  <span class="shared-window-dot shared-window-dot--top" />
                  <span class="shared-window-label">{{ relation === 3 ? 'One shared window' : `Same ${row.timeframe.toLowerCase()} bar` }}</span>
                  <span class="shared-window-dot shared-window-dot--bottom" />
                </div>
                <div class="min-w-0">
              <template v-for="(condition, conditionIndex) in conditions" :key="`${condition.label}-${conditionIndex}`">
                <div v-if="conditionIndex" class="sequence-connector">
                  <ArrowUp v-if="relation !== 3" :size="14" class="text-[var(--app-text-muted)]" aria-hidden="true" />
                  <svg v-else class="sequence-connector-line text-[var(--app-text-muted)]" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="4" x2="12" y2="20" /></svg>
                  <span class="sequence-connector-label">{{ connectorLabel }}</span>
                  <ArrowDown :size="14" class="text-[var(--app-text-muted)]" aria-hidden="true" />
                </div>
                <article class="flex min-h-[54px] min-w-0 items-center gap-3 rounded-full border border-[var(--app-border-strong)] bg-[var(--app-surface)] py-1.5 pl-1.5 pr-5 shadow-sm">
                  <div class="sequence-number">{{ conditionIndex + 1 }}</div>
                  <div class="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-3 gap-y-1 px-2 text-center text-sm">
                    <template v-if="condition.parts.length === 3">
                      <strong class="font-extrabold text-[var(--app-text)]">{{ condition.parts[0] }}</strong>
                      <span class="font-black text-[var(--app-primary)]">{{ condition.parts[1] }}</span>
                      <strong class="font-extrabold text-[var(--app-text)]">{{ condition.parts[2] }}</strong>
                    </template>
                    <strong v-else class="font-extrabold text-[var(--app-text)]">{{ condition.label }}</strong>
                  </div>
                </article>
              </template>
                </div>
              </div>
              <div v-if="relation === 2 || relation === 3" class="trigger-flow ml-[60px]">
                <div class="trigger-flow-result">
                  <span>{{ relation === 3 ? 'Sequence complete' : sameBarCompletionLabel }}</span>
                  <ArrowRight :size="18" class="shrink-0" aria-hidden="true" />
                  <span>Signal triggered</span>
                </div>
              </div>
              <div v-else>
                <div class="mx-auto h-5 w-px bg-[var(--app-primary)]" />
                <div class="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-3 text-center text-sm font-extrabold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">Signal Triggered</div>
              </div>
            </div>
          </section>

          <section class="mt-5">
            <h3 class="text-lg font-extrabold">Last Signal</h3>
            <div class="mt-2 grid divide-y divide-[var(--app-border)] rounded-lg border border-[var(--app-border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div class="p-4"><p class="text-xs font-bold text-[var(--app-text-muted)]">Last Signal Date</p><p class="mt-2 text-lg font-extrabold">{{ row.lastSignalDate || '—' }}</p><p class="mt-1 text-xs text-[var(--app-text-muted)]">{{ row.lastSignalDate ? 'Most recent trigger.' : 'No metric available.' }}</p></div>
              <div class="p-4"><p class="text-xs font-bold text-[var(--app-text-muted)]">Bars Since Signal</p><p class="mt-2 text-lg font-extrabold">{{ row.barsSinceSignal ?? '—' }}</p><p class="mt-1 text-xs text-[var(--app-text-muted)]">{{ row.barsSinceSignal === null ? 'No metric available.' : `Based on ${row.timeframe.toLowerCase()} bars.` }}</p></div>
              <div class="p-4"><p class="text-xs font-bold text-[var(--app-text-muted)]">Return Since Signal</p><p class="mt-2 text-lg font-extrabold" :class="(row.currentReturn ?? 0) > 0 ? 'text-[var(--app-positive)]' : (row.currentReturn ?? 0) < 0 ? 'text-[var(--app-negative)]' : ''">{{ formattedReturn }}</p><p class="mt-1 text-xs text-[var(--app-text-muted)]">{{ row.currentReturn === null ? 'No metric available.' : 'From trigger to latest close.' }}</p></div>
            </div>
          </section>
        </div>

        <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--app-border-muted)] px-5 py-4">
          <p class="min-w-0 flex-1 text-xs text-[var(--app-text-muted)]">{{ library ? 'Use as My Signal creates an editable copy of this system signal in your list.' : 'Duplicating creates a separate editable copy in My Signals.' }}</p>
          <div v-if="library" class="flex shrink-0 items-center gap-3">
            <button class="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--app-primary)] px-4 text-sm font-extrabold text-white hover:bg-[var(--app-primary-hover)] disabled:opacity-50" type="button" :disabled="busy" @click="emit('copy', row)"><Copy :size="17" />Use as My Signal</button>
          </div>
          <div v-else class="flex shrink-0 items-center gap-3">
            <button class="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-bold text-[var(--app-text-muted)] transition hover:text-[var(--app-text)] disabled:opacity-50" type="button" :disabled="busy" @click="emit('copy', row)"><Copy :size="14" />Duplicate Signal</button>
            <button class="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--app-primary)] px-4 text-sm font-extrabold text-white hover:bg-[var(--app-primary-hover)]" type="button" @click="emit('view', row)"><Pencil :size="17" />Edit Signal</button>
          </div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.preview-chip { border-radius: 9999px; background: var(--app-surface-muted); padding: 6px 16px; color: var(--app-text-muted); font-size: 0.75rem; font-weight: 800; }
.sequence-number { display: flex; width: 40px; height: 40px; flex: 0 0 40px; align-items: center; justify-content: center; border-radius: 9999px; background: var(--app-primary-soft); color: var(--app-primary); font-weight: 900; }
.sequence-connector { display: flex; flex-direction: column; gap: 2px; min-height: 40px; align-items: center; justify-content: center; }
.sequence-connector-line { width: 14px; height: 14px; flex: 0 0 14px; }
.sequence-connector-label { border: 1px solid var(--app-border-strong); border-radius: 9999px; background: var(--app-primary-soft); padding: 5px 14px; color: var(--app-primary); font-size: 0.6875rem; font-weight: 900; letter-spacing: .04em; }
.sequence-window-badge { position: absolute; top: 16px; right: 16px; border: 1px solid var(--app-primary); border-radius: 9999px; background: var(--app-primary-soft); padding: 5px 12px; color: var(--app-primary); font-size: 0.6875rem; font-weight: 900; }
.sequence-window-layout { display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: 12px; }
.shared-window-rail { position: relative; display: flex; min-height: 100%; align-items: center; justify-content: center; color: var(--app-primary); }
.shared-window-rail::before { position: absolute; top: 6px; bottom: 6px; left: 50%; width: 2px; content: ''; background: currentColor; transform: translateX(-50%); }
.shared-window-dot { position: absolute; left: 50%; z-index: 1; width: 10px; height: 10px; border: 2px solid var(--app-surface-soft); border-radius: 9999px; background: currentColor; transform: translateX(-50%); box-shadow: 0 0 0 1px currentColor; }
.shared-window-dot--top { top: 2px; }
.shared-window-dot--bottom { bottom: 2px; }
.shared-window-label { position: absolute; right: calc(50% + 9px); z-index: 1; font-size: 0.6875rem; font-weight: 900; letter-spacing: .04em; line-height: 1; white-space: nowrap; writing-mode: vertical-rl; transform: rotate(180deg); }
.trigger-flow { padding-top: 16px; }
.trigger-flow-result { display: flex; width: 100%; align-items: center; justify-content: center; gap: 10px; border: 1px solid rgb(110 231 183); border-radius: 9999px; background: rgb(236 253 245); padding: 12px 16px; color: rgb(4 120 87); font-size: 0.875rem; font-weight: 900; text-align: center; }
:global(.dark) .trigger-flow-result { background: rgb(2 44 34 / .3); color: rgb(110 231 183); }
</style>

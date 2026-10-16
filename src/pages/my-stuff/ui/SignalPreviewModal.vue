<script setup lang="ts">
import { computed } from 'vue'
import { BarChart3, Clock3, Copy, Info, LockKeyhole, Pencil, UserRound, X } from '@lucide/vue'
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
const connectorLabel = computed(() => {
  if (relation.value === 3) return sequenceBars.value > 0 && sequenceBars.value < 100000 ? `THEN · within ${sequenceBars.value} bars` : 'THEN · no time limit'
  if (relation.value === 2) {
    const score = numeric(props.row.raw.score, conditions.value.length)
    if (score <= 1) return 'OR'
    if (score >= conditions.value.length) return 'AND'
    return `ANY ${score} OF ${conditions.value.length}`
  }
  return 'OR'
})
const conditions = computed(() => {
  const metadataPattern = /^(samebar|timeorder|single)(?:[ -]?multi)?[ -]?condition|^score\s*:/i
  const descriptions = props.row.description
    .split(/\s*[·•]\s*|\s*;\s*(?=[A-Za-z%])/)
    .map((value) => value.trim())
    .filter((value) => value && !metadataPattern.test(value))
  return (descriptions.length ? descriptions : [props.row.description]).map((label) => {
    const match = label.match(/^(.*?)\s+(CrossAbove|CrossBelow|Above|Below|>=|<=|>|<|=)\s+(.+)$/i)
    return { label, parts: match ? [match[1].trim(), match[2].trim(), match[3].trim()] : [label] }
  })
})
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
            <span class="inline-flex items-center gap-1.5 rounded-full bg-[var(--app-primary-soft)] px-3 py-1.5 text-xs font-extrabold text-[var(--app-primary)]"><LockKeyhole v-if="library" :size="14" /><UserRound v-else :size="14" />{{ sourceLabel }}</span>
            <span class="rounded-full bg-[var(--app-surface-muted)] px-3 py-1.5 text-xs font-extrabold text-[var(--app-text-muted)]">{{ library ? 'Read-only' : 'Editable' }}</span>
            <button class="flex h-9 w-9 items-center justify-center rounded-md text-[var(--app-text-muted)] hover:bg-[var(--app-surface-soft)]" type="button" aria-label="Close signal preview" @click="emit('close')"><X :size="19" /></button>
          </div>
        </header>

        <div class="overflow-y-auto px-5 py-5">
          <h3 class="text-xl font-extrabold leading-tight text-[var(--app-text)]">{{ row.name }}</h3>
          <div class="flex flex-wrap items-center gap-2">
            <span class="preview-chip mt-3">{{ row.symbol }}</span><span class="preview-chip mt-3">{{ row.timeframe }}</span><span class="preview-chip mt-3">{{ relationLabel }}</span><span v-if="library && row.category" class="preview-chip mt-3">{{ row.category }}</span>
          </div>

          <section v-if="relation === 3" class="mt-4 flex items-start gap-3 rounded-lg border border-[var(--app-primary)] bg-[var(--app-primary-soft)] p-4">
            <Clock3 :size="25" class="mt-0.5 shrink-0 text-[var(--app-primary)]" />
            <div><h4 class="font-extrabold">{{ sequenceBars > 0 && sequenceBars < 100000 ? `Complete within ${sequenceBars} bars` : 'No time limit' }}</h4><p class="mt-1 text-sm text-[var(--app-text-secondary)]">The conditions must occur in the numbered order{{ sequenceBars > 0 && sequenceBars < 100000 ? ` within ${sequenceBars} ${row.timeframe.toLowerCase()} bars` : '' }}.</p></div>
          </section>

          <section class="mt-5">
            <h3 class="text-lg font-extrabold">Trigger sequence</h3>
            <div class="mt-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4 sm:p-5">
              <div class="mx-auto max-w-2xl">
              <template v-for="(condition, conditionIndex) in conditions" :key="`${condition.label}-${conditionIndex}`">
                <div v-if="conditionIndex" class="sequence-connector"><span>{{ connectorLabel }}</span></div>
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
                <div class="mx-auto h-5 w-px bg-[var(--app-primary)]" />
                <div class="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-3 text-center text-sm font-extrabold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">Signal Triggered</div>
              </div>
            </div>
          </section>

          <section class="mt-5">
            <h3 class="text-lg font-extrabold">Latest Signal</h3>
            <div class="mt-2 grid divide-y divide-[var(--app-border)] rounded-lg border border-[var(--app-border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div class="p-4"><p class="text-xs font-bold text-[var(--app-text-muted)]">Last Signal Date</p><p class="mt-2 text-lg font-extrabold">{{ row.lastSignalDate || '—' }}</p><p class="mt-1 text-xs text-[var(--app-text-muted)]">{{ row.lastSignalDate ? 'Most recent trigger.' : 'No metric available.' }}</p></div>
              <div class="p-4"><p class="text-xs font-bold text-[var(--app-text-muted)]">Bars Since Signal</p><p class="mt-2 text-lg font-extrabold">{{ row.barsSinceSignal ?? '—' }}</p><p class="mt-1 text-xs text-[var(--app-text-muted)]">{{ row.barsSinceSignal === null ? 'No metric available.' : `Based on ${row.timeframe.toLowerCase()} bars.` }}</p></div>
              <div class="p-4"><p class="text-xs font-bold text-[var(--app-text-muted)]">Return Since Signal</p><p class="mt-2 text-lg font-extrabold" :class="(row.currentReturn ?? 0) > 0 ? 'text-[var(--app-positive)]' : (row.currentReturn ?? 0) < 0 ? 'text-[var(--app-negative)]' : ''">{{ formattedReturn }}</p><p class="mt-1 text-xs text-[var(--app-text-muted)]">{{ row.currentReturn === null ? 'No metric available.' : 'From trigger to latest close.' }}</p></div>
            </div>
          </section>

          <section class="mt-5">
            <h3 class="text-lg font-extrabold">Actions</h3>
            <div class="mt-2 grid gap-3 sm:grid-cols-2">
              <button class="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--app-primary)] px-4 text-sm font-extrabold text-white hover:bg-[var(--app-primary-hover)]" type="button" @click="emit('view', row)"><Pencil v-if="!library" :size="17" /><BarChart3 v-else :size="17" />{{ library ? 'View Signal' : 'View & Edit Signal' }}</button>
              <button class="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--app-primary)] px-4 text-sm font-extrabold text-[var(--app-primary)] hover:bg-[var(--app-primary-soft)] disabled:opacity-50" type="button" :disabled="busy" @click="emit('copy', row)"><Copy :size="17" />{{ library ? 'Use as My Signal' : 'Duplicate Signal' }}</button>
            </div>
            <p class="mt-2 text-xs text-[var(--app-text-muted)]">{{ library ? 'Use as My Signal creates an editable copy of this system signal in your list.' : 'Duplicating creates a separate editable copy in My Signals.' }}</p>
          </section>

          <aside class="mt-5 rounded-lg border border-[var(--app-border)] bg-[var(--app-primary-soft-alt)] p-4">
            <div class="flex items-center gap-2 text-sm font-extrabold"><Info :size="18" class="text-[var(--app-primary)]" />Available Actions by Signal Source</div>
            <div class="mt-3 grid gap-4 sm:grid-cols-2 sm:divide-x sm:divide-[var(--app-border-strong)]">
              <div class="flex gap-3"><UserRound :size="24" class="shrink-0 text-[var(--app-primary)]" /><div><p class="text-sm font-extrabold">My Signal</p><p class="text-xs text-[var(--app-text-muted)]">View, Edit, Duplicate, Delete</p></div></div>
              <div class="flex gap-3 sm:pl-4"><LockKeyhole :size="24" class="shrink-0 text-[var(--app-primary)]" /><div><p class="text-sm font-extrabold">SentimentTrader Signal</p><p class="text-xs text-[var(--app-text-muted)]">View, Use as My Signal</p></div></div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.preview-chip { border-radius: 9999px; background: var(--app-primary-soft); padding: 6px 16px; color: var(--app-primary); font-size: 0.75rem; font-weight: 800; }
.sequence-number { display: flex; width: 40px; height: 40px; flex: 0 0 40px; align-items: center; justify-content: center; border-radius: 9999px; background: var(--app-primary); color: white; font-weight: 900; }
.sequence-connector { display: flex; min-height: 40px; align-items: center; justify-content: center; }
.sequence-connector span { border: 1px solid var(--app-border-strong); border-radius: 9999px; background: var(--app-primary-soft); padding: 5px 14px; color: var(--app-primary); font-size: 0.6875rem; font-weight: 900; letter-spacing: .04em; }
</style>

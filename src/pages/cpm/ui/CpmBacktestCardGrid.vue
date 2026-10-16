<script setup lang="ts">
import { Settings2, Trash2 } from '@lucide/vue'
import { formatCpmNumber, formatCpmPercent, parseCpmNumber } from '@/entities/cpm/model/cpm.adapter'
import type { CpmBacktestRow, CpmPatternPreviewPoint } from '@/entities/cpm/model/cpm.types'

const props = withDefaults(
  defineProps<{
    rows: CpmBacktestRow[]
    loading?: boolean
    commonPatternImages?: Record<string, string>
    commonPatternLabels?: Record<string, string>
    previewPointsById?: Record<string, CpmPatternPreviewPoint[]>
    previewLoadingById?: Record<string, boolean>
  }>(),
  {
    loading: false,
    commonPatternImages: () => ({}),
    commonPatternLabels: () => ({}),
    previewPointsById: () => ({}),
    previewLoadingById: () => ({}),
  },
)

const emit = defineEmits<{
  preview: [row: CpmBacktestRow]
  open: [row: CpmBacktestRow]
  delete: [row: CpmBacktestRow]
}>()

const sparklineWidth = 150
const sparklineHeight = 58

function handlePreview(row: CpmBacktestRow) {
  emit('preview', row)
}

function handleOpen(row: CpmBacktestRow) {
  emit('open', row)
}

function handleDelete(row: CpmBacktestRow) {
  emit('delete', row)
}

function cardTitle(row: CpmBacktestRow) {
  return row.name || [row.symbol, row.createdAt].filter(Boolean).join(' ') || 'CPM Study'
}

function patternPeriod(row: CpmBacktestRow) {
  return row.startDate && row.endDate ? `${row.startDate} -> ${row.endDate}` : row.period || '-'
}

function patternBars(row: CpmBacktestRow) {
  const value = formatCpmNumber(row.barsNumber, 0, true)
  return value === '-' ? '-' : `${value} bars`
}

function statusLabel(row: CpmBacktestRow) {
  if (row.status === 'Finish') return 'Finished'
  return row.status || 'Unknown'
}

function statusClass(row: CpmBacktestRow) {
  if (row.status === 'Finish') return 'bg-emerald-50 text-emerald-700'
  if (row.status === 'Running') return 'bg-sky-50 text-sky-700'
  if (row.status === 'Fail') return 'bg-rose-50 text-rose-700'
  return 'bg-[var(--app-surface-soft)] text-[var(--app-text-muted)]'
}

function returnClass(row: CpmBacktestRow) {
  const value = parseCpmNumber(row.totalReturn)
  if (value !== null && value > 0) return 'text-[var(--app-positive)]'
  if (value !== null && value < 0) return 'text-[var(--app-negative)]'
  return 'text-[var(--app-text)]'
}

function normalizedSystemPattern(row: CpmBacktestRow) {
  return String(row.systemPattern ?? '').trim().toLowerCase()
}

function commonPatternImage(row: CpmBacktestRow) {
  return props.commonPatternImages[normalizedSystemPattern(row)] ?? ''
}

function commonPatternLabel(row: CpmBacktestRow) {
  return props.commonPatternLabels[normalizedSystemPattern(row)] ?? 'Common Pattern'
}

function previewPoints(row: CpmBacktestRow) {
  return props.previewPointsById[row.id] ?? []
}

function previewValues(row: CpmBacktestRow) {
  return previewPoints(row)
    .map((point) => point.close)
    .filter((value): value is number => value !== null && Number.isFinite(value))
}

function previewLoading(row: CpmBacktestRow) {
  return Boolean(props.previewLoadingById[row.id])
}

function hasPreviewTrend(row: CpmBacktestRow) {
  return previewValues(row).length > 1
}

function sparklinePoints(row: CpmBacktestRow) {
  const values = previewValues(row)
  if (values.length < 2) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * sparklineWidth
      const y = sparklineHeight - 6 - ((value - min) / range) * (sparklineHeight - 12)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function sparklineArea(row: CpmBacktestRow) {
  const points = sparklinePoints(row)
  return points ? `0,${sparklineHeight} ${points} ${sparklineWidth},${sparklineHeight}` : ''
}
</script>

<template>
  <div v-if="props.loading" class="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] text-sm text-[var(--app-text-muted)]">
    Loading CPM backtests...
  </div>

  <div v-else-if="!props.rows.length" class="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] text-sm text-[var(--app-text-muted)]">
    No CPM backtests found
  </div>

  <div v-else class="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
    <article
      v-for="row in props.rows"
      :key="row.id"
      class="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--app-surface-soft)] hover:shadow-md"
    >
      <div class="flex items-start justify-between gap-3">
        <button class="min-w-0 truncate text-left text-base font-extrabold leading-6 text-[var(--app-text)] transition hover:text-[var(--app-primary)] hover:underline" type="button" @click="handleOpen(row)">
          {{ cardTitle(row) }}
        </button>
        <div class="flex shrink-0 items-center gap-1">
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--app-text-muted)] transition hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]"
            type="button"
            title="Preview setup"
            aria-label="Preview setup"
            @click.stop="handlePreview(row)"
          >
            <Settings2 :size="16" />
          </button>
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--app-text-muted)] transition hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-negative)]"
            type="button"
            title="Delete"
            aria-label="Delete"
            @click.stop="handleDelete(row)"
          >
            <Trash2 :size="16" />
          </button>
        </div>
      </div>

      <div class="mt-2 flex flex-wrap items-center gap-2">
        <span class="rounded-full bg-[var(--app-primary-soft)] px-3 py-1 text-xs font-extrabold text-[var(--app-primary)]">{{ row.symbol || '-' }}</span>
        <span class="rounded-full bg-[var(--app-surface-soft)] px-3 py-1 text-xs font-extrabold text-[var(--app-text-secondary)]">{{ row.timeframe || '-' }}</span>
        <span class="rounded-full px-3 py-1 text-xs font-extrabold" :class="statusClass(row)">{{ statusLabel(row) }}</span>
      </div>

      <div class="mt-3 grid grid-cols-[minmax(118px,0.9fr)_minmax(0,1fr)] items-center gap-4">
        <div class="flex h-[74px] items-center justify-center overflow-hidden rounded-md bg-[var(--app-surface-soft)] px-2 py-2">
          <img
            v-if="commonPatternImage(row)"
            :src="commonPatternImage(row)"
            :alt="`${commonPatternLabel(row)} preview`"
            class="h-full w-full object-contain"
          />
          <div v-else-if="previewLoading(row)" class="flex h-full w-full items-center justify-center text-xs font-semibold text-[var(--app-text-muted)]">
            Loading trend...
          </div>
          <svg v-else-if="hasPreviewTrend(row)" class="h-[58px] w-full" :viewBox="`0 0 ${sparklineWidth} ${sparklineHeight}`" role="img" aria-label="Study trend preview" preserveAspectRatio="none">
            <polyline :points="sparklineArea(row)" fill="var(--app-primary-soft)" opacity="0.85" />
            <polyline :points="sparklinePoints(row)" fill="none" stroke="var(--app-primary)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" />
          </svg>
          <div v-else class="flex h-full w-full items-center justify-center text-xs font-semibold text-[var(--app-text-muted)]">
            No trend data
          </div>
        </div>

        <dl class="min-w-0 space-y-1.5">
          <div>
            <dt class="text-xs font-semibold text-[var(--app-text-muted)]">Pattern Period</dt>
            <dd class="truncate text-sm font-extrabold text-[var(--app-text)]">{{ patternPeriod(row) }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold text-[var(--app-text-muted)]">Pattern Bars</dt>
            <dd class="text-sm font-extrabold text-[var(--app-text)]">{{ patternBars(row) }}</dd>
          </div>
        </dl>
      </div>

      <div class="my-3 border-t border-[var(--app-border-muted)]" />

      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-xs font-semibold text-[var(--app-text-muted)]">Total Trades</p>
          <p class="mt-0.5 text-lg font-extrabold leading-6 text-[var(--app-text)]">{{ formatCpmNumber(row.totalTrades, 0, true) }}</p>
        </div>
        <div>
          <p class="text-xs font-semibold text-[var(--app-text-muted)]">Total Return</p>
          <p class="mt-0.5 text-lg font-extrabold leading-6" :class="returnClass(row)">{{ formatCpmPercent(row.totalReturn) }}</p>
        </div>
      </div>

      <button
        class="selected-fill-button mt-3 flex h-9 w-full items-center justify-center rounded-md bg-[var(--app-primary)] px-4 text-sm font-extrabold text-white transition hover:bg-[var(--app-primary-hover)]"
        type="button"
        @click="handleOpen(row)"
      >
        View Results
      </button>
    </article>
  </div>
</template>

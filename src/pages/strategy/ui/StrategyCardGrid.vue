<script setup lang="ts">
import { ArrowRight, Star } from '@lucide/vue'
import {
  formatStrategyInteger,
  formatStrategyNumber,
  formatStrategyPercent,
} from '@/entities/strategy/model/strategy.adapter'
import type { StrategySignalRow, StrategySummaryRow, StrategyTab } from '@/entities/strategy/model/strategy.types'

const props = withDefaults(
  defineProps<{
    tab: StrategyTab
    signals: StrategySignalRow[]
    summaries: StrategySummaryRow[]
    loading?: boolean
    ytdLabel: string
  }>(),
  {
    loading: false,
  },
)

defineEmits<{
  open: [row: StrategySignalRow | StrategySummaryRow]
  favorite: [row: StrategySignalRow]
}>()

function percentClass(value: number | null) {
  if (value === null) return 'text-[var(--app-text)]'
  return value < 0 ? 'text-[var(--app-negative)]' : 'text-[var(--app-positive)]'
}
</script>

<template>
  <div v-if="props.loading" class="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] text-sm text-[var(--app-text-muted)]">
    Loading strategies...
  </div>

  <div v-else-if="props.tab === 'signals' && !props.signals.length" class="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] text-sm text-[var(--app-text-muted)]">
    No strategies found
  </div>

  <div v-else-if="props.tab === 'summary' && !props.summaries.length" class="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] text-sm text-[var(--app-text-muted)]">
    No strategies found
  </div>

  <div v-else-if="props.tab === 'signals'" class="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
    <article
      v-for="row in props.signals"
      :key="row.id"
      class="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--app-surface-soft)] hover:shadow-md"
      :class="{ 'border-amber-200 bg-amber-50/70': row.currentDay }"
    >
      <div class="flex items-start justify-between gap-3">
        <button class="min-w-0 text-left text-base font-extrabold leading-6 text-[var(--app-primary)] hover:underline" type="button" @click="$emit('open', row)">
          {{ row.modelName }}
        </button>
        <button
          class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition"
          :class="row.favorite ? 'text-amber-500' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]'"
          type="button"
          :aria-label="row.favorite ? 'Remove favorite strategy' : 'Add favorite strategy'"
          @click="$emit('favorite', row)"
        >
          <Star :size="18" :fill="row.favorite ? 'currentColor' : 'none'" />
        </button>
      </div>

      <div class="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[var(--app-text-muted)]">
        <span class="rounded-md bg-[var(--app-surface-muted)] px-2 py-1">{{ row.timeFrame }}</span>
        <span class="rounded-md bg-[var(--app-surface-muted)] px-2 py-1">{{ row.frequency }}</span>
      </div>

      <div class="mt-4 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] p-3">
        <p class="text-xs font-semibold text-[var(--app-text-muted)]">Current Signal</p>
        <p class="mt-1 text-lg font-extrabold text-[var(--app-text)]">{{ row.currentSignal }}</p>
        <p class="mt-1 text-xs font-semibold text-[var(--app-text-muted)]">Last signal date {{ row.lastSignalDate }}</p>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p class="text-xs font-semibold text-[var(--app-text-muted)]">YTD Return</p>
          <p class="text-xl font-extrabold" :class="percentClass(row.ytdReturn)">{{ formatStrategyPercent(row.ytdReturn) }}</p>
          <p class="text-[0.7rem] font-semibold text-[var(--app-text-muted)]">as of {{ props.ytdLabel }}</p>
        </div>
        <div>
          <p class="text-xs font-semibold text-[var(--app-text-muted)]">CAGR</p>
          <p class="text-xl font-extrabold" :class="percentClass(row.cagr)">{{ formatStrategyPercent(row.cagr) }}</p>
          <p class="text-[0.7rem] font-semibold text-[var(--app-text-muted)]">since Jul 1, 2006</p>
        </div>
      </div>

      <button
        class="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[var(--app-primary)] px-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[var(--app-primary-hover)]"
        type="button"
        title="Backtest This Strategy"
        @click="$emit('open', row)"
      >
        Backtest This Strategy
        <ArrowRight :size="16" />
      </button>
    </article>
  </div>

  <div v-else class="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
    <article
      v-for="row in props.summaries"
      :key="row.id"
      class="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--app-surface-soft)] hover:shadow-md"
    >
      <button class="text-left text-base font-extrabold leading-6 text-[var(--app-primary)] hover:underline" type="button" @click="$emit('open', row)">
        {{ row.modelName }}
      </button>

      <div class="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p class="text-xs font-semibold text-[var(--app-text-muted)]">Strategy CAGR</p>
          <p class="text-xl font-extrabold" :class="percentClass(row.cagr)">{{ formatStrategyPercent(row.cagr) }}</p>
        </div>
        <div>
          <p class="text-xs font-semibold text-[var(--app-text-muted)]">Benchmark CAGR</p>
          <p class="text-xl font-extrabold text-[var(--app-text)]">{{ formatStrategyPercent(row.benchmarkCagr) }}</p>
        </div>
      </div>

      <div class="mt-4 grid gap-2 rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] p-3 text-sm">
        <div class="flex justify-between gap-3">
          <span class="text-[var(--app-text-muted)]">Net Profit</span>
          <strong :class="percentClass(row.netProfit)">{{ formatStrategyPercent(row.netProfit) }}</strong>
        </div>
        <div class="flex justify-between gap-3">
          <span class="text-[var(--app-text-muted)]">Max Drawdown</span>
          <strong class="text-[var(--app-negative)]">{{ formatStrategyPercent(row.maxDrawdown) }}</strong>
        </div>
        <div class="flex justify-between gap-3">
          <span class="text-[var(--app-text-muted)]">Sharpe Ratio</span>
          <strong>{{ formatStrategyNumber(row.sharpeRatio, 2) }}</strong>
        </div>
        <div class="flex justify-between gap-3">
          <span class="text-[var(--app-text-muted)]">P/L Ratio</span>
          <strong>{{ formatStrategyNumber(row.profitLossRatio, 2) }}</strong>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div class="rounded-md bg-[var(--app-surface-muted)] px-2 py-2">
          <span class="block font-semibold text-[var(--app-text-muted)]">Trades</span>
          <strong class="text-sm">{{ formatStrategyInteger(row.totalTrades) }}</strong>
        </div>
        <div class="rounded-md bg-[var(--app-surface-muted)] px-2 py-2">
          <span class="block font-semibold text-[var(--app-text-muted)]">Win Rate</span>
          <strong class="text-sm">{{ formatStrategyPercent(row.winRate) }}</strong>
        </div>
        <div class="rounded-md bg-[var(--app-surface-muted)] px-2 py-2">
          <span class="block font-semibold text-[var(--app-text-muted)]">Avg Win</span>
          <strong class="text-sm">{{ formatStrategyPercent(row.averageWin) }}</strong>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight, CalendarDays, Target, Users } from '@lucide/vue'
import {
  formatMarketCurrency,
  formatMarketNumber,
  formatMarketPercent,
} from '@/entities/market/model/market-prediction.adapter'
import type { MarketPredictionRow } from '@/entities/market/model/market-prediction.types'
import MarketPredictionRatingBadge from './MarketPredictionRatingBadge.vue'

withDefaults(
  defineProps<{
    rows: MarketPredictionRow[]
    loading?: boolean
  }>(),
  {
    loading: false,
  },
)

defineEmits<{
  open: [row: MarketPredictionRow]
}>()

function upsideClass(row: MarketPredictionRow) {
  if ((row.potentialUpside ?? 0) < 0) return 'text-[var(--app-negative)]'
  return 'text-[var(--app-positive)]'
}

function accuracyRingStyle(row: MarketPredictionRow) {
  const value = Math.max(0, Math.min(100, row.meanAccuracy ?? 0))
  return {
    background: `conic-gradient(var(--app-primary) 0 ${value}%, var(--app-border-muted) ${value}% 100%)`,
  }
}
</script>

<template>
  <div v-if="loading" class="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] text-sm text-[var(--app-text-muted)]">
    Loading market predictions...
  </div>

  <div v-else-if="!rows.length" class="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] text-sm text-[var(--app-text-muted)]">
    No market predictions found
  </div>

  <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3">
    <article
      v-for="row in rows"
      :key="row.id"
      class="min-w-0 overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--app-surface-soft)] hover:shadow-md"
    >
      <div class="flex items-start justify-between gap-3">
        <button class="min-w-0 truncate text-left text-2xl font-extrabold leading-7 text-[var(--app-text)] transition hover:text-[var(--app-primary)] hover:underline" type="button" @click="$emit('open', row)">
          {{ row.ticker }}
        </button>
        <MarketPredictionRatingBadge :rating="row.rating" :category="row.ratingCategory" />
      </div>

      <div class="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <div>
          <p class="text-xs font-semibold text-[var(--app-text-muted)]">Last Price</p>
          <p class="text-lg font-extrabold text-[var(--app-text)]">{{ formatMarketCurrency(row.lastPrice) }}</p>
        </div>
        <ArrowRight :size="18" class="mb-1 text-[var(--app-text-faint)]" />
        <div>
          <p class="text-xs font-semibold text-[var(--app-text-muted)]">Target</p>
          <p class="text-lg font-extrabold text-[var(--app-text)]">{{ formatMarketCurrency(row.target) }}</p>
        </div>
      </div>

      <div class="mt-4 border-t border-[var(--app-border-muted)] pt-4">
        <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
          <div class="min-w-0">
            <p class="flex items-center gap-1.5 text-xs font-semibold text-[var(--app-text-muted)]">
              <Target :size="15" class="text-[var(--app-primary)]" />
              Potential Upside
            </p>
            <p class="mt-1 text-2xl font-extrabold leading-8" :class="upsideClass(row)">
              {{ formatMarketPercent(row.potentialUpside, true) }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <div class="market-accuracy-ring" :style="accuracyRingStyle(row)">
              <span>{{ formatMarketPercent(row.meanAccuracy).replace('.0%', '%') }}</span>
            </div>
            <span class="text-xs font-semibold leading-4 text-[var(--app-text-muted)]">Mean<br />Accuracy</span>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-3 text-xs text-[var(--app-text-muted)]">
          <div class="flex items-start gap-2">
            <CalendarDays :size="16" class="mt-0.5 shrink-0 text-[var(--app-primary)]" />
            <span>
              <span class="block font-semibold">Prediction End Date</span>
              <span class="font-extrabold text-[var(--app-text)]">{{ row.predictionEndDate }}</span>
            </span>
          </div>
          <div class="flex items-start gap-2">
            <Users :size="16" class="mt-0.5 shrink-0 text-[var(--app-primary)]" />
            <span>
              <span class="block font-semibold">Total Analyst Predictions</span>
              <span class="font-extrabold text-[var(--app-text)]">{{ formatMarketNumber(row.analystCoverage) }}</span>
            </span>
          </div>
        </div>

        <button
          class="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[var(--app-primary)] px-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[var(--app-primary-hover)]"
          type="button"
          @click="$emit('open', row)"
        >
          View Prediction
          <ArrowRight :size="16" />
        </button>
      </div>
    </article>
  </div>
</template>

<style scoped>
.market-accuracy-ring {
  display: grid;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 999px;
}

.market-accuracy-ring::before {
  content: '';
  grid-area: 1 / 1;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  background: var(--app-surface);
}

.market-accuracy-ring span {
  z-index: 1;
  grid-area: 1 / 1;
  color: var(--app-text);
  font-size: 0.75rem;
  font-weight: 800;
}
</style>

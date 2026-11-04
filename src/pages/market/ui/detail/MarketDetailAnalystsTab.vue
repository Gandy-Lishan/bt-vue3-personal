<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type {
  MarketAnalystConsensusItem,
  MarketAnalystTargetRow,
  MarketPredictionDetail,
} from '@/entities/market/model/market-detail.types'
import {
  formatMarketCurrency,
  formatMarketNumber,
  formatMarketPercent,
} from '@/entities/market/model/market-prediction.adapter'
import { useSortedPagedRows } from '@/pages/indicators/composables/useSortedPagedRows'
import IndicatorPagination from '@/pages/indicators/ui/IndicatorPagination.vue'
import AppDataTable from '@/shared/ui/AppDataTable.vue'
import type { AppDataTableColumn } from '@/shared/ui/app-data-table.types'
import MarketAnalystGauge from './MarketAnalystGauge.vue'
import MarketInfoHint from './MarketInfoHint.vue'

const props = defineProps<{
  detail: MarketPredictionDetail
}>()

const PAGE_SIZE = 10

const columns: AppDataTableColumn[] = [
  { key: 'date', label: 'Date', minWidth: 120, sortable: true },
  { key: 'target', label: 'Target', minWidth: 100, sortable: true },
  { key: 'minPrice', label: 'Min Price', minWidth: 100, sortable: true },
  { key: 'maxPrice', label: 'Max Price', minWidth: 100, sortable: true },
  { key: 'reportCount', label: 'Number of Reports', minWidth: 150, sortable: true },
  { key: 'accuracy', label: 'Accuracy', minWidth: 100, sortable: true },
]

const consensusRows = computed(() => props.detail.analystConsensus)
const analystTargets = computed(() => props.detail.analystTargets)
const hasConsensusData = computed(() => consensusRows.value.some((item) => (
  (item.count ?? 0) > 0 || (item.percent ?? 0) > 0
)))

const animatedBarWidths = ref<number[]>([])
let barAnimationFrame = 0

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function animateBars() {
  cancelAnimationFrame(barAnimationFrame)
  const finalWidths = consensusRows.value.map((item) => item.percent ?? 0)

  if (prefersReducedMotion()) {
    animatedBarWidths.value = finalWidths
    return
  }

  const duration = 800
  let startTime: number | null = null

  const animate = (currentTime: number) => {
    if (startTime === null) startTime = currentTime
    const progress = Math.min((currentTime - startTime) / duration, 1)
    animatedBarWidths.value = finalWidths.map((width) => width * progress)

    if (progress < 1) {
      barAnimationFrame = requestAnimationFrame(animate)
    } else {
      animatedBarWidths.value = finalWidths
    }
  }

  barAnimationFrame = requestAnimationFrame(animate)
}

function barValue(item: MarketAnalystConsensusItem) {
  const percent = item.percent === null ? '—' : `${item.percent}%`
  const count = item.count === null ? '—' : String(item.count)
  return `${percent} (${count})`
}

const table = useSortedPagedRows(analystTargets, (row, key) => {
  if (key === 'date') return row.timestamp ?? (Date.parse(row.date) || row.date)
  const value = row[key as keyof MarketAnalystTargetRow]
  if (typeof value === 'number') return value
  return value === null || value === undefined ? null : String(value)
}, PAGE_SIZE)

const tableRows = computed<Array<Record<string, unknown>>>(() => (
  table.pagedRows.value.map((row, index) => ({
    id: `${row.date}-${row.target ?? ''}-${row.reportCount ?? ''}-${index}`,
    date: row.date,
    target: formatMarketCurrency(row.target),
    minPrice: formatMarketCurrency(row.minPrice),
    maxPrice: formatMarketCurrency(row.maxPrice),
    reportCount: formatMarketNumber(row.reportCount),
    accuracy: formatMarketPercent(row.accuracy, true),
  }))
))

function handleSort(key: string) {
  table.sort({ key, kind: key === 'date' ? 'date' : 'number' })
}

watch(
  () => consensusRows.value.map((item) => `${item.label}:${item.percent}:${item.count}`).join('|'),
  animateBars,
)

onMounted(animateBars)
onBeforeUnmount(() => cancelAnimationFrame(barAnimationFrame))
</script>

<template>
  <section class="space-y-3">
    <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
      <div class="mb-4 flex items-center gap-1.5">
        <h2 class="text-lg font-extrabold">Analyst Recommendations</h2>
        <MarketInfoHint text="Analyst Recommendations refers to the latest compilation of attitudes and forecasts from financial analysts." />
      </div>

      <div v-if="hasConsensusData" class="grid items-center gap-4 lg:grid-cols-[364px_minmax(0,1fr)]">
        <div class="flex justify-center lg:justify-start">
          <MarketAnalystGauge :items="consensusRows" :latest-rating="detail.analystLatestRating" />
        </div>

        <div class="min-w-0 space-y-3">
          <div
            v-for="(item, index) in consensusRows"
            :key="item.label"
            class="grid grid-cols-[88px_minmax(0,1fr)_90px] items-center gap-3 text-sm"
          >
            <span class="font-semibold text-[var(--app-text-secondary)]">{{ item.label }}</span>
            <div class="h-3 overflow-hidden rounded-full bg-[var(--app-border-muted)]">
              <div
                class="h-full rounded-full"
                :style="{ width: `${animatedBarWidths[index] ?? 0}%`, backgroundColor: item.color }"
              />
            </div>
            <span class="text-right font-semibold">{{ barValue(item) }}</span>
          </div>
        </div>
      </div>

      <p v-else class="py-8 text-center text-sm italic text-[var(--app-text-muted)]">
        No analyst recommendation data available.
      </p>
    </section>

    <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
      <div class="mb-3 flex items-center gap-1.5">
        <h2 class="text-lg font-extrabold">Analyst Predict Summary</h2>
        <MarketInfoHint text="This refers to the detailed historical forecasts made by analysts for a specific Ticker" />
      </div>

      <AppDataTable
        :columns="columns"
        :rows="tableRows"
        :sort-key="table.sortKey.value"
        :sort-direction="table.sortDirection.value"
        empty-message="No analyst forecasts found"
        @sort="handleSort"
      />

      <div v-if="analystTargets.length" class="mt-3 border-t border-[var(--app-border)] pt-3">
        <IndicatorPagination
          :page="table.page.value"
          :page-count="table.pageCount.value"
          :total="table.sortedRows.value.length"
          item-label="estimates"
          @change="table.setPage"
        />
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Maximize2, Minus, Plus } from '@lucide/vue'
import type { SmartScannerBacktestDetail, SmartScannerChartPoint } from '@/entities/scanner/model/smart-scanner.types'

const props = defineProps<{
  detail: SmartScannerBacktestDetail | null
  loading?: boolean
}>()

const chartRows = computed(() => props.detail?.chartRows ?? [])
const hasChartRows = computed(() => chartRows.value.some((row) => row.price !== null || row.indicator !== null))

function pathFor(rows: SmartScannerChartPoint[], key: 'price' | 'indicator', width: number, height: number) {
  const values = rows.map((row) => row[key])
  const numeric = values.filter((value): value is number => value !== null)
  if (!numeric.length) return ''

  const min = Math.min(...numeric)
  const max = Math.max(...numeric)
  const range = max - min || 1
  const step = rows.length > 1 ? width / (rows.length - 1) : width

  return values
    .map((value, index) => {
      if (value === null) return ''
      const x = index * step
      const y = height - ((value - min) / range) * (height - 20) - 10
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .filter(Boolean)
    .join(' ')
}

const pricePath = computed(() => pathFor(chartRows.value, 'price', 860, 260))
const indicatorPath = computed(() => pathFor(chartRows.value, 'indicator', 860, 170))
</script>

<template>
  <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
    <div class="mb-3 flex items-center justify-between gap-3">
      <h2 class="text-lg font-extrabold text-[var(--app-text)]">Price Chart & {{ props.detail?.signalLabel ?? 'Signal' }}</h2>
      <div class="flex items-center gap-1">
        <button class="flex h-7 w-7 items-center justify-center rounded border border-[var(--app-border)] text-[var(--app-text-muted)]" type="button" aria-label="Zoom out">
          <Minus :size="14" />
        </button>
        <button class="flex h-7 w-7 items-center justify-center rounded border border-[var(--app-border)] text-[var(--app-text-muted)]" type="button" aria-label="Zoom in">
          <Plus :size="14" />
        </button>
        <button class="flex h-7 w-7 items-center justify-center rounded border border-[var(--app-border)] text-[var(--app-text-muted)]" type="button" aria-label="Fullscreen">
          <Maximize2 :size="14" />
        </button>
      </div>
    </div>

    <div class="overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface-soft)]">
      <div v-if="props.loading" class="flex h-[520px] items-center justify-center text-sm text-[var(--app-text-muted)]">
        Loading chart...
      </div>
      <div v-else-if="!hasChartRows" class="flex h-[520px] flex-col items-center justify-center px-6 text-center text-sm text-[var(--app-text-muted)]">
        <p class="font-semibold text-[var(--app-text-secondary)]">No chart data available</p>
        <p class="mt-1 max-w-md">Backtest metrics and trade history are available below.</p>
      </div>
      <div v-else class="p-3">
        <svg class="h-[315px] w-full" viewBox="0 0 860 260" preserveAspectRatio="none" role="img" aria-label="Price chart">
          <defs>
            <pattern id="scanner-price-grid" width="86" height="52" patternUnits="userSpaceOnUse">
              <path d="M 86 0 L 0 0 0 52" fill="none" stroke="var(--chart-grid)" stroke-width="1" opacity="0.55" />
            </pattern>
          </defs>
          <rect width="860" height="260" fill="url(#scanner-price-grid)" />
          <path :d="pricePath" fill="none" stroke="var(--chart-primary)" stroke-width="2.2" />
        </svg>
        <div class="border-t border-[var(--app-border-muted)] pt-3">
          <svg class="h-[205px] w-full" viewBox="0 0 860 170" preserveAspectRatio="none" role="img" aria-label="Signal indicator chart">
            <defs>
              <pattern id="scanner-indicator-grid" width="86" height="42.5" patternUnits="userSpaceOnUse">
                <path d="M 86 0 L 0 0 0 42.5" fill="none" stroke="var(--chart-grid)" stroke-width="1" opacity="0.55" />
              </pattern>
            </defs>
            <rect width="860" height="170" fill="url(#scanner-indicator-grid)" />
            <line x1="0" x2="860" y1="38" y2="38" stroke="var(--app-negative)" stroke-dasharray="4 4" />
            <line x1="0" x2="860" y1="132" y2="132" stroke="var(--app-positive)" stroke-dasharray="4 4" />
            <path :d="indicatorPath" fill="none" stroke="var(--app-primary)" stroke-width="2.2" />
          </svg>
        </div>
      </div>
    </div>
  </section>
</template>

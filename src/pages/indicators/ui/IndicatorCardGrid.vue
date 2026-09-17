<script setup lang="ts">
import { MoreHorizontal, Star } from '@lucide/vue'
import { favoriteActionLabel } from '@/entities/indicator/model/indicator.favorites'
import { sentimentLabelFromScore, sentimentTextClass } from '@/entities/indicator/model/indicator.sentiment'
import {
  displayIndicatorGroup,
  displayIndicatorTimeFrame,
  displayIndicatorValue,
  parseIndicatorNumber,
} from '@/entities/indicator/model/indicator.values'
import { indicatorTrendTone } from '@/entities/indicator/model/indicator.trends'
import type { IndicatorTableColumn } from '@/entities/indicator/model/indicator.table'
import type { Indicator } from '@/entities/indicator/model/indicator.types'
import IndicatorSentimentMeter from './IndicatorSentimentMeter.vue'
import IndicatorSparkline from './IndicatorSparkline.vue'

defineProps<{
  indicators: Indicator[]
  loading?: boolean
  columns: IndicatorTableColumn[]
}>()

defineEmits<{
  open: [indicator: Indicator]
  favorite: [id: string]
}>()

const currentValueColumn: IndicatorTableColumn = { key: 'last_value', label: 'Value', kind: 'number' }
const changeColumn: IndicatorTableColumn = { key: 'last_change', label: 'Change', kind: 'change' }

function cardNumberValue(indicator: Indicator, column: IndicatorTableColumn) {
  const displayed = displayIndicatorValue(indicator, column)
  const numeric = parseIndicatorNumber(displayed)
  if (numeric === null) return displayed
  return `${numeric.toFixed(2)}${displayed.endsWith('%') ? '%' : ''}`
}

function timeFrameLabel(indicator: Indicator) {
  return displayIndicatorTimeFrame(indicator.timeFrame)
}
</script>

<template>
  <div v-if="loading" class="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] text-sm text-[var(--app-text-muted)]">
    Loading indicators...
  </div>

  <div v-else-if="!indicators.length" class="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] text-sm text-[var(--app-text-muted)]">
    No data
  </div>

  <div v-else class="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
    <article
      v-for="indicator in indicators"
      :key="indicator.id"
      class="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--app-surface-soft)] hover:shadow-md"
    >
      <div class="flex items-start gap-2.5">
        <button
          v-if="!indicator.favoriteLocked"
          class="mt-0.5 shrink-0 transition"
          :class="indicator.favorite ? 'text-[var(--app-favorite)]' : 'text-[var(--app-text-secondary)] hover:text-[var(--app-favorite)]'"
          type="button"
          :title="favoriteActionLabel(indicator.favorite)"
          :aria-label="favoriteActionLabel(indicator.favorite)"
          @click.stop="$emit('favorite', indicator.id)"
        >
          <Star :size="18" :fill="indicator.favorite ? 'var(--app-favorite)' : 'transparent'" />
        </button>
        <span v-else class="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <button class="line-clamp-2 text-left text-sm font-semibold leading-5 text-[var(--app-text)] transition hover:text-[var(--app-primary)] hover:underline" type="button" @click="$emit('open', indicator)">
            {{ indicator.name }}
          </button>
          <p class="mt-1 text-xs text-[var(--app-text-muted)]">{{ displayIndicatorGroup(indicator, columns) }} <span class="mx-2">|</span> {{ timeFrameLabel(indicator) }}</p>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-[minmax(74px,0.9fr)_minmax(74px,0.9fr)_minmax(120px,1fr)] items-end gap-4">
        <div>
          <p class="text-xs text-[var(--app-text-muted)]">Current Value</p>
          <p class="text-lg font-bold leading-6 text-[var(--app-text)]">{{ cardNumberValue(indicator, currentValueColumn) }}</p>
        </div>
        <div>
          <p class="text-xs text-[var(--app-text-muted)]">Change (1d)</p>
          <p
            class="text-lg font-bold"
            :class="indicator.change < 0 ? 'text-[var(--app-negative)]' : indicator.change > 0 ? 'text-[var(--app-positive)]' : 'text-[var(--app-text)]'"
          >
            {{ cardNumberValue(indicator, changeColumn) }}
          </p>
        </div>
        <div class="flex justify-end">
          <IndicatorSparkline :series="indicator.trendLines" :tone="indicatorTrendTone(indicator)" :width="145" :height="46" />
        </div>
      </div>

      <div class="mt-3 flex items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <IndicatorSentimentMeter :score="indicator.sentimentScore" />
          <span class="truncate text-xs font-medium" :class="sentimentTextClass(indicator.sentimentScore)">
            {{ sentimentLabelFromScore(indicator.sentimentScore) }}
          </span>
        </div>
        <div class="flex shrink-0 items-center gap-3 text-xs text-[var(--app-text-muted)]">
          <span>Updated {{ indicator.updatedAt }}</span>
          <button class="text-[var(--app-text-secondary)] hover:text-[var(--app-primary)]" type="button" aria-label="More indicator actions">
            <MoreHorizontal :size="18" />
          </button>
        </div>
      </div>
    </article>
  </div>
</template>

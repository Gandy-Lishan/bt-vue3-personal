<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ArrowDown, ArrowUp, Star } from '@lucide/vue'
import { favoriteActionLabel } from '@/entities/indicator/model/indicator.favorites'
import { sentimentLabelFromScore, sentimentTextClass } from '@/entities/indicator/model/indicator.sentiment'
import {
  displayIndicatorGroup,
  displayIndicatorTimeFrame,
  displayIndicatorValue,
  formatIndicatorNumber,
  indicatorRawValue,
  parseIndicatorNumber,
} from '@/entities/indicator/model/indicator.values'
import { indicatorTrendTone } from '@/entities/indicator/model/indicator.trends'
import type { IndicatorTableColumn } from '@/entities/indicator/model/indicator.table'
import type { Indicator } from '@/entities/indicator/model/indicator.types'
import IndicatorSentimentMeter from './IndicatorSentimentMeter.vue'
import IndicatorSparkline from './IndicatorSparkline.vue'
import { isGuestLockedIndicator } from '@/entities/indicator/model/indicator.guest'

const props = withDefaults(defineProps<{
  indicators: Indicator[]
  loading?: boolean
  columns: IndicatorTableColumn[]
  showFavorite?: boolean
  primaryMetricColumn?: IndicatorTableColumn
  primaryMetricLabel?: string
  secondaryMetricColumn?: IndicatorTableColumn
  secondaryMetricLabel?: string
  titleColumn?: IndicatorTableColumn
  subtitleColumns?: IndicatorTableColumn[]
  showSentiment?: boolean
  showUpdated?: boolean
  footerMetricColumn?: IndicatorTableColumn
  footerMetricLabel?: string
  layout?: 'responsive' | 'two-column'
  animateUpdates?: boolean
  guestMode?: boolean
}>(), {
  showFavorite: true,
  showSentiment: true,
  showUpdated: true,
  primaryMetricLabel: 'Current Value',
  secondaryMetricLabel: 'Change (1d)',
  subtitleColumns: undefined,
  layout: 'responsive',
})

defineEmits<{
  open: [indicator: Indicator]
  favorite: [id: string]
}>()

const currentValueColumn: IndicatorTableColumn = { key: 'last_value', label: 'Value', kind: 'number' }
const changeColumn: IndicatorTableColumn = { key: 'last_change', label: 'Change', kind: 'change' }
const primaryMetricColumn = computed(() => props.primaryMetricColumn ?? currentValueColumn)
const secondaryMetricColumn = computed(() => props.secondaryMetricColumn ?? changeColumn)
const changedFields = ref<Record<string, Partial<Record<'primary' | 'secondary', 'up' | 'down'>>>>({})
const previousValues = new Map<string, { primary: string; secondary: string; trend: string; updated: string }>()
let clearAnimationTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.indicators.map((item) => ({
    id: item.id,
    primary: cardNumberValue(item, primaryMetricColumn.value),
    secondary: cardNumberValue(item, secondaryMetricColumn.value),
    trend: JSON.stringify(item.trendLines),
    updated: item.updatedAt,
  })),
  (values) => {
    const changed: Record<string, Partial<Record<'primary' | 'secondary', 'up' | 'down'>>> = {}
    for (const { id, ...value } of values) {
      const previous = previousValues.get(id)
      if (props.animateUpdates && previous) {
        for (const field of ['primary', 'secondary'] as const) {
          const before = parseIndicatorNumber(previous[field])
          const after = parseIndicatorNumber(value[field])
          if (before !== null && after !== null && before !== after) {
            changed[id] ??= {}
            changed[id][field] = after > before ? 'up' : 'down'
          }
        }
      }
      previousValues.set(id, value)
    }
    if (Object.keys(changed).length) {
      changedFields.value = changed
      if (clearAnimationTimer) clearTimeout(clearAnimationTimer)
      clearAnimationTimer = setTimeout(() => { changedFields.value = {} }, 1400)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => { if (clearAnimationTimer) clearTimeout(clearAnimationTimer) })

function flashClass(id: string, field: 'primary' | 'secondary') {
  const direction = changedFields.value[id]?.[field]
  return direction ? `data-flash-${direction}` : ''
}

function cardNumberValue(indicator: Indicator, column: IndicatorTableColumn) {
  if (props.guestMode && isGuestLockedIndicator(indicator.id)) return '🔒'
  const displayed = displayIndicatorValue(indicator, column)
  const numeric = parseIndicatorNumber(displayed)
  if (numeric === null) return displayed
  if (column.decimals !== undefined) return `${numeric.toFixed(column.decimals)}${displayed.endsWith('%') ? '%' : ''}`
  if (column.valueSuffix) return displayed
  return `${numeric.toFixed(2)}${displayed.endsWith('%') ? '%' : ''}`
}

function cardTitle(indicator: Indicator) {
  if (!props.titleColumn) return indicator.name
  const displayed = displayIndicatorValue(indicator, props.titleColumn)
  return displayed === '—' ? indicator.marketSymbol ?? indicator.id : displayed
}

function cardSubtitleParts(indicator: Indicator) {
  if (props.subtitleColumns?.length) {
    return props.subtitleColumns
      .map((column) => displayIndicatorValue(indicator, column))
      .filter((part) => part && part !== '—')
  }

  return [displayIndicatorGroup(indicator, props.columns), timeFrameLabel(indicator)].filter((part) => part && part !== '—')
}

function timeFrameLabel(indicator: Indicator) {
  return displayIndicatorTimeFrame(indicator.timeFrame)
}

function updatedLabel(indicator: Indicator, columns: IndicatorTableColumn[]) {
  const dateColumn = columns.find((column) => column.key === 'last_update' && column.kind === 'date')
  return dateColumn ? displayIndicatorValue(indicator, dateColumn) : indicator.updatedAt
}

function secondaryMetricClass(indicator: Indicator, column: IndicatorTableColumn) {
  if (props.guestMode && isGuestLockedIndicator(indicator.id)) return 'text-[var(--app-text-muted)]'
  if (column.kind !== 'change') return 'text-[var(--app-text)]'
  const value = parseIndicatorNumber(indicatorRawValue(indicator, column.key))
  if (value !== null && value < 0) return 'text-[var(--app-negative)]'
  if (value !== null && value > 0) return 'text-[var(--app-positive)]'
  return 'text-[var(--app-text)]'
}

function changeArrow(indicator: Indicator, column: IndicatorTableColumn) {
  if (props.guestMode && isGuestLockedIndicator(indicator.id)) return null
  if (!column.showChangeArrow) return null
  const value = parseIndicatorNumber(indicatorRawValue(indicator, column.key))
  if (value === null || value === 0) return null
  return value > 0 ? ArrowUp : ArrowDown
}

function footerMetricText(indicator: Indicator, column: IndicatorTableColumn) {
  if (props.guestMode && isGuestLockedIndicator(indicator.id)) return '🔒'
  if (column.showChangeArrow) {
    const value = parseIndicatorNumber(indicatorRawValue(indicator, column.key))
    if (value !== null && value !== 0) {
      const formatted = formatIndicatorNumber(Math.abs(value), column.decimals, column.trimTrailingZeros)
      return formatted === '—' || !column.valueSuffix ? formatted : `${formatted}${column.valueSuffix}`
    }
  }

  return cardNumberValue(indicator, column)
}
</script>

<template>
  <div v-if="loading" class="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] text-sm text-[var(--app-text-muted)]">
    Loading indicators...
  </div>

  <div v-else-if="!indicators.length" class="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] text-sm text-[var(--app-text-muted)]">
    No data
  </div>

  <div
    v-else
    class="indicator-card-grid grid gap-3"
    :class="layout === 'two-column' ? 'indicator-card-grid--two-column' : 'sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3'"
  >
    <article
      v-for="indicator in indicators"
      :key="indicator.id"
      class="min-w-0 overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--app-surface-soft)] hover:shadow-md"
    >
      <div class="flex items-start gap-2.5">
        <button
          v-if="showFavorite && !indicator.favoriteLocked"
          class="mt-0.5 shrink-0 transition"
          :class="indicator.favorite ? 'text-[var(--app-favorite)]' : 'text-[var(--app-text-secondary)] hover:text-[var(--app-favorite)]'"
          type="button"
          :title="favoriteActionLabel(indicator.favorite)"
          :aria-label="favoriteActionLabel(indicator.favorite)"
          @click.stop="$emit('favorite', indicator.id)"
        >
          <Star :size="18" :fill="indicator.favorite ? 'var(--app-favorite)' : 'transparent'" />
        </button>
        <span v-else-if="showFavorite" class="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <button class="line-clamp-2 text-left text-sm font-semibold leading-5 text-[var(--app-text)] transition hover:text-[var(--app-primary)] hover:underline" type="button" @click="$emit('open', indicator)">
            {{ cardTitle(indicator) }}
          </button>
          <p class="mt-1 text-xs text-[var(--app-text-muted)]">
            <template v-for="(part, index) in cardSubtitleParts(indicator)" :key="`${indicator.id}-${part}`">
              <span v-if="index > 0" class="mx-2">|</span>{{ part }}
            </template>
          </p>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-[minmax(74px,0.9fr)_minmax(74px,0.9fr)_minmax(120px,1fr)] items-end gap-4">
        <div>
          <p class="text-xs text-[var(--app-text-muted)]">{{ primaryMetricLabel }}</p>
          <p class="mt-2 text-lg font-bold leading-6 text-[var(--app-text)]"><span class="data-flash-number" :class="flashClass(indicator.id, 'primary')">{{ cardNumberValue(indicator, primaryMetricColumn) }}</span></p>
        </div>
        <div>
          <p class="text-xs text-[var(--app-text-muted)]">{{ secondaryMetricLabel }}</p>
          <p
            class="mt-2 text-lg font-bold"
            :class="secondaryMetricClass(indicator, secondaryMetricColumn)"
          >
            <span class="data-flash-number" :class="flashClass(indicator.id, 'secondary')">{{ cardNumberValue(indicator, secondaryMetricColumn) }}</span>
          </p>
        </div>
        <div class="flex justify-end">
          <span v-if="guestMode" class="text-sm text-[var(--app-text-muted)]" title="Sign in and subscribe to view recent charts">🔒</span>
          <IndicatorSparkline v-else :series="indicator.trendLines" :tone="indicatorTrendTone(indicator)" :width="145" :height="46" />
        </div>
      </div>

      <div v-if="showSentiment || footerMetricColumn || showUpdated" class="mt-3 flex items-center justify-between gap-3">
        <div v-if="footerMetricColumn" class="flex min-w-0 items-baseline gap-2">
          <span class="text-xs text-[var(--app-text-muted)]">{{ footerMetricLabel ?? footerMetricColumn.label }}</span>
          <span class="inline-flex min-w-0 items-center gap-1 truncate text-xs font-semibold" :class="secondaryMetricClass(indicator, footerMetricColumn)">
            <component :is="changeArrow(indicator, footerMetricColumn)" v-if="changeArrow(indicator, footerMetricColumn)" :size="13" aria-hidden="true" />
            {{ footerMetricText(indicator, footerMetricColumn) }}
          </span>
        </div>
        <div v-else-if="showSentiment" class="flex min-w-0 items-center gap-3">
          <span v-if="guestMode && isGuestLockedIndicator(indicator.id)" class="text-xs text-[var(--app-text-muted)]">🔒 Sentiment</span>
          <IndicatorSentimentMeter v-else :score="indicator.sentimentScore" />
          <span v-if="!guestMode || !isGuestLockedIndicator(indicator.id)" class="truncate text-xs font-medium" :class="sentimentTextClass(indicator.sentimentScore)">
            {{ sentimentLabelFromScore(indicator.sentimentScore) }}
          </span>
        </div>
        <span v-else aria-hidden="true" />
        <div v-if="showUpdated" class="flex shrink-0 items-center gap-3 text-xs text-[var(--app-text-muted)]">
          <span>Updated {{ updatedLabel(indicator, columns) }}</span>
        </div>
      </div>
    </article>
  </div>
</template>

<style scoped>
.data-flash-number { display: inline-block; border-radius: 3px; padding: 1px 2px; margin: -1px -2px; font-variant-numeric: tabular-nums; }
.data-flash-up { animation: data-flash-up 1.3s ease-out; }
.data-flash-down { animation: data-flash-down 1.3s ease-out; }
@keyframes data-flash-up { 0%, 22% { background: var(--app-value-flash-up); box-shadow: 0 0 0 3px var(--app-value-flash-up); } 100% { background: transparent; box-shadow: 0 0 0 3px transparent; } }
@keyframes data-flash-down { 0%, 22% { background: var(--app-value-flash-down); box-shadow: 0 0 0 3px var(--app-value-flash-down); } 100% { background: transparent; box-shadow: 0 0 0 3px transparent; } }
@media (prefers-reduced-motion: reduce) {
  .data-flash-up, .data-flash-down { animation: none; }
}
.indicator-card-grid--two-column {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  grid-template-rows: repeat(3, minmax(0, 1fr));
  width: 100%;
  height: 100%;
}
</style>

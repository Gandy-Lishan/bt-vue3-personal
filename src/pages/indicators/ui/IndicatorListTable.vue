<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, ArrowUp, ArrowUpDown, Star } from '@lucide/vue'
import { favoriteActionLabel } from '@/entities/indicator/model/indicator.favorites'
import {
  displayIndicatorValue,
  formatIndicatorNumber,
  indicatorRawValue,
  parseIndicatorNumber,
} from '@/entities/indicator/model/indicator.values'
import { indicatorTrendTone } from '@/entities/indicator/model/indicator.trends'
import type { IndicatorTableColumn } from '@/entities/indicator/model/indicator.table'
import type { Indicator, IndicatorSortDirection } from '@/entities/indicator/model/indicator.types'
import IndicatorSentimentMeter from './IndicatorSentimentMeter.vue'
import IndicatorSparkline from './IndicatorSparkline.vue'

const props = withDefaults(defineProps<{
  indicators: Indicator[]
  loading?: boolean
  columns: IndicatorTableColumn[]
  showFavorite?: boolean
  sortKey?: string
  sortDirection?: IndicatorSortDirection
  compact?: boolean
}>(), {
  showFavorite: true,
  sortKey: '',
  sortDirection: 'asc',
  compact: false,
})

defineEmits<{
  open: [indicator: Indicator]
  favorite: [id: string]
  sort: [column: IndicatorTableColumn]
}>()

const tableColspan = computed(() => props.columns.length + (props.showFavorite ? 1 : 0))

function displayValue(indicator: Indicator, column: IndicatorTableColumn) {
  return displayIndicatorValue(indicator, column)
}

function alignClass(column: IndicatorTableColumn) {
  if (column.align === 'right') return 'text-right'
  if (column.align === 'center') return 'text-center'
  return 'text-left'
}

function justifyClass(column: IndicatorTableColumn) {
  if (column.align === 'right') return 'justify-end'
  if (column.align === 'center') return 'justify-center'
  return 'justify-start'
}

function isSortable(column: IndicatorTableColumn) {
  return column.kind !== 'sparkline'
}

function columnMinWidth(column: IndicatorTableColumn) {
  if (!props.compact) return column.minWidth ?? 120

  const compactWidths: Record<string, number> = {
    chart_name: 300,
    sub_type: 90,
    groups: 90,
    timeframe: 86,
    last_value: 72,
    last_change: 78,
    last_update: 90,
    sentiment: 106,
    trend: 110,
  }

  const compactKindWidths: Record<string, number> = {
    name: 300,
    link: 300,
    text: 110,
    number: 86,
    change: 78,
    date: 90,
    sentiment: 106,
    sparkline: 110,
  }

  const width = compactWidths[column.key] ?? compactKindWidths[column.kind ?? 'text'] ?? column.minWidth ?? 120
  return Math.min(column.minWidth ?? width, width)
}

function isSorted(column: IndicatorTableColumn) {
  return props.sortKey === column.key
}

function sortAria(column: IndicatorTableColumn) {
  if (!isSortable(column)) return undefined
  if (!isSorted(column)) return 'none'
  return props.sortDirection === 'asc' ? 'ascending' : 'descending'
}

function sortButtonLabel(column: IndicatorTableColumn) {
  const nextDirection = isSorted(column) && props.sortDirection === 'asc' ? 'descending' : 'ascending'
  return `Sort by ${column.label} ${nextDirection}`
}

function sortIcon(column: IndicatorTableColumn) {
  if (!isSorted(column)) return ArrowUpDown
  return props.sortDirection === 'asc' ? ArrowUp : ArrowDown
}

function linkHref(indicator: Indicator) {
  // Read `url` straight off raw: the generic fallback maps it to the row id, which
  // is not a link target for rows whose id is a title.
  return String(indicator.raw?.url ?? '')
}

function changeTone(indicator: Indicator, column: IndicatorTableColumn) {
  if (column.kind !== 'change') return ''
  const value = parseIndicatorNumber(indicatorRawValue(indicator, column.key))
  if (value !== null && value < 0) return 'text-[var(--app-negative)]'
  if (value !== null && value > 0) return 'text-[var(--app-positive)]'
  return 'text-[var(--app-text)]'
}

function changeArrow(indicator: Indicator, column: IndicatorTableColumn) {
  if (!column.showChangeArrow) return null
  const value = parseIndicatorNumber(indicatorRawValue(indicator, column.key))
  if (value === null || value === 0) return null
  return value > 0 ? ArrowUp : ArrowDown
}

function directionalDisplayValue(indicator: Indicator, column: IndicatorTableColumn) {
  if (!column.showChangeArrow) return displayValue(indicator, column)

  const value = parseIndicatorNumber(indicatorRawValue(indicator, column.key))
  if (value === null || value === 0) return displayValue(indicator, column)

  const formatted = formatIndicatorNumber(Math.abs(value), column.decimals, column.trimTrailingZeros)
  return formatted === '—' || !column.valueSuffix ? formatted : `${formatted}${column.valueSuffix}`
}
</script>

<template>
  <div class="overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)]">
    <div class="overflow-x-auto">
      <table class="min-w-full border-collapse text-left text-[0.8125rem] text-[var(--app-text)]">
        <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold">
          <tr class="border-b border-[var(--app-border)]">
            <th
              v-if="props.showFavorite"
              class="box-border py-2.5 text-center text-[var(--app-text-faint)]"
              :class="props.compact ? 'w-9 px-2' : 'w-11 px-3'"
            >
              ☆
            </th>
            <th
              v-for="column in props.columns"
              :key="column.key"
              scope="col"
              class="box-border py-2.5"
              :class="[props.compact ? 'px-2' : 'px-3', alignClass(column)]"
              :style="{ minWidth: `${columnMinWidth(column)}px` }"
              :aria-sort="sortAria(column)"
            >
              <button
                v-if="isSortable(column)"
                class="inline-flex w-full items-center gap-1 text-[0.6875rem] font-semibold transition hover:text-[var(--app-primary)]"
                :class="[justifyClass(column), isSorted(column) ? 'text-[var(--app-primary)]' : 'text-[var(--app-text)]']"
                type="button"
                :aria-label="sortButtonLabel(column)"
                @click="$emit('sort', column)"
              >
                <span>{{ column.label }}</span>
                <component :is="sortIcon(column)" :size="13" aria-hidden="true" />
              </button>
              <span v-else>{{ column.label }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="props.loading">
            <td :colspan="tableColspan" class="h-64 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
              Loading indicators...
            </td>
          </tr>
          <tr v-else-if="!props.indicators.length">
            <td :colspan="tableColspan" class="h-64 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
              No data
            </td>
          </tr>
          <template v-else>
            <tr
              v-for="indicator in props.indicators"
              :key="indicator.id"
              class="border-b border-[var(--app-border-muted)] odd:bg-[var(--app-surface)] even:bg-[var(--app-row-even)] last:border-b-0 hover:bg-[var(--app-surface-hover)]"
            >
              <td
                v-if="props.showFavorite"
                class="box-border py-2.5 text-center"
                :class="props.compact ? 'px-2' : 'px-3'"
              >
                <span
                  v-if="indicator.favoriteLocked"
                  class="inline-flex h-[18px] w-[18px]"
                  aria-hidden="true"
                />
                <button
                  v-else
                  class="inline-flex transition"
                  :class="indicator.favorite ? 'text-[var(--app-favorite)]' : 'text-[var(--app-text-secondary)] hover:text-[var(--app-favorite)]'"
                  type="button"
                  :title="favoriteActionLabel(indicator.favorite)"
                  :aria-label="favoriteActionLabel(indicator.favorite)"
                  @click.stop="$emit('favorite', indicator.id)"
                >
                  <Star :size="18" :fill="indicator.favorite ? 'var(--app-favorite)' : 'transparent'" />
                </button>
              </td>
              <td
                v-for="column in props.columns"
                :key="column.key"
                class="box-border py-2.5"
                :class="[props.compact ? 'px-2' : 'px-3', alignClass(column), changeTone(indicator, column)]"
              >
                <button
                  v-if="column.kind === 'name'"
                  class="text-left font-semibold text-[var(--app-text)] transition hover:text-[var(--app-primary)] hover:underline"
                  type="button"
                  @click="$emit('open', indicator)"
                >
                  {{ displayValue(indicator, column) }}
                </button>
                <template v-else-if="column.kind === 'link'">
                  <a
                    v-if="linkHref(indicator)"
                    class="font-semibold text-[var(--app-primary)] hover:underline"
                    :href="linkHref(indicator)"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {{ displayValue(indicator, column) }}
                  </a>
                  <span v-else>{{ displayValue(indicator, column) }}</span>
                </template>
                <IndicatorSentimentMeter v-else-if="column.kind === 'sentiment'" :score="indicator.sentimentScore" :compact="props.compact" />
                <IndicatorSparkline
                  v-else-if="column.kind === 'sparkline'"
                  :series="indicator.trendLines"
                  :tone="indicatorTrendTone(indicator)"
                  :width="props.compact ? 104 : 128"
                />
                <span
                  v-else-if="column.kind === 'change' && column.showChangeArrow"
                  class="inline-flex items-center gap-1"
                  :class="justifyClass(column)"
                >
                  <component :is="changeArrow(indicator, column)" v-if="changeArrow(indicator, column)" :size="13" aria-hidden="true" />
                  <span>{{ directionalDisplayValue(indicator, column) }}</span>
                </span>
                <span v-else>{{ displayValue(indicator, column) }}</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

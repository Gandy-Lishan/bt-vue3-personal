<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, ArrowUp, ArrowUpDown, Star } from '@lucide/vue'
import { favoriteActionLabel } from '@/entities/indicator/model/indicator.favorites'
import { displayIndicatorValue, indicatorRawValue } from '@/entities/indicator/model/indicator.values'
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
}>(), {
  showFavorite: true,
  sortKey: '',
  sortDirection: 'asc',
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
  const value = Number(String(indicatorRawValue(indicator, column.key)).replace('%', ''))
  if (value < 0) return 'text-[var(--app-negative)]'
  if (value > 0) return 'text-[var(--app-positive)]'
  return 'text-[var(--app-text)]'
}
</script>

<template>
  <div class="overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)]">
    <div class="overflow-x-auto">
      <table class="min-w-full border-collapse text-left text-[13px] text-[var(--app-text)]">
        <thead class="bg-[var(--app-surface-muted)] text-[11px] font-semibold">
          <tr class="border-b border-[var(--app-border)]">
            <th v-if="props.showFavorite" class="w-11 px-3 py-2.5 text-center text-[var(--app-text-faint)]">☆</th>
            <th
              v-for="column in props.columns"
              :key="column.key"
              scope="col"
              class="px-3 py-2.5"
              :class="alignClass(column)"
              :style="{ minWidth: `${column.minWidth ?? 120}px` }"
              :aria-sort="sortAria(column)"
            >
              <button
                v-if="isSortable(column)"
                class="inline-flex w-full items-center gap-1 text-[11px] font-semibold transition hover:text-[var(--app-primary)]"
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
              <td v-if="props.showFavorite" class="px-3 py-2.5 text-center">
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
                class="px-3 py-2.5"
                :class="[alignClass(column), changeTone(indicator, column)]"
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
                <IndicatorSentimentMeter v-else-if="column.kind === 'sentiment'" :score="indicator.sentimentScore" />
                <IndicatorSparkline v-else-if="column.kind === 'sparkline'" :series="indicator.trendLines" :tone="indicatorTrendTone(indicator)" />
                <span v-else>{{ displayValue(indicator, column) }}</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

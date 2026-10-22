<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, Minus } from '@lucide/vue'
import { activeStudyTimeframeLabel } from '@/entities/active-study/model/active-study.adapter'
import type { ActiveStudyRow, ActiveStudySortKey } from '@/entities/active-study/model/active-study.types'
import type { IndicatorSortDirection } from '@/entities/indicator/model/indicator.types'

const props = withDefaults(defineProps<{
  rows: ActiveStudyRow[]
  loading?: boolean
  sortKey?: ActiveStudySortKey | ''
  sortDirection?: IndicatorSortDirection
}>(), {
  loading: false,
  sortKey: '',
  sortDirection: 'asc',
})

defineEmits<{ sort: [key: ActiveStudySortKey] }>()

const columns: Array<{ key: ActiveStudySortKey; label: string; minWidth: number; align?: 'center' }> = [
  { key: 'date', label: 'Date', minWidth: 130 },
  { key: 'title', label: 'Study Title', minWidth: 420 },
  { key: 'market', label: 'Market', minWidth: 140 },
  { key: 'forecast', label: 'Forecast', minWidth: 120, align: 'center' },
  { key: 'timeframe', label: 'Timeframe', minWidth: 150 },
]

const tableColspan = computed(() => columns.length)

function sortIcon(key: ActiveStudySortKey) {
  if (props.sortKey !== key) return ArrowUpDown
  return props.sortDirection === 'asc' ? ArrowUp : ArrowDown
}

function forecastIcon(forecast: string) {
  const normalized = forecast.toLowerCase()
  if (normalized === 'up') return ArrowUp
  if (normalized === 'down') return ArrowDown
  return Minus
}

function forecastClass(forecast: string) {
  const normalized = forecast.toLowerCase()
  if (normalized === 'up') return 'text-[var(--app-positive)]'
  if (normalized === 'down') return 'text-[var(--app-negative)]'
  return 'text-[var(--app-text-muted)]'
}
</script>

<template>
  <div class="overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)]">
    <div class="overflow-x-auto">
      <table class="min-w-full border-collapse text-left text-[0.8125rem] text-[var(--app-text)]">
        <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold">
          <tr class="border-b border-[var(--app-border)]">
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              class="box-border px-3 py-2.5"
              :class="column.align === 'center' ? 'text-center' : 'text-left'"
              :style="{ minWidth: `calc(${column.minWidth}px * var(--fixed-ui-scale, 1))` }"
              :aria-sort="props.sortKey === column.key ? (props.sortDirection === 'asc' ? 'ascending' : 'descending') : undefined"
            >
              <button
                class="inline-flex w-full items-center gap-1 font-semibold transition hover:text-[var(--app-primary)]"
                :class="[
                  column.align === 'center' ? 'justify-center' : 'justify-start',
                  props.sortKey === column.key ? 'text-[var(--app-primary)]' : 'text-[var(--app-text)]',
                ]"
                type="button"
                @click="$emit('sort', column.key)"
              >
                {{ column.label }}
                <component :is="sortIcon(column.key)" :size="13" aria-hidden="true" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="props.loading">
            <td :colspan="tableColspan" class="h-64 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
              Loading active studies...
            </td>
          </tr>
          <tr v-else-if="!props.rows.length">
            <td :colspan="tableColspan" class="h-64 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
              No active studies found
            </td>
          </tr>
          <tr
            v-for="row in props.rows"
            v-else
            :key="row.id"
            class="border-b border-[var(--app-border-muted)] odd:bg-[var(--app-surface)] even:bg-[var(--app-row-even)] last:border-b-0 hover:bg-[var(--app-surface-hover)]"
          >
            <td class="whitespace-nowrap px-3 py-3 font-semibold text-[var(--app-text-secondary)]">{{ row.date || '—' }}</td>
            <td class="px-3 py-3">
              <a
                v-if="row.href"
                :href="row.href"
                class="group inline-flex items-center gap-1.5 font-extrabold text-[var(--app-primary)] hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ row.title }}
                <ArrowRight :size="14" class="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
              </a>
              <span v-else class="font-extrabold">{{ row.title }}</span>
            </td>
            <td class="px-3 py-3 font-semibold uppercase">{{ row.market }}</td>
            <td class="px-3 py-3 text-center">
              <span
                class="inline-flex items-center justify-center"
                :class="forecastClass(row.forecast)"
                :title="row.forecast || 'Flat'"
              >
                <component :is="forecastIcon(row.forecast)" :size="17" aria-hidden="true" />
              </span>
            </td>
            <td class="whitespace-nowrap px-3 py-3 font-semibold">{{ activeStudyTimeframeLabel(row.timeframe) || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>


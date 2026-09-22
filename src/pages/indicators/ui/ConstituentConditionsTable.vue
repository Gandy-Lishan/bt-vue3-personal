<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, ArrowUp, ArrowUpDown } from '@lucide/vue'
import { constituentCellValue } from '@/entities/indicator/model/indicator.constituents'
import type { ConstituentColumn } from '@/entities/indicator/model/indicator.constituents'
import type { IndicatorSortDirection } from '@/entities/indicator/model/indicator.types'
import type { IndicatorConstituentRow } from '@/entities/indicator/model/indicator.types'

const props = withDefaults(defineProps<{
  rows: IndicatorConstituentRow[]
  columns: ConstituentColumn[]
  loading?: boolean
  sortKey?: string
  sortDirection?: IndicatorSortDirection
}>(), {
  loading: false,
  sortKey: '',
  sortDirection: 'asc',
})

defineEmits<{
  sort: [column: ConstituentColumn]
}>()

const tableColspan = computed(() => props.columns.length)

function isSorted(column: ConstituentColumn) {
  return props.sortKey === column.key
}

function sortAria(column: ConstituentColumn) {
  if (!isSorted(column)) return 'none'
  return props.sortDirection === 'asc' ? 'ascending' : 'descending'
}

function sortButtonLabel(column: ConstituentColumn) {
  const nextDirection = isSorted(column) && props.sortDirection === 'asc' ? 'descending' : 'ascending'
  return `Sort by ${column.label} ${nextDirection}`
}

function sortIcon(column: ConstituentColumn) {
  if (!isSorted(column)) return ArrowUpDown
  return props.sortDirection === 'asc' ? ArrowUp : ArrowDown
}

function alignClass(_column: ConstituentColumn) {
  return 'text-left'
}

function justifyClass(_column: ConstituentColumn) {
  return 'justify-start'
}
</script>

<template>
  <div class="overflow-hidden rounded-md border border-[var(--app-border-muted)] bg-[var(--app-surface)]">
    <div class="overflow-x-auto">
      <table class="min-w-full border-collapse text-left text-[0.8125rem] text-[var(--app-text)]">
        <thead class="bg-[var(--app-surface-muted)] text-[0.6875rem] font-semibold">
          <tr class="border-b border-[var(--app-border)]">
            <th
              v-for="column in props.columns"
              :key="column.key"
              scope="col"
              class="px-3 py-2.5"
              :class="alignClass(column)"
              :style="{ minWidth: '120px' }"
              :aria-sort="sortAria(column)"
            >
              <button
                class="inline-flex w-full items-center gap-1 text-[0.6875rem] font-semibold transition hover:text-[var(--app-primary)]"
                :class="[justifyClass(column), isSorted(column) ? 'text-[var(--app-primary)]' : 'text-[var(--app-text)]']"
                type="button"
                :aria-label="sortButtonLabel(column)"
                @click="$emit('sort', column)"
              >
                <span>{{ column.label }}</span>
                <component :is="sortIcon(column)" :size="13" aria-hidden="true" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="props.loading">
            <td :colspan="tableColspan" class="h-64 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
              Loading...
            </td>
          </tr>
          <tr v-else-if="!props.rows.length">
            <td :colspan="tableColspan" class="h-64 px-4 py-12 text-center text-sm text-[var(--app-text-muted)]">
              No data
            </td>
          </tr>
          <template v-else>
            <tr
              v-for="(row, rowIndex) in props.rows"
              :key="rowIndex"
              class="border-b border-[var(--app-border-muted)] odd:bg-[var(--app-surface)] even:bg-[var(--app-row-even)] last:border-b-0 hover:bg-[var(--app-surface-hover)]"
            >
              <td
                v-for="column in props.columns"
                :key="column.key"
                class="px-3 py-2.5"
                :class="alignClass(column)"
              >
                {{ constituentCellValue(row, column) }}
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

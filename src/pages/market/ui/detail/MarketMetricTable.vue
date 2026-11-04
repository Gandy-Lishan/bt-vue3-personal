<script setup lang="ts">
import { computed } from 'vue'
import type { MarketMetric } from '@/entities/market/model/market-detail.types'
import MarketInfoHint from './MarketInfoHint.vue'

const props = withDefaults(
  defineProps<{
    rows: MarketMetric[]
    title?: string
    highlightLast?: boolean
    transpose?: boolean
    loading?: boolean
    emptyMessage?: string
  }>(),
  {
    title: '',
    highlightLast: false,
    transpose: false,
    loading: false,
    emptyMessage: 'No data available',
  },
)

const visibleRows = computed(() => {
  const rows = props.rows
  if (rows.length === 0) return rows
  if (rows.every((r) => r.zero)) return []
  return rows
})
</script>

<template>
  <div v-if="loading" class="flex h-24 items-center justify-center text-sm italic text-[var(--app-text-muted)]">
    Loading data...
  </div>

  <p v-else-if="visibleRows.length === 0" class="py-6 text-center text-sm italic text-[var(--app-text-muted)]">
    {{ emptyMessage }}
  </p>

  <div v-else class="w-full">
    <!-- Title -->
    <h4 v-if="title" class="mb-2 text-xs font-extrabold text-[var(--app-text)]">{{ title }}</h4>

    <!-- Standard layout -->
    <div v-if="!transpose" class="divide-y divide-[var(--app-border-muted)] border border-[var(--app-border-muted)] rounded-md">
      <div
        v-for="(row, index) in visibleRows"
        :key="row.label"
        class="flex items-center justify-between px-3 py-2 text-sm"
        :class="highlightLast && index === visibleRows.length - 1 ? 'bg-[var(--app-surface-muted)]' : ''"
      >
        <span class="inline-flex items-center gap-1.5 font-semibold text-[var(--app-text-secondary)] whitespace-nowrap">
          {{ row.label }}
          <MarketInfoHint v-if="row.description" :text="row.description" />
        </span>
        <span
          class="font-extrabold whitespace-nowrap"
          :class="{
            'text-[var(--app-positive)]': row.tone === 'positive',
            'text-[var(--app-negative)]': row.tone === 'negative',
          }"
        >
          {{ row.value }}
        </span>
      </div>
    </div>

    <!-- Transposed layout -->
    <div v-else class="w-full border border-[var(--app-border-muted)] rounded-md p-3">
      <!-- Labels row -->
      <div class="flex items-end gap-3 border-b border-[var(--app-border-muted)] pb-2">
        <div
          v-for="row in visibleRows"
          :key="`label-${row.label}`"
          class="flex-1 text-xs font-semibold text-[var(--app-text-secondary)] whitespace-nowrap"
        >
          <span class="inline-flex items-center gap-1">
            {{ row.label }}
            <MarketInfoHint v-if="row.description" :text="row.description" />
          </span>
        </div>
      </div>
      <!-- Values row -->
      <div class="flex items-center gap-3 pt-2" :class="highlightLast ? 'bg-[var(--app-surface-muted)] -mx-3 px-3' : ''">
        <div
          v-for="row in visibleRows"
          :key="`value-${row.label}`"
          class="flex-1 font-extrabold whitespace-nowrap text-sm"
          :class="{
            'text-[var(--app-positive)]': row.tone === 'positive',
            'text-[var(--app-negative)]': row.tone === 'negative',
          }"
        >
          {{ row.value }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IndicatorSection } from '@/entities/indicator/model/indicator.types'

defineProps<{
  active: IndicatorSection
}>()

defineEmits<{
  change: [section: IndicatorSection]
}>()

const tabs: Array<{ id: IndicatorSection; label: string }> = [
  { id: 'indicators', label: 'Indicators' },
  { id: 'popular', label: 'Most Popular' },
  { id: 'favorites', label: 'My Favorites' },
]
</script>

<template>
  <div class="flex items-center justify-between border-b border-[var(--app-border)]">
    <div class="flex gap-6">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="h-12 border-b-2 text-sm font-semibold"
        :class="active === tab.id ? 'border-[var(--app-primary)] text-[var(--app-primary)]' : 'border-transparent text-[var(--app-text)] hover:text-[var(--app-primary)]'"
        @click="$emit('change', tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>
    <slot />
  </div>
</template>

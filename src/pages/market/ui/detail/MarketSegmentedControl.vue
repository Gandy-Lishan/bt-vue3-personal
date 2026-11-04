<script setup lang="ts">
import MarketInfoHint from './MarketInfoHint.vue'

export interface MarketSegmentOption {
  label: string
  value: string
  description?: string
}

const props = defineProps<{
  modelValue: string
  options: MarketSegmentOption[]
  ariaLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <nav
    class="flex items-center gap-6 border-b border-[var(--app-border)] px-1 pb-0"
    role="group"
    :aria-label="ariaLabel"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="option.value === modelValue"
      class="relative flex items-center gap-1.5 px-1 pb-3 pt-2 text-[0.8125rem] font-semibold transition-colors"
      :class="
        option.value === modelValue
          ? 'text-[var(--app-primary)]'
          : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
      "
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
      <MarketInfoHint v-if="option.description" :text="option.description" />
      <span
        v-if="option.value === modelValue"
        class="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--app-primary)]"
      />
    </button>
  </nav>
</template>

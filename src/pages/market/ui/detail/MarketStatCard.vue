<script setup lang="ts">
import MarketInfoHint from './MarketInfoHint.vue'

const props = defineProps<{
  title: string
  description?: string
  value: string
  loading?: boolean
  tone?: 'positive' | 'negative' | 'neutral'
  borderless?: boolean
  centered?: boolean
}>()
</script>

<template>
  <div class="flex flex-col rounded-lg h-full" :class="props.borderless ? 'bg-[var(--app-surface)] p-4' : 'border border-[var(--app-border)] bg-[var(--app-surface)] p-4'">
    <div class="flex items-center gap-1.5" :class="centered ? 'justify-center' : ''">
      <h3 class="text-base font-extrabold">{{ title }}</h3>
      <MarketInfoHint v-if="description" :text="description" />
    </div>
    <div class="mt-3 flex-1 flex items-center" :class="centered ? 'justify-center' : ''">
      <p v-if="loading" class="text-sm italic text-[var(--app-text-muted)]">Loading...</p>
      <p v-else class="text-lg font-extrabold" :class="{
        'text-[var(--app-positive)]': tone === 'positive',
        'text-[var(--app-negative)]': tone === 'negative',
      }">{{ value }}</p>
    </div>
  </div>
</template>

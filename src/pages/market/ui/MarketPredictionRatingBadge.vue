<script setup lang="ts">
import { computed } from 'vue'
import type { MarketPredictionRatingCategory } from '@/entities/market/model/market-prediction.types'

const props = defineProps<{
  rating: string
  category: MarketPredictionRatingCategory
}>()

const isStrongBuy = computed(() => props.category === 'buy' && props.rating.toLowerCase() === 'strong buy')

const toneClass = computed(() => {
  if (isStrongBuy.value) return 'mp-rating-badge--strong-buy'
  if (props.category === 'buy') return 'mp-rating-badge--buy'
  if (props.category === 'hold') return 'mp-rating-badge--hold'
  if (props.category === 'sell') return 'mp-rating-badge--sell'
  return 'mp-rating-badge--other'
})
</script>

<template>
  <span class="inline-flex min-w-20 justify-center rounded-md px-2.5 py-1 text-xs font-extrabold" :class="toneClass">
    {{ rating }}
  </span>
</template>

<style scoped>
/* Moods via semantic tokens so buy/sell adapt to light and dark together. */
.mp-rating-badge--buy {
  background: color-mix(in srgb, var(--app-positive) 14%, transparent);
  color: var(--app-positive);
}

.mp-rating-badge--strong-buy {
  background: var(--app-positive);
  color: #ffffff;
}

.mp-rating-badge--hold {
  background: color-mix(in srgb, var(--app-text-muted) 14%, transparent);
  color: var(--app-text-secondary);
}

.mp-rating-badge--sell {
  background: color-mix(in srgb, var(--app-negative) 14%, transparent);
  color: var(--app-negative);
}

.mp-rating-badge--other {
  background: var(--app-surface-muted);
  color: var(--app-text-muted);
}
</style>
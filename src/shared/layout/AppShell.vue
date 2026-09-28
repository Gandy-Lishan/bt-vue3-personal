<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useIndicatorStore } from '@/entities/indicator/model/indicator.store'
import AppToastStack from '@/shared/ui/AppToastStack.vue'
import SentimentFooter from './SentimentFooter.vue'
import SentimentHeader from './SentimentHeader.vue'

const store = useIndicatorStore()
const route = useRoute()

watch(
  () => route.meta.needsIndicatorFavorites,
  (needsIndicatorFavorites) => {
    if (needsIndicatorFavorites) void store.ensureFavorites()
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[var(--app-bg)] text-[var(--app-text)]">
    <SentimentHeader />
    <div class="flex-1">
      <slot />
    </div>
    <SentimentFooter />
    <AppToastStack />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useIndicatorStore } from '@/entities/indicator/model/indicator.store'
import AppToastStack from '@/shared/ui/AppToastStack.vue'
import SentimentFooter from './SentimentFooter.vue'
import SentimentHeader from './SentimentHeader.vue'

const store = useIndicatorStore()

// Favorites drive the star on both the list and detail pages, so load them once here.
onMounted(() => {
  void store.ensureFavorites()
})
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

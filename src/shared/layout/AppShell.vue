<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useIndicatorStore } from '@/entities/indicator/model/indicator.store'
import AppToastStack from '@/shared/ui/AppToastStack.vue'
import MobileAppBanner from './MobileAppBanner.vue'
import MobileAppModal from './MobileAppModal.vue'
import MobileHeader from './MobileHeader.vue'
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
  <div class="flex min-h-screen flex-col bg-[var(--app-bg)] text-[var(--app-text)] md:pb-0 pb-20">
    <!-- Desktop Header -->
    <SentimentHeader class="hidden md:block" />
    <!-- Mobile Header -->
    <MobileHeader class="md:hidden" />

    <div class="flex-1 mt-14 md:mt-0">
      <slot />
    </div>
    <SentimentFooter />
    <AppToastStack />
    <!-- Mobile App Download Components -->
    <MobileAppBanner />
    <MobileAppModal />
  </div>
</template>

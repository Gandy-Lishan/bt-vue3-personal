<script setup lang="ts">
import { Info } from '@lucide/vue'

defineProps<{
  text: string
}>()
</script>

<template>
  <span
    class="app-tooltip shrink-0"
    :data-tooltip="text"
    :aria-label="text"
    tabindex="0"
  >
    <Info :size="14" aria-hidden="true" />
  </span>
</template>

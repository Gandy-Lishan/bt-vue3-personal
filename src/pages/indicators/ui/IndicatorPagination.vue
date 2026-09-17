<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  page: number
  pageCount: number
}>()

defineEmits<{
  change: [page: number]
}>()

const visiblePages = computed(() =>
  Array.from({ length: Math.min(5, props.pageCount) }, (_, index) => index + 1),
)

const showLastPage = computed(() => props.pageCount > 5)
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      class="h-10 w-10 rounded-md border border-[var(--app-border)] text-[var(--app-text-secondary)] disabled:opacity-40"
      type="button"
      :disabled="page === 1"
      @click="$emit('change', page - 1)"
    >
      ‹
    </button>
    <button
      v-for="item in visiblePages"
      :key="item"
      class="h-10 w-10 rounded-md border border-[var(--app-border)] text-sm font-semibold"
      :class="item === page ? 'selected-fill-button bg-[var(--app-primary)]' : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)]'"
      type="button"
      @click="$emit('change', item)"
    >
      {{ item }}
    </button>
    <span v-if="showLastPage" class="px-2 text-[var(--app-text-secondary)]">...</span>
    <button
      v-if="showLastPage"
      class="h-10 min-w-12 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm font-semibold text-[var(--app-text-secondary)]"
      type="button"
      @click="$emit('change', pageCount)"
    >
      {{ pageCount }}
    </button>
    <button
      class="h-10 w-10 rounded-md border border-[var(--app-border)] text-[var(--app-text-secondary)] disabled:opacity-40"
      type="button"
      :disabled="page >= pageCount"
      @click="$emit('change', page + 1)"
    >
      ›
    </button>
  </div>
</template>

<style scoped>
.selected-fill-button {
  color: #ffffff !important;
}
</style>

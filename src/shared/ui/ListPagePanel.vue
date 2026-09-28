<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <section class="min-w-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]">
    <header class="flex flex-col gap-3 border-b border-[var(--app-border)] px-4 py-4 xl:flex-row xl:items-start xl:justify-between">
      <div class="min-w-0">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <h2 class="text-3xl font-semibold leading-tight text-[var(--app-text)]">{{ title }}</h2>
          <slot name="title-actions" />
        </div>
        <p class="mt-1 text-sm text-[var(--app-text-muted)]">{{ description }}</p>
      </div>

      <div v-if="$slots.summary" class="flex shrink-0 flex-wrap items-center gap-2 text-xs font-semibold">
        <slot name="summary" />
      </div>
    </header>

    <slot name="tabs" />
    <slot name="filters" />
    <slot name="notice" />
    <slot />

    <div v-if="$slots.footer" class="border-t border-[var(--app-border)] px-4 py-3">
      <slot name="footer" />
    </div>
  </section>
</template>

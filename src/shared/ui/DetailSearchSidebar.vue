<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { Search } from '@lucide/vue'

export interface DetailSearchSidebarItem {
  id: string
  label: string
  to: RouteLocationRaw
  active?: boolean
  [key: string]: unknown
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    title: string
    placeholder: string
    emptyMessage: string
    items: DetailSearchSidebarItem[]
    height?: string
  }>(),
  {
    height: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'item-click': [item: DetailSearchSidebarItem]
}>()
</script>

<template>
  <aside
    class="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4"
    :style="props.height ? { height: props.height } : undefined"
  >
    <label class="mb-10 flex h-10 shrink-0 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3">
      <input
        class="w-full bg-transparent text-sm outline-none"
        :value="props.modelValue"
        :placeholder="props.placeholder"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <Search :size="18" class="ml-2 shrink-0 text-[var(--app-text-secondary)]" />
    </label>

    <h3 class="mb-2 shrink-0 text-sm font-semibold">{{ props.title }}</h3>
    <div class="min-h-0 flex-1 overflow-y-auto pr-1">
      <div
        v-for="item in props.items"
        :key="item.id"
        class="flex items-start gap-2 border-b border-[var(--app-border-muted)] px-2 py-2 text-sm leading-5"
        :class="{ 'border-l-4 border-l-[var(--app-primary)] bg-[var(--app-primary-soft)] pl-2 font-semibold': item.active }"
      >
        <RouterLink
          class="line-clamp-2 min-w-0 flex-1 hover:text-[var(--app-primary)]"
          :class="item.active ? 'text-[var(--app-primary)]' : 'text-[var(--app-text-secondary)]'"
          :to="item.to"
          @click="emit('item-click', item)"
        >
          {{ item.label }}
        </RouterLink>

        <slot name="action" :item="item" />
      </div>
      <p v-if="!props.items.length" class="py-8 text-center text-sm text-[var(--app-text-muted)]">{{ props.emptyMessage }}</p>
    </div>
  </aside>
</template>

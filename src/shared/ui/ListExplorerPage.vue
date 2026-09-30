<script setup lang="ts">
import { computed } from 'vue'
import ListPageHeader from './ListPageHeader.vue'
import ListPagePanel from './ListPagePanel.vue'
import type { IndicatorAd } from '@/entities/indicator/model/indicator.ads'
import type { ListExplorerViewMode } from './list-page.types'

const props = withDefaults(
  defineProps<{
    title: string
    description: string
    panelTitle: string
    panelDescription: string
    viewMode?: ListExplorerViewMode
    showViewModeToggle?: boolean
    ads?: IndicatorAd[]
    sidebarWidth?: string
    contentClass?: string
  }>(),
  {
    viewMode: 'table',
    showViewModeToggle: true,
    ads: () => [],
    sidebarWidth: '220px',
    contentClass: '',
  },
)

const emit = defineEmits<{
  'update:viewMode': [value: ListExplorerViewMode]
}>()

const layoutStyle = computed(() => ({ '--list-explorer-sidebar': props.sidebarWidth }))
</script>

<template>
  <div class="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
    <main class="px-[var(--page-gutter)] pb-8 pt-8">
      <ListPageHeader
        :title="props.title"
        :description="props.description"
        :view-mode="props.viewMode"
        :show-view-mode-toggle="props.showViewModeToggle"
        :ads="props.ads"
        @update:view-mode="emit('update:viewMode', $event)"
      />

      <div
        class="grid gap-4"
        :class="$slots.sidebar ? 'xl:grid-cols-[var(--list-explorer-sidebar)_minmax(0,1fr)]' : ''"
        :style="layoutStyle"
      >
        <slot name="sidebar" />

        <ListPagePanel :title="props.panelTitle" :description="props.panelDescription" :class="props.contentClass">
          <template v-if="$slots['title-actions']" #title-actions>
            <slot name="title-actions" />
          </template>
          <template v-if="$slots.summary" #summary>
            <slot name="summary" />
          </template>
          <template v-if="$slots.tabs" #tabs>
            <slot name="tabs" />
          </template>
          <template v-if="$slots.filters" #filters>
            <slot name="filters" />
          </template>
          <template v-if="$slots.notice" #notice>
            <slot name="notice" />
          </template>

          <slot />

          <template v-if="$slots.footer" #footer>
            <slot name="footer" />
          </template>
        </ListPagePanel>
      </div>
    </main>

    <slot name="overlays" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Menu, X } from '@lucide/vue'
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
    hidePanelHeader?: boolean
  }>(),
  {
    viewMode: 'table',
    showViewModeToggle: true,
    ads: () => [],
    sidebarWidth: '220px',
    contentClass: '',
    hidePanelHeader: false,
  },
)

const emit = defineEmits<{
  'update:viewMode': [value: ListExplorerViewMode]
}>()

const layoutStyle = computed(() => ({ '--list-explorer-sidebar': props.sidebarWidth }))
const isMobileSidebarOpen = ref(false)
const isMobileFiltersOpen = ref(false)
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

      <!-- Mobile: Sidebar toggle button -->
      <div v-if="$slots.sidebar" class="xl:hidden mb-3">
        <button
          @click="isMobileSidebarOpen = true"
          class="flex w-full items-center gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-left transition hover:border-[var(--app-primary)]"
          type="button"
        >
          <Menu :size="20" class="text-[var(--app-text-secondary)]" />
          <span class="flex-1 text-sm font-medium text-[var(--app-text)]">Filters & Categories</span>
        </button>
      </div>

      <div
        class="grid grid-cols-1 gap-4"
        :class="$slots.sidebar ? 'xl:grid-cols-[var(--list-explorer-sidebar)_minmax(0,1fr)]' : ''"
        :style="layoutStyle"
      >
        <!-- Desktop Sidebar (xl and above) -->
        <div class="hidden xl:block">
          <slot name="sidebar" />
        </div>

        <ListPagePanel :title="props.panelTitle" :description="props.panelDescription" :hide-header="props.hidePanelHeader" :class="props.contentClass">
          <template v-if="$slots['title-actions']" #title-actions>
            <slot name="title-actions" />
          </template>
          <template v-if="$slots.summary" #summary>
            <slot name="summary" />
          </template>
          <template v-if="$slots.tabs" #tabs>
            <slot name="tabs" />
          </template>

          <!-- Filters with mobile toggle -->
          <template v-if="$slots.filters" #filters>
            <!-- Desktop filters (xl and above) -->
            <div class="hidden xl:block">
              <slot name="filters" />
            </div>

            <!-- Mobile filters toggle -->
            <div class="xl:hidden px-4 py-3">
              <button
                @click="isMobileFiltersOpen = !isMobileFiltersOpen"
                class="flex w-full h-10 items-center justify-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] text-sm text-[var(--app-text-secondary)] transition hover:border-[var(--app-primary)] hover:text-[var(--app-primary)]"
                type="button"
              >
                <svg :class="{ 'rotate-180': isMobileFiltersOpen }" class="transition-transform" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
                Filters & Sort
              </button>

              <!-- Expanded filters -->
              <div v-if="isMobileFiltersOpen" class="mt-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
                <slot name="filters" />
              </div>
            </div>
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

    <!-- Mobile Sidebar Drawer -->
    <Teleport v-if="$slots.sidebar" to="body">
      <Transition
        enter-active-class="transition duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="isMobileSidebarOpen" class="xl:hidden fixed inset-0 z-50">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="isMobileSidebarOpen = false" />
          <Transition
            enter-active-class="transition duration-300 transform"
            enter-from-class="-translate-x-full"
            enter-to-class="translate-x-0"
            leave-active-class="transition duration-200 transform"
            leave-from-class="translate-x-0"
            leave-to-class="-translate-x-full"
          >
            <div class="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-[var(--app-surface)] shadow-xl overflow-y-auto">
              <div class="sticky top-0 z-10 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 flex items-center justify-between">
                <h2 class="text-base font-semibold text-[var(--app-text)]">Filters & Categories</h2>
                <button
                  @click="isMobileSidebarOpen = false"
                  class="p-2 rounded-md text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]"
                  aria-label="Close filters"
                >
                  <X :size="20" />
                </button>
              </div>
              <div class="p-2">
                <slot name="sidebar" />
              </div>

              <!-- App Download CTA -->
              <div class="sticky bottom-0 border-t border-[var(--app-border)] bg-[var(--app-surface)] p-4">
                <div class="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 p-3 text-white">
                  <p class="text-sm font-semibold">Get the full experience in our app</p>
                  <p class="mt-1 text-xs opacity-90">Real-time signals · Strategy management</p>
                  <button class="mt-3 w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-600">
                    Download Now
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <slot name="overlays" />
  </div>
</template>

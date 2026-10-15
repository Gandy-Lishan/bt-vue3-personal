<script setup lang="ts">
import { ref, watch } from 'vue'
import { LayoutGrid, Table2 } from '@lucide/vue'
import IndicatorAdCarousel from '@/pages/indicators/ui/IndicatorAdCarousel.vue'
import type { IndicatorAd } from '@/entities/indicator/model/indicator.ads'
import type { ListExplorerViewMode } from './list-page.types'

const props = withDefaults(
  defineProps<{
    title: string
    description: string
    viewMode?: ListExplorerViewMode
    showViewModeToggle?: boolean
    ads?: IndicatorAd[]
  }>(),
  {
    viewMode: 'table',
    showViewModeToggle: true,
    ads: () => [],
  },
)

const emit = defineEmits<{
  'update:viewMode': [value: ListExplorerViewMode]
}>()

const hasVisibleAd = ref(props.ads.length > 0)

function handleAdVisibility(visible: boolean) {
  hasVisibleAd.value = visible
}

watch(
  () => props.ads,
  (ads) => {
    hasVisibleAd.value = ads.length > 0
  },
)
</script>

<template>
  <section class="mb-4 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-5">
    <div
      class="list-page-header"
      :class="{
        'list-page-header--no-toggle': !props.showViewModeToggle,
        'list-page-header--no-ad': !hasVisibleAd,
      }"
    >
      <div class="list-page-header__intro">
        <h1 class="text-3xl font-semibold leading-tight text-[var(--app-text)]">{{ props.title }}</h1>
        <p class="mt-1 text-sm text-[var(--app-text-muted)]">{{ props.description }}</p>

        <div v-if="props.showViewModeToggle" class="list-page-header__view-row">
          <span class="list-page-header__view-label">View as</span>
          <div class="list-page-header__toggle">
            <button
              class="flex items-center gap-2 rounded px-3 text-sm font-semibold transition"
              :class="props.viewMode === 'table' ? 'selected-fill-button bg-[var(--app-primary)]' : 'text-[var(--app-text)] hover:bg-[var(--app-surface-soft)]'"
              :style="props.viewMode === 'table' ? { color: '#ffffff' } : undefined"
              type="button"
              :aria-pressed="props.viewMode === 'table'"
              @click="emit('update:viewMode', 'table')"
            >
              <Table2 :size="16" /> Table
            </button>
            <button
              class="flex items-center gap-2 rounded px-3 text-sm font-semibold transition"
              :class="props.viewMode === 'cards' ? 'selected-fill-button bg-[var(--app-primary)]' : 'text-[var(--app-text)] hover:bg-[var(--app-surface-soft)]'"
              :style="props.viewMode === 'cards' ? { color: '#ffffff' } : undefined"
              type="button"
              :aria-pressed="props.viewMode === 'cards'"
              @click="emit('update:viewMode', 'cards')"
            >
              <LayoutGrid :size="16" /> Card
            </button>
          </div>
        </div>
      </div>

      <IndicatorAdCarousel
        v-if="props.ads.length"
        class="list-page-header__ad"
        :ads="props.ads"
        @visibility-change="handleAdVisibility"
      />
    </div>
  </section>
</template>

<style scoped>
.list-page-header {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.list-page-header__view-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.85rem;
  margin-top: 1.1rem;
}

.list-page-header__intro {
  min-width: 0;
}

.list-page-header__ad {
  min-width: 0;
}

@media (max-width: 767px) {
  .list-page-header__view-row {
    display: none;
  }
}

.list-page-header__view-label {
  color: var(--app-text);
  font-size: 0.88rem;
  font-weight: 800;
  line-height: 1;
}

.list-page-header__toggle {
  display: flex;
  height: 2.5rem;
  flex-shrink: 0;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-surface);
  padding: 0.25rem;
}

.selected-fill-button {
  color: #ffffff !important;
}

@media (min-width: 1280px) {
  .list-page-header {
    display: grid;
    grid-template-columns: minmax(340px, 0.52fr) minmax(520px, 1fr);
    gap: 1.75rem;
    align-items: stretch;
  }

  .list-page-header--no-toggle {
    grid-template-columns: minmax(340px, 0.52fr) minmax(520px, 1fr);
  }

  .list-page-header--no-ad {
    grid-template-columns: minmax(0, 1fr);
  }

  .list-page-header--no-toggle.list-page-header--no-ad {
    grid-template-columns: minmax(0, 1fr);
  }

  .list-page-header__intro {
    display: flex;
    min-height: 138px;
    flex-direction: column;
    justify-content: flex-start;
  }

  .list-page-header__view-row {
    margin-top: auto;
  }

  .list-page-header--no-ad .list-page-header__intro {
    display: grid;
    min-height: auto;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
    align-items: center;
    column-gap: 1rem;
  }

  .list-page-header--no-ad .list-page-header__intro > h1 {
    grid-column: 1;
    grid-row: 1;
  }

  .list-page-header--no-ad .list-page-header__intro > p {
    grid-column: 1;
    grid-row: 2;
  }

  .list-page-header--no-ad .list-page-header__view-row {
    grid-column: 2;
    grid-row: 1 / span 2;
    justify-self: end;
    margin-top: 0;
  }

  .list-page-header__ad {
    border-left: 1px solid var(--app-border);
    padding-left: 1.75rem;
  }
}
</style>

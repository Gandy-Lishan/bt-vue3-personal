<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, Maximize2, X } from '@lucide/vue'

export interface ImageLightboxGridItem {
  id?: string
  key?: string | number
  label: string
  description?: string
  url: string
  alt?: string
}

const props = withDefaults(
  defineProps<{
    items: ImageLightboxGridItem[]
    columns?: number
    showMeta?: boolean
  }>(),
  {
    columns: 2,
    showMeta: true,
  },
)

const activeIndex = ref(-1)
let previousBodyOverflow = ''

const activeItem = computed(() => props.items[activeIndex.value] ?? null)
const hasMultipleItems = computed(() => props.items.length > 1)
const gridStyle = computed(() => ({
  '--image-grid-columns': String(Math.max(1, props.columns)),
}))

function itemKey(item: ImageLightboxGridItem, index: number) {
  return item.id ?? item.key ?? item.url ?? index
}

function openImage(index: number) {
  if (!props.items[index]) return
  activeIndex.value = index
}

function closeImage() {
  activeIndex.value = -1
}

function showPrevious() {
  if (!props.items.length) return
  activeIndex.value = (activeIndex.value - 1 + props.items.length) % props.items.length
}

function showNext() {
  if (!props.items.length) return
  activeIndex.value = (activeIndex.value + 1) % props.items.length
}

function handleKeydown(event: KeyboardEvent) {
  if (!activeItem.value) return
  if (event.key === 'Escape') closeImage()
  if (event.key === 'ArrowLeft') showPrevious()
  if (event.key === 'ArrowRight') showNext()
}

function syncBodyScrollLock(isOpen: boolean) {
  if (typeof document === 'undefined') return

  if (isOpen) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = previousBodyOverflow
  }
}

watch(
  () => activeIndex.value >= 0,
  (isOpen) => {
    syncBodyScrollLock(isOpen)
  },
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  syncBodyScrollLock(false)
})
</script>

<template>
  <div class="image-lightbox-grid" :style="gridStyle">
    <article
      v-for="(item, index) in props.items"
      :key="itemKey(item, index)"
      class="image-lightbox-card"
    >
      <div v-if="props.showMeta" class="image-lightbox-card__meta">
        <h4 class="image-lightbox-card__title">{{ item.label }}</h4>
        <p v-if="item.description" class="image-lightbox-card__description">{{ item.description }}</p>
      </div>

      <button
        class="image-lightbox-card__preview"
        type="button"
        :aria-label="`Open ${item.label}`"
        @click="openImage(index)"
      >
        <img
          class="image-lightbox-card__image"
          :src="item.url"
          :alt="item.alt ?? item.label"
          loading="lazy"
        />
        <span class="image-lightbox-card__action" aria-hidden="true">
          <Maximize2 :size="17" />
        </span>
      </button>
    </article>
  </div>

  <Teleport to="body">
    <div
      v-if="activeItem"
      class="image-lightbox"
      role="dialog"
      aria-modal="true"
      :aria-label="activeItem.label"
      @click.self="closeImage"
    >
      <div class="image-lightbox__toolbar">
        <div class="min-w-0">
          <h3 class="image-lightbox__title">{{ activeItem.label }}</h3>
          <p v-if="activeItem.description" class="image-lightbox__description">{{ activeItem.description }}</p>
        </div>

        <div class="image-lightbox__controls">
          <button
            v-if="hasMultipleItems"
            class="image-lightbox__button"
            type="button"
            aria-label="Previous image"
            @click="showPrevious"
          >
            <ChevronLeft :size="20" />
          </button>
          <button
            v-if="hasMultipleItems"
            class="image-lightbox__button"
            type="button"
            aria-label="Next image"
            @click="showNext"
          >
            <ChevronRight :size="20" />
          </button>
          <button
            class="image-lightbox__button"
            type="button"
            aria-label="Close image"
            @click="closeImage"
          >
            <X :size="20" />
          </button>
        </div>
      </div>

      <div class="image-lightbox__stage">
        <button
          v-if="hasMultipleItems"
          class="image-lightbox__nav image-lightbox__nav--previous"
          type="button"
          aria-label="Previous image"
          @click="showPrevious"
        >
          <ChevronLeft :size="26" />
        </button>
        <img
          class="image-lightbox__image"
          :src="activeItem.url"
          :alt="activeItem.alt ?? activeItem.label"
        />
        <button
          v-if="hasMultipleItems"
          class="image-lightbox__nav image-lightbox__nav--next"
          type="button"
          aria-label="Next image"
          @click="showNext"
        >
          <ChevronRight :size="26" />
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.image-lightbox-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (min-width: 768px) {
  .image-lightbox-grid {
    grid-template-columns: repeat(var(--image-grid-columns), minmax(0, 1fr));
  }
}

.image-lightbox-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--app-border-muted);
  border-radius: 6px;
  background: var(--app-surface);
}

.image-lightbox-card__meta {
  padding: 12px 12px 9px;
}

.image-lightbox-card__title {
  color: var(--app-text);
  font-weight: 800;
  line-height: 1.2;
}

.image-lightbox-card__description {
  margin-top: 4px;
  color: var(--app-text-muted);
  font-size: 0.8125rem;
  line-height: 1.35;
}

.image-lightbox-card__preview {
  position: relative;
  display: flex;
  width: 100%;
  aspect-ratio: 16 / 9;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-top: 1px solid var(--app-border-muted);
  background: #ffffff;
}

.image-lightbox-card__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-lightbox-card__action {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(7, 27, 79, 0.78);
  color: white;
  opacity: 0;
  transition:
    opacity 160ms ease,
    transform 160ms ease;
  transform: translateY(2px);
}

.image-lightbox-card__preview:hover .image-lightbox-card__action,
.image-lightbox-card__preview:focus-visible .image-lightbox-card__action {
  opacity: 1;
  transform: translateY(0);
}

.image-lightbox-card__preview:focus-visible {
  outline: 3px solid var(--app-primary-shadow);
  outline-offset: -3px;
}

.image-lightbox {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(2, 8, 23, 0.9);
  padding: 18px;
}

.image-lightbox__toolbar {
  display: flex;
  min-height: 46px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  color: white;
}

.image-lightbox__title {
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.25;
}

.image-lightbox__description {
  margin-top: 3px;
  max-width: 820px;
  color: rgba(226, 232, 240, 0.78);
  font-size: 0.8125rem;
  line-height: 1.45;
}

.image-lightbox__controls {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 8px;
}

.image-lightbox__button,
.image-lightbox__nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(226, 232, 240, 0.18);
  background: rgba(15, 23, 42, 0.72);
  color: white;
  transition:
    background-color 160ms ease,
    border-color 160ms ease;
}

.image-lightbox__button {
  width: 36px;
  height: 36px;
  border-radius: 8px;
}

.image-lightbox__button:hover,
.image-lightbox__button:focus-visible,
.image-lightbox__nav:hover,
.image-lightbox__nav:focus-visible {
  border-color: rgba(226, 232, 240, 0.48);
  background: rgba(30, 41, 59, 0.9);
  outline: none;
}

.image-lightbox__stage {
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
}

.image-lightbox__image {
  max-width: 100%;
  max-height: calc(100vh - 110px);
  border-radius: 6px;
  background: #ffffff;
  object-fit: contain;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
}

.image-lightbox__nav {
  position: absolute;
  top: 50%;
  z-index: 1;
  width: 42px;
  height: 56px;
  border-radius: 8px;
  transform: translateY(-50%);
}

.image-lightbox__nav--previous {
  left: 0;
}

.image-lightbox__nav--next {
  right: 0;
}

@media (max-width: 640px) {
  .image-lightbox {
    padding: 12px;
  }

  .image-lightbox__toolbar {
    align-items: center;
  }

  .image-lightbox__description {
    display: none;
  }

  .image-lightbox__nav {
    display: none;
  }
}
</style>

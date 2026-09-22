<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowRight, ChevronLeft, ChevronRight, Database, X } from '@lucide/vue'
import { INDICATOR_AD_DISMISS_STORAGE_KEY, type IndicatorAd } from '@/entities/indicator/model/indicator.ads'

const ROTATE_INTERVAL_MS = 8000

const props = withDefaults(
  defineProps<{
    ads: IndicatorAd[]
    autoRotate?: boolean
  }>(),
  {
    autoRotate: true,
  },
)

const emit = defineEmits<{
  'visibility-change': [visible: boolean]
}>()

const dismissedIds = ref<Set<string>>(readDismissedIds())
const activeIndex = ref(0)
let rotateTimer: number | null = null

const visibleAds = computed(() => props.ads.filter((ad) => !dismissedIds.value.has(ad.id)))
const activeAd = computed(() => visibleAds.value[activeIndex.value] ?? null)
const hasMultipleAds = computed(() => visibleAds.value.length > 1)

function availableStorage() {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage ?? null
  } catch {
    return null
  }
}

function readDismissedIds() {
  const storage = availableStorage()
  if (!storage) return new Set<string>()

  try {
    const parsed = JSON.parse(storage.getItem(INDICATOR_AD_DISMISS_STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? new Set(parsed.filter((id): id is string => typeof id === 'string')) : new Set<string>()
  } catch {
    return new Set<string>()
  }
}

function saveDismissedIds(ids: Set<string>) {
  const storage = availableStorage()
  if (!storage) return

  try {
    storage.setItem(INDICATOR_AD_DISMISS_STORAGE_KEY, JSON.stringify(Array.from(ids)))
  } catch {
    // The dismiss action should still work for the current page if storage is unavailable.
  }
}

function stopRotation() {
  if (rotateTimer === null) return
  window.clearInterval(rotateTimer)
  rotateTimer = null
}

function startRotation() {
  stopRotation()
  if (!props.autoRotate || visibleAds.value.length < 2) return

  rotateTimer = window.setInterval(() => {
    activeIndex.value = (activeIndex.value + 1) % visibleAds.value.length
  }, ROTATE_INTERVAL_MS)
}

function move(step: number) {
  if (visibleAds.value.length < 2) return
  activeIndex.value = (activeIndex.value + step + visibleAds.value.length) % visibleAds.value.length
  startRotation()
}

function show(index: number) {
  if (index < 0 || index >= visibleAds.value.length) return
  activeIndex.value = index
  startRotation()
}

function dismissActiveAd() {
  const ad = activeAd.value
  if (!ad) return

  const nextDismissedIds = new Set(dismissedIds.value)
  nextDismissedIds.add(ad.id)
  dismissedIds.value = nextDismissedIds
  saveDismissedIds(nextDismissedIds)
}

function linkTarget(ad: IndicatorAd) {
  return ad.ctaTarget ?? '_self'
}

function linkRel(ad: IndicatorAd) {
  return linkTarget(ad) === '_blank' ? 'noopener noreferrer' : undefined
}

onMounted(() => {
  startRotation()
})

onBeforeUnmount(stopRotation)

watch(
  visibleAds,
  (ads) => {
    if (activeIndex.value >= ads.length) activeIndex.value = 0
    startRotation()
  },
  { flush: 'post' },
)

watch(
  activeAd,
  (ad) => {
    emit('visibility-change', Boolean(ad))
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="activeAd" class="indicator-ad-carousel" aria-label="Promotion">
    <div class="indicator-ad-carousel__viewport">
      <Transition name="indicator-ad-fade" mode="out-in">
        <article :key="activeAd.id" class="indicator-ad-carousel__slide">
          <div class="indicator-ad-carousel__icon" aria-hidden="true">
            <Database :size="33" />
          </div>
          <div class="indicator-ad-carousel__copy">
            <span v-if="activeAd.badge" class="indicator-ad-carousel__badge">{{ activeAd.badge }}</span>
            <p class="indicator-ad-carousel__title">{{ activeAd.title }}</p>
            <p class="indicator-ad-carousel__description">{{ activeAd.description }}</p>
          </div>
          <div class="indicator-ad-carousel__actions">
            <span v-if="activeAd.footnote" class="indicator-ad-carousel__footnote">{{ activeAd.footnote }}</span>
            <a
              class="indicator-ad-carousel__cta"
              :href="activeAd.ctaHref"
              :target="linkTarget(activeAd)"
              :rel="linkRel(activeAd)"
            >
              {{ activeAd.ctaLabel }}
              <ArrowRight :size="16" aria-hidden="true" />
            </a>
          </div>
        </article>
      </Transition>
    </div>

    <div v-if="hasMultipleAds" class="indicator-ad-carousel__controls" aria-label="Promotion navigation">
      <button class="indicator-ad-carousel__icon-button" type="button" aria-label="Previous promotion" @click="move(-1)">
        <ChevronLeft :size="16" />
      </button>
      <button
        v-for="(ad, index) in visibleAds"
        :key="ad.id"
        class="indicator-ad-carousel__dot"
        :class="{ 'indicator-ad-carousel__dot--active': index === activeIndex }"
        type="button"
        :aria-label="`Show promotion ${index + 1}`"
        :aria-pressed="index === activeIndex"
        @click="show(index)"
      />
      <button class="indicator-ad-carousel__icon-button" type="button" aria-label="Next promotion" @click="move(1)">
        <ChevronRight :size="16" />
      </button>
    </div>

    <button class="indicator-ad-carousel__dismiss" type="button" aria-label="Dismiss promotion" @click="dismissActiveAd">
      <X :size="16" />
    </button>
  </div>
</template>

<style scoped>
.indicator-ad-carousel {
  position: relative;
  display: flex;
  min-height: 138px;
  min-width: 0;
  align-items: stretch;
  overflow: hidden;
  border: 1px solid var(--app-border-muted);
  border-radius: 8px;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--app-primary) 7%, var(--app-surface)), var(--app-surface-soft)),
    radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--app-primary) 14%, transparent), transparent 34%);
  box-shadow: inset 0 1px 0 var(--app-border-muted);
}

.indicator-ad-carousel__viewport {
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.indicator-ad-carousel__slide {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 1.35rem;
  align-items: center;
  min-height: 100%;
  padding: 1.2rem 4.5rem 1.2rem 1.65rem;
}

.indicator-ad-carousel__icon {
  display: inline-flex;
  width: 58px;
  height: 58px;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--app-primary) 12%, transparent),
    color-mix(in srgb, var(--app-primary) 5%, transparent)
  );
  color: var(--app-primary);
}

.indicator-ad-carousel__copy {
  min-width: 0;
}

.indicator-ad-carousel__badge {
  display: inline-flex;
  height: 24px;
  align-items: center;
  border-radius: 6px;
  background: var(--app-primary-soft);
  padding: 0 0.65rem;
  color: var(--app-primary);
  font-size: 0.76rem;
  font-weight: 800;
  line-height: 1;
}

.indicator-ad-carousel__title {
  margin: 0.6rem 0 0;
  color: var(--app-text);
  font-size: clamp(1rem, 1vw, 1.22rem);
  font-weight: 800;
  line-height: 1.2;
}

.indicator-ad-carousel__description {
  margin: 0.28rem 0 0;
  color: var(--app-text-secondary);
  font-size: 0.94rem;
  line-height: 1.45;
}

.indicator-ad-carousel__actions {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.65rem;
  padding-right: 0.75rem;
}

.indicator-ad-carousel__cta {
  display: inline-flex;
  min-height: 36px;
  min-width: 145px;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 5px;
  background: var(--app-primary);
  padding: 0 1rem;
  color: #ffffff;
  font-size: 0.88rem;
  font-weight: 800;
  line-height: 1;
  text-decoration: none;
  transition:
    background-color 160ms ease,
    transform 160ms ease;
}

.indicator-ad-carousel__cta:hover {
  background: var(--app-primary-hover);
  transform: translateY(-1px);
}

.indicator-ad-carousel__footnote {
  color: var(--app-primary);
  font-size: 0.82rem;
  font-weight: 800;
  line-height: 1.4;
  white-space: nowrap;
}

.indicator-ad-carousel__controls {
  position: absolute;
  right: 2.75rem;
  bottom: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.indicator-ad-carousel__icon-button,
.indicator-ad-carousel__dismiss {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--app-primary) 18%, transparent);
  border-radius: 5px;
  background: color-mix(in srgb, var(--app-surface) 80%, transparent);
  color: var(--app-text-secondary);
  transition:
    background-color 160ms ease,
    color 160ms ease,
    border-color 160ms ease;
}

.indicator-ad-carousel__icon-button {
  width: 25px;
  height: 25px;
}

.indicator-ad-carousel__dismiss {
  position: absolute;
  top: 0.65rem;
  right: 0.65rem;
  width: 28px;
  height: 28px;
}

.indicator-ad-carousel__icon-button:hover,
.indicator-ad-carousel__dismiss:hover {
  border-color: color-mix(in srgb, var(--app-primary) 35%, transparent);
  background: var(--app-surface);
  color: var(--app-primary);
}

.indicator-ad-carousel__dot {
  width: 7px;
  height: 7px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-text-muted) 32%, transparent);
  padding: 0;
}

.indicator-ad-carousel__dot--active {
  width: 18px;
  background: var(--app-primary);
}

.indicator-ad-fade-enter-active,
.indicator-ad-fade-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.indicator-ad-fade-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.indicator-ad-fade-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

@media (max-width: 767px) {
  .indicator-ad-carousel__slide {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.9rem;
    padding: 1rem 3.25rem 1rem 1rem;
  }

  .indicator-ad-carousel__icon {
    display: none;
  }

  .indicator-ad-carousel__title {
    font-size: 1rem;
  }

  .indicator-ad-carousel__actions {
    align-items: flex-start;
    padding-right: 0;
  }

  .indicator-ad-carousel__footnote {
    white-space: normal;
  }
}

@media (min-width: 768px) and (max-width: 1279px) {
  .indicator-ad-carousel__slide {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .indicator-ad-carousel__actions {
    grid-column: 2;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
  }
}
</style>

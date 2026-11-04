<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import MarketBaseButton from './MarketBaseButton.vue'

export interface MarketButtonGroupOption {
  label: string
  value: string
}

const props = withDefaults(defineProps<{
  modelValue?: string
  options: MarketButtonGroupOption[]
  backgroundColor?: string
  enableTransition?: boolean
  ariaLabel?: string
}>(), {
  modelValue: '',
  backgroundColor: 'var(--app-surface)',
  enableTransition: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const groupEl = ref<HTMLDivElement | null>(null)

// Non-reactive: ref callbacks run during patch, keyed by option value so
// reorder/removal stays correct (mirrors Vue2 `$refs.buttons` indexing).
const buttonEls = new Map<string, HTMLButtonElement>()

const sliderLeft = ref(0)
const sliderWidth = ref(0)
const sliderVisible = ref(false)

let resizeObserver: ResizeObserver | null = null
let frame = 0

const sliderStyle = computed(() => ({
  left: `${sliderLeft.value}px`,
  width: `${sliderWidth.value}px`,
  opacity: sliderVisible.value ? '1' : '0',
  transition: props.enableTransition
    ? 'left 0.35s cubic-bezier(0.4, 0, 0.2, 1), width 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
    : 'none',
}))

interface MarketBaseButtonExposed {
  getElement: () => HTMLButtonElement | null
}

function setButtonEl(value: string, el: Element | ComponentPublicInstance | null) {
  const button = el && 'getElement' in el
    ? (el as unknown as MarketBaseButtonExposed).getElement()
    : el instanceof HTMLButtonElement ? el : null

  if (button instanceof HTMLButtonElement) buttonEls.set(value, button)
  else buttonEls.delete(value)
}

function updateSlider() {
  const group = groupEl.value
  const button = buttonEls.get(props.modelValue)
  if (!group || !button) {
    sliderVisible.value = false
    return
  }

  const groupRect = group.getBoundingClientRect()
  const buttonRect = button.getBoundingClientRect()

  if (buttonRect.width <= 0) {
    sliderVisible.value = false
    return
  }

  sliderLeft.value = buttonRect.left - groupRect.left
  sliderWidth.value = buttonRect.width
  sliderVisible.value = true
}

function scheduleUpdate() {
  if (typeof requestAnimationFrame === 'undefined') {
    updateSlider()
    return
  }
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    frame = 0
    updateSlider()
  })
}

function select(value: string) {
  emit('update:modelValue', value)
  emit('change', value)
}

watch(
  [() => props.modelValue, () => props.options],
  () => { void nextTick(updateSlider) },
)

onMounted(() => {
  void nextTick(updateSlider)

  // Web fonts can change button widths after first paint.
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    void document.fonts.ready.then(scheduleUpdate)
  }

  if (typeof ResizeObserver !== 'undefined' && groupEl.value) {
    resizeObserver = new ResizeObserver(scheduleUpdate)
    resizeObserver.observe(groupEl.value)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', scheduleUpdate)
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
  resizeObserver = null
  buttonEls.clear()
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', scheduleUpdate)
  }
})
</script>

<template>
  <div class="market-button-group-scroll">
    <div
      ref="groupEl"
      class="market-button-group"
      :style="{ backgroundColor: props.backgroundColor }"
      role="group"
      :aria-label="props.ariaLabel"
    >
      <MarketBaseButton
        v-for="option in props.options"
        :key="option.value"
        :ref="(el) => setButtonEl(option.value, el)"
        :is-active="option.value === props.modelValue"
        @click="select(option.value)"
      >
        {{ option.label }}
      </MarketBaseButton>

      <div class="market-highlight-slider" :style="sliderStyle" aria-hidden="true" />
    </div>
  </div>
</template>

<style scoped>
.market-button-group-scroll {
  max-width: 100%;
  overflow-x: auto;
}

.market-button-group {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  width: fit-content;
  height: 34px;
  border-radius: 8px;
}

/* Mirrors Vue2: the blue pill behind the buttons provides the active
   background, so buttons themselves must stay transparent. */
.market-button-group :deep(.market-base-button) {
  background: transparent !important;
}

.market-highlight-slider {
  position: absolute;
  z-index: 0;
  top: 2px;
  height: 30px;
  border-radius: 8px;
  background-color: var(--app-primary);
  pointer-events: none;
}
</style>

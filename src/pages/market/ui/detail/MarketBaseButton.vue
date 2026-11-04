<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  isActive?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

const element = ref<HTMLButtonElement | null>(null)

function getElement(): HTMLButtonElement | null {
  return element.value
}

defineExpose({ element, getElement })
</script>

<template>
  <button
    ref="element"
    type="button"
    class="market-base-button"
    :class="{ 'market-base-button--active': props.isActive }"
    :aria-pressed="props.isActive"
    @click="emit('click')"
  >
    <slot />
  </button>
</template>

<style scoped>
.market-base-button {
  position: relative;
  z-index: 2;
  margin: 2px;
  padding: 4px 24px;
  border: 0;
  border-radius: 8px;
  background-color: transparent;
  color: var(--app-text);
  font-size: 14px;
  line-height: 22px;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.3s, color 0.3s;
}

.market-base-button:hover {
  background-color: var(--app-surface-hover);
}

.market-base-button--active {
  background-color: var(--app-primary);
  color: #fff;
}

.market-base-button--active:hover {
  background-color: var(--app-primary-hover);
}
</style>

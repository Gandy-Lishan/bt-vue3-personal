<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Check, Search } from '@lucide/vue'

interface SearchSelectOption {
  value: string
  label: string
  displayValue?: string
  description?: string
  meta?: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: SearchSelectOption[]
    placeholder?: string
    emptyMessage?: string
    ariaLabel?: string
    maxVisible?: number
  }>(),
  {
    placeholder: 'Search',
    emptyMessage: 'No results found.',
    ariaLabel: 'Search',
    maxVisible: 12,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [option: SearchSelectOption]
}>()

const rootElement = ref<HTMLElement | null>(null)
const inputElement = ref<HTMLInputElement | null>(null)
const query = ref('')
const isOpen = ref(false)
const activeIndex = ref(0)

const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue) ?? null)
const selectedDisplayValue = computed(() => selectedOption.value?.displayValue ?? selectedOption.value?.value ?? props.modelValue)

const visibleOptions = computed(() => {
  const needle = standardize(query.value)
  if (!needle) return props.options.slice(0, props.maxVisible)

  return props.options
    .map((option) => ({ option, score: scoreOption(option, needle) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.option.value.localeCompare(right.option.value))
    .slice(0, props.maxVisible)
    .map((item) => item.option)
})

watch(
  () => props.modelValue,
  () => {
    if (!isOpen.value) query.value = selectedDisplayValue.value
  },
  { immediate: true },
)

watch(
  () => props.options,
  () => {
    if (!isOpen.value) query.value = selectedDisplayValue.value
  },
)

watch(visibleOptions, () => {
  activeIndex.value = 0
})

function openDropdown(selectText = false) {
  isOpen.value = true
  if (selectText) {
    void nextTick(() => inputElement.value?.select())
  }
}

function closeDropdown(revert = true) {
  isOpen.value = false
  activeIndex.value = 0
  if (revert) query.value = selectedDisplayValue.value
}

function handleInput() {
  openDropdown()
}

function moveActive(delta: number) {
  if (!visibleOptions.value.length) return
  const maxIndex = visibleOptions.value.length - 1
  activeIndex.value = Math.min(maxIndex, Math.max(0, activeIndex.value + delta))
}

function selectOption(option: SearchSelectOption) {
  emit('update:modelValue', option.value)
  emit('select', option)
  query.value = option.displayValue ?? option.value
  closeDropdown(false)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeDropdown()
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    openDropdown()
    moveActive(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActive(-1)
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    const option = visibleOptions.value[activeIndex.value]
    if (option) selectOption(option)
  }
}

function handleDocumentPointerDown(event: PointerEvent) {
  const target = event.target
  if (!(target instanceof Node)) return
  if (!rootElement.value?.contains(target)) closeDropdown()
}

function standardize(value: string) {
  return value.trim().toLowerCase().replace(/[_\s-]+/g, ' ')
}

function fuzzyMatch(text: string, needle: string) {
  let cursor = 0
  for (const character of needle) {
    cursor = text.indexOf(character, cursor)
    if (cursor === -1) return false
    cursor += 1
  }
  return true
}

function scoreOption(option: SearchSelectOption, needle: string) {
  const symbol = standardize(option.value)
  const label = standardize(option.label)
  const displayValue = standardize(option.displayValue ?? '')
  const description = standardize(option.description ?? '')
  const meta = standardize(option.meta ?? '')
  const haystack = `${symbol} ${label} ${displayValue} ${description} ${meta}`

  if (symbol === needle || label === needle) return 100
  if (symbol.startsWith(needle)) return 80
  if (label.startsWith(needle)) return 70
  if (description.startsWith(needle)) return 50
  if (haystack.includes(needle)) return 35
  return fuzzyMatch(haystack, needle) ? 12 : 0
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
})
</script>

<template>
  <div ref="rootElement" class="search-select">
    <div
      class="search-select__field"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
    >
      <Search :size="16" class="search-select__icon" />
      <input
        ref="inputElement"
        v-model="query"
        class="search-select__input"
        :placeholder="placeholder"
        :aria-label="ariaLabel"
        autocomplete="off"
        spellcheck="false"
        @focus="openDropdown(true)"
        @input="handleInput"
        @keydown="handleKeydown"
      />
    </div>

    <div v-if="isOpen" class="search-select__menu" role="listbox">
      <button
        v-for="(option, index) in visibleOptions"
        :key="option.value"
        class="search-select__option"
        :class="{
          'search-select__option--active': index === activeIndex,
          'search-select__option--selected': option.value === modelValue,
        }"
        type="button"
        role="option"
        :aria-selected="option.value === modelValue"
        @mouseenter="activeIndex = index"
        @mousedown.prevent="selectOption(option)"
      >
        <span class="search-select__option-main">
          <span class="search-select__option-symbol">{{ option.displayValue || option.value }}</span>
          <span class="search-select__option-name">{{ option.description || option.label }}</span>
        </span>
        <span class="search-select__option-meta">
          <span v-if="option.meta">{{ option.meta }}</span>
          <Check v-if="option.value === modelValue" :size="15" />
        </span>
      </button>

      <div v-if="!visibleOptions.length" class="search-select__empty">
        {{ emptyMessage }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-select {
  position: relative;
  min-width: 0;
}

.search-select__field {
  display: flex;
  height: 36px;
  min-width: 0;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-surface);
  padding: 0 10px;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.search-select__field:focus-within {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px var(--app-primary-shadow);
}

.search-select__icon {
  flex-shrink: 0;
  color: var(--app-text-muted);
}

.search-select__input {
  min-width: 0;
  flex: 1;
  border: 0;
  background: transparent;
  color: var(--app-text);
  font-size: 0.8125rem;
  font-weight: 700;
  outline: none;
}

.search-select__input::placeholder {
  color: var(--app-text-muted);
  font-weight: 650;
}

.search-select__menu {
  position: absolute;
  left: 0;
  top: calc(100% + 6px);
  z-index: 70;
  width: 100%;
  min-width: min(380px, calc(100vw - 32px));
  max-height: 310px;
  overflow-y: auto;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-surface);
  box-shadow: 0 18px 42px rgba(5, 16, 31, 0.2);
  padding: 6px;
}

.search-select__option {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-radius: 5px;
  padding: 8px 9px;
  text-align: left;
  transition:
    background-color 140ms ease,
    color 140ms ease;
}

.search-select__option--active,
.search-select__option:hover {
  background: var(--app-primary-soft);
}

.search-select__option-main {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.search-select__option-symbol {
  color: var(--app-text);
  font-size: 0.8125rem;
  font-weight: 850;
  line-height: 1.25;
}

.search-select__option-name {
  overflow: hidden;
  color: var(--app-text-muted);
  font-size: 0.74rem;
  font-weight: 650;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-select__option-meta {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  color: var(--app-primary);
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
}

.search-select__empty {
  padding: 14px 10px;
  color: var(--app-text-muted);
  font-size: 0.8125rem;
  font-weight: 650;
  text-align: center;
}
</style>

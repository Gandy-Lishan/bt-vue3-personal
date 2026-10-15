<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { FileText, Landmark, Loader2, Newspaper, Search } from '@lucide/vue'
import {
  searchAlgoliaContent,
  type AlgoliaSearchResult,
  type AlgoliaSearchSection,
  type AlgoliaSearchSourceId,
} from '@/shared/search/algolia'
import { searchMarketSymbols } from '@/shared/search/market'

const props = withDefaults(
  defineProps<{
    mobile?: boolean
  }>(),
  { mobile: false },
)

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const rootElement = ref<HTMLElement | null>(null)
const inputElement = ref<HTMLInputElement | null>(null)
const query = ref('')
const sections = ref<AlgoliaSearchSection[]>([])
const isOpen = ref(false)
const isLoading = ref(false)
const hasSearched = ref(false)
const errorMessage = ref('')
const activeResultIndex = ref(0)

let searchTimer: number | undefined
let latestSearchId = 0

const visibleSections = computed(() => sections.value.filter((section) => section.results.length > 0))
const flatResults = computed(() => visibleSections.value.flatMap((section) => section.results))
const hasResults = computed(() => flatResults.value.length > 0)

watch(query, () => {
  if (!isOpen.value) return
  queueSearch()
})

function sourceIcon(sourceId: AlgoliaSearchSourceId) {
  if (sourceId === 'market') return Landmark
  if (sourceId === 'reports') return FileText
  return Newspaper
}

function flatIndexFor(sectionIndex: number, resultIndex: number) {
  return visibleSections.value.slice(0, sectionIndex).reduce((total, section) => total + section.results.length, 0) + resultIndex
}

function queueSearch(delay = 180) {
  if (searchTimer !== undefined) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    void runSearch()
  }, delay)
}

async function runSearch() {
  const searchId = latestSearchId + 1
  latestSearchId = searchId
  isLoading.value = true
  errorMessage.value = ''

  try {
    const nextSections = await searchAlgoliaContent(query.value, 5)
    if (searchId !== latestSearchId) return

    // Market symbols are matched locally and listed above the algolia sections.
    const marketResults = searchMarketSymbols(query.value, 5)
    const marketSection: AlgoliaSearchSection = {
      id: 'market',
      label: 'Market',
      description: 'Stocks and indexes',
      results: marketResults,
    }
    sections.value = marketResults.length ? [marketSection, ...nextSections] : nextSections
    hasSearched.value = true
    activeResultIndex.value = 0
  } catch {
    if (searchId !== latestSearchId) return
    sections.value = []
    errorMessage.value = 'Search is temporarily unavailable.'
  } finally {
    if (searchId === latestSearchId) isLoading.value = false
  }
}

function openSearch() {
  isOpen.value = true
  if (!hasSearched.value) queueSearch(0)
}

function closeSearch() {
  isOpen.value = false
}

function focusSearch() {
  void nextTick(() => {
    inputElement.value?.focus()
    openSearch()
  })
}

function resultTarget(result: AlgoliaSearchResult) {
  return result.external ? '_self' : undefined
}

function openResult(result: AlgoliaSearchResult) {
  closeSearch()
  // On mobile, notify parent to close the overlay
  if (props.mobile) {
    emit('close')
  }
  if (result.external) {
    window.location.assign(result.href)
    return
  }
  void router.push(result.href)
}

function openMoreResults() {
  closeSearch()
  // On mobile, notify parent to close the overlay
  if (props.mobile) {
    emit('close')
  }
  const trimmedQuery = query.value.trim()
  void router.push({
    path: '/search',
    query: trimmedQuery ? { query: trimmedQuery } : {},
  })
}

function moveActiveResult(delta: number) {
  if (!hasResults.value) return
  const maxIndex = flatResults.value.length - 1
  activeResultIndex.value = Math.min(maxIndex, Math.max(0, activeResultIndex.value + delta))
}

function handleInputKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeSearch()
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    openSearch()
    moveActiveResult(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActiveResult(-1)
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    const activeResult = flatResults.value[activeResultIndex.value]
    if (activeResult) {
      openResult(activeResult)
      return
    }
    openMoreResults()
  }
}

function handleDocumentPointerDown(event: PointerEvent) {
  const target = event.target
  if (!(target instanceof Node)) return
  if (!rootElement.value?.contains(target)) closeSearch()
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    focusSearch()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleDocumentKeydown)
  // Auto-focus in mobile mode
  if (props.mobile) {
    void nextTick(() => {
      inputElement.value?.focus()
      openSearch()
    })
  }
})

onBeforeUnmount(() => {
  if (searchTimer !== undefined) window.clearTimeout(searchTimer)
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
})
</script>

<template>
  <div ref="rootElement" class="relative w-full">
    <div
      class="flex h-10 w-full items-center overflow-hidden border border-[var(--chrome-field-border)] bg-[var(--chrome-field-bg)] shadow-inner transition focus-within:border-[var(--chrome-accent)] focus-within:bg-[var(--chrome-menu-bg)] focus-within:shadow-[0_0_0_2px_var(--app-primary-shadow)]"
      :class="props.mobile ? 'rounded-none border-0 bg-transparent shadow-none focus-within:border-0 focus-within:bg-transparent focus-within:shadow-none' : 'rounded-lg'"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
    >
      <Search :size="20" class="shrink-0 text-[var(--chrome-text-muted)]" :class="props.mobile ? 'ml-0' : 'ml-4'" />
      <input
        ref="inputElement"
        v-model="query"
        class="h-full min-w-0 flex-1 bg-transparent text-sm font-normal text-[var(--chrome-text)] outline-none placeholder:text-[var(--chrome-text-muted)]"
        :class="props.mobile ? 'px-2' : 'px-4'"
        placeholder="Search research, indicators, symbols or charts..."
        aria-label="Search research, indicators, symbols or charts"
        autocomplete="off"
        spellcheck="false"
        @focus="openSearch"
        @keydown="handleInputKeydown"
      />
      <button
        v-if="!props.mobile"
        class="mr-2 hidden rounded-md border border-[var(--chrome-kbd-border)] bg-[var(--chrome-kbd-bg)] px-2 py-1 text-sm font-normal text-[var(--chrome-kbd-text)] sm:block"
        type="button"
        aria-label="Focus search"
        title="Focus search"
        @mousedown.prevent
        @click="focusSearch"
      >
        Ctrl K
      </button>
    </div>

    <!-- Mobile: results inline below search bar (not absolute) -->
    <div v-if="props.mobile && isOpen" class="fixed inset-0 top-[66px] z-[55] bg-[var(--chrome-bg)] overflow-y-auto" role="listbox">
      <div class="px-[var(--page-gutter)] py-4">
        <div v-if="isLoading" class="flex items-center gap-2 px-2 py-3 text-sm text-[var(--chrome-text-muted)]">
          <Loader2 :size="16" class="animate-spin" />
          Searching...
        </div>

        <div v-else-if="errorMessage" class="px-2 py-3 text-sm text-[var(--chrome-text-muted)]">
          {{ errorMessage }}
        </div>

        <div v-else-if="!hasResults && hasSearched" class="px-2 py-3 text-sm text-[var(--chrome-text-muted)]">
          No results found.
        </div>

        <template v-else>
          <section v-for="(section, sectionIndex) in visibleSections" :key="section.id" class="mb-6">
            <div class="flex items-center justify-between gap-3 mb-3">
              <div class="flex min-w-0 items-center gap-2">
                <svg
                  v-if="section.id === 'charts'"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="lucide lucide-chart-line preview-icon shrink-0 text-[var(--chrome-accent)]"
                  aria-hidden="true"
                >
                  <path d="M3 3v16a2 2 0 0 0 2 2h16" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
                <component v-else :is="sourceIcon(section.id)" :size="24" class="shrink-0 text-[var(--chrome-accent)]" />
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold uppercase tracking-[0.08em] text-[var(--chrome-text)]">
                    {{ section.label }}
                  </p>
                  <p class="truncate text-xs text-[var(--chrome-text-muted)]">{{ section.description }}</p>
                </div>
              </div>
              <button
                class="shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold text-[var(--chrome-accent)] hover:bg-[var(--chrome-hover)]"
                type="button"
                @mousedown.prevent
                @click="openMoreResults"
              >
                More
              </button>
            </div>

            <div class="space-y-2">
              <button
                v-for="(result, resultIndex) in section.results"
                :key="result.id"
                class="block w-full rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-surface)] p-4 text-left transition hover:bg-[var(--chrome-menu-hover)] hover:shadow-sm"
                :class="{ 'border-[var(--chrome-accent)] bg-[var(--chrome-active-bg)]': activeResultIndex === flatIndexFor(sectionIndex, resultIndex) }"
                type="button"
                role="option"
                :aria-selected="activeResultIndex === flatIndexFor(sectionIndex, resultIndex)"
                @mouseenter="activeResultIndex = flatIndexFor(sectionIndex, resultIndex)"
                @mousedown.prevent
                @click="openResult(result)"
              >
                <span class="block min-w-0">
                  <span class="block text-sm font-semibold text-[var(--chrome-text)]">
                    {{ result.title }}<span v-if="result.premium" class="ml-1 text-[var(--chrome-accent)]">Premium</span>
                  </span>
                  <span v-if="result.subtitle" class="block mt-1 truncate text-xs text-[var(--chrome-text-muted)]">{{ result.subtitle }}</span>
                </span>
                <span v-if="resultTarget(result)" class="sr-only">External result</span>
              </button>
            </div>
          </section>
        </template>
      </div>
    </div>

    <!-- Desktop: floating dropdown -->
    <div
      v-if="!props.mobile && isOpen"
      class="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[min(70vh,620px)] overflow-hidden rounded-lg border border-[var(--chrome-menu-border)] bg-[var(--chrome-menu-bg)] text-[var(--chrome-text)] shadow-[0_18px_42px_rgba(5,16,31,0.24)]"
      role="listbox"
    >
      <div v-if="isLoading" class="flex items-center gap-2 px-4 py-3 text-sm text-[var(--chrome-text-muted)]">
        <Loader2 :size="16" class="animate-spin" />
        Searching...
      </div>

      <div v-else-if="errorMessage" class="px-4 py-3 text-sm text-[var(--chrome-text-muted)]">
        {{ errorMessage }}
      </div>

      <div v-else-if="!hasResults && hasSearched" class="px-4 py-3 text-sm text-[var(--chrome-text-muted)]">
        No results found.
      </div>

      <div v-else class="max-h-[min(70vh,620px)] overflow-y-auto py-2">
        <section v-for="(section, sectionIndex) in visibleSections" :key="section.id" class="py-1">
          <div class="flex items-center justify-between gap-3 px-4 py-2">
            <div class="flex min-w-0 items-center gap-2">
              <svg
                v-if="section.id === 'charts'"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-chart-line preview-icon shrink-0 text-[var(--chrome-accent)]"
                aria-hidden="true"
              >
                <path d="M3 3v16a2 2 0 0 0 2 2h16" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
              <component v-else :is="sourceIcon(section.id)" :size="24" class="shrink-0 text-[var(--chrome-accent)]" />
              <div class="min-w-0">
                <p class="truncate text-xs font-semibold uppercase tracking-[0.08em] text-[var(--chrome-text-muted)]">
                  {{ section.label }}
                </p>
                <p class="truncate text-xs text-[var(--chrome-text-muted)]">{{ section.description }}</p>
              </div>
            </div>
            <button
              class="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-[var(--chrome-accent)] hover:bg-[var(--chrome-hover)]"
              type="button"
              @mousedown.prevent
              @click="openMoreResults"
            >
              More Search Results
            </button>
          </div>

          <button
            v-for="(result, resultIndex) in section.results"
            :key="result.id"
            class="block w-full py-2.5 pl-12 pr-4 text-left transition hover:bg-[var(--chrome-menu-hover)]"
            :class="{ 'bg-[var(--chrome-menu-hover)]': activeResultIndex === flatIndexFor(sectionIndex, resultIndex) }"
            type="button"
            role="option"
            :aria-selected="activeResultIndex === flatIndexFor(sectionIndex, resultIndex)"
            @mouseenter="activeResultIndex = flatIndexFor(sectionIndex, resultIndex)"
            @mousedown.prevent
            @click="openResult(result)"
          >
            <span class="block min-w-0">
              <span class="block truncate text-sm font-semibold text-[var(--chrome-text)]">
                {{ result.title }}<span v-if="result.premium" class="ml-1 text-[var(--chrome-accent)]">Premium</span>
              </span>
              <span v-if="result.subtitle" class="block truncate text-xs text-[var(--chrome-text-muted)]">{{ result.subtitle }}</span>
            </span>
            <span v-if="resultTarget(result)" class="sr-only">External result</span>
          </button>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { FileText, Loader2, Newspaper, Search } from '@lucide/vue'
import {
  algoliaSearchSources,
  searchAlgoliaContent,
  type AlgoliaSearchResult,
  type AlgoliaSearchSection,
  type AlgoliaSearchSourceId,
} from '@/shared/search/algolia'

const route = useRoute()
const router = useRouter()
const query = ref(String(route.query.query ?? ''))
const sections = ref<AlgoliaSearchSection[]>([])
const visibleSourceIds = ref<AlgoliaSearchSourceId[]>(algoliaSearchSources.map((source) => source.id))
const isLoading = ref(false)
const errorMessage = ref('')

let searchTimer: number | undefined
let latestSearchId = 0

const visibleSections = computed(() => sections.value.filter((section) => visibleSourceIds.value.includes(section.id)))
const totalResults = computed(() => visibleSections.value.reduce((total, section) => total + section.results.length, 0))

watch(
  () => route.query.query,
  (nextQuery) => {
    const next = String(nextQuery ?? '')
    if (next === query.value) return
    query.value = next
    queueSearch(0)
  },
)

watch(query, () => {
  queueSearch()
})

function sourceIcon(sourceId: AlgoliaSearchSourceId) {
  if (sourceId === 'reports') return FileText
  return Newspaper
}

function resultTarget(result: AlgoliaSearchResult) {
  return result.external ? '_blank' : undefined
}

function resultRel(result: AlgoliaSearchResult) {
  return result.external ? 'noopener' : undefined
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
    const nextSections = await searchAlgoliaContent(query.value, 15)
    if (searchId !== latestSearchId) return
    sections.value = nextSections
  } catch {
    if (searchId !== latestSearchId) return
    sections.value = []
    errorMessage.value = 'Search is temporarily unavailable.'
  } finally {
    if (searchId === latestSearchId) isLoading.value = false
  }
}

function toggleSource(sourceId: AlgoliaSearchSourceId) {
  visibleSourceIds.value = visibleSourceIds.value.includes(sourceId)
    ? visibleSourceIds.value.filter((id) => id !== sourceId)
    : [...visibleSourceIds.value, sourceId]
}

function submitSearch() {
  const trimmedQuery = query.value.trim()
  void router.replace({
    path: '/search',
    query: trimmedQuery ? { query: trimmedQuery } : {},
  })
  queueSearch(0)
}

queueSearch(0)

onBeforeUnmount(() => {
  if (searchTimer !== undefined) window.clearTimeout(searchTimer)
})
</script>

<template>
  <main class="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-[var(--page-gutter)] py-8">
    <form class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between" @submit.prevent="submitSearch">
      <div>
        <h1 class="text-2xl font-semibold text-[var(--app-text)]">Search</h1>
        <p class="mt-1 text-sm text-[var(--app-text-muted)]">Research, reports, and chart pages from SentimenTrader.</p>
      </div>
      <div class="flex min-h-11 w-full max-w-[640px] items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 shadow-sm">
        <Search :size="18" class="shrink-0 text-[var(--app-text-muted)]" />
        <input
          v-model="query"
          class="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-[var(--app-text)] outline-none"
          placeholder="Search for Research, Content or Charts..."
          autocomplete="off"
          spellcheck="false"
        />
        <button class="rounded-md bg-[var(--app-primary)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--app-primary-hover)]" type="submit">
          Search
        </button>
      </div>
    </form>

    <section class="flex flex-wrap items-center gap-3 border-y border-[var(--app-border)] py-3">
      <span class="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">Filter by source</span>
      <label v-for="source in algoliaSearchSources" :key="source.id" class="inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-text-secondary)]">
        <input
          class="h-4 w-4 accent-[var(--app-primary)]"
          type="checkbox"
          :checked="visibleSourceIds.includes(source.id)"
          @change="toggleSource(source.id)"
        />
        {{ source.label }}
      </label>
      <span class="ml-auto text-sm text-[var(--app-text-muted)]">{{ totalResults }} results</span>
    </section>

    <div v-if="isLoading" class="flex items-center gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-5 text-sm text-[var(--app-text-muted)]">
      <Loader2 :size="18" class="animate-spin" />
      Searching...
    </div>

    <div v-else-if="errorMessage" class="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-5 text-sm text-[var(--app-text-muted)]">
      {{ errorMessage }}
    </div>

    <div v-else class="grid gap-5 xl:grid-cols-3">
      <section
        v-for="section in visibleSections"
        :key="section.id"
        class="min-w-0 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)]"
      >
        <header class="flex items-center gap-2 border-b border-[var(--app-border)] px-4 py-3">
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
            class="lucide lucide-chart-line preview-icon shrink-0 text-[var(--app-primary)]"
            aria-hidden="true"
          >
            <path d="M3 3v16a2 2 0 0 0 2 2h16" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
          <component v-else :is="sourceIcon(section.id)" :size="24" class="shrink-0 text-[var(--app-primary)]" />
          <div class="min-w-0">
            <h2 class="text-base font-semibold text-[var(--app-text)]">{{ section.label }}</h2>
            <p class="truncate text-xs text-[var(--app-text-muted)]">{{ section.description }}</p>
          </div>
        </header>

        <div v-if="section.results.length === 0" class="px-4 py-5 text-sm text-[var(--app-text-muted)]">No results</div>

        <div v-else class="divide-y divide-[var(--app-border-muted)]">
          <component
            :is="result.external ? 'a' : RouterLink"
            v-for="result in section.results"
            :key="result.id"
            :href="result.external ? result.href : undefined"
            :to="!result.external ? result.href : undefined"
            :target="resultTarget(result)"
            :rel="resultRel(result)"
            class="block py-3 pl-12 pr-4 transition hover:bg-[var(--app-surface-hover)]"
          >
            <span class="block text-sm font-semibold text-[var(--app-text)]">
              {{ result.title }}<span v-if="result.premium" class="ml-1 text-[var(--app-primary)]">Premium</span>
            </span>
            <span v-if="result.subtitle" class="mt-1 block text-xs text-[var(--app-text-muted)]">{{ result.subtitle }}</span>
          </component>
        </div>
      </section>
    </div>
  </main>
</template>

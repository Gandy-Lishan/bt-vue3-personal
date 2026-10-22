<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { AlertCircle, ArrowUp, Clock3, Crown, List, LoaderCircle, RefreshCw, UserRound } from '@lucide/vue'
import { fetchIntradayMinutes } from '@/entities/minute/api/minute.api'
import { formatMinuteDate } from '@/entities/minute/model/minute.adapter'
import type { IntradayMinute } from '@/entities/minute/model/minute.types'
import { getCurrentAccessLevels, hasAnyAccess } from '@/shared/auth/permission'
import ListExplorerPage from '@/shared/ui/ListExplorerPage.vue'

const minutes = ref<IntradayMinute[]>([])
const loading = ref(true)
const loadError = ref('')
const requestController = new AbortController()

const hasPremiumAccess = computed(() => hasAnyAccess(getCurrentAccessLevels(), [
  'premium',
  'premium-data-yearly',
  'institutional',
  'instituational',
  'everything',
]))

function safeContent(html: string) {
  if (!html || typeof document === 'undefined') return html
  const template = document.createElement('template')
  template.innerHTML = html
  template.content.querySelectorAll('script, object, embed').forEach((element) => element.remove())
  template.content.querySelectorAll<HTMLElement>('*').forEach((element) => {
    for (const attribute of [...element.attributes]) {
      if (attribute.name.toLowerCase().startsWith('on')) element.removeAttribute(attribute.name)
      if (['href', 'src'].includes(attribute.name.toLowerCase()) && /^javascript:/i.test(attribute.value.trim())) {
        element.removeAttribute(attribute.name)
      }
    }
  })
  return template.innerHTML
}

function jumpToMinute(event: Event) {
  const index = Number((event.target as HTMLSelectElement).value)
  if (!Number.isInteger(index) || index < 0) return
  document.getElementById(`minute-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  ;(event.target as HTMLSelectElement).value = ''
}

function returnToQuickAccess() {
  document.getElementById('minutes-quick-access')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function loadMinutes() {
  loading.value = true
  loadError.value = ''
  try {
    minutes.value = await fetchIntradayMinutes(requestController.signal)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    minutes.value = []
    loadError.value = 'We could not load SentimenTrader Minutes. Please try again.'
  } finally {
    loading.value = false
  }
}

onMounted(loadMinutes)
onBeforeUnmount(() => requestController.abort())
</script>

<template>
  <ListExplorerPage
    title="SentimenTrader Minutes"
    description="Short, timely market notes published throughout the trading day."
    panel-title="Latest Minutes"
    panel-description="The ten most recent SentimenTrader Minute posts. A daily digest is published on the blog near the end of each day."
    :show-view-mode-toggle="false"
  >
    <template #summary>
      <span v-if="hasPremiumAccess && !loading" class="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-1.5">
        <Clock3 :size="14" class="text-[var(--app-primary)]" />
        <span class="font-extrabold text-[var(--app-text)]">{{ minutes.length }}</span>
        <span class="text-[var(--app-text-muted)]">recent posts</span>
      </span>
    </template>

    <div v-if="loading" class="flex min-h-72 flex-col items-center justify-center px-6 text-center text-[var(--app-text-muted)]">
      <LoaderCircle :size="30" class="animate-spin text-[var(--app-primary)]" />
      <p class="mt-3 text-sm font-semibold">Loading SentimenTrader Minutes...</p>
    </div>

    <div v-else-if="loadError" class="flex min-h-72 flex-col items-center justify-center px-6 text-center">
      <AlertCircle :size="30" class="text-[var(--app-negative)]" />
      <h2 class="mt-3 text-lg font-extrabold">Unable to load Minutes</h2>
      <p class="mt-1 text-sm text-[var(--app-text-muted)]">{{ loadError }}</p>
      <button class="mt-4 inline-flex items-center gap-2 rounded-md bg-[var(--app-primary)] px-4 py-2 text-sm font-bold text-white" type="button" @click="loadMinutes">
        <RefreshCw :size="15" /> Try again
      </button>
    </div>

    <div v-else-if="!hasPremiumAccess" class="p-4 sm:p-6">
      <section class="mx-auto max-w-4xl rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-6 text-center sm:p-8">
        <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--app-primary-soft)] text-[var(--app-primary)]">
          <Crown :size="24" />
        </span>
        <h2 class="mt-4 text-xl font-extrabold text-[var(--app-text)]">This is a premium feature</h2>
        <p class="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[var(--app-text-muted)]">
          Upgrade to Premium to read intraday SentimenTrader Minutes and access all other premium research and features.
        </p>
        <div class="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a class="inline-flex h-10 items-center justify-center rounded-md bg-[var(--app-primary)] px-5 text-sm font-extrabold text-white hover:bg-[var(--app-primary-hover)]" href="https://account.sentimentrader.com/" target="_blank" rel="noopener noreferrer">
            Upgrade your account
          </a>
          <a class="inline-flex h-10 items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-5 text-sm font-bold text-[var(--app-text-secondary)] hover:text-[var(--app-primary)]" href="https://users.sentimentrader.com/users/premium/" target="_blank" rel="noopener noreferrer">
            View premium plans
          </a>
        </div>
        <p class="mt-5 text-xs text-[var(--app-text-muted)]">
          Already upgraded? <a class="font-bold text-[var(--app-primary)] hover:underline" href="/MR/minutes">Refresh your permissions.</a>
        </p>
      </section>
    </div>

    <div v-else-if="!minutes.length" class="flex min-h-72 flex-col items-center justify-center px-6 text-center">
      <Clock3 :size="30" class="text-[var(--app-text-muted)]" />
      <h2 class="mt-3 text-lg font-extrabold">No Minutes available</h2>
      <p class="mt-1 text-sm text-[var(--app-text-muted)]">New intraday notes will appear here when they are published.</p>
    </div>

    <div v-else class="p-4">
      <nav id="minutes-quick-access" class="sticky top-2 z-20 mb-4 flex flex-col gap-3 rounded-lg border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_94%,transparent)] p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center" aria-label="Quick access to Minutes">
        <div class="flex shrink-0 items-center gap-2 text-sm font-extrabold text-[var(--app-text)]">
          <List :size="17" class="text-[var(--app-primary)]" />
          Quick access
        </div>
        <select class="h-10 min-w-0 flex-1 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text-secondary)]" aria-label="Jump to a Minute" @change="jumpToMinute">
          <option value="">Jump to a Minute...</option>
          <option v-for="(minute, index) in minutes" :key="`quick-${minute.id}-${index}`" :value="index">
            {{ index + 1 }}. {{ minute.title }} — {{ formatMinuteDate(minute.publishedAt) }}
          </option>
        </select>
      </nav>

      <div class="grid gap-4">
      <article v-for="(minute, index) in minutes" :id="`minute-${index}`" :key="`${minute.id}-${index}`" class="scroll-mt-24 overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_8px_24px_rgb(15_35_75_/_6%)]">
        <header class="border-b border-[var(--app-border-muted)] bg-[var(--app-surface-soft)] px-5 py-4">
          <div class="flex items-start gap-3">
            <span class="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-[var(--app-primary-soft)] px-2 text-xs font-extrabold text-[var(--app-primary)]">{{ index + 1 }}</span>
            <h2 class="text-xl font-extrabold leading-tight text-[var(--app-text)]">{{ minute.title }}</h2>
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-[var(--app-text-muted)]">
            <span class="inline-flex items-center gap-1.5"><Clock3 :size="14" />Published: {{ formatMinuteDate(minute.publishedAt) }}</span>
            <span class="inline-flex items-center gap-1.5"><UserRound :size="14" />Author: {{ minute.author }}</span>
          </div>
        </header>
        <div class="minute-rich-text px-5 py-5 text-sm leading-7 text-[var(--app-text-secondary)]" v-html="safeContent(minute.contentHtml)" />
        <footer class="flex justify-end border-t border-[var(--app-border-muted)] px-5 py-2.5">
          <button class="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--app-text-muted)] transition hover:text-[var(--app-primary)]" type="button" @click="returnToQuickAccess">
            <ArrowUp :size="14" /> Back to quick access
          </button>
        </footer>
      </article>
      </div>
    </div>
  </ListExplorerPage>
</template>

<style scoped>
.minute-rich-text :deep(p) { margin: 0 0 1rem; }
.minute-rich-text :deep(p:last-child) { margin-bottom: 0; }
.minute-rich-text :deep(a) { color: var(--app-primary); font-weight: 700; text-decoration: underline; }
.minute-rich-text :deep(img) { max-width: 100%; height: auto; border-radius: 0.5rem; }
.minute-rich-text :deep(ul), .minute-rich-text :deep(ol) { margin: 0.75rem 0; padding-left: 1.5rem; }
.minute-rich-text :deep(blockquote) { margin: 1rem 0; border-left: 3px solid var(--app-primary); padding-left: 1rem; color: var(--app-text-muted); }
</style>


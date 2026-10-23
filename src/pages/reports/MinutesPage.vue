<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AlertCircle, ArrowRight, Clock3, Crown, List, LoaderCircle, RefreshCw, UserRound } from '@lucide/vue'
import { fetchIntradayMinutes } from '@/entities/minute/api/minute.api'
import { formatMinuteDate } from '@/entities/minute/model/minute.adapter'
import { minutePlaceholderImage } from '@/entities/minute/model/minute.constants'
import type { IntradayMinute } from '@/entities/minute/model/minute.types'
import { getCurrentAccessLevels, hasAnyAccess } from '@/shared/auth/permission'
import ListExplorerPage from '@/shared/ui/ListExplorerPage.vue'

const minutes = ref<IntradayMinute[]>([])
const loading = ref(true)
const loadError = ref('')
const requestController = new AbortController()
const router = useRouter()

const hasPremiumAccess = computed(() => hasAnyAccess(getCurrentAccessLevels(), [
  'premium',
  'premium-data-yearly',
  'institutional',
  'instituational',
  'everything',
]))

function minuteExcerpt(html: string) {
  if (!html || typeof document === 'undefined') return ''
  const template = document.createElement('template')
  template.innerHTML = html
  const value = (template.content.textContent ?? '').replace(/\s+/g, ' ').trim()
  return value.length > 240 ? `${value.slice(0, 237).trimEnd()}...` : value
}

function minuteDetailRoute(minute: IntradayMinute) {
  return { name: 'minute-detail', params: { minuteId: minute.id } }
}

function jumpToMinute(event: Event) {
  const index = Number((event.target as HTMLSelectElement).value)
  if (!Number.isInteger(index) || index < 0) return
  const minute = minutes.value[index]
  if (minute) void router.push(minuteDetailRoute(minute))
  ;(event.target as HTMLSelectElement).value = ''
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

      <div class="minute-list" role="list">
        <article
          v-for="(minute, index) in minutes"
          :id="`minute-${index}`"
          :key="`${minute.id}-${index}`"
          class="minute-list-card"
          role="listitem"
        >
          <RouterLink class="minute-list-card__image-link" :to="minuteDetailRoute(minute)" :aria-label="`Read ${minute.title}`">
            <img :src="minutePlaceholderImage" :alt="`${minute.title} preview`" class="minute-list-card__image" loading="lazy" />
          </RouterLink>

          <div class="minute-list-card__summary">
            <div class="minute-list-card__bar">
              <span><Clock3 :size="14" /> Latest Minute</span>
              <span>{{ formatMinuteDate(minute.publishedAt) }}</span>
            </div>
            <div class="minute-list-card__body">
              <div class="minute-list-card__copy">
                <RouterLink :to="minuteDetailRoute(minute)" class="minute-list-card__title">{{ minute.title }}</RouterLink>
                <p>{{ minuteExcerpt(minute.contentHtml) || 'Open this Minute to read the latest intraday market note.' }}</p>
                <div class="minute-list-card__meta">
                  <span><Clock3 :size="14" />{{ formatMinuteDate(minute.publishedAt) }}</span>
                  <span aria-hidden="true">•</span>
                  <span><UserRound :size="14" />{{ minute.author }}</span>
                </div>
              </div>
              <RouterLink class="minute-list-card__action" :to="minuteDetailRoute(minute)">Read Minute <ArrowRight :size="16" /></RouterLink>
            </div>
          </div>
        </article>
      </div>
    </div>
  </ListExplorerPage>
</template>

<style scoped>
.minute-list { display: grid; gap: 1rem; }
.minute-list-card { display: grid; grid-template-columns: 180px minmax(0, 1fr); min-height: 184px; scroll-margin-top: 6rem; overflow: hidden; border: 1px solid var(--app-border); border-radius: 1rem; background: var(--app-surface); box-shadow: 0 10px 28px rgb(15 35 75 / 8%); transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease; }
.minute-list-card:hover { border-color: color-mix(in srgb, var(--app-primary) 38%, var(--app-border)); box-shadow: 0 16px 34px rgb(15 35 75 / 13%); transform: translateY(-2px); }
.minute-list-card__image-link { display: block; width: 180px; min-height: 184px; overflow: hidden; border-right: 1px solid var(--app-border-muted); background: var(--app-surface-soft); }
.minute-list-card__image { display: block; width: 100%; height: 100%; min-height: 184px; object-fit: cover; transition: transform 220ms ease; }
.minute-list-card:hover .minute-list-card__image { transform: scale(1.02); }
.minute-list-card__summary { display: grid; min-width: 0; grid-template-rows: auto minmax(0, 1fr); }
.minute-list-card__bar { display: flex; min-height: 30px; align-items: center; justify-content: space-between; gap: 1rem; padding: .35rem .9rem; color: var(--app-report-bar-text); background: var(--app-report-bar-bg); font-size: .7rem; }
.minute-list-card__bar span { display: inline-flex; align-items: center; gap: .45rem; }
.minute-list-card__body { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: stretch; gap: 1rem; padding: 1rem; }
.minute-list-card__copy { display: flex; min-width: 0; flex-direction: column; }
.minute-list-card__title { display: -webkit-box; overflow: hidden; color: var(--app-text); font-size: clamp(1rem, 1.35vw, 1.25rem); font-weight: 800; line-height: 1.3; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.minute-list-card__title:hover { color: var(--app-primary); }
.minute-list-card__copy > p { display: -webkit-box; overflow: hidden; margin-top: .55rem; color: var(--app-text-muted); font-size: .84rem; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.minute-list-card__meta { display: flex; flex-wrap: wrap; align-items: center; gap: .7rem; margin-top: auto; padding-top: .7rem; color: var(--app-text-muted); font-size: .72rem; }
.minute-list-card__meta span { display: inline-flex; align-items: center; gap: .4rem; }
.minute-list-card__action { display: inline-flex; min-width: 124px; min-height: 38px; align-items: center; justify-content: center; gap: .55rem; align-self: end; border-radius: .65rem; padding: .55rem .8rem; color: white; background: linear-gradient(135deg, var(--app-primary), var(--app-primary-hover)); font-size: .78rem; font-weight: 800; box-shadow: 0 8px 18px rgb(28 104 235 / 24%); transition: filter 150ms ease, transform 150ms ease; }
.minute-list-card__action:hover { filter: brightness(1.08); transform: translateY(-1px); }
@media (max-width: 639px) {
  .minute-list-card { display: block; min-height: 0; border-radius: .8rem; }
  .minute-list-card__image-link { width: 100%; height: 180px; min-height: 0; border-right: 0; border-bottom: 1px solid var(--app-border-muted); }
  .minute-list-card__image { height: 180px; min-height: 0; }
  .minute-list-card__bar { align-items: flex-start; font-size: .65rem; }
  .minute-list-card__body { grid-template-columns: minmax(0, 1fr); padding: .9rem; }
  .minute-list-card__action { width: 100%; }
}
</style>


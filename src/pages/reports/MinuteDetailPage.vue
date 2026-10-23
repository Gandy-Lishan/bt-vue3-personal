<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AlertCircle, ArrowLeft, Clock3, LoaderCircle, UserRound } from '@lucide/vue'
import { fetchIntradayMinutes } from '@/entities/minute/api/minute.api'
import { formatMinuteDate } from '@/entities/minute/model/minute.adapter'
import { minutePlaceholderImage } from '@/entities/minute/model/minute.constants'
import type { IntradayMinute } from '@/entities/minute/model/minute.types'
import { getCurrentAccessLevels, hasAnyAccess } from '@/shared/auth/permission'

const route = useRoute()
const router = useRouter()
const minute = ref<IntradayMinute | null>(null)
const loading = ref(true)
const loadError = ref('')
const requestController = new AbortController()

const minuteId = computed(() => String(route.params.minuteId ?? ''))
const hasPremiumAccess = computed(() => hasAnyAccess(getCurrentAccessLevels(), ['premium', 'premium-data-yearly', 'institutional', 'instituational', 'everything']))

function safeContent(html: string) {
  if (!html || typeof document === 'undefined') return html
  const template = document.createElement('template')
  template.innerHTML = html
  template.content.querySelectorAll('script, object, embed').forEach((element) => element.remove())
  template.content.querySelectorAll<HTMLElement>('*').forEach((element) => {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase()
      if (name.startsWith('on')) element.removeAttribute(attribute.name)
      if (['href', 'src'].includes(name) && /^javascript:/i.test(attribute.value.trim())) element.removeAttribute(attribute.name)
    }
  })
  return template.innerHTML
}

async function loadMinute() {
  loading.value = true
  loadError.value = ''
  try {
    const minutes = await fetchIntradayMinutes(requestController.signal)
    minute.value = minutes.find((item) => item.id === minuteId.value) ?? null
    if (!minute.value) loadError.value = 'This Minute is no longer available in the latest feed.'
    else document.title = `${minute.value.title} | SentimenTrader Minutes`
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    loadError.value = 'We could not load this Minute. Please try again.'
  } finally {
    loading.value = false
  }
}

onMounted(loadMinute)
onBeforeUnmount(() => requestController.abort())
</script>

<template>
  <main class="minute-detail-page">
    <div v-if="loading" class="minute-detail-state"><LoaderCircle :size="32" class="animate-spin text-[var(--app-primary)]" /><p>Loading Minute...</p></div>
    <div v-else-if="loadError || !minute" class="minute-detail-state"><AlertCircle :size="34" class="text-[var(--app-negative)]" /><h1>Unable to load Minute</h1><p>{{ loadError }}</p><button type="button" @click="router.push('/MR/minutes')">Back to Latest Minutes</button></div>
    <div v-else class="minute-detail-layout">
      <nav class="minute-detail-toolbar" aria-label="Minute navigation"><button type="button" @click="router.push('/MR/minutes')"><ArrowLeft :size="16" />Back to Latest Minutes</button></nav>
      <article class="minute-detail-article">
        <img class="minute-detail-image" :src="minutePlaceholderImage" alt="SentimenTrader" />
        <header>
          <h1>{{ minute.title }}</h1>
          <div class="minute-detail-meta"><span><Clock3 :size="15" />{{ formatMinuteDate(minute.publishedAt) }}</span><span><UserRound :size="15" />{{ minute.author }}</span></div>
        </header>
        <div v-if="hasPremiumAccess" class="minute-detail-content" v-html="safeContent(minute.contentHtml)" />
        <div v-else class="minute-detail-gate"><h2>This is a premium feature</h2><p>Upgrade to Premium to read SentimenTrader Minutes.</p></div>
      </article>
    </div>
  </main>
</template>

<style scoped>
.minute-detail-page { min-height: 100vh; padding: 1.5rem var(--page-gutter) 3rem; color: var(--app-text); background: var(--app-bg); }
.minute-detail-layout { display: grid; gap: 1rem; max-width: 920px; margin: 0 auto; }
.minute-detail-toolbar { display: flex; border: 1px solid var(--app-border); border-radius: .75rem; padding: .5rem .85rem; background: var(--app-surface); box-shadow: 0 8px 24px rgb(15 23 42 / 5%); }
.minute-detail-toolbar button { display: inline-flex; min-height: 36px; align-items: center; gap: .45rem; color: var(--app-primary); font-size: .78rem; font-weight: 750; }
.minute-detail-article { overflow: hidden; border: 1px solid var(--app-border); border-radius: 1rem; background: var(--app-surface); box-shadow: 0 12px 32px rgb(15 35 75 / 9%); }
.minute-detail-image { display: block; width: 100%; max-height: 300px; object-fit: cover; border-bottom: 1px solid var(--app-border-muted); }
.minute-detail-article > header { padding: 1.4rem 1.6rem 1.15rem; border-bottom: 1px solid var(--app-border-muted); }
.minute-detail-article h1 { margin: 0; font-size: clamp(1.7rem, 3vw, 2.35rem); font-weight: 600; line-height: 1.22; }
.minute-detail-meta { display: flex; flex-wrap: wrap; gap: .75rem 1.3rem; margin-top: .85rem; color: var(--app-text-muted); font-size: .76rem; }
.minute-detail-meta span { display: inline-flex; align-items: center; gap: .4rem; }
.minute-detail-content { padding: 1.4rem 1.6rem 2rem; color: var(--app-text-secondary); font-size: .9rem; line-height: 1.75; }
.minute-detail-content :deep(p) { margin: 0 0 1rem; }
.minute-detail-content :deep(a) { color: var(--app-primary); font-weight: 700; text-decoration: underline; }
.minute-detail-content :deep(img) { max-width: 100%; height: auto; border-radius: .5rem; }
.minute-detail-content :deep(ul), .minute-detail-content :deep(ol) { margin: .75rem 0; padding-left: 1.5rem; }
.minute-detail-content :deep(blockquote) { margin: 1rem 0; border-left: 3px solid var(--app-primary); padding-left: 1rem; color: var(--app-text-muted); }
.minute-detail-gate { padding: 4rem 1.5rem; text-align: center; }
.minute-detail-gate h2 { font-size: 1.25rem; font-weight: 800; }
.minute-detail-gate p, .minute-detail-state p { margin-top: .45rem; color: var(--app-text-muted); }
.minute-detail-state { display: grid; min-height: 55vh; place-items: center; align-content: center; gap: .65rem; text-align: center; }
.minute-detail-state h1 { font-size: 1.4rem; font-weight: 800; }
.minute-detail-state button { margin-top: .5rem; border-radius: .45rem; padding: .65rem 1rem; color: white; background: var(--app-primary); font-size: .8rem; font-weight: 700; }
@media (max-width: 639px) { .minute-detail-page { padding: .75rem var(--page-gutter) 2rem; } .minute-detail-image { max-height: 210px; } .minute-detail-article > header, .minute-detail-content { padding-right: 1rem; padding-left: 1rem; } }
</style>

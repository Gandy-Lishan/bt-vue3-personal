<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import {
  AlertCircle,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Heart,
  LoaderCircle,
  LockKeyhole,
  Printer,
  Share2,
  UserRound,
} from '@lucide/vue'
import { fetchReportDetail, fetchReportLibrary, setReportFavorite } from '@/entities/report/api/report.api'
import type { ReportDetail, ReportLibraryItem } from '@/entities/report/model/report.types'

const route = useRoute()
const router = useRouter()
const report = ref<ReportDetail | null>(null)
const contentHtml = ref('')
const relatedReports = ref<ReportLibraryItem[]>([])
const isLoading = ref(true)
const loadError = ref('')
const isSaving = ref(false)
const shareLabel = ref('Share')
let requestController: AbortController | null = null

const slug = computed(() => String(route.params.slug ?? ''))

const sourceLabel = computed(() => {
  const source = typeof route.query.from === 'string' ? route.query.from.trim() : ''
  return source || report.value?.category || 'Reports'
})

function positiveInteger(value: unknown) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

const archiveDestination = computed<RouteLocationRaw>(() => {
  const source = sourceLabel.value
  const page = positiveInteger(route.query.page)
  if (source === 'Daily Report') {
    const year = positiveInteger(route.query.year) ?? new Date().getFullYear()
    return {
      name: year <= 2019 ? 'old-daily-report-archives' : 'daily-report-archives',
      params: { year, page },
    }
  }
  if (source === 'My Favorites') {
    return page ? { path: '/MR/favorites', query: { page } } : '/MR/favorites'
  }
  const productPaths: Record<string, string> = {
    'All Reports': '/MR/reports',
    Reports: '/MR/reports',
    SentimentEdge: '/MR/sentimentedge',
    ModelEdge: '/MR/modeledge',
    "Kaeppel's Corner": '/MR/quantedge',
    TradingEdge: '/MR/tradingedge',
    'Market Impact Analysis': '/MR/impactedge',
  }
  const productPath = productPaths[source]
  if (productPath) {
    const query: Record<string, string | number> = {}
    if (source !== 'All Reports' && source !== 'Reports') query.tag = source
    if (page) query.page = page
    return Object.keys(query).length ? { path: productPath, query } : productPath
  }
  return { name: 'reports-by-tag', params: { blogTag: source, page } }
})

const archiveButtonLabel = computed(() => {
  const source = sourceLabel.value
  if (source === 'My Favorites') return 'View My Favorites'
  const label = source === 'All Reports' ? 'Report' : source
  return `View the ${label} Archives`
})

const backButtonLabel = computed(() => {
  const label = sourceLabel.value === 'All Reports' ? 'reports' : sourceLabel.value
  return `Back to ${label}`
})

function detailLibraryQuery(detail: ReportDetail) {
  const source = sourceLabel.value || detail.category
  const page = positiveInteger(route.query.page) ?? 1
  if (source === 'Daily Report') {
    return { page, archiveYear: positiveInteger(route.query.year) ?? new Date().getFullYear() }
  }
  // "My Favorites" is not a real blog tag — pull one page of the general list
  // for Previous Research instead of querying blog_tags=My+Favorites.
  if (source === 'My Favorites') return { page }
  const productLevels: Record<string, string> = {
    'Free for Public': 'public',
    SentimentEdge: 'sentimentedge',
    ModelEdge: 'modeledge',
    "Kaeppel's Corner": 'quantedge',
    TradingEdge: 'tradingedge',
    'Market Impact Analysis': 'impactedge',
  }
  if (productLevels[source]) return { page, userLevel: productLevels[source] }
  if (source !== 'All Reports' && source !== 'Reports') return { page, tag: source }
  return { page }
}

function contextualDetailHref(href: string) {
  const context = new URLSearchParams({ from: sourceLabel.value })
  const year = positiveInteger(route.query.year)
  const page = positiveInteger(route.query.page)
  if (year) context.set('year', String(year))
  if (page) context.set('page', String(page))
  return `${href}?${context.toString()}`
}

const formattedDate = computed(() => {
  if (!report.value?.publishedAt) return ''
  const date = new Date(report.value.publishedAt)
  if (Number.isNaN(date.getTime())) return report.value.publishedAt
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
})

function formatResearchDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

const bannerImageUrl = computed(() => {
  const reportLevel = report.value?.userLevel.toLowerCase() ?? ''
  const banners: Record<string, string> = {
    sentimentedge: 'https://mcusercontent.com/c1ba721d50cd9f9c0070e927f/images/dbc38582-359b-c5e5-f142-3e82bb97904c.png',
    quantedge: 'https://mcusercontent.com/c1ba721d50cd9f9c0070e927f/images/13d4bb49-034a-7505-dba1-d8f33133b5a0.png',
    kaeppelscorner: 'https://mcusercontent.com/c1ba721d50cd9f9c0070e927f/images/13d4bb49-034a-7505-dba1-d8f33133b5a0.png',
    modeledge: 'https://mcusercontent.com/c1ba721d50cd9f9c0070e927f/images/b9ffe0ae-74cc-9fb9-1b80-b4079091d020.png',
    tradingedge: 'https://mcusercontent.com/c1ba721d50cd9f9c0070e927f/images/4e911970-b3cd-6202-a435-734821c3c972.png',
    impactedge: 'https://mcusercontent.com/c1ba721d50cd9f9c0070e927f/images/105ad29f-7bb8-9913-00b3-42c276f94272.png',
  }
  return banners[reportLevel] ?? ''
})

const displayTags = computed(() => {
  if (!report.value) return []
  return report.value.topics.length ? report.value.topics : [report.value.category]
})

function forecastDirection(value: string) {
  const direction = value.toLowerCase()
  if (direction === 'up') return 'up'
  if (direction === 'down') return 'down'
  return 'neutral'
}

function prepareContent(html: string) {
  if (!html || typeof document === 'undefined') return html
  const template = document.createElement('template')
  template.innerHTML = html
  template.content.querySelectorAll('script, object, embed').forEach((element) => element.remove())
  template.content.querySelectorAll<HTMLElement>('*').forEach((element) => {
    for (const attribute of [...element.attributes]) {
      if (attribute.name.toLowerCase().startsWith('on')) element.removeAttribute(attribute.name)
    }
  })
  return template.innerHTML
}

async function loadReport() {
  requestController?.abort()
  requestController = new AbortController()
  isLoading.value = true
  loadError.value = ''
  try {
    const detail = await fetchReportDetail(slug.value, requestController.signal)
    const library = await fetchReportLibrary(detailLibraryQuery(detail), requestController.signal)
    report.value = detail
    contentHtml.value = prepareContent(detail.contentHtml)
    relatedReports.value = library.items.filter((item) => item.id !== detail.id).slice(0, 6)
    document.title = `${detail.title} | SentimenTrader`
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    loadError.value = 'We could not load this report. It may have moved or is temporarily unavailable.'
  } finally {
    isLoading.value = false
  }
}

async function toggleFavorite() {
  if (!report.value || isSaving.value) return
  const previous = report.value.isFavorite
  report.value.isFavorite = !previous
  isSaving.value = true
  try {
    await setReportFavorite(report.value.id, !previous)
  } catch {
    report.value.isFavorite = previous
  } finally {
    isSaving.value = false
  }
}

async function shareReport() {
  const data = { title: report.value?.title ?? document.title, url: window.location.href }
  try {
    if (navigator.share) await navigator.share(data)
    else {
      await navigator.clipboard.writeText(data.url)
      shareLabel.value = 'Copied'
      window.setTimeout(() => { shareLabel.value = 'Share' }, 1600)
    }
  } catch {
    shareLabel.value = 'Share'
  }
}

function printReport() {
  window.print()
}

onMounted(() => void loadReport())
onBeforeUnmount(() => {
  requestController?.abort()
})
watch(slug, () => void loadReport())
</script>

<template>
  <main class="report-detail-page">
    <div v-if="isLoading" class="report-state">
      <LoaderCircle :size="32" class="animate-spin text-[var(--app-primary)]" />
      <p>Loading report...</p>
    </div>

    <div v-else-if="loadError || !report" class="report-state">
      <AlertCircle :size="34" class="text-[var(--app-negative)]" />
      <h1>Unable to load report</h1>
      <p>{{ loadError }}</p>
      <button type="button" @click="router.push(archiveDestination)">{{ backButtonLabel }}</button>
    </div>

    <div v-else class="report-detail-layout">
      <section class="report-toolbar" aria-label="Report tools">
        <button class="report-back" type="button" @click="router.push(archiveDestination)">
          <ArrowLeft :size="16" /> {{ backButtonLabel }}
        </button>
        <div class="report-actions report-actions--inline">
          <button type="button" :disabled="isSaving" :aria-label="report.isFavorite ? 'Unlike report' : 'Like report'" :title="report.isFavorite ? 'Unlike report' : 'Like report'" @click="toggleFavorite">
            <Heart :size="17" :fill="report.isFavorite ? 'currentColor' : 'none'" />
          </button>
          <button type="button" aria-label="Print report" title="Print report" @click="printReport"><Printer :size="16" /></button>
          <button type="button" :aria-label="shareLabel === 'Copied' ? 'Link copied' : 'Share report'" :title="shareLabel === 'Copied' ? 'Link copied' : 'Share report'" @click="shareReport"><Share2 :size="16" /></button>
        </div>
      </section>

      <article class="report-article">
        <div v-if="bannerImageUrl" class="report-product-banner">
          <img :src="bannerImageUrl" :alt="`${report.category} banner`" />
        </div>
        <header class="report-article__header">
          <h1>{{ report.title }}</h1>
          <div class="report-article__byline">
            <span><UserRound :size="15" />{{ report.author }}</span>
            <span><CalendarDays :size="15" />{{ formattedDate }}</span>
          </div>
        </header>

        <section v-if="report.hasAccess && report.forecasts.length" class="report-forecasts">
          <header>
            <h2>Forecast(s) associated with this post</h2>
            <a href="https://users.sentimentrader.com/users/knowledge_base_article/How%20accurate%20are%20your%20studies%3F">What is this?</a>
          </header>
          <div class="report-forecasts__table-wrap">
            <table>
              <thead><tr><th>Forecast</th><th>Market</th><th>Timeframe</th></tr></thead>
              <tbody>
                <tr v-for="(forecast, index) in report.forecasts" :key="`${forecast.market}-${forecast.timeframe}-${index}`">
                  <td>
                    <span class="forecast-direction" :class="`forecast-direction--${forecastDirection(forecast.forecast)}`" :aria-label="forecast.forecast">
                      <ArrowUp v-if="forecastDirection(forecast.forecast) === 'up'" :size="18" />
                      <ArrowDown v-else-if="forecastDirection(forecast.forecast) === 'down'" :size="18" />
                      <span v-else>—</span>
                    </span>
                  </td>
                  <td><strong>{{ forecast.market }}</strong></td>
                  <td><strong>{{ forecast.timeframe || '—' }}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <div v-if="report.hasAccess" class="report-rich-text" v-html="contentHtml" />
        <footer v-if="report.hasAccess && displayTags.length" class="report-tags">
          <h2>Tagged As:</h2>
          <ul>
            <li v-for="tag in displayTags" :key="tag">
              <RouterLink :to="{ name: 'reports-by-tag', params: { blogTag: tag } }">{{ tag }}</RouterLink>
            </li>
          </ul>
        </footer>
        <div v-if="!report.hasAccess" class="report-access-gate">
          <LockKeyhole :size="30" />
          <h2>This report is for members</h2>
          <p>Your current plan does not include access to this report.</p>
        </div>
      </article>

      <aside class="report-previous-research">
        <section v-if="relatedReports.length" class="report-related">
          <h2>Previous Research</h2>
          <RouterLink v-for="item in relatedReports" :key="item.id" :to="contextualDetailHref(item.href)">
            <strong>{{ item.title }}</strong>
            <span>{{ formatResearchDate(item.publishedAt) }}</span>
          </RouterLink>
          <RouterLink class="report-related__all" :to="archiveDestination">{{ archiveButtonLabel }}</RouterLink>
        </section>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.report-detail-page { min-height: 100vh; padding: 1.5rem var(--page-gutter) 3rem; background: var(--app-bg); color: var(--app-text); }
.report-detail-layout { display: grid; grid-template-columns: minmax(0, 3fr) minmax(220px, 1fr); gap: 1.875rem; max-width: 1170px; margin: 0 auto; align-items: start; }
.report-toolbar { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 1rem; border: 1px solid var(--app-border); border-radius: .75rem; padding: .5rem .85rem; background: var(--app-surface); box-shadow: 0 8px 24px rgb(15 23 42 / 5%); }
.report-article { min-width: 0; overflow: visible; border: 1px solid var(--app-border); border-radius: .75rem; padding: 1.25rem 1.4rem; background: var(--app-surface); box-shadow: 0 8px 24px rgb(15 23 42 / 5%); }
.report-previous-research { position: static; min-width: 0; border: 1px solid var(--app-border); border-radius: .75rem; padding: 1.15rem; background: var(--app-surface); box-shadow: 0 8px 24px rgb(15 23 42 / 5%); }
.report-product-banner { display: flex; align-items: center; margin: -1.25rem -1.4rem 1.25rem; overflow: hidden; border-radius: .7rem .7rem 0 0; background: #fbc01f; }
.report-product-banner img { display: block; width: min(100%, 564px); height: auto; }
.report-back { display: flex; width: fit-content; min-height: 36px; align-items: center; gap: .4rem; border: 0; padding: 0 .15rem; color: var(--app-primary); background: transparent; font-size: .75rem; font-weight: 700; }
.report-back:hover { color: var(--app-primary-hover); }
.report-related h2 { margin: 0 0 1rem; color: #000; font-size: 1.65rem; font-weight: 300; line-height: 1.25; }
.report-article__header { padding: .25rem 0 1rem; border-bottom: 1px solid var(--app-border-muted); }
.report-article__header h1 { margin: 0; color: var(--app-text); font-size: clamp(1.8rem, 3vw, 2.45rem); font-weight: 500; line-height: 1.2; letter-spacing: -.02em; }
.report-article__byline { display: flex; flex-wrap: wrap; gap: .75rem 1.25rem; margin-top: .85rem; color: var(--app-text-muted); font-size: .75rem; }
.report-article__byline span { display: inline-flex; align-items: center; gap: .4rem; }
.report-rich-text { padding: 1rem 0 2.2rem; color: var(--app-text-secondary); font-size: .875rem; line-height: 1.5; }
.report-forecasts { margin-top: 1rem; overflow: hidden; border: 1px solid var(--app-border-muted); border-radius: .45rem; }
.report-forecasts header { position: relative; display: flex; min-height: 44px; align-items: center; justify-content: center; gap: 1rem; padding: .65rem 1rem; border-bottom: 1px solid var(--app-border-muted); background: var(--app-surface-muted); }
.report-forecasts h2 { margin: 0; color: var(--app-text); font-size: 1rem; font-weight: 600; text-align: center; }
.report-forecasts header a { position: absolute; right: 1rem; color: var(--app-primary); font-size: .7rem; text-decoration: none; }
.report-forecasts__table-wrap { overflow-x: auto; padding: .75rem 1rem; }
.report-forecasts table { width: 100%; border-collapse: collapse; text-align: center; }
.report-forecasts th, .report-forecasts td { padding: .45rem; border-bottom: 1px solid var(--app-border-muted); }
.report-forecasts th { color: var(--app-text-muted); font-size: .72rem; font-weight: 600; }
.report-forecasts td { color: var(--app-text-secondary); font-size: .8rem; }
.report-forecasts tbody tr:last-child td { border-bottom: 0; }
.forecast-direction { display: inline-flex; align-items: center; justify-content: center; color: var(--app-text-muted); }
.forecast-direction--up { color: var(--app-positive); }
.forecast-direction--down { color: var(--app-negative); }
.report-rich-text :deep(h1), .report-rich-text :deep(h2), .report-rich-text :deep(h3) { color: inherit; line-height: 1.3; }
.report-rich-text :deep(p) { margin: .7rem 0; }
.report-rich-text :deep(ul), .report-rich-text :deep(ol) { margin: .7rem 0; padding-left: 1.3rem; }
.report-rich-text :deep(ul) { list-style: disc; }
.report-rich-text :deep(ol) { list-style: decimal; }
.report-rich-text :deep(img) { display: block; max-width: 100% !important; height: auto !important; margin: 1rem auto; border-radius: .35rem; }
.report-rich-text :deep(table) { width: 100% !important; max-width: 100%; border-collapse: collapse; }
.report-rich-text :deep(td), .report-rich-text :deep(th) { padding: .35rem; }
.report-rich-text :deep(a) { color: var(--app-primary); text-decoration: underline; }
.report-rich-text :deep(iframe) { max-width: 100%; }
.report-tags { margin-top: .5rem; padding: 1rem 0 .25rem; border-top: 1px solid var(--app-border-muted); }
.report-tags h2 { margin: 0; color: var(--app-text); font-size: 1.15rem; font-weight: 500; }
.report-tags ul { display: flex; flex-wrap: wrap; gap: .5rem; margin: .8rem 0 0; padding: 0; list-style: none; }
.report-tags a { display: inline-flex; border-radius: .3rem; padding: .45rem .65rem; color: var(--app-text-muted); background: var(--app-surface-muted); font-size: .72rem; font-weight: 700; line-height: 1; text-decoration: none; text-transform: uppercase; }
.report-tags a:hover { color: var(--app-primary); background: var(--app-primary-soft); }
.report-access-gate { display: grid; min-height: 360px; place-items: center; align-content: center; padding: 2rem; text-align: center; }
.report-access-gate h2 { margin-top: .75rem; font-size: 1.25rem; font-weight: 800; }
.report-access-gate p { margin-top: .35rem; color: var(--app-text-muted); font-size: .85rem; }
.report-actions { display: grid; gap: .45rem; margin-top: .9rem; }
.report-actions button { display: flex; min-height: 34px; align-items: center; justify-content: center; gap: .45rem; border: 1px solid var(--app-border); border-radius: .4rem; color: var(--app-text-secondary); background: var(--app-surface-soft); font-size: .75rem; font-weight: 700; }
.report-actions button:hover { border-color: var(--app-primary); color: var(--app-primary); }
.report-actions button:disabled { cursor: wait; opacity: .6; }
.report-actions--inline { display: flex; flex: none; justify-self: end; gap: .45rem; margin-top: 0; }
.report-actions--inline button { width: 36px; min-width: 36px; padding: 0; }
.report-related a { display: grid; gap: .3rem; padding: .7rem 0; border-bottom: 1px solid var(--app-border-muted); text-decoration: none; }
.report-related a strong { color: #000; font-size: .95rem; font-weight: 400; line-height: 1.4; }
.report-related a span { color: var(--app-text-muted); font-size: .7rem; }
.report-related a:hover strong { color: var(--app-primary); }
.report-related .report-related__all { display: flex; min-height: 38px; align-items: center; justify-content: center; margin-top: .9rem; padding: .5rem; color: #000; background: #fbc01f; font-size: .76rem; font-weight: 400; }
.report-state { display: grid; min-height: 55vh; place-items: center; align-content: center; gap: .65rem; text-align: center; }
.report-state h1 { font-size: 1.4rem; font-weight: 800; }
.report-state p { max-width: 500px; color: var(--app-text-muted); font-size: .85rem; }
.report-state button { margin-top: .5rem; border-radius: .45rem; padding: .65rem 1rem; color: white; background: var(--app-primary); font-size: .8rem; font-weight: 700; }
@media (max-width: 900px) { .report-detail-layout { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 760px) { .report-detail-page { padding: .75rem var(--page-gutter) 2rem; } .report-toolbar { gap: .55rem; } .report-article { padding: 1rem; } .report-product-banner { margin: -1rem -1rem 1rem; } .report-forecasts header { justify-content: flex-start; padding-right: 5.5rem; } }
@media print {
  :global(body *) { visibility: hidden !important; }
  .report-article, .report-article * { visibility: visible !important; }
  .report-detail-page { min-height: 0; padding: 0; background: white; }
  .report-detail-layout { display: block; max-width: none; }
  .report-toolbar, .report-previous-research { display: none !important; }
  .report-article { position: absolute; inset: 0 auto auto 0; width: 100%; border: 0; padding: 0; color: #000; background: white; box-shadow: none; }
}
</style>

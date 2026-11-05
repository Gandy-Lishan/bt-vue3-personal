<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowLeft, ChevronDown, Search, X } from '@lucide/vue'
import Highcharts from 'highcharts'
import 'highcharts/modules/heatmap'
import 'highcharts/modules/treemap'
import { fetchCustomHeatmap, fetchCustomHeatmapOptions, updateCustomHeatmap, type CustomHeatmapData } from '@/pages/dashboard/custom-heatmap.api'

interface HeatmapPoint extends Highcharts.PointOptionsObject {
  name: string
  value: number
  colorValue: number
  link: string
  reading: string
  thumbnail: string
}

const movingAverages = [0, 3, 5, 10, 20, 50, 100, 200]
const selectedMovingAverageIndex = ref(0)
const heatmapData = ref<unknown[]>([])
const selected = ref<CustomHeatmapData['selected']>([])
const savedSelected = ref<CustomHeatmapData['selected']>([])
const candidates = ref<{ url: string; name: string }[]>([])
const search = ref('')
const pickerOpen = ref(false)
const expanded = ref(false)
const picker = ref<HTMLElement | null>(null)
const candidateLoading = ref(false)
const candidateError = ref(false)
const filteredCandidates = computed(() => candidates.value.filter(item => `${item.name} ${item.url}`.toLowerCase().includes(search.value.trim().toLowerCase())).slice(0, 80))
const visibleSelected = computed(() => expanded.value ? selected.value : selected.value.slice(0, 11))
const hiddenCount = computed(() => Math.max(0, selected.value.length - 11))
const hasChanges = computed(() => selected.value.some(item => !savedSelected.value.some(saved => saved.url === item.url)))
const saving = ref(false)
const actionError = ref('')
const chartElement = ref<HTMLElement | null>(null)
const loading = ref(false)
const loadError = ref(false)
const hover = ref<{ name: string; reading: string; thumbnail: string; x: number; y: number } | null>(null)
let lastPreviewPointer = { x: 12, y: 12 }
let chart: Highcharts.Chart | null = null
let controller: AbortController | null = null
let themeObserver: MutationObserver | null = null

function themeColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function rgb(hex: string): [number, number, number] {
  const digits = hex.replace('#', '')
  return [0, 2, 4].map((index) => Number.parseInt(digits.slice(index, index + 2), 16)) as [number, number, number]
}

function mixedColor(foreground: string, background: string, amount: number): string {
  const front = rgb(foreground)
  const back = rgb(background)
  return `rgb(${front.map((channel, index) => Math.round(channel * amount + back[index]! * (1 - amount))).join(', ')})`
}

function luminance(color: string): number {
  const channels = color.startsWith('#') ? rgb(color) : color.match(/\d+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0]
  const linear = channels.map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722
}

function readableText(background: string): string {
  const candidates = [themeColor('--app-text'), themeColor('--app-on-strong-tone')]
  const backgroundLuminance = luminance(background)
  return candidates.sort((left, right) => {
    const ratio = (color: string) => {
      const value = luminance(color)
      return (Math.max(value, backgroundLuminance) + 0.05) / (Math.min(value, backgroundLuminance) + 0.05)
    }
    return ratio(right) - ratio(left)
  })[0]!
}

function text(value: unknown, fallback = ''): string {
  return value === null || value === undefined || value === '' ? fallback : String(value)
}

function number(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function pointAppearance(score: number) {
  const surface = themeColor('--app-surface')
  let color = themeColor('--app-surface-muted')
  if (score <= 2) color = mixedColor(themeColor('--app-positive'), surface, 0.95)
  else if (score <= 3) color = mixedColor(themeColor('--app-positive'), surface, 0.26)
  else if (score >= 6) color = mixedColor(themeColor('--app-negative'), surface, 0.76)
  else if (score >= 5) color = mixedColor(themeColor('--app-negative'), surface, 0.33)
  return { color, textColor: readableText(color) }
}

function formatData(bucket: unknown): HeatmapPoint[] {
  if (!Array.isArray(bucket)) return []
  return bucket.flatMap((item): HeatmapPoint[] => {
    if (!Array.isArray(item)) return []
    const link = text(item[1])
    const reading = text(item[2], '—')
    const score = number(item[3], 4)
    const appearance = pointAppearance(score)
    return [{
      name: text(item[0], 'Indicator'),
      link,
      reading,
      value: Math.max(.01, number(item[2], 1)),
      colorValue: score,
      color: appearance.color,
      dataLabels: { style: { color: appearance.textColor } },
      thumbnail: link ? `https://d1wrgh3h32hjn2.cloudfront.net/${link}_250.png` : '',
    }]
  })
}

function openIndicator(link: string) {
  if (!link) return
  const query = new URLSearchParams({ index: 'Unknown', indicator: link })
  window.location.assign(`/backtester/sr/setup?${query.toString()}`)
}

function movePreview(event: MouseEvent) {
  lastPreviewPointer = { x: event.clientX, y: event.clientY }
  if (!hover.value) return
  const width = 300
  hover.value.x = Math.min(window.innerWidth - width - 12, Math.max(12, event.clientX + 14))
  hover.value.y = Math.max(12, Math.min(window.innerHeight - 60, event.clientY + 14))
}

function hideBrokenThumbnail() { if (hover.value) hover.value.thumbnail = '' }

async function loadCandidates(signal: AbortSignal) {
  candidateLoading.value = true
  candidateError.value = false
  try {
    candidates.value = (await fetchCustomHeatmapOptions(signal)).map(item => ({ url: item.url, name: item.chart_name }))
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) candidateError.value = true
  } finally { candidateLoading.value = false }
}

async function changeSelection(url: string, method: 'POST' | 'DELETE') {
  if (!url || saving.value) return
  actionError.value = ''
  if (method === 'DELETE') {
    selected.value = selected.value.filter(item => item.url !== url)
    if (!savedSelected.value.some(item => item.url === url)) return
    saving.value = true
    try {
      await updateCustomHeatmap(url, 'DELETE')
      await load(true)
    } catch (error) {
      await load(true)
      actionError.value = error instanceof Error ? error.message : 'Unable to remove Optix.'
    } finally { saving.value = false }
    return
  }
  if (selected.value.some(item => item.url === url)) return
  if (selected.value.length >= 100) { actionError.value = 'You can select up to 100 Optix indicators.'; return }
  const candidate = candidates.value.find(item => item.url === url)
  if (candidate) selected.value = [...selected.value, { url, chart_name: candidate.name }]
}

async function clearSelection() {
  if (saving.value) return
  selected.value = []
  expanded.value = false
  actionError.value = ''
  if (!savedSelected.value.length) return
  saving.value = true
  try {
    const items = [...savedSelected.value]
    let failed = false
    for (let index = 0; index < items.length; index += 5) {
      const results = await Promise.allSettled(items.slice(index, index + 5).map(item => updateCustomHeatmap(item.url, 'DELETE')))
      if (results.some(result => result.status === 'rejected')) failed = true
    }
    await load()
    if (failed) actionError.value = 'Some Optix indicators could not be removed. Please try again.'
  } catch (error) {
    await load()
    actionError.value = error instanceof Error ? error.message : 'Unable to clear Optix.'
  } finally { saving.value = false }
}

async function saveSelection() {
  if (saving.value || !hasChanges.value) return
  saving.value = true
  actionError.value = ''
  try {
    const existing = new Set(savedSelected.value.map(item => item.url))
    for (const item of selected.value) if (!existing.has(item.url)) await updateCustomHeatmap(item.url, 'POST')
    await load()
  } catch (error) {
    await load()
    actionError.value = error instanceof Error ? error.message : 'Unable to save indicators.'
  } finally { saving.value = false }
}

function closePickerOutside(event: PointerEvent) {
  if (picker.value && !picker.value.contains(event.target as Node)) pickerOpen.value = false
}

function renderChart() {
  chart?.destroy()
  chart = null
  if (!chartElement.value) return
  const data = formatData(heatmapData.value[selectedMovingAverageIndex.value])
  if (!data.length) return

  chart = Highcharts.chart(chartElement.value, {
    chart: {
      type: 'treemap',
      height: Math.min(960, Math.max(360, Math.ceil(data.length / 4) * 80 + 95)),
      marginBottom: 95,
      spacing: [4, 18, 24, 18],
      backgroundColor: 'transparent',
      style: { fontFamily: 'inherit' },
    },
    title: { text: undefined },
    credits: { enabled: true, text: 'SENTIMENTRADER', href: '#', style: { color: themeColor('--app-text-muted') } },
    colorAxis: {
      min: 1,
      max: 7,
      tickPositions: [1, 7],
      stops: [
        [0, themeColor('--app-positive')],
        [.5, themeColor('--app-surface-muted')],
        [1, themeColor('--app-negative')],
      ],
      labels: {
        style: { color: themeColor('--app-text-secondary') },
        formatter() { return this.value === 1 ? 'Extreme Pessimism' : 'Extreme Optimism' },
      },
    },
    tooltip: { enabled: false },
    legend: { enabled: true, align: 'center', verticalAlign: 'bottom', layout: 'horizontal', symbolWidth: 420, symbolHeight: 12, symbolRadius: 6, itemStyle: { color: themeColor('--app-text') } },
    plotOptions: {
      series: {
        cursor: 'pointer',
        point: { events: {
          click() { openIndicator((this.options as HeatmapPoint).link) },
          mouseOver() {
            const point = this.options as HeatmapPoint
            hover.value = { name: point.name, reading: point.reading, thumbnail: point.thumbnail, x: Math.min(window.innerWidth - 312, Math.max(12, lastPreviewPointer.x + 14)), y: Math.max(12, Math.min(window.innerHeight - 60, lastPreviewPointer.y + 14)) }
          },
          mouseOut() { hover.value = null },
        } },
      },
      treemap: {
        layoutAlgorithm: 'squarified',
        borderColor: themeColor('--app-surface'),
        borderWidth: 2,
        dataLabels: {
          enabled: true,
          crop: false,
          overflow: 'allow',
          style: { fontSize: '12px', fontWeight: '700', textOutline: 'none' },
          formatter() {
            const point = this.options as HeatmapPoint
            return `${point.name}<br/><span style="font-size:11px;font-weight:500">${point.reading}</span>`
          },
        },
      },
    },
    series: [{ type: 'treemap', name: 'Optix', colorKey: 'colorValue', data }],
    responsive: {
      rules: [{
        condition: { maxWidth: 700 },
        chartOptions: { chart: { height: Math.min(780, Math.max(360, Math.ceil(data.length / 3) * 80 + 85)), marginBottom: 85 }, plotOptions: { treemap: { dataLabels: { style: { fontSize: '10px' } } } } },
      }],
    },
  })
}

async function load(preserveDraft = false) {
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  loadError.value = false
  const pending = preserveDraft ? selected.value.filter(item => !savedSelected.value.some(saved => saved.url === item.url)) : []
  try {
    const data = await fetchCustomHeatmap(controller.signal)
    heatmapData.value = data.heatmap
    selected.value = [...data.selected, ...pending.filter(item => !data.selected.some(saved => saved.url === item.url))]
    savedSelected.value = data.selected
    await nextTick()
    renderChart()
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) loadError.value = true
  } finally {
    loading.value = false
  }
}

watch(selectedMovingAverageIndex, () => renderChart())
onMounted(() => {
  document.addEventListener('pointerdown', closePickerOutside)
  themeObserver = new MutationObserver((changes) => {
    if (changes.some((change) => change.attributeName === 'data-theme')) renderChart()
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  void load()
  const candidateController = new AbortController()
  void loadCandidates(candidateController.signal)
  candidateAbortController = candidateController
})
let candidateAbortController: AbortController | null = null
onBeforeUnmount(() => { document.removeEventListener('pointerdown', closePickerOutside); controller?.abort(); candidateAbortController?.abort(); chart?.destroy(); themeObserver?.disconnect() })
</script>

<template>
  <main class="min-h-screen bg-[var(--app-bg)] px-[var(--page-gutter)] pb-10 pt-8 text-[var(--app-text)]">
    <div class="mx-auto max-w-[1500px]">
      <RouterLink class="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--app-primary)] hover:underline" to="/my-dashboard">
        <ArrowLeft :size="16" /> Back to My Dashboard
      </RouterLink>

      <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]">
        <header class="border-b border-[var(--app-border)] px-5 py-5">
          <h1 class="text-3xl font-semibold leading-tight">User Defined Optix Heatmap</h1>
        </header>

        <div class="indicator-selector">
          <div class="selector-heading"><h2>Optix</h2><span>{{ selected.length }} selected</span></div>
          <div class="selector-input-row"><div ref="picker" class="indicator-picker">
            <div class="picker-input" :class="{ 'picker-input--open': pickerOpen }"><Search :size="16"/><input v-model="search" type="search" aria-label="Search Optix" placeholder="Search and select Optix..." @focus="pickerOpen = true" @input="pickerOpen = true"/><button type="button" :aria-label="pickerOpen ? 'Close Optix list' : 'Open Optix list'" :aria-expanded="pickerOpen" @click="pickerOpen = !pickerOpen"><ChevronDown :size="16"/></button></div>
            <div v-if="pickerOpen" class="picker-options" role="listbox" aria-multiselectable="true">
              <p v-if="candidateLoading" class="picker-message">Loading indicators...</p>
              <p v-else-if="candidateError" class="picker-message">Unable to load Optix options. <button type="button" class="underline" @click="loadCandidates(candidateAbortController?.signal ?? new AbortController().signal)">Try again</button></p>
              <p v-else-if="!filteredCandidates.length" class="picker-message">No indicators found.</p>
              <button v-for="item in filteredCandidates" :key="item.url" type="button" role="option" :aria-selected="selected.some(entry => entry.url === item.url)" :disabled="saving" @click="changeSelection(item.url, selected.some(entry => entry.url === item.url) ? 'DELETE' : 'POST')"><span class="picker-checkbox" :class="{ checked: selected.some(entry => entry.url === item.url) }">{{ selected.some(entry => entry.url === item.url) ? '✓' : '' }}</span>{{ item.name }}</button>
            </div>
          </div><button type="button" class="save-selection" :disabled="saving || !hasChanges" @click="saveSelection">{{ saving ? 'Saving...' : 'Save' }}</button></div>
          <p v-if="actionError" class="selector-error">{{ actionError }}</p>
          <div v-if="selected.length" class="selected-tags"><span v-for="item in visibleSelected" :key="item.url" class="selected-tag">{{ item.chart_name }}<button type="button" :disabled="saving" :aria-label="`Remove ${item.chart_name}`" @click="changeSelection(item.url, 'DELETE')"><X :size="14"/></button></span><button v-if="hiddenCount && !expanded" type="button" class="more-tag" @click="expanded = true">+{{ hiddenCount }} more</button><button v-if="expanded && hiddenCount" type="button" class="more-tag" @click="expanded = false">Show less</button><button type="button" class="clear-all" :disabled="saving" @click="clearSelection">Clear all</button></div>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-2 px-4 pb-1 pt-4">
          <span class="mr-1 text-sm font-semibold">Moving Average:</span>
          <button v-for="(days, index) in movingAverages" :key="days" type="button" class="h-9 rounded-md border px-3 text-sm font-semibold transition" :class="selectedMovingAverageIndex === index ? 'border-[var(--app-primary)] bg-[var(--app-primary)] text-[var(--app-on-primary)]' : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-secondary)] hover:border-[var(--app-primary)] hover:text-[var(--app-primary)]'" @click="selectedMovingAverageIndex = index">{{ days }} Days</button>
        </div>

        <p v-if="loadError" class="m-4 rounded-md border border-[var(--app-negative)]/30 bg-[var(--app-negative)]/5 px-4 py-3 text-sm text-[var(--app-negative)]">Unable to load the Optix Heatmap. <button class="font-semibold underline" type="button" @click="load()">Try again</button></p>
        <div v-if="loading" class="flex min-h-[600px] items-center justify-center text-sm text-[var(--app-text-muted)]">Loading heatmap...</div>
        <div v-else-if="!formatData(heatmapData[selectedMovingAverageIndex]).length && !loadError" class="flex min-h-[420px] items-center justify-center text-sm text-[var(--app-text-muted)]">Select an indicator above to build your heatmap.</div>
        <div v-show="!loading && !loadError" ref="chartElement" class="min-w-0 px-2 pb-3 md:px-5" @mousemove="movePreview" />
      </section>
    </div>

    <Teleport to="body">
      <div v-if="hover" class="heatmap-preview-popover" :style="{ left: `${hover.x}px`, top: `${hover.y}px` }">
        <div><strong>{{ hover.name }}</strong><span>Value: {{ hover.reading }}</span></div>
        <img v-if="hover.thumbnail" :src="hover.thumbnail" :alt="`${hover.name} chart preview`" @error="hideBrokenThumbnail" />
      </div>
    </Teleport>
  </main>
</template>

<style scoped>
.indicator-selector{margin:20px 20px 0;border:1px solid var(--app-border);border-radius:12px;padding:20px;background:var(--app-surface)}
.selector-heading{display:flex;align-items:center;gap:10px;margin-bottom:14px}.selector-heading h2{font-size:1.2rem;font-weight:800}.selector-heading>span{border-radius:999px;background:var(--app-surface-muted);padding:3px 10px;color:var(--app-text-muted);font-size:.75rem;font-weight:700}
.selector-input-row{display:flex;align-items:center;gap:10px}.indicator-picker{position:relative;z-index:20;width:min(560px,calc(100% - 82px))}.picker-input{display:flex;height:34px;align-items:center;gap:8px;border:1px solid var(--app-border-strong);border-radius:7px;padding:0 9px;color:var(--app-text-muted)}.picker-input--open,.picker-input:focus-within{border-color:var(--app-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--app-primary) 12%,transparent)}.picker-input input{min-width:0;flex:1;outline:none;background:transparent;color:var(--app-text);font-size:.8rem}.picker-input input::-webkit-search-cancel-button{cursor:pointer}.picker-input button{display:grid;place-items:center;color:var(--app-text-muted)}
.picker-options{position:absolute;top:calc(100% + 3px);left:0;right:0;max-height:300px;overflow:auto;border:1px solid var(--app-border);border-radius:7px;background:var(--app-surface);box-shadow:0 12px 28px color-mix(in srgb,var(--app-text) 15%,transparent)}.picker-options>button{display:flex;width:100%;align-items:center;gap:11px;padding:8px 12px;color:var(--app-text);font-size:.85rem;text-align:left}.picker-options>button:hover:not(:disabled),.picker-options>button[aria-selected=true]{background:var(--app-primary-soft)}.picker-options>button:disabled{opacity:.55}.picker-checkbox{display:grid;width:17px;height:17px;flex:none;place-items:center;border:1px solid var(--app-text-muted);border-radius:3px;color:white;font-size:12px;font-weight:700}.picker-checkbox.checked{border-color:var(--app-primary);background:var(--app-primary)}.picker-message{padding:12px;color:var(--app-text-muted);font-size:.82rem}
.selected-tags{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:16px}.selected-tag,.more-tag{display:inline-flex;min-height:30px;align-items:center;gap:7px;border-radius:7px;background:var(--app-surface-muted);padding:4px 9px;color:var(--app-text);font-size:.78rem;font-weight:650}.selected-tag button{display:grid;place-items:center;color:var(--app-text-muted)}.selected-tag button:hover{color:var(--app-negative)}.more-tag{background:var(--app-primary-soft);color:var(--app-primary);font-weight:750}.clear-all{min-height:30px;color:var(--app-text-muted);font-size:.78rem}.clear-all:hover{color:var(--app-negative);text-decoration:underline}.save-selection{min-width:72px;height:34px;border-radius:6px;background:var(--app-primary);padding:0 13px;color:var(--app-on-primary);font-size:.8rem;font-weight:700}.save-selection:disabled{opacity:.5;cursor:not-allowed}.selector-error{margin-top:8px;color:var(--app-negative);font-size:.8rem}
.heatmap-preview-popover{position:fixed;z-index:300;width:300px;overflow:hidden;border:1px solid var(--app-border);border-radius:8px;background:var(--app-surface);box-shadow:0 10px 28px rgb(0 0 0 / .24);color:var(--app-text);pointer-events:none}.heatmap-preview-popover>div{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.55rem .7rem}.heatmap-preview-popover strong{overflow:hidden;font-size:.75rem;text-overflow:ellipsis;white-space:nowrap}.heatmap-preview-popover span{flex:none;color:var(--app-text-muted);font-size:.7rem}.heatmap-preview-popover img{display:block;width:100%;max-height:180px;object-fit:contain;background:white}
</style>

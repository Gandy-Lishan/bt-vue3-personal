<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowLeft, ExternalLink } from '@lucide/vue'
import Highcharts from 'highcharts'
import 'highcharts/modules/heatmap'
import 'highcharts/modules/treemap'
import { fetchClassicDashboard } from '@/pages/dashboard/dashboard.api'

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
const chartElement = ref<HTMLElement | null>(null)
const loading = ref(false)
const loadError = ref(false)
const hover = ref<{ name: string; reading: string; thumbnail: string; x: number; y: number } | null>(null)
let chart: Highcharts.Chart | null = null
let controller: AbortController | null = null

function text(value: unknown, fallback = ''): string {
  return value === null || value === undefined || value === '' ? fallback : String(value)
}

function number(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function pointAppearance(score: number) {
  if (score <= 2) return { color: 'color-mix(in srgb, var(--app-positive) 95%, var(--app-surface))', textColor: '#fff' }
  if (score <= 3) return { color: 'color-mix(in srgb, var(--app-positive) 26%, var(--app-surface))', textColor: 'var(--app-text)' }
  if (score >= 6) return { color: 'color-mix(in srgb, var(--app-negative) 76%, var(--app-surface))', textColor: '#fff' }
  if (score >= 5) return { color: 'color-mix(in srgb, var(--app-negative) 33%, var(--app-surface))', textColor: 'var(--app-text)' }
  return { color: 'var(--app-surface-muted)', textColor: 'var(--app-text)' }
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
  if (!hover.value) return
  const width = 300
  const height = 225
  hover.value.x = Math.min(window.innerWidth - width - 12, Math.max(12, event.clientX + 14))
  hover.value.y = event.clientY > height + 24 ? event.clientY - height - 12 : event.clientY + 14
}

function hideBrokenThumbnail(event: Event) {
  ;(event.target as HTMLImageElement).style.display = 'none'
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
      height: 960,
      marginBottom: 95,
      spacing: [4, 18, 24, 18],
      backgroundColor: 'transparent',
      style: { fontFamily: 'inherit' },
    },
    title: { text: undefined },
    credits: { enabled: true, text: 'SENTIMENTRADER', href: '#' },
    colorAxis: {
      min: 1,
      max: 7,
      tickPositions: [1, 7],
      stops: [
        [0, 'var(--app-positive)'],
        [.5, 'var(--app-surface-muted)'],
        [1, 'var(--app-negative)'],
      ],
      labels: {
        style: { color: 'var(--app-text-secondary)' },
        formatter() { return this.value === 1 ? 'Extreme Pessimism' : 'Extreme Optimism' },
      },
    },
    tooltip: { enabled: false },
    legend: { enabled: true, align: 'center', verticalAlign: 'bottom', layout: 'horizontal', symbolWidth: 420, symbolHeight: 12, symbolRadius: 6 },
    plotOptions: {
      series: {
        cursor: 'pointer',
        point: { events: {
          click() { openIndicator((this.options as HeatmapPoint).link) },
          mouseOver() {
            const point = this.options as HeatmapPoint
            hover.value = { name: point.name, reading: point.reading, thumbnail: point.thumbnail, x: 12, y: 12 }
          },
          mouseOut() { hover.value = null },
        } },
      },
      treemap: {
        layoutAlgorithm: 'squarified',
        borderColor: 'var(--app-surface)',
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
        chartOptions: { chart: { height: 780, marginBottom: 85 }, plotOptions: { treemap: { dataLabels: { style: { fontSize: '10px' } } } } },
      }],
    },
  })
}

async function load() {
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  loadError.value = false
  try {
    const dashboard = await fetchClassicDashboard(controller.signal)
    heatmapData.value = dashboard.heatmap_data
    await nextTick()
    renderChart()
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) loadError.value = true
  } finally {
    loading.value = false
  }
}

watch(selectedMovingAverageIndex, () => renderChart())
onMounted(load)
onBeforeUnmount(() => { controller?.abort(); chart?.destroy() })
</script>

<template>
  <main class="min-h-screen bg-[var(--app-bg)] px-[var(--page-gutter)] pb-10 pt-8 text-[var(--app-text)]">
    <div class="mx-auto max-w-[1500px]">
      <RouterLink class="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--app-primary)] hover:underline" to="/">
        <ArrowLeft :size="16" /> Back to Classic Dashboard
      </RouterLink>

      <section class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]">
        <header class="border-b border-[var(--app-border)] px-5 py-5">
          <h1 class="text-3xl font-semibold leading-tight">Optimism Index (Optix) Heatmap</h1>
          <p class="mt-2 max-w-5xl text-sm leading-6 text-[var(--app-text-muted)]">
            The Optix Heatmap shows all of our Optimism Index indicators in a heatmap format. Optix readings can be seen by hovering over the heatmap. Additionally, if you click a label or box, you'll be taken to that Optix chart. To view a larger version of this chart,
            <a class="inline-flex items-center gap-1 font-semibold text-[var(--app-primary)] hover:underline" href="https://users.sentimentrader.com/users/heatmap/" target="_blank" rel="noopener noreferrer">click here <ExternalLink :size="13"/></a>.
          </p>
        </header>

        <div class="flex flex-wrap items-center justify-center gap-2 px-4 pb-1 pt-4">
          <span class="mr-1 text-sm font-semibold">Moving Average:</span>
          <button v-for="(days, index) in movingAverages" :key="days" type="button" class="h-9 rounded-md border px-3 text-sm font-semibold transition" :class="selectedMovingAverageIndex === index ? 'border-[var(--app-primary)] bg-[var(--app-primary)] text-white' : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-secondary)] hover:border-[var(--app-primary)] hover:text-[var(--app-primary)]'" @click="selectedMovingAverageIndex = index">{{ days }} Days</button>
        </div>

        <p v-if="loadError" class="m-4 rounded-md border border-[var(--app-negative)]/30 bg-[var(--app-negative)]/5 px-4 py-3 text-sm text-[var(--app-negative)]">Unable to load the Optix Heatmap. <button class="font-semibold underline" type="button" @click="load">Try again</button></p>
        <div v-if="loading" class="flex min-h-[600px] items-center justify-center text-sm text-[var(--app-text-muted)]">Loading heatmap...</div>
        <div v-else-if="!formatData(heatmapData[selectedMovingAverageIndex]).length && !loadError" class="flex min-h-[420px] items-center justify-center text-sm text-[var(--app-text-muted)]">No heatmap data available.</div>
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
.heatmap-preview-popover{position:fixed;z-index:300;width:300px;overflow:hidden;border:1px solid var(--app-border);border-radius:8px;background:var(--app-surface);box-shadow:0 10px 28px rgb(0 0 0 / .24);color:var(--app-text);pointer-events:none}.heatmap-preview-popover>div{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.55rem .7rem}.heatmap-preview-popover strong{overflow:hidden;font-size:.75rem;text-overflow:ellipsis;white-space:nowrap}.heatmap-preview-popover span{flex:none;color:var(--app-text-muted);font-size:.7rem}.heatmap-preview-popover img{display:block;width:100%;max-height:180px;object-fit:contain;background:white}
</style>

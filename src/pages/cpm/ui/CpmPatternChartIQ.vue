<!--
  CpmPatternChartIQ.vue — ChartIQ-powered chart for CPM Pattern Workspace

  Replicates the Vue2 CPM/results Chart component behavior:
    - Loads chart with the form's symbol (default SPX).
    - Hides ChartIQ chrome (search, indicators, studies, timeframe, etc.).
    - When chartData is present (backtest result): draws MA line and CPM layout markers.
    - When chartData is null (new mode): shows a clean chart with default symbol.
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'

// ChartIQ Engine — full chart component with complete web component HTML structure
import ChartIQEngine from '@/shared/lib/chartiq/AdvancedChartComponent.vue'
import LoadingOverlayChart from '@/shared/ui/LoadingOverlayChart.vue'

// @ts-ignore ChartIQ does not ship with TS declarations
import { CIQ } from '@/shared/lib/chartiq/st-development/js/components'
import { useChartIQStore } from '@/entities/chartiq/model/chartiq.store'

const chartIQStore = useChartIQStore()

const props = withDefaults(
  defineProps<{
    symbol?: string
    chartData?: Record<string, unknown> | null
    loading?: boolean
  }>(),
  {
    symbol: 'SPX',
    chartData: null,
    loading: false,
  },
)

const emit = defineEmits<{
  (e: 'prepareData', data: Record<string, unknown>): void
  (e: 'calculateBarDistance'): void
}>()

let chartEngine: any = null
let isInitialized = false

/**
 * Called when ChartIQEngine finishes initialization.
 */
function onChartInitialized(data: { chartEngine: any; uiContext: any; config: Record<string, unknown> }) {
  chartEngine = data.chartEngine
  isInitialized = true
  applyCPMLogic()
}

/**
 * Apply CPM chart behavior — mirrors Vue2 Chart.vue onChartReady().
 */
function applyCPMLogic() {
  if (!chartEngine || !CIQ.stxx) return

  hideComponents()

  const chartData = props.chartData
  if (chartData && chartData.name) {
    // Edit/backtest mode: draw MA line and display CPM layout
    if (chartData.ma_condition && Number(chartData.ma_condition) > 0) {
      CIQ.drawCPMMA?.(chartData.ma)
    }
    CIQ.displayCPMLayout?.(chartData, () => {
      // Vue2 原版：displayCPMLayout 回调中 emit prepareData + calculateBarDistance
      emit('prepareData', chartData)
      emit('calculateBarDistance')
      if (typeof CIQ.hideCover === 'function') CIQ.hideCover()
      if (typeof CIQ.nprogress?.done === 'function') CIQ.nprogress.done()
    })
  } else {
    // New mode: just hide chrome and show the chart
    emit('calculateBarDistance')
    if (typeof CIQ.hideCover === 'function') CIQ.hideCover()
    if (typeof CIQ.nprogress?.done === 'function') CIQ.nprogress.done()
  }
}

/**
 * Hide chrome that should not appear in the CPM view.
 * Mirrors Vue2 Chart.vue hideComponents().
 */
function hideComponents() {
  const indicatorSearch = document.querySelector('.ciq-indicators-search') as HTMLElement | null
  const studies = document.querySelector('.ciq-studies') as HTMLElement | null
  const favBtnContainer = document.querySelector('.favBtnContainer') as HTMLElement | null
  const timeframeBtn = document.querySelector('.ciq-period') as HTMLElement | null
  const tickerIndicator = document.querySelector('.manage-layout-wrapper') as HTMLElement | null
  const menuYAxisPreferences = document.querySelector('[cq-name="menuYAxisPreferences"] :first-child') as HTMLElement | null
  const cqComparison = document.querySelectorAll('.cq-comparison-new')

  if (indicatorSearch) indicatorSearch.style.visibility = 'hidden'
  if (studies) studies.style.setProperty('visibility', 'hidden', 'important')
  if (favBtnContainer) favBtnContainer.style.display = 'none'
  if (timeframeBtn) timeframeBtn.style.display = 'none'
  if (tickerIndicator) tickerIndicator.style.visibility = 'hidden'
  if (menuYAxisPreferences) menuYAxisPreferences.style.display = 'none'
  cqComparison.forEach((el: Element) => {
    const htmlEl = el as HTMLElement
    htmlEl.style.display = 'none'
  })
}

/**
 * Re-apply when chartData changes (e.g. after backtest completes).
 */
watch(
  () => props.chartData,
  () => {
    if (isInitialized) {
      applyCPMLogic()
    }
  },
  { deep: true },
)

/**
 * Re-apply when symbol changes.
 */
watch(
  () => props.symbol,
  () => {
    if (isInitialized && CIQ.stxx && props.symbol) {
      // Change symbol if needed
      if (CIQ.symbol !== props.symbol) {
        CIQ.symbol = props.symbol
        // The engine will handle reload via its internal watch
      }
    }
  },
)

onMounted(() => {
  if (typeof CIQ.addCover === 'function') CIQ.addCover()
})

onBeforeUnmount(() => {
  if (typeof CIQ.hideCover === 'function') CIQ.hideCover()
  if (typeof CIQ.nprogress?.done === 'function') CIQ.nprogress.done()
})
</script>

<template>
  <div v-if="props.loading" class="flex items-center justify-center text-sm text-[var(--app-text-muted)]" style="height: 380px">
    Loading chart...
  </div>

  <div v-else class="relative w-full">
    <ChartIQEngine
      :symbol="props.symbol"
      :restore="false"
      :on-chart-ready="applyCPMLogic"
      @chart-initialized="onChartInitialized"
    />
    <LoadingOverlayChart
      :is-loading="chartIQStore.chartLoadingSetting.isChartLoading"
      :progress-text="chartIQStore.chartLoadingSetting.progressText"
    />
  </div>
</template>

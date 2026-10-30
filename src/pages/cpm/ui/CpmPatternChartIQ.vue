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
    /** Preview 命中结果（Vue2 previewForm 成功后传给 displayCPMLayout 的 result） */
    previewResult?: Record<string, unknown> | null
    timeframe?: string
    loading?: boolean
  }>(),
  {
    symbol: 'SPX',
    chartData: null,
    previewResult: null,
    timeframe: 'Daily',
    loading: false,
  },
)

const emit = defineEmits<{
  (e: 'prepareData', data: Record<string, unknown>): void
  (e: 'calculateBarDistance'): void
}>()

let chartEngine: any = null
let isInitialized = false
/** 每次图表实例初始化 +1，区分「同一批数据要不要在这个新图表上重画」 */
let chartGeneration = 0
let appliedGeneration = -1
let appliedInput: unknown = null

/**
 * Called when ChartIQEngine finishes initialization.
 * 不在这里画 CPM：Vue2 Chart.vue 是在 onChartReady（首次 symbol 加载完成）里画的。
 * 两个时机都画会导致 marker / 矩形重复叠加。
 */
function onChartInitialized(data: { chartEngine: any; uiContext: any; config: Record<string, unknown> }) {
  chartEngine = data.chartEngine
  isInitialized = true
  chartGeneration += 1
  hideComponents()
}

/**
 * Apply CPM chart behavior — mirrors Vue2 Chart.vue onChartReady().
 */
function applyCPMLogic() {
  if (!chartEngine || !CIQ.stxx || !isInitialized) return
  // 图表容器正在显示 loading（ChartIQEngine 被 v-if 卸载），画在旧实例上没有意义
  if (props.loading) return

  hideComponents()

  const preview = props.previewResult
  const chartData = props.chartData
  const input = preview ?? chartData ?? null

  // onChartReady 与数据 watch 会先后触发同一批数据：同一图表实例只应用一次，
  // 否则每应用一次都会再 loadChart + 再画一套 marker（视觉上就是重叠）
  if (appliedGeneration === chartGeneration && appliedInput === input) return
  appliedGeneration = chartGeneration
  appliedInput = input

  if (preview) {
    // Preview 命中区间：与 Vue2 previewForm 成功后 displayCPMLayout(CPMObj) 一致
    clearMarkers()
    CIQ.displayCPMLayout?.(
      { symbol: props.symbol, timeframe: props.timeframe, result: preview },
      () => {
        emit('calculateBarDistance')
        if (typeof CIQ.hideCover === 'function') CIQ.hideCover()
        if (typeof CIQ.nprogress?.done === 'function') CIQ.nprogress.done()
      },
    )
  } else if (chartData && chartData.name) {
    // Edit/backtest mode: draw MA line and display CPM layout
    // displayCPMLayout 内部只重载行情，不清旧 marker/矩形，必须先清
    clearMarkers()
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
    clearMarkers()
    emit('calculateBarDistance')
    if (typeof CIQ.hideCover === 'function') CIQ.hideCover()
    if (typeof CIQ.nprogress?.done === 'function') CIQ.nprogress.done()
  }
}

/** 清除上一次绘制的 CPM 事件标记（Vue2: CIQ.Marker.removeByLabel(CIQ.stxx, 'events')） */
function clearMarkers() {
  if (CIQ.stxx && typeof CIQ.Marker?.removeByLabel === 'function') {
    CIQ.Marker.removeByLabel(CIQ.stxx, 'events')
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
 * 只在对象引用变化时触发即可：数据是整体替换的，深监听会在轮询中间态重复重绘。
 */
watch(
  () => props.chartData,
  () => {
    applyCPMLogic()
  },
)

/**
 * Re-apply when preview match result changes (preview run / cleared).
 */
watch(
  () => props.previewResult,
  () => {
    applyCPMLogic()
  },
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

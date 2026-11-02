<!--
  CpmPatternChartIQ.vue — ChartIQ-powered chart for CPM Pattern Workspace

  Replicates the Vue2 CPM/results Chart component behavior:
    - Loads chart with the form's symbol (default SPX).
    - Hides ChartIQ chrome (search, indicators, studies, timeframe, etc.).
    - When chartData is present (backtest result): draws MA line and CPM layout markers.
    - When chartData is null (new mode): shows a clean chart with default symbol.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'

// ChartIQ Engine — full chart component with complete web component HTML structure
import ChartIQEngine from '@/shared/lib/chartiq/AdvancedChartComponent.vue'
import LoadingOverlayChart from '@/shared/ui/LoadingOverlayChart.vue'

// @ts-ignore ChartIQ does not ship with TS declarations
import { CIQ } from '@/shared/lib/chartiq/st-development/js/components'
import { useChartIQStore } from '@/entities/chartiq/model/chartiq.store'
import type { CpmChartQuote, CpmChartQuoteSnapshot } from '@/entities/cpm/model/cpm.timeframe'

const chartIQStore = useChartIQStore()

const props = withDefaults(
  defineProps<{
    symbol?: string
    chartData?: Record<string, unknown> | null
    /** Preview 命中结果（Vue2 previewForm 成功后传给 displayCPMLayout 的 result） */
    previewResult?: Record<string, unknown> | null
    timeframe?: string
    /** 表单的 pattern 起止日期，用于 CIQ.measureBarDistance 计算 bars_num */
    startDate?: string
    endDate?: string
    loading?: boolean
  }>(),
  {
    symbol: 'SPX',
    chartData: null,
    previewResult: null,
    timeframe: 'Daily',
    startDate: '',
    endDate: '',
    loading: false,
  },
)

const emit = defineEmits<{
  (e: 'prepareData', data: Record<string, unknown>): void
  (e: 'calculateBarDistance'): void
  (e: 'barDistance', bars: number): void
  /** Vue2 TIM/MaxMin 直接从 CIQ.stxx.chart.dataSet/masterData 取数，这里把快照交给页面计算 */
  (e: 'chartQuotes', snapshot: CpmChartQuoteSnapshot): void
}>()

/**
 * 图表加载遮罩的统一条件：
 * - chartLoadingSetting.isChartLoading：CIQ.addCover()/CIQ.hideCover() 驱动（换 symbol、换 timeframe、preview、backtest）
 * - props.loading：页面侧的 backtest/preview/detail 请求进行中
 * Vue2 的 changeLoadingStatus() 对 preview/backtest 都是走 CIQ.addCover()，页面上始终只有一个遮罩，
 * 这里把两个来源合并到同一个 LoadingOverlayChart 上，避免出现两套条件不同的加载层。
 */
const isChartLoading = computed(() => props.loading || chartIQStore.chartLoadingSetting.isChartLoading)

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
        emitBarDistance()
        snapshotChartQuotes()
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
      emitBarDistance()
      snapshotChartQuotes()
      if (typeof CIQ.hideCover === 'function') CIQ.hideCover()
      if (typeof CIQ.nprogress?.done === 'function') CIQ.nprogress.done()
    })
  } else {
    // New mode: just hide chrome and show the chart
    clearMarkers()
    emit('calculateBarDistance')
    emitBarDistance()
    snapshotChartQuotes()
    if (typeof CIQ.hideCover === 'function') CIQ.hideCover()
    if (typeof CIQ.nprogress?.done === 'function') CIQ.nprogress.done()
  }
}

/**
 * Vue2 Form.calculateBarDistance: CIQ.measureBarDistance(start_date, end_date)
 * 按当前图表周期已加载的 dataSet 数区间 bar 数。
 */
function emitBarDistance() {
  if (!props.startDate || !props.endDate) return
  try {
    const bars = CIQ.measureBarDistance?.(props.startDate, props.endDate)
    if (typeof bars === 'number' && Number.isFinite(bars) && bars > 0) emit('barDistance', bars)
  } catch {
    // 图表数据尚未就绪时忽略，保留页面侧的工作日估算值
  }
}

/** 图表行情加载完成后，把 dataSet/masterData 快照给页面（Vue2 TIM/MaxMin 直接读这两个数组） */
function snapshotChartQuotes() {
  const chart = CIQ.stxx?.chart
  const dataSet = toChartQuotes(chart?.dataSet)
  const masterData = toChartQuotes(chart?.masterData)
  if (!dataSet.length && !masterData.length) return
  emit('chartQuotes', { dataSet, masterData })
}

function toChartQuotes(bars: unknown): CpmChartQuote[] {
  if (!Array.isArray(bars)) return []
  return bars.map((bar: { DT?: unknown; Close?: unknown }) => {
    const raw = bar?.DT
    const time = raw instanceof Date ? raw.getTime() : new Date(raw as string | number).getTime()
    return {
      DT: Number.isFinite(time) ? time : NaN,
      Close: Number(bar?.Close),
    }
  })
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
 * Vue2 Chart 的 symbol 联动：Vuex getBacktestSymbol + CIQ.addSymbol/addIndicators 重载图表。
 * 这里交给 AdvancedChartComponent 的 symbol watcher 完成 changeSymbol，完成后重算 bars。
 */
function onSymbolLoaded() {
  emitBarDistance()
  snapshotChartQuotes()
  // 换 symbol 走 uiContext.changeSymbol -> CIQ.addSymbol -> CIQ.addIndicators(callback)，
  // addIndicators 带 callback 时不会自己关遮罩（Vue2 也是由调用方关），所以这里补上，
  // 否则切换 symbol 后 loading 遮罩一直停留。timeframe 分支已有同样处理。
  if (typeof CIQ.hideCover === 'function') CIQ.hideCover()
  if (typeof CIQ.nprogress?.done === 'function') CIQ.nprogress.done()
}

/**
 * Vue2 Form.changeTimeframe：清 marker -> getFreqHighPriority -> CIQ.addIndicators -> 重算 bars。
 * 数据源（STStockDataFeed）按 exitFrequency 取 daily/weekly/monthly。
 */
watch(
  () => props.timeframe,
  (timeframe) => {
    if (!isInitialized || !CIQ.stxx || props.loading || !timeframe) return
    clearMarkers()
    CIQ.store?.getFreqHighPriority?.(timeframe)
    CIQ.addIndicators?.({}, () => {
      emitBarDistance()
      snapshotChartQuotes()
      if (typeof CIQ.hideCover === 'function') CIQ.hideCover()
      if (typeof CIQ.nprogress?.done === 'function') CIQ.nprogress.done()
    })
  },
)

/**
 * 请求结束（遮罩关闭）后补一次重绘：加载期间 applyCPMLogic 会跳过，
 * 数据引用没变化时（例如请求失败）也要把图表状态恢复成当前数据。
 */
watch(
  () => props.loading,
  (loading) => {
    if (!loading) applyCPMLogic()
  },
)

/**
 * Vue2 日期输入 @change="calculateBarDistance"：日期变化后按当前图表数据重算 bars。
 */
watch(
  () => [props.startDate, props.endDate],
  () => {
    emitBarDistance()
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
  <!-- 图表始终挂载，加载中只显示同一个遮罩（不再用占位块替换），
       避免出现两套覆盖范围/触发条件不同的加载层，也避免 backtest 结束后图表重建闪烁 -->
  <div class="relative w-full">
    <ChartIQEngine
      :symbol="props.symbol"
      :restore="false"
      :on-chart-ready="applyCPMLogic"
      @chart-initialized="onChartInitialized"
      @symbol-loaded="onSymbolLoaded"
    />
    <LoadingOverlayChart
      :is-loading="isChartLoading"
      :progress-text="chartIQStore.chartLoadingSetting.progressText"
    />
  </div>
</template>

<style scoped>
/* LoadingOverlayChart 自带 min-height: 500px，而 CPM 图表容器是 417px（307 + 110 toolbar），
   遮罩会溢出到下方结果表格上、看起来像多了一层，这里限制为图表容器本身的高度 */
.progress-container {
  min-height: 0 !important;
}
</style>

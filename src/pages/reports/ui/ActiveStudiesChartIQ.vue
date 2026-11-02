<!--
  ActiveStudiesChartIQ.vue — ChartIQ chart for the MR Active Studies page

  Replicates Vue2 components/Reports/index.vue (used by ModelReport/ActiveStudies.vue):
    - Loads the chart with SPY by default.
    - onChartReady: hide the chart chrome, hide the cover, finish nprogress.
    - Watches chartIQ store backtestSymbol and rebuilds report forecast markers.
    - Removes forecast markers on unmount.
  Vue2 also rendered ReportsFilter / cq-reports-lookup on this page; the engine
  picks those up via route-name="ActiveStudies".
-->
<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

// ChartIQ Engine — full chart component with complete web component HTML structure
import ChartIQEngine from '@/shared/lib/chartiq/AdvancedChartComponent.vue'
import LoadingOverlayChart from '@/shared/ui/LoadingOverlayChart.vue'

// @ts-ignore ChartIQ does not ship with TS declarations
import { CIQ } from '@/shared/lib/chartiq/st-development/js/components'
import { useChartIQStore } from '@/entities/chartiq/model/chartiq.store'

const props = withDefaults(
  defineProps<{
    /** Vue2 Reports/index.vue default_symbol */
    symbol?: string
  }>(),
  {
    symbol: 'SPY',
  },
)

const chartIQStore = useChartIQStore()

interface ChartUI {
  topNode?: HTMLElement
  config?: { channels?: { breakpoint?: string } }
}

let isInitialized = false
let uiContext: ChartUI | null = null

function onChartInitialized(payload: { uiContext: unknown }) {
  isInitialized = true
  uiContext = (payload.uiContext as ChartUI | null) ?? null
}

/** Vue2 Reports/index.vue onChartReady() */
function onChartReady() {
  hideComponents()
  syncLookupPlaceholder()
  if (typeof CIQ.hideCover === 'function') CIQ.hideCover()
  if (typeof CIQ.nprogress?.done === 'function') CIQ.nprogress.done()
}

/**
 * Vue2 中 cq-reports-lookup 的占位符（"Enter Symbol"）由 channel.breakpoint 的最后一次
 * 写入决定。Vue3 布局下高度断点可能晚于宽度断点发布，把占位符覆盖成 "Symbol"。
 * 图表就绪后按当前宽度补发一次宽度断点，与旧版最终状态保持一致。
 */
function syncLookupPlaceholder() {
  const CIQAny = CIQ as any
  const stx = CIQAny.stxx
  const topNode = uiContext?.topNode
  const chartProto = CIQAny.UI?.Chart?.prototype
  const baseProto = CIQAny.UI?.BaseComponent?.prototype
  if (!stx || !topNode || !chartProto?.getBreakpoint || !baseProto?.channelWrite) return

  const breakpoint = chartProto.getBreakpoint(topNode.clientWidth)
  const channel = uiContext?.config?.channels?.breakpoint || 'channel.breakpoint'
  baseProto.channelWrite.call(null, channel, breakpoint, stx)
}

/**
 * Hide chrome that should not appear on the Active Studies chart.
 * Mirrors Vue2 Reports/index.vue hideComponents() ActiveStudies branch
 * (display:none instead of visibility:hidden for the narrow layout).
 */
function hideComponents() {
  const indicatorSearch = document.querySelector('.ciq-indicators-search') as HTMLElement | null
  const studies = document.querySelector('.ciq-studies') as HTMLElement | null
  const display = document.querySelector('.ciq-display') as HTMLElement | null
  const chHeadsup = document.querySelector('.ch-headsup') as HTMLElement | null
  const huTooltip = document.querySelector('.hu-tooltip') as HTMLElement | null
  const gridGroup = document.querySelector('.grid-group') as HTMLElement | null
  const lastpGroup = document.querySelector('.lastp-group') as HTMLElement | null
  const tickerIndicator = document.querySelector('.manage-layout-wrapper') as HTMLElement | null
  const favBtnContainer = document.querySelector('.favBtnContainer') as HTMLElement | null
  const timeframeBtn = document.querySelector('.ciq-period') as HTMLElement | null
  const cqComparison = document.querySelectorAll('.cq-comparison-new')

  if (indicatorSearch) indicatorSearch.style.display = 'none'
  if (studies) studies.style.display = 'none'
  if (display) display.style.display = 'none'
  if (chHeadsup) chHeadsup.style.visibility = 'hidden'
  if (huTooltip) huTooltip.style.visibility = 'hidden'
  if (gridGroup) gridGroup.style.visibility = 'hidden'
  if (lastpGroup) lastpGroup.style.visibility = 'hidden'
  if (tickerIndicator) tickerIndicator.style.display = 'none'

  if (favBtnContainer) favBtnContainer.style.display = 'none'
  if (timeframeBtn) timeframeBtn.style.display = 'none'

  // Vue3 引擎为抵消 Tailwind `.collapse` 加了 .ciq-menu.collapse { visibility: visible !important }，
  // 子级显式 visible 会突破父级 visibility:hidden，把旧版这里隐藏的折叠箭头重新露出。
  ;[chHeadsup, huTooltip].forEach((group) => {
    group?.querySelectorAll<HTMLElement>('.ciq-menu.collapse').forEach((menu) => {
      menu.style.setProperty('visibility', 'hidden', 'important')
    })
  })

  // Hide dual symbol comparison entry
  cqComparison.forEach((el: Element) => {
    const htmlEl = el as HTMLElement
    htmlEl.style.display = 'none'
  })
}

/**
 * Vue2 Reports/index.vue watch getBacktestSymbol:
 *   CIQ.removeForecastMarker(); CIQ.createForecastMarker()
 * The store symbol is committed by CIQ.addSymbol on every chart symbol load.
 */
function refreshForecastMarkers() {
  if (!isInitialized || !CIQ.stxx) return
  if (typeof CIQ.removeForecastMarker === 'function') CIQ.removeForecastMarker()
  if (typeof CIQ.createForecastMarker === 'function') CIQ.createForecastMarker()
}

watch(
  () => chartIQStore.backtestSymbol,
  () => {
    refreshForecastMarkers()
  },
)

onBeforeUnmount(() => {
  // Vue2 beforeDestroy: clear all report forecast markers
  if (typeof CIQ.removeForecastMarker === 'function') CIQ.removeForecastMarker()
})
</script>

<template>
  <div class="relative w-full">
    <ChartIQEngine
      :symbol="props.symbol"
      :restore="false"
      route-name="ActiveStudies"
      :on-chart-ready="onChartReady"
      @chart-initialized="onChartInitialized"
    />
    <LoadingOverlayChart
      :is-loading="chartIQStore.chartLoadingSetting.isChartLoading"
      :progress-text="chartIQStore.chartLoadingSetting.progressText"
    />
  </div>
</template>

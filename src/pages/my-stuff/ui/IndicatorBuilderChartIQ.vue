<!--
  IndicatorBuilderChartIQ.vue — My Indicator builder chart host

  【Vue2→Vue3 完全一致迁移】对应旧版
  src/components/MyIndicator/create/components/MIChart.vue：
    - 挂载通用 chart 组件（AdvancedChartComponent）
    - onChartReady 中隐藏无关工具栏；有 chart_data 时按旧版
      CIQ.displayUserOwnIndicatorLayout 还原；否则 hideCover + nprogress.done
    - 销毁时 reset_miFormState + hideCover + nprogress.done
  不含任何表单逻辑（表单交互仍在 IndicatorBuilderPage.vue 本地状态中）。
-->
<script setup lang="ts">
import { onBeforeUnmount } from 'vue'

// ChartIQ Engine — full chart component with complete web component HTML structure
import ChartIQEngine from '@/shared/lib/chartiq/AdvancedChartComponent.vue'
// 【Vue2→Vue3 兼容】图表加载遮罩层，照搬原版 LoadingOverlayChart
import LoadingOverlayChart from '@/shared/ui/LoadingOverlayChart.vue'

// @ts-ignore ChartIQ does not ship with TS declarations
import { CIQ } from '@/shared/lib/chartiq/st-development/js/components'
import { useChartIQStore } from '@/entities/chartiq/model/chartiq.store'

const props = defineProps<{
  /** 图表初始 symbol（= benchmark） */
  symbol: string
  /** 编辑进入时的旧版 chart_data；新建为 null */
  chartData?: Record<string, unknown> | null
}>()

const emit = defineEmits<{
  'chart-ready': []
}>()

const chartIQStore = useChartIQStore()

/**
 * 【Vue2→Vue3 完全一致】与旧版 MIChart.vue onChartReady 相同：由 ChartIQ 在首次
 * symbol 加载完成后回调（一次），这里只做一次执行保护。
 */
let initialized = false

/** 对应旧版 MIChart.vue onChartReady() */
function onChartReady() {
  if (initialized) return
  initialized = true
  hideComponents()
  // 自定义指标 panel 高亮：loadChart 会重建全部 panel，挂 drawPanels 后钩子
  // 每次重绘按 CIQ.__miOwnIndicatorHighlight 重新核对标记
  CIQ.stxx?.append?.('drawPanels', () => CIQ.applyMIOwnIndicatorHighlight())
  // 还原自定义 indicator Layout
  if (props.chartData?.name) {
    CIQ.displayUserOwnIndicatorLayout(props.chartData)
  } else {
    CIQ.hideCover()
    CIQ.nprogress.done()
  }
  emit('chart-ready')
}

/** 对应旧版 MIChart.vue hideComponents()，全部加空值保护 */
function hideComponents() {
  const selectors = [
    '.ciq-indicators-search',
    '.ciq-studies',
    '.manage-layout-wrapper',
    '.favBtnContainer',
    '.ciq-period',
    '.reload',
    '.cq-comparison-new',
  ]
  selectors.forEach((selector) => {
    const el = document.querySelector(selector) as HTMLElement | null
    if (!el) return
    if (selector === '.favBtnContainer' || selector === '.ciq-period' || selector === '.reload' || selector === '.cq-comparison-new') {
      el.style.display = 'none'
    } else if (selector === '.ciq-studies') {
      el.style.setProperty('visibility', 'hidden', 'important')
    } else {
      el.style.visibility = 'hidden'
    }
  })

  const filters = document.querySelector('cq-lookup-filters')
  const fifthFilter = filters?.querySelectorAll('cq-filter')[4] as HTMLElement | undefined
  if (fifthFilter) fifthFilter.style.display = 'none'
}

onBeforeUnmount(() => {
  // 子组件 AdvancedChartComponent 销毁前执行，此时 stxx 仍存在
  chartIQStore.reset_miFormState()
  // 防止 chartiq 还没加载完就切换到其他页面
  CIQ.hideCover()
  CIQ.nprogress.done()
})
</script>

<template>
  <div class="relative h-[420px] w-full overflow-hidden md:h-[520px]" style="margin-top: 16px;">
    <ChartIQEngine
      :symbol="props.symbol"
      :restore="false"
      :on-chart-ready="onChartReady"
    />
    <!-- 【Vue2→Vue3 兼容】原版 chart 组件的 slot 中渲染 LoadingOverlayChart -->
    <LoadingOverlayChart
      :is-loading="chartIQStore.chartLoadingSetting.isChartLoading"
      :progress-text="chartIQStore.chartLoadingSetting.progressText"
    />
  </div>
</template>

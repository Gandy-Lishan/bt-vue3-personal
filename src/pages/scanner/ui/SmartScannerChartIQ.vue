<!--
  SmartScannerChartIQ.vue — ChartIQ-powered chart for Smart Scanner detail

  Replicates the original Vue2 ScannerChart/ChartComponent behavior:
    - Loads the chart with the scanner row's symbol.
    - Calls CIQ.initiateChart with the signal indicator and as-of date.
    - Adds signal-specific studies (MA/MACD/RSI/Optix/etc.).
    - Draws backtest buy/sell markers from the API trade history.
    - Shows the full ChartIQ chrome (toolbar, study legend, watermark).
-->
<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import type { SmartScannerBacktestDetail } from '@/entities/scanner/model/smart-scanner.types'

// ChartIQ Engine — full chart component with complete web component HTML structure
import ChartIQEngine from '@/shared/lib/chartiq/AdvancedChartComponent.vue'

// @ts-ignore ChartIQ does not ship with TS declarations
import { CIQ } from '@/shared/lib/chartiq/st-development/js/components'
import { useChartIQStore } from '@/entities/chartiq/model/chartiq.store'

const chartIQStore = useChartIQStore()

const props = defineProps<{
  detail: SmartScannerBacktestDetail | null
  loading?: boolean
}>()

const chartWrapper = ref<HTMLElement>()
let chartEngine: any = null
let lastAppliedSymbol = ''

/**
 * Called when ChartIQEngine finishes initialization.
 * At this point CIQ.stxx exists and we can run the scanner-specific chart logic.
 */
function onChartInitialized(data: { chartEngine: any; uiContext: any; config: Record<string, unknown> }) {
  chartEngine = data.chartEngine
  applyScannerLogic()
}

/**
 * Apply the scanner chart behavior originally implemented in
 * ScannerChart/components/ChartComponent.vue.
 *
 * This is invoked both when the chart first becomes ready and when the
 * backtest detail (with raw trade arrays) finishes loading.
 */
function applyScannerLogic() {
  if (!chartEngine || !CIQ.stxx || !props.detail) return
  if (lastAppliedSymbol === props.detail.symbol) return
  lastAppliedSymbol = props.detail.symbol

  // Match the original component: lock study editing, derive the indicator URL,
  // then load the chart with the full historical range up to the signal date.
  editStudies(false)

  const ticker = props.detail.symbol
  CIQ.symbol = ticker

  let symbolUrl = CIQ.findSentiIndicator(null, ticker)
    ? ticker
    : CIQ.findSentiIndicator(ticker + ' Optix', null)
      ? CIQ.findSentiIndicator(ticker + ' Optix', null).url
      : ticker

  if (['Trend Score Breakout', 'Trend Score Breakdown'].includes(props.detail.signal)) {
    symbolUrl = symbolUrl + '_trend'
  }

  const endDate = props.detail.asOfDate || props.detail.request.date

  CIQ.initiateChart([symbolUrl], endDate, async () => {
    try {
      hideComponents()
      // Delay study addition to avoid DOM timing issues with ChartIQ legend rendering
      await new Promise(resolve => requestAnimationFrame(resolve))
      await loadDefaultStudy()
      // Force a redraw after studies are added
      if (CIQ.stxx?.draw) CIQ.stxx.draw()
      // Delay marker loading to ensure studies are rendered
      await new Promise(resolve => requestAnimationFrame(resolve))
      loadMarker()
      addWatermark()
    } catch (error) {
      console.error('[SmartScannerChartIQ] chart ready error:', error)
    } finally {
      if (typeof CIQ.hideCover === 'function') CIQ.hideCover()
    }
  })
}

/**
 * Toggle whether the signal studies can be edited from the ChartIQ UI.
 * The scanner view locks them (edit=false).
 */
function editStudies(enabled: boolean) {
  if (!CIQ?.Studies?.studyLibrary) return
  CIQ.extend(CIQ.Studies.studyLibrary['ma'], { edit: enabled })
  CIQ.extend(CIQ.Studies.studyLibrary['macd'], { edit: enabled })
  CIQ.extend(CIQ.Studies.studyLibrary['MAGap'], { edit: enabled })
  CIQ.extend(CIQ.Studies.studyLibrary['MACDHistGap'], { edit: enabled })
  CIQ.extend(CIQ.Studies.studyLibrary['rsi'], { edit: enabled })
  CIQ.extend(CIQ.Studies.studyLibrary['ST ROCLike'], { edit: enabled })
}

/**
 * Hide chrome that should not appear in the scanner-only view.
 * The CSS already hides most elements; this mirrors the original JS guard.
 */
function hideComponents() {
  const selectors = [
    '.ciq-search',
    '.ciq-indicators-search',
    '.manage-layout-wrapper',
    '.ciq-studies',
    '.favBtnContainer',
    '.ciq-period',
    '.ciq-footer',
    '.cq-comparison-new',
  ]
  selectors.forEach((selector) => {
    const el = document.querySelector(selector) as HTMLElement | null
    if (!el) return
    if (selector === '.favBtnContainer' || selector === '.ciq-period' || selector === '.ciq-footer') {
      el.style.display = 'none'
    } else {
      el.style.visibility = 'hidden'
    }
  })
}

/**
 * Load signal-specific studies. Ported from ChartComponent.vue loadDefaultStudy().
 */
async function loadDefaultStudy() {
  const detail = props.detail
  if (!detail || !CIQ?.stxx) return

  const signal = detail.signal
  const ticker = detail.symbol
  const signalDate = detail.asOfDate
  const raw = detail.raw
  const maColor = CIQ.store.getters.getColorByCriteriaAndIndex(0, 0)

  /**
   * Safely add a study with retry on DOM timing errors.
   * ChartIQ's addStudy can fail with "Cannot read properties of undefined (reading 'childNodes')"
   * if the study legend DOM isn't ready yet. We retry with increasing delays.
   */
  async function addStudySafe(type: string, inputs?: Record<string, unknown>, outputs?: Record<string, unknown>, parameters?: Record<string, unknown>) {
    let retries = 0
    const maxRetries = 5
    while (retries < maxRetries) {
      try {
        CIQ.Studies.addStudy(CIQ.stxx, type, inputs, outputs, parameters)
        return
      } catch (e: any) {
        if (e.message?.includes('childNodes') && retries < maxRetries - 1) {
          retries++
          await new Promise(r => setTimeout(r, 100 * retries))
        } else {
          console.error(`[loadDefaultStudy] addStudy failed: ${type}`, e)
          return
        }
      }
    }
  }

  const patternMap: Record<string, number> = {
    'Head and Shoulders Top': 17,
    'Head and Shoulders Bottom': 17,
    'Double Top': 13,
    'Double Bottom': 13,
    'Triple Tap': 21,
    'Rounding Bottom': 21,
    'Ascending Channel': 16,
    'Descending Channel': 19,
  }

  const symbolUrl = CIQ.findSentiIndicator(null, ticker)
    ? ticker
    : CIQ.findSentiIndicator(ticker + ' Optix', null)
      ? CIQ.findSentiIndicator(ticker + ' Optix', null).url
      : ticker

  switch (signal) {
    case "Symbol Close > its' MA200 and Optix MA5 < 35":
      await CIQ.getIndicatorMatedata([symbolUrl], CIQ.stxx)
      await addStudySafe('ST MA', { Period: 5, display: 'ST MA', Field: symbolUrl }, { MA: maColor })
      await addStudySafe('ma', { Period: 200, Field: 'Close' })
      try { CIQ.createOneTimePatternMarker?.(signalDate, "Symbol Close > its' MA200 and Optix MA5 < 35") } catch {}
      break
    case "Symbol Close > its' MA200 and Optix < 30":
      await CIQ.getIndicatorMatedata([symbolUrl], CIQ.stxx)
      await addStudySafe('ma', { Period: 200, Field: 'Close' })
      try { CIQ.createOneTimePatternMarker?.(signalDate, "Symbol Close > its' MA200 and Optix < 30") } catch {}
      break
    case 'Optix MA10 < 30 and Optix < 20':
      await CIQ.getIndicatorMatedata([symbolUrl], CIQ.stxx)
      await addStudySafe('ST MA', { Period: 10, display: 'ST MA', Field: symbolUrl }, { MA: maColor })
      try { CIQ.createOneTimePatternMarker?.(signalDate, 'Optix MA10 < 30 and Optix < 20') } catch {}
      break
    case 'Optix #4':
      await CIQ.getIndicatorMatedata([symbolUrl], CIQ.stxx)
      try { CIQ.createOneTimePatternMarker?.(signalDate, 'Optix CrossBelow 0.5') } catch {}
      break
    case "Symbol Close > its' MA200 and Optix MA5 > 43 After Below 35":
      await CIQ.getIndicatorMatedata([symbolUrl], CIQ.stxx)
      await addStudySafe('ST MA', { Period: 5, display: 'ST MA', Field: symbolUrl }, { MA: maColor })
      await addStudySafe('ma', { Period: 200, Field: 'Close' })
      try { CIQ.createOneTimePatternMarker?.(signalDate, "Symbol Close > its' MA200 and Optix MA5 > 43 After Below 35") } catch {}
      break
    case "Symbol Close > its' MA200 and Optix MA10 > 43 After Below 35":
      await CIQ.getIndicatorMatedata([symbolUrl], CIQ.stxx)
      await addStudySafe('ST MA', { Period: 10, display: 'ST MA', Field: symbolUrl }, { MA: maColor })
      await addStudySafe('ma', { Period: 200, Field: 'Close' })
      try { CIQ.createOneTimePatternMarker?.(signalDate, "Symbol Close > its' MA200 and Optix MA10 > 43 After Below 35") } catch {}
      break
    case "Symbol Close > its' MA200 and Optix > 43 After Below 30":
      await CIQ.getIndicatorMatedata([symbolUrl], CIQ.stxx)
      await addStudySafe('ma', { Period: 200, Field: 'Close' })
      try { CIQ.createOneTimePatternMarker?.(signalDate, "Symbol Close > its' MA200 and Optix > 43 After Below 30") } catch {}
      break
    case 'UpTrend Pattern':
    case 'DownTrend Pattern': {
      const points = parseLegacyArray(raw['Point'])
      await addStudySafe(signal, { display: signal }, null, { points })
      try { CIQ.createOneTimeScannerMarkerHighLowLine?.(signalDate, signal, points) } catch {}
      break
    }
    case 'Hammer followed by a rise':
      try { CIQ.createOneTimeScannerMarkerHammer?.(raw['EntryTradeDate'], signalDate, signal) } catch {}
      break
    case 'Shooting Star followed by a fall':
      try { CIQ.createOneTimeScannerMarkerHammer?.(raw['EntryTradeDate'], signalDate, signal) } catch {}
      break
    case 'MAGap':
      await addStudySafe(signal, { display: signal })
      await addStudySafe('ma', { display: 'ma' })
      try { CIQ.createOneTimePatternMarker?.(signalDate, 'MAGap') } catch {}
      break
    case 'MACDHistGap':
      await addStudySafe(signal, { display: signal })
      await addStudySafe('macd', { display: 'macd' })
      try { CIQ.createOneTimePatternMarker?.(signalDate, 'MACDHistGap') } catch {}
      break
    case 'PriceBreakout':
      CIQ.setMALayout('Symbol Close', 'entry', 0, { ticker })
      await addStudySafe('ST ROCLike', {
        display: '% of Previous Range',
        Field: 'Close',
        condition: 'OPR',
        period: 21,
      }, null, { criteria: 'entry', index: 0, showSupLine: 0 })
      try { CIQ.createOneTimePatternMarker?.(signalDate, 'PriceBreakout') } catch {}
      break
    case 'HighPoints':
      CIQ.setMALayout('Symbol High', 'entry', 0, { ticker })
      await addStudySafe('ST ROCLike', {
        display: '% of Previous Range',
        Field: 'High',
        condition: 'OPR',
        period: 13,
      }, null, { criteria: 'entry', index: 0, showSupLine: 100 })
      try { CIQ.createOneTimePatternMarker?.(signalDate, 'HighPoints') } catch {}
      break
    case 'LowPoints':
      CIQ.setMALayout('Symbol Low', 'entry', 0, { ticker })
      await addStudySafe('ST ROCLike', {
        display: '% of Previous Range',
        Field: 'Low',
        condition: 'OPR',
        period: 13,
      }, null, { criteria: 'entry', index: 0, showSupLine: 0 })
      try { CIQ.createOneTimePatternMarker?.(signalDate, 'LowPoints') } catch {}
      break
    case 'RSI':
      await addStudySafe('rsi', null, null, { showSupLine: 40 })
      try { CIQ.createOneTimePatternMarker?.(signalDate, 'RSI') } catch {}
      break
    case 'MA':
      await addStudySafe('ma', { Period: 20, Type: 'simple', Field: 'Close' })
      try { CIQ.createOneTimePatternMarker?.(signalDate, 'MA') } catch {}
      break
    case 'MACDHist':
      await addStudySafe('macd', { Period: 20, Type: 'simple', Field: 'Close' })
      try { CIQ.createOneTimePatternMarker?.(signalDate, 'MACD') } catch {}
      break
    case 'Head and Shoulders Top':
    case 'Head and Shoulders Bottom':
    case 'Double Top':
    case 'Double Bottom':
    case 'Triple Tap':
    case 'Rounding Bottom':
    case 'Ascending Channel':
    case 'Descending Channel': {
      const entryTradeDateArr = parseLegacyArray(raw['EntryTradeDate'])
      try { CIQ.createCorrelationPatternMatchDrawing?.([...entryTradeDateArr, signalDate], 'scannerai', patternMap[signal]) } catch {}
      try { CIQ.createOneTimePatternMarker?.(signalDate, signal) } catch {}
      break
    }
    case 'Symbol All-Time High':
    case 'Symbol All-Time Low':
    case 'Symbol 52-Week High':
    case 'Symbol 52-Week Low':
    case 'Symbol 4-Week High':
    case 'Symbol 4-Week Low':
    case 'Symbol 13-Week High':
    case 'Symbol 13-Week Low':
      try { CIQ.createOneTimePatternMarker?.(signalDate, signal) } catch {}
      break
    case 'Trend Score Breakout':
    case 'Trend Score Breakdown':
      await CIQ.getIndicatorMatedata([symbolUrl], CIQ.stxx)
      try { CIQ.createOneTimePatternMarker?.(signalDate, signal) } catch {}
      break
    default:
      break
  }

  if (detail.category !== 'MidTermAI') {
    await addStudySafe('ma', { Period: 252, Type: 'simple', Field: 'Close' })
  }
}

/**
 * Parse legacy stringified arrays like "['2024-01-01','2024-02-01']".
 * Uses eval to match the original implementation exactly.
 */
function parseLegacyArray(value: unknown): unknown[] {
  if (value === undefined || value === null || value === '') return []
  try {
    // eslint-disable-next-line no-eval
    const parsed = eval(`(${String(value)})`)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Build and draw backtest entry/exit markers. Ported from ChartComponent.vue.
 */
function loadMarker() {
  try {
    const startTs = CIQ.initialDate?.start ?? 0
    const endTs = CIQ.initialDate?.end ?? 0
    const allMarkers = concatenateEntryAndExit()

    const list = filterFormatMarkerDate(new Date(startTs), new Date(endTs), allMarkers)

    console.log('[loadMarker] raw markers:', allMarkers.length, 'filtered:', list.length)

    CIQ.groups = group(list)
    let markers = CIQ.groups.pop() ?? []

    const firstNonEmpty = CIQ.stxx.chart.xaxis.find((obj: Record<string, unknown>) => Object.keys(obj).length > 0)
    const cDate = firstNonEmpty?.DT ? yyyymmdd(new Date(firstNonEmpty.DT)) : ''
    const lastGroup = CIQ.groups.slice(-1)[0]
    if (lastGroup?.length) {
      const lastMarker = lastGroup[lastGroup.length - 1]
      const mDate = lastMarker.DT ? yyyymmdd(new Date(lastMarker.DT)) : ''
      if (cDate && mDate && cDate < mDate) {
        markers.unshift(...CIQ.groups.pop())
      }
    }

    CIQ.loadChart(markers, CIQ.addMarker)
    // 【Vue2→Vue3 兼容】照搬原版 Vuex states.js 的 set_isMarkerShown_flag action 逻辑
    chartIQStore.set_isMarkerShown_flag(true)
  } catch (error) {
    console.error('[SmartScannerChartIQ] loadMarker error:', error)
  }
}

/**
 * Add the SentimenTrader watermark to the chart, matching the original Vue2 scanner chart.
 */
function addWatermark() {
  if (!chartWrapper.value) return

  const existing = chartWrapper.value.querySelector('.scanner-chart-watermark')
  if (existing) existing.remove()

  const watermark = document.createElement('div')
  watermark.className = 'scanner-chart-watermark'
  watermark.innerHTML = `
    <img class="watermark-logo" src="/avatar-sentimen-dark.png" alt="SentimenTrader" />
    <div class="watermark-tagline">Analysis over Emotion</div>
  `
  chartWrapper.value.appendChild(watermark)
}

/**
 * Combine entry/exit trade arrays into a single marker dataset.
 */
function concatenateEntryAndExit(): Array<Record<string, unknown>> {
  const detail = props.detail
  if (!detail) return []

  const raw = detail.raw
  const direction = detail.direction || 'Long'
  const signal = detail.signal
  const signalDate = detail.asOfDate

  const entryTradeDateArr = parseLegacyArray(raw['EntryTradeDate']) as string[]
  const entryTradePriceArr = parseLegacyArray(raw['EntryTradePrice']) as (number | undefined)[]
  const exitTradeDateArr = parseLegacyArray(raw['ExitTradeDate']) as string[]
  const exitTradePriceArr = parseLegacyArray(raw['ExitTradePrice']) as (number | undefined)[]
  const exitReasonArr = parseLegacyArray(raw['ExitReason']) as string[]

  const entryMarkerType = direction === 'Short' ? 'SELL' : 'BUY'
  const exitMarkerType = direction === 'Short' ? 'BUY' : 'SELL'

  const markerSet: Array<Record<string, unknown>> = []

  entryTradeDateArr.forEach((date, index) => {
    markerSet.push({
      DT: date,
      Price: entryTradePriceArr[index],
      Type: entryMarkerType,
      Indicator: [signal],
      reason: 'meet Entry Criteria',
      isEndDate: false,
    })
  })

  exitTradeDateArr.forEach((date, index) => {
    markerSet.push({
      DT: date,
      Price: exitTradePriceArr[index],
      Type: exitMarkerType,
      Indicator: [exitReasonArr[index]],
      reason: exitReasonArr[index],
      isEndDate: index === exitTradeDateArr.length - 1,
    })
  })

  markerSet.sort((a, b) => new Date(a['DT'] as string).getTime() - new Date(b['DT'] as string).getTime())

  // If the recommendation date overlaps the last exit date, hide that marker.
  if (signalDate && exitTradeDateArr.length && signalDate === exitTradeDateArr[exitTradeDateArr.length - 1]) {
    markerSet.pop()
  }

  return markerSet
}

/**
 * Keep only markers that fall within the visible chart date range.
 */
function filterFormatMarkerDate(
  startDate: Date,
  endDate: Date,
  markerSet: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const start = yyyymmdd(startDate)
  const end = yyyymmdd(endDate)
  return markerSet.filter((marker) => {
    const dt = String(marker.DT ?? '')
    const markerDate = dt.slice(0, 4) + dt.slice(5, 7) + dt.slice(8, 10)
    return markerDate > start && markerDate <= end
  })
}

function yyyymmdd(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * Split marker data into chunks of 500, matching the original batching logic.
 */
function group<T>(data: T[]): T[][] {
  const result: T[][] = []
  let groupItem: T[] = []
  data.forEach((item, index) => {
    if (index % 500 === 0) {
      if (groupItem.length) result.push(groupItem)
      groupItem = []
    }
    groupItem.push(item)
  })
  if (groupItem.length) result.push(groupItem)
  return result
}

// When the detail (with raw trade data) arrives, run the scanner chart logic.
watch(
  () => props.detail?.symbol,
  () => {
    applyScannerLogic()
  },
)

onBeforeUnmount(() => {
  editStudies(true)
})
</script>

<template>
  <div v-if="props.loading" class="flex h-[520px] items-center justify-center text-sm text-[var(--app-text-muted)]">
    Loading chart...
  </div>

  <div
    v-else-if="props.detail"
    ref="chartWrapper"
    class="chart-wrapper w-full h-[520px] chartiq-scanner-chart"
  >
    <ChartIQEngine
      :symbol="undefined"
      :restore="false"
      :on-chart-ready="applyScannerLogic"
      @chart-initialized="onChartInitialized"
    />
  </div>

  <div
    v-else
    class="flex h-[520px] items-center justify-center text-sm text-[var(--app-text-muted)]"
  >
    Loading chart...
  </div>
</template>

<style scoped>
.chartiq-scanner-chart {
  position: relative;
  width: 100%;
  height: 100%;
}

.chartiq-scanner-chart :deep(.ciq-menu.ciq-studies) {
  visibility: hidden !important;
}

/* 原版 SentimenTrader 水印样式 */
.scanner-chart-watermark {
  position: absolute;
  bottom: 16px;
  left: 16px;
  pointer-events: none;
  opacity: 0.35;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.scanner-chart-watermark .watermark-logo {
  height: 28px;
  width: auto;
}

.scanner-chart-watermark .watermark-tagline {
  font-size: 10px;
  font-weight: 600;
  color: #6f7fa8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ciq-night .scanner-chart-watermark .watermark-logo {
  filter: brightness(0) invert(1);
}

.ciq-night .scanner-chart-watermark .watermark-tagline {
  color: #9fb2cc;
}
</style>

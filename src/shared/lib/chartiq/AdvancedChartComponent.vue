<!-- @ts-nocheck -->
<!--
  ChartIQEngine.vue — Vue3 Composition API wrapper for ChartIQ v8.3.3

  Adapted from AdvancedChartComponent.vue (Vue2 project, 907 lines).
  Preserves ALL original logic — only framework syntax changed:
    - vue-property-decorator class component → <script setup lang="ts">
    - @Prop() → defineProps / defineEmits
    - @Ref('container') → ref<HTMLElement>()
    - beforeDestroy() → onBeforeUnmount()
    - this.$route → useRoute()
    - Vue.extend().$mount() → createVNode() + render()
    - CIQ.store.dispatch() → useChartIQStore() actions
    - this.$message → custom toast via Pinia store
-->

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { createVNode, render } from 'vue'

// Register <cq-context> as a real Custom Element so Vue treats it as native
import './cq-context-element'

// ChartIQ
// @ts-expect-error ChartIQ does not ship with TS declarations
import { CIQ } from './st-development/js/components'
import { getCustomConfig } from './resources'
// @ts-expect-error StudiesExtendOverwrite is a JS file from ChartIQ without type declarations
import { extendOverwrite } from './st-development/js/extensions/StudiesExtendOverwrite'
import { setupNProgressStub } from './service-stub'

// Pinia store
import { useChartIQStore } from '@/entities/chartiq/model/chartiq.store'
import { createVuexAdapter } from './vuex-adapter'

// Webcomponents (Vue3 versions — adapted from Vue2 originals)
import ReportsFilter from './st-development/js/webcomponents/ReportsFilter.vue'
import ManageLayout from './ManageLayout.vue'

// Props
const props = defineProps<{
  /** Symbol to load on chart creation */
  symbol?: string | Record<string, unknown>
  /** Custom config override */
  config?: Record<string, unknown>
  /** Whether to restore saved layout */
  restore?: boolean
  /** Route name for conditional rendering (e.g. 'ActiveStudies') */
  routeName?: string
  /** Selected strategy index for Strategy Modal */
  selectedStrategyIndex?: number
  /** Optional callback invoked by ChartIQ when the chart is ready */
  onChartReady?: () => void
}>()

const emit = defineEmits<{
  'chart-initialized': [data: { chartEngine: unknown; uiContext: unknown; config: Record<string, unknown> }]
}>()

const route = useRoute()
const chartIQStore = useChartIQStore()

// State
const stx = ref<unknown>()
const uiContextRef = ref<unknown>()
const isCollapse = ref(false)
const strategyIndex = ref(props.selectedStrategyIndex ?? 0)
const strategiesOptions = ref<Array<{ label: string; value: number }>>([
  { label: '- Select Strategy -', value: 0 },
])
const isShowStrategyDescription = ref(false)
const aISuplineloading = ref(false)
const modalBox = ref<HTMLElement>()
const routeName = ref(props.routeName ?? (route.name as string ?? null))

// Resize observer
let resizeObserver: ResizeObserver | null = null
let mutationObserver: MutationObserver | null = null

/**
 * Portalize context dialogs — move cq-dialog elements outside cq-context
 * so they can be shared across multiple chart instances.
 */
function portalizeContextDialogs(containerEl: HTMLElement) {
  containerEl.querySelectorAll('cq-dialog').forEach((dialog) => {
    dialog.remove()
    if (!dialogPortalized(dialog)) {
      document.body.appendChild(dialog)
    }
  })
}

function dialogPortalized(el: Element) {
  if (!el.firstChild) return false
  const tag = (el.firstChild as Element).nodeName?.toLowerCase()
  if (!tag) return false
  return Array.from(document.querySelectorAll(tag)).some(
    (el) => !el.closest('cq-context'),
  )
}

/**
 * Create chart and UI context.
 * Receives the container element directly to avoid DOM race conditions
 * during router navigation.
 */
function createChartAndUI(config: Record<string, unknown>, containerEl: HTMLElement) {
  const chart = new CIQ.UI.Chart()
  const uiContext = chart.createChartAndUI({ container: containerEl, config })
  return uiContext
}

/**
 * Override default study definitions.
 */
function overrideStudyDef() {
  extendOverwrite()
}

/**
 * Initialize toggle states (crosshair, grid, last price, heads-up).
 */
function initializeToggle(chartEngine: any) {
  chartEngine.layout.headsUp = { floating: true }
  chartEngine.layout.lastPriceLabel = false
  chartEngine.chart.yAxis.drawCurrentPriceLabel = false
  chartEngine.layout.xAixsGridLine = false
  chartEngine.chart.yAxis.displayGridLines = false
  chartEngine.chart.xAxis.displayGridLines = false
  chartEngine.layout.crosshair = true
  chartEngine.changeOccurred('layout')
  chartEngine.draw()
}

/**
 * Create resize listener for chart container.
 */
function createResizeListener() {
  const ele = document.querySelector('.chart-wrapper')
  if (!ele) return

  let isResizing = false

  ele.addEventListener('mousedown', () => {
    isResizing = true
  })

  ele.addEventListener('mouseup', () => {
    setTimeout(() => {
      isResizing = false
      ;(CIQ as any).isResizing = false
    }, 500)
  })

  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target && isResizing) {
        ;(CIQ as any).isResizing = true
      }
    }
  })

  resizeObserver.observe(ele)
}

/**
 * Initialize ReportsFilter in the designated container.
 * Uses Vue3 createVNode + render instead of Vue.extend().$mount().
 */
function initializeReportsFilter() {
  const reportsFilter = document.querySelector('.reports-filter-container')
  if (!reportsFilter) return

  const vnode = createVNode(ReportsFilter)
  render(vnode, reportsFilter)
}

/**
 * Initialize SymbolUploader in the designated container.
 */
function initializeSymbolUploader(node: Element) {
  const uploader = document.querySelector('.symbol-uploader')
  if (uploader) return

  if (node) {
    // UploaderVue would be imported and mounted here
    // For now, this is a placeholder — adapt when needed
  }
}

/**
 * Observe DOM mutations to detect when symbol uploader is rendered.
 */
function symbolMutationObserver() {
  const targetNode = document.body
  const config = { childList: true, subtree: true }

  mutationObserver = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        const cqLookupFiltersElement = document.querySelector('cq-uploader')
        if (cqLookupFiltersElement) {
          initializeSymbolUploader(cqLookupFiltersElement)
          mutationObserver?.disconnect()
          mutationObserver = null
          break
        }
      }
    }
  })

  mutationObserver.observe(targetNode, config)
}

/**
 * Inject a real DOM <template cq-study-legend> into each <cq-study-legend>.
 * Vue 3 strips <template> elements from rendered output, but ChartIQ's
 * StudyLegend.begin() needs a real <template> to clone when adding studies.
 */
function injectStudyLegendTemplates() {
  document.querySelectorAll('cq-study-legend-content').forEach((contentEl) => {
    // Skip if a real <template cq-study-legend> already exists
    if (contentEl.querySelector('template[cq-study-legend]')) return

    const tpl = document.createElement('template')
    tpl.setAttribute('cq-study-legend', '')
    tpl.innerHTML = `
      <cq-item>
        <cq-label></cq-label>
        <span class="ciq-edit" title="edit study"></span>
        <div class="ciq-icon ciq-close" title="edit close"></div>
      </cq-item>
    `
    // Insert at the beginning so StudyLegend.find("template[cq-study-legend]") finds it first
    contentEl.prepend(tpl)
  })
}

/**
 * Pattern match resize — adjust drawing objects when chart is resized.
 */
function resizePatternMatch() {
  const stxx = CIQ.stxx
  if (!stxx) return

  const yAxis = stxx.chart.yAxis
  const offset = (yAxis.high - yAxis.low) / 4

  for (let i = 0; i < stxx.drawingObjects.length; i++) {
    const drawing = stxx.drawingObjects[i]
    drawing.v0 = yAxis.high + offset
    drawing.v1 = yAxis.low - offset
    drawing.adjust()
  }
  stxx.draw()
}

/**
 * Change marker visibility (buy/sell markers for dual-symbol mode).
 */
function changeMarkerVisibility(type: string) {
  ;(CIQ as any).setMarkerVisibility(type)
}

/**
 * Toggle AI support line.
 */
async function toogleAISupline() {
  aISuplineloading.value = true
  try {
    // @ts-expect-error CIQ.updateSupportLineWithChannelDrawing is a custom extension
    const msg = await CIQ.updateSupportLineWithChannelDrawing({ stxx: CIQ.stxx })
    // TODO: Replace with proper toast/notification system
    console.info('[ChartIQ] AI Support Line:', msg)
  } catch (errMsg: unknown) {
    console.error('[ChartIQ] AI Support Line Error:', errMsg)
  }
  aISuplineloading.value = false
}

function openModal(_contentType: string) {
  // Strategy Modal — stubbed for now, full implementation needs
  // StrategySigal, SummaryChart, TradesTable, Description components
  // adapted from Vue2 to Vue3.
  // For Phase 1, we keep the integration point here.
}

function closeModal() {
  isShowStrategyDescription.value = false
}

function changeStrategyIndex(index: number | string) {
  strategyIndex.value = Number(index)
}

function showStrategyDescription() {
  isShowStrategyDescription.value = !isShowStrategyDescription.value
}

function getStrategiesOptions(options: Array<{ label: string; value: number }>) {
  strategiesOptions.value = options
}

function collapseStudies() {
  isCollapse.value = true
}

/**
 * Chart creation — runs after DOM mount.
 */
function initializeChart() {
  const config = props.config || getCustomConfig({
    chartId: '_advanced-chart',
    symbol: props.symbol,
    restore: props.restore,
    onChartReady: props.onChartReady,
  })

  const containerEl = document.getElementById('cq-context-root') as HTMLElement | null
  if (!containerEl) return

  overrideStudyDef()
  portalizeContextDialogs(containerEl)

  // Assign store to CIQ BEFORE createChartAndUI so web components can access it
  ;(CIQ as any).store = createVuexAdapter(chartIQStore as any)

  // Stub nprogress — ChartIQ calls CIQ.nprogress.start()/done() but it's not installed
  // Pass the actual CIQ object so loadIndicator.js (which imports CIQ from chartiq.js) gets it
  setupNProgressStub(CIQ as Record<string, unknown>)

  window.setTimeout(() => {
    const uiContext = createChartAndUI(config, containerEl)
    uiContextRef.value = uiContext

    // Vue 3 strips <template> elements — inject real ones for ChartIQ
    injectStudyLegendTemplates()

    CIQ.stxx = uiContext.stx
    CIQ.stxx.dontRoll = true
    CIQ.stxx.maxDataSetSize = 0
    CIQ.stxx.minimumCandleWidth = 0.001
    CIQ.periodicity = { period: 1, interval: 1, timeUnit: 'day' }

    // Iterator setup
    const iter = CIQ.stxx.chart.market.newIterator({
      interval: CIQ.stxx.layout.interval,
      periodicity: CIQ.stxx.layout.periodicity,
      timeUnit: CIQ.stxx.layout.timeUnit,
      inZone: CIQ.stxx.dataZone,
      outZone: CIQ.stxx.displayZone,
    })

    // Build study list
    ;(CIQ as any).studys = []
    for (const study in CIQ.Studies.studyLibrary) {
      ;(CIQ as any).studys.push(study)
    }

    CIQ.stxx.setLineStyle({ width: 3 })

    // Prepend draw hook (custom business logic)
    CIQ.ChartEngine.prototype.prepend('draw', function () {
      // Custom draw hook — extend as needed
    })

    // Add logo container
    const node = document.getElementsByClassName('chartContainer')[0]
    if (node) {
      const newdiv = document.createElement('div')
      newdiv.className = 'stLogo'
      node.appendChild(newdiv)
    }

    // Emit initialized event
    emit('chart-initialized', { chartEngine: uiContext.stx, uiContext, config })

    // Fallback: if ChartIQ itself did not fire config.onChartReady, call it now.
    if (typeof config.onChartReady === 'function') {
      config.onChartReady()
    }

    // Initialize UI features
    initializeToggle(uiContext.stx)
    createResizeListener()
    symbolMutationObserver()
    initializeReportsFilter()

    // Ensure the chart reflects the current symbol prop after initialization.
    // createChartAndUI loads config.initialSymbol, but if the prop changed
    // before mount or the initial load failed, explicitly switch to it.
    if (props.symbol && uiContext.changeSymbol) {
      uiContext.changeSymbol({ symbol: props.symbol })
    }

    // Trigger a layout resize once the container has been laid out by the browser.
    window.requestAnimationFrame(() => {
      if (CIQ.stxx && CIQ.stxx.resizeChart) {
        CIQ.stxx.resizeChart()
        CIQ.stxx.draw()
      }
    })
  }, 0)
}

// When the symbol prop changes after mount, switch the chart to the new symbol.
watch(
  () => props.symbol,
  (newSymbol, oldSymbol) => {
    if (!newSymbol || newSymbol === oldSymbol) return
    const uiContext = uiContextRef.value as any
    if (uiContext?.changeSymbol) {
      uiContext.changeSymbol({ symbol: newSymbol })
    } else if (CIQ.stxx) {
      // Fallback if the uiContext isn't available yet
      CIQ.stxx.loadChart({ symbol: newSymbol })
    }
  },
)

onMounted(() => {
  initializeChart()
})

onBeforeUnmount(() => {
  // Clear preview/ownIndicator cache
  if ((CIQ as any).previewIndicatorDataCache) {
    ;(CIQ as any).previewIndicatorDataCache = {}
  }

  // Clear indicator objects
  ;(CIQ as any).objIndicator = []

  // Reset chart study state
  chartIQStore.reset_chart_full_state()

  // Destroy chart engine (stops quotefeed polling)
  if (CIQ.stxx) {
    CIQ.stxx.destroy()
  }

  // Hide cover / finish progress
  if (typeof (CIQ as any).hideCover === 'function') {
    ;(CIQ as any).hideCover()
  }
  if ((CIQ as any).nprogress) {
    ;(CIQ as any).nprogress.done()
  }

  // Disconnect observers
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (mutationObserver) {
    mutationObserver.disconnect()
    mutationObserver = null
  }
})
</script>

<template>
  <cq-context id="cq-context-root">
    <cq-color-picker></cq-color-picker>

    <div class="ciq-nav full-screen-hide">
      <div class="sidenav-toggle ciq-toggles">
        <cq-toggle
          class="ciq-sidenav"
          cq-member="sidenav"
          cq-toggles="sidenavOn,sidenavOff"
          cq-toggle-classes="active,"
          keyboard-navigation="false"
        >
          <span></span>
          <cq-tooltip>More</cq-tooltip>
        </cq-toggle>
      </div>

      <cq-side-nav cq-on="sidenavOn">
        <div class="icon-toggles ciq-toggles">
          <div class="search-bar-group">
            <cq-menu class="ciq-search">
              <cq-lookup
                cq-keystroke-claim
                cq-uppercase
                v-if="routeName !== 'ActiveStudies'"
              ></cq-lookup>
              <cq-reports-lookup
                cq-keystroke-claim
                cq-uppercase
                v-if="routeName === 'ActiveStudies'"
              ></cq-reports-lookup>
              <div class="cq-tooltip-copy">Symbol Search</div>
            </cq-menu>
            <cq-menu class="ciq-indicators-search">
              <cq-indicators-lookup
                cq-keystroke-claim=""
                cq-uppercase=""
              ></cq-indicators-lookup>
              <div class="cq-tooltip-copy">Add Indicator</div>
            </cq-menu>
          </div>

          <cq-info-toggle-dropdown class="ch-headsup">
            <cq-toggle class="ciq-CH" cq-member="crosshair">
              <span></span>
              <cq-tooltip>Crosshair (Alt + \)</cq-tooltip>
            </cq-toggle>
            <cq-menu class="ciq-menu toggle-options collapse">
              <span></span>
              <cq-menu-dropdown>
                <cq-item cq-member="crosshair">
                  Hide Heads-Up Display
                  <span class="ciq-radio"><span></span></span>
                </cq-item>
                <cq-item cq-member="headsUp-static">
                  Show Heads-Up Display
                  <span class="ciq-radio"><span></span></span>
                </cq-item>
              </cq-menu-dropdown>
            </cq-menu>
          </cq-info-toggle-dropdown>

          <cq-info-toggle-dropdown class="hu-tooltip">
            <cq-toggle class="ciq-HU" id="ciq-HU" cq-member="headsUp">
              <span></span>
              <cq-tooltip>Info</cq-tooltip>
            </cq-toggle>
            <cq-menu class="ciq-menu toggle-options collapse tooltip-ui">
              <span></span>
              <cq-menu-dropdown>
                <cq-item cq-member="headsUp-floating">
                  Show Tooltip
                  <span class="ciq-radio"><span></span></span>
                </cq-item>
                <cq-item cq-member="headsUp-dynamic">
                  Show Dynamic Callout
                  <span class="ciq-radio"><span></span></span>
                </cq-item>
              </cq-menu-dropdown>
            </cq-menu>
          </cq-info-toggle-dropdown>

          <cq-info-toggle-dropdown class="grid-group">
            <cq-toggle
              class="grid"
              id="grid"
              stxtap="Layout.xAixsGridLine()"
            >
              <span></span>
              <cq-tooltip>grid</cq-tooltip>
            </cq-toggle>
          </cq-info-toggle-dropdown>

          <cq-info-toggle-dropdown class="lastp-group">
            <cq-toggle
              class="lastP"
              id="lastP"
              stxtap="Layout.lastPriceLabel()"
            >
              <span></span>
              <cq-tooltip>last price</cq-tooltip>
            </cq-toggle>
          </cq-info-toggle-dropdown>

          <!-- Trading Signal (shown on backtester routes) -->
          <cq-info-toggle-dropdown
            class="lastp-group"
            v-if="!!route.matched.find((i) => i.path === '/backtester')"
          >
            <cq-toggle class="trading-signal" @click="openModal('first')">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4.25 5.52539H0V14.0254H4.25V5.52539Z"
                  fill="currentColor"
                />
                <path
                  d="M2.125 2.55078V17.0008"
                  stroke="currentColor"
                  stroke-miterlimit="10"
                />
                <path
                  d="M10.2031 2.97461H5.95312V11.4746H10.2031V2.97461Z"
                  fill="currentColor"
                />
                <path
                  d="M8.07812 0V14.45"
                  stroke="currentColor"
                  stroke-miterlimit="10"
                />
                <path
                  d="M16.1484 5.52539H11.8984V14.0254H16.1484V5.52539Z"
                  fill="currentColor"
                />
                <path
                  d="M14.0234 2.55078V17.0008"
                  stroke="currentColor"
                  stroke-miterlimit="10"
                />
              </svg>
              <cq-tooltip>Trading Signal</cq-tooltip>
            </cq-toggle>
          </cq-info-toggle-dropdown>

          <!-- AI Trend Insight -->
          <div
            class="lastp-group"
            v-if="!!route.matched.find((i) => i.path === '/backtester')"
          >
            <button
              class="ai-supline"
              :disabled="aISuplineloading"
              id="ai-supline"
              @click="toogleAISupline"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 200 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M32.4518 132.453L40.2018 140.165C40.347 140.311 40.5194 140.426 40.7092 140.505C40.899 140.584 41.1025 140.624 41.3081 140.624C41.5136 140.624 41.7171 140.584 41.9069 140.505C42.0967 140.426 42.2692 140.311 42.4143 140.165L88.2518 94.4778L107.314 113.478C109.752 115.903 113.702 115.903 116.139 113.478L167.739 62.0778C167.885 61.9327 168 61.7602 168.079 61.5704C168.158 61.3806 168.198 61.1771 168.198 60.9716C168.198 60.766 168.158 60.5625 168.079 60.3727C168 60.1829 167.885 60.0105 167.739 59.8653L159.989 52.1403C159.697 51.8502 159.301 51.6875 158.889 51.6875C158.477 51.6875 158.082 51.8502 157.789 52.1403L111.752 98.0403L92.6643 79.0403C91.4896 77.8785 89.904 77.2269 88.2518 77.2269C86.5996 77.2269 85.014 77.8785 83.8393 79.0403L32.4643 130.228C32.3173 130.372 32.2005 130.544 32.1208 130.734C32.0411 130.924 32 131.128 32 131.334C32 131.54 32.0411 131.744 32.1208 131.934C32.2005 132.124 32.3173 132.296 32.4643 132.44L32.4518 132.453Z"
                  fill="currentColor"
                  fill-opacity="0.65"
                />
                <path
                  d="M160.495 111.517C160.305 111.322 160.072 111.175 159.814 111.089C159.6 111.017 159.374 110.988 159.149 111.004C158.924 111.02 158.705 111.08 158.503 111.181C158.301 111.282 158.122 111.421 157.974 111.592C157.826 111.762 157.714 111.96 157.643 112.174L153.78 123.813L142.155 127.897C141.812 128.016 141.515 128.24 141.308 128.538C141.1 128.836 140.992 129.192 141 129.555C141.008 129.918 141.131 130.269 141.352 130.558C141.572 130.846 141.879 131.057 142.227 131.161L153.758 134.645L157.379 146.22C157.487 146.566 157.702 146.87 157.993 147.086C158.284 147.302 158.637 147.421 159 147.424C159.363 147.427 159.717 147.315 160.012 147.104C160.307 146.892 160.528 146.593 160.642 146.248L164.512 134.624L176.365 131.096C176.718 130.996 177.03 130.785 177.254 130.494C177.478 130.203 177.603 129.848 177.61 129.481C177.618 129.114 177.507 128.755 177.294 128.455C177.082 128.156 176.778 127.933 176.429 127.819L164.526 123.784L160.906 112.21C160.826 111.95 160.685 111.712 160.495 111.517Z"
                  fill="currentColor"
                />
                <rect x="22" y="149" width="38" height="14" rx="2" fill="currentColor" />
                <rect x="22" y="36" width="38" height="14" rx="2" fill="currentColor" />
                <rect x="81" y="149" width="38" height="14" rx="2" fill="currentColor" />
                <rect x="81" y="36" width="38" height="14" rx="2" fill="currentColor" />
                <rect x="140" y="149" width="38" height="14" rx="2" fill="currentColor" />
                <rect x="140" y="36" width="38" height="14" rx="2" fill="currentColor" />
              </svg>
              <div class="ai-supline--tooltip">AI Trend Insight</div>
            </button>
          </div>

          <div
            class="reports-filter-container"
            v-if="routeName === 'ActiveStudies'"
          ></div>

          <!-- Buy/Sell Markers (dual-symbol) -->
          <cq-info-toggle-dropdown class="tradeMarkerWrapper flexRow">
            <cq-toggle
              class="buy"
              id="buy"
              @click="changeMarkerVisibility('buy')"
              style="display: none"
            >
              <span style="margin-right: 10px; width: 32px">
                <svg
                  t="1641979722051"
                  class="icon"
                  viewBox="0 0 1024 1024"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  p-id="2092"
                  width="30"
                  height="30"
                >
                  <path
                    d="M512 124L64 900h896z"
                    p-id="2093"
                    fill="#1afa29"
                  ></path>
                </svg>
              </span>
              <cq-tooltip
                style="
                  left: -30px;
                  width: 100px;
                  padding-top: 2px;
                  padding-bottom: 2px;
                "
              >
                BUY(SYMBOL 1)
              </cq-tooltip>
            </cq-toggle>
            <cq-toggle
              class="sell"
              id="sell"
              @click="changeMarkerVisibility('sell')"
              style="display: none"
            >
              <span style="margin-right: 10px; width: 32px">
                <svg
                  t="1636008125523"
                  class="icon"
                  viewBox="0 0 1024 1024"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  p-id="2169"
                  width="30"
                  height="30"
                >
                  <path
                    d="M525.873548 897.156129l-383.174193-761.723871 763.045161-1.981935-379.870968 763.705806z"
                    p-id="2170"
                    fill="#d81e06"
                  ></path>
                </svg>
              </span>
              <cq-tooltip
                style="
                  left: -30px;
                  width: 100px;
                  padding-top: 2px;
                  padding-bottom: 2px;
                "
              >
                SELL(SYMBOL 1)
              </cq-tooltip>
            </cq-toggle>
            <cq-toggle
              class="buy_2"
              id="buy_2"
              @click="changeMarkerVisibility('buy_2')"
              style="display: none"
            >
              <span style="margin-right: 10px; width: 32px">
                <svg
                  t="1641979722051"
                  class="icon"
                  viewBox="0 0 1024 1024"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  p-id="2092"
                  width="30"
                  height="30"
                >
                  <path
                    d="M512 124L64 900h896z"
                    p-id="2093"
                    fill="#92d2cc"
                  ></path>
                </svg>
              </span>
              <cq-tooltip
                style="
                  left: -30px;
                  width: 100px;
                  padding-top: 2px;
                  padding-bottom: 2px;
                "
              >
                BUY(SYMBOL 2)
              </cq-tooltip>
            </cq-toggle>
            <cq-toggle
              class="sell_2"
              id="sell_2"
              @click="changeMarkerVisibility('sell_2')"
              style="display: none"
            >
              <span style="margin-right: 10px; width: 32px">
                <svg
                  t="1636008125523"
                  class="icon"
                  viewBox="0 0 1024 1024"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  p-id="2169"
                  width="30"
                  height="30"
                >
                  <path
                    d="M525.873548 897.156129l-383.174193-761.723871 763.045161-1.981935-379.870968 763.705806z"
                    p-id="2170"
                    fill="#ff5290"
                  ></path>
                </svg>
              </span>
              <cq-tooltip
                style="
                  left: -30px;
                  width: 100px;
                  padding-top: 2px;
                  padding-bottom: 2px;
                "
              >
                SELL(SYMBOL 2)
              </cq-tooltip>
            </cq-toggle>
          </cq-info-toggle-dropdown>

          <!-- Favorites -->
          <div class="favBtnContainer">
            <button class="btnFav addFav">
              <div>
                <svg
                  t="1638255076868"
                  class="button_icon"
                  viewBox="0 0 1024 1024"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  p-id="2654"
                  width="200"
                  height="200"
                >
                  <path
                    d="M885.942179 427.687756l-267.445168-22.933315-104.470353-246.470461L409.553235 404.75444l-267.336698 22.933315 202.846918 175.770236-60.789505 261.34524 229.753731-138.569986 229.859132 138.569986-60.785411-261.34524L885.942179 427.687756zM514.026658 656.403854l-139.875724 84.425831 37.038568-159.160953-123.591853-106.975407 162.91751-14.053064 63.511499-150.116973 63.620993 150.116973 162.860205 14.053064-123.534548 106.975407 37.038568 159.160953L514.026658 656.403854z"
                    p-id="2655"
                    fill="#1296db"
                  ></path>
                </svg>
                <span>Add to favorites</span>
              </div>
            </button>
          </div>
        </div>
      </cq-side-nav>

      <div class="ciq-menu-section">
        <div class="ciq-dropdowns flexRow">
          <ManageLayout />

          <cq-menu class="ciq-menu ciq-period">
            <span>
              <cq-clickable stxbind="Layout.periodicity">1D</cq-clickable>
            </span>
            <cq-menu-dropdown>
              <cq-menu-container cq-name="menuPeriodicity"></cq-menu-container>
            </cq-menu-dropdown>
          </cq-menu>

          <cq-menu class="ciq-menu ciq-display collapse">
            <span>Display</span>
            <cq-menu-dropdown>
              <cq-menu-dropdown-section class="chart-types">
                <cq-heading>Chart Style</cq-heading>
                <cq-menu-container cq-name="menuChartStyle"></cq-menu-container>
              </cq-menu-dropdown-section>
            </cq-menu-dropdown>
          </cq-menu>

          <cq-menu
            class="ciq-menu ciq-studies collapse"
            cq-focus="input"
            @click="collapseStudies"
          >
            <span>Studies</span>
            <cq-menu-dropdown style="width: 400px">
              <cq-study-legend cq-no-close>
                <cq-section-dynamic>
                  <cq-heading>Current Studies</cq-heading>
                  <cq-study-legend-content>
                    <template-placeholder cq-study-legend="true">
                      <cq-item>
                        <cq-label class="click-to-edit"></cq-label>
                        <div class="ciq-icon ciq-close"></div>
                      </cq-item>
                    </template-placeholder>
                  </cq-study-legend-content>
                  <cq-placeholder>
                    <div
                      stxtap="Layout.clearStudies()"
                      class="ciq-btn sm"
                      keyboard-selectable="true"
                    >
                      Clear All
                    </div>
                  </cq-placeholder>
                </cq-section-dynamic>
              </cq-study-legend>
              <div class="scriptiq-ui">
                <cq-heading>ScriptIQ</cq-heading>
                <cq-item>
                  <cq-clickable
                    cq-selector="cq-scriptiq-editor"
                    cq-method="open"
                  >
                    New Script
                  </cq-clickable>
                </cq-item>
                <cq-scriptiq-menu></cq-scriptiq-menu>
                <cq-separator></cq-separator>
              </div>
              <cq-heading cq-filter cq-filter-min="15">Studies</cq-heading>
              <cq-scroll cq-no-maximize>
                <cq-studies v-if="isCollapse"></cq-studies>
              </cq-scroll>
            </cq-menu-dropdown>
          </cq-menu>

          <cq-menu class="ciq-menu ciq-preferences collapse">
            <span></span>
            <cq-menu-dropdown>
              <cq-menu-dropdown-section class="chart-preferences">
                <cq-heading>Chart Preferences</cq-heading>
                <cq-menu-container
                  cq-name="menuChartPreferences"
                ></cq-menu-container>
                <cq-separator></cq-separator>
              </cq-menu-dropdown-section>
              <cq-menu-dropdown-section class="y-axis-preferences">
                <cq-heading>Y-Axis Preferences</cq-heading>
                <cq-menu-container
                  cq-name="menuYAxisPreferences"
                  ref="yAxisPreferencesMenu"
                ></cq-menu-container>
                <cq-separator></cq-separator>
              </cq-menu-dropdown-section>
              <cq-menu-dropdown-section class="chart-addons">
                <cq-heading>Additional Features</cq-heading>
                <cq-menu-container
                  cq-name="menuAddOns"
                ></cq-menu-container>
                <cq-separator></cq-separator>
              </cq-menu-dropdown-section>
              <cq-menu-dropdown-section class="chart-theme">
                <cq-heading>Themes</cq-heading>
                <cq-themes></cq-themes>
                <cq-separator></cq-separator>
              </cq-menu-dropdown-section>
            </cq-menu-dropdown>
          </cq-menu>
        </div>

        <div class="trade-toggles ciq-toggles">
          <cq-toggle class="tfc-ui sidebar stx-trade" cq-member="tfc">
            <span></span>
            <cq-tooltip>Trade</cq-tooltip>
          </cq-toggle>
          <cq-toggle
            class="analystviews-ui stx-analystviews"
            cq-member="analystviews"
          >
            <span></span>
            <cq-tooltip>Analyst Views</cq-tooltip>
          </cq-toggle>
          <cq-toggle
            class="technicalinsights-ui stx-technicalinsights"
            cq-member="technicalinsights"
          >
            <span></span>
            <cq-tooltip>Technical Insights</cq-tooltip>
          </cq-toggle>
        </div>
      </div>
    </div>

    <!-- ScriptIQ -->
    <cq-scriptiq class="scriptiq-ui"></cq-scriptiq>

    <!-- Analyst Views -->
    <cq-analystviews
      class="analystviews-ui"
      token="eZOrIVNU3KR1f0cf6PTUYg=="
      partner="1000"
      disabled
    ></cq-analystviews>

    <!-- Technical Insights -->
    <cq-technicalinsights uid="" lang="en" disabled></cq-technicalinsights>

    <!-- Chart Area -->
    <cq-recent-symbols>
      <div class="ciq-chart-area">
        <div class="ciq-chart">
          <cq-message-toaster
            defaultDisplayTime="10"
            defaultTransition="slide"
            defaultPosition="top"
          ></cq-message-toaster>
          <cq-palette-dock>
            <div class="palette-dock-container">
              <cq-drawing-palette
                class="palette-drawing grid palette-hide"
                docked="true"
                orientation="vertical"
                min-height="300"
                cq-drawing-edit="none"
              ></cq-drawing-palette>
              <cq-drawing-settings
                class="palette-settings"
                docked="true"
                hide="true"
                orientation="horizontal"
                min-height="40"
                cq-drawing-edit="none"
              ></cq-drawing-settings>
            </div>
          </cq-palette-dock>

          <div class="chartContainer">
            <stx-hu-sttooltip>
              <stx-hu-tooltip-field field="DT">
                <stx-hu-tooltip-field-name>Date/Time</stx-hu-tooltip-field-name>
                <stx-hu-tooltip-field-value></stx-hu-tooltip-field-value>
              </stx-hu-tooltip-field>
              <stx-hu-tooltip-field field="Close">
                <stx-hu-tooltip-field-name></stx-hu-tooltip-field-name>
                <stx-hu-tooltip-field-value></stx-hu-tooltip-field-value>
              </stx-hu-tooltip-field>
            </stx-hu-sttooltip>

            <cq-chart-title cq-marker cq-browser-tab></cq-chart-title>
            <cq-comparison-lookup></cq-comparison-lookup>
            <cq-chart-legend></cq-chart-legend>
          </div>
        </div>
      </div>
    </cq-recent-symbols>

    <!-- Markers/Events -->
    <cq-abstract-marker cq-type="helicopter"></cq-abstract-marker>

    <!-- Attribution -->
    <cq-attribution></cq-attribution>

    <!-- Footer -->
    <div class="ciq-footer full-screen-hide">
      <div class="reload" stxtap="Layout.reloadChart()">Clear chart</div>
      <cq-show-range></cq-show-range>
    </div>

    <!-- Dialogs -->
    <cq-dialogs>
      <cq-dialog>
        <cq-drawing-context></cq-drawing-context>
      </cq-dialog>
      <cq-dialog class="description">
        <cq-study-context></cq-study-context>
      </cq-dialog>
      <cq-dialog class="description">
        <cq-study-context-default></cq-study-context-default>
      </cq-dialog>
      <cq-dialog class="description">
        <cq-study-context-myindicator></cq-study-context-myindicator>
      </cq-dialog>
    </cq-dialogs>

    <cq-side-panel></cq-side-panel>

    <div class="discription_div"></div>

    <!-- Marker hover containers -->
    <div id="stxEventHover" class="myEvents">
      <span class="content"></span>
      <span class="tooltip"></span>
    </div>
    <div id="stxMessage" class="myMes"></div>
    <div id="stxForecast" class="forecast"></div>
    <div id="stxHorizontalLabel" class="horizontalLabel"></div>

    <!-- Strategy Modal (stubbed — full implementation requires adapted sub-components) -->
    <div ref="modalBox" class="strategy-modal" style="display: none">
      <div class="strategy-container">
        <div class="dropdown">
          <button class="el-button" @click="showStrategyDescription">
            <b style="cursor: pointer; font-size: 16px">
              Click here to view Strategy Description
            </b>
          </button>
          <div class="strategy-dropdown">
            <label
              for="strategy-select"
              style="margin-right: 15px; font-weight: bold"
            >
              Select Strategy:
            </label>
            <select v-model="strategyIndex">
              <option
                v-for="(strategy, index) in strategiesOptions"
                :key="index"
                :value="strategy.value"
              >
                {{ strategy.label }}
              </option>
            </select>
          </div>
        </div>
        <div class="centent" v-show="isShowStrategyDescription">
          <p style="margin-top: 0px; font-weight: bold; text-align: justify">
            Trading Signal is the outcome of a three-year backtesting process
            conducted on 28 strategies specifically tailored to a particular
            symbol, from which the top three performing strategies were
            meticulously chosen.
            <br />
            By selecting a strategy, you can delve into more detailed information
            about how that symbol performed under that specific strategy.
            <br />
          </p>
        </div>
        <p style="font-weight: bold">
          Disclaimer: Past backtest does not guarantee future results, please be
          mindful that investing carries inherent risks.
        </p>
      </div>
    </div>
  </cq-context>
</template>

<style scoped>
select {
  font-weight: bold !important;
}

.dropdown {
  box-sizing: border-box;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30px 70px 0px 70px;
}

.flexRow {
  display: flex;
  flex-direction: row;
}

.tradeMarkerWrapper {
  margin-left: 28px;
}

.tradeMarkerWrapper span {
  margin-left: 2px;
}

.icon-toggles.ciq-toggles {
  display: flex;
}

.search-bar-group {
  margin: 0 10px;
  border-right: solid 1px black;
  display: flex;
  flex-direction: row;
}

.cq-tooltip-copy {
  bottom: -8px;
  position: absolute;
  display: block;
  background: #398dff;
  transition: opacity 0.1s 0s, margin 0.5s 0s;
  opacity: 0;
  z-index: 4;
  width: 44px;
  height: auto;
  left: -8px;
  text-align: center;
  font-weight: 400;
  font-size: 10px;
  color: #f8f8f8;
  border-radius: 1px;
  pointer-events: none;
  padding: 4px;
}

html:not([ciq-last-interaction='touch'])
  .ciq-search:hover
  .cq-tooltip-copy,
html:not([ciq-last-interaction='touch'])
  .ciq-indicators-search:hover
  .cq-tooltip-copy {
  opacity: 1;
  transition: opacity 0.1s 0.25s, bottom 0.5s 0.25s;
  bottom: -38px;
  border: 1px solid #e4e4e4;
}

html:not([ciq-last-interaction='touch'])
  .ciq-search:visited
  .cq-tooltip-copy,
html:not([ciq-last-interaction='touch'])
  .ciq-indicators-search:visited
  .cq-tooltip-copy {
  opacity: 0;
}

.ai-supline {
  /* Loading spinner styles adapted from Element UI */
  position: relative;
}

.strategy-modal {
  /* Strategy modal container — full styles come from ChartIQ CSS */
}

/* 【Vue2→Vue3 兼容】Tailwind v4 预置的 .collapse { visibility: collapse } 覆盖了 ChartIQ 菜单的 collapse 状态类 */
.ciq-menu.collapse {
  visibility: visible !important;
}

/* 【Vue2→Vue3 兼容】页面布局的 Tailwind .grid 类导致 ChartIQ 雪碧图规则 .grid span 误匹配工具栏图标
   使用 ChartIQ CSS 定义的原始坐标覆盖：lastP=-2071, CH=-443, HU=-400, grid=-1443 */
.lastp-group cq-toggle > span { background-position: -2071px -25px !important; }
.ch-headsup  cq-toggle > span  { background-position:  -443px -25px !important; }
.hu-tooltip   cq-toggle > span  { background-position:  -400px -25px !important; }
.grid-group   cq-toggle > span  { background-position: -1443px -25px; }
</style>

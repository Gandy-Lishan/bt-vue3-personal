// @ts-nocheck
/**
 * ChartIQ resource imports — Vite-adapted version
 *
 * Original: resources.js in Vue2 project
 * Adaptation: All '@/components/common/chart/st-development/' paths → relative '../st-development/'
 */

// @ts-expect-error ChartIQ does not ship with TS declarations
import { CIQ } from './st-development/js/components'

// @ts-expect-error ChartIQ advanced bundle
import 'chartiq/js/advanced'

// @ts-expect-error ChartIQ addOns bundle
import 'chartiq/js/addOns'

// Symbol mapping to market definition
import 'chartiq/examples/markets/marketDefinitionsSample'
import 'chartiq/examples/markets/marketSymbologySample'

import 'chartiq/examples/feeds/symbolLookupChartIQ'
import 'chartiq/examples/translations/translationSample'

// Event Markers
// @ts-expect-error Custom marker sample
import marker from './st-development/examples/markers/markersSample.js'
import './st-development/examples/markers/tradeAnalyticsSample.js'
import './st-development/examples/markers/mMarker.js'
import './st-development/examples/markers/markerDrawer.js'

// Vite does not execute the CommonJS `require('./tradeAnalyticsSample.css')` /
// `require('./markersSample.scss')` branches in the marker sample files, and the fallback
// CIQ.loadStylesheet paths point to a non-existent 'components/markers' directory. Import
// the styles directly so marker styles are bundled and applied.
import './st-development/examples/markers/tradeAnalyticsSample.css'
import './st-development/examples/markers/markersSample.scss'
import 'chartiq/examples/markers/videoSample'

// Directly register CIQ.loadChart and CIQ.addMarker on the CIQ object.
// The markerDrawer.js module defines these inside __st_js_marker_drawer_,
// but Vite tree-shakes the activateImports call that would execute it.
// We replicate the essential setup here, setting them on both the module CIQ
// and the global window.CIQ (ChartIQ's main entry point sets window.CIQ).
function setupMarkerUtils(target: any) {
  target.loadChart = function(dataSet: any[], callback: () => void) {
    target.MarkersSample = new marker.MarkersSample(target.stxx)
    target.MarkersSample.loadDataSet(dataSet)
    target.MarkersSample.hideMarkers()
    target.MarkersSample.setMarkerVisibilityType()
    callback()
  }
  target.addMarker = function() {
    console.log('[addMarker] stPerformance exists:', !!target.Marker?.stPerformance, 'mMarker registered:', !!target.MarkersSample?.specialTypes?.mMarker)
    target.MarkersSample.showMarkers('mMarker')
  }
}
setupMarkerUtils(CIQ)
// Also set on window.CIQ for Playwright tests and any code accessing the global
if (typeof window !== 'undefined' && window.CIQ) {
  setupMarkerUtils(window.CIQ)
}

import 'chartiq/js/extras/svgcharts/piechart.js'

// @ts-expect-error Custom quote feed
import quoteFeed from './st-development/examples/feeds/STStockDataFeed.js'
import './st-development/js/webcomponents/reportsLookupDataFilter'

// Forecasting simulator
import forecastQuoteFeed from 'chartiq/examples/feeds/quoteFeedForecastSimulator.js'

// @ts-expect-error Third-party PerfectScrollbar
import PerfectScrollbar from 'chartiq/js/thirdparty/perfect-scrollbar.esm.js'

// @ts-expect-error Custom default configuration
import defaultConfig from './st-development/js/defaultConfiguration'

// Plugins — only the ones we actually use
import 'chartiq/plugins/timespanevent/timespanevent'
import 'chartiq/plugins/timespanevent/examples/timeSpanEventSample'

/**
 * Creates a complete customised configuration object.
 */
function getConfig() {
  return defaultConfig({
    quoteFeed,
    forecastQuoteFeed,
    markerSample: marker.MarkersSample,
    scrollStyle: PerfectScrollbar,
    nameValueStore: CIQ.NameValueStore,
  })
}

/**
 * Creates a customised configuration object with optional overrides.
 */
function getCustomConfig(
  opts: {
    chartId?: string
    symbol?: string | Record<string, unknown>
    restore?: boolean
    onChartReady?: () => void
  } = {},
) {
  const { chartId, symbol, restore, onChartReady } = opts
  const config = getConfig()

  config.chartId = chartId || '_advanced-chart'
  config.initialSymbol = symbol
    ? typeof symbol === 'string'
      ? { symbol, name: symbol, exchDisp: 'NASDAQ' }
      : symbol
    : undefined

  if (typeof restore === 'boolean') config.restore = restore

  config.onChartReady = onChartReady

  // Select only the plugins we need
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    marketDepth,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    termStructure,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tfc,
    timeSpanEventPanel,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    visualEarnings,
  } = config.plugins

  config.plugins = {
    timeSpanEventPanel,
  }

  return config
}

export { CIQ, getConfig, getCustomConfig, marker, quoteFeed, PerfectScrollbar }

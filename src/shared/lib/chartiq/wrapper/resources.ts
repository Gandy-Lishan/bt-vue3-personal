/**
 * ChartIQ resource imports — Vite-adapted version
 *
 * Original: resources.js in Vue2 project
 * Adaptation: All '@/components/common/chart/st-development/' paths → relative '../st-development/'
 */

// @ts-expect-error ChartIQ does not ship with TS declarations
import { CIQ } from '../st-development/js/components'

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
import marker from '../st-development/examples/markers/markersSample.js'
import '../st-development/examples/markers/tradeAnalyticsSample.js'
import '../st-development/examples/markers/mMarker.js'
import 'chartiq/examples/markers/videoSample'

import 'chartiq/js/extras/svgcharts/piechart.js'

// @ts-expect-error Custom quote feed
import quoteFeed from '../quote-feed/STStockDataFeed'
import '../st-development/js/webcomponents/reportsLookupDataFilter'

// Forecasting simulator
import forecastQuoteFeed from 'chartiq/examples/feeds/quoteFeedForecastSimulator.js'

// @ts-expect-error Third-party PerfectScrollbar
import PerfectScrollbar from 'chartiq/js/thirdparty/perfect-scrollbar.esm.js'

// @ts-expect-error Custom default configuration
import defaultConfig from '../st-development/js/defaultConfiguration'

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
    symbol?: string
    restore?: boolean
    onChartReady?: () => void
  } = {},
) {
  const { chartId, symbol, restore, onChartReady } = opts
  const config = getConfig()

  config.chartId = chartId || '_advanced-chart'
  config.initialSymbol = symbol

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

/**
 * ChartIQ v8.3.3 TypeScript declarations
 *
 * ChartIQ is a commercial library distributed as a UMD/ES module bundle.
 * These declarations cover the public API surface used by our wrapper.
 */

import type { Store } from 'pinia'

declare global {
  interface Window {
    CIQ: CIQNamespace
  }
}

export interface CIQChartEngine {
  destroy(): void
  draw(): void
  changeOccurred(type: string): void
  exportLayout(): Record<string, unknown>
  importLayout(opts: Record<string, unknown>): void
  setChartType(type: string): void
  setPeriodicityV2(period: number, interval: number, timeUnit: string): void
  setSymbol(symbol: string, callback?: () => void): void
  appendMasterData(quotes: CIQQuote[], params: { useAsDefaultPeriodicity?: boolean }): void
  createQuoter(): { start(): void }
  getQuoteFeed(): unknown
  layout: {
    studies: Record<string, CIQStudyDefinition>
    markerSet?: Record<string, unknown>
    chartType?: string
  }
  preferences: {
    setNightMode?: (isDark: boolean) => void
  }
  extendPanel(name: string): void
  getSeriesMaxMin(): { max: number; min: number }
  panel: {
    getMaxMin(name: string): { max: number; min: number }
  }
  getCurrentQuote(): unknown
  getSpanFromDate(): number
  createDefaultPlotter(): unknown
  charts: unknown[]
  yAxes: {
    _table: Array<{
      getMaximumValue(): number
      getMinimumValue(): number
      getPixelFromValue(value: number): number
    }>
  }
}

export interface CIQQuote {
  DT: string | number
  Open?: number
  High?: number
  Low?: number
  Close?: number
  Volume?: number
  Adj?: number
  [key: string]: unknown
}

export interface CIQStudyDefinition {
  name: string
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  parameters: Record<string, unknown>
  panelName: string
  customLegend?: boolean
  permanent?: boolean
}

export interface CIQUiContext {
  stx: CIQChartEngine
  config: Record<string, unknown>
  getAdvertised(name: string): unknown
  topNode: HTMLElement
  doNotDisconnect?: boolean
}

export interface CIQNamespace {
  // Chart Engine
  ChartEngine: {
    new (): CIQChartEngine
    prototype: {
      prepend(method: string, fn: Function): void
    }
  }

  // UI Components
  UI: {
    Context: CIQUiContext
    Chart: {
      new (): {
        createChartAndUI(opts: {
          container: HTMLElement
          config: Record<string, unknown>
        }): CIQUiContext
      }
    }
    addResizeListener(el: HTMLElement, fn: () => void): void
    removeResizeListener(el: HTMLElement, fn: () => void): void
    keepConnected?(el: HTMLElement, val: boolean): void
  }

  // Studies
  Studies: {
    studyLibrary: Record<string, unknown>
    removeStudy(stx: CIQChartEngine, sd: CIQStudyDefinition): void
    activateImports(): void
  }

  // Globals (assigned at runtime)
  stxx?: CIQChartEngine
  store?: Store<string, Record<string, unknown>, Record<string, never>, Record<string, never>>
  periodicity: {
    period: number
    interval: number
    timeUnit: string
  }
  previewIndicatorDataCache?: Record<string, unknown>
  objIndicator?: unknown[]
  hideCover?: () => void
  dialog?: boolean
  store_getters?: Record<string, unknown>
  setMarkerVisibility?(type: string): void
  SVGChart?: unknown
  NameValueStore?: unknown

  // Utilities
  simulateL2?(params: {
    stx: CIQChartEngine
    rangeFactor?: number
    onInterval: number
    onTrade: boolean
  }): void
}

// ChartIQ module declarations
declare module 'chartiq/js/chartiq' {
  export const CIQ: CIQNamespace
}

declare module 'chartiq/js/components' {
  export const CIQ: CIQNamespace
}

declare module 'chartiq/js/advanced' {}
declare module 'chartiq/js/addOns' {}
declare module 'chartiq/js/componentUI' {
  export const CIQ: CIQNamespace
}

declare module 'chartiq/examples/markets/marketDefinitionsSample' {}
declare module 'chartiq/examples/markets/marketSymbologySample' {}
declare module 'chartiq/examples/feeds/symbolLookupChartIQ' {}
declare module 'chartiq/examples/translations/translationSample' {}
declare module 'chartiq/examples/markers/markersSample' {}
declare module 'chartiq/examples/markers/tradeAnalyticsSample' {}
declare module 'chartiq/examples/markers/mMarker' {}
declare module 'chartiq/examples/markers/videoSample' {}
declare module 'chartiq/examples/feeds/quoteFeedForecastSimulator' {}
declare module 'chartiq/js/extras/svgcharts/piechart' {}
declare module 'chartiq/plugins/timespanevent/timespanevent' {}
declare module 'chartiq/plugins/timespanevent/examples/timeSpanEventSample' {}
declare module 'chartiq/js/thirdparty/perfect-scrollbar.esm' {
  export default class PerfectScrollbar {
    constructor(container: HTMLElement, options?: Record<string, unknown>)
    update(): void
    destroy(): void
  }
}

// @ts-nocheck
/**
 * ChartIQ Pinia Store — adapted from Vuex store/modules/chart.js (Vue2 project)
 *
 * Key adaptations:
 *   - Vuex store → Pinia defineStore
 *   - process.env.VUE_APP_* → import.meta.env.VITE_*
 *   - CIQ.store.state/form → window.CIQ.store (this store instance)
 *   - CIQ.store.commit/getters/dispatch → direct state/action access
 *
 * IMPORTANT: CIQ.store = useChartIQStore() is set in ChartIQEngine.vue before chart creation.
 */

import { defineStore } from 'pinia'
import stocksData from '@/assets/stocks_list.json'
import indexsData from '@/assets/indexes_list.json'
import indicatorsData from '@/assets/indicatorsWithSymbolList.json'
import {
  getFavorite as apiGetFavorite,
  updateFavorite as apiUpdateFavorite,
  getAllMySymbolsList as apiGetAllMySymbolsList,
  getAllMyIndicatorsList as apiGetAllMyIndicatorsList,
  getPairData as apiGetPairData,
  getBTV1FavIndicator as apiGetBTV1FavIndicator,
  obtainBTV1IndicatorsList as apiObtainBTV1IndicatorsList,
  getForecastList as apiGetForecastList,
  getSymbollistForecast as apiGetSymbollistForecast,
} from '@/shared/lib/chartiq/service-stub'

const VITE_DEFAULT_SYMBOL = import.meta.env.VITE_DEFAULT_SYMBOL || 'AAPL'

/**
 * Format pair data (OHLCV) from API response.
 * Mirrors Vue2's formatData function.
 */
function formatPairData(data: unknown[] | null | undefined): unknown[] {
  if (!data || !Array.isArray(data) || data.length === 0) return []
  const newQuotes: Array<Record<string, unknown>> = []
  const hasOHLCV = 'High' in data[0]

  for (let i = 0; i < data.length; i++) {
    newQuotes[i] = {}
    newQuotes[i].DT = formatStandardTime(data[i].DT as string)
    if (hasOHLCV) {
      newQuotes[i].Open = data[i].Open
      newQuotes[i].High = data[i].High
      newQuotes[i].Low = data[i].Low
      newQuotes[i].Close = data[i].Close
      newQuotes[i].Volume = data[i].Volume
    } else {
      newQuotes[i].Open = data[i].Close
      newQuotes[i].High = data[i].Close
      newQuotes[i].Low = data[i].Close
      newQuotes[i].Close = data[i].Close
      if (data[i].Volume) newQuotes[i].Volume = data[i].Volume
    }
  }
  return newQuotes
}

/**
 * Format a date string to standard time format.
 */
function formatStandardTime(dt: string | undefined): string {
  if (!dt) return ''
  try {
    const d = new Date(dt)
    const Y = d.getUTCFullYear()
    const M = String(d.getUTCMonth() + 1).padStart(2, '0')
    const D = String(d.getUTCDate()).padStart(2, '0')
    const h = String(d.getUTCHours()).padStart(2, '0')
    const m = String(d.getUTCMinutes()).padStart(2, '0')
    const s = String(d.getUTCSeconds()).padStart(2, '0')
    return `${Y}-${M}-${D} ${h}:${m}:${s}`
  } catch {
    return dt
  }
}

// Overlay toggles (DOM manipulation — kept as-is for ChartIQ webcomponents)
function toggleOverlaySelector(selector: string, displayStyle: string) {
  const overlays = document.querySelectorAll<HTMLElement>(selector)
  overlays.forEach((overlay) => {
    if (overlay) overlay.style.display = displayStyle
  })
}

function toggleOverlaySymbol(displayStyle: string) {
  toggleOverlaySelector('cq-lookup-filters .overlay', displayStyle)
}

function toggleOverlayIndicator(displayStyle: string) {
  toggleOverlaySelector('cq-indicators-lookup-filters .overlay', displayStyle)
}

export interface ChartIQState {
  // chart type management
  chartType: 'line' | 'candle'
  isBTChartReady: boolean
  chartLoadingSetting: {
    isChartLoading: boolean
    showProgress: boolean
    percentage: number
    progressText: string
  }

  // favorites
  favoriteIndicatorList: unknown[]
  favoriteSymbolList: unknown[]

  // studies / indicators
  techSD: unknown[]
  savedTechSD: unknown[]
  currentSenti: { url: string; name: string }
  indicators: {
    formIndicators: {
      entry: unknown[]
      exit: unknown[]
      entry2: unknown[]
      exit2: unknown[]
    }
    extraIndicators: unknown[]
  }
  extremeValue: unknown[]
  indicatorsList: unknown[]
  builtinList: unknown[]
  maLikeTech: string[]
  formateTechnicalList: unknown[]

  // trades
  trades: unknown[]

  // MA colors (used by loadIndicator.js getColorByCriteriaAndIndex)
  ma_color_1: string[]
  ma_color_2: string[]

  // MA activation
  activatedMA: Array<{ period: number; url: string }>
  activatedMALayout: unknown[]
  activatedTechLayout: unknown[]

  // span period
  spanPeriod: Record<string, unknown>

  // study settings
  studySettingMA: { period: string; criteria: string; panelIndex: string }
  studySettingROC: { period: string; criteria: string; panelIndex: string }

  // user's own indicator (My Indicator page)
  miFormShift: { display: boolean; showInput: boolean; value: number }
  miFormCategories: string
  miFormCategoriesIndicator1: { name: string; url: string }
  miFormCategoriesIndicator2: { name: string; url: string }
  miFormWeightedList: unknown[]
  miBenmark: string

  // forecast
  forecastList: unknown[]
  forecastAuthorList: unknown[]
  symbollistForecast: unknown[]
  forecastMarket: string

  // indicator page data
  indicatorsPageListdata: Record<string, string | null>
  indicatorPageBtv1List: unknown[]
  favoriteIndicatorListBtv1: unknown | null
  cssMonthLabel: string

  // criteria score
  criteriaScoreList: unknown[]

  // drawing
  drawingObjList: unknown[]

  // ticker OHLCV pairdata
  tickerOhlcvPairdata: Record<string, unknown>

  // jump to BT symbol
  JumpToBTSymbol: string

  // freq management (from form)
  pairDataFreq: string
  exitFrequency: string
  restoreFreq: string

  // symbol/indicator lists (loaded from JSON assets, used by lookup.js, indicators-search.js)
  stocksList: unknown[]
  indexsList: unknown[]
  originIndicatorList: unknown[]
  technicalCategory: unknown[]

  // user's own symbols & indicators (fetched from API, used by lookup.js, indicators-search.js)
  mySymbolList: unknown[]
  mySymbolQuotefeedCache: unknown[]
  myIndicatorList: unknown[]

  // current date (ai)
  curDate: string
}

function defaultState(): ChartIQState {
  return {
    chartType: 'line',
    isBTChartReady: false,
    chartLoadingSetting: {
      isChartLoading: false,
      showProgress: false,
      percentage: 0,
      progressText: 'Loading...',
    },
    favoriteIndicatorList: [],
    favoriteSymbolList: [],
    techSD: [],
    savedTechSD: [],
    currentSenti: { url: '', name: '' },
    indicators: {
      formIndicators: {
        entry: new Array(5).fill(null),
        exit: new Array(5).fill(null),
        entry2: new Array(5).fill(null),
        exit2: new Array(5).fill(null),
      },
      extraIndicators: [],
    },
    extremeValue: [],
    indicatorsList: [],
    builtinList: [],
    maLikeTech: [
      'ma',
      'Symbol Open',
      'Symbol High',
      'Symbol Low',
      'Symbol Close',
      'Symbol Volume',
      'Symbol Ratio',
    ],
    formateTechnicalList: [],
    trades: [],
    ma_color_1: ['#FF0000'],
    ma_color_2: ['#f59e0b'],
    activatedMA: [{ period: 21, url: '' }],
    activatedMALayout: [],
    activatedTechLayout: [],
    spanPeriod: {},
    studySettingMA: { period: '', criteria: '', panelIndex: '' },
    studySettingROC: { period: '', criteria: '', panelIndex: '' },
    miFormShift: { display: false, showInput: false, value: 0 },
    miFormCategories: 'Indicator Spread',
    miFormCategoriesIndicator1: { name: '', url: '' },
    miFormCategoriesIndicator2: { name: '', url: '' },
    miFormWeightedList: [],
    miBenmark: VITE_DEFAULT_SYMBOL,
    forecastList: [],
    forecastAuthorList: [],
    symbollistForecast: [],
    forecastMarket: 'SPY',
    indicatorsPageListdata: {},
    indicatorPageBtv1List: [],
    favoriteIndicatorListBtv1: null,
    cssMonthLabel: '',
    criteriaScoreList: [],
    drawingObjList: [],
    tickerOhlcvPairdata: {},
    JumpToBTSymbol: '',
    pairDataFreq: 'daily',
    exitFrequency: '',
    restoreFreq: '',

    // symbol/indicator lists from JSON assets
    stocksList: stocksData,
    indexsList: indexsData,
    originIndicatorList: indicatorsData,
    technicalCategory: [],

    // 【Vue2→Vue3 兼容】镜像原版 fetch_indicatorsList 结果，CIQ.findSentiIndicator 依赖它解析 symbol-based indicators（如 A -> A@indicator）
    indicatorsList: (() => {
      const stockSet = new Set(stocksData.map((item: Record<string, unknown>) => item.stock))
      return indicatorsData.map((item: Record<string, unknown>) => {
        if (stockSet.has(item.url)) {
          return {
            chart_name: `${item.url} Optix`,
            url: `${item.url}@indicator`,
            market_symbol: item.market_symbol,
            type: item.type,
            updated: item.updated,
          }
        }
        return item
      })
    })(),

    // user's own symbols & indicators (empty until fetched from API)
    mySymbolList: [],
    mySymbolQuotefeedCache: [],
    myIndicatorList: [],

    // current date (ai)
    curDate: '',
  }
}

export const useChartIQStore = defineStore('chartIQ', {
  state: (): ChartIQState => defaultState(),

  actions: {
    // Chart type
    set_chart_type(val: 'line' | 'candle') {
      this.chartType = val
    },

    // Chart ready
    set_chart_ready(ready: boolean) {
      this.isBTChartReady = ready
    },

    // Chart loading
    set_chart_loading(obj: {
      isChartLoading?: boolean
      showProgress?: boolean
      percentage?: number
      progressText?: string
    }) {
      this.chartLoadingSetting = {
        isChartLoading: obj.isChartLoading ?? this.chartLoadingSetting.isChartLoading,
        showProgress: obj.showProgress ?? this.chartLoadingSetting.showProgress,
        percentage: obj.percentage ?? this.chartLoadingSetting.percentage,
        progressText: obj.progressText ?? this.chartLoadingSetting.progressText,
      }
    },

    // Span period
    set_span_period(val: Record<string, unknown>) {
      this.spanPeriod = val
    },

    // Jump to BT symbol
    set_jump_to_bt_symbol(index: string) {
      this.JumpToBTSymbol = index
    },

    // Favorite indicator list
    set_favorite_indicator_list(val: unknown[]) {
      this.favoriteIndicatorList = val
    },

    // Favorite symbol list
    set_favorite_symbol_list(val: unknown[]) {
      this.favoriteSymbolList = val
    },

    // Tech SD (study definitions)
    set_tech_sd(val: unknown[]) {
      this.techSD = val
    },

    // Saved tech SD (current studies on chart)
    set_saved_tech_sd(val: unknown[]) {
      this.savedTechSD = val
    },

    // Current sentiment indicator
    set_current_senti(val: { url: string; name: string }) {
      this.currentSenti = val
    },

    // Extreme value
    set_extreme_value(list: unknown[]) {
      this.extremeValue = list
    },

    // Indicator list
    set_indicators_list(data: unknown[]) {
      this.indicatorsList = data
    },

    // Built-in tech list
    set_builtin_list(data: unknown[]) {
      this.builtinList = data
    },

    // Formatted tech list
    set_format_tech_list(list: unknown[]) {
      this.formateTechnicalList = list
    },

    // MA activation
    set_activated_ma(val: Array<{ period: number; url: string }>) {
      this.activatedMA = val
    },

    set_ma_layout(val: unknown[]) {
      this.activatedMALayout = val
    },

    set_tech_layout(val: unknown[]) {
      this.activatedTechLayout = val
    },

    // Trades
    set_trades(data: unknown[]) {
      this.trades = data
    },

    // 【Vue2→Vue3 兼容】照搬原版 Vuex states.js 的 set_isMarkerShown_flag action
    set_isMarkerShown_flag(val: boolean) {
      // @ts-ignore
      if (typeof CIQ === 'undefined' || !CIQ.stxx) return
      if (!val) {
        this.trades = []
        if (typeof CIQ.hideMarker === 'function') CIQ.hideMarker()
      } else {
        if (typeof CIQ.addPrompt === 'function') CIQ.addPrompt()
      }
    },

    // Entry data (from backtest)
    set_entry_data(obj: Record<string, unknown>) {
      // Adapted from original Vuex — set entry/exit indicators from backtest form
      const { index, value, criteria } = obj
      if (criteria && index !== undefined && this.indicators.formIndicators[criteria]) {
        this.indicators.formIndicators[criteria][index] = value
      }
    },

    // Criteria indicators list
    set_criteria_indicators_list(obj: { criteria: string; list: unknown[] }) {
      if (this.indicators.formIndicators[obj.criteria]) {
        this.indicators.formIndicators[obj.criteria] = obj.list
      }
    },

    // Extra indicators
    set_extra_indicators(val: unknown[]) {
      this.indicators.extraIndicators = val
    },

    // Study settings
    set_study_setting_ma(obj: { period: string; criteria: string; panelIndex: string }) {
      this.studySettingMA = obj
    },

    set_study_setting_roc(obj: { period: string; criteria: string; panelIndex: string }) {
      this.studySettingROC = obj
    },

    // My Indicator form
    set_mi_form_shift(val: { display: boolean; showInput: boolean; value: number }) {
      this.miFormShift = val
    },

    set_mi_form_state(obj: {
      categories: string
      indicator_1: string
      indicator_1_url: string
      indicator_2: string
      indicator_2_url: string
    }) {
      this.miFormCategories = obj.categories
      this.miFormCategoriesIndicator1 = { name: obj.indicator_1, url: obj.indicator_1_url }
      this.miFormCategoriesIndicator2 = { name: obj.indicator_2, url: obj.indicator_2_url }
    },

    set_mi_weighted_list(val: unknown[]) {
      this.miFormWeightedList = val
    },

    set_mi_benchmark(val: string) {
      this.miBenmark = val
    },

    // Forecast
    set_forecast_market(val: string) {
      this.forecastMarket = val
    },

    set_forecast(list: unknown[]) {
      this.forecastList = list
    },

    set_forecast_author_list(list: unknown[]) {
      this.forecastAuthorList = list
    },

    set_symbollist_forecast(list: unknown[]) {
      this.symbollistForecast = list
    },

    // Indicator page data
    set_indicator_page_btv1_list(res: { data?: { data?: unknown[] } } | unknown[]) {
      this.indicatorPageBtv1List = (res as { data?: { data?: unknown[] } })?.data?.data ?? (res as unknown[]) ?? []
    },

    set_favorite_indicator_list_btv1(obj: unknown) {
      this.favoriteIndicatorListBtv1 = obj
    },

    set_indicators_page_list_data({ url, data }: { url: string; data: unknown[] | null }) {
      if (!url) return
      const removeDuplicates = (items: unknown[]) => {
        const seen = new Set<string>()
        return items.filter((item: Record<string, unknown>) => {
          if (seen.has(item.url as string)) return false
          seen.add(item.url as string)
          return true
        })
      }
      this.indicatorsPageListdata[url] = !data
        ? null
        : JSON.stringify(removeDuplicates(data as Array<Record<string, unknown>>))
    },

    set_css_month_label(val: string) {
      this.cssMonthLabel = val
    },

    // Drawing
    set_drawing_objlist(list: unknown[]) {
      this.drawingObjList = list
    },

    // Criteria score
    save_criteria_scorelist(list: unknown[]) {
      this.criteriaScoreList = list
    },

    // Ticker OHLCV
    set_ticker_ohlcv_pairdata({ ticker, data }: { ticker: string; data: unknown }) {
      if (!ticker) return
      this.tickerOhlcvPairdata[ticker] = data
    },

    // Frequency management
    set_freqency(val: string) {
      this.pairDataFreq = val
    },

    set_exit_frequency(val: string) {
      this.exitFrequency = val
    },

    set_restore_freq(val: string) {
      this.restoreFreq = val
    },

    // ── Favorites API ────────────────────────────────────────────────

    async get_favorite() {
      // Already loaded? Skip.
      if (this.favoriteSymbolList.length > 0 && this.favoriteIndicatorList.length > 0) return
      const res = await apiGetFavorite()
      try {
        const favSymbols = res.favorite_symbol ? JSON.parse(res.favorite_symbol) : []
        const favIndicators = res.favorite_indicator ? JSON.parse(res.favorite_indicator) : []
        this.favoriteSymbolList = favSymbols
        this.favoriteIndicatorList = favIndicators
      } catch (e) {
        console.error('[chartiq.store] Error parsing favorite data:', e)
      }
    },

    async update_favorite(obj: { indicator: string; symbol: string }) {
      this.favoriteIndicatorList = JSON.parse(obj.indicator)
      this.favoriteSymbolList = JSON.parse(obj.symbol)
      await apiUpdateFavorite(obj.indicator, obj.symbol)
    },

    // ── My Symbols API ───────────────────────────────────────────────

    async get_mysymbolist() {
      toggleOverlaySymbol('flex')
      try {
        const res = await apiGetAllMySymbolsList()
        this.mySymbolList = res
      } finally {
        toggleOverlaySymbol('none')
      }
    },

    // ── My Indicators API ────────────────────────────────────────────

    async get_myindicator() {
      toggleOverlaySelector('cq-indicators-lookup-filters .overlay', 'flex')
      try {
        const btvFavIndi = await apiGetBTV1FavIndicator()
        this.favoriteIndicatorListBtv1 = btvFavIndi
        const res = await apiGetAllMyIndicatorsList()
        this.myIndicatorList = res
      } finally {
        toggleOverlaySelector('cq-indicators-lookup-filters .overlay', 'none')
      }
    },

    async get_indicator_page_btv1_list() {
      if (this.indicatorPageBtv1List.length > 0) return
      const btv1List = await apiObtainBTV1IndicatorsList()
      this.indicatorPageBtv1List = btv1List
    },

    // ── OHLCV / Pair Data API ────────────────────────────────────────

    async get_ticker_ohlcv_pairdata(ticker: string) {
      if (this.tickerOhlcvPairdata[ticker]) {
        return this.tickerOhlcvPairdata[ticker]
      }
      const CIQ = window.CIQ as Record<string, unknown> | undefined
      const config = (CIQ?.config as Record<string, unknown> | undefined) || {}
      const initialDate = config.initialDate as Record<string, unknown> | undefined
      let start: string
      let end: string
      if (initialDate?.start && initialDate?.end) {
        const tsToTime = (config as Record<string, unknown>).timestampToTime as
          | ((ts: number) => string)
          | undefined
        start = tsToTime ? tsToTime(initialDate.start as number) : ''
        end = tsToTime ? tsToTime(initialDate.end as number) : ''
      } else {
        start = ''
        end = ''
      }
      const res = await apiGetPairData(start, end, this.pairDataFreq, ticker)
      const data = formatPairData(res)
      this.tickerOhlcvPairdata[ticker] = data
      return data
    },

    // ── Forecast API ─────────────────────────────────────────────────

    async get_forecast(symbol: string) {
      const existing = this.forecastList.find(
        (item: { symbol: string }) => item.symbol === symbol,
      )
      if (existing) return existing.list
      const res = await apiGetForecastList(this.forecastMarket)
      const list = res.data || res
      this.forecastList = [
        ...this.forecastList,
        { symbol, list },
      ]
      return list
    },

    async get_symbollist_forecast() {
      toggleOverlaySymbol('flex')
      try {
        const list = await apiGetSymbollistForecast()
        this.symbollistForecast = list
      } finally {
        toggleOverlaySymbol('none')
      }
    },

    /**
     * Reset chart study state — clears all studies from chart and resets form state.
     * This is called when navigating between backtest details.
     */
    reset_chart_study_state() {
      // Clear form indicators
      this.indicators = {
        formIndicators: {
          entry: new Array(5).fill(null),
          exit: new Array(5).fill(null),
          entry2: new Array(5).fill(null),
          exit2: new Array(5).fill(null),
        },
        extraIndicators: [],
      }

      this.activatedMA = [{ period: 21, url: '' }]
      this.activatedMALayout = []
      this.activatedTechLayout = []
      this.extremeValue = []
      this.trades = []

      this.set_chart_ready(false)
    },

    /**
     * Reset chart study state AND remove studies from chart engine.
     * Called by the reset_chart_study_state action when CIQ.stxx is available.
     */
    reset_chart_full_state() {
      // Remove non-permanent studies from chart engine
      // CIQ is accessed via window since it's a global ChartIQ namespace
      const CIQ = window.CIQ
      if (CIQ?.stxx) {
        for (const id in CIQ.stxx.layout.studies) {
          const sd = CIQ.stxx.layout.studies[id]
          if (!sd.customLegend && !sd.permanent) {
            CIQ.Studies.removeStudy(CIQ.stxx, sd)
          }
        }
      }

      this.reset_chart_study_state()
    },
  },
})

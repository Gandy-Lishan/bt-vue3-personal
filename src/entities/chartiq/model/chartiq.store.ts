// @ts-nocheck
/**
 * ChartIQ Pinia Store — 完全一致迁移自 Vue2 Vuex store (chart.js + states.js + form.js)
 *
 * 原则：所有 state 字段和 actions 与原版一一对应，不做任何重构。
 *
 * Vuex → Pinia 适配：
 *   - mutations → 直接 state 修改 (this.xxx = xxx)
 *   - actions → this.actions / this.state
 *   - process.env.VUE_APP_* → import.meta.env.VITE_*
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

// ── Helper functions ─────────────────────────────────────────────────

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

// 注：数据源DT传入的应该是formatStandardTime返回的时间对象而不是ISO字符串，
// 虽然两者兼容，但是后者对于国外时间会出现偏差一天的问题。
// 【Vue2→Vue3 兼容】照搬原版 utils/index.js formatStandardTime，返回 Date 对象
function formatStandardTime(dateInput: string | undefined | null): Date | null {
  if (!dateInput) return null

  let year: number, month: number, day: number

  if (typeof dateInput === 'string') {
    // ISO 格式 或 YYYY-MM-DD
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      year = Number(match[1])
      month = Number(match[2])
      day = Number(match[3])
      return new Date(year, month - 1, day) // 本地 00:00:00
    }
  }

  return null
}

function capitalizeFirstLetter(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Overlay toggles
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

// ── State interface ──────────────────────────────────────────────────

export interface ChartIQState {
  // ========== chart.js ==========
  chartType: 'line' | 'candle'
  isBTChartReady: boolean
  chartLoadingSetting: {
    isChartLoading: boolean
    showProgress: boolean
    percentage: number
    progressText: string
  }
  favoriteIndicatorList: unknown[]
  favoriteSymbolList: unknown[]
  techSD: unknown[]
  savedTechSD: unknown[]
  currentSenti: { url: string; name: string }
  indicators: {
    formIndicators: { entry: unknown[]; exit: unknown[]; entry2: unknown[]; exit2: unknown[] }
    extraIndicators: unknown[]
  }
  extremeValue: unknown[]
  indicatorsList: unknown[]
  builtinList: unknown[]
  maLikeTech: string[]
  formateTechnicalList: unknown[]
  trades: unknown[]
  ma_color_1: string[]
  ma_color_2: string[]
  activatedMA: Array<{ period: number; url: string }>
  activatedMALayout: unknown[]
  activatedTechLayout: unknown[]
  spanPeriod: Record<string, unknown>
  studySettingMA: { period: string; criteria: string; panelIndex: string }
  studySettingROC: { period: string; criteria: string; panelIndex: string }
  miFormShift: { display: boolean; showInput: boolean; value: number }
  miFormCategories: string
  miFormCategoriesIndicator1: { name: string; url: string }
  miFormCategoriesIndicator2: { name: string; url: string }
  miFormWeightedList: unknown[]
  miBenmark: string
  forecastList: unknown[]
  forecastAuthorList: unknown[]
  symbollistForecast: unknown[]
  forecastMarket: string
  indicatorsPageListdata: Record<string, string | null>
  indicatorPageBtv1List: unknown[]
  favoriteIndicatorListBtv1: unknown | null
  cssMonthLabel: string
  criteriaScoreList: unknown[]
  drawingObjList: unknown[]
  tickerOhlcvPairdata: Record<string, unknown>
  JumpToBTSymbol: string
  pairDataFreq: string
  exitFrequency: string
  restoreFreq: string
  stocksList: unknown[]
  indexsList: unknown[]
  originIndicatorList: unknown[]
  technicalCategory: unknown[]
  mySymbolList: unknown[]
  mySymbolQuotefeedCache: unknown[]
  myIndicatorList: unknown[]
  curDate: string

  // ========== states.js ==========
  errorMessage404: { status: number | null; message: string }
  scannerai_filter: Record<string, unknown>
  scannerai_flag: boolean
  isBacktestRunning_flag: boolean
  isRunAllSignalProcessing_flag: boolean
  isMarkerShown_flag: boolean
  isEditFinish_flag: boolean
  beforeCalculateNewConditions: boolean
  cacheReRunData: Record<string, unknown>
  isCreateLoading: boolean
  cpmResultsData: unknown
  symbolUploadDomActive: boolean
  reportArchives: Record<string, unknown>
  tradingSignalStrategies: unknown[]
  allNotifications: unknown

  // ========== form.js ==========
  backtestSymbol: string
  comparisonSymbol: Record<string, unknown>
  conditionRadio: {
    entry: unknown[]
    exit: unknown[]
    entry2: unknown[]
    exit2: unknown[]
  }
  stMaPeriod: string
  rowDataForDisplay: Record<string, unknown>
  cachedBTBasicInfoData: Record<string, unknown>
  cachedScopedRowDataImmutable: Record<string, unknown>
  isListLoading: boolean
  setUpLoadingSetting: {
    isSetupLoading: boolean
    showProgress: boolean
    percentage: number
    progressText: string
  }
  resultsLoadingSetting: {
    isResultsLoading: boolean
    showProgress: boolean
    percentage: number
    progressText: string
  }
  backtestZScoreResult: unknown[]
}

// ── Default state ────────────────────────────────────────────────────

function defaultState(): ChartIQState {
  return {
    // chart.js
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
    stocksList: stocksData,
    indexsList: indexsData,
    originIndicatorList: indicatorsData,
    technicalCategory: [],
    mySymbolList: [],
    mySymbolQuotefeedCache: [],
    myIndicatorList: [],
    curDate: '',

    // indicatorsList pre-computation (mirrors Vue2 fetch_indicatorsList result)
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

    // states.js
    errorMessage404: { status: null, message: '' },
    scannerai_filter: {},
    scannerai_flag: false,
    isBacktestRunning_flag: false,
    isRunAllSignalProcessing_flag: false,
    isMarkerShown_flag: false,
    isEditFinish_flag: false,
    beforeCalculateNewConditions: false,
    cacheReRunData: {},
    isCreateLoading: false,
    cpmResultsData: null,
    symbolUploadDomActive: false,
    reportArchives: {},
    tradingSignalStrategies: [],
    allNotifications: null,

    // form.js
    backtestSymbol: VITE_DEFAULT_SYMBOL,
    comparisonSymbol: {},
    conditionRadio: {
      entry: new Array(5).fill(''),
      exit: new Array(5).fill(''),
      entry2: new Array(5).fill(''),
      exit2: new Array(5).fill(''),
    },
    stMaPeriod: '',
    rowDataForDisplay: {},
    cachedBTBasicInfoData: {},
    cachedScopedRowDataImmutable: {},
    isListLoading: false,
    setUpLoadingSetting: {
      isSetupLoading: false,
      showProgress: false,
      percentage: 0,
      progressText: 'Loading...',
    },
    resultsLoadingSetting: {
      isResultsLoading: false,
      showProgress: false,
      percentage: 0,
      progressText: 'Loading...',
    },
    backtestZScoreResult: [],
  }
}

// ── Pinia store ──────────────────────────────────────────────────────

export const useChartIQStore = defineStore('chartIQ', {
  state: (): ChartIQState => defaultState(),

  actions: {
    // ═══════════════════════════════════════════════════════════════
    // chart.js actions (已存在)
    // ═══════════════════════════════════════════════════════════════

    set_chart_type(val: 'line' | 'candle') { this.chartType = val },
    set_chart_ready(ready: boolean) { this.isBTChartReady = ready },
    set_chart_loading(obj: { isChartLoading?: boolean; showProgress?: boolean; percentage?: number; progressText?: string }) {
      this.chartLoadingSetting = {
        isChartLoading: obj.isChartLoading ?? this.chartLoadingSetting.isChartLoading,
        showProgress: obj.showProgress ?? this.chartLoadingSetting.showProgress,
        percentage: obj.percentage ?? this.chartLoadingSetting.percentage,
        progressText: obj.progressText ?? this.chartLoadingSetting.progressText,
      }
    },
    set_span_period(val: Record<string, unknown>) { this.spanPeriod = val },
    set_jump_to_bt_symbol(index: string) { this.JumpToBTSymbol = index },
    set_favorite_indicator_list(val: unknown[]) { this.favoriteIndicatorList = val },
    set_favorite_symbol_list(val: unknown[]) { this.favoriteSymbolList = val },
    set_tech_sd(val: unknown[]) { this.techSD = val },
    set_saved_tech_sd(val: unknown[]) { this.savedTechSD = val },
    set_current_senti(val: { url: string; name: string }) { this.currentSenti = val },
    set_extreme_value(list: unknown[]) { this.extremeValue = list },
    set_indicators_list(data: unknown[]) { this.indicatorsList = data },
    set_builtin_list(data: unknown[]) { this.builtinList = data },
    set_tech_category(data: unknown[]) { this.technicalCategory = data },
    set_format_tech_list(list: unknown[]) { this.formateTechnicalList = list },
    /**
     * 【照搬旧版 chart/initiate_tech_list】由 config.technicalClassCategory 生成
     * builtinList / formateTechnicalList / technicalCategory。
     * findBuiltinTechIndicator 依赖 builtinList 区分 technical study 与 sentiment
     * indicator —— 未初始化时，studies 列表里选中的技术指标会被误判成 sentiment，
     * 去请求 indicators_metadata 并报 400。
     */
    initiate_tech_list(list: Array<{ class?: string; studies?: Array<{ name: string; url: string }> }>) {
      const buildinTechList: Array<{ class?: string; value: string; url: string }> = []
      for (let i = 0; i < list.length; i++) {
        list[i].studies?.forEach((item) => {
          buildinTechList.push({
            class: list[i].class,
            value: item.name,
            url: item.url,
          })
        })
      }
      const formatList = buildinTechList
        .filter((item) =>
          item.class !== 'No_display_technical_indicator' &&
          item.class !== 'Not_in_backtest_technical_indicator_but_visible_in_chatiq')
        .sort((a, b) => a.value.localeCompare(b.value))
      this.set_tech_category(list)
      this.set_builtin_list(buildinTechList)
      this.set_format_tech_list(formatList)
    },
    set_activated_ma(val: Array<{ period: number; url: string }>) { this.activatedMA = val },
    set_ma_layout(val: unknown[]) { this.activatedMALayout = val },
    set_tech_layout(val: unknown[]) { this.activatedTechLayout = val },
    set_trades(data: unknown[]) { this.trades = data },
    set_entry_data(obj: Record<string, unknown>) {
      const { index, value, criteria } = obj
      if (criteria && index !== undefined && this.indicators.formIndicators[criteria]) {
        this.indicators.formIndicators[criteria][index] = value
      }
    },
    set_criteria_indicators_list(obj: { criteria: string; list: unknown[] }) {
      if (this.indicators.formIndicators[obj.criteria]) {
        this.indicators.formIndicators[obj.criteria] = obj.list
      }
    },
    set_extra_indicators(val: unknown[]) { this.indicators.extraIndicators = val },
    set_study_setting_ma(obj: { period: string; criteria: string; panelIndex: string }) { this.studySettingMA = obj },
    set_study_setting_roc(obj: { period: string; criteria: string; panelIndex: string }) { this.studySettingROC = obj },
    set_mi_form_shift(val: { display: boolean; showInput: boolean; value: number }) { this.miFormShift = val },
    set_mi_form_state(obj: { categories: string; indicator_1: string; indicator_1_url: string; indicator_2: string; indicator_2_url: string }) {
      this.miFormCategories = obj.categories
      this.miFormCategoriesIndicator1 = { name: obj.indicator_1, url: obj.indicator_1_url }
      this.miFormCategoriesIndicator2 = { name: obj.indicator_2, url: obj.indicator_2_url }
    },
    set_mi_weighted_list(val: unknown[]) { this.miFormWeightedList = val },
    set_mi_benchmark(val: string) { this.miBenmark = val },
    set_forecast_market(val: string) { this.forecastMarket = val },
    set_forecast(list: unknown[]) { this.forecastList = list },
    set_forecast_author_list(list: unknown[]) { this.forecastAuthorList = list },
    set_symbollist_forecast(list: unknown[]) { this.symbollistForecast = list },
    set_indicator_page_btv1_list(res: { data?: { data?: unknown[] } } | unknown[]) {
      this.indicatorPageBtv1List = (res as { data?: { data?: unknown[] } })?.data?.data ?? (res as unknown[]) ?? []
    },
    set_favorite_indicator_list_btv1(obj: unknown) { this.favoriteIndicatorListBtv1 = obj },
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
      this.indicatorsPageListdata[url] = !data ? null : JSON.stringify(removeDuplicates(data as Array<Record<string, unknown>>))
    },
    set_css_month_label(val: string) { this.cssMonthLabel = val },
    set_drawing_objlist(list: unknown[]) { this.drawingObjList = list },
    save_criteria_scorelist(list: unknown[]) { this.criteriaScoreList = list },
    set_ticker_ohlcv_pairdata({ ticker, data }: { ticker: string; data: unknown }) {
      if (!ticker) return
      this.tickerOhlcvPairdata[ticker] = data
    },
    set_freqency(val: string) { this.pairDataFreq = val },
    set_exit_frequency(val: string) { this.exitFrequency = val },
    set_restore_freq(val: string) { this.restoreFreq = val },

    // ═══════════════════════════════════════════════════════════════
    // states.js actions — 照搬原版 Vuex states.js
    // ═══════════════════════════════════════════════════════════════

    setNotifications(notifications: unknown) { this.allNotifications = notifications },
    detect_symbol_upload_dom() {
      const node = document.querySelector('.symbol-upload')
      this.symbolUploadDomActive = Boolean(node)
    },
    set_scannerai_filter_state(obj: Record<string, unknown>) { this.scannerai_filter = obj },
    set_scannerai_flag(val: boolean) { this.scannerai_flag = val },
    setBacktestRunning_flag(val: boolean) { this.isBacktestRunning_flag = val },
    setRunAllSignalProcessing_flag(val: boolean) { this.isRunAllSignalProcessing_flag = val },
    setEditFinish_flag(val: boolean) { this.isEditFinish_flag = val },
    envoke_before_calculate_newConditions(val: boolean) { this.beforeCalculateNewConditions = val },
    setErrorMessage404(obj: { status: number | null; message: string }) { this.errorMessage404 = obj },
    cacheReRunData(obj: Record<string, unknown>) { this.cacheReRunData = obj },
    setCreateLoading(loading: boolean) { this.isCreateLoading = loading },
    setCpmResultsData(data: unknown) {
      this.cpmResultsData = data
      try { sessionStorage.setItem('cpmResultsData', JSON.stringify(data)) } catch {}
    },
    setReportArchives(data: { service_type: string; archives: unknown }) {
      this.reportArchives[data.service_type] = JSON.stringify(data.archives) as unknown as Record<string, unknown>
    },
    setTradingSignalStrategy(data: unknown[]) { this.tradingSignalStrategies = data },

    // 【照搬原版】set_isMarkerShown_flag — 原版 Vuex states.js action
    set_isMarkerShown_flag(val: boolean) {
      if (typeof CIQ === 'undefined' || !CIQ.stxx) return
      if (!val) {
        this.trades = []
        if (typeof CIQ.hideMarker === 'function') CIQ.hideMarker()
      } else {
        if (typeof CIQ.addPrompt === 'function') CIQ.addPrompt()
      }
    },

    // ═══════════════════════════════════════════════════════════════
    // form.js actions — 照搬原版 Vuex form.js
    // ═══════════════════════════════════════════════════════════════

    setComparisonSymbol(val: Record<string, unknown>) {
      this.comparisonSymbol = val
      this.rowDataForDisplay.symbol2 = val.url
      this.cachedBTBasicInfoData.symbol2 = val.url
    },
    setRestoreFreq(val: string) { this.restoreFreq = val },
    getBacktestSymbol(val: string) {
      this.backtestSymbol = val
      this.rowDataForDisplay.symbol = val
      this.cachedBTBasicInfoData.symbol = val
    },

    /**
     * 【照搬原版】RESET_CHART_CONDIG_STATE
     * 还原默认 timeframe 和 symbol 配置
     */
    reset_chart_config_state() {
      this.pairDataFreq = ''
      this.backtestSymbol = VITE_DEFAULT_SYMBOL
      this.exitFrequency = ''
      this.comparisonSymbol = {}
    },

    /**
     * 【照搬原版】CLEAR_CHART_CONDIG_STATE
     * CLEAR CHART
     */
    clear_chart_config_state() {
      this.pairDataFreq = ''
      this.backtestSymbol = VITE_DEFAULT_SYMBOL
      this.exitFrequency = ''
    },

    setConditionRadio(val: Record<string, unknown[]>) { this.conditionRadio = val },
    getStMaPeriod(val: string) { this.stMaPeriod = val },
    getFrequency(val: string) {
      if (val === undefined || val === null || val === '') {
        this.exitFrequency = ''
        return
      }
      this.exitFrequency = val
    },
    getFreqHighPriority(val: string) {
      this.exitFrequency = val
    },
    setConditionRadio(val: Record<string, unknown[]>) { this.conditionRadio = val },
    setListLoading(loading: boolean) { this.isListLoading = loading },
    setSetupLoading(obj: { isSetupLoading?: boolean; showProgress?: boolean; percentage?: number; progressText?: string }) {
      this.setUpLoadingSetting = {
        isSetupLoading: obj.isSetupLoading ?? this.setUpLoadingSetting.isSetupLoading,
        showProgress: obj.showProgress ?? this.setUpLoadingSetting.showProgress,
        percentage: obj.percentage ?? this.setUpLoadingSetting.percentage,
        progressText: obj.progressText ?? this.setUpLoadingSetting.progressText,
      }
    },
    setResultsLoading(obj: { isResultsLoading?: boolean; showProgress?: boolean; percentage?: number; progressText?: string }) {
      this.resultsLoadingSetting = {
        isResultsLoading: obj.isResultsLoading ?? this.resultsLoadingSetting.isResultsLoading,
        showProgress: obj.showProgress ?? this.resultsLoadingSetting.showProgress,
        percentage: obj.percentage ?? this.resultsLoadingSetting.percentage,
        progressText: obj.progressText ?? this.resultsLoadingSetting.progressText,
      }
    },
    setBacktestZScoreResult(val: unknown[]) { this.backtestZScoreResult = val },
    setCachedBTBasicInfoData(obj: Record<string, unknown>) { this.cachedBTBasicInfoData = obj },
    setCachedScopedRowDataImmutable(obj: Record<string, unknown>) { this.cachedScopedRowDataImmutable = obj },
    setCachedScopedRowImmutableProps(obj: { key: string; value: unknown }) {
      this.cachedScopedRowDataImmutable[obj.key] = obj.value
    },
    setBacktestInfoProps(obj: { key: string; value: unknown }) {
      // Note: backtestInfo is a form.js concept; if needed, add separate state
    },
    deleteBacktestInfoProps(obj: { key: string }) {
      // Note: backtestInfo deletion
    },

    // 【照搬原版】set_miFormWeightedListChange — 调用 CIQ.displayWeightOwnIndicator
    set_miFormWeightedListChange(val: any) {
      const CIQ = window.CIQ
      const newVal = JSON.parse(JSON.stringify(val.data))
      const oldVal = JSON.parse(JSON.stringify(this.miFormWeightedList))
      if (typeof CIQ?.displayWeightOwnIndicator === 'function') {
        CIQ.displayWeightOwnIndicator(oldVal, newVal, val.url)
      }
      this.miFormWeightedList = newVal
    },

    // 【照搬原版】set_miFormSOHLCVChange — 调用 CIQ.changeUserOwnIndicatorSymbol
    set_miFormSOHLCVChange(val: any) {
      const CIQ = window.CIQ
      if (typeof CIQ?.changeUserOwnIndicatorSymbol === 'function') {
        CIQ.changeUserOwnIndicatorSymbol(val.data)
      }
    },

    // 【照搬原版】set_miFormStateChange — 调用 CIQ.updateUserOwnIndicator
    async set_miFormStateChange(obj: {
      categories: string
      indicator_1: string
      indicator_1_url: string
      indicator_2: string
      indicator_2_url: string
    }) {
      const CIQ = window.CIQ
      const newVal = {
        categories: obj.categories,
        indicator1: { name: obj.indicator_1, url: obj.indicator_1_url },
        indicator2: { name: obj.indicator_2, url: obj.indicator_2_url },
      }
      const oldVal = {
        categories: this.miFormCategories,
        indicator1: this.miFormCategoriesIndicator1,
        indicator2: this.miFormCategoriesIndicator2,
      }
      if (typeof CIQ?.updateUserOwnIndicator === 'function') {
        await CIQ.updateUserOwnIndicator(newVal, oldVal)
      }
      this.miFormCategories = obj.categories
      this.miFormCategoriesIndicator1 = { name: obj.indicator_1, url: obj.indicator_1_url }
      this.miFormCategoriesIndicator2 = { name: obj.indicator_2, url: obj.indicator_2_url }
    },

    // 【照搬原版】set_miFormStateRefresh — 清除 studies + CIQ.updateUserOwnIndicator
    async set_miFormStateRefresh() {
      const CIQ = window.CIQ
      const newVal = {
        categories: this.miFormCategories,
        indicator1: this.miFormCategoriesIndicator1,
        indicator2: this.miFormCategoriesIndicator2,
      }
      const oldVal = {
        categories: this.miFormCategories,
        indicator1: { name: '', url: '' },
        indicator2: { name: '', url: '' },
      }
      // 刷新前清空已有 study，只是刷新 study 以更新 timeframe 所以不 commit 更改状态
      if (CIQ?.stxx) {
        for (const id in CIQ.stxx.layout.studies) {
          CIQ.Studies.removeStudy(CIQ.stxx, CIQ.stxx.layout.studies[id])
        }
      }
      if (typeof CIQ?.updateUserOwnIndicator === 'function') {
        await CIQ.updateUserOwnIndicator(newVal, oldVal)
      }
    },

    // 【照搬原版】set_miFormWeightedListRefresh — 清除 studies + CIQ.displayWeightOwnIndicator
    set_miFormWeightedListRefresh(val?: any) {
      const CIQ = window.CIQ
      const newVal = JSON.parse(JSON.stringify(val ? val.data : this.miFormWeightedList))
      const oldVal: unknown[] = []
      // 刷新前清空已有 study，只是刷新 study 以更新 timeframe 所以不 commit 更改状态
      if (CIQ?.stxx) {
        for (const id in CIQ.stxx.layout.studies) {
          CIQ.Studies.removeStudy(CIQ.stxx, CIQ.stxx.layout.studies[id])
        }
      }
      if (typeof CIQ?.displayWeightOwnIndicator === 'function') {
        CIQ.displayWeightOwnIndicator(oldVal, newVal, val ? val.url : null)
      }
    },

    // 【照搬原版】reset_miFormState — 重置 My Indicator form 到默认值
    reset_miFormState() {
      this.miFormCategories = 'Indicator Spread'
      this.miFormCategoriesIndicator1 = { name: '', url: '' }
      this.miFormCategoriesIndicator2 = { name: '', url: '' }
      this.miFormWeightedList = []
      this.miFormShift = { display: false, showInput: false, value: 0 }
    },

    // ═══════════════════════════════════════════════════════════════
    // API actions (已存在)
    // ═══════════════════════════════════════════════════════════════

    async get_favorite() {
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

    async get_mysymbolist() {
      toggleOverlaySymbol('flex')
      try {
        const res = await apiGetAllMySymbolsList()
        this.mySymbolList = res
      } finally {
        toggleOverlaySymbol('none')
      }
    },

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

    async get_ticker_ohlcv_pairdata(ticker: string) {
      if (this.tickerOhlcvPairdata[ticker]) return this.tickerOhlcvPairdata[ticker]
      const CIQ = window.CIQ as Record<string, unknown> | undefined
      const config = (CIQ?.config as Record<string, unknown> | undefined) || {}
      const initialDate = config.initialDate as Record<string, unknown> | undefined
      let start = ''
      let end = ''
      if (initialDate?.start && initialDate?.end) {
        const tsToTime = (config as Record<string, unknown>).timestampToTime as ((ts: number) => string) | undefined
        start = tsToTime ? tsToTime(initialDate.start as number) : ''
        end = tsToTime ? tsToTime(initialDate.end as number) : ''
      }
      const res = await apiGetPairData(start, end, this.pairDataFreq, ticker)
      // 【照搬原版】旧版读 res.data（service 返回完整 axios response）
      const data = formatPairData(res?.data)
      this.tickerOhlcvPairdata[ticker] = data
      return data
    },

    async get_forecast(symbol: string) {
      const existing = this.forecastList.find((item: { symbol: string }) => item.symbol === symbol)
      if (existing) return existing.list
      const res = await apiGetForecastList(this.forecastMarket)
      const list = res.data || res
      this.forecastList = [...this.forecastList, { symbol, list }]
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
     * 【照搬原版】reset_chart_full_state
     * 从 chart engine 移除 studies + 重置 state
     */
    reset_chart_full_state() {
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

    /**
     * Reset chart study state — clears all studies and resets form state.
     */
    reset_chart_study_state() {
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

    // 【Vue2→Vue3 兼容】缺失的 actions — st-development JS 需要调用
    get_forecast_author_list(authors: string[]) {
      this.forecastAuthorList = authors
    },

    async get_mysymbolCSV(_obj: { url: string; timeframe: string }) {
      // TODO: implement when API endpoint is available
      return null
    },

    getColorByCriteriaAndIndex(criteria: string, panelIndex: number) {
      const c1 = this.ma_color_1 || []
      const c2 = this.ma_color_2 || []
      // 【照搬原版 getter】保留旧 bug：ma_color_1 也用 ma_color_2.length 取模
      return criteria && criteria.endsWith('2')
        ? c2[panelIndex % c2.length]
        : c1[panelIndex % c2.length]
    },

    set_mi_create_loading(val: boolean) {
      this.isCreateLoading = val
    },
  },
})

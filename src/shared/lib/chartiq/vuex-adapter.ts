/**
 * Vuex -> Pinia compatibility adapter for ChartIQ web components.
 *
 * ChartIQ's copied JS files expect CIQ.store to be a Vuex store with
 * .watch(), .commit(), .dispatch(), and .getters. This adapter wraps a Pinia
 * store and provides those methods, mapping namespaced calls to the single
 * Pinia chartIQ store.
 */

import type { Store } from 'pinia'

type VuexGetter = (state: Record<string, unknown>, getters: Record<string, unknown>) => unknown

export interface VuexCompatibleStore {
  state: Record<string, unknown>
  getters: Record<string, unknown>
  watch(getter: VuexGetter, cb: (value: unknown, previous?: unknown) => void): () => void
  commit(mutation: string, payload?: unknown): void
  dispatch(action: string, payload?: unknown): Promise<unknown>
}

/**
 * Build a flat map of state getters for Vuex-style namespace access.
 * e.g. state.chart.favoriteSymbolList becomes getters['chart/favoriteSymbolList']
 */
function buildGetters(state: Record<string, unknown>): Record<string, unknown> {
  const getters: Record<string, unknown> = {}

  function walk(prefix: string, value: unknown) {
    if (Array.isArray(value) || value === null || typeof value !== 'object') {
      getters[prefix] = value
      return
    }
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const newPrefix = prefix ? `${prefix}/${key}` : key
      walk(newPrefix, (value as Record<string, unknown>)[key])
    }
  }

  walk('chart', state)
  return getters
}

/**
 * Convert a Vuex namespaced path like "chart/set_favorite_symbol_list"
 * or "form/setRestoreFreq" into a Pinia action name.
 */
function pathToActionName(path: string): string | null {
  const parts = path.split('/')
  const action = parts[parts.length - 1]
  return action || null
}

/**
 * Map of Vuex camelCase action/mutation names → Pinia snake_case action names.
 * Includes acronym handling (e.g. setSavedTechSD → set_saved_tech_sd).
 */
const VUEX_TO_PINIA_ACTION_MAP: Record<string, string> = {
  setSavedTechSD: 'set_saved_tech_sd',
  setCurrentSenti: 'set_current_senti',
  getExtraIndicators: 'set_extra_indicators',
  getTechLayout: 'set_tech_layout',
  getMALayout: 'set_ma_layout',
  getMA: 'set_activated_ma',
  getIndicators: 'set_criteria_indicators_list',
  studySettingMAChange: 'set_study_setting_ma',
  studySettingROCChange: 'set_study_setting_roc',
  reset_chart_study_state: 'reset_chart_study_state',
  reset_chart_full_state: 'reset_chart_full_state',
  set_isMarkerShown_flag: 'set_is_marker_shown_flag',
  envokeBeforeCalculateNewConditions: 'envoke_before_calculate_new_conditions',
}

/**
 * Convert a Vuex-style action/mutation name to the snake_case Pinia action name.
 */
function toSnakeCaseAction(name: string): string {
  if (VUEX_TO_PINIA_ACTION_MAP[name]) return VUEX_TO_PINIA_ACTION_MAP[name]

  return name
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
}

export function createVuexAdapter(
  piniaStore: Store<string, Record<string, unknown>, Record<string, never>, Record<string, never>>,
): VuexCompatibleStore {
  const chartState = piniaStore.$state as Record<string, unknown>
  // Vuex namespacing: ChartIQ files access state.chart.* and getters['chart/...']
  const state: Record<string, unknown> = { chart: chartState }
  const getters = buildGetters(chartState)

  // form namespace stub — ChartIQ files commit to form/* for frequency/symbol state
  const formState: Record<string, unknown> = {
    backtestSymbol: '',
    frequency: 'daily',
    pairDataFreq: 'daily',
    exitFrequency: '',
    restoreFreq: '',
    comparisonSymbol: null,
  }
  state.form = formState

  // states namespace stub — ChartIQ dispatches states/set_isMarkerShown_flag
  const statesState: Record<string, unknown> = {
    isMarkerShown: false,
    scannerai_flag: false,
    miCreateLoading: false,
    beforeCalculateNewConditions: false,
  }
  state.states = statesState

  function setFormField(field: string, value: unknown) {
    formState[field] = value
  }

  const adapter: Record<string, unknown> = {
    state,
    getters,

    watch(getterFn, cb) {
      let previous = getterFn(state, getters)
      return piniaStore.$subscribe(
        () => {
          const next = getterFn(state, getters)
          if (next !== previous) {
            cb(next, previous)
            previous = next
          }
        },
        { detached: true },
      )
    },

    commit(mutation: string, payload?: unknown) {
      const parts = mutation.split('/')
      const namespace = parts.length > 1 ? parts[0] : ''
      const actionName = pathToActionName(mutation)
      if (!actionName) return
      const snakeAction = toSnakeCaseAction(actionName)

      // Handle form/* commits by writing directly to the form stub state
      if (namespace === 'form') {
        const fieldMap: Record<string, string> = {
          get_backtest_symbol: 'backtestSymbol',
          get_frequency: 'pairDataFreq',
          set_freqency: 'pairDataFreq',
          set_exit_frequency: 'exitFrequency',
          set_restore_freq: 'restoreFreq',
          set_comparison_symbol: 'comparisonSymbol',
        }
        const field = fieldMap[snakeAction]
        if (field) {
          setFormField(field, payload)
          return
        }
      }

      // Handle states/* commits by writing to the states stub
      if (namespace === 'states') {
        const statesFieldMap: Record<string, string> = {
          set_scannerai_flag: 'scannerai_flag',
          set_mi_create_loading: 'miCreateLoading',
          set_before_calculate_new_conditions: 'beforeCalculateNewConditions',
        }
        const sField = statesFieldMap[snakeAction]
        if (sField) {
          ;(statesState as Record<string, unknown>)[sField] = payload
          return
        }
      }

      // Try Pinia action (adapter exposes them below)
      if (typeof adapter[snakeAction] === 'function') {
        ;(adapter[snakeAction] as (p?: unknown) => void)(payload)
        return
      }

      if (typeof (piniaStore as Record<string, unknown>)[snakeAction] === 'function') {
        ;(piniaStore as Record<string, unknown>)[snakeAction](payload)
        return
      }

      // Fallback: try to set state directly for simple setters
      const leaf = parts[parts.length - 1]
      const mappedLeaf = leaf
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '')

      if (mappedLeaf in state) {
        state[mappedLeaf] = payload
        return
      }

      console.warn('[VuexAdapter] commit not mapped:', mutation, payload)
    },

    dispatch(action: string, payload?: unknown) {
      const parts = action.split('/')
      const namespace = parts.length > 1 ? parts[0] : ''
      const actionName = pathToActionName(action)
      if (!actionName) return Promise.resolve()
      const snakeAction = toSnakeCaseAction(actionName)

      // form/clear_chart_config_state — reset form stub state
      if (action === 'form/clear_chart_config_state') {
        formState.backtestSymbol = ''
        formState.frequency = 'daily'
        formState.restoreFreq = ''
        formState.comparisonSymbol = null
        return Promise.resolve()
      }

      // states/* dispatches — UI state stub
      if (namespace === 'states') {
        if (snakeAction === 'set_is_marker_shown_flag') {
          statesState.isMarkerShown = Boolean(payload)
          return Promise.resolve()
        }
        if (snakeAction === 'set_scannerai_flag') {
          statesState.scannerai_flag = Boolean(payload)
          return Promise.resolve()
        }
        if (snakeAction === 'envoke_before_calculate_new_conditions') {
          statesState.beforeCalculateNewConditions = Boolean(payload)
          return Promise.resolve()
        }
      }

      // chart/get_favorite — delegated to Pinia store action.
      // Pinia action calls the real API and populates favoriteSymbolList/favoriteIndicatorList.

      // chart/update_favorite — delegated to Pinia store action.
      // Pinia action calls the real API to persist favorites.

      // chart/get_mysymbolist — delegated to Pinia store action.
      // Pinia action calls getAllMySymbolsList API.

      // chart/get_ticker_ohlcv_pairdata — delegated to Pinia store action.
      // Pinia action calls getPairData API and caches results.

      if (typeof adapter[snakeAction] === 'function') {
        const result = (adapter[snakeAction] as (p?: unknown) => unknown)(payload)
        return Promise.resolve(result)
      }

      if (typeof (piniaStore as Record<string, unknown>)[snakeAction] === 'function') {
        const result = (piniaStore as Record<string, unknown>)[snakeAction](payload)
        return Promise.resolve(result)
      }

      console.warn('[VuexAdapter] dispatch not mapped:', action, payload)
      return Promise.resolve()
    },
  }

  // Expose chart-type getter for quote feeds and legacy components.
  // STStockDataFeed calls store.getChartType / store.getters.getChartType.
  const getChartType = () =>
    ((state.chart as Record<string, unknown>).chartType as string) || 'line'
  Object.defineProperty(adapter, 'getChartType', {
    get: getChartType,
    enumerable: true,
    configurable: true,
  })
  Object.defineProperty(getters, 'getChartType', {
    get: getChartType,
    enumerable: true,
    configurable: true,
  })
  Object.defineProperty(getters, 'chart/getChartType', {
    get: getChartType,
    enumerable: true,
    configurable: true,
  })

  // Expose comparison symbol getter with safe default.
  // loadIndicator.js/addComparison destructures {url,name} from the getter result.
  const getComparisonSymbol = () =>
    (state.form as Record<string, unknown>).comparisonSymbol || { url: null, name: null }
  Object.defineProperty(adapter, 'getComparisonSymbol', {
    get: getComparisonSymbol,
    enumerable: true,
    configurable: true,
  })
  Object.defineProperty(getters, 'getComparisonSymbol', {
    get: getComparisonSymbol,
    enumerable: true,
    configurable: true,
  })
  Object.defineProperty(getters, 'chart/getComparisonSymbol', {
    get: getComparisonSymbol,
    enumerable: true,
    configurable: true,
  })

  // Expose favorite-list getters used by favSymbolBtn.js and lookup.js.
  const getFavoriteSymbolList = () => (chartState.favoriteSymbolList as unknown[]) || []
  const getFavoriteIndicatorList = () => (chartState.favoriteIndicatorList as unknown[]) || []
  for (const [name, fn] of [
    ['getFavoriteSymbolList', getFavoriteSymbolList],
    ['getFavoriteIndicatorList', getFavoriteIndicatorList],
  ] as const) {
    Object.defineProperty(adapter, name, { get: fn, enumerable: true, configurable: true })
    Object.defineProperty(getters, name, { get: fn, enumerable: true, configurable: true })
    Object.defineProperty(getters, `chart/${name}`, { get: fn, enumerable: true, configurable: true })
  }

  // Expose state-to-getter aliases used by st-development files.
  // buildGetters auto-generates chart/<stateKey> paths, but st-development files
  // also call store.getters.getStockList (not store.getters['chart/stocksList']).
  // These aliases bridge that naming gap.
  const stateToGetterAliases: Array<[string, string]> = [
    ['getStockList', 'stocksList'],
    ['getIndexList', 'indexsList'],
    ['getMySymbollist', 'mySymbolList'],
    ['getMyIndicatorList', 'myIndicatorList'],
    ['getOriginIndicatorList', 'originIndicatorList'],
    ['getTechnicalCategory', 'technicalCategory'],
    ['getBuiltinList', 'builtinList'],
    ['getIndicatorsList', 'indicatorsList'],
    ['getMaLikeTech', 'maLikeTech'],
    ['getSpanPeriod', 'spanPeriod'],
    ['getSymbollistForecast', 'symbollistForecast'],
    ['getTickerOhlcvPairdata', 'tickerOhlcvPairdata'],
    ['getCriteriaScoreList', 'criteriaScoreList'],
    ['getDrawingObjList', 'drawingObjList'],
    ['getMiFormShift', 'miFormShift'],
    ['getFavoriteIndicatorListBtv', 'favoriteIndicatorListBtv1'],
  ]

  for (const [aliasName, stateKey] of stateToGetterAliases) {
    const fn = () => (chartState as Record<string, unknown>)[stateKey] ?? []
    Object.defineProperty(getters, aliasName, { get: fn, enumerable: true, configurable: true })
    Object.defineProperty(getters, `chart/${aliasName}`, { get: fn, enumerable: true, configurable: true })
  }

  // Cross-namespace getter: beforeCalculateNewConditions lives in states, not chart.
  const getBeforeCalculateNewConditions = () => statesState.beforeCalculateNewConditions
  Object.defineProperty(getters, 'getBeforeCalculateNewConditions', {
    get: getBeforeCalculateNewConditions,
    enumerable: true,
    configurable: true,
  })
  Object.defineProperty(getters, 'chart/getBeforeCalculateNewConditions', {
    get: getBeforeCalculateNewConditions,
    enumerable: true,
    configurable: true,
  })

  // Cross-namespace getter: scannerAIFlagState lives in states, not chart.
  const getScannerAIFlagState = () => statesState.scannerai_flag
  Object.defineProperty(getters, 'getScannerAIFlagState', {
    get: getScannerAIFlagState,
    enumerable: true,
    configurable: true,
  })
  Object.defineProperty(getters, 'chart/getScannerAIFlagState', {
    get: getScannerAIFlagState,
    enumerable: true,
    configurable: true,
  })

  // Computed getter: getColorByCriteriaAndIndex(criteria, panelIndex)
  // Used by loadIndicator.js to resolve MA line colors.
  // Vue2: returns ma_color_2[panelIndex % len] for 'roc', ma_color_1 otherwise.
  const getColorByCriteriaAndIndex = (criteria: string, panelIndex: number) => {
    const c1 = (chartState.ma_color_1 as string[]) || []
    const c2 = (chartState.ma_color_2 as string[]) || []
    return criteria === 'roc'
      ? c2[panelIndex % c2.length]
      : c1[panelIndex % c1.length]
  }
  Object.defineProperty(getters, 'getColorByCriteriaAndIndex', {
    value: getColorByCriteriaAndIndex,
    enumerable: true,
    configurable: true,
  })

  // Expose all Pinia actions as direct methods on the adapter object.
  // ChartIQ code like mask.js calls store.set_chart_loading() directly
  // instead of going through commit/dispatch.
  for (const key of Object.keys(piniaStore)) {
    if (typeof (piniaStore as Record<string, unknown>)[key] === 'function' && !adapter[key]) {
      adapter[key] = (piniaStore as Record<string, unknown>)[key]
    }
  }

  return adapter as VuexCompatibleStore
}

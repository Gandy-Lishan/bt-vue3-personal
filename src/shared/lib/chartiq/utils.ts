/**
 * ChartIQ-compatible utility functions
 *
 * 【Vue2→Vue3 兼容】从原版 Vue2 项目迁移而来：
 *   - encodeBase64 来自 @/utils/index.js
 *   - createStateFilter, getSymbolInfo 来自 @/utils/globalFunc/index.js
 *   - SignalCode 类来自 @/utils/cryptoUtils/codeTool.js
 *
 * 这些函数被 ChartIQ 原版 webcomponents 所调用。保持在 chartiq 模块内，避免污染主应用。
 */

// @ts-expect-error CIQ from ChartIQ library
import { CIQ } from './st-development/js/components'

export { formatStandardTime, timestampToTime } from '../../utils/time'

/**
 * Debug helper preserved from the original Vue2 project.
 */
export function printConsole(...args: unknown[]): void {
  console.log('[ChartIQ]', ...args)
}

export function encodeBase64(str: string): string {
  return btoa(encodeURIComponent(str))
}

export function decodeBase64(str: string): string {
  return decodeURIComponent(atob(str))
}

/**
 * Safely retrieve a nested property from an object using a dot-path string.
 * If the path cannot be resolved, returns undefined.
 */
export function getPropertyByString(obj: any, path: string, subField?: string): any {
  if (!obj || !path) return undefined
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current == null) return undefined
    current = current[part]
  }
  if (current && subField) {
    current = current[subField]
  }
  return current
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalizeFirstLetter(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Deduplicate an array of objects by their JSON-stringified values.
 */
export function uniqueObjectArray<T extends Record<string, unknown>>(arr: T[]): T[] {
  const seen = new Set<string>()
  return arr.filter((item) => {
    const key = JSON.stringify(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function getSymbolInfo(url: string): { name: string; url: string; type: string; symbol?: string } {
  const store = (CIQ as any).store
  const stockList = store?.getters?.getStockList ?? store?.state?.chart?.stocksList ?? []
  const indexList = store?.getters?.getIndexList ?? store?.state?.chart?.indexsList ?? []

  const stockName = stockList.find((x: { stock: string }) => x.stock === url)
  const indexName = indexList.find((x: { symbol: string }) => x.symbol === url)

  if (stockName) {
    return { name: stockName.name, url, type: 'stock' }
  } else if (indexName) {
    return { name: indexName.name, url, type: 'index' }
  }

  // Custom symbol case
  try {
    const parts = url.split('||')
    return {
      name: decodeBase64(parts[0]),
      symbol: decodeBase64(parts[1]),
      url,
      type: 'custom',
    }
  } catch {
    return { name: '', url, type: 'other' }
  }
}

/**
 * Convert chartiq timeframe code to display label.
 */
/**
 * Recover the underlying indicator URL from an Optix-style URL.
 */
export function recoverSymbolOptixUrl(url: string): string {
  if (url && url.endsWith('@indicator')) {
    const i = url.indexOf('@indicator')
    return url.slice(0, i)
  }
  return url
}

/**
 * Limit the number of studies displayed on chart.
 * Returns true when the limit is reached.
 */
export function maxNumOfStudy(stx?: any): boolean {
  const chartEngine = stx || (typeof CIQ !== 'undefined' ? CIQ.stxx : null)
  if (!chartEngine?.layout?.studies) return false

  let countExistIndicator = 0
  const studies = chartEngine.layout.studies
  for (const studyInstanceName in studies) {
    const study = studies[studyInstanceName]
    if (CIQ.findBuiltinTechIndicator && CIQ.findBuiltinTechIndicator(null, study.type)) {
      countExistIndicator--
    }
    if (study.type === 'ST MA') {
      countExistIndicator--
    }
    countExistIndicator++
  }

  if (countExistIndicator >= 20) {
    if (CIQ.description) CIQ.description('Maximum 20 signals can be displayed on chart')
    if (CIQ.hideCover) CIQ.hideCover()
    if (CIQ.nprogress) CIQ.nprogress.done()
    return true
  }
  return false
}

export function timeframeTransform(val: string): string {
  switch (val) {
    case 'monthly':
      return 'Monthly'
    case 'weekly':
      return 'Weekly'
    case 'daily':
    default:
      return 'Daily'
  }
}

/**
 * Get the core symbol label for dual-symbol mode.
 * Used by tooltip addon.
 */
export function getCoresSymbolDual(isSymbol2: boolean): string {
  const store = (CIQ as any).store
  const symbolLabel = isSymbol2
    ? store?.comparisonSymbol?.url
    : CIQ.stxx?.chart?.symbol
  const { name, type } = getSymbolInfo(symbolLabel ?? '')
  if (type === 'custom') {
    return name || symbolLabel
  }
  return symbolLabel || ''
}

export function createStateFilter(queryString: string) {
  return (state: Record<string, unknown>): number => {
    const query = queryString.toLowerCase()
    const resultValue = (state.value || state.name || state.label || state.model_name) as string | undefined
    const resultUrl = (state.url || state.symbol) as string | undefined

    if (!resultValue || !resultUrl) return 0
    if (!queryString) return 2

    const standardizeString = (str: string) =>
      str.toLowerCase().replace(/[_\s-]+/g, ' ')

    const standardizedQuery = standardizeString(query)
    const standardizedValue = standardizeString(resultValue)
    const standardizedUrl = standardizeString(resultUrl)

    const escapeRegExp = (string: string) =>
      string.replace(/[.*+?^=${}()|[\]\\]/g, '\\$&')

    const fuzzyMatch = (text: string, queryStr: string) => {
      const escapedQuery = escapeRegExp(queryStr)
      let regexString = ''
      for (let i = 0; i < escapedQuery.length; i++) {
        const char = escapedQuery[i]
        regexString += char
        if (i < escapedQuery.length - 1 && /[a-zA-Z0-9]/.test(char)) {
          regexString += '.*?'
        }
      }
      const regex = new RegExp(regexString, 'g')
      return [...text.matchAll(regex)]
    }

    let score = 0

    if (
      standardizedValue === standardizedQuery ||
      standardizedUrl === standardizedQuery
    ) {
      score += 10
    } else if (
      standardizedValue.startsWith(standardizedQuery) ||
      standardizedUrl.startsWith(standardizedQuery)
    ) {
      score += 5
    }

    const valueMatches = fuzzyMatch(standardizedValue, standardizedQuery)
    const urlMatches = fuzzyMatch(standardizedUrl, standardizedQuery)
    const maxMatches = Math.max(valueMatches.length, urlMatches.length)
    score += maxMatches * 2

    return score
  }
}

// ── 【Vue2→Vue3 兼容】Signal 编解码（来自原版 @/utils/cryptoUtils/codeTool.js）──
// 原版是完整实现，Vue3 初始迁移时用了 stub，此处还原完整逻辑以支持 myIndicatorChartControl.js

class SignalDecodeIDS {
  ids_dict: Array<(val: string) => any>

  constructor() {
    this.ids_dict = [
      this.slow_fast_sl,
      this.eo_ep,
      this.over_bought_sold_bound_period,
      this.ma_category,
    ]
  }

  slow_fast_sl(val: string) {
    const re = /^MACDSlow(-?0?\d*?\.?\d*?)\/MACDFast(-?0?\d*?\.?\d*?)\/MACDSL(-?0?\d*?\.?\d*?)$/
    if (val.search(re) === -1) return false
    return {
      MACDSlow: (RegExp as any).$1,
      MACDFast: (RegExp as any).$2,
      MACDSL: (RegExp as any).$3,
    }
  }

  eo_ep(val: string) {
    const re = /^EO(-?0?\d*?\.?\d*?)\/EP(-?0?\d*?\.?\d*?)$/
    if (val.search(re) === -1) return false
    return {
      extreme_optimism: (RegExp as any).$1,
      extreme_pessimism: (RegExp as any).$2,
    }
  }

  over_bought_sold_bound_period(val: string) {
    const re = /^OBB(-?0?\d*?\.?\d*?)\/OSB(-?0?\d*?\.?\d*?)\/Period(-?0?\d*?\.?\d*?)$/
    if (val.search(re) === -1) return false
    return {
      over_bought_bound: (RegExp as any).$1,
      over_sold_bound: (RegExp as any).$2,
      period: (RegExp as any).$3,
    }
  }

  ma_category(val: string) {
    const re = /^(SMA|EMA)$/
    if (val.search(re) === -1) return false
    return { ma_category: val }
  }

  decode(val: string) {
    let tmp: any
    for (const func of this.ids_dict) {
      tmp = func(val)
      if (tmp) break
    }
    return tmp
  }
}

class SignalDecodeSC {
  sc_dict: Array<(val: string) => any>

  constructor() {
    this.sc_dict = [
      this.si_period_condition_value,
      this.si_condition_value,
      this.rsi_condition_value,
      this.macd_condition_value,
      this.ma_condition_period,
      this.exit_value_period,
      this.cci_condition_value,
    ]
  }

  si_condition_value(val: string) {
    const re = /^SV\/(-?0?\d*?\.?\d*?)\/(-?0?\d*?\.?\d*?)$/
    const re_ma = /^SV\/(-?0?\d*?\.?\d*?)\/SVMA(-?0?\d*?\.?\d*?)$/
    if (val.search(re) === -1 && val.search(re_ma) === -1)
      return 'The input parameters of the Signal Condition maybe error!'
    if (val.search(re) !== -1)
      return { condition: (RegExp as any).$1, value: (RegExp as any).$2 }
    if (val.search(re_ma) !== -1)
      return { condition: (RegExp as any).$1, value: (RegExp as any).$2 }
  }

  si_period_condition_value(val: string) {
    const re = /^SVMA(-?0?\d*?\.?\d*?)\/(-?0?\d*?\.?\d*?)\/(-?0?\d*?\.?\d*?)$/
    if (val.search(re) === -1)
      return 'The input parameters of the Signal Condition maybe error!'
    return {
      period: (RegExp as any).$1,
      condition: (RegExp as any).$2,
      value: (RegExp as any).$3,
    }
  }

  macd_condition_value(val: string) {
    const re = /^MACDV\/(-?0?\d*?\.?\d*?)\/((-?0?\d*?\.?\d*?)|MACDSL)$/
    if (val.search(re) === -1)
      return 'The input parameters of the Signal Condition maybe error!'
    return {
      condition: (RegExp as any).$1,
      value: (RegExp as any).$2,
    }
  }

  ma_condition_period(val: string) {
    const re = /^(SC|MA)(-?0?\d*?\.?\d*?)\/(-?0?\d*?\.?\d*?)\/MA(-?0?\d*?\.?\d*?)$/
    if (val.search(re) === -1)
      return 'The input parameters of the Signal Condition maybe error!'
    if ((RegExp as any).$2 !== '') {
      return {
        ma_period: (RegExp as any).$2,
        condition: (RegExp as any).$3,
        period: (RegExp as any).$4,
      }
    }
    return {
      condition: (RegExp as any).$3,
      period: (RegExp as any).$4,
    }
  }

  rsi_condition_value(val: string) {
    const re = /^RSIV\/(-?0?\d*?\.?\d*?)\/(-?0?\d*?\.?\d*?)$/
    if (val.search(re) === -1)
      return 'The input parameters of the Signal Condition maybe error!'
    return {
      condition: (RegExp as any).$1,
      value: (RegExp as any).$2,
    }
  }

  cci_condition_value(val: string) {
    const re = /^CCIV\/(-?0?\d*?\.?\d*?)\/(-?0?\d*?\.?\d*?)$/
    if (val.search(re) === -1)
      return 'The input parameters of the Signal Condition maybe error!'
    return {
      condition: (RegExp as any).$1,
      value: (RegExp as any).$2,
    }
  }

  exit_value_period(val: string) {
    const re = /^PTE(-?0?\d*?\.?\d*?)\/LSE(-?0?\d*?\.?\d*?)\/TIM(-?0?\d*?\.?\d*?)$/
    if (val.search(re) === -1)
      return 'The input parameters of the Signal Condition maybe error!'
    return {
      take_profit: (RegExp as any).$1,
      stop_loss: (RegExp as any).$2,
      time_in_market: (RegExp as any).$3,
    }
  }

  decode(val: string) {
    let tmp: any
    for (const func of this.sc_dict) {
      tmp = func(val)
      if (typeof tmp !== 'string') break
    }
    return tmp
  }
}

/**
 * Signal decoder/encoder — adapted from Vue2 project's codeTool.js.
 * Used by myIndicatorChartControl.js for parsing signal codes.
 *
 * This is the default export that `import SignalCode from '@/utils/cryptoUtils/codeTool'` expects.
 */
export class SignalCode {
  sc: SignalDecodeSC
  ids: SignalDecodeIDS
  backtest_dict: Record<string, (val: string) => any>

  constructor() {
    this.sc = new SignalDecodeSC()
    this.ids = new SignalDecodeIDS()
    this.backtest_dict = {
      Exit: this.ex,
      SI: this.si,
      TI: this.ti,
      UI: this.ui,
    }
  }

  si(val: string) {
    return { analysis: 'Sentiment', indicator: val }
  }
  ui(val: string) {
    return { analysis: 'User', indicator: val }
  }
  ti(val: string) {
    return { analysis: 'Technical', indicator: val }
  }
  ex(val: string) {
    return { analysis: 'Exit', indicator: val }
  }

  re_indicator(val: Record<string, string>) {
    let re_str = ''
    const val_keys = Object.keys(val)
    if (val_keys.indexOf('analysis') !== -1 && val_keys.indexOf('indicator') !== -1) {
      if (val['analysis'] === 'Sentiment') {
        re_str += 'SI:' + val['indicator'] + ';'
      } else if (val['analysis'] === 'Technical') {
        re_str += 'TI:' + val['indicator'] + ';'
      } else if (val['analysis'] === 'Exit') {
        re_str += 'Exit:' + val['indicator'] + ';'
      } else if (val['analysis'] === 'User') {
        re_str += 'UI:' + val['indicator'] + ';'
      }
    }
    return re_str
  }

  re_ids(val: Record<string, any>) {
    const val_keys = Object.keys(val)
    let re_str = 'IDS:'
    if (val_keys.indexOf('extreme_optimism') !== -1 && val_keys.indexOf('extreme_pessimism') !== -1) {
      re_str += 'EO' + val['extreme_optimism'] + '/EP' + val['extreme_pessimism']
    } else if (val_keys.indexOf('MACDSlow') !== -1 && val_keys.indexOf('MACDFast') !== -1 && val_keys.indexOf('MACDSL') !== -1) {
      re_str += 'MACDSlow' + val['MACDSlow'] + '/MACDFast' + val['MACDFast'] + '/MACDSL' + val['MACDSL']
    } else if (val_keys.indexOf('ma_category') !== -1) {
      re_str += val['ma_category']
    } else if (val_keys.indexOf('over_bought_bound') !== -1 && val_keys.indexOf('over_sold_bound') !== -1 && val_keys.indexOf('period') !== -1) {
      re_str += 'OBB' + val['over_bought_bound'] + '/OSB' + val['over_sold_bound'] + '/Period' + val['period']
    }
    re_str += ';'
    return re_str
  }

  re_sc(val: Record<string, any>) {
    let re_str = 'SC:'
    const val_keys = Object.keys(val)
    if (val['analysis'] === 'Sentiment' || val['analysis'] === 'User') {
      if (val_keys.indexOf('period') !== -1) {
        re_str += 'SVMA' + val['period'] + '/' + val['condition'] + '/' + val['value']
      } else if (val_keys.indexOf('period') === -1) {
        re_str += 'SV/' + val['condition'] + '/' + val['value']
      }
    } else if (val['analysis'] === 'Technical') {
      if (val['indicator'] === 'Moving Average') {
        if (val_keys.indexOf('ma_period') === -1) {
          re_str += 'SC/' + val['condition'] + '/MA' + val['period']
        } else {
          re_str += 'MA' + val['ma_period'] + '/' + val['condition'] + '/MA' + val['period']
        }
      } else if (val['indicator'] === 'MACD') {
        if (val['value'] === 'MACDSL') {
          re_str += 'MACDV/' + val['condition'] + '/MACDSL'
        } else {
          re_str += 'MACDV/' + val['condition'] + '/' + val['value']
        }
      } else if (val['indicator'] === 'Commodity Channel Index') {
        re_str += 'CCIV/' + val['condition'] + '/' + val['value']
      } else if (val['indicator'] === 'Relative Strength Index (RSI)') {
        re_str += 'RSIV/' + val['condition'] + '/' + val['value']
      }
    } else if (val['analysis'] === 'Exit') {
      const tmp = { take_profit: '', stop_loss: '', time_in_market: '' }
      Object.assign(tmp, val)
      re_str += 'PTE' + tmp['take_profit'] + '/LSE' + tmp['stop_loss'] + '/TIM' + tmp['time_in_market']
    }
    return re_str
  }

  encode(val: Record<string, any>) {
    return this.re_indicator(val) + this.re_ids(val) + this.re_sc(val)
  }

  decode(val: string) {
    const re = /(TI|SI|Exit|UI){1}:(.*);IDS:(\S*);SC:(\S*)/
    if (val.search(re) !== -1) {
      const d1 = (RegExp as any).$2
      const d2 = (RegExp as any).$3
      const d3 = (RegExp as any).$4
      const indicator = this.backtest_dict[(RegExp as any).$1](d1)
      const ids = this.ids.decode(d2)
      const sc = this.sc.decode(d3)
      if (typeof sc === 'string' || typeof ids === 'string' || typeof indicator === 'string') {
        return 'The input parameters of the Signal Condition maybe error!'
      }
      const tmp: Record<string, any> = {}
      tmp['ids'] = ids
      tmp['sc'] = sc
      tmp['indicator'] = indicator
      Object.assign(tmp, indicator)
      Object.assign(tmp, ids)
      Object.assign(tmp, sc)
      return tmp
    }
    return undefined
  }
}

/**
 * 【Vue2→Vue3 兼容】SignalCode 默认导出 —— 原版 codeTool.js 也是 export default 同名类
 */
export default SignalCode

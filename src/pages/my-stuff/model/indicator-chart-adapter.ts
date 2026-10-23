/**
 * My Indicator → ChartIQ legacy adapter
 *
 * 【Vue2→Vue3 完全一致迁移】旧版 MIForm.vue / MyIndicator list table.vue 中的
 * 类型映射与 legacy chart_data 构造逻辑，原样抽出为纯函数供页面复用。
 * 不改变任何业务语义。
 */
import stocksData from '@/assets/stocks_list.json'
import type { MyIndicatorRow } from '@/entities/my-stuff/api/user-indicator.api'
import type { SignalIndicatorOption } from '@/entities/my-stuff/api/sentiment-indicator.api'

declare const process: { env: Record<string, string | undefined> }

/**
 * 【照搬旧版 chart/fetch_indicatorsList】stock 同名 indicator 的 url 需要加
 * `@indicator` 后缀，才能与 symbol 列表的同名 url 区分（旧版 sentimentList 即如此）。
 */
const STOCK_SYMBOLS = new Set((stocksData as Array<{ stock?: string }>).map((item) => String(item.stock ?? '')))

export function chartIndicatorUrl(url: string): string {
  return STOCK_SYMBOLS.has(url) ? `${url}@indicator` : url
}

/** 该 url 是否指向 indicator 列表（含 `@indicator` 后缀还原） */
export function isIndicatorChartUrl(url: string, options: SignalIndicatorOption[]): boolean {
  const key = url.trim().toLowerCase()
  return options.some((option) => chartIndicatorUrl(option.url).toLowerCase() === key)
}

/** 旧版列表把已保存的 plain url 还原成 `url@indicator`（见 list/table.vue processIndicators） */
export function restoreIndicatorChartUrl(url: string, options: SignalIndicatorOption[]): string {
  if (!url) return url
  const suffixed = `${url}@indicator`
  return options.some((option) => chartIndicatorUrl(option.url).toLowerCase() === suffixed.toLowerCase())
    ? suffixed
    : url
}

/** 旧版 chart 组件统一使用的起始日期（Vite define 注入 process.env） */
export const CHART_START_DATE = new Date(parseInt(process.env.VUE_APP_START_DATE ?? '-5364662400000'))

/** 页面分类 → 旧版 MIForm 的 categories（图表/store 判断用） */
export const LEGACY_CATEGORY: Record<string, string> = {
  'Indicator Spread': 'Indicator Spread',
  'Indicator Ratio': 'Indicator Ratio',
  'Indicator Addition': 'Indicator Addition',
  'Symbol Spread': 'Symbol Spread',
  'Symbol Ratio': 'Symbol Ratio',
  'Symbol Addition': 'Symbol Addition',
  'Weighted Indicator Combination': 'WIC',
  'Symbol OHLCV': 'OHLCV',
  'Indicator Resample': 'Resample',
  'Technical Indicator': 'Technical',
}

export function legacyCategory(category: string): string {
  return LEGACY_CATEGORY[category] ?? category
}

/**
 * displayUserOwnIndicatorLayout 判分支用的 categories。
 * 旧版 WIC 在列表行里是 'Weighted Indicator Combination'（不是 'WIC'）。
 */
export function legacyChartCategory(category: string): string {
  return category === 'Weighted Indicator Combination' ? 'Weighted Indicator Combination' : legacyCategory(category)
}

/** 旧版 OHLCV 下拉 label —— CIQ.findSymbolIndicator 按 label 匹配 */
export const OHLCV_CONDITION_LABEL: Record<string, string> = {
  Open: 'Symbol Open',
  High: 'Symbol High',
  Low: 'Symbol Low',
  Close: 'Symbol Close',
  Volume: 'Symbol Volume',
}

/** 旧版 CheckInput 的 MAType 映射 */
export function calculationToMAType(calculation: string): string {
  if (calculation === 'Indicator Value') return 'i'
  if (calculation === 'Simple Moving Average') return 'MA'
  if (calculation === 'Exponential Moving Average') return 'EMA'
  if (calculation === 'Rate of Change') return 'roc'
  if (calculation === 'Amplitude') return 'amplitude'
  if (calculation === 'Open') return 'o'
  if (calculation === 'High') return 'h'
  if (calculation === 'Low') return 'l'
  if (calculation === 'Close') return 'c'
  // 旧版 Volume 没有独立 MAType，OHLCV 路径不使用该值
  return 'c'
}

export function showInputForCalculation(calculation: string): boolean {
  return ['Simple Moving Average', 'Exponential Moving Average', 'Rate of Change'].includes(calculation)
}

export interface ChartComponentState {
  source: string
  url: string
  calculation: string
  period: string
  shift: string
  weight: string
}

export interface LegacyWeightRow {
  weight: string
  indicator: string
  indicator_url: string
  weightValidErrMsg: string
  type: 'Indicator' | 'Symbol' | ''
}

function parseLegacyJson(value: unknown): Record<string, unknown> | null {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function trimTrailingZeros(value: string) {
  return String(Number(value))
}

/**
 * 旧版 list/table.vue getWeightedIndicatorData：从 raw.mul_indicator + indicator_weight 重建。
 */
export function buildWeightDataFromRaw(row: MyIndicatorRow, options: SignalIndicatorOption[]): LegacyWeightRow[] {
  const mulIndicator = parseLegacyJson(row.raw.mul_indicator)
  if (!mulIndicator) return []
  const weights = String(row.raw.indicator_weight ?? '').split('_').filter((item) => item !== '')
  const kinds = String(mulIndicator.combine_type ?? '').split('_')
  return Object.entries(mulIndicator)
    .filter(([key, value]) => key.startsWith('indicator_') && Boolean(value))
    .map(([, value], index) => {
      const rawUrl = String(value)
      const type: 'Indicator' | 'Symbol' = kinds[index] === 'sy' ? 'Symbol' : 'Indicator'
      const option = options.find((item) => item.url.toLowerCase() === rawUrl.toLowerCase())
      // 旧版 processIndicators：Indicator 类型且 sentimentList 含后缀时还原 url
      const url = type === 'Indicator' ? restoreIndicatorChartUrl(rawUrl, options) : rawUrl
      const number = Number(String(weights[index] ?? '0').replace(/^n/, '-')) * 100
      return {
        weight: trimTrailingZeros(number.toFixed(2)),
        // 旧版 getWeightedIndicatorData：Indicator 取 sentimentList label，找不到则为空
        indicator: type === 'Symbol' ? url : (option?.label ?? ''),
        indicator_url: url,
        weightValidErrMsg: '',
        type,
      }
    })
}

/**
 * 页面 components → 旧版 weightData（handleRowSelect/addRow/deleteRow 使用的形状）。
 * 旧版 sentimentList 在前、symbolList 在后，因此先命中 indicator 视为 Indicator。
 */
export function buildWeightData(components: ChartComponentState[], options: SignalIndicatorOption[]): LegacyWeightRow[] {
  return components.map((item) => {
    if (!item.url) return { weight: item.weight, indicator: '', indicator_url: '', weightValidErrMsg: '', type: '' }
    // 组件 url 已带 `@indicator` 后缀（与 symbol 区分），这里按 suffix 还原后的列表判断类型
    const type: 'Indicator' | 'Symbol' = isIndicatorChartUrl(item.url, options) ? 'Indicator' : 'Symbol'
    return {
      weight: item.weight,
      indicator: type === 'Symbol' ? item.url : item.source,
      indicator_url: item.url,
      weightValidErrMsg: '',
      type,
    }
  })
}

/**
 * 编辑进入时把新 MyIndicatorRow 还原成旧版 chart_data（displayUserOwnIndicatorLayout 的入参）。
 */
export function buildLegacyChartData(row: MyIndicatorRow, options: SignalIndicatorOption[]): Record<string, unknown> {
  const raw = row.raw
  const singleSource = ['Symbol OHLCV', 'Indicator Resample', 'Technical Indicator'].includes(row.category)
  // 旧版列表仅对 combine_type === 'indicator' 的行还原 `@indicator` 后缀
  const isIndicatorPair = ['Indicator Spread', 'Indicator Ratio', 'Indicator Addition'].includes(row.category)
  const base1 = String(raw.indicator_1_url ?? raw.indicator_1 ?? row.included[0]?.url ?? '')
  const base2 = String(raw.indicator_2_url ?? raw.indicator_2 ?? row.included[1]?.url ?? '')
  const indicator1Url = isIndicatorPair ? restoreIndicatorChartUrl(base1, options) : base1
  // 旧版 list/table.vue 只还原 indicator_1_url，indicator_2_url 保持原样
  const indicator2Url = singleSource ? '' : base2

  const data: Record<string, unknown> = {
    ...raw,
    categories: legacyChartCategory(row.category),
    time_frame: row.timeframe,
    name: row.name,
    url: row.url,
    former: row.included[0]?.name ?? '',
    latter: row.included[1]?.name ?? '',
    former_url: indicator1Url,
    latter_url: indicator2Url,
    indicator_1_url: indicator1Url,
    indicator_2_url: indicator2Url,
    // 旧版 chart 读 upper/lower_extreme_value；兼容新后端的 extreme_optimism/pessimism
    upper_extreme_value: raw.upper_extreme_value ?? raw.extreme_optimism ?? 0,
    lower_extreme_value: raw.lower_extreme_value ?? raw.extreme_pessimism ?? 0,
  }

  if (row.category === 'Weighted Indicator Combination') {
    data.weightData = buildWeightDataFromRaw(row, options)
  }

  return data
}

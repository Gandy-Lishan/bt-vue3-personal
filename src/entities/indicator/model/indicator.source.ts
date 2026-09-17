import { indicatorSourceLabels } from './indicator.catalog'
import type { IndicatorDetail } from './indicator.types'

export const unableToFindIndicatorMessage = 'Unable to find the corresponding indicator'

const unavailableIndicatorIds = new Set(['vol_vix_transform'])

const sourceByType: Record<string, string> = {
  stock_sent: 'sp_1500_complete_list',
  stock_nasdaq: 'ndx_100_complete_list',
  stock_russell: 'russell_3000_complete_list',
  etf_fund: 'etf_flow',
  mff: 'monthly_fund_flows',
  shares: 'shares_outstanding',
  etf_seasonality: 'etf_seasonality',
  bond_seasonality: 'bond_seasonality',
  country_opt: 'country_breadth_overview',
  etf_opt: 'etf_complete_list',
  commod_seasonality: 'commod_seasonality',
}

const sourceBySubType: Record<string, string> = {
  stock_sent: 'sp_1500_complete_list',
  crp_stock: 'crypt_complete_list',
  all_country_breadth: 'country_breadth',
  crp_breadth: 'crypto_breadth',
  cot: 'cot_max_min',
  etf_breadth: 'etf_breadth',
}

const sourceByGroup: Record<string, string> = {
  commod: 'commodity_complete_list',
  bonds: 'bond_complete_list',
  stocks: 'stock_complete_list',
  macroeconomic: 'macro_indicator_list',
}

const trendReltrendSourceByPrefix: Record<string, string> = {
  sp1500: 'sp_1500_complete_list',
  sp_1500: 'sp_1500_complete_list',
  spx: 'sp_1500_complete_list',
  ndx100: 'ndx_100_complete_list',
  ndx_100: 'ndx_100_complete_list',
  nasdaq100: 'ndx_100_complete_list',
  nasdaq_100: 'ndx_100_complete_list',
  russell1000: 'russell_1000_complete_list',
  russell_1000: 'russell_1000_complete_list',
  russell2000: 'russell_2000_complete_list',
  russell_2000: 'russell_2000_complete_list',
  russell3000: 'russell_3000_complete_list',
  russell_3000: 'russell_3000_complete_list',
  crp: 'crypt_complete_list',
  crypto: 'crypt_complete_list',
}

function normalizedText(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

export function isKnownIndicatorSource(source: string) {
  return indicatorSourceLabels.has(source)
}

export function isUnavailableIndicatorId(id: string) {
  return unavailableIndicatorIds.has(normalizedText(id))
}

function trendReltrendSource(subType: string) {
  const prefix = subType.match(/(.*?)_trend_reltrend/)?.[1]
  if (!prefix) return 'sp_1500_complete_list'

  const normalizedPrefix = prefix.replace(/-/g, '_')
  const source = trendReltrendSourceByPrefix[normalizedPrefix]
  if (source) return source

  return isKnownIndicatorSource(normalizedPrefix) ? normalizedPrefix : null
}

export function inferIndicatorSourceFromRaw(raw: Record<string, unknown> | undefined, id = '') {
  if (isUnavailableIndicatorId(id)) return null
  if (!raw) return null

  const type = normalizedText(raw.type)
  const groups = normalizedText(raw.groups)
  const subType = normalizedText(raw.sub_type)

  if (type === 'stock_sent' || subType === 'stock_sent') return 'sp_1500_complete_list'
  if (type === 'stock_nasdaq') return 'ndx_100_complete_list'
  if (type === 'stock_russell') return 'russell_3000_complete_list'

  if (sourceBySubType[subType]) return sourceBySubType[subType]
  if (sourceByType[type]) return sourceByType[type]
  if (groups === 'trend_reltrend') return trendReltrendSource(subType)
  if (sourceByGroup[groups]) return sourceByGroup[groups]

  return null
}

export function inferIndicatorSourceFromDetail(detail: IndicatorDetail, id = detail.id) {
  return inferIndicatorSourceFromRaw(detail.raw, id)
}

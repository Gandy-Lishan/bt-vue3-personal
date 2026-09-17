import { indicatorSourceLabels } from './indicator.catalog'
import {
  convertIndicatorDescriptionHtml,
  normalizeConstituentConditions,
  normalizeRelatedCharts,
  normalizeResearchPosts,
  normalizeReturnSegments,
  normalizeThresholdRows,
} from './indicator.detail'
import { sentimentFromScore } from './indicator.sentiment'
import { normalizeTrendSeries } from './indicator.trends'
import type { Indicator, IndicatorDetail, IndicatorRawRow } from './indicator.types'

const mediumTimeFrames = new Set(['Short to Intermediate', 'Intermediate to Long', 'Intermediate', 'Medium-Term'])
const shortTimeFrames = new Set(['Short', 'Short-Term'])
const longTimeFrames = new Set(['Long', 'Long-Term'])
const spotlightSources = new Set(['commod_spotlight', 'sector_spotlight', 'country_spotlight'])

const normalizedSubTypeSources = new Set([
  'stock_complete_list',
  'macro_indicator_list',
  'etf_complete_list',
  'bond_complete_list',
  'etf_breadth',
  'etf_flow',
  'monthly_fund_flows',
  'shares_outstanding',
  'bond_seasonality',
  'index_seasonality',
  'commod_seasonality',
  'etf_seasonality',
  'most_popular',
  'favorite_detail',
  'btv1_user_favorite_indicator',
  'commodity_complete_list',
  'commod_sentiment_seasonality',
  'commod_optix_trend',
  'cot_max_min',
])

const subTypeLabels: Record<string, string> = {
  vol: 'Volatility',
  stock_sent: 'Stock Sentiment',
  pc_ratio: 'PutCall',
  equity: 'COT',
  cot: 'COT',
  etf_index: 'Index',
  etf_social_index: 'Index',
  etf_etf: 'Sector',
  etf_social_sector: 'Sector',
  etf_sector: 'Sector',
  mff_sector: 'Sector',
  etf_bond: 'Bond',
  etf_social_bond: 'Bond',
  mff_bond: 'Bond',
  etf_commod: 'Commodity',
  etf_social_commod: 'Commodity',
  mff_commod: 'Commodity',
  etf_breadth: 'Sector Breadth',
  etf_country: 'Country',
  etf_social_country: 'Country',
  etf_social: 'Social',
  seasonality: 'Seasonality',
  optix: 'Optix',
  model: 'Model',
  more: 'More',
  rydex: 'Rydex',
  mff_stocks: 'Stocks',
}

const bondSubTypeByChartName = new Map<string, string>([
  ...[
    'Bond Optix',
    '10-Year Optix',
    '10-Year Treasury Hedgers Position',
    '10-Year Bond Put/Call Ratio',
    '10-Year Treasury Seasonality',
    'Conference Board - Bonds',
    'Ultra 10-Year Treasuries Hedgers Position',
    'Ultra 10-Year Treasury Hedgers Position',
    '2-Year / 10-Year Yield Curve',
    'BBB - AAA Corporate Bond Yield Spread',
  ].map((name) => [name, '10-Year Treasury'] as const),
  ...['TLT Optix', 'TLT Seasonality', 'TLT Open Interest Ratio'].map((name) => [name, '20-Year Treasury'] as const),
  ...['2-Year Optix', '2-Year Treasury Hedgers Position', '2-Year Treasury Seasonality'].map((name) => [
    name,
    '2-Year Treasury',
  ] as const),
  ...[
    '30-Year Treasury Hedgers Position',
    '30-Year Bond Put/Call Ratio',
    'Rydex Bond Bear Assets',
    'Rydex Bond Bull Assets',
    'Rydex Bond Bull Ratio',
    '30-Year Treasury Seasonality',
    'AAII Allocation - Bonds',
    'Strategist Allocation - Bonds',
    '30-Year Optix',
    'Fund Flow - Combined Bond',
    'Fund Flow - ETF Bond',
    'Fund Flow - Mutual Fund Bond',
    'Ultra 30-Year Treasuries Hedgers Position',
    'Ultra 30-Year Treasury Hedgers Position',
  ].map((name) => [name, '30-Year Treasury'] as const),
  ...['5-Year Treasury Hedgers Position', '5-Year Treasury Seasonality', '5-Year Treasury', '5-Year Optix'].map((name) => [
    name,
    '5-Year Treasury',
  ] as const),
  ...['Eurodollar Optix', 'Eurodollar Hedgers Position', 'Eurodollar Price Seasonality'].map((name) => [
    name,
    'Eurodollar',
  ] as const),
  ...[
    'High Yield Bond Advance-Decline',
    'High Yield Bond NH - NL',
    'HYG Optix',
    'JNK Optix',
    'HYG Seasonality',
    'JNK Seasonality',
    'High Yield Bond Cumulative A/D Line',
    'High Yield McClellan Oscillator',
    'High Yield McClellan Summation',
  ].map((name) => [name, 'High-Yield'] as const),
  ...['BND Optix', 'LQD Optix', 'LQD Seasonality'].map((name) => [name, 'Investment Grade'] as const),
])

function toNumber(value: unknown, fallback = 0) {
  if (value === '' || value === null || value === undefined) return fallback
  const parsed = Number(String(value).replace('%', ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeTimeFrame(value: unknown) {
  const text = String(value || 'Medium')
  if (mediumTimeFrames.has(text)) return 'Medium'
  if (shortTimeFrames.has(text)) return 'Short'
  if (longTimeFrames.has(text)) return 'Long'
  return text
}

function capitalizeFirst(value: string) {
  if (!value) return value
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

function normalizeSubType(value: unknown, row: IndicatorRawRow, source: string) {
  const text = String(value ?? '').trim()
  if (!text || !normalizedSubTypeSources.has(source)) return text

  if (source === 'commodity_complete_list' && text === 'vol' && String(row.url ?? '').startsWith('vol_')) {
    return 'Volatility'
  }

  if (
    source === 'etf_complete_list' &&
    text === 'etf_bond' &&
    String(row.url ?? '').startsWith('etf_') &&
    String(row.underlying_name ?? '').endsWith('Treasury')
  ) {
    row.chart_name = String(row.underlying_name).replace('Treasury', 'Optix')
    return 'Bond'
  }

  if (
    source === 'etf_seasonality' &&
    row.type === 'etf_seasonality' &&
    typeof row.underlying_name === 'string'
  ) {
    row.underlying_name = row.underlying_name.replace('Industrial', 'Ind.').replace('Discretionary', 'Disc.')
  }

  if (source === 'bond_complete_list') {
    const chartName = String(row.chart_name ?? '')
    return bondSubTypeByChartName.get(chartName) ?? capitalizeFirst(text)
  }

  if (text.startsWith('etf_fund_')) {
    return capitalizeFirst(text.split('_')[2] ?? text)
  }

  return subTypeLabels[text] ?? capitalizeFirst(text)
}

function collapseCountryBreadthRows(rows: IndicatorRawRow[]) {
  const groupedRows = new Map<string, IndicatorRawRow>()

  for (const row of rows) {
    const chartName = String(row.chart_name ?? row.name ?? '')
    const country = String(row.country ?? '')
    if (!chartName) continue

    const groupedRow = groupedRows.get(chartName) ?? { chart_name: chartName, type: 'Indicator' }
    if (country) {
      groupedRow[country] = row.last_value
      groupedRow[`${country}_url`] = row.url
    }
    const overviewUrl = row.type_url ?? row.url ?? groupedRow.url
    if (overviewUrl !== undefined && overviewUrl !== null) {
      groupedRow.url = String(overviewUrl)
    }
    groupedRows.set(chartName, groupedRow)
  }

  return Array.from(groupedRows.values())
}

function prepareIndicatorRows(rows: IndicatorRawRow[], source: string) {
  const sourceRows = source === 'country_breadth_overview' ? collapseCountryBreadthRows(rows) : rows

  return sourceRows.map((row) => {
    const next = { ...row }

    if (spotlightSources.has(source)) {
      next.url = String(next.chart_id ?? next.url ?? next.chart_url ?? '')
      next.chart_name = String(next.title ?? next.chart_name ?? next.name ?? '')
    }

    if (source === 'cot_max_min') {
      next.type = String(next.type ?? 'Indicator')
    }

    if (next.chart_url && !next.url) {
      next.url = next.chart_url
    }

    if (next.symbol && !next.url) {
      next.url = next.symbol
    }

    if (next.timeframe !== undefined && next.timeframe !== null && next.timeframe !== '') {
      next.timeframe = normalizeTimeFrame(next.timeframe)
    }

    if (next.sub_type !== undefined && next.sub_type !== null && next.sub_type !== '') {
      next.sub_type = normalizeSubType(next.sub_type, next, source)
    }

    next.source_list = source
    next.loading = false

    return next
  })
}

function normalizeSentimentScore(value: unknown, currentValue: number, change: number) {
  const numeric = toNumber(value, Number.NaN)
  if (Number.isFinite(numeric) && numeric >= 1 && numeric <= 7) return Math.round(numeric)
  if (currentValue >= 50 || change >= 1) return 5
  if (change < -0.5) return 3
  return 4
}

export function normalizeIndicatorRows(rows: IndicatorRawRow[], source: string): Indicator[] {
  const sourceMeta = indicatorSourceLabels.get(source) ?? indicatorSourceLabels.get('stock_complete_list')
  const group = sourceMeta?.group
  const subgroup = sourceMeta?.subgroup

  return prepareIndicatorRows(rows, source)
    .filter((row) => row && (row.url || row.chart_url || row.symbol) && (row.chart_name || row.name))
    .map((row) => {
      const id = String(row.url ?? row.chart_url ?? row.symbol)
      const currentValue = toNumber(row.last_value)
      const change = toNumber(row.last_change)
      const sentimentScore = normalizeSentimentScore(row.sentiment, currentValue, change)
      const trendLines = normalizeTrendSeries(row.trend ?? row.recent_data ?? row.chart_data ?? row.values ?? row.series ?? row.data)

      return {
        id,
        name: String(row.chart_name ?? row.name),
        group: String(row.groups ?? group?.label ?? 'Stock Market'),
        groupId: group?.id ?? 'stock',
        subgroup: String(row.sub_type ?? subgroup?.label ?? group?.label ?? 'Stock Market'),
        sourceList: String(row.source_list ?? source),
        timeFrame: normalizeTimeFrame(row.timeframe),
        currentValue,
        change,
        updatedAt: String(row.last_update ?? '2026-09-08'),
        sentiment: sentimentFromScore(sentimentScore),
        sentimentScore,
        trendLines,
        favorite: Boolean(row.favorite),
        type: String(row.type ?? 'Indicator'),
        marketSymbol: row.market_symbol ? String(row.market_symbol) : undefined,
        raw: row,
      }
    })
}

export function normalizeIndicatorDetail(raw: Record<string, unknown>, fallback: IndicatorDetail): IndicatorDetail {
  const currentValue = toNumber(raw.last_value, fallback.currentValue)
  const change = toNumber(raw.last_change, fallback.change)
  const score = normalizeSentimentScore(raw.sentiment, currentValue, change)
  const thresholdRows = normalizeThresholdRows(raw)
  const description = String(raw.what_it_measures ?? raw.measure ?? raw.summary ?? fallback.description)
  const construction = String(raw.construction ?? raw.description ?? fallback.construction)
  const updated = String(raw.updated ?? fallback.updateSchedule ?? 'Daily')
  const updateSchedule = updated.split(' ')[0] || 'Daily'
  const relatedCharts = normalizeRelatedCharts(raw.related)
  const blogResults = normalizeResearchPosts(raw.blog_results)
  const constituentConditions = normalizeConstituentConditions(raw.constituent_conditions)

  return {
    ...fallback,
    id: String(raw.url ?? raw.chart_url ?? fallback.id),
    title: String(raw.chart_name ?? fallback.title),
    group: String(raw.groups ?? fallback.group),
    timeFrame: normalizeTimeFrame(raw.timeframe ?? fallback.timeFrame),
    updateSchedule,
    source: String(raw.source ?? fallback.source ?? 'SentimenTrader'),
    currentValue,
    change,
    updatedAt: String(raw.last_update ?? raw.updated_at ?? fallback.updatedAt),
    sentiment: sentimentFromScore(score),
    sentimentScore: score,
    description,
    construction,
    constructionHtml: convertIndicatorDescriptionHtml(construction),
    related: relatedCharts.map((chart) => chart.title),
    relatedCharts,
    constituentConditions,
    research: blogResults.map((post) => post.title),
    blogResults,
    thresholdRows,
    returnSegments: normalizeReturnSegments(raw.return_segments),
    showReturns: thresholdRows.length > 0,
    type: String(raw.type ?? fallback.type ?? 'Indicator'),
    marketSymbol: raw.market_symbol ? String(raw.market_symbol) : fallback.marketSymbol,
    sourceList: raw.source_list ? String(raw.source_list) : fallback.sourceList,
    pess: raw.pess === undefined || raw.pess === null ? fallback.pess ?? null : toNumber(raw.pess, Number.NaN),
    opt: raw.opt === undefined || raw.opt === null ? fallback.opt ?? null : toNumber(raw.opt, Number.NaN),
    raw,
  }
}

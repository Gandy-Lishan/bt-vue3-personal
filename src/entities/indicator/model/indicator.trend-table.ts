import { trendSparklineColumn, type IndicatorTableColumn } from './indicator.table'

export type TrendScoreOptionId =
  | 'SP500Score'
  | 'SP1500Score'
  | 'NDX100Score'
  | 'RussellScore'
  | 'DomesticETFScore'
  | 'ForeignETFScore'
  | 'OtherAssetsETFScore'
  | 'CRPScore'
  | 'TrendSector'
  | 'WatchList'
  | 'SectorTrendRelTrend'

export type TrendScoreCondition = '' | 'trend' | 'relative' | 'consecutive' | 'rangeRank'

export interface TrendScoreOption {
  id: TrendScoreOptionId
  label: string
  source: string
  includeSector?: boolean
  summary?: boolean
  dynamic?: boolean
}

export const trendScoreOptions: TrendScoreOption[] = [
  { id: 'SP500Score', label: 'S&P 500', source: 'spx', includeSector: true },
  { id: 'SP1500Score', label: 'S&P 1500', source: 'sp1500', includeSector: true },
  { id: 'NDX100Score', label: 'NDX', source: 'ndx', includeSector: true },
  { id: 'RussellScore', label: 'Russell 3000', source: 'russell', includeSector: true },
  { id: 'DomesticETFScore', label: 'Domestic ETF', source: 'etf_domestic' },
  { id: 'ForeignETFScore', label: 'Foreign ETF', source: 'etf_foreign' },
  { id: 'CRPScore', label: 'Crypto', source: 'crp' },
  { id: 'OtherAssetsETFScore', label: 'Other Assets', source: 'etf_other' },
  { id: 'TrendSector', label: 'Sector Summary', source: 'sector_trend_score', summary: true },
  { id: 'WatchList', label: 'My Favorites', source: 'watchlist' },
]

const baseTrendScoreSources = new Set([
  'sp1500',
  'spx',
  'ndx',
  'crp',
  'russell',
  'etf_domestic',
  'etf_foreign',
  'etf_other',
])

export function isTrendScoreListSource(source: string) {
  return baseTrendScoreSources.has(source) || baseTrendScoreSources.has(source.replace('&rel_trend=1', ''))
}

export function requestSourceForTrendScore(source: string, condition: TrendScoreCondition) {
  if (condition === 'relative' && isTrendScoreListSource(source) && !source.includes('rel_trend=1')) {
    return `${source}&rel_trend=1`
  }
  return source
}

function trendColumn(
  key: string,
  label: string,
  kind: IndicatorTableColumn['kind'] = 'number',
  minWidth = 118,
): IndicatorTableColumn {
  return { key, label, kind, align: kind === 'text' || kind === 'name' ? 'left' : 'right', minWidth }
}

function identityColumns(includeSector: boolean): IndicatorTableColumn[] {
  return [
    { key: 'market_symbol', label: 'Symbol', kind: 'name', minWidth: 78, uppercase: true },
    { key: 'chart_name', label: 'Name', kind: 'text', minWidth: 220 },
    ...(includeSector ? [trendColumn('sector_name', 'Sector', 'text', 74)] : []),
  ]
}

const scoreColumns: IndicatorTableColumn[] = [
  trendColumn('trend_last_value', 'Trend Score'),
  trendColumn('trend_five_day_score_chg', '5-Day Score Chg', 'change', 130),
  trendColumn('reltrend_last_value', 'Relative Score', 'number', 130),
  trendColumn('reltrend_five_day_score_chg', '5-Day Relative Chg', 'change', 145),
]

const trendConditionColumns: IndicatorTableColumn[] = [
  trendColumn('trend_last_value', 'Trend Score'),
  trendColumn('trend_five_day_score_chg', '5-Day Score Chg', 'change', 130),
  trendColumn('close_over_ma1', 'Close > 50-Day Avg', 'number', 145),
  trendColumn('close_over_ma2', 'Close > 100-Day Avg', 'number', 150),
  trendColumn('close_over_ma3', 'Close > 200-Day Avg', 'number', 150),
  trendColumn('ma1_over_ma2', '50-Day Avg > 100-Day Avg', 'number', 180),
  trendColumn('ma1_over_ma3', '50-Day Avg > 200-Day Avg', 'number', 180),
  trendColumn('ma2_over_ma3', '100-Day Avg > 200-Day Avg', 'number', 185),
  trendColumn('ma1_over_ma1p', '50-Day Avg Rising', 'number', 145),
  trendColumn('ma2_over_ma2p', '100-Day Avg Rising', 'number', 150),
  trendColumn('ma3_over_ma3p', '200-Day Avg Rising', 'number', 150),
  trendColumn('channel_trend', '63-Day Breakout Trend', 'number', 165),
]

const relativeConditionColumns: IndicatorTableColumn[] = [
  trendColumn('reltrend_last_value', 'Relative Score', 'number', 130),
  trendColumn('reltrend_five_day_score_chg', '5-Day Relative Chg', 'change', 145),
  trendColumn('close_over_ma1', 'Ratio > 50-Day Avg', 'number', 145),
  trendColumn('close_over_ma2', 'Ratio > 100-Day Avg', 'number', 150),
  trendColumn('close_over_ma3', 'Ratio > 200-Day Avg', 'number', 150),
  trendColumn('ma1_over_ma2', '50-Day Avg Ratio > 100-Day Avg Ratio', 'number', 230),
  trendColumn('ma1_over_ma3', '50-Day Avg Ratio > 200-Day Avg Ratio', 'number', 230),
  trendColumn('ma2_over_ma3', '100-Day Avg Ratio > 200-Day Avg Ratio', 'number', 238),
  trendColumn('ma1_over_ma1p', '50-Day Avg Ratio Rising', 'number', 180),
  trendColumn('ma2_over_ma2p', '100-Day Avg Ratio Rising', 'number', 185),
  trendColumn('ma3_over_ma3p', '200-Day Avg Ratio Rising', 'number', 185),
  trendColumn('channel_trend', '63-Day Ratio Breakout Trend', 'number', 205),
]

const consecutiveColumns: IndicatorTableColumn[] = [
  ...scoreColumns,
  trendColumn('trend_count_8_or_more', '# Days >= 8', 'number', 120),
  trendColumn('trend_count_less_8', '# Days < 8', 'number', 120),
  trendColumn('trend_count_2_or_less', '# Days <= 2', 'number', 120),
  trendColumn('reltrend_count_8_or_more', '# RelDays >= 8', 'number', 130),
  trendColumn('reltrend_count_less_8', '# RelDays < 8', 'number', 130),
  trendColumn('reltrend_count_2_or_less', '# RelDays <= 2', 'number', 130),
]

const rangeRankColumns: IndicatorTableColumn[] = [
  ...scoreColumns,
  trendColumn('rsr_rank10', 'Relative Strength Ratio Range Rank 10-Day', 'number', 240),
  trendColumn('rsr_rank21', 'Relative Strength Ratio Range Rank 21-Day', 'number', 240),
  trendColumn('rsr_rank42', 'Relative Strength Ratio Range Rank 42-Day', 'number', 240),
  trendColumn('rsr_rank63', 'Relative Strength Ratio Range Rank 63-Day', 'number', 240),
  trendColumn('rsr_rank84', 'Relative Strength Ratio Range Rank 84-Day', 'number', 240),
  trendColumn('rsr_rank126', 'Relative Strength Ratio Range Rank 126-Day', 'number', 248),
]

export function trendScoreColumns(option: TrendScoreOption, condition: TrendScoreCondition): IndicatorTableColumn[] {
  const prefix = identityColumns(Boolean(option.includeSector))

  if (condition === 'trend') return [...prefix, ...trendConditionColumns, trendSparklineColumn]
  if (condition === 'relative') return [...prefix, ...relativeConditionColumns, trendSparklineColumn]
  if (condition === 'consecutive') return [...prefix, ...consecutiveColumns, trendSparklineColumn]
  if (condition === 'rangeRank') return [...prefix, ...rangeRankColumns, trendSparklineColumn]

  return [...prefix, ...scoreColumns, trendSparklineColumn]
}

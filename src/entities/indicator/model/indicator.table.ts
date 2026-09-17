export const INDICATOR_PAGE_SIZE = 12

export type IndicatorTableColumnKind =
  | 'name'
  | 'text'
  | 'number'
  | 'change'
  | 'date'
  | 'sentiment'
  | 'sparkline'
  /** Renders an external anchor when the row carries a `raw.url`. */
  | 'link'

export interface IndicatorTableColumn {
  key: string
  label: string
  kind?: IndicatorTableColumnKind
  align?: 'left' | 'right' | 'center'
  minWidth?: number
  uppercase?: boolean
  /**
   * Date columns only: show the API string exactly as returned ("2026-09-15") rather
   * than a formatted date. Sorting still treats the column chronologically.
   *
   * Every indicator list column sets this. `researchPostColumns` is the one date column
   * that deliberately leaves it off, so its "Date Published" reads "July 16, 2026".
   */
  rawDate?: boolean
}

export interface IndicatorTableMeta {
  description: string | string[]
  bulletsIntro?: string
  bullets?: string[]
  postBullets?: string[]
  columns: IndicatorTableColumn[]
  showFavorite?: boolean
  showLegend?: boolean
  showSortNote?: boolean
}

const sentimentColumn: IndicatorTableColumn = {
  key: 'sentiment',
  label: 'Sentiment',
  kind: 'sentiment',
  minWidth: 150,
}

const trendColumn: IndicatorTableColumn = {
  key: 'trend',
  label: 'Trend (30D)',
  kind: 'sparkline',
  minWidth: 150,
}

const defaultIndicatorColumns: IndicatorTableColumn[] = [
  { key: 'chart_name', label: 'Indicator Name', kind: 'name', minWidth: 430 },
  { key: 'sub_type', label: 'Group', kind: 'text', minWidth: 150 },
  { key: 'timeframe', label: 'Time Frame', kind: 'text', minWidth: 130 },
  { key: 'last_value', label: 'Value', kind: 'number', align: 'right', minWidth: 120 },
  { key: 'last_change', label: 'Change', kind: 'change', align: 'right', minWidth: 110 },
  { key: 'last_update', label: 'Date', kind: 'date', rawDate: true, minWidth: 130 },
  sentimentColumn,
  trendColumn,
]

/**
 * Column set for the Indicator Detail page's Related Charts tab. Mirrors the default
 * list columns without the trend sparkline, because related charts are resolved on
 * demand and their trend series is never requested.
 */
export const relatedChartColumns: IndicatorTableColumn[] = [
  { key: 'chart_name', label: 'Name', kind: 'name', minWidth: 280 },
  { key: 'sub_type', label: 'Groups', kind: 'text', minWidth: 150 },
  { key: 'timeframe', label: 'Time Frame', kind: 'text', minWidth: 130 },
  { key: 'last_value', label: 'Value', kind: 'number', align: 'right', minWidth: 120 },
  { key: 'last_change', label: 'Change', kind: 'change', align: 'right', minWidth: 110 },
  { key: 'last_update', label: 'Date', kind: 'date', rawDate: true, minWidth: 130 },
  sentimentColumn,
]

/** Column set for the Indicator Detail page's Research & Blog Posts tab. */
export const researchPostColumns: IndicatorTableColumn[] = [
  { key: 'date', label: 'Date Published', kind: 'date', minWidth: 160 },
  { key: 'title', label: 'Title', kind: 'link', minWidth: 420 },
]

const optixColumns: IndicatorTableColumn[] = [
  { key: 'chart_name', label: 'Name', kind: 'name', minWidth: 270 },
  { key: 'url', label: 'Symbol', kind: 'text', uppercase: true, minWidth: 105 },
  { key: 'timeframe', label: 'Time Frame', kind: 'text', minWidth: 120 },
  { key: 'last_value', label: 'Value', kind: 'number', align: 'right', minWidth: 105 },
  { key: 'z_score', label: 'Z-Score', kind: 'number', align: 'right', minWidth: 110 },
  { key: 'last_change', label: 'Change', kind: 'change', align: 'right', minWidth: 105 },
  { key: 'last_update', label: 'Date', kind: 'date', rawDate: true, minWidth: 125 },
  sentimentColumn,
  trendColumn,
]

const etfColumns: IndicatorTableColumn[] = [
  { key: 'chart_name', label: 'Symbol', kind: 'name', uppercase: true, minWidth: 120 },
  { key: 'underlying_name', label: 'Name', kind: 'text', minWidth: 230 },
  { key: 'sub_type', label: 'Group', kind: 'text', minWidth: 145 },
  { key: 'timeframe', label: 'Time Frame', kind: 'text', minWidth: 120 },
  { key: 'last_value', label: 'Value', kind: 'number', align: 'right', minWidth: 105 },
  { key: 'last_change', label: 'Change', kind: 'change', align: 'right', minWidth: 105 },
  { key: 'last_update', label: 'Date', kind: 'date', rawDate: true, minWidth: 125 },
  sentimentColumn,
  trendColumn,
]

const flowColumns: IndicatorTableColumn[] = [
  { key: 'chart_name', label: 'Symbol', kind: 'name', uppercase: true, minWidth: 120 },
  { key: 'underlying_name', label: 'Name', kind: 'text', minWidth: 250 },
  { key: 'sub_type', label: 'Group', kind: 'text', minWidth: 140 },
  { key: 'last_value', label: 'Value', kind: 'number', align: 'right', minWidth: 120 },
  { key: 'last_change', label: 'Change', kind: 'change', align: 'right', minWidth: 120 },
  { key: 'last_update', label: 'Date', kind: 'date', rawDate: true, minWidth: 130 },
  trendColumn,
]

const etfBreadthColumns: IndicatorTableColumn[] = [
  { key: 'chart_name', label: 'Breadth Measure', kind: 'name', minWidth: 280 },
  { key: 'underlying_name', label: 'Name', kind: 'text', minWidth: 220 },
  { key: 'timeframe', label: 'Time Frame', kind: 'text', minWidth: 120 },
  { key: 'last_value', label: 'Value', kind: 'number', align: 'right', minWidth: 120 },
  { key: 'last_change', label: 'Change', kind: 'change', align: 'right', minWidth: 120 },
  { key: 'last_update', label: 'Date', kind: 'date', rawDate: true, minWidth: 130 },
  sentimentColumn,
]

const indexBreadthColumns: IndicatorTableColumn[] = [
  { key: 'chart_name', label: 'Breadth Measure', kind: 'name', minWidth: 280 },
  { key: 'sub_type', label: 'Sub Type', kind: 'text', minWidth: 150 },
  { key: 'timeframe', label: 'Time Frame', kind: 'text', minWidth: 120 },
  { key: 'last_value', label: 'Value', kind: 'number', align: 'right', minWidth: 120 },
  { key: 'last_change', label: 'Change', kind: 'change', align: 'right', minWidth: 120 },
  { key: 'last_update', label: 'Date', kind: 'date', rawDate: true, minWidth: 130 },
  sentimentColumn,
]

const commoditySeasonalityColumns: IndicatorTableColumn[] = [
  { key: 'chart_name', label: 'Symbol', kind: 'name', uppercase: true, minWidth: 140 },
  { key: 'underlying_name', label: 'Name', kind: 'text', minWidth: 260 },
  { key: 'sub_type', label: 'Group', kind: 'text', minWidth: 150 },
  { key: 'win_rate', label: 'Win Rate', kind: 'number', align: 'right', minWidth: 120 },
  { key: 'avg_return', label: 'Avg Return', kind: 'number', align: 'right', minWidth: 125 },
  { key: 'last_update', label: 'Date', kind: 'date', rawDate: true, minWidth: 130 },
]

const etfSeasonalityColumns: IndicatorTableColumn[] = [
  { key: 'chart_name', label: 'Symbol', kind: 'name', uppercase: true, minWidth: 140 },
  { key: 'underlying_name', label: 'Name', kind: 'text', minWidth: 260 },
  { key: 'groups', label: 'Group', kind: 'text', minWidth: 150 },
  { key: 'win_rate', label: 'Win Rate', kind: 'number', align: 'right', minWidth: 120 },
  { key: 'avg_return', label: 'Avg Return', kind: 'number', align: 'right', minWidth: 125 },
  { key: 'avg_net_return', label: 'Avg Net Return', kind: 'number', align: 'right', minWidth: 140 },
  { key: 'last_update', label: 'Date', kind: 'date', rawDate: true, minWidth: 130 },
]

const bondSeasonalityColumns: IndicatorTableColumn[] = [
  { key: 'chart_name', label: 'Name', kind: 'name', minWidth: 140 },
  { key: 'sub_type', label: 'Group', kind: 'text', minWidth: 150 },
  { key: 'win_rate', label: 'Win Rate', kind: 'number', align: 'right', minWidth: 120 },
  { key: 'avg_return', label: 'Avg Return', kind: 'number', align: 'right', minWidth: 125 },
  { key: 'last_update', label: 'Date', kind: 'date', rawDate: true, minWidth: 130 },
]

const cotColumns: IndicatorTableColumn[] = [
  { key: 'chart_name', label: 'Name', kind: 'name', minWidth: 260 },
  { key: 'symbol', label: 'Symbol', kind: 'text', uppercase: true, minWidth: 110 },
  { key: 'last_value', label: 'Last Value', kind: 'number', align: 'right', minWidth: 130 },
  { key: 'net_position', label: 'Net Position', kind: 'number', align: 'right', minWidth: 140 },
  { key: 'three_year_max', label: '3-Year Max', kind: 'number', align: 'right', minWidth: 130 },
  { key: 'three_year_min', label: '3-Year Min', kind: 'number', align: 'right', minWidth: 130 },
  { key: 'last_update', label: 'Last Update', kind: 'date', rawDate: true, minWidth: 135 },
]

const overviewColumns: IndicatorTableColumn[] = [
  { key: 'chart_name', label: 'Name', kind: 'name', minWidth: 300 },
  { key: 'All Countries', label: 'All Countries', kind: 'text', minWidth: 150 },
  { key: 'Developed Markets', label: 'Developed Markets', kind: 'text', minWidth: 170 },
  { key: 'Emerging Markets', label: 'Emerging Markets', kind: 'text', minWidth: 170 },
  { key: 'last_update', label: 'Date', kind: 'date', rawDate: true, minWidth: 130 },
]

const timeFrameBullets = [
  'Short = Short-term (several days)',
  'Medium = Medium-term (one to three months)',
  'Long = Long-term (longer than three months)',
]

const sentimentIconDescription =
  'Each indicator in the table is accompanied by a sentiment reading from 1 to 7. Scores 1, 2, and 3 fill the left green side and mean Extremely Pessimistic, Very Pessimistic, and Pessimistic. Score 4 is Neutral and leaves all boxes empty. Scores 5, 6, and 7 fill the right red side and mean Optimistic, Very Optimistic, and Extremely Optimistic. More extreme readings generally carry a stronger contrary signal.'

function indicatorDescription(marketName: string) {
  return {
    description: [
      `The following table shows indicators related to ${marketName}. Click any column heading to sort the table by that column, and click again to reverse it. Click the Sentiment table header to sort by indicators showing the most pessimism or optimism. Click the model or indicator name to view the interactive chart for that indicator.`,
      'Daily models and indicators are usually updated by 6pm EST, except for Rydex which is usually updated by 10pm EST.',
    ],
    bulletsIntro: 'The "TIME FRAME" column shows the applicable time frame for each indicator:',
    bullets: timeFrameBullets,
    postBullets: [sentimentIconDescription],
  }
}

function optixDescription(universeName: string) {
  return [
    `The following table shows the Optimism Index (Optix) for each stock in the ${universeName}. Click any column heading to sort the table by that column, and click again to reverse it.`,
    'Click the excess or Sentiment column to sort the table by stocks showing the most pessimism or optimism. Click the hyperlinked ticker or name to open the interactive chart page.',
    'The best prospects for potential long positions have an Optix between 50 and 75, or below 25 when pessimism is excessive. Prospects to avoid generally have an Optix between 25 and 50, or above 75 when optimism is excessive. The Z-Score column helps compare each sentiment value with its own typical range.',
  ]
}

const tableMetaBySource: Record<string, IndicatorTableMeta> = {
  stock_complete_list: {
    ...indicatorDescription('the stock market'),
    columns: defaultIndicatorColumns,
  },
  macro_indicator_list: {
    ...indicatorDescription('macroeconomic conditions, liquidity, and investor behavior'),
    columns: defaultIndicatorColumns,
  },
  jk_complete_list: {
    description: [
      'This table shows Jay Kaeppel indicators and models. Click any column heading to sort the table by that column, and click again to reverse it.',
      'Click an indicator name to open the chart and review the full signal history.',
    ],
    columns: defaultIndicatorColumns,
  },
  bond_complete_list: {
    ...indicatorDescription('the bond market'),
    columns: defaultIndicatorColumns,
  },
  commodity_complete_list: {
    ...indicatorDescription('commodity markets'),
    columns: defaultIndicatorColumns,
  },
  ndx_100_complete_list: { description: optixDescription('NASDAQ 100'), columns: optixColumns },
  sp_1500_complete_list: { description: optixDescription('S&P 1500'), columns: optixColumns },
  russell_1000_complete_list: { description: optixDescription('Russell 1000'), columns: optixColumns },
  russell_2000_complete_list: { description: optixDescription('Russell 2000'), columns: optixColumns },
  russell_3000_complete_list: { description: optixDescription('Russell 3000'), columns: optixColumns },
  crypt_complete_list: {
    description: [
      'The following table shows the Optimism Index (Optix) for crypto assets. Click any column heading to sort the table by that column, and click again to reverse it.',
      'Click the excess or Sentiment column to sort by assets showing the most pessimism or optimism. Click the hyperlinked ticker or name to open the interactive chart page.',
      'Optix, Z-Score, change, and sentiment help compare each asset with its own typical sentiment range.',
    ],
    columns: optixColumns,
  },
  etf_complete_list: {
    description: [
      'The following table shows the Optimism Index (Optix) for the most active exchange-traded funds. Some sector funds also include related breadth information.',
      'Click any column heading to sort the table by that column, and click again to reverse it. Click the excess or Sentiment column to sort by ETFs showing the most pessimism or optimism. Click the ticker symbol to open the interactive chart for that fund.',
      'The best prospects for potential long positions have an Optix between 50 and 75, or below 25 when pessimism is excessive. Prospects to avoid generally have an Optix between 25 and 50, or above 75 when optimism is excessive.',
      'ETF models and indicators are usually updated by 6pm EST, except for Rydex which is usually updated by 10pm EST.',
    ],
    bulletsIntro: 'The "TIME FRAME" column shows the applicable time frame for each indicator:',
    bullets: timeFrameBullets,
    postBullets: [sentimentIconDescription],
    columns: etfColumns,
  },
  etf_flow: {
    description: [
      'The following table shows fund flow readings for the most active exchange-traded funds.',
      'Click any column heading to sort the table by that column, and click again to reverse it. Large inflows and outflows can help identify sentiment extremes across ETF groups.',
    ],
    columns: flowColumns,
    showLegend: false,
  },
  monthly_fund_flows: {
    description: 'This table summarizes monthly ETF fund flow readings for the selected ETF universe. Click any column heading to sort the table by that column, and click again to reverse it.',
    columns: flowColumns,
    showLegend: false,
  },
  shares_outstanding: {
    description: 'The following table shows shares outstanding for the most active exchange-traded funds. Click any column heading to sort the table by that column, and click again to reverse it. Changes in shares outstanding can help identify investor demand and positioning.',
    columns: flowColumns,
    showLegend: false,
  },
  etf_breadth: {
    description: [
      'This table tracks ETF sector breadth measures and their recent changes.',
      'Click any column heading to sort the table by that column, and use the readings to compare participation across ETF sectors.',
    ],
    columns: etfBreadthColumns,
  },
  country_breadth: {
    description: [
      'This table tracks international breadth indicators in real time across all countries, developed markets, emerging markets, Asia Pacific, Europe, and South America.',
      'These indicators reveal trend strength, price momentum, and market sentiment for assets in different countries or regions.',
    ],
    columns: indexBreadthColumns,
  },
  crypto_breadth: {
    description: [
      'This table tracks breadth measures across crypto assets.',
      'Use these readings to identify participation and trend strength within the crypto market.',
    ],
    columns: indexBreadthColumns,
  },
  commod_seasonality: {
    description: 'This table shows seasonal tendencies for commodity markets, including win rate and average return statistics. Click any column heading to sort the table by that column, and click again to reverse it.',
    columns: commoditySeasonalityColumns,
    showLegend: false,
  },
  etf_seasonality: {
    description: 'This table shows ETF seasonality statistics, including win rate, average return, and average net return where available. Click any column heading to sort the table by that column, and click again to reverse it.',
    columns: etfSeasonalityColumns,
    showLegend: false,
  },
  bond_seasonality: {
    description: 'This table shows seasonal tendencies for bond markets, including win rate and average return statistics. Click any column heading to sort the table by that column, and click again to reverse it.',
    columns: bondSeasonalityColumns,
    showLegend: false,
  },
  cot_max_min: {
    description: 'This screen displays commodity hedger positions trading at 3-year maximums, highlighted in green, and 3-year minimums, highlighted in red.',
    columns: cotColumns,
    showLegend: false,
    showSortNote: false,
  },
  country_breadth_overview: {
    description: [
      'This summary page presents an overview of global breadth indicators derived from worldwide indexes and categorized by all countries, developed markets, emerging markets, and regions.',
      'These global breadth indicators provide a comprehensive view of market participation across geographies, helping identify areas of relative strength or weakness, regional leadership trends, and shifts in market momentum.',
      'Color-coded cells link to charts where users can analyze historical trends and test concepts with the backtest engine.',
    ],
    columns: overviewColumns,
    showFavorite: false,
    showLegend: false,
    showSortNote: false,
  },
  commod_spotlight: {
    description: 'This page displays thumbnail charts for Currency & Commodity Optimism Index moving averages. Chart titles link to their detailed chart pages. If the page is blank, give it a second to load.',
    columns: defaultIndicatorColumns,
    showLegend: false,
    showSortNote: false,
  },
  sector_spotlight: {
    description: 'This page displays thumbnail charts for Sector ETF Optimism Index moving averages. Chart titles link to their detailed chart pages. If the page is blank, give it a second to load.',
    columns: defaultIndicatorColumns,
    showLegend: false,
    showSortNote: false,
  },
  country_spotlight: {
    description: 'This page displays thumbnail charts for Country ETF Optimism Index moving averages. Chart titles link to their detailed chart pages. If the page is blank, give it a second to load.',
    columns: defaultIndicatorColumns,
    showLegend: false,
    showSortNote: false,
  },
}

export function getIndicatorTableMeta(source: string): IndicatorTableMeta {
  return tableMetaBySource[source] ?? {
    ...indicatorDescription('the stock market'),
    columns: defaultIndicatorColumns,
  }
}

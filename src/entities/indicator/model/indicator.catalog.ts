import type { IndicatorGroup } from './indicator.types'

export const indicatorGroups: IndicatorGroup[] = [
  {
    id: 'stock-sentiment',
    label: 'Stock Market Sentiment Indicators',
    description: 'Browse and analyze stock market sentiment indicators by index, crypto, and active ETFs.',
    source: 'ndx_100_complete_list',
    views: 7,
    icon: 'candlestick',
    subgroups: [
      { id: 'nasdaq100', label: 'NASDAQ 100', source: 'ndx_100_complete_list', fullName: 'NASDAQ 100 Stock Sentiment' },
      { id: 'sp1500', label: 'S&P 1500', source: 'sp_1500_complete_list', fullName: 'S&P 1500 Stock Sentiment' },
      { id: 'russell1000', label: 'Russell 1000', source: 'russell_1000_complete_list', fullName: 'Russell 1000 Stock Sentiment' },
      { id: 'russell2000', label: 'Russell 2000', source: 'russell_2000_complete_list', fullName: 'Russell 2000 Stock Sentiment' },
      { id: 'russell3000', label: 'Russell 3000', source: 'russell_3000_complete_list', fullName: 'Russell 3000 Stock Sentiment' },
      { id: 'crypto', label: 'Crypto Optix', source: 'crypt_complete_list', fullName: 'Crypto Optix' },
      { id: 'etf-sentiment', label: 'Most Active ETF Sentiment', source: 'etf_complete_list', fullName: 'Most Active ETF Sentiment' },
    ],
  },
  {
    id: 'stock',
    label: 'Stock Market',
    description: 'Browse and analyze sentiment indicators for the U.S. stock market.',
    source: 'stock_complete_list',
    views: 1,
    icon: 'candlestick',
    subgroups: [
      { id: 'stock', label: 'Stock Market', source: 'stock_complete_list', fullName: 'Stock Market Indicators' },
    ],
  },
  {
    id: 'macro',
    label: 'Macro',
    description: 'Macroeconomic conditions, liquidity, and investor behavior.',
    source: 'macro_indicator_list',
    views: 2,
    icon: 'spline',
    subgroups: [
      { id: 'macro', label: 'Macroeconomic Conditions', source: 'macro_indicator_list', fullName: 'Macroeconomic Conditions' },
      { id: 'kaeppel', label: 'Jay Kaeppel Indicators', source: 'jk_complete_list', fullName: 'Jay Kaeppel’s Indicators' },
    ],
  },
  {
    id: 'etf',
    label: 'ETF',
    description: 'ETF sentiment, fund flow, monthly flows, and shares outstanding.',
    source: 'etf_flow',
    views: 3,
    icon: 'dollar',
    subgroups: [
      { id: 'etf-flow', label: 'Most Active ETF Fund Flow', source: 'etf_flow', fullName: 'Most Active ETF Fund Flow' },
      { id: 'etf-monthly', label: 'Monthly Fund Flow', source: 'monthly_fund_flows', fullName: 'Monthly Fund Flow' },
      { id: 'etf-shares', label: 'Most Active ETF Shares Outstanding', source: 'shares_outstanding', fullName: 'Most Active ETF Shares Outstanding' },
    ],
  },
  {
    id: 'bond-commodity',
    label: 'Bond & Commodity',
    description: 'Bond and commodity sentiment plus COT extremes.',
    source: 'bond_complete_list',
    views: 3,
    icon: 'scale',
    subgroups: [
      { id: 'bond', label: 'Bond Market Indicators', source: 'bond_complete_list', fullName: 'Bond Market Indicators' },
      { id: 'commodity', label: 'Commodity Market Indicators', source: 'commodity_complete_list', fullName: 'Commodity Market Indicators' },
      { id: 'cot', label: 'Commodity Hedgers Min/Max', source: 'cot_max_min', fullName: 'Commodity Hedgers - 3-year Min/Max' },
    ],
  },
  {
    id: 'breadth',
    label: 'Breadth',
    description: 'ETF sector, global index, and crypto breadth screens.',
    source: 'etf_breadth',
    views: 3,
    icon: 'network',
    subgroups: [
      { id: 'etf-breadth', label: 'ETF Sector Breadth', source: 'etf_breadth', fullName: 'ETF Sector Breadth' },
      { id: 'global-breadth', label: 'Global Index Breadth', source: 'country_breadth', fullName: 'Global Index Breadth' },
      { id: 'crypto-breadth', label: 'Crypto Currency Breadth', source: 'crypto_breadth', fullName: 'Crypto Currency Breadth' },
    ],
  },
  {
    id: 'seasonality',
    label: 'Seasonality',
    description: 'Seasonal tendencies across commodities, ETFs, and bonds.',
    source: 'commod_seasonality',
    views: 3,
    icon: 'calendarRange',
    subgroups: [
      { id: 'commodity-seasonality', label: 'Commodity Market Seasonality', source: 'commod_seasonality', fullName: 'Commodity Market Seasonality' },
      { id: 'etf-seasonality', label: 'ETF Seasonality', source: 'etf_seasonality', fullName: 'ETF Seasonality'},
      { id: 'bond-seasonality', label: 'Bond Market Seasonality', source: 'bond_seasonality', fullName: 'Bond Market Seasonality' },
    ],
  },
  {
    id: 'overview',
    label: 'Overview',
    description: 'High level breadth, spotlight, and market overview panels.',
    source: 'country_breadth_overview',
    views: 4,
    icon: 'dashboard',
    subgroups: [
      { id: 'global-overview', label: 'Global Breadth Overview', source: 'country_breadth_overview', fullName: 'Global Breadth Overview' },
      { id: 'commodity-overview', label: 'Currency & Commodity Sentiment Overview', source: 'commod_spotlight', fullName: 'Currency & Commodity Sentiment Overview' },
      { id: 'sector-overview', label: 'ETF Sector Overview', source: 'sector_spotlight', fullName: 'ETF Sector Overview' },
      { id: 'country-overview', label: 'ETF Country Overview', source: 'country_spotlight', fullName: 'ETF Country Overview' },
    ],
  },
]

/** Subgroup id → its group, for restoring a list from the route. */
export const indicatorSubgroupIndex = new Map(
  indicatorGroups.flatMap((group) => group.subgroups.map((subgroup) => [subgroup.id, { group, subgroup }] as const)),
)

export const indicatorSourceLabels = new Map(
  indicatorGroups.flatMap((group) =>
    group.subgroups.map((subgroup) => [subgroup.source, { group, subgroup }] as const),
  ),
)

export const totalIndicatorCount = 593

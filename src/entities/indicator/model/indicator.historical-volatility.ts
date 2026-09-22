import { trendSparklineColumn, type IndicatorTableColumn } from './indicator.table'

export type HistoricalVolatilityOptionId =
  | 'HistoricalSP500Score'
  | 'HistoricalSP1500Score'
  | 'HistoricalNDX100Score'
  | 'HistoricalRussellScore'
  | 'HistoricalDomesticETFScore'
  | 'HistoricalForeignETFScore'
  | 'HistoricalOtherAssetsETFScore'

export interface HistoricalVolatilityOption {
  id: HistoricalVolatilityOptionId
  label: string
  source: string
  includeSector?: boolean
}

export const historicalVolatilityOptions: HistoricalVolatilityOption[] = [
  { id: 'HistoricalSP500Score', label: 'S&P 500', source: 'historical_spx', includeSector: true },
  { id: 'HistoricalSP1500Score', label: 'S&P 1500', source: 'historical_sp1500', includeSector: true },
  { id: 'HistoricalNDX100Score', label: 'NDX', source: 'historical_ndx', includeSector: true },
  { id: 'HistoricalRussellScore', label: 'Russell 3000', source: 'historical_russell', includeSector: true },
  { id: 'HistoricalDomesticETFScore', label: 'Domestic ETF', source: 'historical_etf_domestic' },
  { id: 'HistoricalForeignETFScore', label: 'Foreign ETF', source: 'historical_etf_foreign' },
  { id: 'HistoricalOtherAssetsETFScore', label: 'Other Assets', source: 'historical_etf_other' },
]

function historicalColumn(
  key: string,
  label: string,
  kind: IndicatorTableColumn['kind'] = 'number',
  minWidth = 118,
  extra: Partial<IndicatorTableColumn> = {},
): IndicatorTableColumn {
  return { key, label, kind, align: kind === 'text' || kind === 'name' ? 'left' : 'right', minWidth, ...extra }
}

export function historicalVolatilityColumns(option: HistoricalVolatilityOption): IndicatorTableColumn[] {
  const percentNumberColumn: Partial<IndicatorTableColumn> = { trimTrailingZeros: true, valueSuffix: '%' }

  return [
    { key: 'market_symbol', label: 'Symbol', kind: 'name', minWidth: 78, uppercase: true },
    { key: 'chart_name', label: 'Name', kind: 'text', minWidth: 220 },
    ...(option.includeSector ? [historicalColumn('sector_name', 'Sector', 'text', 74)] : []),
    historicalColumn('volatility_20d', 'Volatility 20d', 'number', 130, percentNumberColumn),
    historicalColumn('volatility_60d', 'Volatility 60d', 'number', 130, percentNumberColumn),
    historicalColumn('volatility_diff', 'Volatility Diff', 'change', 110, {
      ...percentNumberColumn,
      showChangeArrow: true,
    }),
    trendSparklineColumn,
  ]
}

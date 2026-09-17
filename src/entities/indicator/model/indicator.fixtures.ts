import { indicatorSourceLabels } from './indicator.catalog'
import { sentimentFromScore } from './indicator.sentiment'
import type { Indicator, IndicatorDetail, IndicatorRawRow } from './indicator.types'

export { sentimentFromScore } from './indicator.sentiment'

const baseRows: Array<{
  id: string
  name: string
  value: number
  change: number
  timeFrame: string
  score: number
  favorite?: boolean
}> = [
  {
    id: 'comm-services-sp500-relative-trend',
    name: '% of Communication Services Stocks in S&P 500',
    value: 0,
    change: 0,
    timeFrame: 'Medium',
    score: 3,
    favorite: true,
  },
  {
    id: 'discretionary-sp500-relative-trend-score-8',
    name: '% of Discretionary Stocks in S&P 500 with Relative Trend Score >= 8',
    value: 0.4,
    change: -0.4,
    timeFrame: 'Medium',
    score: 3,
    favorite: true,
  },
  {
    id: 'energy-sp500-relative-trend',
    name: '% of Energy Stocks in S&P 500 with Relative Trend',
    value: 0.6,
    change: 0,
    timeFrame: 'Medium',
    score: 3,
  },
  {
    id: 'financials-sp500-relative-trend',
    name: '% of Financials Stocks in S&P 500 with Relative Trend',
    value: 1.39,
    change: -0.4,
    timeFrame: 'Medium',
    score: 3,
  },
  {
    id: 'health-care-sp500-relative-trend',
    name: '% of Health Care Stocks in S&P 500 with Relative Trend',
    value: 2.78,
    change: 0,
    timeFrame: 'Medium',
    score: 4,
  },
  {
    id: 'industrials-sp500-relative-trend',
    name: '% of Industrials Stocks in S&P 500 with Relative Trend',
    value: 1.19,
    change: 0,
    timeFrame: 'Medium',
    score: 3,
  },
  {
    id: 'materials-sp500-relative-trend',
    name: '% of Materials Stocks in S&P 500 with Relative Trend',
    value: 0.4,
    change: -0.2,
    timeFrame: 'Medium',
    score: 3,
  },
  {
    id: 'real-estate-sp500-relative-trend',
    name: '% of Real Estate Stocks in S&P 500 with Relative Trend',
    value: 0.2,
    change: 0,
    timeFrame: 'Medium',
    score: 3,
  },
  {
    id: 'sp500-relative-trend',
    name: '% of S&P 500 Stocks in S&P 500 with Relative Trend',
    value: 9.54,
    change: -1,
    timeFrame: 'Medium',
    score: 4,
    favorite: true,
  },
  {
    id: 'staples-sp500-relative-trend',
    name: '% of Staples Stocks in S&P 500 with Relative Trend',
    value: 0.2,
    change: -0.4,
    timeFrame: 'Medium',
    score: 3,
  },
  {
    id: 'technology-sp500-relative-trend',
    name: '% of Technology Stocks in S&P 500 with Relative Trend',
    value: 2.39,
    change: 0.6,
    timeFrame: 'Medium',
    score: 4,
  },
  {
    id: 'sp500-bullish-percent-index',
    name: 'S&P 500 Bullish Percent Index',
    value: 62.1,
    change: 1.3,
    timeFrame: 'Daily',
    score: 3,
  },
  {
    id: 'sp500-new-highs-new-lows',
    name: 'S&P 500 New Highs - New Lows',
    value: 145,
    change: -23,
    timeFrame: 'Daily',
    score: 3,
  },
  {
    id: 'equity-put-call-ratio',
    name: 'Put/Call Ratio (Equity)',
    value: 0.72,
    change: -0.05,
    timeFrame: 'Daily',
    score: 4,
  },
  {
    id: 'aaii-bull-bear-spread',
    name: 'AAII Bull-Bear Spread',
    value: 12.4,
    change: 2.1,
    timeFrame: 'Weekly',
    score: 3,
  },
  {
    id: 'naaim-exposure-index',
    name: 'NAAIM Exposure Index',
    value: 67.3,
    change: -4.2,
    timeFrame: 'Weekly',
    score: 3,
  },
  {
    id: 'cboe-volatility-index-vix',
    name: 'CBOE Volatility Index (VIX)',
    value: 16.8,
    change: -0.9,
    timeFrame: 'Daily',
    score: 2,
  },
  {
    id: 'equity-risk-premium-sp500',
    name: 'Equity Risk Premium (S&P 500)',
    value: 3.21,
    change: 0.08,
    timeFrame: 'Monthly',
    score: 3,
  },
  {
    id: 'corporate-insider-buy-sell-ratio',
    name: 'Corporate Insider Buy/Sell Ratio',
    value: 0.36,
    change: -0.04,
    timeFrame: 'Weekly',
    score: 2,
  },
  {
    id: 'sp500-above-200-day-moving-average',
    name: 'S&P 500 % Above 200-Day Moving Average',
    value: 58.7,
    change: 1.6,
    timeFrame: 'Daily',
    score: 3,
  },
]

export function makeTrend(seed: number, direction: 'up' | 'down' | 'flat' = 'up', points = 26) {
  return Array.from({ length: points }, (_, index) => {
    const drift = direction === 'up' ? index * 1.4 : direction === 'down' ? (points - index) * 1.1 : 26
    const wave = Math.sin((index + seed) * 0.85) * 5
    const jitter = ((index * seed) % 7) - 3
    return Math.max(2, Math.round((18 + drift + wave + jitter) * 10) / 10)
  })
}

export function getSeededIndicators(source = 'stock_complete_list'): Indicator[] {
  const sourceMeta = indicatorSourceLabels.get(source) ?? indicatorSourceLabels.get('stock_complete_list')
  const group = sourceMeta?.group
  const subgroup = sourceMeta?.subgroup
  const sourceName = subgroup?.label ?? 'Stock Market'
  const groupName = group?.label ?? 'Stock Market'

  const modifier = source === 'most_popular' ? 2 : source.length % 6
  const rows = source === 'most_popular' ? [...baseRows].sort((a, b) => b.value - a.value).slice(0, 18) : baseRows

  return rows.map((row, index) => {
    const direction = row.change < 0 ? 'down' : row.change > 0 ? 'up' : index % 4 === 0 ? 'flat' : 'up'
    return {
      id: row.id,
      name: source === 'stock_complete_list' || source === 'most_popular' ? row.name : row.name.replace('S&P 500', sourceName),
      group: groupName,
      groupId: group?.id ?? 'stock',
      subgroup: sourceName,
      sourceList: source,
      timeFrame: row.timeFrame,
      currentValue: Number((row.value + modifier / 10).toFixed(2)),
      change: row.change,
      updatedAt: '2026-09-08',
      sentiment: sentimentFromScore(row.score),
      sentimentScore: row.score,
      trend: makeTrend(index + modifier + 1, direction),
      favorite: Boolean(row.favorite),
      type: 'Indicator',
      marketSymbol: 'SPX',
    }
  })
}

export function getSeededRawIndicators(source = 'stock_complete_list'): IndicatorRawRow[] {
  return getSeededIndicators(source).map((item) => ({
    url: item.id,
    chart_name: item.name,
    groups: item.group,
    sub_type: item.subgroup,
    timeframe: item.timeFrame,
    last_value: item.currentValue,
    last_change: item.change,
    last_update: item.updatedAt,
    sentiment: item.sentimentScore,
    favorite: item.favorite,
    type: item.type,
    source_list: item.sourceList,
    market_symbol: item.marketSymbol,
  }))
}

export function getSeededIndicatorDetail(id: string): IndicatorDetail {
  const indicator =
    getSeededIndicators('stock_complete_list').find((item) => item.id === id) ??
    getSeededIndicators('most_popular').find((item) => item.id === id) ??
    getSeededIndicators('stock_complete_list')[1]

  return {
    id: indicator.id,
    title: indicator.name,
    group: indicator.group,
    timeFrame: indicator.timeFrame,
    updateSchedule: 'Daily',
    source: 'SentimenTrader',
    currentValue: indicator.currentValue,
    change: indicator.change,
    updatedAt: indicator.updatedAt,
    sentiment: indicator.sentiment,
    sentimentScore: indicator.sentimentScore,
    description:
      'The percentage of Consumer Discretionary stocks in the S&P 500 with a Relative Trend Score of 8 or higher.',
    interpretation:
      'Higher readings indicate broader participation and stronger relative performance within the group. Low readings suggest weakening participation and potentially defensive market behavior.',
    construction:
      'Relative Trend Score measures the strength of each stock trend compared with the S&P 500. This indicator calculates the percentage of constituents with a Relative Trend Score greater than or equal to 8.',
    constructionHtml:
      'Relative Trend Score measures the strength of each stock trend compared with the S&P 500. This indicator calculates the percentage of constituents with a Relative Trend Score greater than or equal to 8.',
    currentReading:
      `At ${indicator.currentValue}, the current reading is near the lower end of its recent range, suggesting weak participation among ${indicator.group} indicators.`,
    related: ['Sector Trend Score (XLY)', 'S&P 500 Bullish Percent Index', 'Equity Put/Call Ratio'],
    relatedCharts: [
      { title: 'Sector Trend Score (XLY)', url: 'xly_reltrend_above8_spx_ratio', type: 'Indicator' },
      { title: 'S&P 500 Bullish Percent Index', url: 'spx_bullish_percent', type: 'Indicator' },
      { title: 'Equity Put/Call Ratio', url: 'equity_put_call_ratio', type: 'Indicator' },
    ],
    constituentConditions: [],
    research: ['Participation is narrowing beneath the surface', 'Risk appetite improves when breadth expands'],
    blogResults: [
      {
        title: 'Participation is narrowing beneath the surface',
        url: 'https://sentimentrader.com/blog/participation-is-narrowing-beneath-the-surface',
      },
      {
        title: 'Risk appetite improves when breadth expands',
        url: 'https://sentimentrader.com/blog/risk-appetite-improves-when-breadth-expands',
      },
    ],
    thresholdRows: [
      { location: 'Above Extreme', annualizedReturn: '7.5%', percentTime: '18.2%' },
      { location: 'Between Extremes', annualizedReturn: '4.1%', percentTime: '61.4%' },
      { location: 'Below Extreme', annualizedReturn: '11.8%', percentTime: '20.4%' },
    ],
    returnSegments: [
      { Location: 'Above Extreme', Return: 7.5, Time: 18.2 },
      { Location: 'Between Extremes', Return: 4.1, Time: 61.4 },
      { Location: 'Below Extreme', Return: 11.8, Time: 20.4 },
    ],
    showReturns: true,
    trend: makeTrend(11, indicator.change < 0 ? 'down' : 'up', 56),
    benchmarkTrend: makeTrend(5, 'up', 56).map((value) => value + 42),
    type: indicator.type,
    marketSymbol: indicator.marketSymbol,
    sourceList: indicator.sourceList,
    pess: 10,
    opt: 60,
  }
}

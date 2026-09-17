import { normalizeSentimentScore, sentimentFromScore } from './indicator.sentiment'
import type { Indicator, IndicatorDetail, IndicatorRelatedChart } from './indicator.types'

/**
 * Related charts arrive as a thin payload (title, url, type), so their table rows are
 * built in two steps: reuse a full indicator row the store already holds, and only
 * fetch the detail for the charts that are still missing one.
 */

/** Neutral score. `normalizeSentimentScore` clamps 0 up to 1 ("Extremely Pessimistic"). */
const neutralSentimentScore = 4

function baseRelatedRow(chart: IndicatorRelatedChart): Indicator {
  return {
    id: chart.url,
    name: chart.title,
    group: chart.type ?? '',
    groupId: '',
    subgroup: chart.type ?? '',
    sourceList: '',
    timeFrame: '',
    currentValue: Number.NaN,
    change: Number.NaN,
    updatedAt: '',
    sentiment: 'neutral',
    sentimentScore: neutralSentimentScore,
    trendLines: [],
    favorite: false,
    type: chart.type ?? 'Indicator',
    raw: { chart_name: chart.title, url: chart.url, type: chart.type },
  }
}

/**
 * A related chart with no resolvable data. Value and Change render as "—" because
 * `formatIndicatorNumber` maps a non-finite number to "—".
 */
export function unresolvedRelatedChartRow(chart: IndicatorRelatedChart): Indicator {
  return baseRelatedRow(chart)
}

/**
 * Build a row from a fetched detail. Only call this with a detail whose id matches
 * the chart's url — see `isDetailForChart`.
 */
export function indicatorFromRelatedChart(chart: IndicatorRelatedChart, detail: IndicatorDetail): Indicator {
  return {
    ...baseRelatedRow(chart),
    id: detail.id || chart.url,
    name: detail.title || chart.title,
    group: detail.group || chart.type || '',
    subgroup: detail.group || chart.type || '',
    timeFrame: detail.timeFrame ?? '',
    currentValue: detail.currentValue,
    change: detail.change,
    updatedAt: detail.updatedAt ?? '',
    sentiment: detail.sentiment ?? sentimentFromScore(detail.sentimentScore),
    sentimentScore: normalizeSentimentScore(detail.sentimentScore),
    trendLines: detail.trendLines ?? [],
    type: detail.type || chart.type || 'Indicator',
    raw: {
      chart_name: detail.title || chart.title,
      sub_type: detail.group || chart.type,
      groups: detail.group || chart.type,
      last_value: detail.currentValue,
      last_change: detail.change,
      last_change_type: detail.raw?.last_change_type,
      last_update: detail.updatedAt,
      sentiment: detail.sentimentScore,
      url: detail.id || chart.url,
      type: detail.type || chart.type,
    },
  }
}

/**
 * `fetchIndicatorDetail` never rejects: for an unknown id it resolves to a seeded
 * detail for an unrelated indicator. Guard against rendering that as if it were the
 * related chart.
 */
export function isDetailForChart(chart: IndicatorRelatedChart, detail: IndicatorDetail) {
  return Boolean(detail.id) && detail.id.toLowerCase() === chart.url.toLowerCase()
}

export interface RelatedChartRows {
  /** Rows resolved from an indicator the store already holds. */
  rows: Indicator[]
  /** Charts with no store row, in payload order, awaiting a detail fetch. */
  pending: IndicatorRelatedChart[]
}

/**
 * Split related charts into rows we can render immediately and charts that need a
 * detail fetch. Drops self-references and duplicates, keeping the first occurrence.
 */
export function mergeRelatedChartRows(
  charts: IndicatorRelatedChart[],
  lookup: (id: string) => Indicator | undefined,
  currentIndicatorId = '',
): RelatedChartRows {
  const rows: Indicator[] = []
  const pending: IndicatorRelatedChart[] = []
  const seen = new Set<string>([currentIndicatorId.toLowerCase()])

  for (const chart of charts) {
    if (!chart.url) continue

    const key = chart.url.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const existing = lookup(chart.url)
    if (existing) rows.push(existing)
    else pending.push(chart)
  }

  return { rows, pending }
}

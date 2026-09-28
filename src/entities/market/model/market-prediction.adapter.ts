import type {
  MarketPredictionRatingCategory,
  MarketPredictionRow,
  MarketPredictionSortDirection,
  MarketPredictionSortKey,
} from './market-prediction.types'

export type MarketPredictionSortableValue = string | number | null

function recordValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return null
}

export function parseMarketNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const normalized = String(value).replace(/[$,%]/g, '').replace(/,/g, '').trim()
  if (!normalized || normalized === '-' || normalized.toLowerCase() === 'nan') return null
  const numeric = Number(normalized)
  return Number.isFinite(numeric) ? numeric : null
}

function parsePredictionDate(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return { label: '—', timestamp: null }
  }

  const text = String(value)
  const dateOnly = text.split('T')[0]
  const [year, month, day] = dateOnly.split('-').map(Number)

  if (!year || !month || !day) {
    const timestamp = Date.parse(text)
    return Number.isFinite(timestamp)
      ? { label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(timestamp)), timestamp }
      : { label: text, timestamp: null }
  }

  const timestamp = Date.UTC(year, month - 1, day)
  return {
    label: new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(timestamp)),
    timestamp,
  }
}

export function ratingCategory(rating: string): MarketPredictionRatingCategory {
  const normalized = rating.toLowerCase()
  if (normalized.includes('buy')) return 'buy'
  if (normalized.includes('sell')) return 'sell'
  if (normalized.includes('hold')) return 'hold'
  return 'other'
}

function normalizeRating(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text) return 'Unrated'
  return text
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bAnd\b/g, 'and')
}

function normalizeAccuracy(value: unknown) {
  const numeric = parseMarketNumber(value)
  if (numeric === null) return null
  return Math.abs(numeric) > 0 && Math.abs(numeric) <= 1 ? numeric * 100 : numeric
}

export function normalizeMarketPredictionRows(payload: unknown): MarketPredictionRow[] {
  if (!Array.isArray(payload)) return []

  return payload
    .map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const raw = item as Record<string, unknown>
      const ticker = String(recordValue(raw, ['Ticker', 'ticker', 'symbol']) ?? '').trim().toUpperCase()
      if (!ticker) return null

      const lastPrice = parseMarketNumber(recordValue(raw, ['Close', 'LastPrice', 'last_price', 'lastPrice']))
      const target = parseMarketNumber(recordValue(raw, ['Target', 'target', 'target_price']))
      const analystCoverage = parseMarketNumber(recordValue(raw, ['history_count', 'HistoryPredictionPeriods', 'analystCoverage', 'num']))
      const meanAccuracy = normalizeAccuracy(recordValue(raw, ['MeanAcc', 'mean_acc', 'meanAccuracy']))
      const rating = normalizeRating(recordValue(raw, ['latest_rating', 'LatestRating', 'rating']))
      const date = parsePredictionDate(recordValue(raw, ['PredictEndDate', 'predictionEndDate', 'end_date']))
      const potentialUpside =
        lastPrice !== null && target !== null && lastPrice !== 0 ? ((target - lastPrice) / lastPrice) * 100 : null

      return {
        id: `${ticker}-${date.timestamp ?? index}`,
        ticker,
        lastPrice,
        target,
        potentialUpside,
        predictionEndDate: date.label,
        predictionEndTimestamp: date.timestamp,
        analystCoverage,
        meanAccuracy,
        rating,
        ratingCategory: ratingCategory(rating),
        raw,
      }
    })
    .filter((row): row is MarketPredictionRow => row !== null)
}

export function marketPredictionSortValue(row: MarketPredictionRow, key: MarketPredictionSortKey): MarketPredictionSortableValue {
  if (key === 'ticker') return row.ticker.toLowerCase()
  if (key === 'lastPrice') return row.lastPrice
  if (key === 'target') return row.target
  if (key === 'potentialUpside') return row.potentialUpside
  if (key === 'predictionEndDate') return row.predictionEndTimestamp
  if (key === 'analystCoverage') return row.analystCoverage
  if (key === 'meanAccuracy') return row.meanAccuracy
  if (key === 'rating') return row.rating.toLowerCase()
  return null
}

export function compareMarketPredictionValues(
  left: MarketPredictionSortableValue,
  right: MarketPredictionSortableValue,
  direction: MarketPredictionSortDirection,
) {
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1

  const compared =
    typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' })

  return direction === 'asc' ? compared : -compared
}

export function formatMarketCurrency(value: number | null) {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatMarketNumber(value: number | null) {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

export function formatMarketPercent(value: number | null, signed = false) {
  if (value === null) return '—'
  const prefix = signed && value > 0 ? '+' : ''
  return `${prefix}${value.toFixed(1)}%`
}

export function marketPredictionCsvTable(rows: MarketPredictionRow[]) {
  return {
    headers: [
      'Ticker',
      'Last Price',
      'Target',
      'Potential Upside',
      'Prediction End Date',
      'Total Analyst Predictions',
      'Mean Accuracy',
      'Latest Rating',
    ],
    rows: rows.map((row) => [
      row.ticker,
      row.lastPrice ?? '',
      row.target ?? '',
      row.potentialUpside === null ? '' : row.potentialUpside.toFixed(1),
      row.predictionEndDate === '—' ? '' : row.predictionEndDate,
      row.analystCoverage ?? '',
      row.meanAccuracy === null ? '' : row.meanAccuracy.toFixed(1),
      row.rating,
    ]),
  }
}

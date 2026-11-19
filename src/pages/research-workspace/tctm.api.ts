import { testStDataEndpoint } from '@/shared/api/tools.api'
import type { ResearchPageData } from './research.types'

type Period = 21 | 63 | 126
type ModelPoint = { date: string; value: number }
type Model = {
  key: string
  name: string
  available: boolean
  value: number | null
  date: string | null
  active: boolean | null
  history: ModelPoint[]
}
type TctmResponse = {
  code: number
  msg: string
  data: { models: Model[]; active_count: number; model_count: number }
}
type IndexPoint = { date: string; SPX: number; tctm_long_term_trend_model: number }

export async function fetchTctmResearch(days: Period, signal?: AbortSignal): Promise<ResearchPageData> {
  const endpoint = import.meta.env.DEV
    ? `/dev/research/tctm?days=${days}`
    : `${import.meta.env.VITE_ST_API_BASE_URL || 'https://devbt2api.sentimentrader.com'}/research/tctm?days=${days}`
  const [modelResponse, indexResponse] = await Promise.all([
    fetch(endpoint, { credentials: 'include', signal, headers: { Accept: 'application/json' } }),
    fetch(testStDataEndpoint('get_data?index=tctm_long_term_trend_model'), { credentials: 'include', signal, headers: { Accept: 'application/json' } }),
  ])
  if (!modelResponse.ok) throw new Error(`TCTM request failed: ${modelResponse.status}`)
  const payload = await modelResponse.json() as TctmResponse
  if (payload.code !== 200 || !Array.isArray(payload.data?.models)) throw new Error(payload.msg || 'Unexpected TCTM response')
  if (!indexResponse.ok) throw new Error(`TCTM index request failed: ${indexResponse.status}`)
  const index = await indexResponse.json() as IndexPoint[]
  if (!Array.isArray(index)) throw new Error('Unexpected TCTM index response')

  const models = payload.data.models
  const primary = models.find(model => model.key === 'long_term_trend' && model.available)
  const cutoff = primary?.date || primary?.history.at(-1)?.date
  if (!primary || !cutoff) throw new Error('No TCTM model history available')
  const modelByDate = new Map(primary.history.map(point => [point.date, Number(point.value)]))
  const rows = index
    .filter(point => point.date && point.date <= cutoff && Number.isFinite(Number(point.SPX)) && Number.isFinite(Number(point.tctm_long_term_trend_model)))
    .slice(-days)
  if (!rows.length) throw new Error('No matching TCTM and S&P 500 history available')

  const series = models.map(model => {
    const history = model.available ? model.history ?? [] : []
    const points = history.map(point => Number(point.value))
    const value = model.available ? Number(model.value) : null
    return {
      name: model.name,
      value: value === null ? '—' : String(value),
      change: model.date || '',
      status: value === null ? 'Unavailable' : value > 0 ? 'Positive' : value < 0 ? 'Negative' : 'Neutral',
      points,
      dates: history.map(point => point.date),
    }
  })
  const currentValue = Number(primary.value)
  return {
    metrics: [{ label: 'Tactical regime', value: currentValue > 0 ? 'Positive' : currentValue < 0 ? 'Negative' : 'Neutral', detail: 'Latest illustrated model state', tone: currentValue > 0 ? 'positive' : currentValue < 0 ? 'negative' : undefined }],
    series,
    tables: [],
    updatedAt: cutoff,
    tacticalChart: {
      dates: rows.map(row => row.date),
      price: rows.map(row => Number(row.SPX)),
      regimes: rows.map(row => modelByDate.get(row.date) ?? Number(row.tctm_long_term_trend_model)),
    },
  }
}

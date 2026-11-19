import { testStDataEndpoint } from '@/shared/api/tools.api'
import type { ResearchPageData } from './research.types'

type RiskPoint = { date: string; risk_measure: number; SPX: number; Color: boolean }
type EnvironmentPoint = { date: string; market_health_composite: number; SPX: number }

interface RiskApiPoint { date: string; value: number; state: boolean | string }
interface RiskApiComponent {
  name: string
  available: boolean
  state: boolean | null
  history: RiskApiPoint[]
}
interface RiskApiData {
  current: { date: string; value: number; state: string; components_on: number; components_total: number; measure_pct: number }
  history: RiskApiPoint[]
  components: RiskApiComponent[]
}
interface RiskApiResponse { code: number; msg: string; data: RiskApiData }

export async function fetchRiskOnOffResearch(days: 21 | 63 | 126, signal?: AbortSignal): Promise<ResearchPageData> {
  const endpoint = import.meta.env.DEV ? `/dev/research/risk_on_off?days=${days}` : `${import.meta.env.VITE_ST_API_BASE_URL || 'https://devbt2api.sentimentrader.com'}/research/risk_on_off?days=${days}`
  const [researchResponse, indexResponse] = await Promise.all([
    fetch(endpoint, { credentials: 'include', signal, headers: { Accept: 'application/json' } }),
    fetch(testStDataEndpoint('get_data?index=risk_measure'), { credentials: 'include', signal, headers: { Accept: 'application/json' } }),
  ])
  if (!researchResponse.ok) throw new Error(`Risk On/Off request failed: ${researchResponse.status}`)
  const payload = await researchResponse.json() as RiskApiResponse
  if (payload.code !== 200 || !payload.data?.current || !Array.isArray(payload.data.history)) throw new Error(payload.msg || 'Unexpected Risk On/Off response')
  if (!indexResponse.ok) throw new Error(`Risk On/Off index request failed: ${indexResponse.status}`)
  const indexRows = await indexResponse.json() as RiskPoint[]
  if (!Array.isArray(indexRows)) throw new Error('Unexpected Risk On/Off index response')
  const indexByDate = new Map(indexRows.filter(row => row.date && Number.isFinite(Number(row.SPX))).map(row => [row.date, Number(row.SPX)]))
  const current = payload.data.current
  const researchByDate = new Map(payload.data.history.filter(row => row.date && Number.isFinite(Number(row.value))).map(row => [row.date, row]))
  const rows = indexRows
    .filter(row => row.date && row.date <= current.date && Number.isFinite(Number(row.risk_measure)) && Number.isFinite(Number(row.SPX)))
    .slice(-days)
    .map(row => researchByDate.get(row.date) ?? { date: row.date, value: Number(row.risk_measure), state: Boolean(row.Color) })
  if (!rows.length) throw new Error('No matching Risk On/Off and S&P 500 history available')
  const previous = rows.at(-2) ?? rows.at(-1)!
  const change = Number(current.value) - Number(previous.value)
  const riskOn = current.state === 'risk_on'
  const held = rows.slice().reverse().findIndex(row => (row.state === true || row.state === 'risk_on') !== riskOn)
  const series = (payload.data.components ?? []).map(component => {
    const points = (component.history ?? []).map(row => row.state === true || row.state === 'risk_on' ? 1 : 0)
    const active = component.state === true
    const duration = points.slice().reverse().findIndex(value => value !== Number(active))
    return {
      name: component.name,
      value: component.available ? String(Number(active)) : '—',
      change: `${duration < 0 ? points.length : duration} sessions`,
      status: active ? 'Risk-on' : 'Risk-off',
      points,
      dates: (component.history ?? []).map(row => row.date),
    }
  })
  const latestIndex = indexByDate.get(current.date) ?? indexByDate.get(rows.at(-1)!.date)!
  return {
    metrics: [
      { label: 'Current regime', value: riskOn ? 'Risk-on' : 'Risk-off', detail: `State held for ${held < 0 ? rows.length : held} sessions`, tone: riskOn ? 'positive' : 'negative' },
      { label: 'Risk Measure', value: `${Number(current.value).toFixed(2)}%`, detail: `As of ${current.date}`, tone: 'primary' },
      { label: 'Daily change', value: `${change >= 0 ? '+' : ''}${change.toFixed(2)} pp`, detail: 'Versus previous session', tone: change >= 0 ? 'positive' : 'negative' },
      { label: 'S&P 500 Index', value: latestIndex.toLocaleString('en-US', { maximumFractionDigits: 2 }), detail: 'Latest index level' },
    ],
    series,
    tables: [],
    updatedAt: current.date,
    riskChart: {
      dates: rows.map(row => row.date),
      price: rows.map(row => indexByDate.get(row.date)!),
      measure: rows.map(row => Number(row.value)),
      regimes: rows.map(row => row.state === true || row.state === 'risk_on' ? 1 : 0),
    },
  }
}

export async function fetchRiskOnOffLive(signal?: AbortSignal): Promise<ResearchPageData> {
  const path = testStDataEndpoint('get_data?index=risk_measure')
  const response = await fetch(path, { credentials: 'include', signal, headers: { Accept: 'application/json' } })
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { msg?: string; error?: string } | null
    throw new Error(detail?.msg || detail?.error || `Risk On/Off request failed: ${response.status}`)
  }
  const raw = await response.json() as RiskPoint[]
  if (!Array.isArray(raw)) throw new Error('Unexpected Risk On/Off response')
  const rows = raw.filter(row => row.date && Number.isFinite(Number(row.risk_measure)) && Number.isFinite(Number(row.SPX))).slice(-126)
  if (!rows.length) throw new Error('No Risk On/Off data available')
  const latest = rows.at(-1)!
  const previous = rows.at(-2) ?? latest
  const change = Number(latest.risk_measure) - Number(previous.risk_measure)
  const riskOn = Boolean(latest.Color)
  const held = rows.slice().reverse().findIndex(row => Boolean(row.Color) !== riskOn)
  return {
    metrics: [
      { label: 'Current regime', value: riskOn ? 'Risk-on' : 'Risk-off', detail: `State held for ${held < 0 ? rows.length : held} sessions`, tone: riskOn ? 'positive' : 'negative' },
      { label: 'Risk Measure', value: `${Number(latest.risk_measure).toFixed(2)}%`, detail: `As of ${latest.date}`, tone: 'primary' },
      { label: 'Daily change', value: `${change >= 0 ? '+' : ''}${change.toFixed(2)} pp`, detail: 'Versus previous session', tone: change >= 0 ? 'positive' : 'negative' },
      { label: 'S&P 500 Index', value: Number(latest.SPX).toLocaleString('en-US', { maximumFractionDigits: 2 }), detail: 'Latest index level' },
    ],
    series: [],
    tables: [],
    updatedAt: latest.date,
    riskChart: {
      dates: rows.map(row => row.date),
      price: rows.map(row => Number(row.SPX)),
      measure: rows.map(row => Number(row.risk_measure)),
      regimes: rows.map(row => row.Color ? 1 : 0),
    },
  }
}

interface EnvironmentApiPoint { date: string; value: number; healthy: boolean }
interface EnvironmentApiComponent {
  name: string
  group: string
  available: boolean
  state: boolean | null
  url?: string
  history: Array<{ date: string; value: number; state: boolean }>
}
interface EnvironmentApiData {
  current: { date: string; value: number; healthy: boolean; participation: number; trend: number }
  history: EnvironmentApiPoint[]
  components: EnvironmentApiComponent[]
}
interface EnvironmentApiResponse { code: number; msg: string; data: EnvironmentApiData }

export async function fetchMarketEnvironment(days: 21 | 63 | 126, signal?: AbortSignal): Promise<ResearchPageData> {
  const endpoint = import.meta.env.DEV ? `/dev/research/market_environment?days=${days}` : `${import.meta.env.VITE_ST_API_BASE_URL || 'https://devbt2api.sentimentrader.com'}/research/market_environment?days=${days}`
  const [environmentResponse, indexResponse] = await Promise.all([
    fetch(endpoint, { credentials: 'include', signal, headers: { Accept: 'application/json' } }),
    fetch(testStDataEndpoint('get_data?index=market_health_composite'), { credentials: 'include', signal, headers: { Accept: 'application/json' } }),
  ])
  if (!environmentResponse.ok) throw new Error(`Market Environment request failed: ${environmentResponse.status}`)
  const payload = await environmentResponse.json() as EnvironmentApiResponse
  if (payload.code !== 200 || !payload.data?.current || !Array.isArray(payload.data.history)) throw new Error(payload.msg || 'Unexpected Market Environment response')
  if (!indexResponse.ok) throw new Error(`Market Environment index request failed: ${indexResponse.status}`)
  const indexRows = await indexResponse.json() as EnvironmentPoint[]
  if (!Array.isArray(indexRows)) throw new Error('Unexpected Market Environment index response')
  const current = payload.data.current
  const environmentByDate = new Map(payload.data.history.filter(row => row.date && Number.isFinite(Number(row.value))).map(row => [row.date, row]))
  const rows = indexRows
    .filter(row => row.date && row.date <= current.date && Number.isFinite(Number(row.market_health_composite)) && Number.isFinite(Number(row.SPX)))
    .slice(-days)
    .map(row => ({ index: row, environment: environmentByDate.get(row.date) }))
  if (!rows.length) throw new Error('No Market Environment history available')
  const score = Number(current.value)
  const series = (payload.data.components ?? []).map(component => {
    const points = (component.history ?? []).map(point => point.state ? 1 : 0)
    const active = component.state === true
    const duration = points.slice().reverse().findIndex(value => value !== Number(active))
    return {
      name: component.name,
      value: component.available ? String(Number(active)) : '—',
      change: `${duration < 0 ? points.length : duration} sessions`,
      status: active ? 'Healthy' : 'Unhealthy',
      points,
      dates: (component.history ?? []).map(point => point.date),
      indicatorId: component.url,
    }
  })
  const latestIndex = rows.at(-1)!.index
  return {
    metrics: [
      { label: 'Market environment', value: current.healthy ? 'Healthy' : 'Unhealthy', detail: `As of ${current.date}`, tone: current.healthy ? 'positive' : 'negative' },
      { label: 'Composite score', value: `${score} / 8`, detail: 'Latest available session', tone: 'primary' },
      { label: 'S&P 500 Index', value: Number(latestIndex.SPX).toLocaleString('en-US', { maximumFractionDigits: 2 }), detail: 'Latest index level' },
    ],
    series, tables: [], updatedAt: current.date,
    environmentChart: {
      dates: rows.map(row => row.index.date),
      price: rows.map(row => Number(row.index.SPX)),
      score: rows.map(row => Number(row.environment?.value ?? row.index.market_health_composite)),
    },
  }
}

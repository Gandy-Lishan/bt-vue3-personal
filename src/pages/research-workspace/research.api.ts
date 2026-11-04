import type { ResearchPageData } from './research.types'

const wave = (offset: number) => Array.from({ length: 24 }, (_, index) => Math.round(48 + offset + Math.sin(index / 2.7) * 14 + index * .45))

function fixture(seed: number, labels: string[]): ResearchPageData {
  const values = labels.map((_, index) => 42 + ((seed * 13 + index * 17) % 49))
  return {
    metrics: [
      { label: 'Current reading', value: `${values[0]}`, detail: 'Latest available session', tone: 'primary' },
      { label: '5-day change', value: `${seed % 2 ? '+' : '-'}${(seed % 7 + 1).toFixed(1)}`, detail: 'Change over five sessions', tone: seed % 2 ? 'positive' : 'negative' },
      { label: 'Active signals', value: `${3 + seed % 6}`, detail: `${labels.length} measures monitored` },
      { label: 'Current state', value: seed % 3 === 0 ? 'Cautious' : seed % 2 ? 'Positive' : 'Neutral', detail: 'Model classification' },
    ],
    series: labels.map((name, index) => ({ name, value: `${values[index]}`, change: `${index % 2 ? '+' : '-'}${(1.2 + index * .7).toFixed(1)}`, status: values[index] > 67 ? 'Optimism' : values[index] < 35 ? 'Pessimism' : 'Neutral', points: wave(seed + index * 4) })),
    tables: [{ title: 'Indicator details', description: 'Latest readings and model states for the measures shown above.', columns: ['Indicator', 'Latest', '5-day change', 'State'], rows: labels.map((name, index) => [name, `${values[index]}`, `${index % 2 ? '+' : '-'}${(1.2 + index * .7).toFixed(1)}`, values[index] > 67 ? 'Optimism' : values[index] < 35 ? 'Pessimism' : 'Neutral']) }],
    updatedAt: 'Static preview data',
  }
}

// Each page deliberately owns a separate loader. Replace the fixture body with that
// page's endpoint when its backend contract is available.
const riskComponents = [
  ['NYSE Up Volume Ratio (10-Day Avg)', 'Participation'],
  ['% Excess Optimism-Pessimism', 'Sentiment'],
  ['Dumb Money Confidence', 'Sentiment'],
  ['Fear & Greed Model', 'Sentiment'],
  ['Risk Appetite Index', 'Cross-asset'],
  ['Stock/Bond Ratio', 'Cross-asset'],
  ['Conference Board - Stocks', 'Sentiment'],
  ['PE / VIX Spread', 'Cross-asset'],
  ['AAII Bull Ratio (4-Week Avg)', 'Sentiment'],
  ['SPY Breadth (% > 200 Day Avg)', 'Participation'],
  ['NYSE Net High-Low %', 'Participation'],
  ['McClellan Oscillator', 'Participation'],
  ['McClellan Summation', 'Participation'],
  ['SPY Liquidity Premium', 'Options & liquidity'],
  ['Equity Put/Call Ratio De-Trended', 'Options & liquidity'],
  ['S&P 500 Stocks In Bear Market', 'Participation'],
  ['S&P 500 Stocks In Correction', 'Participation'],
  ['Equity Hedging Index', 'Options & liquidity'],
  ['VIX Term Structure', 'Options & liquidity'],
  ['ROBO Put/Call Ratio', 'Sentiment'],
  ['Total U.S. Put/Call Option Volume (10-Day Average)', 'Sentiment'],
] as const

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
export function staticSeries({ seed = 1, count = 126, start = 50, end = 62, min = 0, max = 100, volatility = 2.4 } = {}) {
  let state = seed
  const random = () => { state |= 0; state = state + 0x6D2B79F5 | 0; let t = Math.imul(state ^ state >>> 15, 1 | state); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
  const walk = [0]
  for (let index = 1; index < count; index++) walk.push(walk[index - 1] + (random() + random() - 1) * volatility * 1.8)
  const output: number[] = []; const phase = random() * Math.PI * 2
  for (let index = 0; index < count; index++) { const t = index / (count - 1); const cycle = Math.sin(t * Math.PI * 3.5 + phase) - Math.sin(phase) * (1 - t) - Math.sin(Math.PI * 3.5 + phase) * t; output.push(clamp(start + (end - start) * t + walk[index] - walk[count - 1] * t + cycle * volatility * 1.9, min, max)) }
  output[0] = clamp(start, min, max); output[count - 1] = clamp(end, min, max); return output
}
export function businessDates(count: number, endDate = '2026-10-27') { const result: string[] = []; const date = new Date(`${endDate}T12:00:00Z`); while (result.length < count) { const day = date.getUTCDay(); if (day !== 0 && day !== 6) result.unshift(date.toISOString().slice(0, 10)); date.setUTCDate(date.getUTCDate() - 1) } return result }
function buildStates(counts: number[], total: number, seed: number) { const series = Array.from({ length: total }, () => [] as number[]); counts.forEach((count, session) => { const ranked = Array.from({ length: total }, (_, index) => ({ index, rank: Math.sin(index * 1.73 + session * .055 + seed) * .7 + Math.cos(index * .47 + session * .018 + seed) * .3 })).sort((a, b) => b.rank - a.rank); const active = new Set(ranked.slice(0, count).map((item) => item.index)); series.forEach((states, index) => states.push(active.has(index) ? 1 : 0)) }); return series }
function regimeFrom(values: number[]) { let active = values[0] > 67; return values.map((value) => { if (value > 67) active = true; else if (value < 35) active = false; return active ? 1 : 0 }) }

export const fetchRiskOnOff = async (_signal?: AbortSignal): Promise<ResearchPageData> => {
  const counts = Array.from({ length: 126 }, (_, index) => Math.max(3, Math.min(19, Math.round(11 + 5.7 * Math.sin(index * .072 - 1.5) + 1.9 * Math.sin(index * .38)))))
  counts.splice(-10, 10, 15, 16, 15, 14, 15, 14, 13, 14, 13, 14)
  const signals = buildStates(counts, 21, 2.6)
  const measure = counts.map((count) => count / 21 * 100)
  const regimes = regimeFrom(measure)
  const series = riskComponents.map(([name, category], index) => {
    const points = signals[index]
    const active = points.at(-1) === 1
    let sessions = 1
    for (let cursor = points.length - 2; cursor >= 0 && points[cursor] === points.at(-1); cursor--) sessions++
    return { name, value: active ? '1' : '0', change: `${sessions} sessions`, status: active ? 'Risk-on' : 'Risk-off', points, category }
  })
  const activeCount = counts.at(-1) ?? 0
  let held = 1
  for (let index = regimes.length - 2; index >= 0 && regimes[index] === regimes.at(-1); index--) held++
  const change = measure.at(-1)! - measure.at(-2)!
  return {
    metrics: [
      { label: 'Current regime', value: regimes.at(-1) ? 'Risk-on' : 'Risk-off', detail: `State held for ${held} sessions`, tone: regimes.at(-1) ? 'positive' : 'negative' },
      { label: 'Risk Measure', value: `${measure.at(-1)!.toFixed(1)}%`, detail: `${activeCount} of 21 components are risk-on`, tone: 'primary' },
      { label: 'Change in Risk Measure', value: `${change >= 0 ? '+' : ''}${change.toFixed(1)} pp`, detail: 'Versus previous session · percentage points', tone: change >= 0 ? 'positive' : 'negative' },
      { label: 'Hold range', value: '35–67%', detail: 'The previous regime remains in effect' },
    ],
    series,
    tables: [{ title: 'Inside the composite', description: 'All 21 indicators with their current state and daily history.', columns: ['Component', 'Current state', 'Daily state history', 'Sessions in Current State'], rows: series.map((item) => [item.name, item.status, item.points.join(','), item.change]) }],
    updatedAt: 'Static preview data',
    riskChart: { dates: businessDates(126), price: staticSeries({ seed: 144, count: 126, start: 7045, end: 7667, min: 6800, max: 7900, volatility: 42 }), measure, regimes },
  }
}
const environmentComponents = [
  ['SPY Breadth (% > 200 Day Avg)', 'Participation'],
  ['McClellan Summation', 'Participation'],
  ['NYSE Net High-Low %', 'Participation'],
  ['S&P 500 Stocks In Correction', 'Participation'],
  ['McClellan Summation > McClellan Summation (5 Days Ago)', 'Trend conditions'],
  ['S&P 500 200-Day Average > 200-Day Average (5 Days Ago)', 'Trend conditions'],
  ['S&P 500 Index Above 200-Day Moving Average', 'Trend conditions'],
  ['S&P 500 10-Day High Breakout Trend', 'Trend conditions'],
] as const

export const fetchMarketEnvironment = async (_signal?: AbortSignal): Promise<ResearchPageData> => {
  const counts = Array.from({ length: 126 }, (_, index) => Math.max(1, Math.min(8, Math.round(4.7 + 2.1 * Math.sin(index * .087 - 1.2) + .7 * Math.sin(index * .6)))))
  counts.splice(-7, 7, 3, 4, 4, 5, 6, 6, 6)
  const signals = buildStates(counts, 8, 4.1)
  const series = environmentComponents.map(([name, category], index) => {
    const points = signals[index]
    const healthy = points.at(-1) === 1
    let sessions = 1
    for (let cursor = points.length - 2; cursor >= 0 && points[cursor] === points.at(-1); cursor--) sessions++
    return { name, category, value: healthy ? '1' : '0', change: `${sessions} ${sessions === 1 ? 'session' : 'sessions'}`, status: healthy ? 'Healthy' : 'Unhealthy', points }
  })
  const score = counts.at(-1) ?? 0
  const participation = series.slice(0, 4).filter((item) => item.status === 'Healthy').length
  const trend = series.slice(4).filter((item) => item.status === 'Healthy').length
  return {
    metrics: [
      { label: 'Market environment', value: score >= 5 ? 'Healthy' : 'Unhealthy', detail: 'Healthy at 5 or more out of 8', tone: score >= 5 ? 'positive' : 'negative' },
      { label: 'Composite score', value: `${score} / 8`, detail: `${score - counts[counts.length - 2] >= 0 ? '+' : ''}${score - counts[counts.length - 2]} versus the previous session`, tone: 'primary' },
      { label: 'Participation', value: `${participation} / 4 healthy`, detail: 'Breadth and participation measures' },
      { label: 'Trend conditions', value: `${trend} / 4 healthy`, detail: 'Underlying trend conditions' },
    ],
    series,
    tables: [{ title: 'Component Health', description: 'All eight components, aligned on one timeline.', columns: ['Component', 'Current condition', 'Daily condition history', 'Sessions in Current State'], rows: series.map((item) => [item.name, item.status, item.points.join(','), item.change]) }],
    updatedAt: 'Static preview data',
    environmentChart: { dates: businessDates(126), price: staticSeries({ seed: 84, count: 126, start: 7045, end: 7667, min: 6800, max: 7900, volatility: 42 }), score: counts },
  }
}
const tacticalComponents = ['Long-Term Trend Model', 'Composite Risk Warning Model', 'Composite Exhaustion Model', 'Composite Washout Model', 'Composite Thrust Model', 'Composite Confirmation Model', 'Thrust and Confirmation']
export const fetchTacticalComposite = async (_signal?: AbortSignal): Promise<ResearchPageData> => {
  const signals: number[][] = tacticalComponents.map((_, component) => Array.from({ length: 126 }, (_, session) => { const value = Math.sin(session * (.045 + component * .008) + component * 1.4) + Math.cos(session * .02 + component) * .4; return value > .42 ? 1 : value < -.42 ? -1 : 0 }))
  ;[1, -1, 0, 1, 1, 1, 0].forEach((value, component) => { for (let session = 122; session < 126; session++) signals[component][session] = value })
  const regimes = Array.from({ length: 126 }, (_, index) => index < 20 ? -1 : index < 49 ? 1 : index < 61 ? 0 : index < 82 ? -1 : 1)
  const series = tacticalComponents.map((name, index) => ({ name, value: String(signals[index].at(-1)), change: `Component ${index + 1}`, status: signals[index].at(-1)! > 0 ? 'Positive' : signals[index].at(-1)! < 0 ? 'Negative' : 'Neutral', points: signals[index] }))
  return { metrics: [{ label: 'Tactical regime', value: 'Positive', detail: 'Latest illustrated model state', tone: 'positive' }], series, tables: [{ title: 'Model components', description: 'Current signal for each component.', columns: ['Component', 'Current signal'], rows: series.map((item) => [item.name, item.status]) }], updatedAt: 'Static preview data', tacticalChart: { dates: businessDates(126), price: staticSeries({ seed: 344, count: 126, start: 6760, end: 7667, min: 6400, max: 7900, volatility: 46 }), regimes } }
}
export const fetchMarketBreadth = async (_signal?: AbortSignal) => fixture(4, ['Above 10-day Average', 'Above 50-day Average', 'Above 200-day Average', 'New Highs', 'New Lows', 'McClellan Oscillator'])
export const fetchBonds = async (_signal?: AbortSignal) => fixture(5, ['Bond Optix', 'Treasury Hedgers', 'Bond Fund Flows', 'High Yield Breadth'])
export const fetchEnergy = async (_signal?: AbortSignal) => fixture(6, ['Crude Oil Optix', 'Commercial Hedgers', 'Energy Fund Flows', 'Energy Stock Breadth'])
export const fetchGold = async (_signal?: AbortSignal) => fixture(7, ['Gold Optix', 'Commercial Hedgers', 'Gold Fund Flows', 'Gold Miner Breadth'])
export const fetchMacro = async (_signal?: AbortSignal) => fixture(8, ['Growth Pulse', 'Inflation Pressure', 'Financial Conditions', 'Credit Stress'])
export const fetchIntradayMonitor = async (_signal?: AbortSignal) => fixture(9, ['S&P 500 Price', 'NYSE TICK', 'Advance/Decline', 'Up Volume', 'Put/Call Activity', 'VIX Term Structure'])
export const fetchSeasonalityCalendar = async (_signal?: AbortSignal) => fixture(10, ['Pre-holiday', 'Turn of Month', 'November–May', 'Presidential Cycle'])
export const fetchGlobalBreadth = async (_signal?: AbortSignal) => fixture(11, ['All Countries', 'Developed Markets', 'Emerging Markets', 'Americas', 'Europe', 'Asia Pacific'])
export const fetchMarketSentiment = async (_signal?: AbortSignal) => fixture(12, ['S&P 500', 'Nasdaq 100', '10-Year Treasury', 'Gold', 'Crude Oil', 'U.S. Dollar'])
export const fetchOptixHeatmap = async (_signal?: AbortSignal) => fixture(13, ['S&P 500', 'Nasdaq 100', 'Russell 2000', 'Gold', 'Crude Oil', 'U.S. Dollar'])
export const fetchRankCharts = async (_signal?: AbortSignal) => fixture(14, ['Technology', 'Industrials', 'Financials', 'Energy', 'Health Care', 'Utilities'])

const loaders: Record<string, (signal?: AbortSignal) => Promise<ResearchPageData>> = {
  'risk-on-off': fetchRiskOnOff,
  'market-environment': fetchMarketEnvironment,
  'tactical-composite-trend-model': fetchTacticalComposite,
  'market-breadth': fetchMarketBreadth,
  bonds: fetchBonds,
  energy: fetchEnergy,
  gold: fetchGold,
  macro: fetchMacro,
  'intraday-monitor': fetchIntradayMonitor,
  'seasonality-calendar': fetchSeasonalityCalendar,
  'global-breadth-overview': fetchGlobalBreadth,
  'market-sentiment-overview': fetchMarketSentiment,
  'optix-heatmap': fetchOptixHeatmap,
  'rank-charts': fetchRankCharts,
}

export function fetchResearchPage(slug: string, signal?: AbortSignal) {
  const loader = loaders[slug]
  if (!loader) return Promise.reject(new Error(`Unknown research page: ${slug}`))
  return loader(signal)
}

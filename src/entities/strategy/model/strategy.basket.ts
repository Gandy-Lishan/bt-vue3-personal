import type { StrategySignalRow } from './strategy.types'

export type StrategyBasketMode = 'manual' | 'auto'

export interface StrategyBasketAllocation {
  id: string
  strategy: string
  modelName: string
  url: string
  model: string
  category: string
  percent: number | null
}

export interface StrategyBasketRecord {
  id: string
  url: string
  name: string
  status: string
  startDate: string
  endDate: string
  cash: number | null
  totalReturn: number | null
  winRate: number | null
  stdDev: number | null
  maxRisk: number | null
  avgWin: number | null
  avgLoss: number | null
  medianReturn: number | null
  totalTrades: number | null
  totalPositive: number | null
  totalNegative: number | null
  strategyCombination: StrategyBasketAllocation[]
  raw: Record<string, unknown>
}

export interface StrategyBasketList {
  count: number
  records: StrategyBasketRecord[]
}

export interface StrategyBasketAutoCandidate {
  id: string
  label: string
  allocations: StrategyBasketAllocation[]
}

export interface StrategyBasketApiResult {
  code: number | null
  data: unknown
  message: string
  raw: unknown
}

export interface StrategyBasketRunResult {
  code: number | null
  status: string
  record: StrategyBasketRecord | null
  metrics: Record<string, unknown>
  holdings: Array<Record<string, unknown>>
  strategyDetails: StrategyBasketStrategyDetail[]
  raw: unknown
}

export interface StrategyBasketStrategyDetail {
  id: string
  model: string
  modelName: string
  symbolNotLong: string
  cagr: number | null
  benchmarkCagr: number | null
  maxDrawdown: number | null
  netProfit: number | null
  expectancy: number | null
  sharpeRatio: number | null
  informationRatio: number | null
  profitLossRatio: number | string | null
  averageWin: number | null
  averageLoss: number | null
  totalTrades: number | null
  winRate: number | null
  tradesPerYear: number | null
  tradeTableUrl: string
  returnsUrl: string
  drawdownUrl: string
  heatmapUrl: string
  annualReturnsUrl: string
  raw: Record<string, unknown>
}

export interface StrategyBasketSubmitPayload {
  name: string
  start_date: string
  end_date: string
  cash: string
  strategy_combination: string
  auto_portfolio: string
}

type StrategyLookup = Map<string, StrategySignalRow>

function lookupKey(value: unknown) {
  return text(value).toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function text(value: unknown) {
  return String(value ?? '').trim()
}

function numberValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(String(value).replace(/,/g, ''))
  return Number.isFinite(numeric) ? numeric : null
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function parseStrategyBasketJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return value

  try {
    return JSON.parse(trimmed.replace(/\bNaN\b/g, 'null'))
  } catch {
    return value
  }
}

function apiData(payload: unknown) {
  const record = recordValue(payload)
  return parseStrategyBasketJson(record.data ?? payload)
}

export function normalizeStrategyBasketApiResult(payload: unknown): StrategyBasketApiResult {
  const record = recordValue(payload)
  return {
    code: numberValue(record.code),
    data: apiData(payload),
    message: text(record.message ?? record.msg ?? record.detail),
    raw: payload,
  }
}

function statusText(value: unknown) {
  const raw = text(value)
  if (!raw) return 'Unknown'
  return raw.slice(0, 1).toUpperCase() + raw.slice(1).toLowerCase()
}

function normalizedProfitLossRatio(value: unknown): number | string | null {
  const numeric = numberValue(value)
  if (numeric === -1) return 'Low risk'
  return numeric
}

export function buildStrategyLookup(signals: StrategySignalRow[]): StrategyLookup {
  const lookup = new Map<string, StrategySignalRow>()
  for (const row of signals) {
    lookup.set(row.modelName.toLowerCase(), row)
    lookup.set(row.url.toLowerCase(), row)
    lookup.set(lookupKey(row.modelName), row)
    lookup.set(lookupKey(row.url), row)
  }
  return lookup
}

export function normalizeStrategyBasketAllocation(
  value: unknown,
  index: number,
  lookup: StrategyLookup = new Map(),
): StrategyBasketAllocation {
  const row = recordValue(value)
  const strategy = text(row.strategy ?? row.model_name ?? row.modelName)
  const url = text(row.url ?? row.model)
  const matched = lookup.get(strategy.toLowerCase())
    ?? lookup.get(url.toLowerCase())
    ?? lookup.get(lookupKey(strategy))
    ?? lookup.get(lookupKey(url))
  const modelName = text(row.model_name ?? matched?.modelName ?? strategy)

  return {
    id: `${modelName || strategy || 'strategy'}-${index}-${text(row.percent)}`,
    strategy: strategy || modelName || '—',
    modelName: modelName || strategy || '—',
    url: text(row.url ?? matched?.url ?? row.model),
    model: text(row.model ?? row.symbol_not_long ?? 'CASH') || 'CASH',
    category: text(row.category ?? matched?.category),
    percent: numberValue(row.percent),
  }
}

export function normalizeStrategyBasketAllocations(value: unknown, lookup: StrategyLookup = new Map()) {
  return arrayValue(parseStrategyBasketJson(value))
    .map((item, index) => normalizeStrategyBasketAllocation(item, index, lookup))
    .filter((allocation) => allocation.strategy !== '—' || allocation.modelName !== '—' || allocation.percent !== null)
}

export function normalizeStrategyBasketRecord(value: unknown, lookup: StrategyLookup = new Map()): StrategyBasketRecord {
  const row = recordValue(value)
  const url = text(row.url ?? row.id)

  return {
    id: url || text(row.name) || 'basket-record',
    url,
    name: text(row.name) || 'Untitled basket',
    status: statusText(row.status),
    startDate: text(row.start_date),
    endDate: text(row.end_date),
    cash: numberValue(row.cash),
    totalReturn: numberValue(row.total_return),
    winRate: numberValue(row.winrate ?? row.win_rate),
    stdDev: numberValue(row.std_dev),
    maxRisk: numberValue(row.max_risk),
    avgWin: numberValue(row.avg_win),
    avgLoss: numberValue(row.avg_loss),
    medianReturn: numberValue(row.median_return),
    totalTrades: numberValue(row.total_trades),
    totalPositive: numberValue(row.total_positive),
    totalNegative: numberValue(row.total_negative),
    strategyCombination: normalizeStrategyBasketAllocations(row.strategy_combination, lookup),
    raw: row,
  }
}

export function normalizeStrategyBasketList(payload: unknown, signals: StrategySignalRow[] = []): StrategyBasketList {
  const lookup = buildStrategyLookup(signals)
  const root = recordValue(payload)
  const records = arrayValue(root.results ?? payload).map((item) => normalizeStrategyBasketRecord(item, lookup))

  return {
    count: numberValue(root.count) ?? records.length,
    records,
  }
}

export function normalizeStrategyBasketAutoCandidates(payload: unknown, signals: StrategySignalRow[] = []) {
  const result = normalizeStrategyBasketApiResult(payload)
  const rows = arrayValue(result.data)
  const lookup = buildStrategyLookup(signals)

  return rows.map((item, index): StrategyBasketAutoCandidate => {
    const allocations = normalizeStrategyBasketAllocations(parseStrategyBasketJson(item), lookup)
    return {
      id: `candidate-${index}`,
      label: `Basket #${index + 1}`,
      allocations,
    }
  })
}

export function normalizeStrategyBasketStrategyDetail(value: unknown, index: number): StrategyBasketStrategyDetail {
  const row = recordValue(value)
  const model = text(row.model ?? row.url ?? row.model_url)
  const symbolNotLong = text(row.symbol_not_long ?? row.symbolNotLong) || 'CASH'
  const modelName = text(row.model_name ?? row.modelName ?? row.name ?? model) || symbolNotLong

  return {
    id: `${model || modelName || symbolNotLong}-${symbolNotLong}-${index}`,
    model,
    modelName,
    symbolNotLong,
    cagr: numberValue(row.CAGR ?? row.cagr),
    benchmarkCagr: numberValue(row.benchmark_CAGR ?? row.benchmarkCagr),
    maxDrawdown: numberValue(row.max_drawdown ?? row.maxDrawdown),
    netProfit: numberValue(row.net_profit_pct ?? row.netProfit),
    expectancy: numberValue(row.Expectancy ?? row.expectancy),
    sharpeRatio: numberValue(row.sharp_ratio ?? row.sharpeRatio),
    informationRatio: numberValue(row.info_ratio ?? row.informationRatio),
    profitLossRatio: normalizedProfitLossRatio(row.profit_loss_ratio ?? row.profitLossRatio),
    averageWin: numberValue(row.average_win ?? row.averageWin),
    averageLoss: numberValue(row.average_loss ?? row.averageLoss),
    totalTrades: numberValue(row.total_trades ?? row.totalTrades),
    winRate: numberValue(row.win_rate_pct ?? row.winRate),
    tradesPerYear: numberValue(row.trades_per_year ?? row.tradesPerYear),
    tradeTableUrl: text(row.trade_table_outfile ?? row.tradeTableUrl),
    returnsUrl: text(row.returns_outfile ?? row.returnsUrl),
    drawdownUrl: text(row.drawdown_outfile ?? row.drawdownUrl),
    heatmapUrl: text(row.heatmap_outfile ?? row.heatmapUrl),
    annualReturnsUrl: text(row.annual_returns_outfile ?? row.annualReturnsUrl),
    raw: row,
  }
}

export function normalizeStrategyBasketRunResult(
  payload: unknown,
  signals: StrategySignalRow[] = [],
  fallbackRecord?: StrategyBasketRecord | null,
): StrategyBasketRunResult {
  const result = normalizeStrategyBasketApiResult(payload)
  const data = recordValue(result.data)
  const lookup = buildStrategyLookup(signals)
  const row = data.row ? normalizeStrategyBasketRecord(data.row, lookup) : (fallbackRecord ?? null)
  const metrics = recordValue(data.portfolio_details)
  const holdingsRaw = parseStrategyBasketJson(metrics.portfolio_details)
  const strategyDetailsRaw = parseStrategyBasketJson(data.strategy_details)

  return {
    code: result.code,
    status: statusText(data.status ?? row?.status),
    record: row,
    metrics,
    holdings: arrayValue(holdingsRaw).map(recordValue),
    strategyDetails: arrayValue(strategyDetailsRaw).map(normalizeStrategyBasketStrategyDetail),
    raw: payload,
  }
}

export function strategyBasketSubmitPayload(
  options: {
    name: string
    startDate: string
    endDate: string
    cash: string
    allocations: StrategyBasketAllocation[]
    auto: boolean
  },
): StrategyBasketSubmitPayload {
  const strategyCombination = options.allocations.map((item) => ({
    strategy: item.modelName || item.strategy,
    model: 'CASH',
    percent: item.percent,
  }))

  return {
    name: options.name,
    start_date: options.startDate,
    end_date: options.endDate,
    cash: options.cash,
    strategy_combination: JSON.stringify(strategyCombination),
    auto_portfolio: options.auto ? 'True' : 'False',
  }
}

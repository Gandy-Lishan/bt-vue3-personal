import strategiesPayload from '@/assets/btv3_strategies.json'

interface RawRuleDescription {
  commentDes?: unknown
}

interface RawStrategyBacktestPayload {
  name?: unknown
  symbol?: unknown
  symbol2?: unknown
  benchmark?: unknown
  strategy?: unknown
  frequency?: unknown
  direction?: unknown
  direction2?: unknown
  capital?: unknown
  commission?: unknown
  slippage?: unknown
  entry_description?: RawRuleDescription[]
  exit_description?: RawRuleDescription[]
  entry2_description?: RawRuleDescription[]
  exit2_description?: RawRuleDescription[]
}

export interface StrategyBacktestRuleGroup {
  label: string
  symbol: string
  direction: string
  entries: string[]
  exits: string[]
}

export interface StrategyBacktestInfo {
  name: string
  strategy: string
  symbols: string
  benchmark: string
  frequency: string
  capital: string
  commission: string
  slippage: string
  groups: StrategyBacktestRuleGroup[]
}

const strategyPayloads = strategiesPayload as RawStrategyBacktestPayload[]

function text(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function formatNumber(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return text(value) || '—'
  return numeric.toLocaleString('en-US')
}

function formatCost(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return text(value) || '—'
  return numeric === 0 ? '0' : numeric.toLocaleString('en-US')
}

function cleanRuleText(value: unknown) {
  return text(value)
    .replace(/\s+/g, ' ')
    .replace(/^E:\s*/i, '')
    .replace(/^X:\s*/i, '')
    .replace(/;\s*/g, '; ')
    .trim()
}

function descriptionLines(value: RawRuleDescription[] | undefined) {
  return (Array.isArray(value) ? value : [])
    .map((item) => cleanRuleText(item.commentDes))
    .filter(Boolean)
}

function symbolText(payload: RawStrategyBacktestPayload) {
  return [text(payload.symbol), text(payload.symbol2)].filter(Boolean).join(' / ') || '—'
}

function buildGroup(
  label: string,
  symbol: unknown,
  direction: unknown,
  entries: RawRuleDescription[] | undefined,
  exits: RawRuleDescription[] | undefined,
): StrategyBacktestRuleGroup | null {
  const entryLines = descriptionLines(entries)
  const exitLines = descriptionLines(exits)
  if (!entryLines.length && !exitLines.length) return null

  return {
    label,
    symbol: text(symbol) || '—',
    direction: text(direction) || '—',
    entries: entryLines,
    exits: exitLines,
  }
}

function normalizePayload(payload: RawStrategyBacktestPayload): StrategyBacktestInfo {
  const primary = buildGroup('Primary leg', payload.symbol, payload.direction, payload.entry_description, payload.exit_description)
  const secondary = buildGroup('Secondary leg', payload.symbol2, payload.direction2, payload.entry2_description, payload.exit2_description)

  return {
    name: text(payload.name),
    strategy: text(payload.strategy) || '—',
    symbols: symbolText(payload),
    benchmark: text(payload.benchmark) || '—',
    frequency: text(payload.frequency) || '—',
    capital: formatNumber(payload.capital),
    commission: formatCost(payload.commission),
    slippage: formatCost(payload.slippage),
    groups: [primary, secondary].filter((group): group is StrategyBacktestRuleGroup => group !== null),
  }
}

export function findStrategyBacktestInfoByName(name: string): StrategyBacktestInfo | null {
  const normalized = normalizeName(name)
  if (!normalized) return null

  const exact = strategyPayloads.find((payload) => normalizeName(text(payload.name)) === normalized)
  if (exact) return normalizePayload(exact)

  const fuzzy = strategyPayloads.find((payload) => {
    const payloadName = normalizeName(text(payload.name))
    return payloadName.includes(normalized) || normalized.includes(payloadName)
  })

  return fuzzy ? normalizePayload(fuzzy) : null
}

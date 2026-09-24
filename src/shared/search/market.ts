import stocksData from '@/assets/stocks_list.json'
import indexsData from '@/assets/indexes_list.json'
import type { AlgoliaSearchResult } from './algolia'

/**
 * Local symbol search for the header "Market" section. Faithful port of the classic
 * site's `createStateFilter`: standardise, then exact > prefix > fuzzy, scoring each
 * entry against name and symbol.
 */

interface StockEntry {
  stock?: string
  name?: string
  category?: string
}

interface IndexEntry {
  symbol?: string
  name?: string
  category?: string
}

interface MarketEntry {
  symbol: string
  name: string
  category: string
}

const marketEntries: MarketEntry[] = [
  ...(stocksData as StockEntry[]).map((entry) => ({
    symbol: String(entry.stock ?? '').trim(),
    name: String(entry.name ?? '').trim(),
    category: entry.category ?? 'Stock',
  })),
  ...(indexsData as IndexEntry[]).map((entry) => ({
    symbol: String(entry.symbol ?? '').trim(),
    name: String(entry.name ?? '').trim(),
    category: entry.category ?? 'Index',
  })),
].filter((entry) => entry.symbol && entry.name)

const defaultMarketSymbols = ['SPX', 'NDX', 'AAPL', 'QQQ', 'DIA', 'MSFT']
const fallbackDefaultMarketEntries: Record<string, MarketEntry> = {
  SPX: { symbol: 'SPX', name: 'S&P 500 (SPX)', category: 'Index' },
  NDX: { symbol: 'NDX', name: 'NASDAQ 100 (NDX)', category: 'Index' },
  AAPL: { symbol: 'AAPL', name: 'Apple Inc', category: 'Stock' },
  QQQ: { symbol: 'QQQ', name: 'NASDAQ 100 ETF (QQQ)', category: 'ETF' },
  DIA: { symbol: 'DIA', name: 'Dow Jones Industrial Average ETF (DIA)', category: 'ETF' },
  MSFT: { symbol: 'MSFT', name: 'Microsoft Corp', category: 'Stock' },
}
const marketEntriesBySymbol = new Map<string, MarketEntry>()

for (const entry of marketEntries) {
  const symbol = entry.symbol.toUpperCase()
  if (!marketEntriesBySymbol.has(symbol)) marketEntriesBySymbol.set(symbol, entry)
}

function standardize(value: string) {
  return value.toLowerCase().replace(/[_\s-]+/g, ' ')
}

function fuzzyMatchCount(text: string, query: string) {
  if (!query) return 0

  let regexString = ''
  for (let index = 0; index < query.length; index += 1) {
    regexString += query[index]
    if (index < query.length - 1 && /[a-zA-Z0-9]/.test(query[index])) regexString += '.*?'
  }

  return (text.match(new RegExp(regexString, 'g')) ?? []).length
}

function scoreMarketEntry(entry: MarketEntry, query: string) {
  const name = standardize(entry.name)
  const symbol = standardize(entry.symbol)
  const needle = standardize(query.trim())
  if (!needle) return 0

  let score = 0
  if (name === needle || symbol === needle) score += 10
  else if (name.startsWith(needle) || symbol.startsWith(needle)) score += 5

  score += Math.max(fuzzyMatchCount(name, needle), fuzzyMatchCount(symbol, needle)) * 2
  return score
}

function defaultMarketEntries() {
  const entries: MarketEntry[] = []
  for (const symbol of defaultMarketSymbols) {
    const entry = marketEntriesBySymbol.get(symbol) ?? fallbackDefaultMarketEntries[symbol]
    if (entry) entries.push(entry)
  }
  return entries
}

function marketResult(entry: MarketEntry): AlgoliaSearchResult {
  const symbol = entry.symbol.toUpperCase()
  return {
    id: `market-${symbol.toLowerCase()}`,
    sourceId: 'market',
    sourceLabel: 'Market',
    title: entry.name,
    subtitle: `${symbol} · ${entry.category}`,
    href: `/market/${encodeURIComponent(symbol)}`,
    external: false,
    premium: false,
  }
}

export function searchMarketSymbols(query: string, limit = 5): AlgoliaSearchResult[] {
  const trimmed = query.trim()
  if (!trimmed) return defaultMarketEntries().slice(0, limit).map(marketResult)

  return marketEntries
    .map((entry) => ({ entry, score: scoreMarketEntry(entry, trimmed) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ entry }) => marketResult(entry))
}

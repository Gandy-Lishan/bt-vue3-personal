import { describe, expect, it } from 'vitest'
import { searchMarketSymbols } from '@/shared/search/market'

describe('market symbol search', () => {
  it('returns common markets for an empty query', () => {
    expect(searchMarketSymbols('').map((result) => result.href)).toEqual([
      '/market/SPX',
      '/market/NDX',
      '/market/AAPL',
      '/market/QQQ',
      '/market/DIA',
    ])
    expect(searchMarketSymbols('   ', 3).map((result) => result.href)).toEqual([
      '/market/SPX',
      '/market/NDX',
      '/market/AAPL',
    ])
  })

  it('matches a symbol prefix', () => {
    const results = searchMarketSymbols('AAPL')

    expect(results.length).toBeGreaterThan(0)
    expect(results[0].title).toBe('Apple Inc')
    expect(results[0].subtitle).toContain('AAPL')
  })

  it('matches a company name', () => {
    const results = searchMarketSymbols('Apple')

    expect(results.some((result) => result.title === 'Apple Inc')).toBe(true)
  })

  it('returns market results with the local market route', () => {
    const [result] = searchMarketSymbols('AAPL')

    expect(result.sourceId).toBe('market')
    expect(result.external).toBe(false)
    expect(result.href).toBe('/market/AAPL')
  })

  it('ranks an exact symbol match above a fuzzy name match', () => {
    const results = searchMarketSymbols('AAPL')

    // AAPL the symbol should beat entries that merely contain "aapl" in their name.
    expect(results[0].subtitle).toContain('AAPL')
  })

  it('caps results to the requested limit', () => {
    expect(searchMarketSymbols('a', 5)).toHaveLength(5)
  })
})

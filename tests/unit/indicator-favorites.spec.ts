import { describe, expect, it } from 'vitest'
import {
  favoriteActionLabel,
  favoriteIds,
  favoriteStubRow,
  parseFavoriteIndicators,
  parseFavoritesPayload,
} from '@/entities/indicator/model/indicator.favorites'
import { displayIndicatorValue } from '@/entities/indicator/model/indicator.values'
import { getIndicatorTableMeta } from '@/entities/indicator/model/indicator.table'

describe('favorites payload', () => {
  it('parses the JSON-string form the endpoint sends', () => {
    const payload = parseFavoritesPayload({
      favorite_indicator: '[{"url":"spx_bullish_percent","name":"S&P 500 Bullish Percent"}]',
      favorite_symbol: '["SPX","NDX"]',
    })

    expect(payload.indicators).toEqual([{ url: 'spx_bullish_percent', name: 'S&P 500 Bullish Percent' }])
    expect(payload.symbolsRaw).toBe('["SPX","NDX"]')
  })

  it('keeps favorite_symbol byte-for-byte, including spacing', () => {
    const raw = '[ "SPX" ,  "NDX" ]'

    expect(parseFavoritesPayload({ favorite_symbol: raw }).symbolsRaw).toBe(raw)
  })

  it('accepts a real array where a JSON string was expected', () => {
    const payload = parseFavoritesPayload({
      favorite_indicator: [{ url: 'a', name: 'A' }],
      favorite_symbol: ['SPX'],
    })

    expect(payload.indicators).toEqual([{ url: 'a', name: 'A' }])
    expect(payload.symbolsRaw).toBe('[]')
  })

  it('degrades to empty rather than throwing on unusable payloads', () => {
    expect(parseFavoritesPayload(undefined)).toEqual({ indicators: [], symbolsRaw: '[]' })
    expect(parseFavoritesPayload(null)).toEqual({ indicators: [], symbolsRaw: '[]' })
    expect(parseFavoritesPayload('nonsense')).toEqual({ indicators: [], symbolsRaw: '[]' })
    expect(parseFavoritesPayload({})).toEqual({ indicators: [], symbolsRaw: '[]' })
    expect(parseFavoritesPayload({ favorite_indicator: 'not json' }).indicators).toEqual([])
    expect(parseFavoritesPayload({ favorite_indicator: '{}' }).indicators).toEqual([])
  })

  it('drops entries with no url and falls back to the url for a missing name', () => {
    expect(parseFavoriteIndicators('[{"url":"a"},{"name":"no url"},null,7,{"url":"b","name":""}]')).toEqual([
      { url: 'a', name: 'a' },
      { url: 'b', name: 'b' },
    ])
  })

  it('accepts chart_name and chart_url aliases', () => {
    expect(parseFavoriteIndicators('[{"chart_url":"x","chart_name":"X"}]')).toEqual([{ url: 'x', name: 'X' }])
  })
})

describe('favorite action label', () => {
  it('reads as a removal for a starred indicator and an addition otherwise', () => {
    expect(favoriteActionLabel(true)).toBe('Remove from favorite indicators')
    expect(favoriteActionLabel(false)).toBe('Add to favorite indicators')
  })
})

describe('favorite ids', () => {
  it('matches case-insensitively', () => {
    const ids = favoriteIds([{ url: 'SPX_Bullish', name: 'x' }])

    expect(ids.has('spx_bullish')).toBe(true)
    expect(ids.has('other')).toBe(false)
  })
})

describe('favorite stub rows', () => {
  const columns = getIndicatorTableMeta('stock_complete_list').columns

  function cell(row: ReturnType<typeof favoriteStubRow>, key: string) {
    const column = columns.find((item) => item.key === key)
    if (!column) throw new Error(`No column for ${key}`)
    return displayIndicatorValue(row, column)
  }

  it('renders the name with dashes for everything the payload lacks', () => {
    const row = favoriteStubRow({ url: 'spx_bullish_percent', name: 'S&P 500 Bullish Percent' })

    expect(cell(row, 'chart_name')).toBe('S&P 500 Bullish Percent')
    expect(cell(row, 'last_value')).toBe('—')
    expect(cell(row, 'last_change')).toBe('—')
    expect(cell(row, 'last_update')).toBe('—')
  })

  it('keeps the sentiment meter neutral rather than reading as extreme pessimism', () => {
    expect(favoriteStubRow({ url: 'a', name: 'A' }).sentimentScore).toBe(4)
  })

  it('marks the row as favorited so the star stays filled', () => {
    expect(favoriteStubRow({ url: 'a', name: 'A' }).favorite).toBe(true)
  })

  it('falls back to the url when the name is empty', () => {
    expect(favoriteStubRow({ url: 'spx_bullish_percent', name: '' }).name).toBe('spx_bullish_percent')
  })
})

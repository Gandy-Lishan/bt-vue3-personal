import { describe, expect, it } from 'vitest'
import {
  inferIndicatorSourceFromRaw,
  isUnavailableIndicatorId,
} from '@/entities/indicator/model/indicator.source'

describe('indicator source resolver', () => {
  it('routes stock sentiment details to the S&P 1500 source', () => {
    expect(inferIndicatorSourceFromRaw({ sub_type: 'stock_sent' }, 'xlv_reltrend_above8_spx_ratio')).toBe(
      'sp_1500_complete_list',
    )
  })

  it('routes stock universe types to their matching optix tables', () => {
    expect(inferIndicatorSourceFromRaw({ type: 'stock_nasdaq' })).toBe('ndx_100_complete_list')
    expect(inferIndicatorSourceFromRaw({ type: 'stock_russell' })).toBe('russell_3000_complete_list')
  })

  it('prioritizes stock_sent over other stock source hints', () => {
    expect(inferIndicatorSourceFromRaw({ type: 'stock_nasdaq', sub_type: 'stock_sent' })).toBe(
      'sp_1500_complete_list',
    )
  })

  it('ignores raw source_list and resolves from type groups and sub_type', () => {
    expect(
      inferIndicatorSourceFromRaw({
        source_list: 'etf_flow',
        sub_type: 'stock_sent',
      }),
    ).toBe('sp_1500_complete_list')
  })

  it('maps old group and subtype branches to current catalog sources', () => {
    expect(inferIndicatorSourceFromRaw({ groups: 'bonds' })).toBe('bond_complete_list')
    expect(inferIndicatorSourceFromRaw({ groups: 'commod' })).toBe('commodity_complete_list')
    expect(inferIndicatorSourceFromRaw({ sub_type: 'crp_breadth' })).toBe('crypto_breadth')
    expect(inferIndicatorSourceFromRaw({ type: 'commod_seasonality' })).toBe('commod_seasonality')
  })

  it('maps trend reltrend prefixes to current optix sources', () => {
    expect(inferIndicatorSourceFromRaw({ groups: 'trend_reltrend', sub_type: 'ndx100_trend_reltrend' })).toBe(
      'ndx_100_complete_list',
    )
    expect(inferIndicatorSourceFromRaw({ groups: 'trend_reltrend', sub_type: 'russell3000_trend_reltrend' })).toBe(
      'russell_3000_complete_list',
    )
  })

  it('marks legacy missing indicators as unavailable', () => {
    expect(isUnavailableIndicatorId('vol_vix_transform')).toBe(true)
    expect(inferIndicatorSourceFromRaw({ sub_type: 'stock_sent' }, 'vol_vix_transform')).toBeNull()
  })
})

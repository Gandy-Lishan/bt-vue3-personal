import { describe, expect, it } from 'vitest'
import { cftcAffectedIndicatorIds, hasCftcDataNotice } from '@/entities/indicator/model/indicator.notices'

describe('cftc data notice', () => {
  it('covers every indicator key from the advisory list', () => {
    const expected = [
      'cot_all', 'cot_hedgers', 'cot_speculators', 'cot_spx', 'cot_spx_mini', 'cot_spx_combo',
      'cot_ndx', 'cot_ndx_mini', 'cot_ndx_combo', 'cot_djia', 'cot_djia_mini', 'cot_djia_combo',
      'cot_rut', 'cot_nikkei', 'cot_vix', 'cot_bonds_eurodollar', 'cot_bonds_two', 'cot_bonds_five',
      'cot_bonds_ten', 'cot_bonds_thirty', 'cot_crb', 'cot_aussie', 'cot_pound', 'cot_canada',
      'cot_euro', 'cot_peso', 'cot_franc', 'cot_dollar', 'cot_yen', 'cot_crude', 'cot_natural',
      'cot_unleaded', 'cot_copper', 'cot_gold', 'cot_palladium', 'cot_platinum', 'cot_silver',
      'cot_corn', 'cot_oats', 'cot_soybeans', 'cot_wheat', 'cot_cocoa', 'cot_coffee', 'cot_cotton',
      'cot_oj', 'cot_sugar', 'cot_cattle', 'cot_hogs', 'cot_energy', 'cot_metals', 'cot_ag',
      'cot_speculators_small', 'etf_two', 'etf_five', 'etf_ten', 'etf_thirty', 'etf_eurodollar',
      'cot_bonds_ultraten', 'cot_bonds_ultrathirty', 'cot_all_combo', 'cot_sofr-3m', 'cot_btc',
    ]

    expect(expected).toHaveLength(62)
    expect([...cftcAffectedIndicatorIds].sort()).toEqual([...expected].sort())
  })

  it('shows the notice for an affected indicator', () => {
    expect(hasCftcDataNotice('cot_all')).toBe(true)
    expect(hasCftcDataNotice('cot_btc')).toBe(true)
    // Hyphenated key, not a typo for an underscore.
    expect(hasCftcDataNotice('cot_sofr-3m')).toBe(true)
  })

  it('stays hidden for anything else', () => {
    expect(hasCftcDataNotice('spx_bullish_percent')).toBe(false)
    expect(hasCftcDataNotice('')).toBe(false)
    expect(hasCftcDataNotice('cot_all_extra')).toBe(false)
  })

  it('matches regardless of case or surrounding whitespace', () => {
    expect(hasCftcDataNotice('COT_ALL')).toBe(true)
    expect(hasCftcDataNotice('  cot_all  ')).toBe(true)
  })
})

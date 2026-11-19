import { beforeEach, describe, expect, it } from 'vitest'
import { ensureGuestFeaturedIndicators, guestChartPreview, isGuestFeaturedIndicator } from '@/entities/indicator/model/indicator.guest'
import type { Indicator } from '@/entities/indicator/model/indicator.types'
import { mount } from '@vue/test-utils'
import IndicatorListTable from '@/pages/indicators/ui/IndicatorListTable.vue'

describe('guest indicator preview', () => {
  beforeEach(() => sessionStorage.clear())

  it('selects five indicators from the first page and keeps the selection stable', () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({ id: `intraday:${index}`, sourceList: 'intraday' })) as Indicator[]
    ensureGuestFeaturedIndicators(rows)
    const selected = rows.filter((row) => isGuestFeaturedIndicator(row.id))
    expect(selected).toHaveLength(5)
    expect(selected.every((row) => rows.indexOf(row) < 12)).toBe(true)
    ensureGuestFeaturedIndicators([...rows].reverse())
    expect(rows.filter((row) => isGuestFeaturedIndicator(row.id))).toEqual(selected)
  })

  it('shows only the three-year window ending three months ago', () => {
    const rows = [
      { date: '2022-11-16', value: 1 },
      { date: '2024-01-01', value: 2 },
      { date: '2026-07-01', value: 3 },
      { date: '2026-09-01', value: 4 },
    ]
    expect(guestChartPreview(rows, new Date('2026-11-17T12:00:00Z'))).toEqual(rows.slice(1, 3))
  })

  it('keeps metadata visible while locking recent table values for non-featured rows', () => {
    const row = { id: 'locked', name: 'Locked Indicator', sourceList: 'stock', group: 'Stocks',
      currentValue: 123.45, change: 6.78, sentimentScore: 7, updatedAt: '2026-11-17',
      raw: { last_value: 123.45, last_change: 6.78, last_update: '2026-11-17' } } as Indicator
    const wrapper = mount(IndicatorListTable, { props: {
      indicators: [row], guestMode: true, showFavorite: false,
      columns: [
        { key: 'chart_name', label: 'Name', kind: 'name' },
        { key: 'last_value', label: 'Value', kind: 'number' },
        { key: 'last_change', label: 'Change', kind: 'change' },
        { key: 'sentiment', label: 'Sentiment', kind: 'sentiment' },
        { key: 'last_update', label: 'Date', kind: 'date', rawDate: true },
      ],
    } })
    expect(wrapper.text()).toContain('Locked Indicator')
    expect(wrapper.text()).toContain('2026-11-17')
    expect(wrapper.text()).not.toContain('123.45')
    expect(wrapper.text()).not.toContain('6.78')
    expect(wrapper.findAll('tbody td').filter((cell) => cell.text().includes('🔒'))).toHaveLength(3)
  })
})

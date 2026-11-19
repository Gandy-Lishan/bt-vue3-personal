import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { Indicator } from '@/entities/indicator/model/indicator.types'
import IndicatorListTable from '@/pages/indicators/ui/IndicatorListTable.vue'

describe('Intraday numeric flash', () => {
  it('highlights only changed numbers in the direction of their update', async () => {
    const item: Indicator = {
      id: 'intraday:intraday:ASO', name: 'ASO', group: 'Intraday', groupId: 'intraday',
      subgroup: 'intraday', sourceList: 'intraday', timeFrame: '5 min', currentValue: 60,
      change: 0, updatedAt: '10:00', sentiment: 'neutral', sentimentScore: 4,
      trendLines: [], favorite: false, type: 'intraday', marketSymbol: 'ASO',
      raw: { close: 100, optix: 60, last_update: '10:00' },
    }
    const wrapper = mount(IndicatorListTable, { props: {
      indicators: [item], animateUpdates: true, showFavorite: false,
      columns: [
        { key: 'close', label: 'Close', kind: 'number' },
        { key: 'optix', label: 'Optix', kind: 'number' },
        { key: 'last_update', label: 'Time', kind: 'text' },
      ],
    } })
    await wrapper.setProps({ indicators: [{ ...item, raw: { close: 101, optix: 58, last_update: '10:05' } }] })
    expect(wrapper.findAll('.data-flash-up')).toHaveLength(1)
    expect(wrapper.findAll('.data-flash-down')).toHaveLength(1)
    expect(wrapper.findAll('td')[2].find('.data-flash-up, .data-flash-down').exists()).toBe(false)
    wrapper.unmount()
  })
})

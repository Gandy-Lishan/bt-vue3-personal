import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  INDICATOR_AD_DISMISS_STORAGE_KEY,
  type IndicatorAd,
} from '@/entities/indicator/model/indicator.ads'
import IndicatorAdCarousel from '@/pages/indicators/ui/IndicatorAdCarousel.vue'

const ads: IndicatorAd[] = [
  {
    id: 'light-data-api-2026',
    badge: 'NEW',
    title: 'Use SentimenTrader data in your own system with Light Data API',
    description: 'Access full historical data and ongoing updates for your selected indicators.',
    ctaLabel: 'Explore Light Data API',
    ctaHref: 'https://sentimentrader.com/light-indicator-api',
    ctaTarget: '_blank',
    footnote: 'Starts at $300/year · 10 indicators',
  },
  {
    id: 'sample-follow-up',
    title: 'Second promotion',
    description: 'A second promotion keeps the carousel reusable.',
    ctaLabel: 'Open',
    ctaHref: '/sample',
  },
]

describe('IndicatorAdCarousel', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders the active promotion copy and CTA', () => {
    const wrapper = mount(IndicatorAdCarousel, {
      props: {
        ads: ads.slice(0, 1),
        autoRotate: false,
      },
    })

    expect(wrapper.text()).toContain('NEW')
    expect(wrapper.text()).toContain('Use SentimenTrader data in your own system with Light Data API')
    expect(wrapper.text()).toContain('Starts at $300/year · 10 indicators')
    expect(wrapper.get('a').attributes('href')).toBe('https://sentimentrader.com/light-indicator-api')
    expect(wrapper.get('a').attributes('target')).toBe('_blank')
  })

  it('stores dismissed ads and hides them after a reload', async () => {
    const wrapper = mount(IndicatorAdCarousel, {
      props: {
        ads: ads.slice(0, 1),
        autoRotate: false,
      },
    })

    await wrapper.get('[aria-label="Dismiss promotion"]').trigger('click')

    expect(wrapper.text()).not.toContain('Use SentimenTrader data')
    expect(JSON.parse(window.localStorage.getItem(INDICATOR_AD_DISMISS_STORAGE_KEY) ?? '[]')).toEqual([
      'light-data-api-2026',
    ])

    const hiddenWrapper = mount(IndicatorAdCarousel, {
      props: {
        ads: ads.slice(0, 1),
        autoRotate: false,
      },
    })

    expect(hiddenWrapper.text()).toBe('')
  })

  it('can navigate between multiple promotions', async () => {
    const wrapper = mount(IndicatorAdCarousel, {
      props: {
        ads,
        autoRotate: false,
      },
    })

    expect(wrapper.text()).toContain('Use SentimenTrader data')

    await wrapper.get('[aria-label="Next promotion"]').trigger('click')

    expect(wrapper.text()).toContain('Second promotion')
    expect(wrapper.text()).not.toContain('Use SentimenTrader data')
  })
})

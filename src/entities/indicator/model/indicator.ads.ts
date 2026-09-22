export interface IndicatorAd {
  id: string
  badge?: string
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
  ctaTarget?: '_blank' | '_self'
  footnote?: string
}

export const INDICATOR_AD_DISMISS_STORAGE_KEY = 'sentimentrader.dismissedIndicatorAds'

export const indicatorPageAds: IndicatorAd[] = [
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
]

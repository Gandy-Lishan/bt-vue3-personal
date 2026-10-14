import { createRouter, createWebHistory } from 'vue-router'
import { installRouterPermissionGuard } from '@/shared/auth/permission'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/pages/dashboard/DashboardPage.vue'),
    },
    {
      path: '/backtests',
      name: 'backtests',
      component: () => import('@/pages/backtests/BacktestsPage.vue'),
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('@/pages/search/SearchPage.vue'),
    },
    {
      path: '/strategy',
      name: 'strategy',
      component: () => import('@/pages/strategy/StrategyPage.vue'),
    },
    {
      path: '/strategy/descriptions',
      name: 'strategy-detail-legacy',
      component: () => import('@/pages/strategy/StrategyDetailPage.vue'),
    },
    {
      path: '/strategy/:url',
      name: 'strategy-detail',
      component: () => import('@/pages/strategy/StrategyDetailPage.vue'),
    },
    {
      path: '/market',
      redirect: '/market/predict',
    },
    {
      path: '/market/predict',
      name: 'market-prediction',
      component: () => import('@/pages/market/MarketPredictionPage.vue'),
    },
    {
      path: '/market/predict/:ticker',
      name: 'market-prediction-detail',
      component: () => import('@/pages/market/MarketPredictionDetailPage.vue'),
    },
    {
      path: '/market/sec/:ticker/:tab?',
      redirect: (to) => {
        const tabMap: Record<string, string> = {
          chart: 'chart',
          analysts: 'analysts',
          earnings: 'earnings',
          financials: 'financials',
          balancesheet: 'balanceSheet',
          cashflow: 'cashFlow',
          ownership: 'ownership',
          news: 'news',
          sec: 'sec',
        }
        const rawTab = typeof to.params.tab === 'string' ? to.params.tab.toLowerCase() : ''
        const tab = tabMap[rawTab]
        return {
          name: 'market-prediction-detail',
          params: { ticker: to.params.ticker },
          query: tab ? { tab } : {},
        }
      },
    },
    {
      path: '/scannerai',
      name: 'smart-stock-scanner',
      component: () => import('@/pages/scanner/SmartScannerPage.vue'),
    },
    {
      path: '/scannerai/option',
      name: 'smart-option-scanner',
      component: () => import('@/pages/scanner/SmartOptionScannerPage.vue'),
    },
    {
      path: '/scannerai/scannerai_chart',
      name: 'smart-stock-scanner-detail',
      component: () => import('@/pages/scanner/SmartScannerDetailPage.vue'),
    },
    {
      path: '/home/scannerai',
      redirect: '/scannerai',
    },
    {
      path: '/indicators',
      name: 'indicators',
      meta: { needsIndicatorFavorites: true },
      component: () => import('@/pages/indicators/IndicatorsPage.vue'),
    },
    {
      path: '/indicators/:id',
      name: 'indicator-detail',
      meta: { needsIndicatorFavorites: true },
      component: () => import('@/pages/indicators/IndicatorDetailPage.vue'),
    },
    {
      path: '/trend_score',
      name: 'trend-score',
      meta: { needsIndicatorFavorites: true },
      component: () => import('@/pages/indicators/TrendPage.vue'),
    },
    {
      path: '/trend_score/trend',
      redirect: (to) => ({ path: '/trend_score', query: to.query }),
    },
    {
      path: '/trend_score/historical',
      redirect: (to) => ({ path: '/historical', query: to.query }),
    },
    {
      path: '/trend_score/:id',
      name: 'trend-score-detail',
      meta: { needsIndicatorFavorites: true },
      component: () => import('@/pages/indicators/IndicatorDetailPage.vue'),
    },
    {
      path: '/historical',
      name: 'historical-volatility',
      component: () => import('@/pages/indicators/HistoricalVolatilityPage.vue'),
    },
    {
      path: '/historical/:id',
      name: 'historical-volatility-detail',
      component: () => import('@/pages/indicators/IndicatorDetailPage.vue'),
    },
    {
      path: '/sector_trend_score',
      name: 'sector-trend-score',
      component: () => import('@/pages/indicators/TrendPage.vue'),
    },
    {
      path: '/seasonality',
      name: 'seasonality',
      component: () => import('@/pages/seasonality/SeasonalityPage.vue'),
    },
    {
      path: '/cpm',
      redirect: '/cpm/list',
    },
    {
      path: '/cpm/:section?',
      name: 'cpm',
      component: () => import('@/pages/cpm/CPMPage.vue'),
    },
    {
      path: '/404',
      name: 'unauthorized',
      component: () => import('@/pages/system/UnauthorizedPage.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/system/UnauthorizedPage.vue'),
    },
  ],
})

installRouterPermissionGuard(router)

export default router

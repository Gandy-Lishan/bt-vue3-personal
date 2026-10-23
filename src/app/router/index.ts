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
      path: '/MR/blog/:slug',
      name: 'report-detail',
      component: () => import('@/pages/reports/ReportDetailPage.vue'),
    },
    {
      path: '/MR/tags/:blogTag/:page?',
      name: 'reports-by-tag',
      component: () => import('@/pages/reports/ReportPage.vue'),
    },
    {
      path: '/MR/archived_reports/:year/:page?',
      name: 'daily-report-archives',
      component: () => import('@/pages/reports/ReportPage.vue'),
    },
    {
      path: '/MR/old_archived_reports/:year/:page?',
      name: 'old-daily-report-archives',
      component: () => import('@/pages/reports/ReportPage.vue'),
    },
    {
      path: '/MR/active_studies',
      name: 'active-studies',
      component: () => import('@/pages/reports/ActiveStudiesPage.vue'),
    },
    {
      path: '/MR/minutes',
      name: 'minutes',
      component: () => import('@/pages/reports/MinutesPage.vue'),
    },
    {
      path: '/MR/minutes/:minuteId',
      name: 'minute-detail',
      component: () => import('@/pages/reports/MinuteDetailPage.vue'),
    },
    {
      path: '/MR/archived_studies',
      name: 'archived-studies',
      component: () => import('@/pages/reports/ArchivedStudiesPage.vue'),
    },
    {
      path: '/MR/:pathMatch(.*)*',
      name: 'reports',
      component: () => import('@/pages/reports/ReportPage.vue'),
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
      path: '/swing_trading_dashboard',
      name: 'swing-trading-dashboard',
      // The migrated dashboard intentionally remains an Options API JavaScript SFC.
      // @ts-expect-error vue-tsc does not emit a declaration for JavaScript-only Vue SFCs.
      component: () => import('@/pages/swing-trading/SwingTradingDashboardPage.vue'),
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
      path: '/my-stuff',
      redirect: '/my-stuff/signals',
    },
    {
      path: '/my-stuff/signals/new',
      name: 'my-signal-new',
      component: () => import('@/pages/my-stuff/SignalBuilderPage.vue'),
    },
    {
      path: '/my-stuff/signals/:id/edit',
      name: 'my-signal-edit',
      component: () => import('@/pages/my-stuff/SignalBuilderPage.vue'),
    },
    {
      path: '/my-stuff/indicators/new',
      name: 'my-indicator-new',
      component: () => import('@/pages/my-stuff/IndicatorBuilderPage.vue'),
    },
    {
      path: '/my-stuff/indicators/edit',
      name: 'my-indicator-edit',
      component: () => import('@/pages/my-stuff/IndicatorBuilderPage.vue'),
    },
    {
      path: '/my-stuff/concierge',
      name: 'my-stuff-concierge',
      component: () => import('@/pages/my-stuff/ConciergeServicePage.vue'),
    },
    {
      path: '/my-stuff/:section?',
      name: 'my-stuff',
      component: () => import('@/pages/my-stuff/MyStuffPage.vue'),
    },
    { path: '/my_signals', redirect: '/my-stuff/signals' },
    { path: '/myindicator', redirect: '/my-stuff/indicators' },
    { path: '/my_screen', redirect: '/my-stuff/screens' },
    { path: '/watchlist', redirect: '/my-stuff/watchlist' },
    { path: '/stuff_contact', redirect: '/my-stuff/concierge' },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/system/LoginPage.vue'),
      meta: { public: true },
    },
    {
      path: '/logout',
      name: 'logout',
      beforeEnter: async () => {
        try { await (await import('@/shared/api/stApi')).logout() } catch {}
        document.cookie = 'sentimen_session=; path=/; Max-Age=0'
        document.cookie = 'devbt2Userid=; path=/; Max-Age=0'
        return { path: '/login', replace: true }
      },
    },
    {
      path: '/pricing',
      name: 'pricing',
      component: () => import('@/pages/pricing/PricingPage.vue'),
      meta: { public: true },
    },
    {
      path: '/checkout',
      name: 'checkout',
      component: () => import('@/pages/checkout/CheckoutPage.vue'),
      meta: { public: true },
    },
    {
      path: '/checkout-success',
      name: 'checkout-success',
      component: () => import('@/pages/checkout/CheckoutSuccessPage.vue'),
      meta: { public: true },
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

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
      path: '/indicators',
      name: 'indicators',
      component: () => import('@/pages/indicators/IndicatorsPage.vue'),
    },
    {
      path: '/indicators/:id',
      name: 'indicator-detail',
      component: () => import('@/pages/indicators/IndicatorDetailPage.vue'),
    },
    {
      path: '/trend_score',
      name: 'trend-score',
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

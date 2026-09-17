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

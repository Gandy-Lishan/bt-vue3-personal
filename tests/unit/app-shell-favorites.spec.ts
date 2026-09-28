import { flushPromises, shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIndicatorStore } from '@/entities/indicator/model/indicator.store'
import AppShell from '@/shared/layout/AppShell.vue'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/market/predict', component: { template: '<div />' } },
      { path: '/indicators', meta: { needsIndicatorFavorites: true }, component: { template: '<div />' } },
    ],
  })
}

describe('AppShell favorites loading', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('does not load indicator favorites on Market Prediction routes', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter()
    await router.push('/market/predict')
    await router.isReady()

    const store = useIndicatorStore()
    const ensureFavorites = vi.spyOn(store, 'ensureFavorites').mockResolvedValue(undefined)

    shallowMount(AppShell, {
      global: {
        plugins: [pinia, router],
        stubs: {
          AppToastStack: true,
          SentimentFooter: true,
          SentimentHeader: true,
        },
      },
    })
    await flushPromises()

    expect(ensureFavorites).not.toHaveBeenCalled()
  })

  it('loads indicator favorites when entering indicator routes', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createTestRouter()
    await router.push('/market/predict')
    await router.isReady()

    const store = useIndicatorStore()
    const ensureFavorites = vi.spyOn(store, 'ensureFavorites').mockResolvedValue(undefined)

    shallowMount(AppShell, {
      global: {
        plugins: [pinia, router],
        stubs: {
          AppToastStack: true,
          SentimentFooter: true,
          SentimentHeader: true,
        },
      },
    })
    await router.push('/indicators')
    await flushPromises()

    expect(ensureFavorites).toHaveBeenCalledTimes(1)
  })
})

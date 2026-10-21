<template>
  <main class="min-h-screen bg-[var(--app-bg)] px-4 py-12 text-[var(--app-text)]">
    <div class="mx-auto max-w-6xl">
      <h1 class="text-center text-3xl font-bold">Trade Smarter with the Plan Built for You</h1>

      <!-- Billing Toggle -->
      <div class="mt-8 flex justify-center gap-2">
        <button
          :class="['rounded-md px-4 py-2 text-sm font-medium transition', billingCycle === 'monthly' ? 'bg-[var(--app-primary)] text-white' : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)]']"
          @click="billingCycle = 'monthly'"
        >
          Monthly billing
        </button>
        <button
          :class="['rounded-md px-4 py-2 text-sm font-medium transition', billingCycle === 'annual' ? 'bg-[var(--app-primary)] text-white' : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)]']"
          @click="billingCycle = 'annual'"
        >
          Annual billing <span class="ml-1 text-xs opacity-80">Save 17%</span>
        </button>
      </div>

      <!-- Plan Cards -->
      <div class="mt-10 grid gap-6 md:grid-cols-3">
        <div
          v-for="plan in visiblePlans"
          :key="plan.code"
          class="flex flex-col rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-6 transition-shadow hover:shadow-lg"
        >
          <h2 class="text-xl font-semibold">{{ plan.name }}</h2>
          <p class="mt-2 text-sm text-[var(--app-text-secondary)]">{{ plan.description }}</p>

          <div class="mt-4">
            <span class="text-3xl font-bold">{{ plan.price }}</span>
            <span class="ml-1 text-sm text-[var(--app-text-secondary)]">/ {{ plan.interval }}</span>
          </div>
          <p v-if="plan.promo" class="mt-1 text-xs text-[var(--app-text-muted)]">{{ plan.promo }}</p>

          <ul class="mt-4 space-y-2 text-sm text-[var(--app-text-secondary)]">
            <li v-for="(feature, i) in plan.features" :key="i" class="flex items-start gap-2">
              <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--app-positive)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
              {{ feature }}
            </li>
          </ul>

          <RouterLink
            :to="{ name: 'checkout', query: { plan: plan.code } }"
            class="mt-6 rounded-md bg-[var(--app-primary)] px-4 py-2.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Try Free for 14 Days
          </RouterLink>
        </div>
      </div>

      <!-- Newsletter CTA -->
      <div class="mt-16 text-center">
        <p class="text-lg font-medium text-[var(--app-text)]">Not ready to buy? Subscribe to our free newsletter.</p>
        <p class="mt-1 text-sm text-[var(--app-text-secondary)]">The latest news, articles, and free resources delivered to your inbox every week.</p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const billingCycle = ref<'monthly' | 'annual'>('monthly')

interface PlanCard {
  code: string
  name: string
  description: string
  price: string
  interval: string
  promo?: string
  features: string[]
}

const plans: { monthly: PlanCard[]; annual: PlanCard[] } = {
  monthly: [
    {
      code: 'reports-monthly',
      name: 'Research Reports',
      description: 'Expert market insights distilled from thousands of sentiment indicators. For traders who want clarity, not complexity.',
      price: '$59',
      interval: 'month',
      features: [
        'SentimentEdge Report',
        'ModelEdge Report',
        "Kaeppel's Corner",
        'TradingEdge Weekly Report',
        'Intraday Minutes',
        'Market Impact Analysis',
      ],
    },
    {
      code: 'datalite-monthly',
      name: 'Essential Tools',
      description: 'Powerful sentiment and backtesting tools for idea testing and strategy design. For traders who prefer Do-it-Yourself analysis.',
      price: '$79',
      interval: 'month',
      features: [
        '30,000+ data series',
        'Backtest Engine',
        '50+ ready-made strategies',
        'Smart Stock Scanner',
        'Customizable toolkit',
        'Correlation analysis tools',
        'Seasonality tool',
        'Client-exclusive webinars',
        '1-on-1 technical support',
      ],
    },
    {
      code: 'everything-monthly',
      name: 'Everything',
      description: 'All research and tools combined for full analytical capability. For active and professional traders.',
      price: '$99',
      interval: 'month',
      promo: 'Then $99/mo · New subscribers only',
      features: [
        'All Research Reports',
        'All Essential Tools',
        'Active Study',
        'Smart Option Scanner',
        'Market Prediction dashboard',
        'Priority support',
      ],
    },
  ],
  annual: [
    {
      code: 'reports-annual',
      name: 'Research Reports',
      description: 'Expert market insights distilled from thousands of sentiment indicators. For traders who want clarity, not complexity.',
      price: '$49',
      interval: 'month',
      promo: 'Billed $588/year · Save 17%',
      features: [
        'SentimentEdge Report',
        'ModelEdge Report',
        "Kaeppel's Corner",
        'TradingEdge Weekly Report',
        'Intraday Minutes',
        'Market Impact Analysis',
      ],
    },
    {
      code: 'datalite-annual',
      name: 'Essential Tools',
      description: 'Powerful sentiment and backtesting tools for idea testing and strategy design. For traders who prefer Do-it-Yourself analysis.',
      price: '$66',
      interval: 'month',
      promo: 'Billed $792/year · Save 17%',
      features: [
        '30,000+ data series',
        'Backtest Engine',
        '50+ ready-made strategies',
        'Smart Stock Scanner',
        'Customizable toolkit',
        'Correlation analysis tools',
        'Seasonality tool',
        'Client-exclusive webinars',
        '1-on-1 technical support',
      ],
    },
    {
      code: 'everything-annual',
      name: 'Everything',
      description: 'All research and tools combined for full analytical capability. For active and professional traders.',
      price: '$83',
      interval: 'month',
      promo: 'Billed $996/year · Save 17%',
      features: [
        'All Research Reports',
        'All Essential Tools',
        'Active Study',
        'Smart Option Scanner',
        'Market Prediction dashboard',
        'Priority support',
      ],
    },
  ],
}

const visiblePlans = computed(() => plans[billingCycle.value])
</script>

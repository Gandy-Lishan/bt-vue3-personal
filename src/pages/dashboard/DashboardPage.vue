<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBacktestStore } from '@/entities/backtest/model/backtest.store'

const backtestStore = useBacktestStore()
const { activeWorkspace, runs } = storeToRefs(backtestStore)

const metrics = computed(() => [
  { label: 'Strategies', value: runs.value.length.toString(), detail: 'Tracked in workspace' },
  { label: 'Running', value: backtestStore.runningRuns.length.toString(), detail: 'Backtests in progress' },
  { label: 'Avg. return', value: `${backtestStore.averageAnnualReturn}%`, detail: 'Annualized sample result' },
])
</script>

<template>
  <main class="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
    <section class="flex min-h-screen w-full flex-col px-[var(--page-gutter)] py-5">
      <header class="flex flex-col gap-4 border-b border-[var(--app-border)] pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-sm font-medium text-[var(--app-positive)]">{{ activeWorkspace }}</p>
          <h1 class="mt-1 text-2xl font-semibold text-[var(--app-text)]">Backtest operations</h1>
        </div>
        <nav class="flex gap-2" aria-label="Primary">
          <RouterLink
            class="rounded-md px-3 py-2 text-sm font-medium text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
            to="/"
          >
            Dashboard
          </RouterLink>
          <RouterLink
            class="rounded-md px-3 py-2 text-sm font-medium text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
            to="/backtests"
          >
            Backtests
          </RouterLink>
          <RouterLink
            class="rounded-md px-3 py-2 text-sm font-medium text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
            to="/indicators"
          >
            Indicators
          </RouterLink>
        </nav>
      </header>

      <div class="grid gap-4 py-6 sm:grid-cols-3">
        <article
          v-for="metric in metrics"
          :key="metric.label"
          class="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm"
        >
          <p class="text-sm text-[var(--app-text-muted)]">{{ metric.label }}</p>
          <p class="mt-2 text-3xl font-semibold text-[var(--app-text)]">{{ metric.value }}</p>
          <p class="mt-1 text-sm text-[var(--app-text-secondary)]">{{ metric.detail }}</p>
        </article>
      </div>

      <section class="overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        <div class="border-b border-[var(--app-border)] px-4 py-3">
          <h2 class="text-base font-semibold text-[var(--app-text)]">Recent runs</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-[var(--app-border)] text-left text-sm">
            <thead class="bg-[var(--app-surface-muted)] text-[var(--app-text-secondary)]">
              <tr>
                <th class="px-4 py-3 font-medium">Name</th>
                <th class="px-4 py-3 font-medium">Market</th>
                <th class="px-4 py-3 font-medium">Status</th>
                <th class="px-4 py-3 font-medium">Annual return</th>
                <th class="px-4 py-3 font-medium">Max drawdown</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--app-border-muted)]">
              <tr v-for="run in runs" :key="run.id">
                <td class="px-4 py-3 font-medium text-[var(--app-text)]">{{ run.name }}</td>
                <td class="px-4 py-3 text-[var(--app-text-secondary)]">{{ run.market }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-md bg-[var(--app-surface-muted)] px-2 py-1 text-xs font-medium capitalize text-[var(--app-text-secondary)]">
                    {{ run.status }}
                  </span>
                </td>
                <td class="px-4 py-3 text-[var(--app-positive)]">{{ run.annualReturn }}%</td>
                <td class="px-4 py-3 text-[var(--app-negative)]">{{ run.maxDrawdown }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  </main>
</template>

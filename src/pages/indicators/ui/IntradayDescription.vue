<script setup lang="ts">
import { ref } from 'vue'
import descriptions from './intradayChartDescriptions.json'

defineProps<{ charts: boolean }>()
const tabs = [
  { key: 'stem', label: 'STEM.MR' }, { key: 'tick', label: 'TICK' },
  { key: 'po', label: 'Price Oscillator' }, { key: 'trin', label: 'TRIN' },
  { key: 'upissues', label: 'Up Issues' }, { key: 'upvolume', label: 'Up Volume' },
  { key: 'vix_vxn', label: 'VIX & VXN Strength' }, { key: 'equityputcall', label: 'Equity Put/Call' },
  { key: 'iseputcall', label: 'ISE Put/Call' }, { key: 'oexputcall', label: 'OEX Put/Call' },
] as const
type TabKey = typeof tabs[number]['key']
const active = ref<TabKey>('stem')
</script>

<template>
  <div v-if="charts" class="space-y-4">
    <h3 class="text-base font-semibold text-[var(--app-text)]">Description of Intraday Charts</h3>
    <div class="flex flex-wrap gap-2" role="tablist" aria-label="Intraday chart descriptions">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        role="tab"
        :aria-selected="active === tab.key"
        class="rounded-full border px-3 py-1.5 text-[13px] transition-colors"
        :class="active === tab.key
          ? 'border-[var(--app-primary)] bg-[var(--app-primary-soft)] text-[var(--app-primary)] font-medium'
          : 'border-[var(--app-border)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-muted)]'"
        @click="active = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="intraday-chart-description overflow-x-auto" v-html="descriptions[active]" />
  </div>
  <div v-else class="space-y-3">
    <h3 class="text-base font-semibold text-[var(--app-text)]">5-Minute Intraday Optimism Index (Intraday Optix)</h3>
    <p>The 5-Minute Intraday Optimism Index applies the daily sentiment framework to a 5-minute timeframe to measure sentiment shifts during the trading session. It evaluates intraday put versus call volume and order flow, implied volatility, and high-frequency price and volume patterns.</p>
    <p>Each metric is ranked against its historical intraday distribution. The Intraday Optix ranges from 0 (maximum pessimism) to 100 (maximum optimism).</p>
    <h4 class="font-semibold text-[var(--app-text)]">Smoothing &amp; Noise Management</h4>
    <p>Raw 5-minute readings can be noisy. A 12-period moving average covers about one hour; a 39- to 78-period average filters fluctuations across half to a full trading session.</p>
    <h4 class="font-semibold text-[var(--app-text)]">Interpretation &amp; Contrarian Framework</h4>
    <p>Extreme pessimism, such as a 12-period average below 30, can signal panic selling and a potential rebound. Extreme optimism above 70 can signal momentum exhaustion. Longer session smoothers compress these swings, typically into a baseline range of 35 to 65.</p>
  </div>
</template>

<style scoped>
.intraday-chart-description :deep(h4), .intraday-chart-description :deep(h5) { margin: 1rem 0 0.35rem; font-weight: 600; color: var(--app-text); }
.intraday-chart-description :deep(p), .intraday-chart-description :deep(ul) { margin: 0.5rem 0; }
.intraday-chart-description :deep(ul) { list-style: disc; padding-left: 1.5rem; }
.intraday-chart-description :deep(img) { max-width: 100%; height: auto; }
.intraday-chart-description :deep(a) { color: var(--app-primary); text-decoration: underline; }
</style>

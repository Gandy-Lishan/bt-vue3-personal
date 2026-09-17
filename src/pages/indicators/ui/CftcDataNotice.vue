<script setup lang="ts">
import { Info } from '@lucide/vue'
</script>

<template>
  <!--
    Advisory for indicators fed by the paused CFTC weekly reports. Sits directly above
    the detail tabs so it is read before the readings it qualifies, and renders once
    for the whole page rather than inside each affected tab panel.
  -->
  <section
    class="flex items-start gap-3 rounded-t-lg border-b border-[var(--app-border)] bg-[var(--app-primary-soft)] px-5 py-4"
    role="status"
    aria-labelledby="cftc-notice-title"
  >
    <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--app-primary)] text-white">
      <Info :size="15" aria-hidden="true" />
    </span>

    <div class="min-w-0 text-sm leading-6 text-[var(--app-text-secondary)]">
      <h3 id="cftc-notice-title" class="text-sm font-semibold text-[var(--app-text)]">Notice</h3>

      <p class="mt-1.5">
        Due to the ongoing U.S. government shutdown, our Commodity Futures Trading Commission (CFTC)
        data feed is temporarily unavailable.
      </p>
      <p class="mt-1.5">
        This affects certain charts, indicators, and datasets derived from the CFTC's weekly reports.
        Once the government resumes operations, we will promptly synchronize and update all affected data.
      </p>
      <p class="mt-1.5">Thank you for your understanding and continued support.</p>

      <p class="mt-2 text-[var(--app-text-muted)]">
        — <em>The SentimenTrader Team</em>
      </p>
    </div>
  </section>
</template>

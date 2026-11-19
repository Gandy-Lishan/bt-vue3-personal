<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ChartNoAxesCombined, LockKeyhole, X } from '@lucide/vue'

const props = defineProps<{ slug: string }>()
type Rule = { open: string; lock: string; window: string; policyOpen: string; policyLock: string }
const standard = 'Standard indicators · 27 Oct 2023 – 24 Jul 2026.'
const spotlight: Rule = { open: 'Indicator names, definitions, charts inside the guest history window, and neutral research topics.', lock: 'Current readings, changes, context, recent 3-month data and full research notes.', window: standard, policyOpen: 'Historical samples and feature descriptions', policyLock: 'Current readings and signals' }
const rules: Record<string, Rule> = {
  'risk-on-off': { open: 'Model rules, all 21 component names, and dated historical Risk Measure / regime history.', lock: 'Current Risk Measure, current regime, component states, counts, duration, and the latest 3 months.', window: standard, policyOpen: 'Model rules, 21 component names and historical state charts', policyLock: 'Current Risk Measure, regime and component states' },
  'market-environment': { open: 'Eight component definitions, score rules, and dated historical index / health history.', lock: 'Current score, market-health state, component conditions, counts, duration, and the latest 3 months.', window: standard, policyOpen: 'The eight conditions, score rules and historical health matrix', policyLock: 'Current score, market health and component conditions' },
  'tactical-composite-trend-model': { open: 'Model structure, seven components, historical signal paths and sample performance using only open dates.', lock: 'Current tactical regime, current component signals, recent performance and the latest 3 months.', window: standard, policyOpen: 'Model structure, historical signals and sample performance', policyLock: 'Current tactical state, component signals and recent performance' },
  'market-breadth': { open: 'All 19 breadth measures and dated historical matrix values for the guest window.', lock: 'Current breadth values, colors, rankings, comparisons and the latest 3 months.', window: standard, policyOpen: 'The historical matrix, 19 measures, sorting and comparison', policyLock: 'Current breadth readings, sentiment colors and comparisons' },
  bonds: { ...spotlight, policyOpen: 'Indicator definitions, historical charts and research previews', policyLock: 'Current bond indicators, sentiment and full research' },
  energy: { ...spotlight, policyOpen: 'Indicator definitions, historical charts and research previews', policyLock: 'Current energy indicators, sentiment and full research' },
  gold: { ...spotlight, policyOpen: 'Indicator definitions, historical charts and research previews', policyLock: 'Current gold indicators, sentiment and full research' },
  macro: { ...spotlight, policyOpen: 'Indicator definitions, historical charts and research previews', policyLock: 'Current macro indicators, signals and full research' },
  'intraday-monitor': { open: 'Three public index demo cards plus intraday indicator history inside the one-year guest window.', lock: 'Current proprietary intraday readings, the latest month, and intraday history older than one year.', window: 'Intraday · 27 Oct 2025 – 25 Sep 2026.', policyOpen: 'Three demo indexes plus indicator history from 27 Oct 2025 through 25 Sep 2026', policyLock: 'Current indicator readings and the most recent month, plus intraday history older than one year' },
  'seasonality-calendar': { open: 'Calendar navigation, methodology and dated historical scores that fall inside the standard guest window.', lock: 'Recent 3-month scores, future scores, current conditions and derived summaries.', window: standard, policyOpen: 'Calendar navigation, historical scores and methodology overview', policyLock: 'Recent and future daily scores and conditions' },
  'global-breadth-overview': { open: 'Measure definitions and a clearly dated historical breadth snapshot for comparison and sorting.', lock: 'Current regional breadth snapshot, colors, rankings, strength/weakness conclusions and recent 3-month data.', window: 'Historical snapshots shown only from the standard guest window.', policyOpen: 'The historical matrix, region comparison and sorting', policyLock: 'Current regional readings, colors and rankings' },
  'market-sentiment-overview': { open: 'The seven-position scale and a clearly dated historical Optix / sentiment snapshot.', lock: 'Current Optix values, current sentiment position, current distribution / counts and recent 3-month data.', window: 'Historical snapshots shown only from the standard guest window.', policyOpen: 'Historical sentiment examples, filters and the seven-position scale', policyLock: 'Current Optix, sentiment positions and distributions' },
  'optix-heatmap': { open: 'A clearly dated historical heatmap, asset filtering, sorting and historical detail inside the guest window.', lock: 'Current tile colors, current Optix, latest changes, recent curves and the latest 3 months.', window: standard, policyOpen: 'A historical heatmap, moving averages and asset details', policyLock: 'Current asset colors, Optix readings and changes' },
  'rank-charts': { open: 'A clearly dated historical ranking sample with chart/table, search and sorting.', lock: 'Current ranking, current values, current strongest/weakest assets and recent 3-month data.', window: 'Historical rankings shown only from the standard guest window.', policyOpen: 'Historical rankings, asset groups and chart or table views', policyLock: 'Current rankings, values and strongest or weakest assets' },
}
const rule = computed(() => rules[props.slug] ?? { open: 'Historical sample and feature definitions.', lock: 'Current readings and recent signals.', window: standard, policyOpen: 'Historical samples and feature descriptions', policyLock: 'Current readings and signals' })
const intraday = computed(() => props.slug === 'intraday-monitor')
const calendar = computed(() => props.slug === 'seasonality-calendar')
const range = computed(() => intraday.value ? '27 Oct 2025 – 25 Sep 2026' : '27 Oct 2023 – 24 Jul 2026')
const description = computed(() => calendar.value
  ? 'Historical scores are available only within the guest indicator window (27 Oct 2023 – 24 Jul 2026); recent and future scores require membership.'
  : intraday.value
    ? 'Intraday indicator history is available only from 27 Oct 2025 – 25 Sep 2026. The latest month and history older than one year require membership. Three demo index cards remain available.'
    : 'Indicator history is available only from 27 Oct 2023 – 24 Jul 2026. The latest three months and history older than three years require membership.')
const dialog = ref<'unlock' | 'guide' | null>(null)
function close() { dialog.value = null }
function onHeaderMemberAccess(event: Event) {
  (event as CustomEvent<{ handled: boolean }>).detail.handled = true
  dialog.value = 'unlock'
}
window.addEventListener('guest-member-access', onHeaderMemberAccess)
function onKeydown(event: KeyboardEvent) { if (event.key === 'Escape') close() }
watch(dialog, value => {
  if (value) document.addEventListener('keydown', onKeydown)
  else document.removeEventListener('keydown', onKeydown)
})
watch(() => props.slug, close)
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('guest-member-access', onHeaderMemberAccess)
})
</script>

<template>
  <div class="guest-preview">
    <section class="guest-banner" aria-label="Guest access">
      <span class="guest-banner-symbol"><ChartNoAxesCombined :size="18" /></span>
      <div class="guest-banner-copy">
        <div class="guest-banner-title"><span class="guest-eyebrow">GUEST PREVIEW</span><strong>Explore the guest history window</strong></div>
        <p>{{ description }}</p>
      </div>
      <div class="guest-banner-actions">
        <button type="button" class="guest-text-button" @click="dialog = 'guide'">What’s included?</button>
        <button type="button" class="guest-primary" @click="dialog = 'unlock'"><LockKeyhole :size="13" />{{ calendar ? 'Unlock calendar' : 'Unlock current data' }}</button>
      </div>
    </section>
    <section class="guest-page-rule" aria-label="Guest access rules">
      <article class="guest-rule-card open"><div class="guest-rule-label">GUEST CAN VIEW</div><strong>{{ rule.open }}</strong><p>Interactive controls use only the allowed historical sample.</p></article>
      <article class="guest-rule-card locked"><div class="guest-rule-label">MEMBER ACCESS</div><strong>{{ rule.lock }}</strong><p>Locked values are not used for colors, sorting, counts or default selections.</p></article>
      <article class="guest-rule-card window"><div class="guest-rule-label">HISTORY WINDOW</div><strong>{{ rule.window }}</strong><p>Data outside this window is not available in Guest mode.</p></article>
    </section>
    <Teleport to="body">
      <div v-if="dialog" class="guest-modal-backdrop" @click.self="close">
        <section class="guest-modal member-access-modal" role="dialog" aria-modal="true" :aria-label="dialog === 'unlock' ? 'Member access' : 'Guest guide'">
          <div class="guest-modal-head"><div><span class="guest-modal-eyebrow">{{ dialog === 'unlock' ? 'MEMBER ACCESS' : 'GUEST GUIDE' }}</span><h2>{{ dialog === 'unlock' ? (calendar ? 'Recent and future seasonality scores' : 'Current data') : 'What you can explore' }}</h2></div><button type="button" class="guest-close" aria-label="Close" @click="close"><X :size="18" /></button></div>
          <div v-if="dialog === 'unlock'" class="guest-modal-body">
            <div class="guest-access-hero"><span><LockKeyhole :size="22" /></span><h3>Continue with member access</h3><p>Sign in with a subscription that includes this feature to see the latest data.</p></div>
            <div class="guest-access-columns">
              <section><span class="guest-access-label">AVAILABLE NOW</span><h4>Keep exploring</h4><p>{{ rule.policyOpen }}.</p><small>Guest window: {{ range }}</small></section>
              <section><span class="guest-access-label">MEMBER ACCESS</span><h4>See the latest picture</h4><p>{{ rule.policyLock }}.</p><small>Includes recent data and history outside the guest window</small></section>
            </div>
            <div class="guest-access-actions"><a class="guest-primary" href="https://sentimentrader.com/pricing" target="_blank" rel="noopener noreferrer">Explore membership ↗</a><button type="button" class="guest-secondary" @click="close">Continue preview</button></div>
            <p class="guest-signin-note">Already a member? <a href="https://sentimentrader.com/login" target="_blank" rel="noopener noreferrer">Visit SentimenTrader to sign in ↗</a></p>
          </div>
          <div v-else class="guest-modal-body guest-guide">
            <div class="guest-guide-lead"><span class="guest-eyebrow">Guest access</span><h3>Get to know the tools before becoming a member.</h3><p>Every page is open to browse. Historical charts and sample tables let you try the controls and understand the information.</p></div>
            <div class="guest-guide-row"><b>On this page</b><p>{{ rule.policyOpen }}.</p></div>
            <div class="guest-guide-row"><b>Requires membership</b><p>{{ rule.policyLock }}.</p></div>
            <div class="guest-guide-row"><b>Reading the dates</b><p>The sample is based on 27 Oct 2026. Standard indicators are visible only from 27 Oct 2023 through 24 Jul 2026: the latest three months and anything older than three years are restricted. Intraday indicators use a separate window from 27 Oct 2025 through 25 Sep 2026: the latest month and anything older than one year are restricted. Future seasonality scores are also restricted.</p></div>
            <div class="guest-guide-row"><b>Try the interface</b><p>Search names, change views and inspect historical charts. Sorting and colors describe only the open guest window. Intraday’s three public index cards use a four-second demo playback.</p></div>
            <div class="guest-guide-note">Sample readings illustrate the guest experience and are not current market data.</div>
            <button type="button" class="guest-primary" @click="close">Continue exploring ↗</button>
          </div>
          <div v-if="dialog === 'unlock'" class="guest-modal-foot">Sample data · Guest-window experience preview</div>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.guest-preview{margin-top:18px;font-family:Arial,sans-serif}.guest-banner{display:flex;align-items:center;gap:14px;background:#edf5ff;border:1px solid #cfe1fb;border-left:3px solid #2878e7;border-radius:7px;padding:15px 17px;margin-bottom:10px;min-width:0}.guest-banner-symbol{display:flex;align-items:center;justify-content:center;width:34px;height:34px;flex-shrink:0;background:#fff;border:1px solid #d6e5f8;border-radius:7px;color:#246ac3}.guest-banner-copy{min-width:0;flex:1}.guest-banner-title{display:flex;gap:9px;align-items:center;flex-wrap:wrap}.guest-banner-copy strong{color:#254c7d;font-size:12px;font-weight:650}.guest-eyebrow{font-size:8px;letter-spacing:.8px;font-weight:700;color:#3672bb;padding:3px 5px;border:1px solid #c9def8;border-radius:3px;background:#f7fbff}.guest-banner-copy p{font-size:10.5px;line-height:1.7;color:#597696;margin:5px 0 0}.guest-banner-actions{display:flex;align-items:center;gap:12px;flex-shrink:0}.guest-text-button{border:0;padding:4px;background:transparent;color:#356eaf;font-size:10px;text-decoration:underline;text-underline-offset:3px;white-space:nowrap}.guest-primary,.guest-secondary{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:5px;padding:9px 12px;font-size:11px;font-weight:600;text-decoration:none;cursor:pointer}.guest-primary{background:#2878e7;border:1px solid #2878e7;color:#fff}.guest-secondary{background:#fff;border:1px solid #dce6f4;color:#365c8b}.guest-page-rule{display:grid;grid-template-columns:1.1fr 1fr .9fr;gap:10px}.guest-rule-card{background:#fff;border:1px solid #dce7f4;border-radius:7px;padding:13px 15px;min-width:0}.guest-rule-card.open{border-left:3px solid #4c9b7b}.guest-rule-card.locked{border-left:3px solid #6e88a9;background:#f7f9fc}.guest-rule-card.window{border-left:3px solid #3d7fd3;background:#f6f9ff}.guest-rule-label{font-size:8px;letter-spacing:.8px;color:#8095af;font-weight:700;margin-bottom:6px}.guest-rule-card strong{display:block;font-size:11px;color:#34597f;line-height:1.45;margin-bottom:4px}.guest-rule-card p{font-size:10px;line-height:1.6;color:#7389a6;margin:0}.guest-modal-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;background:rgba(11,29,54,.58);padding:20px}.guest-modal{width:min(700px,94vw);max-height:calc(100vh - 40px);overflow:auto;background:#fff;border-radius:9px;box-shadow:0 20px 70px #081d3755;color:#173f72;font-family:Arial,sans-serif}.guest-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;padding:18px 24px;border-bottom:1px solid #e6edf7}.guest-modal-eyebrow{font-size:9px;letter-spacing:1px;font-weight:700;color:#3672bb}.guest-modal-head h2{margin:5px 0 0;font-size:18px;font-weight:650}.guest-close{border:0;background:transparent;color:#7892b2;padding:4px}.guest-modal-body{padding:23px 28px}.guest-access-hero{text-align:center;padding:10px 15px 20px}.guest-access-hero>span{display:flex;align-items:center;justify-content:center;width:45px;height:45px;margin:0 auto 14px;border-radius:10px;background:#edf4ff;border:1px solid #d6e5fa;color:#2b71c8}.guest-access-hero h3{font-size:21px;margin:0 0 8px;color:#173f72}.guest-access-hero p{font-size:12px;line-height:1.7;max-width:420px;margin:0 auto;color:#6b83a3}.guest-access-columns{display:grid;grid-template-columns:1fr 1fr;gap:14px}.guest-access-columns section{border:1px solid #dce6f4;border-radius:7px;background:#fafcff;padding:18px}.guest-access-columns section:last-child{background:#f2f7ff;border-color:#cce0fb}.guest-access-label{font-size:8px;color:#7892b2;letter-spacing:1px;font-weight:700}.guest-access-columns h4{font-size:13px;margin:9px 0}.guest-access-columns p{font-size:11px;line-height:1.8;color:#5c7799;margin:0 0 10px}.guest-access-columns small{font-size:9px;line-height:1.6;color:#8599b2;display:block}.guest-access-actions{display:flex;align-items:center;justify-content:center;gap:10px;margin:24px 0 14px}.guest-signin-note{text-align:center;font-size:10px;color:#8296b0;line-height:1.7;margin:0 0 6px}.guest-signin-note a{font-weight:600;color:#2878e7}.guest-modal-foot{border-top:1px solid #e6edf7;padding:10px 24px;font-size:9px;color:#8ca0ba}.guest-guide{max-width:620px;margin:auto}.guest-guide-lead h3{font-size:20px;line-height:1.4;margin:14px 0 10px}.guest-guide p{font-size:12px;color:#617c9d;line-height:1.8;margin:0}.guest-guide-row{border-top:1px solid #e6edf7;padding:16px 0;display:grid;grid-template-columns:150px minmax(0,1fr);gap:15px}.guest-guide-row b{font-size:11px;color:#365c8b}.guest-guide-lead{padding-bottom:20px}.guest-guide-note{font-size:10px;line-height:1.7;color:#7b90ab;padding:12px 14px;background:#f5f8fd;border-radius:6px;margin:0 0 18px}@media(max-width:900px){.guest-page-rule{grid-template-columns:1fr}}@media(max-width:700px){.guest-banner{flex-wrap:wrap}.guest-banner-symbol{display:none}.guest-banner-actions{width:100%;justify-content:space-between}.guest-access-columns{grid-template-columns:1fr}.guest-guide-row{grid-template-columns:1fr;gap:7px}.guest-access-actions{flex-wrap:wrap}}
</style>

<style scoped>
.member-access-modal {
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  color: var(--app-text);
  font-family: inherit;
}
.member-access-modal .guest-modal-head,
.member-access-modal .guest-modal-foot { border-color: var(--app-border); }
.member-access-modal .guest-modal-eyebrow,
.member-access-modal .guest-access-label { color: var(--app-primary); }
.member-access-modal .guest-modal-head h2,
.member-access-modal .guest-access-hero h3,
.member-access-modal .guest-access-columns h4 { color: var(--app-text); }
.member-access-modal .guest-close,
.member-access-modal .guest-access-hero p,
.member-access-modal .guest-access-columns p,
.member-access-modal .guest-access-columns small,
.member-access-modal .guest-signin-note,
.member-access-modal .guest-modal-foot { color: var(--app-text-secondary); }
.member-access-modal .guest-access-hero > span {
  background: var(--app-surface-soft);
  border-color: var(--app-border);
  color: var(--app-primary);
}
.member-access-modal .guest-access-columns section,
.member-access-modal .guest-access-columns section:last-child {
  background: var(--app-surface-soft);
  border-color: var(--app-border);
}
.member-access-modal .guest-primary {
  background: var(--app-primary);
  border-color: var(--app-primary);
  border-radius: 6px;
  color: #fff;
}
.member-access-modal .guest-secondary {
  background: var(--app-surface);
  border-color: var(--app-border);
  border-radius: 6px;
  color: var(--app-text);
}
.member-access-modal .guest-signin-note a { color: var(--app-primary); }
/* What's included? (guest guide) dialog — same site styling */
.member-access-modal .guest-guide p { color: var(--app-text-secondary); }
.member-access-modal .guest-guide-lead h3 { color: var(--app-text); }
.member-access-modal .guest-guide-lead .guest-eyebrow {
  color: var(--app-primary);
  border-color: var(--app-border);
  background: var(--app-surface-soft);
}
.member-access-modal .guest-guide-row { border-top-color: var(--app-border-muted); }
.member-access-modal .guest-guide-row b { color: var(--app-text); }
.member-access-modal .guest-guide-note {
  background: var(--app-surface-soft);
  color: var(--app-text-muted);
}
</style>

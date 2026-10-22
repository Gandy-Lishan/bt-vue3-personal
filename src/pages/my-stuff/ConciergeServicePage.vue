<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ArrowRight, BellRing, CheckCircle2, Filter, ListChecks, Mail, Send, SlidersHorizontal, Sparkles } from '@lucide/vue'
import { submitConciergeRequest } from '@/entities/my-stuff/api/concierge.api'

const form = reactive({ name: '', email: '', message: '' })
const submitting = ref(false)
const status = ref<'idle' | 'success' | 'error'>('idle')
const errorMessage = ref('')

const services = [
  { title: 'My Signal', text: 'Automated rules that monitor specific market conditions and send daily alerts.', icon: BellRing },
  { title: 'My Indicator', text: 'Custom indicators for monitoring, alerts, and backtesting.', icon: SlidersHorizontal },
  { title: 'My Screen', text: 'Personalized screens that filter stocks or ETFs using the conditions you care about.', icon: Filter },
  { title: 'My Watch List', text: 'Ticker lists with the indicators and data columns you want to follow.', icon: ListChecks },
]

const examples = [
  ['My Signal', 'Tell me when Nasdaq sentiment becomes extremely bearish so I can watch for stress or capitulation.'],
  ['My Indicator', 'Compare the VIX with its recent average to show when volatility is unusually elevated or normalizing.'],
  ['My Screen', 'Find S&P 500 stocks still in an uptrend but showing pessimistic sentiment.'],
  ['My Watch List', 'Put the stocks, core ETFs, and indexes I follow in one view with trend, sentiment, and price behavior.'],
]

const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))

async function submit() {
  status.value = 'idle'
  errorMessage.value = ''
  if (!form.name.trim() || !emailValid.value || !form.message.trim()) {
    status.value = 'error'
    errorMessage.value = 'Please complete all fields and enter a valid email address.'
    return
  }

  submitting.value = true
  try {
    await submitConciergeRequest({ name: form.name.trim(), email: form.email.trim(), message: form.message.trim() })
    status.value = 'success'
    form.name = ''
    form.email = ''
    form.message = ''
  } catch (error) {
    status.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : 'Something went wrong. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="concierge-page">
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow"><Sparkles :size="15" /> My Stuff Concierge</span>
        <h1>Tell us the idea.<br /><span>We’ll build the setup.</span></h1>
        <p>Custom market tools should start with your investment idea, not a technical hurdle. Describe what you want to monitor, measure, screen, or track in plain English.</p>
        <a href="#concierge-request" class="hero-action">Start your request <ArrowRight :size="17" /></a>
      </div>
      <div class="process-card">
        <p class="process-label">How it works</p>
        <ol>
          <li><span>1</span><div><strong>Describe your idea</strong><small>Use plain English—every idea is welcome.</small></div></li>
          <li><span>2</span><div><strong>We translate it</strong><small>Our team creates the custom setup inside My Stuff.</small></div></li>
          <li><span>3</span><div><strong>Review and refine</strong><small>Your finished tool appears in the portal, ready to use.</small></div></li>
        </ol>
      </div>
    </section>

    <section class="content-section">
      <div class="section-heading"><p>Built around your workflow</p><h2>What we can help you create</h2></div>
      <div class="service-grid">
        <article v-for="service in services" :key="service.title" class="service-card">
          <span class="service-icon"><component :is="service.icon" :size="21" /></span>
          <h3>{{ service.title }}</h3><p>{{ service.text }}</p>
        </article>
      </div>
    </section>

    <section class="examples-section">
      <div class="section-heading"><p>Need a starting point?</p><h2>Ideas you can send us</h2></div>
      <div class="examples-list">
        <div v-for="example in examples" :key="example[0]"><CheckCircle2 :size="18" /><p><strong>{{ example[0] }}:</strong> {{ example[1] }}</p></div>
      </div>
    </section>

    <section id="concierge-request" class="request-section">
      <div class="request-copy">
        <span class="eyebrow"><Mail :size="15" /> Send your request</span>
        <h2>What would you like us to build?</h2>
        <p>Share as much or as little detail as you have. Our team will follow up if anything needs clarification.</p>
        <p class="email-note">Prefer email? <a href="mailto:admin@sentimentrader.com">admin@sentimentrader.com</a></p>
      </div>
      <form class="request-form" @submit.prevent="submit">
        <div class="form-row">
          <label><span>Name</span><input v-model="form.name" type="text" autocomplete="name" placeholder="Your name" /></label>
          <label><span>Email</span><input v-model="form.email" type="email" autocomplete="email" placeholder="you@company.com" /></label>
        </div>
        <label><span>Tell us about your idea</span><textarea v-model="form.message" rows="7" placeholder="What would you like to monitor, measure, screen, or track?" /></label>
        <p v-if="status === 'success'" class="form-status success" role="status">Thanks! Your request has been received. Our team will reach out soon.</p>
        <p v-else-if="status === 'error'" class="form-status error" role="alert">{{ errorMessage }}</p>
        <button type="submit" :disabled="submitting"><Send :size="17" />{{ submitting ? 'Sending…' : 'Send request' }}</button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.concierge-page{width:100%;box-sizing:border-box;padding:2rem var(--page-gutter) 4rem}.hero{position:relative;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);gap:3rem;overflow:hidden;border:1px solid var(--app-border);border-radius:14px;background:linear-gradient(135deg,var(--app-surface) 0%,var(--app-primary-soft-alt) 100%);padding:clamp(2rem,5vw,5rem)}.hero:after{position:absolute;right:-8rem;bottom:-10rem;width:25rem;height:25rem;border-radius:50%;background:var(--app-primary);content:"";opacity:.06}.hero-copy,.process-card{position:relative;z-index:1}.eyebrow{display:inline-flex;align-items:center;gap:.45rem;color:var(--app-primary);font-size:.75rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.hero h1{margin:1rem 0 1.25rem;color:var(--app-text);font-size:clamp(2.35rem,5vw,4.65rem);font-weight:700;letter-spacing:-.045em;line-height:1.02}.hero h1 span{color:var(--app-primary)}.hero-copy>p{max-width:680px;color:var(--app-text-secondary);font-size:1.06rem;line-height:1.75}.hero-action{display:inline-flex;align-items:center;gap:.55rem;margin-top:1.75rem;border-radius:7px;background:var(--app-primary);padding:.85rem 1.15rem;color:#fff;font-size:.9rem;font-weight:800;text-decoration:none;box-shadow:0 8px 24px var(--app-primary-shadow)}.process-card{align-self:center;border:1px solid var(--app-border);border-radius:12px;background:var(--app-surface);padding:1.5rem;box-shadow:0 16px 40px rgba(7,27,79,.08)}.process-label{margin:0 0 1.1rem;color:var(--app-text-muted);font-size:.72rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.process-card ol{display:grid;gap:1.2rem;margin:0;padding:0;list-style:none}.process-card li{display:flex;gap:.9rem}.process-card li>span{display:flex;width:2rem;height:2rem;flex:none;align-items:center;justify-content:center;border-radius:50%;background:var(--app-primary-soft);color:var(--app-primary);font-size:.75rem;font-weight:900}.process-card strong,.process-card small{display:block}.process-card strong{color:var(--app-text);font-size:.88rem}.process-card small{margin-top:.2rem;color:var(--app-text-muted);font-size:.76rem;line-height:1.5}.content-section,.examples-section{padding:4.5rem 0 0}.section-heading p{margin:0;color:var(--app-primary);font-size:.72rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.section-heading h2{margin:.45rem 0 0;color:var(--app-text);font-size:clamp(1.7rem,3vw,2.25rem);font-weight:700;letter-spacing:-.025em}.service-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem;margin-top:1.75rem}.service-card{border:1px solid var(--app-border);border-radius:10px;background:var(--app-surface);padding:1.4rem;transition:transform .18s,border-color .18s}.service-card:hover{transform:translateY(-3px);border-color:var(--app-primary)}.service-icon{display:flex;width:2.8rem;height:2.8rem;align-items:center;justify-content:center;border-radius:9px;background:var(--app-primary-soft);color:var(--app-primary)}.service-card h3{margin:1rem 0 .45rem;color:var(--app-text);font-size:1rem}.service-card p{margin:0;color:var(--app-text-muted);font-size:.82rem;line-height:1.65}.examples-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem;margin-top:1.75rem}.examples-list>div{display:flex;gap:.75rem;border:1px solid var(--app-border-muted);border-radius:8px;background:var(--app-surface-soft);padding:1rem;color:var(--app-text-secondary)}.examples-list svg{flex:none;margin-top:.1rem;color:var(--app-primary)}.examples-list p{margin:0;font-size:.82rem;line-height:1.6}.request-section{display:grid;grid-template-columns:minmax(260px,.65fr) minmax(0,1.35fr);gap:3rem;margin-top:4.5rem;border:1px solid var(--app-border);border-radius:14px;background:var(--app-surface);padding:clamp(1.5rem,4vw,3.5rem)}.request-copy h2{margin:.8rem 0;color:var(--app-text);font-size:2rem;line-height:1.2}.request-copy>p{color:var(--app-text-muted);font-size:.88rem;line-height:1.7}.email-note{margin-top:1.5rem}.email-note a{color:var(--app-primary);font-weight:700}.request-form{display:grid;gap:1.15rem}.form-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.request-form label>span{display:block;margin-bottom:.45rem;color:var(--app-text-secondary);font-size:.76rem;font-weight:800}.request-form input,.request-form textarea{width:100%;box-sizing:border-box;border:1px solid var(--app-border);border-radius:7px;background:var(--app-surface-soft);padding:.8rem .9rem;color:var(--app-text);font-size:.88rem;outline:none;transition:border-color .18s,box-shadow .18s}.request-form input:focus,.request-form textarea:focus{border-color:var(--app-primary);box-shadow:0 0 0 3px var(--app-primary-soft)}.request-form textarea{resize:vertical;line-height:1.55}.request-form button{display:inline-flex;width:max-content;align-items:center;gap:.55rem;border:0;border-radius:7px;background:var(--app-primary);padding:.82rem 1.2rem;color:#fff;font-size:.85rem;font-weight:800}.request-form button:hover{background:var(--app-primary-hover)}.request-form button:disabled{opacity:.6}.form-status{margin:0;border-radius:7px;padding:.75rem .9rem;font-size:.78rem;font-weight:700}.form-status.success{background:color-mix(in srgb,var(--app-positive) 12%,transparent);color:var(--app-positive)}.form-status.error{background:color-mix(in srgb,var(--app-negative) 10%,transparent);color:var(--app-negative)}
@media(max-width:900px){.hero,.request-section{grid-template-columns:1fr}.service-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.concierge-page{padding-top:1rem}.hero{gap:2rem;padding:1.5rem}.hero h1{font-size:2.45rem}.service-grid,.examples-list,.form-row{grid-template-columns:1fr}.content-section,.examples-section{padding-top:3rem}.request-section{gap:2rem;margin-top:3rem;padding:1.4rem}}
</style>

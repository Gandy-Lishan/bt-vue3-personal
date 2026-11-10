<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ArrowRight, CheckCircle2, Mail, Send, Sparkles } from '@lucide/vue'

const form = reactive({ name: '', email: '', message: '' })
const submitting = ref(false)
const feedback = ref('')
const feedbackType = ref<'success' | 'error'>('error')

async function submitForm() {
  if (submitting.value) return
  const name = form.name.trim()
  const email = form.email.trim()
  const message = form.message.trim()
  const fail = (text: string) => {
    feedback.value = text
    feedbackType.value = 'error'
  }
  if (!name) return fail('Please enter your name')
  if (!email) return fail('Please enter your email')
  if (!message) return fail('Please enter your message')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Please enter a valid email address')
  if (/^[\u0400-\u04FF]+$/.test(message)) return fail('Message contains unsupported characters.')

  submitting.value = true
  feedback.value = ''
  try {
    const response = await fetch('/dev/st_data/contact_us_ticket/', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa('9IcPQw5rCrNkZ6tVaSMm')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, message, subject: 'Backtest Concierge Setup Service' }),
    })
    if (!response.ok) throw new Error('Request failed')
    feedbackType.value = 'success'
    feedback.value = 'Thanks! Your message has been received. Our team will reach out soon.'
  } catch {
    fail('Something went wrong. Please try again later.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="concierge-page">
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow"><Sparkles :size="15" /> Backtest Concierge Setup Service</span>
        <h1>Making Backtesting<br /><span>More Accessible</span></h1>
        <p>One of the most common hurdles I hear from traders is:</p>
        <p class="idea-quote">I have an idea, but setting it up in the backtest engine feels overwhelming.</p>
        <p>That’s exactly why we built the Concierge Backtest Service — so no trading idea gets lost because of technical barriers.</p>
        <a class="hero-action" href="#contact-request">Send your idea <ArrowRight :size="17" /></a>
      </div>
      <div class="process-card">
        <p class="process-label">How it works:</p>
        <ol>
          <li><span>1</span><p>You describe your strategy in plain English</p></li>
          <li><span>2</span><p>Our team translates it into the backtest engine</p></li>
          <li><span>3</span><p>The finished setup appears in your portal under My Favorite, ready for you to explore and refine</p></li>
        </ol>
      </div>
    </section>

    <section class="intro-section">
      <p>Whether your idea is straightforward or complex, you don’t need to worry about technical details — just tell us what you want to test, and we’ll handle the setup.</p>
    </section>

    <section class="examples-section">
      <div class="section-heading"><p>Need a starting point?</p><h2>Here are a few examples of how you can phrase it:</h2></div>
      <ul class="examples-list">
        <li><CheckCircle2 :size="18" /><span>What happens when $AAPL triggers a MACD Golden Cross?</span></li>
        <li><CheckCircle2 :size="18" /><span>What occurs when SPY enters an oversold condition (SPY Optix &lt; 10)?</span></li>
        <li><CheckCircle2 :size="18" /><span>What happens when the market enters an overbought condition short-term?</span></li>
        <li><CheckCircle2 :size="18" /><span>If the $SPX closes below its 50-day moving average, how do Crude Oil and Gold perform over the next 10 days?</span></li>
        <li><CheckCircle2 :size="18" /><span>If both Nasdaq and Bitcoin drop more than 1% on the same day while Treasury yields rise, what typically happens to the S&amp;P 500?</span></li>
      </ul>
    </section>

    <section id="contact-request" class="request-section">
      <div class="request-copy">
        <span class="eyebrow"><Mail :size="15" /> Send your request</span>
        <h2>What would you like to backtest?</h2>
        <p>Tell us what you want to test, and we’ll handle the setup.</p>
        <p class="email-note">Email your request to <a href="mailto:admin@sentimentrader.com">admin@sentimentrader.com</a> - Every idea is welcome.</p>
      </div>
      <form class="request-form" @submit.prevent="submitForm">
        <div class="form-row">
          <label><span>Name</span><input v-model="form.name" type="text" autocomplete="name" placeholder="Your name" required /></label>
          <label><span>Email</span><input v-model="form.email" type="email" autocomplete="email" placeholder="you@company.com" required /></label>
        </div>
        <label><span>Message</span><textarea v-model="form.message" placeholder="Type your message..." rows="7" required /></label>
        <p v-if="feedback" :class="['feedback', feedbackType]" :role="feedbackType === 'error' ? 'alert' : 'status'">{{ feedback }}</p>
        <button type="submit" :disabled="submitting"><Send :size="17" /> {{ submitting ? 'Submitting...' : 'Submit' }}</button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.concierge-page{width:100%;box-sizing:border-box;padding:2rem var(--page-gutter) 4rem;color:var(--app-text)}
.hero{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);gap:3rem;align-items:center;overflow:hidden;border:1px solid var(--app-border);border-radius:14px;background:linear-gradient(135deg,var(--app-surface),var(--app-primary-soft-alt));padding:clamp(2rem,5vw,5rem)}
.eyebrow{display:inline-flex;align-items:center;gap:.45rem;color:var(--app-primary);font-size:.75rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
.hero h1{margin:1rem 0 1.25rem;font-size:clamp(2.35rem,5vw,4.65rem);font-weight:700;letter-spacing:-.045em;line-height:1.02}.hero h1 span{color:var(--app-primary)}
.hero-copy>p{max-width:680px;margin:.8rem 0;color:var(--app-text-secondary);font-size:1.02rem;line-height:1.7}.hero-copy .idea-quote{border-left:3px solid var(--app-primary);padding:.35rem 0 .35rem 1rem;color:var(--app-text);font-weight:650}
.hero-action{display:inline-flex;align-items:center;gap:.55rem;margin-top:1.4rem;border-radius:7px;background:var(--app-primary);padding:.85rem 1.15rem;color:#fff;font-size:.9rem;font-weight:800;text-decoration:none;box-shadow:0 8px 24px var(--app-primary-shadow)}
.process-card{border:1px solid var(--app-border);border-radius:12px;background:var(--app-surface);padding:1.5rem;box-shadow:0 16px 40px rgba(7,27,79,.08)}.process-label{margin:0 0 1.1rem;color:var(--app-text-muted);font-size:.72rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.process-card ol{display:grid;gap:1.2rem;margin:0;padding:0;list-style:none}.process-card li{display:flex;align-items:flex-start;gap:.9rem}.process-card li>span{display:flex;width:2rem;height:2rem;flex:none;align-items:center;justify-content:center;border-radius:50%;background:var(--app-primary-soft);color:var(--app-primary);font-size:.75rem;font-weight:900}.process-card li p{margin:.25rem 0 0;color:var(--app-text-secondary);font-size:.85rem;line-height:1.55}
.intro-section{max-width:950px;margin:3.5rem auto 0;text-align:center}.intro-section p{margin:0;color:var(--app-text-secondary);font-size:1.1rem;line-height:1.8}
.examples-section{padding:4rem 0 0}.section-heading p{margin:0;color:var(--app-primary);font-size:.72rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.section-heading h2{margin:.45rem 0 0;font-size:clamp(1.7rem,3vw,2.25rem);letter-spacing:-.025em}.examples-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem;margin:1.75rem 0 0;padding:0;list-style:none}.examples-list li{display:flex;gap:.75rem;border:1px solid var(--app-border-muted);border-radius:8px;background:var(--app-surface-soft);padding:1rem;color:var(--app-text-secondary);font-size:.86rem;line-height:1.6}.examples-list svg{flex:none;margin-top:.15rem;color:var(--app-primary)}
.request-section{display:grid;grid-template-columns:minmax(260px,.65fr) minmax(0,1.35fr);gap:3rem;margin-top:4.5rem;border:1px solid var(--app-border);border-radius:14px;background:var(--app-surface);padding:clamp(1.5rem,4vw,3.5rem)}.request-copy h2{margin:.8rem 0;font-size:2rem;line-height:1.2}.request-copy>p{color:var(--app-text-muted);font-size:.88rem;line-height:1.7}.request-copy .email-note{margin-top:1.5rem}.email-note a{color:var(--app-primary);font-weight:700}.request-form{display:grid;gap:1.15rem}.form-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.request-form label>span{display:block;margin-bottom:.45rem;color:var(--app-text-secondary);font-size:.76rem;font-weight:800}.request-form input,.request-form textarea{width:100%;box-sizing:border-box;border:1px solid var(--app-border);border-radius:7px;background:var(--app-surface-soft);padding:.8rem .9rem;color:var(--app-text);font:inherit;font-size:.88rem;outline:none}.request-form input:focus,.request-form textarea:focus{border-color:var(--app-primary);box-shadow:0 0 0 3px var(--app-primary-soft)}.request-form textarea{resize:vertical;line-height:1.55}.request-form button{display:inline-flex;width:max-content;align-items:center;gap:.55rem;border:0;border-radius:7px;background:var(--app-primary);padding:.82rem 1.2rem;color:#fff;font-size:.85rem;font-weight:800;cursor:pointer}.request-form button:hover{background:var(--app-primary-hover)}.request-form button:disabled{opacity:.6}.feedback{margin:0;border-radius:7px;padding:.75rem .9rem;font-size:.78rem;font-weight:700}.feedback.success{background:color-mix(in srgb,var(--app-positive) 12%,transparent);color:var(--app-positive)}.feedback.error{background:color-mix(in srgb,var(--app-negative) 10%,transparent);color:var(--app-negative)}
@media(max-width:900px){.hero,.request-section{grid-template-columns:1fr}}
@media(max-width:600px){.concierge-page{padding-top:1rem}.hero{gap:2rem;padding:1.5rem}.hero h1{font-size:2.45rem}.examples-list,.form-row{grid-template-columns:1fr}.examples-section{padding-top:3rem}.request-section{gap:2rem;margin-top:3rem;padding:1.4rem}}
</style>

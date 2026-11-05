<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import sourceContent from './source-content.html?raw'

const host = ref<HTMLElement | null>(null)
let shadow: ShadowRoot | null = null

const stylesheets = [
  '/light-indicator-api-source/_next/static/css/fcac7f6c3353ce8b.css',
  '/light-indicator-api-source/_next/static/css/546d24555308c3a1.css',
  '/light-indicator-api-source/css/preflight.css',
  '/light-indicator-api-source/webflow.shared.css',
]

const modalClasses = ['indicator-api-1st-form', 'indicator-api-2nd-form', 'indicator-api-3rd-form']
const indicatorUrls: Record<string, string> = {
  'Smart Money / Dumb Money Confidence': 'smart_dumb',
  'NAAIM Exposure Index': 'survey_naaim',
  'Smart Money Index (SMI)': 'vol_smi',
  VIX: 'vol_vix',
  'VIX Term Structure': 'vol_vix_spread',
  'NYSE Arms Index (TRIN)': 'breadth_arms',
  'Short-Term Combined Model': 'st_combined',
  'McClellan Summation Index': 'breadth_mcsumm',
  'NYSE Up Volume Ratio': 'breadth_up_volume',
  'Aggregate Signal Model': 'aggregate_model',
  'Stock/Bond Ratio': 'vol_stock_bond_ratio',
  'High Yield Bond A/D Line': 'breadth_bonds_hy_adline',
  'High Yield Bond Cumulative A/D Line': 'breadth_bonds_hy_adline',
  'CDX Index': 'vol_cdx',
  'Total Put/Call Ratio': 'pc_total',
  'AAII Bull Ratio': 'survey_aaii_bull_ratio',
  'Short-Term Optix': 'model_score_short',
}
const formPrefixes = ['Form1', 'Form2', 'Form3'] as const
let submitting = false

function field(modal: HTMLElement, id: string): string {
  return (modal.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`#${id}`)?.value ?? '').trim()
}

function namedField(modal: HTMLElement, name: string): string {
  return (modal.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)?.value ?? '').trim()
}

function updateSubmitButton(modal: HTMLElement) {
  const modeIndex = modalClasses.findIndex((className) => modal.classList.contains(className))
  if (modeIndex < 0) return
  const prefix = formPrefixes[modeIndex]
  const email = field(modal, `${prefix}-Email`)
  let valid = Boolean(field(modal, `${prefix}-Name`) && intendedUse(modal, prefix))
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  if (modeIndex === 2) {
    valid &&= Boolean(namedField(modal, 'timeframe') && namedField(modal, 'assets') && namedField(modal, 'primaryFocus'))
    if (namedField(modal, 'assets') === 'Other (please specify)') valid &&= Boolean(namedField(modal, 'assetsOther'))
    if (namedField(modal, 'primaryFocus') === 'Other (please specify)') valid &&= Boolean(namedField(modal, 'primaryFocusOther'))
  } else {
    valid &&= Boolean(field(modal, `${prefix}-Selected-Indicators`))
  }
  const button = modal.querySelector<HTMLButtonElement>('button[type="button"]')
  if (button) button.disabled = !valid || submitting
}

function intendedUse(modal: HTMLElement, prefix: string) {
  return field(modal, `${prefix}-Intended-Use`)
}

function onPageInput(event: Event) {
  const target = event.target
  if (!(target instanceof Element)) return
  const modal = target.closest<HTMLElement>('.indicator-api-1st-form, .indicator-api-2nd-form, .indicator-api-3rd-form')
  if (!modal) return
  if (target instanceof HTMLSelectElement && (target.name === 'assets' || target.name === 'primaryFocus')) {
    const otherName = target.name === 'assets' ? 'assetsOther' : 'primaryFocusOther'
    let other = modal.querySelector<HTMLInputElement>(`[name="${otherName}"]`)
    if (target.value === 'Other (please specify)' && !other) {
      other = document.createElement('input')
      other.name = otherName
      other.placeholder = 'Please specify'
      other.className = 'uui-form_input-4 w-input'
      target.insertAdjacentElement('afterend', other)
    } else if (target.value !== 'Other (please specify)') other?.remove()
  }
  updateSubmitButton(modal)
}

async function submitForm(modal: HTMLElement, modeIndex: number) {
  if (submitting) return
  const prefix = formPrefixes[modeIndex]
  const email = field(modal, `${prefix}-Email`)
  const name = field(modal, `${prefix}-Name`)
  const intendedUse = field(modal, `${prefix}-Intended-Use`)
  const payload: Record<string, string> = {
    mode: ['indicators', 'recommendations', 'guided'][modeIndex],
    name,
    email,
    intendedUse,
  }
  if (modeIndex === 2) {
    payload.timeframe = namedField(modal, 'timeframe')
    const assets = namedField(modal, 'assets')
    const primaryFocus = namedField(modal, 'primaryFocus')
    payload.assets = assets === 'Other (please specify)' ? `Other: ${namedField(modal, 'assetsOther')}` : assets
    payload.primaryFocus = primaryFocus === 'Other (please specify)' ? `Other: ${namedField(modal, 'primaryFocusOther')}` : primaryFocus
  } else {
    payload.selectedIndicators = field(modal, `${prefix}-Selected-Indicators`)
    if (modeIndex === 1) payload.primaryUseCase = field(modal, `${prefix}-Primary-Use-Case`)
  }
  const required = Object.entries(payload).every(([key, value]) =>
    key === 'primaryUseCase' || (value && value !== 'Other:'),
  )
  if (!required || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    modal.querySelector<HTMLInputElement>(`#${prefix}-Email`)?.reportValidity()
    return
  }
  submitting = true
  const button = modal.querySelector<HTMLButtonElement>('button[type="button"]:last-of-type')
  if (button) button.disabled = true
  try {
    const response = await fetch('/internal/light-indicator-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error('Ticket submission failed')
    modal.querySelector<HTMLElement>('.indicator-api-form_wrapper-content_form-core')?.setAttribute('style', 'display:none')
    const success = modal.querySelector<HTMLElement>('.rx-form-done')
    if (success) success.style.setProperty('display', 'block', 'important')
    const failure = modal.querySelector<HTMLElement>('.rx-form-fail')
    if (failure) failure.style.display = 'none'
  } catch {
    const failure = modal.querySelector<HTMLElement>('.rx-form-fail')
    if (failure) failure.style.setProperty('display', 'block', 'important')
  } finally {
    submitting = false
    if (button) button.disabled = false
  }
}

function closeModals() {
  for (const className of modalClasses) {
    const modal = shadow?.querySelector<HTMLElement>(`.${className}`)
    if (modal) modal.style.display = 'none'
  }
  document.body.style.overflow = ''
}

function onPageClick(event: Event) {
  const target = event.target
  if (!(target instanceof Element)) return
  const submitButton = target.closest<HTMLButtonElement>('.indicator-api-popup-form button[type="button"]')
  if (submitButton && submitButton.textContent?.trim() === 'Submit') {
    event.preventDefault()
    const modal = submitButton.closest<HTMLElement>('.indicator-api-1st-form, .indicator-api-2nd-form, .indicator-api-3rd-form')
    if (modal) void submitForm(modal, modalClasses.findIndex((className) => modal.classList.contains(className)))
    return
  }
  const trigger = target.closest<HTMLElement>('.open-pick-indicators, .open-get-recommendations, .open-guided-set')
  if (trigger) {
    event.preventDefault()
    closeModals()
    const modalClass = trigger.classList.contains('open-pick-indicators')
      ? modalClasses[0]
      : trigger.classList.contains('open-get-recommendations')
        ? modalClasses[1]
        : modalClasses[2]
    const modal = shadow?.querySelector<HTMLElement>(`.${modalClass}`)
    if (modal) modal.style.display = 'flex'
    document.body.style.overflow = 'hidden'
    return
  }
  if (target.closest('.close-link-top-right, .inquiry-bg')) {
    event.preventDefault()
    closeModals()
  }
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeModals()
}

onMounted(() => {
  if (!host.value) return
  shadow = host.value.attachShadow({ mode: 'open' })
  for (const href of stylesheets) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    shadow.appendChild(link)
  }
  const content = document.createElement('div')
  content.className = 'source-content'
  content.innerHTML = sourceContent
  for (const link of content.querySelectorAll<HTMLAnchorElement>('a.lia-feature-card_featlist_item')) {
    const label = link.textContent?.trim() ?? ''
    const destination = label === 'Asset-level Optix'
      ? '/indicators?list=stock'
      : label === 'Asset-level Trend and RelTrend Score'
        ? '/trend_score'
        : indicatorUrls[label]
          ? `/indicators/${indicatorUrls[label]}`
          : null
    if (!destination) continue
    link.href = destination
    link.removeAttribute('target')
  }
  const exampleDestinations: Record<string, string> = {
    'Optix Sentiment': '/indicators?list=stock',
    'Trend Score': '/trend_score',
    'Historical Volatility': '/historical',
  }
  for (const item of content.querySelectorAll<HTMLElement>('.example-group_item')) {
    const label = item.querySelector('.example-group_item-label')?.textContent?.trim() ?? ''
    const destination = exampleDestinations[label]
    const card = item.querySelector<HTMLAnchorElement>('a.example-group_item-card')
    if (!destination || !card) continue
    card.href = destination
    card.removeAttribute('target')
  }
  shadow.appendChild(content)
  shadow.addEventListener('click', onPageClick)
  shadow.addEventListener('input', onPageInput)
  shadow.addEventListener('change', onPageInput)
  document.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  closeModals()
  shadow?.removeEventListener('click', onPageClick)
  shadow?.removeEventListener('input', onPageInput)
  shadow?.removeEventListener('change', onPageInput)
  document.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <main ref="host" class="light-indicator-api-page" />
</template>

<style scoped>
.light-indicator-api-page {
  --st-primary-600: #2563eb;
  --st-gray700: #344054;
  --st-ui-white: white;
  --st-primary-700: #1d4ed8;
  --st-primary-100: #dbeafe;
  --gold: #ac986c;
  --olive: #89774f;
  --st-primary-50-501: #eff6ff;
  --transparent-color: #fff0;
  --st-gray200: #eaecf0;
  --st-primary-800: #1e40af;
  --st-gray800: #1d2939;
  --st-gray600: #475467;
  --st-gray50-501: #f9fcff;
  --st-gray300: #d0d5dd;
  --st-gray100: #f2f4f7;
  --st-primary-500: #3b82f6;
  --st-gray900: #101828;
  --st-gray500: #667085;
  --st-gray400: #98a2b3;
  --st-primary-300: #93c5fd;
  --color: white;
  --color-2: #ee350b;
  --st-primary-400: #60a5fa;
  --white-25: #ffffff40;
  --st-success50: #ecfdf3;
  --untitled-ui-primary200: #e9d7fe;
  --untitled-ui-gray25: #fcfcfd;
  --aether-purple: #7c3aed;
  --aether-purple-hover: #681ce9;
  --st-primary-600-transparent: #2563eb0a;
  --white-10: #ffffff1a;
  --gray-20: #333;
  --st-success700: #027a48;
  --untitled-ui-pink50: #fdf2fa;
  --untitled-ui-pink700: #c11574;
  --untitled-ui-indigo50: #eef4ff;
  --untitled-ui-indigo700: #3538cd;
  --untitled-ui-primary900: #42307d;
  --tab-button-current: #dbeafe;
  display: block;
  width: 100%;
  min-width: 0;
  color: #333;
  background: #fff;
  font-family: Inter, Arial, sans-serif;
  font-size: 14px;
  line-height: 20px;
}
</style>

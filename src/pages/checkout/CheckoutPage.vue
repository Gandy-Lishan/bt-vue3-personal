<template>
  <main class="min-h-screen bg-[var(--app-bg)] px-4 py-12 text-[var(--app-text)]">
    <div class="mx-auto max-w-5xl">
      <h1 class="text-center text-3xl font-bold">Checkout</h1>
      <p class="mt-2 text-center text-sm text-[var(--app-text-secondary)]">You're one step away from unlocking advanced market insights.</p>

      <div v-if="loadingPlan" class="mt-10 text-center text-sm text-[var(--app-text-secondary)]">Loading plan…</div>
      <div v-if="errorMsg" class="mt-10 text-center text-sm text-red-500">{{ errorMsg }}</div>

      <div v-if="plan && !loadingPlan" class="mt-8 grid gap-8 md:grid-cols-3">
        <!-- Left: Form -->
        <div class="md:col-span-2">
          <form ref="formRef" class="space-y-6 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-6" @submit.prevent="onSubmit">
            <!-- Account Info -->
            <div>
              <h2 class="text-lg font-semibold text-[var(--app-text)]">Account Info</h2>
              <div class="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-[var(--app-text-secondary)]">First name</label>
                  <input v-model="form.first_name" type="text" required data-recurly="first_name" class="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]" placeholder="First name" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-[var(--app-text-secondary)]">Last name</label>
                  <input v-model="form.last_name" type="text" required data-recurly="last_name" class="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]" placeholder="Last name" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-[var(--app-text-secondary)]">Email</label>
                  <input v-model="form.email" type="email" required class="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]" placeholder="your@company.com" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-[var(--app-text-secondary)]">Password</label>
                  <input v-model="form.password" type="password" required minlength="8" class="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]" placeholder="********" />
                </div>
              </div>
            </div>

            <hr class="border-[var(--app-border)]" />

            <!-- Billing Info -->
            <div>
              <h2 class="text-lg font-semibold text-[var(--app-text)]">Billing Information</h2>
              <div class="mt-4 grid gap-4 sm:grid-cols-2">
                <div class="sm:col-span-2">
                  <label class="mb-1 block text-sm font-medium text-[var(--app-text-secondary)]">Card Information</label>
                  <div ref="cardContainerRef" class="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2" :class="{ 'border-red-500': cardError }"></div>
                  <p v-if="cardError" class="mt-1 text-xs text-red-500">{{ cardError }}</p>
                </div>
                <div class="sm:col-span-2">
                  <label class="mb-1 block text-sm font-medium text-[var(--app-text-secondary)]">Address</label>
                  <input v-model="form.address" type="text" required data-recurly="address1" class="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]" placeholder="Address" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-[var(--app-text-secondary)]">City</label>
                  <input v-model="form.city" type="text" required data-recurly="city" class="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]" placeholder="City" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-[var(--app-text-secondary)]">State / Province</label>
                  <input v-model="form.state" type="text" required data-recurly="state" class="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]" placeholder="State / Province" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-[var(--app-text-secondary)]">Postal Code</label>
                  <input v-model="form.zip" type="text" required data-recurly="postal_code" class="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]" placeholder="Postal Code" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-[var(--app-text-secondary)]">Country</label>
                  <select v-model="form.country" required data-recurly="country" class="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]">
                    <option value="">Select one…</option>
                    <option v-for="c in countries" :key="c.alpha2" :value="c.alpha2">{{ c.country }}</option>
                  </select>
                </div>
              </div>
            </div>

            <hr class="border-[var(--app-border)]" />

            <!-- Terms + Submit -->
            <div>
              <label class="flex items-start gap-2 text-sm text-[var(--app-text-secondary)]">
                <input v-model="form.terms" type="checkbox" required class="mt-0.5 h-4 w-4" />
                I agree to the subscriber <a href="/terms" target="_blank" class="text-[var(--app-primary)] underline">Terms & Conditions</a>.
              </label>
            </div>

            <button
              type="submit"
              :disabled="submitting || !isCardValid"
              class="w-full rounded-md bg-[var(--app-primary)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ submitting ? 'Processing…' : 'Sign Up Now' }}
            </button>

            <p v-if="formError" class="text-center text-sm text-red-500">{{ formError }}</p>
          </form>
        </div>

        <!-- Right: Cart Summary -->
        <div class="md:col-span-1">
          <div class="sticky top-4 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-6">
            <h2 class="text-lg font-semibold text-[var(--app-text)]">Summary</h2>

            <div class="mt-4 space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-[var(--app-text-secondary)]">{{ plan.name }}</span>
                <span class="font-medium">{{ planPrice }}</span>
              </div>

              <hr class="border-[var(--app-border)]" />

              <!-- Coupon -->
              <div class="flex gap-2">
                <input
                  v-model="couponCode"
                  type="text"
                  placeholder="Coupon code"
                  class="flex-1 rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-2 py-1.5 text-xs text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]"
                />
                <button
                  @click="applyCoupon"
                  :disabled="applyingCoupon"
                  class="rounded-md border border-[var(--app-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--app-surface-hover)] disabled:opacity-50"
                >
                  {{ applyingCoupon ? '…' : 'Apply' }}
                </button>
              </div>

              <div v-if="appliedCoupon" class="flex items-center justify-between text-xs">
                <span class="text-[var(--app-text-secondary)]">
                  Coupon: {{ appliedCoupon.label_as || appliedCoupon.name }}
                  <button @click="removeCoupon" class="ml-1 text-red-500 hover:underline">×</button>
                </span>
                <span v-if="couponDiscountDisplay" class="text-[var(--app-positive)]">
                  {{ couponDiscountDisplay }}
                </span>
              </div>

              <hr class="border-[var(--app-border)]" />

              <div class="flex justify-between text-[var(--app-text-secondary)]">
                <span>Subtotal</span>
                <span>{{ subtotal }}</span>
              </div>

              <div class="flex justify-between text-[var(--app-text-secondary)]">
                <span>{{ trialLabel }}</span>
                <span class="text-[var(--app-positive)]">{{ trialDiscount }}</span>
              </div>

              <hr class="border-[var(--app-border)]" />

              <div class="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{{ total }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPlan, getCoupon, createAccount, type Plan, type Coupon } from '@/shared/api/stApi'
import { useRecurlyCard } from '@/shared/composables/useRecurlyCard'
// @ts-ignore
import isoCountries from 'iso-3166-1'

const route = useRoute()
const router = useRouter()
const redirectAfterCheckout = computed(() => route.query.redirect as string | undefined)

// Recurly card element — non-reactive lifecycle managed in composable
const cardContainerRef = ref<HTMLElement | null>(null)
const { isCardValid, cardError, formError: cardFormError, getToken } = useRecurlyCard(cardContainerRef)

const formRef = ref<HTMLFormElement | null>(null)

const plan = ref<Plan | null>(null)
const loadingPlan = ref(true)
const errorMsg = ref('')
const submitting = ref(false)
const errorState = ref('')
const formError = computed(() => errorState.value || cardFormError.value)

const form = reactive({
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  country: '',
  terms: false,
})

const couponCode = ref('')
const appliedCoupon = ref<Coupon | null>(null)
const applyingCoupon = ref(false)

// Country list
const countries = ref<{ alpha2: string; country: string }[]>([])

// ── Original project hardcoded plan display maps ─────────────────────
const planPriceByCode: Record<string, string> = {
  'everything-monthly': '$49 / month',
  'everything-monthly-nyf': '$49 / month',
  'everything-monthly-ny': '$75 / month',
  'everything-monthly-bf': '$49 / month',
  'everything-monthly-aas': '$69 / month',
  'everything-monthly-cw': '$0 / 14 days Trial',
  'everything-monthly-ad': '$0 / 14 days Trial',
}

const subtotalByCode: Record<string, string> = {
  'everything-monthly': '$49 / month',
  'everything-monthly-nyf': '$49 / month',
  'everything-monthly-ny': '$75 / month',
  'everything-monthly-bf': '$49',
  'everything-monthly-aas': '$69',
  'everything-monthly-cw': '$0 / 14 days Trial',
  'everything-monthly-ad': '$0 / 14 days Trial',
}

const trialDiscountByCode: Record<string, string> = {
  'everything-monthly': '-$49',
  'everything-monthly-nyf': '-$49',
  'everything-monthly-ny': '-$75',
  'everything-monthly-bf': '-$49',
  'everything-monthly-aas': '-$69',
}

const autoCouponByCode: Record<string, string> = {
  'everything-monthly-bf': 'blackfriday50',
  'everything-monthly-ny': 'ny2626',
  'everything-monthly-nyf': 'ny2650',
  'everything-monthly': 'ny50',
}

const hiddenCouponDiscountPlans = new Set([
  'everything-monthly-bf',
  'everything-monthly-ny',
  'everything-monthly-nyf',
  'everything-monthly',
])

// ── Helpers (mirroring original CartSide.tsx) ────────────────────────
function formatNum(n: number): string {
  return new Intl.NumberFormat().format(n)
}

function numericFromCurrencyString(input: string): number {
  return Number(String(input).replace(/\D/g, ''))
}

function formatCurrency(value: number): string {
  return `$${new Intl.NumberFormat().format(value)}`
}

function intervalText(intervalUnit: string, intervalLength: number): string {
  if (intervalUnit === 'months') {
    if (intervalLength === 12) return 'year'
    if (intervalLength === 1) return 'month'
  }
  if (intervalUnit === 'years') {
    if (intervalLength === 1) return 'year'
  }
  return `${intervalLength} ${intervalUnit}`
}

// ── Computed Summary fields ──────────────────────────────────────────
const planPrice = computed(() => {
  if (!plan.value) return '$0'
  const hardcoded = planPriceByCode[plan.value.code]
  if (hardcoded) return hardcoded
  return `$${formatNum(plan.value.amount)} / ${intervalText(plan.value.interval_unit, plan.value.interval_length)}`
})

const subtotal = computed(() => {
  if (!plan.value) return '$0'
  const hardcoded = subtotalByCode[plan.value.code]
  if (hardcoded) return hardcoded
  return `$${formatNum(plan.value.amount)}`
})

const trialDiscount = computed(() => {
  if (!plan.value) return '-$0'
  const hardcoded = trialDiscountByCode[plan.value.code]
  if (hardcoded) return hardcoded
  return `-${subtotal.value}`
})

const trialLabel = computed(() => {
  if (!plan.value) return 'Trial'
  if (['everything-monthly-aas', 'research-monthly-fnj'].includes(plan.value.code)) {
    return 'Trial (15 Days)'
  }
  const length = plan.value.trial_length ?? 0
  return `Trial (${length} days)`
})

const isPercentCoupon = computed(() => appliedCoupon.value?.discount_type === 'percent')
const isFixedCoupon = computed(() => appliedCoupon.value && !isPercentCoupon.value && appliedCoupon.value.amount > 0)

const couponDiscountDisplay = computed(() => {
  if (!plan.value || !appliedCoupon.value) return null
  if (hiddenCouponDiscountPlans.has(plan.value.code)) return null
  if (isPercentCoupon.value) return `${appliedCoupon.value!.percent}%`
  if (isFixedCoupon.value) return `-$${formatNum(appliedCoupon.value!.amount)}`
  return null
})

const couponDiscountFixed = computed(() => {
  if (!isFixedCoupon.value) return ''
  return `-$${formatNum(appliedCoupon.value!.amount)}`
})

const couponDiscountPercent = computed(() => {
  if (!isPercentCoupon.value) return ''
  return `${appliedCoupon.value!.percent}%`
})

const couponValue = computed(() => appliedCoupon.value?.amount || 0)

const total = computed(() => {
  if (!plan.value) return '$0'
  const base = numericFromCurrencyString(subtotal.value)
  if (!appliedCoupon.value) return formatCurrency(base)

  if (isPercentCoupon.value) {
    const percent = appliedCoupon.value!.percent || 0
    return formatCurrency(base - (base * percent) / 100)
  }

  const discount = appliedCoupon.value!.amount || 0
  return formatCurrency(base - discount)
})

const isEverythingMonthly = computed(() => plan.value?.code === 'everything-monthly')

// ── Coupon handling ──────────────────────────────────────────────────
async function applyCouponByCode(code: string) {
  if (!code) return
  applyingCoupon.value = true
  try {
    const coupon = await getCoupon(code)
    appliedCoupon.value = coupon
    couponCode.value = code
  } catch {
    errorMsg.value = 'Invalid coupon code'
  } finally {
    applyingCoupon.value = false
  }
}

async function applyCoupon() {
  await applyCouponByCode(couponCode.value)
}

function removeCoupon() {
  appliedCoupon.value = null
  couponCode.value = ''
}

// ── Submit ───────────────────────────────────────────────────────────
async function onSubmit() {
  submitting.value = true

  if (!isCardValid.value) {
    cardError.value = 'Card number is invalid'
    submitting.value = false
    return
  }

  try {
    // Step 1: Generate token via Recurly.js
    const tokenId = await getToken(formRef.value!)

    // Step 2: POST to backend with token_id
    const res = await createAccount({
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      password: form.password,
      address: form.address,
      city: form.city,
      state: form.state,
      zip: form.zip,
      country: form.country,
      plan_code: plan.value!.code,
      coupon_code: appliedCoupon.value?.code,
      token_id: tokenId,
      terms: form.terms,
    })

    if (res.error) {
      errorState.value = res.error
      return
    }
    if (res.errors?.length) {
      errorState.value = res.errors.map((e) => Object.values(e).join(' ')).join(', ')
      return
    }

    // Step 3: Redirect to success page with original-project query params
    const query = buildSuccessQuery()
    router.replace(`/checkout-success?${new URLSearchParams(query).toString()}`)
  } catch (e: any) {
    if (e?.code === 'validation') {
      cardError.value = 'The credit card information is not valid'
    } else {
      errorState.value = e?.response?.data?.error || e?.message || 'There was an error. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}

function buildSuccessQuery(): Record<string, string> {
  if (!plan.value) return {}

  const isEM = isEverythingMonthly.value
  const query: Record<string, string> = {
    plan_name: plan.value.name,
    subtotal: isEM ? '$49 / month' : subtotal.value,
    total: isEM ? '$49' : total.value,
    trial: isEM ? 'days' : (plan.value.trial_unit || ''),
    trial_length: isEM ? '14' : String(plan.value.trial_length ?? 0),
  }

  if (appliedCoupon.value) {
    query.coupon = isEM ? 'ny50' : appliedCoupon.value.code
    query.coupon_name = appliedCoupon.value.label_as || appliedCoupon.value.name
    query.coupon_value = String(couponValue.value)
    query.coupon_discount = isPercentCoupon.value ? couponDiscountPercent.value : couponDiscountFixed.value
  }

  if (redirectAfterCheckout.value) {
    query.redirect = redirectAfterCheckout.value
  }

  return query
}

// ── Init ─────────────────────────────────────────────────────────────
onMounted(async () => {
  // Load countries from iso-3166-1 (same as original project)
  countries.value = isoCountries
    .all()
    .map((c: any) => ({ alpha2: c.alpha2, country: c.country }))
    .sort((a: any, b: any) => a.country.localeCompare(b.country))

  // Load plan
  const planCode = route.query.plan as string
  if (!planCode) {
    errorMsg.value = 'No plan selected.'
    loadingPlan.value = false
    return
  }

  try {
    plan.value = await getPlan(planCode)

    // Auto-apply plan-specific coupons (mirrors CartSide.tsx on mount)
    const autoCoupon = autoCouponByCode[plan.value.code]
    if (autoCoupon) {
      await applyCouponByCode(autoCoupon)
    }
  } catch {
    errorMsg.value = 'Failed to load plan.'
  } finally {
    loadingPlan.value = false
  }
})
</script>

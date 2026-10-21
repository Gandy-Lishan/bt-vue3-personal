<template>
  <main class="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4">
    <section class="w-full max-w-md rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center shadow-lg">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--app-positive)]/10">
        <svg class="h-8 w-8 text-[var(--app-positive)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 class="text-2xl font-semibold text-[var(--app-text)]">You're all set!</h1>
      <p class="mt-2 text-sm text-[var(--app-text-secondary)]">Great! Your subscription is active.</p>

      <div class="mt-6 rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] p-4 text-left text-sm">
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-[var(--app-text-secondary)]">Plan</span>
            <span class="font-medium">{{ planName }}</span>
          </div>

          <div class="flex justify-between">
            <span class="text-[var(--app-text-secondary)]">Plan price</span>
            <span class="font-medium">{{ subtotal }}</span>
          </div>

          <div v-if="couponName" class="flex justify-between">
            <span class="text-[var(--app-text-secondary)]">Coupon</span>
            <span class="font-medium">{{ couponName }}</span>
          </div>

          <div v-if="couponDiscount" class="flex justify-between">
            <span class="text-[var(--app-text-secondary)]">Coupon discount</span>
            <span class="font-medium text-[var(--app-positive)]">{{ couponDiscount }}</span>
          </div>

          <div class="flex justify-between">
            <span class="text-[var(--app-text-secondary)]">Subtotal</span>
            <span class="font-medium">{{ subtotal }}</span>
          </div>

          <div class="flex justify-between">
            <span class="text-[var(--app-text-secondary)]">Trial</span>
            <span class="font-medium">{{ trialDisplay }}</span>
          </div>

          <hr class="border-[var(--app-border)]" />

          <div class="flex justify-between font-semibold">
            <span>Total</span>
            <span>{{ displayTotal }}</span>
          </div>

          <p v-if="trialExpiry" class="text-xs text-[var(--app-text-secondary)]">
            Your free trial ends on {{ trialExpiry }}.
          </p>
        </div>
      </div>

      <RouterLink
        to="/"
        class="mt-6 inline-block w-full rounded-md bg-[var(--app-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Go to my dashboard
      </RouterLink>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCoupon } from '@/shared/api/stApi'

const route = useRoute()
const router = useRouter()

const resolvedCouponName = ref('')
const loadingCouponName = ref(false)

const planName = computed(() => (route.query.plan_name as string) || 'Unknown')
const couponCode = computed(() => (route.query.coupon as string) || '')
const couponNameFromQuery = computed(() => (route.query.coupon_name as string) || '')
const couponName = computed(() => couponNameFromQuery.value || resolvedCouponName.value)
const couponDiscount = computed(() => (route.query.coupon_discount as string) || '')
const subtotal = computed(() => (route.query.subtotal as string) || '$0')
const totalFromQuery = computed(() => (route.query.total as string) || '$0')
const trialUnit = computed(() => (route.query.trial as string) || 'days')
const trialLength = computed(() => {
  const raw = route.query.trial_length
  const parsed = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isNaN(parsed) ? 0 : parsed
})
const redirectTarget = computed(() => route.query.redirect as string | undefined)

const displayTotal = computed(() => {
  // Original project: if trial_length > 0, success page total is always $0.00
  if (trialLength.value > 0) return '$0.00'
  return totalFromQuery.value
})

const trialDisplay = computed(() => {
  if (trialLength.value > 0) {
    return `${trialLength.value} ${trialUnit.value}`
  }
  return '-'
})

const trialExpiry = computed(() => {
  if (trialLength.value <= 0) return ''
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + trialLength.value)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(expiry)
})

onMounted(async () => {
  // If a coupon code is present but no display name, fetch it (mirrors original success page)
  if (couponCode.value && !couponNameFromQuery.value) {
    loadingCouponName.value = true
    try {
      const coupon = await getCoupon(couponCode.value)
      if (coupon.label_as || coupon.name) {
        resolvedCouponName.value = coupon.label_as || coupon.name
      }
    } catch {
      // Leave coupon name empty if lookup fails
    } finally {
      loadingCouponName.value = false
    }
  }

  const target = redirectTarget.value
  if (!target) return

  // Wait a few seconds so the user can see the success message,
  // then redirect back to the page they were trying to access.
  window.setTimeout(() => {
    router.replace(target)
  }, 3500)
})
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-[var(--app-bg)]">
    <section class="w-full max-w-md rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-8 shadow-lg">
      <h1 class="text-center text-2xl font-semibold text-[var(--app-text)]">Sign in to your account</h1>
      <p class="mt-2 text-center text-sm text-[var(--app-text-secondary)]">
        Or <RouterLink :to="pricingLink" class="text-[var(--app-primary)] underline hover:opacity-80">try our research, analysis and tools for 14 days for free</RouterLink>
      </p>

      <form class="mt-6 space-y-4" @submit.prevent="onLogin">
        <div>
          <label class="mb-1 block text-sm font-medium text-[var(--app-text-secondary)]">Email Address</label>
          <input
            v-model="form.email"
            type="email"
            required
            class="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2.5 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]"
            placeholder="you@example.com"
            @blur="onBlur('email')"
          />
          <p v-if="errors.email" class="mt-1 text-xs text-red-500">{{ errors.email }}</p>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-[var(--app-text-secondary)]">Password</label>
          <div class="relative">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              required
              class="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2.5 pr-10 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]"
              placeholder="••••••••"
              @blur="onBlur('password')"
            />
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
              @click="showPassword = !showPassword"
            >
              <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </button>
          </div>
          <p v-if="errors.password" class="mt-1 text-xs text-red-500">{{ errors.password }}</p>
        </div>

        <button
          type="submit"
          :disabled="isDisabled || loading"
          class="w-full rounded-md bg-[var(--app-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span v-if="loading" class="flex items-center justify-center gap-2">
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Signing in…
          </span>
          <span v-else>Sign in</span>
        </button>

        <p v-if="formError" class="text-center text-sm text-red-500">{{ formError }}</p>

        <div class="text-center">
          <a href="https://users.sentimentrader.com/users/forgot_password/" target="_blank" class="text-sm text-[var(--app-primary)] underline hover:opacity-80">
            Forgot your password?
          </a>
        </div>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login } from '@/shared/api/stApi'
import { getCookieData, getCurrentAccessLevels } from '@/shared/auth/permission'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const formError = ref('')
const showPassword = ref(false)

const form = reactive({ email: '', password: '' })
const errors = reactive<Record<string, string>>({})

const redirectTarget = computed(() => route.query.redirect as string | undefined)
const pricingLink = computed(() => {
  return redirectTarget.value
    ? { path: '/pricing', query: { redirect: redirectTarget.value } }
    : '/pricing'
})

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function onBlur(field: string) {
  const value = form[field as keyof typeof form]
  if (!value) {
    errors[field] = 'This field is required'
  } else if (field === 'email' && !validateEmail(value)) {
    errors[field] = 'Invalid email address'
  } else if (errors[field]) {
    delete errors[field]
  }
}

const isDisabled = computed(() => {
  if (Object.keys(errors).length > 0) return true
  if (!form.email || !validateEmail(form.email) || !form.password) return true
  if (loading.value) return true
  return false
})

async function onLogin() {
  loading.value = true
  formError.value = ''

  try {
    const res = await login(form.email, form.password)
    if (!res.success) {
      formError.value = 'Login failed. Please check your credentials.'
      return
    }

    // Wait a beat for the cookie to be set, then redirect
    setTimeout(() => {
      const session = getCookieData()
      const levels = getCurrentAccessLevels()
      console.log('[Login] session:', session, 'levels:', levels)

      const redirect = new URLSearchParams(window.location.search).get('redirect')
      router.replace(redirect || '/')
    }, 500)
  } catch (e: any) {
    const status = e?.response?.status
    if (status === 401) {
      formError.value = 'The password is incorrect.'
    } else if (status === 404) {
      formError.value = 'The user does not exist.'
    } else {
      formError.value = 'There has been an error. Try again later.'
    }
  } finally {
    loading.value = false
  }
}
</script>

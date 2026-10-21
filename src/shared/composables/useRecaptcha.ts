/**
 * useRecaptcha — Vue 3 composable for Google reCAPTCHA v3.
 *
 * Mirrors react-google-recaptcha-v3 behavior used in the original Next.js project:
 *   1. Load https://www.google.com/recaptcha/api.js?render=<siteKey>
 *   2. Call grecaptcha.execute(action) to get a token
 *
 * Site key is read from import.meta.env.VITE_GOOGLE_CAPTCHA_SITE_KEY.
 */
import { ref, onMounted } from 'vue'

const SITE_KEY = import.meta.env.VITE_GOOGLE_CAPTCHA_SITE_KEY || ''

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}

let scriptPromise: Promise<void> | null = null

function loadRecaptchaScript(): Promise<void> {
  if (scriptPromise) return scriptPromise

  if (!SITE_KEY) {
    scriptPromise = Promise.reject(new Error('VITE_GOOGLE_CAPTCHA_SITE_KEY is not set'))
    return scriptPromise
  }

  scriptPromise = new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Cannot load reCAPTCHA outside browser'))
      return
    }

    if (window.grecaptcha) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google reCAPTCHA script'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

export function useRecaptcha() {
  const isReady = ref(false)
  const error = ref('')

  onMounted(async () => {
    try {
      await loadRecaptchaScript()
      isReady.value = true
    } catch (e: any) {
      error.value = e?.message || 'reCAPTCHA failed to load'
    }
  })

  async function executeRecaptcha(action: string): Promise<string> {
    await loadRecaptchaScript()

    if (!window.grecaptcha) {
      throw new Error('reCAPTCHA not available')
    }

    return new Promise((resolve, reject) => {
      window.grecaptcha!.ready(async () => {
        try {
          const token = await window.grecaptcha!.execute(SITE_KEY, { action })
          resolve(token)
        } catch (e: any) {
          reject(e)
        }
      })
    })
  }

  return { isReady, error, executeRecaptcha }
}

/**
 * useRecurlyCard — Vue 3 composable for Recurly.js CardElement (v4).
 *
 * Mirrors the original Next.js project's usage of @recurly/react-recurly CardElement.
 * The combined CardElement renders card number, expiry, and CVV in one hosted field,
 * with default placeholders matching the original checkout form.
 *
 * Recurly v4 API pattern:
 *   1. window.recurly.configure({ publicKey })
 *   2. const elements = window.recurly.Elements()
 *   3. const card = elements.CardElement(opts).attach(container)
 *   4. window.recurly.token(elements, form, callback)
 *
 * CRITICAL:
 * - Recurly instances stored as plain variables (NEVER ref/reactive)
 * - Card container must always exist in DOM (no v-if)
 */
import type { Ref } from 'vue'
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'

declare global {
  interface Window {
    recurly: {
      configure: (config: { publicKey: string }) => void
      Elements: () => ElementsInstance
      token: (...args: any[]) => void
    }
  }
}

interface ElementsInstance {
  CardElement: (opts?: { displayIcon?: boolean; style?: Record<string, any> }) => CardElement
}

interface CardElement {
  attach: (el: HTMLElement) => void
  remove: () => void
  on: (event: string, handler: (state: any) => void) => void
}

interface TokenPayload {
  id: string
  type: string
}

interface RecurlyError {
  code: string
  message: string
  fields?: string[]
}

const RECURLY_PUBLIC_KEY = import.meta.env.VITE_RECURLY_PUBLIC_API_KEY || ''

// Module-level singleton
let globalElements: ElementsInstance | null = null
let globalConfigured = false

function ensureConfigured() {
  const recurly = (window as any).recurly
  if (!recurly || globalConfigured) return
  globalConfigured = true
  recurly.configure({ publicKey: RECURLY_PUBLIC_KEY })
  globalElements = recurly.Elements()
}

export function useRecurlyCard(containerRef: Ref<HTMLElement | null>) {
  // ── Plain variables (non-reactive) ─────────────────────────────
  let cardElement: CardElement | null = null

  // ── Reactive UI state ────────────────────────────────────────────
  const isCardValid = ref(false)
  const cardError = ref('')
  const isLoading = ref(false)
  const formError = ref('')

  // Vue template refs are assigned *after* the component mounts.
  let attached = false
  let stopWatching: (() => void) | null = null
  stopWatching = watch(containerRef, async (el) => {
    if (!el || attached) return

    const recurly = (window as any).recurly
    if (!recurly) {
      formError.value = 'Payment system failed to load. Please refresh.'
      stopWatching!()
      return
    }
    if (!RECURLY_PUBLIC_KEY) {
      formError.value = 'Payment configuration error.'
      stopWatching!()
      return
    }

    // Wait for next Vue tick + a paint cycle so the container has
    // been laid out and has real dimensions before Recurly attaches.
    await nextTick()
    await new Promise<void>((r) => requestAnimationFrame(() => r()))

    // Guard against a container that is somehow still 0×0
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      // Try once more after another paint cycle
      await new Promise<void>((r) => requestAnimationFrame(() => r()))
      const rect2 = el.getBoundingClientRect()
      if (rect2.width === 0 || rect2.height === 0) {
        formError.value = 'Payment field failed to initialise — please refresh.'
        stopWatching!()
        return
      }
    }

    ensureConfigured()
    if (!globalElements) {
      formError.value = 'Payment system initialization failed.'
      stopWatching!()
      return
    }

    cardElement = globalElements.CardElement({
      displayIcon: false,
      style: {
        fontSize: '16px',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: '#071b4f',
        placeholder: { color: '#9ca3af' },
        // Remove Recurly v4 default border/background inside the element
        border: 'none',
        background: 'transparent',
        padding: '0',
        margin: '0',
        boxShadow: 'none',
        borderRadius: '0',
      },
    })

    cardElement.on('change', (state: any) => {
      isCardValid.value = state.valid || false
      cardError.value = state.error || ''
    })

    cardElement.on('focus', () => {
      el.classList.add('recurly-focused')
    })

    cardElement.on('blur', () => {
      el.classList.remove('recurly-focused')
    })

    cardElement.attach(el)
    attached = true
    stopWatching!()
  }, { immediate: true })

  onBeforeUnmount(() => {
    if (cardElement) {
      cardElement.remove()
      cardElement = null
    }
    attached = false
  })

  // ── Token generation ────────────────────────────────────────────
  function getToken(formEl: HTMLFormElement): Promise<string> {
    return new Promise((resolve, reject) => {
      const recurly = (window as any).recurly
      if (!recurly || !globalElements || !cardElement) {
        reject(new Error('Card element not initialized'))
        return
      }

      isLoading.value = true

      // v4 token() with elements
      recurly.token(globalElements, formEl, (err: RecurlyError | null, token: TokenPayload | null) => {
        isLoading.value = false
        if (err) {
          if (err.code === 'validation') {
            formError.value = 'The credit card information is not valid'
          } else {
            formError.value = err.message
          }
          reject(err)
        } else if (token) {
          formError.value = ''
          resolve(token.id)
        }
      })
    })
  }

  return { isCardValid, cardError, isLoading, formError, getToken }
}

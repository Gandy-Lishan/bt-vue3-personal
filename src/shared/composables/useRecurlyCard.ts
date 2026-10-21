/**
 * useRecurlyCard — Vue 3 composable for Recurly.js CardElement (v4).
 *
 * Recurly v4 API pattern:
 *   1. window.recurly.configure({ publicKey })  // once globally
 *   2. const elements = window.recurly.Elements()
 *   3. const card = elements.CardElement(opts).attach(container)
 *   4. window.recurly.token(elements, form, callback)  // 3-arg signature
 *
 * CRITICAL:
 * - Recurly instances stored as plain variables (NEVER ref/reactive)
 * - Card container must always exist in DOM (no v-if)
 * - configure() is called here on first invocation, cached thereafter
 */
import type { Ref } from 'vue'
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

declare global {
  interface Window {
    recurly: {
      configure: (config: { publicKey: string }) => void
      Elements: () => ElementsInstance
      token: (
        elements: ElementsInstance,
        form: HTMLFormElement,
        callback: (err: RecurlyError | null, token: TokenPayload | null) => void
      ) => void
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

// Module-level singleton: configure once, cache the Elements instance
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
  // ── Plain variables (non-reactive) ──────────────────────────────
  let cardElement: CardElement | null = null

  // ── Reactive UI state ────────────────────────────────────────────
  const isCardValid = ref(false)
  const cardError = ref('')
  const isLoading = ref(false)
  const formError = ref('')

  onMounted(async () => {
    await nextTick()

    const recurly = (window as any).recurly
    if (!recurly) {
      formError.value = 'Payment system failed to load. Please refresh.'
      return
    }
    if (!RECURLY_PUBLIC_KEY) {
      formError.value = 'Payment configuration error.'
      return
    }

    ensureConfigured()
    if (!globalElements) {
      formError.value = 'Payment system initialization failed.'
      return
    }

    // Create CardElement from the shared Elements instance
    cardElement = globalElements.CardElement({
      displayIcon: false,
      style: {
        fontSize: '14px',
        fontFamily: 'inherit',
      },
    })

    // Listen for changes
    cardElement.on('change', (state: any) => {
      isCardValid.value = state.valid || false
      cardError.value = state.error || ''
    })

    // Attach to DOM container
    if (containerRef.value) {
      cardElement.attach(containerRef.value)
    }
  })

  onBeforeUnmount(() => {
    if (cardElement) {
      cardElement.remove()
      cardElement = null
    }
  })

  // ── Token generation (3-arg signature) ───────────────────────────
  function getToken(formEl: HTMLFormElement): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!globalElements || !cardElement) {
        reject(new Error('Card element not initialized'))
        return
      }

      isLoading.value = true

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

import { computed, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'

/**
 * Manages Annual/Quarterly toggle for statement tabs (Cash Flow, Financials, Balance Sheet).
 *
 * Annual data comes from the parent `detail` fetch (no extra request).
 * Quarterly data is loaded on-demand via `loadQuarterly(ticker, signal)`.
 *
 * Switching back to Annual immediately uses `annualRows` without re-fetching.
 * Ticker changes clear quarterly data and re-request.
 */
export function useMarketStatementPeriod<T>(
  ticker: Ref<string>,
  annualRows: ComputedRef<T[]>,
  loadQuarterly: (ticker: string, signal: AbortSignal) => Promise<T[]>,
) {
  const period = ref<'annual' | 'quarterly'>('annual')
  const quarterlyRows = ref<T[]>([])
  const periodLoading = ref(false)

  let abortController: AbortController | null = null

  async function requestQuarterly(sym: string) {
    abortController?.abort()
    abortController = new AbortController()
    periodLoading.value = true
    try {
      const result = await loadQuarterly(sym, abortController.signal)
      quarterlyRows.value = result
    } catch {
      // Silently fail on abort or network error
      if (!abortController?.signal.aborted) {
        quarterlyRows.value = []
      }
    } finally {
      periodLoading.value = false
    }
  }

  watch(
    [ticker, () => period.value],
    ([newTicker, newPeriod]) => {
      if (newPeriod === 'quarterly' && newTicker) {
        quarterlyRows.value = []
        requestQuarterly(newTicker)
      }
    },
  )

  function setPeriod(next: 'annual' | 'quarterly') {
    period.value = next
  }

  const rows = computed(() =>
    period.value === 'annual' ? annualRows.value : quarterlyRows.value,
  )

  return { period, rows, periodLoading, setPeriod }
}

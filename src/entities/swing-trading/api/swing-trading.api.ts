const SWING_AI_API = '/dev/scanner_trader/swingai'
const SWING_AI_SUBSCRIPTION_API = `${SWING_AI_API}/subscriptions`

export interface AxiosCompatibleResponse<T = unknown> {
  data: T
  status: number
}

async function request<T>(path: string, init: RequestInit = {}): Promise<AxiosCompatibleResponse<T>> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
  })

  const text = await response.text()
  let data: unknown = {}
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok && response.status !== 404 && response.status !== 409) {
    const error = new Error(`Swing Trading request failed (${response.status})`) as Error & {
      response?: AxiosCompatibleResponse<unknown>
    }
    error.response = { data, status: response.status }
    throw error
  }

  return { data: data as T, status: response.status }
}

export function getSwingTradingDashboard() {
  return request(`${SWING_AI_API}/dashboard`)
}

export function getSwingTradingStrategyDetail(strategyId: string, params: Record<string, unknown> = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  const suffix = search.size ? `?${search.toString()}` : ''
  return request(`${SWING_AI_API}/strategy/${encodeURIComponent(strategyId)}${suffix}`)
}

export function getSwingAiSubscription() {
  return request(SWING_AI_SUBSCRIPTION_API, {
    headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' },
  })
}

function buildStrategiesPayload(strategies: unknown, notificationEmail = '') {
  if (!Array.isArray(strategies)) return strategies
  const fallbackEmail = notificationEmail.trim()
  return strategies.map((strategy) => {
    if (!strategy || typeof strategy !== 'object' || !fallbackEmail) return strategy
    const record = strategy as Record<string, unknown>
    if (record.notification_email || record.notificationEmail) return strategy
    return { ...record, notification_email: fallbackEmail }
  })
}

export function confirmSwingAiSubscription(
  strategies: unknown,
  notificationEmail = '',
  configHash = '',
) {
  return request(SWING_AI_SUBSCRIPTION_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'confirm',
      strategies: buildStrategiesPayload(strategies, notificationEmail),
      ...(configHash ? { config_hash: configHash } : {}),
    }),
  })
}

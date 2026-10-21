import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// ── Auth ───────────────────────────────────────────────────────────
export type AccessLevel = string | string[] | null

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password })
  return data as { success: boolean; username?: string; account_code?: string; access_level?: AccessLevel }
}

export async function getMe() {
  const { data } = await api.get('/auth/me')
  return data as { authenticated: boolean; username?: string; account_code?: string; access_level?: AccessLevel }
}

export async function logout() {
  await api.post('/auth/logout')
}

// ── Recurly ────────────────────────────────────────────────────────
export interface Plan {
  code: string
  name: string
  description: string
  interval_unit: string
  interval_length: number
  trial_unit: string | null
  trial_length: number | null
  amount: number
}

export async function getPlan(code: string) {
  const { data } = await api.get<Plan>(`/recurly/plan/${code}`)
  return data
}

export interface Coupon {
  code: string
  name: string
  state: string
  label_as: string | null
  amount: number
  discount_type: string | null
  percent?: number
}

export async function getCoupon(code: string) {
  const { data } = await api.get<Coupon>(`/recurly/coupon/${code}`)
  return data
}

// ─ Checkout ───────────────────────────────────────────────────────
export interface CreateAccountRequest {
  email: string
  password: string
  first_name: string
  last_name: string
  token_id: string  // Recurly.js tokenized card
  address: string
  city: string
  state: string
  zip: string
  country: string
  plan_code: string
  coupon_code?: string
  captcha: string
  trading_strategy_tags?: string[]
  trading_strategy_other?: string
  source?: string
  medium?: string
  campaign?: string
  irclickid?: string
  terms: boolean
}

export interface CreateAccountCwRequest {
  email: string
  password: string
  first_name: string
  last_name: string
  address: string
  city: string
  state: string
  zip: string
  country: string
  plan_code: string
  coupon_code?: string
  captcha: string
  trading_strategy_tags?: string[]
  trading_strategy_other?: string
  source?: string
  medium?: string
  campaign?: string
  irclickid?: string
  terms: boolean
}

export async function createAccount(req: CreateAccountRequest) {
  const { data } = await api.post('/recurly/accounts', req)
  return data as {
    success: boolean
    purchase?: { account_id: string; invoice_id: string }
    identify?: { email: string; account_code: string }
    error?: string
    errors?: Array<Record<string, string>>
  }
}

export async function createAccountCw(req: CreateAccountCwRequest) {
  const { data } = await api.post('/recurly/accountsCw', req)
  return data as {
    success: boolean
    purchase?: { account_id: string; invoice_id: string }
    identify?: { email: string; account_code: string }
    error?: string
    errors?: Array<Record<string, string>>
  }
}

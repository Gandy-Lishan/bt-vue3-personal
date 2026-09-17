import type { Router } from 'vue-router'
import CryptoJS from 'crypto-js'

export interface SentimenSessionData {
  username?: string
  access_level?: unknown
  account_code?: string
  authorized?: boolean
  security_response?: number
  session_expiration?: string
}

export interface PermissionDecision {
  allowed: boolean
  redirectPath?: string
}

export const SENTIMEN_SESSION_COOKIE = 'sentimen_session'
export const DEVBT2_USER_ID_COOKIE = 'devbt2Userid'

const COOKIE_HASH = '49Xsc8027bdNU3174b2cbb92dwWWExa9'

const fullAccessLevels = ['everything', 'premium', 'research']
const notificationAccessLevels = ['basic', 'premium', 'premium-data-yearly', 'institutional', 'indicatoredge']
const reportsAllowedFragments = [
  '/sentimentedge',
  '/quantedge',
  '/kaeppelscorner',
  '/modeledge',
  '/tradingedge',
  '/impactedge',
  '/blog',
  '/dashboard',
  '/favorites',
  '/tags',
  '/backtester/sr/setup',
  '/backtester/sr/results',
  '/backtester/list/sample',
  '/backtester/list/analyst',
  '/doc',
  '/contact',
  '/market',
]

function isBrowser() {
  return typeof document !== 'undefined'
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizeCookieValue(value: string) {
  return safeDecode(value.replace(/^"|"$/g, '').trim())
}

export function readCookie(name: string) {
  if (!isBrowser()) return ''

  const encodedName = `${encodeURIComponent(name)}=`
  const cookie = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(encodedName) || item.startsWith(`${name}=`))

  if (!cookie) return ''
  return normalizeCookieValue(cookie.slice(cookie.indexOf('=') + 1))
}

function writeCookie(name: string, value: string) {
  if (!isBrowser()) return

  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; SameSite=Lax${secure}`
}

function removeCookie(name: string) {
  if (!isBrowser()) return
  document.cookie = `${encodeURIComponent(name)}=; path=/; Max-Age=0`
}

function getQueryParam(name: string) {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get(name) ?? ''
}

function decryptSessionCookie(cookieValue: string) {
  const key = CryptoJS.enc.Utf8.parse(COOKIE_HASH)
  const bytes = CryptoJS.AES.decrypt(cookieValue, key, {
    mode: CryptoJS.mode.ECB,
  })
  return bytes.toString(CryptoJS.enc.Utf8)
}

export function getCookieData(cookieValue = readCookie(SENTIMEN_SESSION_COOKIE)): SentimenSessionData | null {
  const normalizedCookie = normalizeCookieValue(cookieValue)
  if (!normalizedCookie) return null

  try {
    const originalText = decryptSessionCookie(normalizedCookie)
    if (!originalText || originalText === 'undefined') return null
    return JSON.parse(originalText) as SentimenSessionData
  } catch {
    return null
  }
}

export function normalizeAccessLevels(accessLevel: unknown): string[] {
  if (Array.isArray(accessLevel)) return accessLevel.map(String).map((item) => item.toLowerCase())
  if (typeof accessLevel === 'string') {
    const parsed = accessLevel.trim()
    if (!parsed) return []
    try {
      const maybeArray = JSON.parse(parsed) as unknown
      if (Array.isArray(maybeArray)) return maybeArray.map(String).map((item) => item.toLowerCase())
    } catch {
      return parsed.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)
    }
    return [parsed.toLowerCase()]
  }
  return []
}

export function getCurrentAccessLevels() {
  return normalizeAccessLevels(getCookieData()?.access_level)
}

export function getCurrentUsername() {
  return getCookieData()?.username || readCookie(DEVBT2_USER_ID_COOKIE)
}

export function hasAnyAccess(accessLevels: string[], requiredLevels: string[]) {
  return requiredLevels.some((requiredLevel) =>
    accessLevels.some((accessLevel) => accessLevel.includes(requiredLevel.toLowerCase())),
  )
}

function hasFullAccess(accessLevels: string[]) {
  return hasAnyAccess(accessLevels, fullAccessLevels)
}

function hasAuthenticatedCookie() {
  return Boolean(readCookie(SENTIMEN_SESSION_COOKIE) || readCookie(DEVBT2_USER_ID_COOKIE))
}

function normalizePath(path: string) {
  const lowerPath = path.toLowerCase() || '/'
  if (lowerPath === '/backtests') return '/backtester'
  return lowerPath
}

function reportsUserCanAccess(path: string) {
  if (path === '/' || path.startsWith('/dashboard')) return true
  if (path.includes('/backtester') && !reportsAllowedFragments.some((fragment) => path.includes(fragment))) {
    return false
  }
  return (
    (path.includes('/mr') ||
      path.includes('/backtester') ||
      path.includes('/doc') ||
      path.includes('/contact') ||
      path.includes('/dashboard') ||
      path.includes('/market')) &&
    reportsAllowedFragments.some((fragment) => path.includes(fragment))
  )
}

export function getRoutePermissionDecision(
  path: string,
  accessLevels = getCurrentAccessLevels(),
  isAuthenticated = hasAuthenticatedCookie(),
): PermissionDecision {
  const normalizedPath = normalizePath(path)

  if (normalizedPath === '/404') return { allowed: true }
  if (!isAuthenticated) return { allowed: false, redirectPath: '/404' }
  if (!accessLevels.length) return { allowed: true }

  if (normalizedPath.includes('/notifications')) {
    return hasAnyAccess(accessLevels, notificationAccessLevels)
      ? { allowed: true }
      : { allowed: false, redirectPath: '/' }
  }

  if (hasFullAccess(accessLevels)) return { allowed: true }

  if (hasAnyAccess(accessLevels, ['datalite'])) {
    return normalizedPath.includes('/mr') ? { allowed: false, redirectPath: '/' } : { allowed: true }
  }

  if (hasAnyAccess(accessLevels, ['reports'])) {
    if (reportsUserCanAccess(normalizedPath)) return { allowed: true }
    return {
      allowed: false,
      redirectPath: normalizedPath.includes('/backtester') ? '/backtester/list/sample' : '/MR/sentimentedge',
    }
  }

  if (hasAnyAccess(accessLevels, ['corelite'])) {
    return normalizedPath.includes('/mr') ||
      normalizedPath.includes('/strategy') ||
      normalizedPath.includes('/swing_trading') ||
      normalizedPath.includes('/scannerai')
      ? { allowed: true }
      : { allowed: false, redirectPath: '/MR/sentimentedge' }
  }

  return { allowed: true }
}

export function canAccessNavigationItem(path: string, requiredLevels?: string[], external = false) {
  const accessLevels = getCurrentAccessLevels()
  const isAuthenticated = hasAuthenticatedCookie()

  if (requiredLevels?.length) {
    if (!isAuthenticated) return false
    if (!accessLevels.length) return true
    if (hasFullAccess(accessLevels)) return true
    return hasAnyAccess(accessLevels, requiredLevels)
  }

  if (external) return true
  return getRoutePermissionDecision(path, accessLevels, isAuthenticated).allowed
}

export function prepareLegacyAuthCookies() {
  if (!isBrowser()) return

  if (readCookie(SENTIMEN_SESSION_COOKIE)) {
    removeCookie(DEVBT2_USER_ID_COOKIE)
  } else {
    const userId = getQueryParam('userid')
    if (userId) writeCookie(DEVBT2_USER_ID_COOKIE, userId)
  }

  const backtestId = getQueryParam('backtestID')
  if (backtestId) localStorage.setItem('backtestID', backtestId)
}

export function ensureDevelopmentSessionCookie() {
  if (!import.meta.env.DEV || !isBrowser() || readCookie(SENTIMEN_SESSION_COOKIE)) return

  const devCookie = import.meta.env.VITE_DEV_SENTIMEN_SESSION
  if (devCookie) writeCookie(SENTIMEN_SESSION_COOKIE, devCookie)
}

export function syncBacktestUserStorage() {
  const username = getCurrentUsername()
  if (username) localStorage.setItem('backtest_user', username)
}

export function installRouterPermissionGuard(router: Router) {
  router.beforeEach((to) => {
    ensureDevelopmentSessionCookie()
    prepareLegacyAuthCookies()
    syncBacktestUserStorage()

    const decision = getRoutePermissionDecision(to.path)
    if (decision.allowed) return true
    if (to.path === decision.redirectPath) return true

    return {
      path: decision.redirectPath ?? '/404',
      query: to.fullPath === '/' ? undefined : { redirect: to.fullPath },
      replace: true,
    }
  })
}

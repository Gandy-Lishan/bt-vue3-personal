import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEVBT2_USER_ID_COOKIE,
  SENTIMEN_SESSION_COOKIE,
  getCookieData,
  getCurrentAccessLevels,
  getRoutePermissionDecision,
  normalizeAccessLevels,
  prepareLegacyAuthCookies,
} from '@/shared/auth/permission'

const testSentimenSession =
  'IJLN7EhBuOXvsdvgYt7rLyYvp4GSk2hXdln69TOIHHgCIpzJIACssjQOW7bWH20fpw0OiGw0poJIV2Nzvk3FatVlMwKuU6zTMuorJTgFps1U8Hf6ux9GVpeoQR1iivqwN2hd9ZIY8qo4NiJD0KNh11JZNTcxiPKBDRcdvrCIKT6n6fP4p8m0vZCRGExnFzlNyGOMAg6L0P8uxwaORgH6lTcesVlyOUjwVPoejA8q5vu9+2Ua1ZC0EPtbgoyLBrCWduhPJnynwcIMq74y1JTK49iuJXZZ1xi0lq9R6vfCbfwQ6yKaPTUk5SLPIURdC+tXAgClauHMEAJ19C5IihySD7gIQ6luZFfq6GdHssy0ebkiQoEoX8ymUzMdH4a8jX583j6RaCOWJ+L9xfq8bbQ7vFSysWWZ6nzD3EbCdqKT7Kfvx5pSii2XwuP42aqx/k1nf26ufCqzOnUj4olrtCt/Tg=='

function clearCookie(name: string) {
  document.cookie = `${encodeURIComponent(name)}=; path=/; Max-Age=0`
}

describe('permission helpers', () => {
  beforeEach(() => {
    clearCookie(SENTIMEN_SESSION_COOKIE)
    clearCookie(DEVBT2_USER_ID_COOKIE)
    localStorage.clear()
  })

  it('decrypts the local development sentimen_session cookie', () => {
    document.cookie = `${SENTIMEN_SESSION_COOKIE}=${encodeURIComponent(testSentimenSession)}; path=/`

    const session = getCookieData()

    expect(session?.username).toBe('hao@sentimentrader.com')
    expect(getCurrentAccessLevels()).toContain('everything')
  })

  it('normalizes access levels from arrays, JSON strings, and comma-separated strings', () => {
    expect(normalizeAccessLevels(['Premium', 'IndicatorEdge'])).toEqual(['premium', 'indicatoredge'])
    expect(normalizeAccessLevels('["reports","corelite"]')).toEqual(['reports', 'corelite'])
    expect(normalizeAccessLevels('reports, corelite')).toEqual(['reports', 'corelite'])
  })

  it('matches legacy route restrictions without making requests', () => {
    expect(getRoutePermissionDecision('/indicators', ['everything'], true).allowed).toBe(true)
    expect(getRoutePermissionDecision('/indicators', ['datalite'], true).allowed).toBe(true)

    expect(getRoutePermissionDecision('/MR/sentimentedge', ['datalite'], true)).toEqual({
      allowed: false,
      redirectPath: '/',
    })
    expect(getRoutePermissionDecision('/indicators', ['reports'], true)).toEqual({
      allowed: false,
      redirectPath: '/MR/sentimentedge',
    })
    expect(getRoutePermissionDecision('/indicators', ['corelite'], true)).toEqual({
      allowed: false,
      redirectPath: '/MR/sentimentedge',
    })
  })

  it('allows report accounts into their limited report and sample backtest pages', () => {
    expect(getRoutePermissionDecision('/MR/sentimentedge', ['reports'], true).allowed).toBe(true)
    expect(getRoutePermissionDecision('/backtester/list/sample', ['reports'], true).allowed).toBe(true)
    expect(getRoutePermissionDecision('/backtester/list/history', ['reports'], true)).toEqual({
      allowed: false,
      redirectPath: '/backtester/list/sample',
    })
  })

  it('keeps the old userid fallback cookie behavior without granting explicit levels', () => {
    window.history.replaceState(null, '', '/indicators?userid=system&backtestID=bt-1')

    prepareLegacyAuthCookies()

    expect(document.cookie).toContain(`${DEVBT2_USER_ID_COOKIE}=system`)
    expect(localStorage.getItem('backtestID')).toBe('bt-1')
    expect(getRoutePermissionDecision('/indicators').allowed).toBe(true)
  })

  it('redirects unauthenticated routes to the local unauthorized page', () => {
    expect(getRoutePermissionDecision('/indicators', [], false)).toEqual({
      allowed: false,
      redirectPath: '/404',
    })
  })
})

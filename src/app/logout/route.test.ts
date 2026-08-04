/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { safeRedirectPath } from '@/lib/urlUtils'

import { GET } from './route'

const cookieJar = vi.hoisted(() => ({ names: [] as string[] }))
vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => cookieJar.names.map((name) => ({ name, value: 'x' })),
  }),
}))

describe('safeRedirectPath', () => {
  it('keeps same-origin absolute paths', () => {
    expect(safeRedirectPath('/v2/projects/foo')).toBe('/v2/projects/foo')
  })

  it('rejects off-site redirects', () => {
    for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', null]) {
      expect(safeRedirectPath(bad)).toBe('/v2/projects')
    }
  })
})

describe('GET /v2/logout', () => {
  beforeEach(() => {
    cookieJar.names = []
    delete process.env.OIDC_LOGOUT_URL
  })

  it('expires every ALB session cookie shard and redirects', async () => {
    cookieJar.names = [
      'AWSELBAuthSessionCookie-0',
      'AWSELBAuthSessionCookie-1',
      'unrelated',
    ]
    const res = await GET(new Request('https://flyte.example/v2/logout'))

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://flyte.example/v2/projects')

    const setCookie = res.headers.getSetCookie()
    expect(setCookie).toHaveLength(2)
    expect(setCookie.every((c) => c.includes('Max-Age=0'))).toBe(true)
    expect(setCookie.some((c) => c.includes('unrelated'))).toBe(false)
  })

  it('redirects to the IdP when OIDC_LOGOUT_URL is set', async () => {
    process.env.OIDC_LOGOUT_URL = 'https://okta.example/oauth2/v1/logout'
    const res = await GET(new Request('https://flyte.example/v2/logout'))
    expect(res.headers.get('location')).toBe(
      'https://okta.example/oauth2/v1/logout',
    )
  })

  it('ignores an attacker-supplied redirect_url', async () => {
    const res = await GET(
      new Request('https://flyte.example/v2/logout?redirect_url=//evil.com'),
    )
    expect(res.headers.get('location')).toBe('https://flyte.example/v2/projects')
  })
})

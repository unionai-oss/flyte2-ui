/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { safeRedirectPath } from '@/lib/urlUtils'

export const dynamic = 'force-dynamic'

/**
 * ALB shards the OIDC session across `AWSELBAuthSessionCookie-0`, `-1`, … as the
 * token grows, so we expire every cookie with this prefix rather than a fixed pair.
 */
const ALB_SESSION_COOKIE_PREFIX = 'AWSELBAuthSessionCookie'

/** ALB sets its session cookies host-only on `/`; deletion must match. */
const EXPIRED = 'Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax'

/**
 * Signs the user out by expiring the ALB OIDC session cookies.
 *
 * ponytail: clearing the cookie only ends the *ALB* session. If the IdP session is
 * still live, the next request re-authenticates silently — set `OIDC_LOGOUT_URL`
 * (e.g. the Okta `/v1/logout` endpoint) to end that one too.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const target =
    process.env.OIDC_LOGOUT_URL ||
    new URL(safeRedirectPath(url.searchParams.get('redirect_url')), url.origin)
      .toString()

  const response = NextResponse.redirect(target, 302)

  const names = (await cookies())
    .getAll()
    .map((c) => c.name)
    .filter((name) => name.startsWith(ALB_SESSION_COOKIE_PREFIX))

  // Nothing to clear (no ALB in front, or already signed out) — still redirect.
  for (const name of names) {
    response.headers.append('set-cookie', `${name}=; ${EXPIRED}`)
  }

  return response
}

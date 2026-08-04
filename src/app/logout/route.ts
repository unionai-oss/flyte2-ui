/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { safeRedirectPath } from '@/lib/urlUtils'

export const dynamic = 'force-dynamic'

/**
 * Session cookies expired on sign out, as `LOGOUT_CLEAR_COOKIES` (comma-separated).
 *
 * Defaults to AWS ALB's four shards — it splits the session at 4K and supports 16K
 * total, so `-0`…`-3` is the documented maximum, not a guess. Override this if the
 * listener rule sets a custom `SessionCookieName`.
 *
 * They are expired unconditionally because ALB does NOT forward its own session
 * cookie to the target (verified: the request arrives with none), so "expire what
 * the request carries" clears nothing and leaves the user signed in. Expiring a
 * cookie that was never set is a no-op.
 *
 * Most other proxies — oauth2-proxy (`/oauth2/sign_out`), GCP IAP
 * (`/_gcp_iap/clear_login_cookie`), Cloudflare Access (`/cdn-cgi/access/logout`) —
 * expose a sign-out endpoint that clears their own cookie. Point `OIDC_LOGOUT_URL`
 * at it and set `LOGOUT_CLEAR_COOKIES=` (empty) so this route only redirects.
 */
const CLEAR_COOKIES = (
  process.env.LOGOUT_CLEAR_COOKIES ??
  'AWSELBAuthSessionCookie-0,AWSELBAuthSessionCookie-1,AWSELBAuthSessionCookie-2,AWSELBAuthSessionCookie-3'
)
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean)

/** Proxy session cookies are host-only on `/`; deletion must match to overwrite. */
const EXPIRED = 'Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax'

/**
 * Signs the user out by expiring the proxy's session cookies, then handing off to
 * the identity provider.
 *
 * Note: clearing the cookie only ends the *proxy* session. If the IdP session is
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

  // Shards past the configured names, for proxies that do forward their session
  // cookie and split it further than the defaults cover.
  const forwarded = (await cookies())
    .getAll()
    .map((c) => c.name)
    .filter((name) =>
      CLEAR_COOKIES.some((base) => {
        if (!name.startsWith(base)) return false
        // `-0` (ALB) and `_0` (oauth2-proxy) are the shard suffixes in the wild.
        const shard = name.slice(base.length)
        return shard === '' || /^[-_]\d+$/.test(shard)
      }),
    )

  for (const name of new Set([...CLEAR_COOKIES, ...forwarded])) {
    response.headers.append('set-cookie', `${name}=; ${EXPIRED}`)
  }

  return response
}

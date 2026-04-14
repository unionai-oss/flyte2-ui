/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import type { QueryClient } from '@tanstack/react-query'
import { getLoginUrl } from './apiUtils'
import { notifyAuthExpired } from './authExpiredNotifier'
import { isAuthError, isStrongAuthError } from './errorUtils'

export type RefreshAuthOptions = {
  queryClient?: QueryClient
}

function cacheStillHasAuthError(queryClient: QueryClient): boolean {
  const cache = queryClient.getQueryCache?.()
  if (!cache?.getAll) return false
  return cache.getAll().some(
    (q) =>
      q.state.status === 'error' &&
      !!q.state.error &&
      isAuthError(q.state.error),
  )
}

/**
 * On strong auth error (ConnectError Unauthenticated / HTTP 401): try to
 * refresh tokens by fetching the login endpoint (server may set new cookies
 * from the Okta refresh token). `fetch` uses `no-cors` (opaque response), so
 * we cannot tell from the response whether cookies were renewed; after
 * refetching active queries, if any still has an auth error we notify so the
 * login panel can show. The fetch throwing also notifies.
 */
export const refreshAuth = async (
  error?: unknown,
  options?: RefreshAuthOptions,
): Promise<void> => {
  if (!isStrongAuthError(error)) {
    return
  }

  try {
    const loginUrl = getLoginUrl()
    await fetch(loginUrl, {
      method: 'GET',
      headers: { Accept: 'text/html' },
      credentials: 'include',
      redirect: 'follow',
      mode: 'no-cors',
    })
    const { queryClient } = options ?? {}
    if (queryClient?.refetchQueries) {
      await queryClient.refetchQueries({ type: 'active' })
      if (cacheStillHasAuthError(queryClient)) {
        notifyAuthExpired()
      }
    }
    return
  } catch (e) {
    console.warn(
      '[auth] refreshAuth: fetch threw, falling through to show login panel',
      e,
    )
  }

  notifyAuthExpired()
}

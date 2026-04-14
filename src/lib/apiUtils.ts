'use client'


/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */
// assumes localDev is using devbox server
export const BASE_ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API_URL || '/'
import { createConnectTransport } from '@connectrpc/connect-web'
import { QueryClient } from '@tanstack/react-query'
import { isAuthError } from '@/lib/errorUtils'

export const isLocalDev = process.env.NODE_ENV !== 'production'
const isDevBox = BASE_ADMIN_API?.includes('localhost')
/** Post-login path; always used as login `redirect_url` (same for every page). */
export const LOGIN_REDIRECT_PATH = '/v2/projects'

/** Login URL. `redirect_url` is always `${LOGIN_REDIRECT_PATH}` so the auth server never receives a per-page or cross-origin URL. */
export function getLoginUrl(): string {
  const baseUrl = (BASE_ADMIN_API || '/').replace(/\/$/, '')
  return `${baseUrl || ''}/login?redirect_url=${encodeURIComponent(LOGIN_REDIRECT_PATH)}`
}

export function createTransport(_useBinaryFormat: boolean) {
  return createConnectTransport({
    baseUrl: BASE_ADMIN_API,
    // useBinaryFormat,
    ...(!isDevBox && {
      fetch: (input, init) => {
        return fetch(input, {
          ...init,
          credentials: 'include', // This enables sending cookies in cross-origin requests
        })
      },
    }),
  })
}

/** Default transport (binary format). Used for all Connect RPC requests. */
export const finalTransport = createTransport(true)

// Create QueryClient outside component to prevent memory leaks
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Add some reasonable defaults
      refetchOnWindowFocus: false,
      // Don't retry 401s: let the cache subscriber run refreshAuth, then refetch or show login modal
      retry: (failureCount, error) => !isAuthError(error) && failureCount < 3,
    },
  },
})

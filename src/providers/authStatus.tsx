/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */
'use client'

import { subscribeAuthExpired } from '@/lib/authExpiredNotifier'
import { isAuthError } from '@/lib/errorUtils'
import { refreshAuth } from '@/lib/refreshAuth'
import { useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react'

export type LoginStatus = {
  expired: boolean | undefined
  setExpired: (expired: boolean) => void
}

const defaultLoginStatus: LoginStatus = {
  expired: undefined,
  setExpired: () => {},
}

const AuthStatusContext = createContext<LoginStatus>(defaultLoginStatus)

export function useAuthStatus(): LoginStatus {
  const ctx = useContext(AuthStatusContext)
  return ctx ?? defaultLoginStatus
}

function checkQueryAuthError(query: {
  state: { status: string; error: unknown }
  queryKey: readonly unknown[]
}): boolean {
  const state = query.state
  if (state.status === 'error' && state.error && isAuthError(state.error)) {
    return true
  }
  return false
}

const QUERY_KEY_DELIMITER = '|'

/** Serialize query key to a string with unambiguous segment boundaries for substring checks. */
function serializeQueryKey(queryKey: readonly unknown[]): string {
  return queryKey
    .map((part) =>
      typeof part === 'object' && part !== null
        ? JSON.stringify(part)
        : String(part),
    )
    .join(QUERY_KEY_DELIMITER)
}

const EXCLUDED_QUERY_KEY_SUBSTRINGS = [
  'usageMeasureGroups',
  'getQuota',
  'billing',
  'breadcrumb',
  'publicConfig',
]

function shouldResetExpiredOnSuccess(queryKey: readonly unknown[]): boolean {
  const keyStr = Array.isArray(queryKey)
    ? serializeQueryKey(queryKey)
    : String(queryKey)
  return !EXCLUDED_QUERY_KEY_SUBSTRINGS.some((sub) => keyStr.includes(sub))
}

type QueryShape = {
  state: { status: string; error: unknown }
  queryKey: readonly unknown[]
}

type AuthRefs = {
  refreshInProgressRef: MutableRefObject<boolean>
  hasAttemptedRefreshRef: MutableRefObject<boolean>
}

async function handleQueryAuthState(
  query: QueryShape,
  setExpired: (value: boolean) => void,
  queryClient: ReturnType<typeof useQueryClient>,
  refs: AuthRefs,
  authExpiredRef: MutableRefObject<boolean>,
): Promise<void> {
  const { refreshInProgressRef, hasAttemptedRefreshRef } = refs

  if (checkQueryAuthError(query)) {
    if (authExpiredRef.current) return
    if (refreshInProgressRef.current) return
    if (hasAttemptedRefreshRef.current) {
      setExpired(true)
      return
    }
    refreshInProgressRef.current = true
    hasAttemptedRefreshRef.current = true
    try {
      await refreshAuth(query.state.error, { queryClient })
    } finally {
      refreshInProgressRef.current = false
    }
    return
  }

  if (
    query.state.status === 'success' &&
    shouldResetExpiredOnSuccess(query.queryKey)
  ) {
    // Without a dedicated UserInfo gate, reset after any qualifying success so a
    // later session expiry can run refreshAuth again.
    hasAttemptedRefreshRef.current = false
    setExpired(false)
  }
}

export function AuthStatusProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [expired, setExpiredState] = useState<boolean | undefined>(undefined)
  const authExpiredRef = useRef(false)
  const refreshInProgressRef = useRef(false)
  const hasAttemptedRefreshRef = useRef(false)

  const setExpired = useCallback((value: boolean) => {
    authExpiredRef.current = value
    setExpiredState((prev) => (prev === value ? prev : value))
  }, [])

  useEffect(() => {
    const queryCache = queryClient.getQueryCache()
    const refs: AuthRefs = { refreshInProgressRef, hasAttemptedRefreshRef }

    const onCacheEvent = async (event: {
      type: string
      query?: QueryShape
    }) => {
      const q = event.query
      if (!q) return

      const { type } = event
      if (type !== 'updated' && type !== 'added' && type !== 'observerAdded') {
        return
      }
      if (type === 'observerAdded') {
        const needsAuthHandling =
          checkQueryAuthError(q) ||
          (q.state.status === 'success' &&
            shouldResetExpiredOnSuccess(q.queryKey))
        if (!needsAuthHandling) return
      }

      await handleQueryAuthState(
        q,
        setExpired,
        queryClient,
        refs,
        authExpiredRef,
      )
    }

    const unsubCache = queryCache.subscribe(onCacheEvent)

    for (const query of queryCache.getAll()) {
      if (checkQueryAuthError(query)) {
        void handleQueryAuthState(
          query,
          setExpired,
          queryClient,
          refs,
          authExpiredRef,
        )
        break
      }
    }

    return unsubCache
  }, [queryClient, setExpired])

  useEffect(() => {
    return subscribeAuthExpired(() => setExpired(true))
  }, [setExpired])

  return (
    <AuthStatusContext.Provider value={{ expired, setExpired }}>
      {children}
    </AuthStatusContext.Provider>
  )
}

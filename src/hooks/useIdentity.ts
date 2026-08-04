/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { useQuery } from '@tanstack/react-query'

import { IdentityService } from '@/gen/flyteidl2/auth/identity_pb'
import { isBrowser } from '@/lib/windowUtils'

import { useConnectRpcClient } from './useConnectRpc'

/**
 * Current user, or null when the deployment has no auth in front of it
 * (UserInfo answers Unauthenticated when identity headers aren't trusted).
 */
export function useIdentity() {
  const client = useConnectRpcClient(IdentityService)

  return useQuery({
    queryKey: ['identity'],
    // ponytail: swallow the error instead of letting it reach the query cache —
    // an errored query trips AuthStatusProvider's refresh/login-panel flow, and
    // "this deployment has no auth" is not an expired session.
    queryFn: () => client.userInfo({}).catch(() => null),
    enabled: isBrowser(),
    refetchInterval: 1000 * 60,
  })
}

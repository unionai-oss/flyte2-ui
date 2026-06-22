/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

/**
 * Dataplane routing via **SelectCluster** (ClusterService).
 *
 * - Callers build a {@link SelectClusterRequest} (resource + operation). The RPC returns the
 *   **dataplane base URL** (`clusterEndpoint`) used for Connect clients to DataProxy, logs, etc.
 * - **Caching:** `getSelectClusterQueryKey` + React Query dedupe identical requests across hooks/UI.
 * - **Errors:** Successful resolutions stay fresh (`staleTime: Infinity`). Failed queries are always
 *   stale and refetch on window focus (and a slow interval) so transient SelectCluster outages do not
 *   strand dependents until a full page reload.
 */
import { create } from '@bufbuild/protobuf'
import type { Client } from '@connectrpc/connect'
import { useQuery } from '@tanstack/react-query'

import type { SelectClusterRequest } from '@/gen/flyteidl2/cluster/payload_pb'
import { SelectClusterRequestSchema } from '@/gen/flyteidl2/cluster/payload_pb'
import { ClusterService as Flyteidl2ClusterService } from '@/gen/flyteidl2/cluster/service_pb'

import { useConnectRpcClient } from './useConnectRpc'

type Flyteidl2ClusterClient = Client<typeof Flyteidl2ClusterService>

/** Base URL string returned by SelectCluster (`selectResponse.clusterEndpoint`). */
export type DataplaneClusterEndpoint = string

/** Poll SelectCluster while the query is in `error` (tab focused / default interval behavior). */
const SELECT_CLUSTER_ERROR_REFETCH_INTERVAL_MS = 60_000

/**
 * Connect procedure path for SelectCluster (same for all operations; the
 * resolved dataplane base URL is returned in the response).
 */
export const SELECT_CLUSTER_PROCEDURE =
  '/flyteidl2.cluster.ClusterService/SelectCluster'

function selectClusterResourceQueryKey(
  resource: SelectClusterRequest['resource'],
): readonly unknown[] {
  if (!resource || resource.case === undefined) {
    return ['pending'] as const
  }
  switch (resource.case) {
    case 'orgId':
      return ['orgId', resource.value.name] as const
    case 'projectId':
      return [
        'projectId',
        resource.value.organization,
        resource.value.domain,
        resource.value.name,
      ] as const
    case 'taskId':
      return [
        'taskId',
        resource.value.org,
        resource.value.project,
        resource.value.domain,
        resource.value.name,
        resource.value.version,
      ] as const
    case 'actionId': {
      const run = resource.value.run
      return [
        'actionId',
        run?.org,
        run?.project,
        run?.domain,
        run?.name,
        resource.value.name,
      ] as const
    }
    case 'actionAttemptId': {
      const aid = resource.value.actionId
      const run = aid?.run
      return [
        'actionAttemptId',
        run?.org,
        run?.project,
        run?.domain,
        run?.name,
        aid?.name,
        resource.value.attempt,
      ] as const
    }
    case 'appId':
      return [
        'appId',
        resource.value.org,
        resource.value.project,
        resource.value.domain,
        resource.value.name,
      ] as const
    default: {
      const _exhaustive: never = resource
      return ['unknown', _exhaustive] as const
    }
  }
}

/**
 * React Query cache key for {@link SelectClusterRequest} (resource + operation).
 */
export function getSelectClusterQueryKey(
  request: SelectClusterRequest | undefined | null,
): readonly unknown[] {
  if (!request?.resource || request.resource.case === undefined) {
    return ['selectCluster', 'pending', request?.operation] as const
  }
  return [
    'selectCluster',
    ...selectClusterResourceQueryKey(request.resource),
    request.operation,
  ] as const
}

export function selectClusterQueryOptions(
  clusterServiceClient: Flyteidl2ClusterClient,
  request: SelectClusterRequest,
) {
  return {
    queryKey: getSelectClusterQueryKey(request),
    queryFn: async () => {
      if (!request.resource || request.resource.case === undefined) {
        throw new Error('SelectCluster: resource is required')
      }
      const selectResponse = await clusterServiceClient.selectCluster(
        create(SelectClusterRequestSchema, {
          resource: request.resource,
          operation: request.operation,
        }),
      )
      const clusterEndpoint = selectResponse.clusterEndpoint
      if (!clusterEndpoint) {
        throw new Error('SelectCluster did not return clusterEndpoint')
      }
      return clusterEndpoint
    },
    /** Superseded by {@link useSelectCluster} for observer queries; kept for `prefetchQuery` spreads. */
    staleTime: Infinity,
  }
}

export interface UseSelectClusterOptions {
  /** Full SelectCluster RPC input; omit or omit `resource.case` while disabled. */
  request?: SelectClusterRequest | null
  enabled?: boolean
}

/**
 * Resolves the dataplane cluster base URL via SelectCluster for any supported resource
 * (org, project, task, action, action attempt, app).
 *
 * Cached per {@link getSelectClusterQueryKey} so callers can share one network call.
 *
 * Failed queries use `staleTime: 0` and refetch on window focus so errors do not cache “forever”
 * while successful dataplane URLs stay pinned until invalidation.
 */
export function useSelectCluster({
  request,
  enabled = true,
}: UseSelectClusterOptions) {
  const clusterServiceClient = useConnectRpcClient(Flyteidl2ClusterService)

  const hasResource = !!request?.resource && request.resource.case !== undefined

  return useQuery({
    queryKey: getSelectClusterQueryKey(request ?? undefined),
    queryFn: async () => {
      if (!request?.resource || request.resource.case === undefined) {
        throw new Error('SelectCluster: resource is required')
      }
      return selectClusterQueryOptions(clusterServiceClient, request).queryFn()
    },
    enabled: hasResource && enabled,
    // Success stays non-stale (`Infinity` below) so this does not spam SelectCluster on focus.
    refetchOnWindowFocus: true,
    staleTime: (query) => (query.state.status === 'error' ? 0 : Infinity),
    refetchInterval: (query) =>
      query.state.status === 'error'
        ? SELECT_CLUSTER_ERROR_REFETCH_INTERVAL_MS
        : false,
    experimental_prefetchInRender: true,
  })
}

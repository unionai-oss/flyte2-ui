/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { useMemo } from 'react'

import { create } from '@bufbuild/protobuf'
import { createClient } from '@connectrpc/connect'
import { useQuery } from '@tanstack/react-query'

import {
  SelectClusterRequest_Operation,
  SelectClusterRequestSchema,
} from '@/gen/flyteidl2/cluster/payload_pb'
import { DataProxyService } from '@/gen/flyteidl2/dataproxy/dataproxy_service_pb'
import { ActionDetails } from '@/gen/flyteidl2/workflow/run_definition_pb'
import { createClusterConnectTransport } from '@/lib/apiUtils'
import { DATA_PLANE_CONNECTION_ERROR } from '@/lib/errorMessages'
import { getRetryQueryOnNon404 } from '@/lib/errorUtils'

import { getSelectClusterQueryKey, useSelectCluster } from './useSelectCluster'

export interface UseActionDataProps {
  actionDetails?: ActionDetails | null
  enabled?: boolean
}

/**
 * Action literals via dataplane **GetActionData** after **SelectCluster** (action-scoped).
 * Return includes **`clusterEndpoint`** for any consumer that needs the dataplane URL
 * (shares the same query key as internal `useSelectCluster`).
 */
export function useActionData({
  actionDetails,
  enabled = true,
}: UseActionDataProps) {
  const actionId = actionDetails?.id

  const selectClusterRequest = useMemo(
    () =>
      actionId
        ? create(SelectClusterRequestSchema, {
            resource: { case: 'actionId' as const, value: actionId },
            operation: SelectClusterRequest_Operation.GET_ACTION_DATA,
          })
        : undefined,
    [actionId],
  )

  const clusterActive = !!actionId && enabled

  const clusterQuery = useSelectCluster({
    request: selectClusterRequest,
    enabled: clusterActive,
  })

  const actionDataQuery = useQuery({
    queryKey: ['actionData', ...getSelectClusterQueryKey(selectClusterRequest)],
    queryFn: async () => {
      if (!actionId || !selectClusterRequest) return null

      const clusterEndpoint = clusterQuery.data
      if (!clusterEndpoint) {
        throw new Error(
          'Unable to load action data because the cluster endpoint could not be resolved. Please try again.',
        )
      }

      const dataproxyClient = createClient(
        DataProxyService,
        createClusterConnectTransport(clusterEndpoint),
      )
      return dataproxyClient.getActionData({
        actionId,
      })
    },
    enabled: clusterActive && clusterQuery.isSuccess && !!clusterQuery.data,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    experimental_prefetchInRender: true,
    retry: getRetryQueryOnNon404(),
  })

  const isClusterConnectionError = clusterQuery.isError
  const clusterError = isClusterConnectionError
    ? DATA_PLANE_CONNECTION_ERROR
    : null
  const displayErrorMessage =
    clusterError?.message ?? actionDataQuery.error?.message ?? null

  return {
    ...actionDataQuery,
    /** Dataplane base URL from SelectCluster (GET_ACTION_DATA). */
    clusterEndpoint: clusterQuery.data,
    isClusterConnectionError,
    clusterError,
    displayErrorMessage,
  }
}

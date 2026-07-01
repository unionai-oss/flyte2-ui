/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { ProjectIdentifier } from '@/gen/flyteidl2/common/identifier_pb'
import { Filter, Sort_Direction } from '@/gen/flyteidl2/common/list_pb'
import {
  ListRunsRequestSchema,
  ListRunsResponse,
  RunService,
} from '@/gen/flyteidl2/workflow/run_service_pb'
import { create } from '@bufbuild/protobuf'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useConnectRpcClient } from './useConnectRpc'

interface UseWatchRunsOptions {
  limit?: number
  projectId?: ProjectIdentifier
  filters?: Filter[]
  enabled?: boolean
}

// Polling interval for refreshing the runs list.
// We poll listRuns rather than using the watchRuns stream because watchRuns
// does not support filtering, so live updates would bypass any active filters.
const POLLING_INTERVAL_MS = 2000 // Poll every 2 seconds

export function useWatchRuns({
  limit = 100,
  projectId,
  filters,
  enabled = true,
}: UseWatchRunsOptions = {}) {
  const client = useConnectRpcClient(RunService)

  const fetchRunsPage = useCallback(
    async ({
      pageParam = '',
    }: {
      pageParam?: string
    }): Promise<ListRunsResponse> => {
      if (!projectId?.organization || !projectId?.domain || !projectId?.name) {
        // Return empty response with proper structure
        return {
          $typeName: 'flyteidl2.workflow.ListRunsResponse',
          runs: [],
          token: '',
        } as ListRunsResponse
      }

      const listRequest = create(ListRunsRequestSchema, {
        request: {
          limit,
          token: pageParam,
          sortBy: {
            direction: Sort_Direction.DESCENDING,
            key: 'created_at',
          },
          filters,
        },
        scopeBy: {
          case: 'projectId',
          value: projectId,
        },
      })

      const response = await client.listRuns(listRequest)
      return response
    },
    [client, limit, projectId, filters],
  )

  const isQueryEnabled =
    enabled &&
    !!projectId?.domain &&
    !!projectId?.name &&
    !!projectId?.organization

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['watchRuns', { projectId, limit, filters }],
    queryFn: fetchRunsPage,
    initialPageParam: '',
    getNextPageParam: (lastPage: ListRunsResponse) => {
      // Only return the next token if the current page has data and a valid token
      if (
        lastPage.runs &&
        lastPage.runs.length > 0 &&
        lastPage.token &&
        lastPage.token.trim() !== ''
      ) {
        return lastPage.token
      }
      return undefined
    },
    enabled: isQueryEnabled,
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
    // Keep the list up to date via polling instead of a watch stream so that
    // active filters are always respected (watchRuns does not support filters).
    refetchInterval: isQueryEnabled ? POLLING_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
  })

  return infiniteQuery
}

/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */


import { ActionIdentifier } from '@/gen/flyteidl2/common/identifier_pb'
import { Code, ConnectError } from '@connectrpc/connect'
import { useQuery } from '@tanstack/react-query'
import { useConnectRpcClient } from './useConnectRpc'
import { ArtifactType, DataProxyService } from '@/gen/flyteidl2/dataproxy/dataproxy_service_pb'

type UseRunReportsProps = {
  artifactType: ArtifactType
  attempt?: number
  actionId?: ActionIdentifier
  enabled: boolean
  isActionTerminal?: boolean
}

export function useRunReports({
  artifactType,
  attempt,
  actionId,
  enabled,
  isActionTerminal,
}: UseRunReportsProps) {
  const client = useConnectRpcClient(DataProxyService)

  const query = useQuery({
    queryKey: ['useRunReports', artifactType, attempt, actionId],
    queryFn: async () => {
      const response = await client.createDownloadLink({
        artifactType,
        source: {
          case: 'actionAttemptId',
          value: {
            actionId: {
              name: actionId?.name || '',
              run: {
                org: actionId?.run?.org || '',
                project: actionId?.run?.project || '',
                domain: actionId?.run?.domain || '',
                name: actionId?.run?.name || '',
              },
            },
            attempt: attempt ?? 0,
          },
        },
      })
      const urls = response.preSignedUrls?.signedUrl ?? []
      if (!urls.length) throw new Error('No reports')
      return urls
    },
    retry: (failureCount, error) => {
      // Disable retry for specific error types
      if (error instanceof ConnectError) {
        if (
          // Don't retry if err code is not found
          error.code === Code.NotFound
        ) {
          return false
        }
      }

      // For other errors, allow retry up to 3 times
      return failureCount < 3
    },
    enabled: Boolean(actionId) && enabled,
    // Poll every second while action is not terminal
    refetchInterval: isActionTerminal === false ? 1000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  })
  return query
}

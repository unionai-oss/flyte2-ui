/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react'

import { create } from '@bufbuild/protobuf'
import { Code, ConnectError, createClient } from '@connectrpc/connect'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  SelectClusterRequest_Operation,
  SelectClusterRequestSchema,
} from '@/gen/flyteidl2/cluster/payload_pb'
import {
  DataProxyService,
  TailLogsRequestSchema,
  type TailLogsResponse,
} from '@/gen/flyteidl2/dataproxy/dataproxy_service_pb'
import { LogLine } from '@/gen/flyteidl2/logs/dataplane/payload_pb'
import { ActionDetails } from '@/gen/flyteidl2/workflow/run_definition_pb'
import { createClusterConnectTransport } from '@/lib/apiUtils'
import { DATA_PLANE_CONNECTION_ERROR } from '@/lib/errorMessages'

import { getSelectClusterQueryKey, useSelectCluster } from './useSelectCluster'

interface UseWatchLogsOptions {
  actionDetails?: ActionDetails
  attempt?: number | null
  enabled?: boolean
  connectorEndpoint?: string
}

interface LogsState {
  lines: LogLine[]
  lineContainers: string[]
  containers: string[]
}

// Buffer configuration
const BUFFER_FLUSH_INTERVAL_MS = 100 // Flush every 100ms
const BUFFER_MAX_SIZE = 1000 // Flush immediately if buffer exceeds this

export function useWatchLogs({
  actionDetails,
  attempt = 0,
  enabled = false,
  connectorEndpoint = '',
}: UseWatchLogsOptions = {}) {
  const queryClient = useQueryClient()

  const attemptNumber = attempt ?? 0

  const actionIdName = actionDetails?.id?.name
  const runOrg = actionDetails?.id?.run?.org
  const runProject = actionDetails?.id?.run?.project
  const runDomain = actionDetails?.id?.run?.domain
  const runName = actionDetails?.id?.run?.name

  const hasValidIdentifier = !!(
    runOrg &&
    runProject &&
    runDomain &&
    runName &&
    actionIdName
  )

  const selectClusterRequest = useMemo(
    () =>
      hasValidIdentifier
        ? create(SelectClusterRequestSchema, {
            resource: {
              case: 'actionAttemptId' as const,
              value: {
                actionId: {
                  run: {
                    org: runOrg!,
                    project: runProject!,
                    domain: runDomain!,
                    name: runName!,
                  },
                  name: actionIdName!,
                },
                attempt: attemptNumber,
              },
            },
            operation: SelectClusterRequest_Operation.TAIL_LOGS,
          })
        : undefined,
    [
      hasValidIdentifier,
      runOrg,
      runProject,
      runDomain,
      runName,
      actionIdName,
      attemptNumber,
    ],
  )

  const clusterQuery = useSelectCluster({
    request: selectClusterRequest,
    enabled: hasValidIdentifier && enabled,
  })

  const queryKey = useMemo(
    () => [
      'watchLogs',
      { actionId: actionDetails?.id, attempt, connectorEndpoint },
      ...getSelectClusterQueryKey(selectClusterRequest),
    ],
    [actionDetails?.id, attempt, connectorEndpoint, selectClusterRequest],
  )

  const streamRef = useRef<AsyncIterable<TailLogsResponse>>(undefined)
  const abortControllerRef = useRef<AbortController>(undefined)
  const bufferRef = useRef<LogLine[]>([])
  const bufferContainersRef = useRef<string[]>([])
  const flushTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Flush buffered log lines to query data
  const flushBuffer = useCallback(() => {
    if (bufferRef.current.length === 0) return

    const linesToAdd = bufferRef.current
    const containersToAdd = bufferContainersRef.current
    bufferRef.current = []
    bufferContainersRef.current = []

    queryClient.setQueryData(
      queryKey,
      (
        oldData: LogsState = { lines: [], lineContainers: [], containers: [] },
      ) => {
        const existingLines = oldData.lines ?? []
        const existingLineContainers = oldData.lineContainers ?? []
        const existingContainers = oldData.containers ?? []
        const newLineContainers = [
          ...existingLineContainers,
          ...containersToAdd,
        ]
        const newContainerSet = new Set(existingContainers)
        for (const c of containersToAdd) {
          if (c) newContainerSet.add(c)
        }
        return {
          lines: [...existingLines, ...linesToAdd],
          lineContainers: newLineContainers,
          containers: Array.from(newContainerSet),
        }
      },
    )
  }, [queryClient, queryKey])

  // Add lines to buffer and schedule flush if needed
  const addToBuffer = useCallback(
    // containerLabel is the per-line attribution string formatted as
    // "<podName>/<containerName>" (or just "<podName>" when no container is
    // available). It's stored in bufferContainersRef as a parallel array to
    // the log lines so downstream filters can group by (pod, container).
    (newLines: LogLine[], containerLabel: string) => {
      if (newLines.length === 0) return

      bufferRef.current.push(...newLines)
      for (let i = 0; i < newLines.length; i++) {
        bufferContainersRef.current.push(containerLabel)
      }

      // Flush immediately if buffer is too large
      if (bufferRef.current.length >= BUFFER_MAX_SIZE) {
        if (flushTimeoutRef.current) {
          clearTimeout(flushTimeoutRef.current)
          flushTimeoutRef.current = undefined
        }
        flushBuffer()
        return
      }

      // Schedule flush if not already scheduled
      if (!flushTimeoutRef.current) {
        flushTimeoutRef.current = setTimeout(() => {
          flushTimeoutRef.current = undefined
          flushBuffer()
        }, BUFFER_FLUSH_INTERVAL_MS)
      }
    },
    [flushBuffer],
  )

  // Cleanup function for the stream and buffer
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = undefined
    }
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current)
      flushTimeoutRef.current = undefined
    }
    // Flush any remaining buffered lines before cleanup
    if (bufferRef.current.length > 0) {
      flushBuffer()
    }
  }, [flushBuffer])

  // Reset buffer when query key changes
  useEffect(() => {
    // Clear any pending flush timeout
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current)
      flushTimeoutRef.current = undefined
    }
    // Clear buffer when switching to a new query
    bufferRef.current = []
    bufferContainersRef.current = []
  }, [queryKey])

  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  const query = useQuery<LogsState>({
    queryKey,
    queryFn: async () => {
      const clusterEndpoint = clusterQuery.data
      if (!clusterEndpoint) {
        throw new Error(
          'Unable to stream logs because the cluster endpoint could not be resolved. Please try again.',
        )
      }

      const client = createClient(
        DataProxyService,
        createClusterConnectTransport(clusterEndpoint),
      )

      return new Promise<LogsState>(async (resolve, reject) => {
        const taskType =
          actionDetails!.spec?.case === 'task'
            ? actionDetails!.spec.value.taskTemplate?.type
            : undefined
        const tailRequest = create(TailLogsRequestSchema, {
          actionId: actionDetails!.id,
          attempt: attemptNumber,
          podSelector:
            taskType === 'actor' ? undefined : { case: 'allPods', value: true },
          connectorEndpoint,
        })

        const abortController = new AbortController()
        abortControllerRef.current = abortController

        const stream = client.tailLogs(tailRequest, {
          signal: abortController.signal,
        })
        streamRef.current = stream

        try {
          for await (const response of stream) {
            if (abortController.signal.aborted) {
              break
            }

            for (const batch of response.logs ?? []) {
              const newLines = batch.lines ?? []
              const podName = batch.container?.kubernetesPodName ?? ''
              const containerName =
                batch.container?.kubernetesContainerName ?? ''
              const containerLabel =
                podName && containerName
                  ? `${podName}/${containerName}`
                  : podName
              addToBuffer(newLines, containerLabel)
            }
          }
        } catch (error) {
          if (!abortController.signal.aborted) {
            const hasBufferedLogs = bufferRef.current.length > 0
            const existingData = queryClient.getQueryData<LogsState>(queryKey)
            const hasExistingLogs =
              existingData?.lines && existingData.lines.length > 0

            if (hasBufferedLogs || hasExistingLogs) {
              // Continue to resolve with existing logs
            } else {
              reject(error)
            }
          }
        }

        flushBuffer()

        const data = queryClient.getQueryData<LogsState>(queryKey)
        resolve(data || { lines: [], lineContainers: [], containers: [] })
      })
    },
    enabled:
      !!actionDetails &&
      enabled &&
      hasValidIdentifier &&
      clusterQuery.isSuccess &&
      !!clusterQuery.data,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error instanceof ConnectError && error.code === Code.NotFound) {
        return false
      }
      return failureCount < 3
    },
    gcTime: 0,
    staleTime: 0,
  })

  const isClusterConnectionError = clusterQuery.isError
  const clusterError = isClusterConnectionError
    ? DATA_PLANE_CONNECTION_ERROR
    : null
  const displayErrorMessage =
    clusterError?.message ?? query.error?.message ?? null

  return {
    ...query,
    clusterEndpoint: clusterQuery.data,
    isClusterConnectionError,
    clusterError,
    displayErrorMessage,
    cleanup,
  }
}

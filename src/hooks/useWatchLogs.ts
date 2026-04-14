/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { LogLine } from '@/gen/flyteidl2/logs/dataplane/payload_pb'
import { ActionDetails } from '@/gen/flyteidl2/workflow/run_definition_pb'
import {
  RunLogsService,
  TailLogsRequestSchema,
  TailLogsResponse,
} from '@/gen/flyteidl2/workflow/run_logs_service_pb'
import { create } from '@bufbuild/protobuf'
import { Code, ConnectError } from '@connectrpc/connect'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useConnectRpcClient } from './useConnectRpc'

interface UseWatchLogsOptions {
  actionDetails?: ActionDetails
  attempt?: number | null
  enabled?: boolean
}

interface LogsState {
  lines: LogLine[]
}

// Buffer configuration
const BUFFER_FLUSH_INTERVAL_MS = 100 // Flush every 100ms
const BUFFER_MAX_SIZE = 1000 // Flush immediately if buffer exceeds this

export function useWatchLogs({
  actionDetails,
  attempt = 0,
  enabled = false,
}: UseWatchLogsOptions = {}) {
  const client = useConnectRpcClient(RunLogsService)
  const queryClient = useQueryClient()

  const queryKey = useMemo(
    () => ['watchLogs', { actionId: actionDetails?.id, attempt }],
    [actionDetails?.id, attempt],
  )

  const streamRef = useRef<AsyncIterable<TailLogsResponse>>(undefined)
  const abortControllerRef = useRef<AbortController>(undefined)
  const bufferRef = useRef<LogLine[]>([])
  const flushTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Flush buffered log lines to query data
  const flushBuffer = useCallback(() => {
    if (bufferRef.current.length === 0) return

    const linesToAdd = bufferRef.current
    bufferRef.current = []

    queryClient.setQueryData(queryKey, (oldData: LogsState = { lines: [] }) => {
      const existingLines = oldData.lines ?? []
      return {
        lines: [...existingLines, ...linesToAdd],
      }
    })
  }, [queryClient, queryKey])

  // Add lines to buffer and schedule flush if needed
  const addToBuffer = useCallback(
    (newLines: LogLine[]) => {
      if (newLines.length === 0) return

      bufferRef.current.push(...newLines)

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
      return new Promise<LogsState>(async (resolve, reject) => {
        const attemptNumber = attempt || 0
        // Create the tail logs request
        const tailRequest = create(TailLogsRequestSchema, {
          actionId: actionDetails!.id,
          attempt: attemptNumber,
        })

        // Start the watch stream for updates
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

            // Flatten all lines from all log batches in this response
            const newLines = (response.logs ?? []).flatMap(
              (batch) => batch.lines ?? [],
            )

            // Add to buffer instead of immediately updating query data
            addToBuffer(newLines)
          }
        } catch (error) {
          if (!abortController.signal.aborted) {
            // Check if there are any received logs (in buffer or query data)
            const hasBufferedLogs = bufferRef.current.length > 0
            const existingData = queryClient.getQueryData<LogsState>(queryKey)
            const hasExistingLogs =
              existingData?.lines && existingData.lines.length > 0

            // If there are logs, resolve instead of reject
            if (hasBufferedLogs || hasExistingLogs) {
              // Continue to resolve with existing logs
            } else {
              reject(error)
            }
          }
        }

        // Flush any remaining buffered lines before resolving
        flushBuffer()

        const data = queryClient.getQueryData<LogsState>(queryKey)
        resolve(data || { lines: [] })
      })
    },
    enabled: !!actionDetails && enabled,
    refetchInterval: false,
    refetchOnWindowFocus: false,
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
    gcTime: 0,
    staleTime: 0,
  })

  return {
    ...query,

    cleanup,
  }
}

/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import {
  App,
  Identifier,
  IdentifierSchema,
  Spec_DesiredState,
} from '@/gen/flyteidl2/app/app_definition_pb'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import cloneDeep from 'lodash/cloneDeep'
import { useEffect, useMemo, useRef, useState } from 'react'

import { TailLogsRequestSchema } from '@/gen/flyteidl2/app/app_logs_payload_pb'
import { AppLogsService } from '@/gen/flyteidl2/app/app_logs_service_pb'
import {
  GetRequestSchema,
  ListRequestSchema,
  UpdateRequestSchema,
} from '@/gen/flyteidl2/app/app_payload_pb'
import { AppService } from '@/gen/flyteidl2/app/app_service_pb'
import { ProjectIdentifierSchema } from '@/gen/flyteidl2/common/identifier_pb'
import { Filter_Function, FilterSchema } from '@/gen/flyteidl2/common/list_pb'
import { LogLine } from '@/gen/flyteidl2/logs/dataplane/payload_pb'
import { create } from '@bufbuild/protobuf'
import { Code, ConnectError } from '@connectrpc/connect'
import { useConnectRpcClient } from './useConnectRpc'

type ListAppsProps = {
  enabled?: boolean
  org: string
  domain: string | undefined
  projectId: string | undefined
  search?: string
  limit?: number
}

const getAppsQueryKey = ({ org, projectId, domain, search }: ListAppsProps) => {
  const key = ['apps', org, projectId, domain]
  return key.concat(search ? [search] : [])
}

// todo: this is intended as a placeholder for development. eventually we should swap this out for
// watchApps, with pagination and infinite scroll
export const useListApps = ({
  enabled = true,
  domain,
  org,
  projectId,
  search,
  limit = 100, // todo - replace with smaller limit when implementing watch api
}: ListAppsProps) => {
  const client = useConnectRpcClient(AppService)
  const queryKey = useMemo(
    () => getAppsQueryKey({ org, projectId, domain, search, limit }),
    [org, projectId, domain, search, limit],
  )

  const listRequest = create(ListRequestSchema, {
    request: {
      filters: search
        ? [
            create(FilterSchema, {
              function: Filter_Function.CONTAINS_CASE_INSENSITIVE,
              field: 'name',
              values: [search],
            }),
          ]
        : [],
      limit,
    },
    filterBy: {
      case: 'project',
      value: create(ProjectIdentifierSchema, {
        organization: org,
        domain,
        name: projectId,
      }),
    },
  })

  const fetchApps = async () => {
    return client.list(listRequest)
  }

  const isEnabled = enabled && !!org && !!domain && !!projectId

  return useQuery({
    enabled: isEnabled,
    queryKey,
    queryFn: fetchApps,
    refetchInterval: 10000,
  })
}

export const getAppIdentifier = ({
  domain,
  name,
  org,
  project,
}: Pick<Identifier, 'domain' | 'name' | 'org' | 'project'>) =>
  create(IdentifierSchema, {
    domain,
    name,
    org,
    project,
  })

export const useAppDetails = ({
  domain,
  name,
  org,
  projectId,
}: {
  domain: string
  org: string
  name: string
  projectId: string
}) => {
  const client = useConnectRpcClient(AppService)

  const queryKey = useMemo(
    () => getAppsQueryKey({ org, projectId, domain }),
    [org, projectId, domain],
  )

  const appIdentifier = getAppIdentifier({
    domain,
    name,
    org,
    project: projectId,
  })

  const getRequest = create(GetRequestSchema, {
    identifier: {
      case: 'appId',
      value: appIdentifier,
    },
  })
  return useQuery({
    queryFn: async () => {
      return client.get(getRequest)
    },
    queryKey: [...queryKey, name],
    refetchInterval: 5000,
    enabled: !!name,
    retry: (failureCount, error) => {
      if (error instanceof ConnectError) {
        if (error.code === Code.NotFound) {
          return false
        }
      }
      return failureCount < 3
    },
  })
}

type UpdateAppStatus = {
  app: App
  desiredState: Spec_DesiredState
}

export const useUpdateAppStatus = ({ app, desiredState }: UpdateAppStatus) => {
  const client = useConnectRpcClient(AppService)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!app.metadata?.id) return null
      const getRequest = create(GetRequestSchema, {
        identifier: {
          case: 'appId',
          value: app.metadata?.id,
        },
      })
      const appDetails = await client.get(getRequest)
      const appClone = cloneDeep(appDetails.app)
      if (!appClone?.spec)
        throw new Error('Could not update app without app spec')
      const withUpdatedStatus: App = {
        ...appClone,
        spec: {
          ...appClone.spec,
          desiredState,
        },
      }
      const request = create(UpdateRequestSchema, {
        app: withUpdatedStatus,
      })
      return client.update(request)
    },
    onSuccess: () => {
      const domain = app.metadata?.id?.domain || ''
      const org = app.metadata?.id?.org || ''
      const projectId = app.metadata?.id?.project || ''
      queryClient.invalidateQueries({
        queryKey: getAppsQueryKey({ domain, projectId, org }),
      })
    },
  })
}

export const useStartApp = (props: { app: App }) =>
  useUpdateAppStatus({ ...props, desiredState: Spec_DesiredState.ACTIVE })

export const useStopApp = (props: { app: App }) =>
  useUpdateAppStatus({
    ...props,
    desiredState: Spec_DesiredState.STOPPED,
  })

const APP_LOGS_BUFFER_FLUSH_INTERVAL_MS = 100
const APP_LOGS_BUFFER_MAX_SIZE = 1000

export const useAppLogs = ({
  appId = '',
  domain = '',
  enabled,
  org = '',
  projectId = '',
}: {
  appId: string | undefined
  domain: string | undefined
  enabled: boolean
  org: string | undefined
  projectId: string | undefined
}) => {
  const client = useConnectRpcClient(AppLogsService)
  const appIdentifier = useMemo(() => {
    return create(IdentifierSchema, {
      name: appId,
      domain,
      org,
      project: projectId,
    })
  }, [appId, domain, org, projectId])

  const isEnabled = enabled && !!appId && !!org && !!domain && !!projectId

  const [logs, setLogs] = useState<LogLine[]>([])
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const bufferRef = useRef<LogLine[]>([])
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )

  useEffect(() => {
    setLogs([])
    bufferRef.current = []
    clearTimeout(flushTimeoutRef.current)
    flushTimeoutRef.current = undefined
  }, [appId, domain, org, projectId])

  useEffect(() => {
    if (!isEnabled) return

    const tailLogsRequest = create(TailLogsRequestSchema, {
      target: {
        case: 'appId',
        value: appIdentifier,
      },
    })

    const abortController = new AbortController()
    setIsPending(true)
    setError(null)

    const flushBuffer = () => {
      if (bufferRef.current.length === 0) return
      const lines = bufferRef.current
      bufferRef.current = []
      setLogs((prev) => [...prev, ...lines])
    }

    const addToBuffer = (newLines: LogLine[]) => {
      if (newLines.length === 0) return
      bufferRef.current.push(...newLines)

      if (bufferRef.current.length >= APP_LOGS_BUFFER_MAX_SIZE) {
        clearTimeout(flushTimeoutRef.current)
        flushTimeoutRef.current = undefined
        flushBuffer()
        return
      }

      if (!flushTimeoutRef.current) {
        flushTimeoutRef.current = setTimeout(() => {
          flushTimeoutRef.current = undefined
          flushBuffer()
        }, APP_LOGS_BUFFER_FLUSH_INTERVAL_MS)
      }
    }

    const run = async () => {
      try {
        const stream = client.tailLogs(tailLogsRequest, {
          signal: abortController.signal,
        })
        for await (const event of stream) {
          if (event.resp.case === 'batches') {
            const newLines = event.resp.value.logs.flatMap(
              (l) => l.structuredLines,
            )
            addToBuffer(newLines)
          }
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      } finally {
        setIsPending(false)
      }
    }

    run()

    return () => {
      abortController.abort()
      clearTimeout(flushTimeoutRef.current)
      flushTimeoutRef.current = undefined
      flushBuffer()
    }
  }, [isEnabled, appIdentifier, client])

  return {
    logs,
    isPending,
    error,
  }
}

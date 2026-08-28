/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import type { TriggerIdentifier } from '@/gen/flyteidl2/common/identifier_pb'
import { VariableMap } from '@/gen/flyteidl2/core/interface_pb'
import { NamedLiteral } from '@/gen/flyteidl2/task/common_pb'
import {
  LiteralsToLaunchFormJsonRequestSchema,
  LiteralsToLaunchFormJsonResponse,
  TranslatorService,
} from '@/gen/flyteidl2/workflow/translator_service_pb'
import { create } from '@bufbuild/protobuf'
import { useQuery } from '@tanstack/react-query'
import stringify from 'safe-stable-stringify'
import { useConnectRpcClient } from './useConnectRpc'

interface UseLiteralToJsonParams {
  literals?: NamedLiteral[]
  variables?: VariableMap
  /**
   * Object store URI of offloaded literals. When set, the translator reads the
   * literals from storage server-side instead of them being sent inline, and
   * `literals` is ignored. Requires `triggerId` to authorize the read.
   */
  literalsUri?: string
  /**
   * Identifies the trigger whose offloaded inputs should be converted. The
   * translator looks the URI up from the trigger's own spec, so any non-empty
   * `literalsUri` acts as the "read offloaded" signal while this selects the
   * source.
   */
  triggerId?: TriggerIdentifier
}

export function useLiteralToJson(params: UseLiteralToJsonParams | null) {
  const client = useConnectRpcClient(TranslatorService)

  const queryKey = stringify(params)
  const query = useQuery({
    queryKey: ['literalsToLaunchForJson', queryKey],
    queryFn: async (): Promise<LiteralsToLaunchFormJsonResponse> => {
      if (!params) {
        throw new Error(
          'No parameters provided for literalsToLaunchFormJson call',
        )
      }

      const request = create(LiteralsToLaunchFormJsonRequestSchema, {
        literals: params.literalsUri ? [] : params.literals,
        variables: params.variables,
        literalsUri: params.literalsUri,
        ...(params.triggerId
          ? { owner: { case: 'triggerId' as const, value: params.triggerId } }
          : {}),
      })

      return await client.literalsToLaunchFormJson(request)
    },
    enabled:
      !!params?.variables &&
      // Either inline literals, or an offloaded URI plus the owning trigger the
      // backend authorizes the read against (it rejects a bare literals_uri).
      (!!params?.literals || (!!params?.literalsUri && !!params?.triggerId)),
    experimental_prefetchInRender: true,
  })

  return query
}

/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { useConnectRpcClient } from './useConnectRpc'
import { AuthorizerService } from '@/gen/authorizer/authorizer_pb'
import { AuthorizeRequestSchema } from '@/gen/authorizer/payload_pb'
import {
  type Resource,
  OrganizationSchema,
  ResourceSchema,
  Action,
} from '@/gen/common/authorization_pb'
import { create } from '@bufbuild/protobuf'
import { useOrg } from './useOrg'
import { useQuery } from '@tanstack/react-query'

interface AuthorizeParams {
  action: Action
  resource?: Resource
}

/** Builds a Resource scoped to the current org (used when no resource is provided). */
function useOrgResource(): Resource {
  const org = useOrg()
  return create(ResourceSchema, {
    resource: {
      case: 'organization',
      value: create(OrganizationSchema, { name: org }),
    },
  })
}

/**
 * Whether the current session is allowed `action` on `resource` (defaults to
 * org-scoped). Identity is omitted; the authorizer resolves the principal from
 * the authenticated request (cookies / gateway metadata).
 */
export function useIsAuthorized({
  action,
  resource,
}: AuthorizeParams): boolean {
  const client = useConnectRpcClient(AuthorizerService)
  const org = useOrg()
  const orgResource = useOrgResource()
  const resolvedResource = resource ?? orgResource

  const { data } = useQuery({
    queryKey: ['authorize', org, action, resolvedResource.resource],
    queryFn: () =>
      client.authorize(
        create(AuthorizeRequestSchema, {
          action,
          organization: org,
          resource: resolvedResource,
        }),
      ),
    enabled: !!org,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  return data?.allowed === true
}

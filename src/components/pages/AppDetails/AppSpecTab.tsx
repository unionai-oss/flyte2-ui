/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { DescriptionListWrapper } from '@/components/DescriptionListWrapper'
import { ExternalLinkUrl } from '@/components/ExternalLinkUrl'
import { TabSection } from '@/components/TabSection'
import {
  App,
  Status_DeploymentStatus,
} from '@/gen/flyteidl2/app/app_definition_pb'
import {
  Resources,
  Resources_ResourceName,
} from '@/gen/flyteidl2/core/tasks_pb'
import { getStatus } from '@/lib/appUtils'
import { useMemo } from 'react'
import stringify from 'safe-stable-stringify'

export const AppSpecTab = ({ app }: { app: App | undefined }) => {
  const description = app?.spec?.profile?.shortDescription
  const specJson = stringify(app?.spec)

  const links = app?.spec?.links || []
  const isActive =
    getStatus(app?.status?.conditions) === Status_DeploymentStatus.ACTIVE

  const containerResources: Resources | undefined =
    app?.spec?.appPayload.case === 'container'
      ? app.spec?.appPayload?.value.resources
      : undefined

  const replicaJson = useMemo(
    () =>
      ({
        Current: app?.status?.currentReplicas,
        Min: app?.spec?.autoscaling?.replicas?.min,
        Max: app?.spec?.autoscaling?.replicas?.max,
      }) as Record<string, unknown>,
    [app?.spec?.autoscaling?.replicas, app?.status?.currentReplicas],
  )

  const requestsJson = useMemo(
    () =>
      ({
        Memory: containerResources?.requests.find(
          (r) => r.name === Resources_ResourceName.MEMORY,
        )?.value,
        CPU: containerResources?.requests.find(
          (r) => r.name === Resources_ResourceName.CPU,
        )?.value,
        GPU: containerResources?.requests.find(
          (r) => r.name === Resources_ResourceName.GPU,
        )?.value,
        'Ephemeral Storage': containerResources?.requests.find(
          (r) => r.name === Resources_ResourceName.EPHEMERAL_STORAGE,
        )?.value,
      }) as Record<string, unknown>,
    [containerResources?.requests],
  )

  const limitsJson = useMemo(
    () =>
      ({
        Memory: containerResources?.limits.find(
          (r) => r.name === Resources_ResourceName.MEMORY,
        )?.value,
        CPU: containerResources?.limits.find(
          (r) => r.name === Resources_ResourceName.CPU,
        )?.value,
        GPU: containerResources?.limits.find(
          (r) => r.name === Resources_ResourceName.GPU,
        )?.value,
        'Ephemeral Storage': containerResources?.limits.find(
          (r) => r.name === Resources_ResourceName.EPHEMERAL_STORAGE,
        )?.value,
      }) as Record<string, unknown>,
    [containerResources?.limits],
  )

  const aboutRawJson = useMemo(() => {
    if (!app?.spec) return {}
    try {
      return JSON.parse(stringify(app.spec)) as Record<string, unknown>
    } catch {
      return {}
    }
  }, [app?.spec])

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 [&>*:last-child]:mb-5">
      {description && (
        <div>
          <h3 className="text-sm font-bold">Description</h3>
          <p className="text-sm dark:text-(--system-gray-6)">{description}</p>
        </div>
      )}
      {links.length > 0 && isActive && (
        <div>
          <h3 className="mb-2 text-sm font-bold">Links</h3>
          <div className="flex flex-wrap gap-3">
            {links.map((l) => (
              <ExternalLinkUrl
                iconClassname="dark:text-(--system-gray-6)"
                key={l.path}
                name={l.title}
                url={`${app?.status?.ingress?.publicUrl}${l.path}`}
              ></ExternalLinkUrl>
            ))}
          </div>
        </div>
      )}

      <TabSection heading="About" copyButtonContent={specJson}>
        <DescriptionListWrapper rawJson={aboutRawJson} />
      </TabSection>

      <TabSection heading="Replicas">
        <DescriptionListWrapper rawJson={replicaJson} />
      </TabSection>

      <TabSection heading="Requests">
        <DescriptionListWrapper rawJson={requestsJson} />
      </TabSection>

      <TabSection heading="Limits">
        <DescriptionListWrapper rawJson={limitsJson} />
      </TabSection>
    </div>
  )
}

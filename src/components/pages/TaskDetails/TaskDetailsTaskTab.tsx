/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

'use client'

import { DescriptionListWrapper } from '@/components/DescriptionListWrapper'
import { DetailsDescription } from '@/components/DetailsDescription'
import { TabSection } from '@/components/TabSection'
import { TaskSpec } from '@/gen/flyteidl2/task/task_definition_pb'
import { useOrg } from '@/hooks/useOrg'
import { useTaskDetails } from '@/hooks/useTaskDetails'
import { useParams } from 'next/navigation'
import React, { useMemo } from 'react'
import stringify from 'safe-stable-stringify'
import { TaskDetailsPageParams } from './types'

function taskTemplateToRawJson(
  taskTemplate: TaskSpec['taskTemplate'] | undefined,
): Record<string, unknown> {
  if (!taskTemplate) return {}
  try {
    return JSON.parse(stringify(taskTemplate)) as Record<string, unknown>
  } catch {
    return {}
  }
}

export const TaskDetailsTaskTab: React.FC<{
  latestVersion?: string
  version?: string
}> = ({ latestVersion, version }) => {
  const params = useParams<TaskDetailsPageParams>()
  const org = useOrg()

  const versionToRender =
    version ||
    // if no version is provided, we are showing the latest version only
    latestVersion
  const taskDetails = useTaskDetails({
    name: params.name,
    version: versionToRender!,
    project: params.project,
    domain: params.domain,
    org,
    enabled: !!versionToRender,
  })

  const { taskTemplate } = taskDetails.data?.details?.spec || {}

  const rawJson = useMemo(
    () => taskTemplateToRawJson(taskTemplate),
    [taskTemplate],
  )

  const copyButtonContent = stringify(taskTemplate || {}, null, 2)
  const sourceLink =
    taskDetails.data?.details?.spec?.documentation?.sourceCode?.link ?? ''
  const { documentation } = taskDetails.data?.details?.spec || {}
  return (
    <div className="flex w-full min-w-0 flex-col gap-6 p-8 pt-2.5">
      <DetailsDescription
        shortDescription={documentation?.shortDescription}
        longDescription={documentation?.longDescription}
      />
      <TabSection copyButtonContent={sourceLink} heading="Source">
        <DescriptionListWrapper
          rawJson={
            {
              repository: sourceLink || null,
            } as Record<string, unknown>
          }
        />
      </TabSection>
      <TabSection copyButtonContent={copyButtonContent} heading="Spec">
        <DescriptionListWrapper rawJson={rawJson} />
      </TabSection>
    </div>
  )
}

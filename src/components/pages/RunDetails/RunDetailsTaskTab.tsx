/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { DescriptionListWrapper } from '@/components/DescriptionListWrapper'
import { TabSection } from '@/components/TabSection'
import { TaskSpec } from '@/gen/flyteidl2/task/task_definition_pb'
import { useWatchActionDetails } from '@/hooks/useWatchActionDetails'
import React, { useMemo } from 'react'
import stringify from 'safe-stable-stringify'

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

interface RunDetailsTaskTabProps {
  selectedActionDetailsQuery: ReturnType<typeof useWatchActionDetails>
}

export const RunDetailsTaskTab: React.FC<RunDetailsTaskTabProps> = ({
  selectedActionDetailsQuery,
}) => {
  const { spec } = selectedActionDetailsQuery.data || {}
  const { taskTemplate } = (spec?.value as TaskSpec) || {}

  const rawJson = useMemo(
    () => taskTemplateToRawJson(taskTemplate),
    [taskTemplate],
  )

  const copyButtonContent = stringify(taskTemplate || {}, null, 2)

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 p-8 pt-2.5">
      <TabSection copyButtonContent={copyButtonContent} heading="Task">
        <DescriptionListWrapper rawJson={rawJson} />
      </TabSection>
    </div>
  )
}

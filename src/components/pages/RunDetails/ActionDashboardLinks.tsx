/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { ExternalLinkUrl } from '@/components/ExternalLinkUrl'
import { useExternalLogUrls } from '@/components/pages/RunDetails/hooks/useExternalLogUrls'
import { TaskLog_LinkType } from '@/gen/flyteidl2/core/execution_pb'
import { ActionAttempt } from '@/gen/flyteidl2/workflow/run_definition_pb'
import React from 'react'

export const ActionDashboardLinks: React.FC<{
  attempt?: ActionAttempt | null
}> = ({ attempt }) => {
  const urls = useExternalLogUrls(attempt?.logInfo, TaskLog_LinkType.DASHBOARD)
  const validUrls = urls.filter(({ url }) => Boolean(url))

  return validUrls.length > 0 ? (
    <div>
      <h3 className="py-2 text-sm/5 font-bold">Links</h3>
      <div className="mt-2 flex flex-row flex-wrap gap-2">
        {validUrls.map((url, index) => (
          <ExternalLinkUrl {...url} key={index} />
        ))}
      </div>
    </div>
  ) : null
}

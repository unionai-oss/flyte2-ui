/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { LogViewer, LOG_VIEWER_MIN_WIDTH_PX } from '@/components/LogViewer'
import { useSelectedActionId } from '@/components/pages/RunDetails/hooks/useSelectedItem'
import LogsExtLinksBar from '@/components/pages/RunDetails/LogsExtLinksBar'
import { RunK8sSwitch } from '@/components/pages/RunDetails/LogsK8sSwitch'
import { RunLogType } from '@/components/pages/RunDetails/types'
import { useWatchActionDetails } from '@/hooks/useWatchActionDetails'
import { useWatchClusterEvents } from '@/hooks/useWatchClusterEvents'
import { useWatchLogs } from '@/hooks/useWatchLogs'
import { isAttemptTerminal } from '@/lib/attemptUtils'
import React, { useMemo, useState } from 'react'
import { useSelectedAttemptStore } from './state/AttemptStore'

export const RunDetailsLogsTab: React.FC<unknown> = () => {
  const selectedActionId = useSelectedActionId()
  const selectedActionDetails = useWatchActionDetails(selectedActionId)
  const attempt = useSelectedAttemptStore((s) => s.selectedAttempt)

  const [logsType, setLogsType] = useState<RunLogType>(RunLogType.RUN)

  const attemptNumber = attempt?.attempt ? attempt.attempt : 0

  const logs = useWatchLogs({
    actionDetails: selectedActionDetails.data,
    attempt: attemptNumber,
    enabled: attempt?.logsAvailable === true,
  })

  const clusterEvents = useWatchClusterEvents({
    actionDetails: selectedActionDetails.data,
    attempt: attemptNumber,
    enabled: !!selectedActionDetails.data,
  })

  const source = logsType === RunLogType.K8S ? clusterEvents : logs

  const isTerminal = isAttemptTerminal(attempt)
  const noLogsAvailable =
    logsType === RunLogType.RUN && isTerminal && attempt?.logsAvailable !== true

  const isWaiting = useMemo(() => {
    if (logsType === RunLogType.K8S) {
      return !isTerminal && !attempt?.clusterEvents?.length
    }
    if (noLogsAvailable) return false
    return !isTerminal && !attempt?.logsAvailable
  }, [attempt, logsType, isTerminal, noLogsAvailable])

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-5 p-8 pt-2.5"
      style={{ minWidth: LOG_VIEWER_MIN_WIDTH_PX }}
    >
      <div className="flex min-w-0 flex-row gap-x-5">
        <RunK8sSwitch onChange={setLogsType} currentValue={logsType} />
        {attempt?.logInfo && <LogsExtLinksBar logInfo={attempt.logInfo} />}
      </div>
      <div className="flex h-full w-full min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border border-zinc-200 bg-(--system-black) px-5 py-3 dark:border-zinc-800">
        <LogViewer
          enableSourceFilter={logsType !== RunLogType.K8S}
          logs={noLogsAvailable ? [] : source.data?.lines}
          done={noLogsAvailable || source.isFetched}
          error={source.error}
          waiting={isWaiting}
          logType={logsType}
          shouldSkipIcon={logsType === RunLogType.K8S}
        />
      </div>
    </div>
  )
}

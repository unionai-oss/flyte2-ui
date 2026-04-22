/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { LogViewer } from '@/components/LogViewer/LogViewer'
import { App, Condition } from '@/gen/flyteidl2/app/app_definition_pb'
import {
  LogLine,
  LogLineOriginator,
} from '@/gen/flyteidl2/logs/dataplane/payload_pb'
import { useAppLogs } from '@/hooks/useApps'
import { useEffect, useState } from 'react'
import { AppLogType, LogSwitch } from './LogSwitch'

const mapAppConditionToLogline = (condition: Condition): LogLine =>
  ({
    message: condition.message,
    originator: LogLineOriginator.SYSTEM,
    timestamp: condition.lastTransitionTime,
  }) as LogLine

export const AppLogsTab = ({ app }: { app: App | undefined }) => {
  const [logsType, setLogsType] = useState<AppLogType>(AppLogType.APP)
  const [scalingLogs, setScalingLogs] = useState(
    app?.status?.conditions.map(mapAppConditionToLogline),
  )

  const logsQuery = useAppLogs({
    appId: app?.metadata?.id?.name,
    domain: app?.metadata?.id?.domain,
    enabled: !!app,
    projectId: app?.metadata?.id?.project,
    org: app?.metadata?.id?.org,
  })

  useEffect(() => {
    const newConditions = app?.status?.conditions.map(mapAppConditionToLogline)
    setScalingLogs(newConditions)
  }, [app?.status?.conditions])

  const isAppLogs = logsType === AppLogType.APP
  const currentLogs = isAppLogs ? logsQuery.logs || [] : scalingLogs

  return (
    <>
      <LogSwitch currentValue={logsType} onChange={setLogsType} />
      <div className="flex h-full w-full flex-col gap-3 overflow-hidden rounded-2xl border border-(--system-gray-3) bg-(--system-black) px-5 py-3">
        <LogViewer
          done={isAppLogs ? !logsQuery.isPending : true}
          enableSourceFilter={isAppLogs}
          error={isAppLogs ? logsQuery.error : null}
          logType={logsType}
          logs={currentLogs}
          shouldSkipIcon={!isAppLogs}
          waiting={
            isAppLogs && logsQuery.isPending && logsQuery.logs.length === 0
          }
        />
      </div>
    </>
  )
}

/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { useEffect, useState } from 'react'

import { useParams } from 'next/navigation'

import { ComboButton } from '@/components/Buttons/ComboButton'
import { CopyButton } from '@/components/CopyButton'
import { CopyButtonWithTooltip } from '@/components/CopyButtonWithTooltip'
import { ErrorBanner } from '@/components/ErrorBanner'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import ErrorPage from '@/components/pages/ErrorPage'
import { ConditionAction } from '@/gen/flyteidl2/workflow/run_definition_pb'
import { useOrg } from '@/hooks/useOrg'
import { useWatchActionDetails } from '@/hooks/useWatchActionDetails'
import { getActionDisplayString, isActionTerminal } from '@/lib/actionUtils'
import { isAbortInfoResult, isErrorInfoResult } from '@/lib/runTypeUtils'
import { getLocation } from '@/lib/windowUtils'

import { AbortActionModal } from './AbortActionModal'
import { ActionTimeline } from './ActionPhaseTimeline'
import { ConditionSignal } from './ConditionSignal'
import { useSelectedActionId } from './hooks/useSelectedItem'
import { useSelectedAttemptStore } from './state/AttemptStore'
import { useRunStore } from './state/RunStore'
import { RunDetailsPageParams } from './types'

export interface RunDetailsConditionTabProps {
  selectedActionDetailsQuery: ReturnType<typeof useWatchActionDetails>
}

export const RunDetailsConditionTab = ({
  selectedActionDetailsQuery,
}: RunDetailsConditionTabProps) => {
  const run = useRunStore((s) => s.run)
  const selectedActionId = useSelectedActionId()
  const selectedActionDetails = selectedActionDetailsQuery.data
  const selectedAttempt = useSelectedAttemptStore((s) => s.selectedAttempt)
  const params = useParams<RunDetailsPageParams>()
  const org = useOrg()
  const [isAbortModalOpen, setIsAbortModalOpen] = useState(false)

  // Close the abort modal when the selected action changes so a stale, still-open
  // modal can't abort the newly-selected action.
  useEffect(() => {
    setIsAbortModalOpen(false)
  }, [selectedActionId])

  if (selectedActionDetailsQuery.error) {
    return <ErrorPage />
  }

  if (!selectedActionDetailsQuery.isFetched || !selectedActionDetails) {
    return <LoadingSpinner />
  }

  const actionId = selectedActionDetails.id?.name
  const displayName = getActionDisplayString(selectedActionDetails)
  const runName =
    selectedActionDetails.id?.run?.name || run?.action?.id?.run?.name

  const conditionSpec =
    selectedActionDetails.spec?.case === 'condition'
      ? (selectedActionDetails.spec.value as ConditionAction)
      : undefined
  const conditionTimeoutSeconds = conditionSpec?.timeout?.seconds
    ? Number(conditionSpec.timeout.seconds)
    : undefined

  const hasError =
    selectedAttempt?.errorInfo ||
    isErrorInfoResult(selectedActionDetails.result) ||
    isAbortInfoResult(selectedActionDetails.result)

  const isNonTerminal = !isActionTerminal(selectedActionDetails)

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0">
      <div
        key={selectedActionId}
        className="absolute inset-0 flex flex-col gap-6 px-8 pt-7 [&>*:last-child]:pb-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-0.5 flex gap-2">
              {displayName && (
                <h4 className="text-sm leading-[20px] font-bold tracking-tight text-(--system-gray-7)">
                  {displayName}
                </h4>
              )}
              <CopyButtonWithTooltip
                icon="chain"
                textInitial="Copy action URL"
                textCopied="Action URL copied to clipboard"
                value={getLocation().href}
                classNameBtn="-ml-1"
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-(--system-gray-5)">
              <div className="shrink-0 whitespace-nowrap">
                Action ID: <span>{actionId}</span>
                <CopyButton
                  className="!px-1 !py-0"
                  size="sm"
                  value={actionId ?? ''}
                />
              </div>
            </div>
          </div>
          {isNonTerminal && (
            <ComboButton
              size="md"
              color="med-gray"
              border
              options={[
                {
                  name: (
                    <div className="flex flex-row items-center gap-1.5 text-xs/5 text-rose-600 dark:text-rose-400">
                      Abort action
                    </div>
                  ),
                  onClick: () => setIsAbortModalOpen(true),
                },
              ]}
            />
          )}
        </div>

        {hasError ? (
          <div className="flex-shrink-0">
            <ErrorBanner
              attempt={selectedAttempt}
              result={selectedActionDetails.result}
              org={org}
              domain={params?.domain}
              project={params?.project}
              runName={runName}
              actionId={actionId}
            />
          </div>
        ) : null}

        <ActionTimeline
          phaseTransitions={selectedAttempt?.phaseTransitions}
          taskType="condition"
          conditionTimeoutSeconds={conditionTimeoutSeconds}
        />

        <ConditionSignal actionDetails={selectedActionDetails} />
      </div>

      {(isNonTerminal || isAbortModalOpen) && (
        <AbortActionModal
          actionDetails={selectedActionDetails}
          isOpen={isAbortModalOpen}
          setIsOpen={setIsAbortModalOpen}
        />
      )}
    </div>
  )
}

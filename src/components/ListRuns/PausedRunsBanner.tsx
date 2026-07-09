/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { useMemo } from 'react'

import useLocalStorage from 'use-local-storage'

import { BannerShell } from '@/components/BannerShell'
import { BaseButton } from '@/components/Buttons/BaseButton'
import { PauseCircleIcon } from '@/components/icons/PauseCircleIcon'
import { ProjectIdentifier } from '@/gen/flyteidl2/common/identifier_pb'
import { RUNS_LIST_PAGE_LIMIT, useWatchRuns } from '@/hooks/useWatchRuns'

import { formatForTable } from './table/util'

// Persist the dismissal so it sticks across reloads. This is intentionally a
// permanent (per-browser) opt-out: the "Paused only" filter pill remains
// available afterward, so users can still get to paused runs on demand.
const PAUSED_BANNER_DISMISSED_KEY = 'settings.runs.pausedBannerDismissed'

const BANNER_CLASS_NAME =
  'mx-10 mb-6 gap-3 p-5 border-(--accent-yellow)/20 bg-(--accent-background-yellow)'

const BUTTON_CLASS_NAME =
  '!text-(--accent-yellow) hover:!bg-(--accent-yellow)/10'

interface PausedRunsBannerProps {
  projectId?: ProjectIdentifier
  /** Whether the "waiting for signal" filter is currently applied to the list. */
  isApplied: boolean
  /** Apply the "waiting for signal" filter to the main runs list. */
  onApply: () => void
  /** Clear the "waiting for signal" filter from the main runs list. */
  onClear: () => void
}

/**
 * Amber banner shown above the runs list when one or more runs are waiting for a
 * human-in-the-loop signal (an action in the PAUSED phase). Backed by its own
 * lightweight `ListRuns` request (`paused_actions_only`), so it surfaces paused
 * runs even when they're outside the current view/filters.
 *
 * Two states, driven by `isApplied`:
 *   - not applied → a nudge ("N runs waiting for signal") with a "View run(s)"
 *     action that applies the filter.
 *   - applied → a confirmation ("Showing runs waiting for signal") with a
 *     "Clear" action that removes the filter.
 *
 * Either way the banner only fully disappears once dismissed (persisted), while
 * loading, or when there are no paused runs.
 */
export const PausedRunsBanner = ({
  projectId,
  isApplied,
  onApply,
  onClear,
}: PausedRunsBannerProps) => {
  const [dismissed, setDismissed] = useLocalStorage<boolean>(
    PAUSED_BANNER_DISMISSED_KEY,
    false,
  )

  // Intentionally a separate, *unfiltered* request from the list: the banner
  // counts every run waiting for a signal regardless of the list's date range
  // or active filters (a gate can sit paused well outside the default window).
  // It can't share the table's cache entry for that reason; the cost is one
  // extra request, which is cheap since paused runs are rare. We reuse the
  // list page size so "N+" overflow behaves identically.
  const runsQuery = useWatchRuns({
    limit: RUNS_LIST_PAGE_LIMIT,
    projectId,
    pausedActionsOnly: true,
    enabled: !dismissed,
  })

  const { count, hasMore, firstRun } = useMemo(() => {
    const firstPage = runsQuery.data?.pages?.[0]
    const runs = firstPage?.runs ?? []
    return {
      count: runs.length,
      hasMore: !!firstPage?.token,
      firstRun: runs[0],
    }
  }, [runsQuery.data])

  if (dismissed || !runsQuery.isFetched || count === 0) {
    return null
  }

  const isSingle = count === 1
  const formatted = firstRun ? formatForTable(firstRun) : undefined
  const runId = formatted?.runId.id
  const runName = formatted?.name.shortName || formatted?.name.fullName || runId

  // Use the single-run label only when we actually resolved a name; otherwise
  // fall back to the count form so we never render "(undefined)".
  const promptLabel =
    isSingle && runName
      ? `${runName}${runId ? ` (${runId})` : ''} waiting for signal`
      : `${hasMore ? `${count}+` : count} runs waiting for signal`

  const label = isApplied ? 'Showing runs waiting for signal' : promptLabel

  return (
    <BannerShell
      className={BANNER_CLASS_NAME}
      actions={
        <div className="flex shrink-0 items-center gap-2">
          {isApplied ? (
            <BaseButton
              size="sm"
              border
              className={`!border-(--accent-yellow)/40 ${BUTTON_CLASS_NAME}`}
              onClick={onClear}
            >
              Clear
            </BaseButton>
          ) : (
            <BaseButton
              size="sm"
              border
              className={`!border-(--accent-yellow)/40 ${BUTTON_CLASS_NAME}`}
              onClick={onApply}
            >
              {isSingle ? 'View run' : 'View runs'}
            </BaseButton>
          )}
          <BaseButton
            size="sm"
            className={BUTTON_CLASS_NAME}
            onClick={() => setDismissed(true)}
          >
            Dismiss
          </BaseButton>
        </div>
      }
    >
      <div className="flex min-w-0 items-center gap-2 text-[13px] leading-normal font-semibold tracking-[0.033px] text-(--accent-yellow)">
        <PauseCircleIcon className="size-4 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
    </BannerShell>
  )
}

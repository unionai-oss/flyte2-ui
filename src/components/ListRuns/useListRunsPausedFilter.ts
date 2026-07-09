/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { useCallback, useMemo } from 'react'

import { usePausedRunsFilter } from '@/hooks/filters/usePausedRunsFilter'

export interface ListRunsPausedFilter {
  /** Whether the "waiting for signal" filter is currently applied. */
  isApplied: boolean
  /** Apply the filter. For the banner's "View runs". */
  apply: () => void
  /** Clear the filter. For the banner's "Clear". */
  clear: () => void
  /** Toggle the filter on/off. For the "Paused only" pill. */
  toggle: (next: boolean) => void
}

/**
 * Runs-list orchestration around `usePausedRunsFilter`. flyte2-ui only supports
 * table/list view, so there is no grouped-view coupling.
 */
export function useListRunsPausedFilter(): ListRunsPausedFilter {
  const { isApplied, applyFilter, clearFilter } = usePausedRunsFilter()

  const apply = useCallback(() => {
    applyFilter()
  }, [applyFilter])

  const toggle = useCallback(
    (next: boolean) => {
      if (next) {
        apply()
      } else {
        clearFilter()
      }
    },
    [apply, clearFilter],
  )

  return useMemo(
    () => ({ isApplied, apply, clear: clearFilter, toggle }),
    [isApplied, apply, clearFilter, toggle],
  )
}

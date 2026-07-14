/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { useCallback } from 'react'

import { useQueryState } from 'nuqs'

interface PausedRunsFilter {
  /** Whether the "waiting for signal" (paused actions) filter is currently applied. */
  isApplied: boolean
  applyFilter: () => void
  clearFilter: () => void
}

/**
 * URL-backed toggle for the "runs waiting for signal" filter. When applied, the
 * runs list is restricted to runs that contain at least one action in the
 * PAUSED phase (a human-in-the-loop gate node awaiting input). Backed by the
 * `paused_actions_only` flag on `ListRunsRequest`.
 *
 * The query param is named `signal` (not `paused`) to match the user-facing
 * "waiting for signal" wording; the rest of the codebase uses "paused" to match
 * the backend field.
 */
export const usePausedRunsFilter = (queryKey = 'signal'): PausedRunsFilter => {
  const [value, setValue] = useQueryState(queryKey)

  const applyFilter = useCallback(() => {
    setValue('true')
  }, [setValue])

  const clearFilter = useCallback(() => {
    setValue(null)
  }, [setValue])

  return { isApplied: value === 'true', applyFilter, clearFilter }
}

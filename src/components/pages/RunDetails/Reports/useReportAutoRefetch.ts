/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { useEffect } from 'react'

import { getWindow } from '@/lib/windowUtils'

type UseReportAutoRefetchArgs = {
  /** `null` means Off in the refresh menu. */
  intervalMs: number | null
  isActionTerminal: boolean
  isQueryEnabled: boolean
  refetch: () => unknown | Promise<unknown>
}

/**
 * Polls the report query on a fixed interval. Each dependency change clears the
 * previous timer and starts a new one (or none), so the menu selection always wins.
 */
export function useReportAutoRefetch({
  intervalMs,
  isActionTerminal,
  isQueryEnabled,
  refetch,
}: UseReportAutoRefetchArgs): void {
  useEffect(() => {
    const active =
      intervalMs != null &&
      intervalMs > 0 &&
      !isActionTerminal &&
      isQueryEnabled

    if (!active) return

    const w = getWindow()
    if (!w) return

    const handle = w.setInterval(() => {
      void refetch()
    }, intervalMs)

    return () => w.clearInterval(handle)
  }, [intervalMs, isActionTerminal, isQueryEnabled, refetch])
}

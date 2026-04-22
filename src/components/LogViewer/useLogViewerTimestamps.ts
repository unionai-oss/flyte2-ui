/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { getWindow } from '@/lib/windowUtils'
import { useEffect, useRef, useState } from 'react'

const LOG_VIEWER_TIMESTAMPS_KEY = 'logViewer.showTimestamps'

export function useLogViewerTimestamps(): [boolean, (value: boolean) => void] {
  const [showTimestamps, setShowTimestamps] = useState(() => {
    const w = getWindow()
    if (!w) return true
    try {
      const stored = w.localStorage.getItem(LOG_VIEWER_TIMESTAMPS_KEY)
      return stored !== null ? stored === 'true' : true
    } catch {
      return true
    }
  })
  const hasPersistedRef = useRef(false)

  useEffect(() => {
    if (!hasPersistedRef.current) {
      hasPersistedRef.current = true
      return
    }
    const w = getWindow()
    if (!w) return
    try {
      w.localStorage.setItem(LOG_VIEWER_TIMESTAMPS_KEY, String(showTimestamps))
    } catch {
      // ignore
    }
  }, [showTimestamps])

  return [showTimestamps, setShowTimestamps]
}

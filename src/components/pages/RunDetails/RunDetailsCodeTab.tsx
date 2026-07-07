/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

'use client'

import { CodeTabContent } from '@/components/CodeTab/CodeTabContent'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useSelectedActionId } from '@/components/pages/RunDetails/hooks/useSelectedItem'
import { useWatchActionDetails } from '@/hooks/useWatchActionDetails'
import { LICENSED_EDITION_UPGRADE_SOURCES } from '@/lib/constants'
import React from 'react'

export const RunDetailsCodeTab: React.FC = () => {
  const selectedActionId = useSelectedActionId()
  const selectedActionDetails = useWatchActionDetails(selectedActionId)

  if (selectedActionDetails.isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <CodeTabContent upgradeSource={LICENSED_EDITION_UPGRADE_SOURCES.runCode} />
  )
}

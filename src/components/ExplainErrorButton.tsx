/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

'use client'

import { Button } from '@/components/Button'
import { LICENSED_EDITION_UPGRADE_SOURCES } from '@/lib/constants'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { DisabledButtonWithTooltip } from './DisabledButtonWithTooltip'

export interface ExplainErrorButtonProps {
  org?: string
  domain?: string
  project?: string
  runName?: string
  actionId?: string
}

export const ExplainErrorButton = ({}: ExplainErrorButtonProps) => {
  return (
    <DisabledButtonWithTooltip
      source={LICENSED_EDITION_UPGRADE_SOURCES.runExplainError}
    >
      <Button
        disabled
        outline
        size="xs"
        aria-label="Explain"
        title="Get AI help with this error"
        className="items-center justify-center gap-1.5"
      >
        <SparklesIcon data-slot="icon" aria-hidden="true" className="h-4 w-4" />
        <span className="text-[13px]">Explain</span>
      </Button>
    </DisabledButtonWithTooltip>
  )
}

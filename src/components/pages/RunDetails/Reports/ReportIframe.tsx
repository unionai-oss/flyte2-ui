/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { Button } from '@/components/Button'
import { Tooltip } from '@/components/Tooltip'
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/solid'
import React from 'react'

import {
  type ReportRefreshInterval,
  ReportRefreshSplitButton,
} from './ReportRefreshSplitButton'

// Taken from https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox
const sandboxRules = [
  'allow-forms',
  'allow-modals',
  'allow-orientation-lock',
  'allow-pointer-lock',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-presentation',
  'allow-same-origin',
  'allow-scripts',
  'allow-top-navigation-by-user-activation',
  'allow-downloads',
].join(' ')

type ReportIframeProps = {
  reportUrl: string | undefined
  isOpen: boolean
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
  handleRefetch: () => void
  refreshInterval: ReportRefreshInterval
  onRefreshIntervalChange: (value: ReportRefreshInterval) => void
}

export function ReportIframe({
  reportUrl,
  isOpen,
  setIsOpen,
  handleRefetch,
  refreshInterval,
  onRefreshIntervalChange,
}: ReportIframeProps) {
  return (
    <>
      {reportUrl ? (
        <div
          className={`${isOpen ? '' : 'p-10'} absolute top-3 right-3 flex items-center gap-5`}
        >
          <ReportRefreshSplitButton
            onRefresh={() => {
              void handleRefetch()
            }}
            refreshInterval={refreshInterval}
            onRefreshIntervalChange={onRefreshIntervalChange}
          />

          {isOpen ? (
            <Button
              outline
              size="xs"
              color="zinc"
              onClick={() => setIsOpen((prev) => !prev)}
              className="!border-[#E6E6E6] text-zinc-400 hover:!bg-transparent hover:text-(--system-black)"
            >
              Exit fullscreen
              <ArrowsPointingInIcon className="!size-3.5 fill-zinc-400" />
            </Button>
          ) : (
            <Tooltip content="Fullscreen" placement="bottom">
              <Button
                title="Fullscreen"
                plain
                color="zinc"
                onClick={() => setIsOpen((prev) => !prev)}
                className="!size-6 hover:!bg-zinc-100"
              >
                <ArrowsPointingOutIcon className="!size-5 fill-zinc-400" />
              </Button>
            </Tooltip>
          )}
        </div>
      ) : null}

      <iframe
        src={reportUrl}
        title="Report"
        width="100%"
        height="100%"
        className="h-full rounded-2xl bg-(--system-black)"
        sandbox={sandboxRules}
      />
    </>
  )
}

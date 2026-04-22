/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { useState } from 'react'
import { useCopyToClipboard } from '@/components/CopyButton'
import MaybeLogsPopover from './MaybeLogsPopover'
import { LogLine } from '@/gen/flyteidl2/logs/dataplane/payload_pb'
import { CheckIcon } from '@heroicons/react/24/outline'
import { CopyIcon } from '@/components/icons/CopyIcon'
import { Tooltip } from '@/components/Tooltip'
import { ArrowDownTrayIcon } from '@heroicons/react/16/solid'
import { handleDownload } from '@/lib/download'
import { IconButton } from '../Buttons/IconButton'

const LogViewerIcons: React.FC<{
  logs: LogLine[]
}> = ({ logs }) => {
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false)
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false)

  const { copiedValue, handleCopy } = useCopyToClipboard({})
  return (
    <>
      <MaybeLogsPopover
        label="Copy"
        logs={logs}
        isMenuOpen={isCopyMenuOpen}
        onMenuOpenChange={setIsCopyMenuOpen}
        handleClick={(logs, e) => handleCopy(e, logs)}
      >
        <IconButton noHover onClick={() => setIsCopyMenuOpen(true)} size="xs">
          {copiedValue ? (
            <CheckIcon
              className="stroke-(--accent-graphic-green) transition-colors duration-200"
              data-slot="icon"
            />
          ) : (
            <CopyIcon data-slot="icon" />
          )}
        </IconButton>
      </MaybeLogsPopover>

      <Tooltip content="Download logs" placement="bottom">
        <MaybeLogsPopover
          logs={logs}
          isMenuOpen={isDownloadMenuOpen}
          onMenuOpenChange={setIsDownloadMenuOpen}
          handleClick={(logs: string, _e) => handleDownload(logs, 'logs.log')}
          label="Download"
        >
          <IconButton
            aria-label="Download logs"
            size="md"
            disabled={logs.length === 0}
            onClick={() => setIsDownloadMenuOpen(true)}
          >
            <ArrowDownTrayIcon />
          </IconButton>
        </MaybeLogsPopover>
      </Tooltip>
    </>
  )
}

export default LogViewerIcons

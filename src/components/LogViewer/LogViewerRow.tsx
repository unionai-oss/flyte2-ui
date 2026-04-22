/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import {
  LogLine,
  LogLineOriginator,
} from '@/gen/flyteidl2/logs/dataplane/payload_pb'
import { getLogDateString } from '@/lib/dateUtils'
import { highlightMatches } from '@/lib/highlightMatches'
import { stringToColor } from '@/lib/stringToColor'
import clsx from 'clsx'

export type SourceOption = string | 'All sources'

interface LogViewerRowProps {
  log?: LogLine
  searchQuery?: string
  skipOriginatorIcon?: boolean
  showTimestamp?: boolean
}

export const LogViewerRow = ({
  log,
  searchQuery = '',
  skipOriginatorIcon = false,
  showTimestamp = true,
}: LogViewerRowProps) => {
  const id = `${log?.timestamp?.seconds?.toLocaleString()}-${log?.timestamp?.nanos}-${log?.message}}`
  const timestamp = getLogDateString(log?.timestamp)
  const originator =
    LogLineOriginator[log?.originator || LogLineOriginator.UNKNOWN]?.toString()
  const message = log?.message

  if (!log) {
    return null
  }
  return (
    <div
      key={id}
      className="group relative m-0 flex min-h-[24px] hover:bg-(--system-gray-1)"
    >
      <div className="m-0 flex flex-1 px-2 py-1 font-mono text-[13px] leading-[16px] font-medium">
        <div
          className={clsx(
            showTimestamp ? 'w-[200px]' : 'w-[25px]',
            'leading-[16px] whitespace-pre text-(--system-gray-5)',
          )}
        >
          {!skipOriginatorIcon && (
            <div
              className={`mr-3 ml-1 inline-block h-[10px] w-[10px] rounded-[2px] ${stringToColor(originator)}`}
            />
          )}
          {showTimestamp && highlightMatches(timestamp || '', searchQuery)}
        </div>
        <pre
          className="m-0 flex-1 leading-[16px] break-words whitespace-pre-wrap text-(--system-white) tabular-nums"
          style={{
            wordBreak: 'break-word',
          }}
        >
          {highlightMatches(message || '', searchQuery)}
        </pre>
      </div>
    </div>
  )
}

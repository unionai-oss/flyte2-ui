/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { PopoverMenu } from '@/components/Popovers'
import { LogLine } from '@/gen/flyteidl2/logs/dataplane/payload_pb'
import { logsToString } from '@/lib/logUtils'
import React from 'react'

const MaybeLogsPopover: React.FC<{
  children?: React.ReactElement
  label?: string
  logs: LogLine[]
  isMenuOpen: boolean
  onMenuOpenChange: (isOpen: boolean) => void
  handleClick: (
    logs: string,
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => void
}> = ({ children, label, logs, isMenuOpen, handleClick, onMenuOpenChange }) => {
  return (
    <PopoverMenu
      open={isMenuOpen}
      onOpenChange={onMenuOpenChange}
      items={[
        {
          id: 'logs-no-timestamp',
          type: 'item',
          label: (
            <div className="text-xs/5 font-normal text-(--system-gray-5)">
              {label} logs
            </div>
          ),
          onClick: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) =>
            handleClick(logsToString(logs, { includeTimestamps: false }), e),
        },
        {
          id: 'logs-with-timestamp',
          type: 'item',
          label: (
            <div className="text-xs/5 font-normal text-(--system-gray-5)">
              {label} logs with timestamps
            </div>
          ),
          onClick: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) =>
            handleClick(logsToString(logs, { includeTimestamps: true }), e),
        },
      ]}
    >
      {children}
    </PopoverMenu>
  )
}

export default MaybeLogsPopover
